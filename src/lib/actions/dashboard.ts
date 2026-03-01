"use server";

import { prisma, actionTimer } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { unstable_cache } from "next/cache";

/**
 * Dashboard in a single query using CTEs + conditional aggregation.
 *
 * Before: ~21 scalar subselects (each opening a separate table scan)
 * After:  4 CTEs (1 scan each) + 3 json_agg subselects (LIMIT 5, cheap)
 *
 * Cache: tag "dashboard", TTL 60s
 */

interface DashboardResult {
  cash_balance: string;
  inventory_value: string;
  low_stock_count: string;
  oldest_acquired_at: Date | null;
  today_count: string;
  today_collected: string;
  today_shipping: string;
  today_fees: string;
  today_profit: string;
  seven_count: string;
  seven_collected: string;
  seven_shipping: string;
  seven_fees: string;
  seven_profit: string;
  thirty_count: string;
  thirty_collected: string;
  thirty_shipping: string;
  thirty_fees: string;
  thirty_profit: string;
  recent_sales: RecentSaleRow[] | null;
  recent_purchases: RecentPurchaseRow[] | null;
  recent_cash: RecentCashRow[] | null;
}

interface RecentSaleRow {
  id: string;
  status: string;
  total_collected: string;
  created_at: string;
  buyer_name: string | null;
}

interface RecentPurchaseRow {
  id: string;
  created_at: string;
  supplier_name: string | null;
  line_item_count: string;
}

interface RecentCashRow {
  id: string;
  type: string;
  amount: string;
  description: string;
  created_at: string;
}

// ── Cached fetcher ──

const fetchDashboardData = unstable_cache(
  async (todayISO: string, sevenDaysAgoISO: string, thirtyDaysAgoISO: string) => {
    const today = new Date(todayISO);
    const sevenDaysAgo = new Date(sevenDaysAgoISO);
    const thirtyDaysAgo = new Date(thirtyDaysAgoISO);

    const [row] = await prisma.$queryRaw<DashboardResult[]>`
      WITH
        -- 1 scan of sales (CONFIRMED, last 30d) with CASE for 3 time buckets
        sale_stats AS (
          SELECT
            COUNT(CASE WHEN sold_at >= ${today} THEN 1 END) AS today_count,
            COALESCE(SUM(CASE WHEN sold_at >= ${today} THEN total_collected ELSE 0 END), 0) AS today_collected,
            COALESCE(SUM(CASE WHEN sold_at >= ${today} THEN shipping_cost_paid ELSE 0 END), 0) AS today_shipping,
            COALESCE(SUM(CASE WHEN sold_at >= ${today} THEN platform_fees ELSE 0 END), 0) AS today_fees,

            COUNT(CASE WHEN sold_at >= ${sevenDaysAgo} THEN 1 END) AS seven_count,
            COALESCE(SUM(CASE WHEN sold_at >= ${sevenDaysAgo} THEN total_collected ELSE 0 END), 0) AS seven_collected,
            COALESCE(SUM(CASE WHEN sold_at >= ${sevenDaysAgo} THEN shipping_cost_paid ELSE 0 END), 0) AS seven_shipping,
            COALESCE(SUM(CASE WHEN sold_at >= ${sevenDaysAgo} THEN platform_fees ELSE 0 END), 0) AS seven_fees,

            COUNT(*) AS thirty_count,
            COALESCE(SUM(total_collected), 0) AS thirty_collected,
            COALESCE(SUM(shipping_cost_paid), 0) AS thirty_shipping,
            COALESCE(SUM(platform_fees), 0) AS thirty_fees
          FROM sales
          WHERE status = 'CONFIRMED' AND sold_at >= ${thirtyDaysAgo}
        ),
        -- 1 scan of sale_line_items joined to sales for profit
        sale_profit AS (
          SELECT
            COALESCE(SUM(CASE WHEN s.sold_at >= ${today} THEN sli.profit_total ELSE 0 END), 0) AS today_profit,
            COALESCE(SUM(CASE WHEN s.sold_at >= ${sevenDaysAgo} THEN sli.profit_total ELSE 0 END), 0) AS seven_profit,
            COALESCE(SUM(sli.profit_total), 0) AS thirty_profit
          FROM sale_line_items sli
          JOIN sales s ON sli.sale_id = s.id
          WHERE s.status = 'CONFIRMED' AND s.sold_at >= ${thirtyDaysAgo}
        ),
        -- 1 scan of inventory_lots for all 3 metrics
        inv_stats AS (
          SELECT
            COALESCE(SUM(qty_on_hand * unit_cost), 0) AS inventory_value,
            COUNT(CASE WHEN qty_on_hand <= 2 AND qty_on_hand > 0 THEN 1 END) AS low_stock_count,
            MIN(acquired_at) AS oldest_acquired_at
          FROM inventory_lots
          WHERE status != 'SOLD_OUT'
        ),
        -- 1 scan of cash_transactions
        cash_bal AS (
          SELECT COALESCE(SUM(CASE WHEN type = 'IN' THEN amount ELSE -amount END), 0) AS balance
          FROM cash_transactions
        )
      SELECT
        cb.balance::text AS cash_balance,
        iv.inventory_value::text,
        iv.low_stock_count::text,
        iv.oldest_acquired_at,

        ss.today_count::text,    ss.today_collected::text,    ss.today_shipping::text,    ss.today_fees::text,
        sp.today_profit::text,
        ss.seven_count::text,    ss.seven_collected::text,    ss.seven_shipping::text,    ss.seven_fees::text,
        sp.seven_profit::text,
        ss.thirty_count::text,   ss.thirty_collected::text,   ss.thirty_shipping::text,   ss.thirty_fees::text,
        sp.thirty_profit::text,

        (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
          SELECT id, status, total_collected::text, created_at, buyer_name
          FROM sales ORDER BY created_at DESC LIMIT 5
        ) t) AS recent_sales,

        (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
          SELECT p.id, p.created_at, s.name AS supplier_name,
                 (SELECT COUNT(*) FROM purchase_line_items pli WHERE pli.purchase_id = p.id)::text AS line_item_count
          FROM purchases p
          LEFT JOIN suppliers s ON p.supplier_id = s.id
          ORDER BY p.created_at DESC LIMIT 5
        ) t) AS recent_purchases,

        (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
          SELECT id, type, amount::text, description, created_at
          FROM cash_transactions ORDER BY created_at DESC LIMIT 5
        ) t) AS recent_cash

      FROM sale_stats ss, sale_profit sp, inv_stats iv, cash_bal cb
    `;

    return row;
  },
  ["dashboard-stats-v2"],
  { revalidate: 60, tags: ["dashboard"] }
);

// ── Public server action ──

export async function getDashboardStats() {
  const timer = actionTimer("getDashboardStats");
  await requireUser();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);

  const row = await fetchDashboardData(
    today.toISOString(),
    sevenDaysAgo.toISOString(),
    thirtyDaysAgo.toISOString()
  );

  timer.done();

  const cashBalance = parseFloat(row.cash_balance);
  const inventoryValue = parseFloat(row.inventory_value);
  const lowStockCount = parseInt(row.low_stock_count, 10);
  const oldestAcquiredAt = row.oldest_acquired_at;

  function buildSaleStats(prefix: "today" | "seven" | "thirty") {
    const count = parseInt(row[`${prefix}_count` as keyof DashboardResult] as string, 10);
    const totalCollected = parseFloat(row[`${prefix}_collected` as keyof DashboardResult] as string);
    const lineProfit = parseFloat(row[`${prefix}_profit` as keyof DashboardResult] as string);
    const shippingCost = parseFloat(row[`${prefix}_shipping` as keyof DashboardResult] as string);
    const fees = parseFloat(row[`${prefix}_fees` as keyof DashboardResult] as string);
    return {
      count,
      totalCollected,
      totalProfit: lineProfit - shippingCost - fees,
    };
  }

  const recentSales = (row.recent_sales ?? []).map((s) => ({
    id: s.id,
    status: s.status,
    totalCollected: s.total_collected,
    createdAt: new Date(s.created_at),
    buyerName: s.buyer_name,
  }));

  const recentPurchases = (row.recent_purchases ?? []).map((p) => ({
    id: p.id,
    createdAt: new Date(p.created_at),
    supplier: p.supplier_name ? { name: p.supplier_name } : null,
    _count: { lineItems: parseInt(p.line_item_count, 10) },
  }));

  const recentCash = (row.recent_cash ?? []).map((c) => ({
    id: c.id,
    type: c.type,
    amount: c.amount,
    description: c.description,
    createdAt: new Date(c.created_at),
  }));

  return {
    cashBalance,
    inventoryValue,
    salesToday: buildSaleStats("today"),
    sales7d: buildSaleStats("seven"),
    sales30d: buildSaleStats("thirty"),
    lowStockCount,
    oldestStockDays: oldestAcquiredAt
      ? Math.floor(
          (now.getTime() - new Date(oldestAcquiredAt).getTime()) / 86400000
        )
      : 0,
    recentSales,
    recentPurchases,
    recentCash,
  };
}
