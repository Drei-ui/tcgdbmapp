"use server";

import { prisma, actionTimer } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/**
 * ENTIRE dashboard in ONE raw SQL query — single round-trip to DB.
 * Uses scalar subqueries for aggregates and json_agg for recent activity.
 */
interface DashboardRow {
  cash_balance: string;
  inventory_value: string;
  low_stock_count: string;
  oldest_acquired_at: Date | null;
  sales_today_count: string;
  sales_today_collected: string;
  sales_today_shipping: string;
  sales_today_fees: string;
  sales_today_profit: string;
  sales_7d_count: string;
  sales_7d_collected: string;
  sales_7d_shipping: string;
  sales_7d_fees: string;
  sales_7d_profit: string;
  sales_30d_count: string;
  sales_30d_collected: string;
  sales_30d_shipping: string;
  sales_30d_fees: string;
  sales_30d_profit: string;
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

export async function getDashboardStats() {
  const timer = actionTimer("getDashboardStats");
  await requireUser();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);

  const [row] = await prisma.$queryRaw<DashboardRow[]>`
    SELECT
      -- Cash balance
      (SELECT COALESCE(SUM(CASE WHEN type = 'IN' THEN amount ELSE -amount END), 0)
       FROM cash_transactions)::text AS cash_balance,

      -- Inventory value
      (SELECT COALESCE(SUM(qty_on_hand * unit_cost), 0)
       FROM inventory_lots WHERE status != 'SOLD_OUT')::text AS inventory_value,

      -- Low stock count
      (SELECT COUNT(*)
       FROM inventory_lots WHERE qty_on_hand <= 2 AND qty_on_hand > 0 AND status != 'SOLD_OUT')::text AS low_stock_count,

      -- Oldest lot date
      (SELECT MIN(acquired_at)
       FROM inventory_lots WHERE status != 'SOLD_OUT') AS oldest_acquired_at,

      -- Sales today
      (SELECT COUNT(*) FROM sales WHERE status = 'CONFIRMED' AND sold_at >= ${today})::text AS sales_today_count,
      (SELECT COALESCE(SUM(total_collected), 0) FROM sales WHERE status = 'CONFIRMED' AND sold_at >= ${today})::text AS sales_today_collected,
      (SELECT COALESCE(SUM(shipping_cost_paid), 0) FROM sales WHERE status = 'CONFIRMED' AND sold_at >= ${today})::text AS sales_today_shipping,
      (SELECT COALESCE(SUM(platform_fees), 0) FROM sales WHERE status = 'CONFIRMED' AND sold_at >= ${today})::text AS sales_today_fees,
      (SELECT COALESCE(SUM(sli.profit_total), 0) FROM sale_line_items sli JOIN sales s ON sli.sale_id = s.id WHERE s.status = 'CONFIRMED' AND s.sold_at >= ${today})::text AS sales_today_profit,

      -- Sales 7d
      (SELECT COUNT(*) FROM sales WHERE status = 'CONFIRMED' AND sold_at >= ${sevenDaysAgo})::text AS sales_7d_count,
      (SELECT COALESCE(SUM(total_collected), 0) FROM sales WHERE status = 'CONFIRMED' AND sold_at >= ${sevenDaysAgo})::text AS sales_7d_collected,
      (SELECT COALESCE(SUM(shipping_cost_paid), 0) FROM sales WHERE status = 'CONFIRMED' AND sold_at >= ${sevenDaysAgo})::text AS sales_7d_shipping,
      (SELECT COALESCE(SUM(platform_fees), 0) FROM sales WHERE status = 'CONFIRMED' AND sold_at >= ${sevenDaysAgo})::text AS sales_7d_fees,
      (SELECT COALESCE(SUM(sli.profit_total), 0) FROM sale_line_items sli JOIN sales s ON sli.sale_id = s.id WHERE s.status = 'CONFIRMED' AND s.sold_at >= ${sevenDaysAgo})::text AS sales_7d_profit,

      -- Sales 30d
      (SELECT COUNT(*) FROM sales WHERE status = 'CONFIRMED' AND sold_at >= ${thirtyDaysAgo})::text AS sales_30d_count,
      (SELECT COALESCE(SUM(total_collected), 0) FROM sales WHERE status = 'CONFIRMED' AND sold_at >= ${thirtyDaysAgo})::text AS sales_30d_collected,
      (SELECT COALESCE(SUM(shipping_cost_paid), 0) FROM sales WHERE status = 'CONFIRMED' AND sold_at >= ${thirtyDaysAgo})::text AS sales_30d_shipping,
      (SELECT COALESCE(SUM(platform_fees), 0) FROM sales WHERE status = 'CONFIRMED' AND sold_at >= ${thirtyDaysAgo})::text AS sales_30d_fees,
      (SELECT COALESCE(SUM(sli.profit_total), 0) FROM sale_line_items sli JOIN sales s ON sli.sale_id = s.id WHERE s.status = 'CONFIRMED' AND s.sold_at >= ${thirtyDaysAgo})::text AS sales_30d_profit,

      -- Recent sales (JSON array)
      (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT id, status, total_collected::text, created_at, buyer_name
        FROM sales ORDER BY created_at DESC LIMIT 5
      ) t) AS recent_sales,

      -- Recent purchases (JSON array with supplier name + line item count)
      (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT p.id, p.created_at, s.name as supplier_name,
               (SELECT COUNT(*) FROM purchase_line_items pli WHERE pli.purchase_id = p.id)::text as line_item_count
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.created_at DESC LIMIT 5
      ) t) AS recent_purchases,

      -- Recent cash (JSON array)
      (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT id, type, amount::text, description, created_at
        FROM cash_transactions ORDER BY created_at DESC LIMIT 5
      ) t) AS recent_cash
  `;

  timer.done();

  // Parse aggregates
  const cashBalance = parseFloat(row.cash_balance);
  const inventoryValue = parseFloat(row.inventory_value);
  const lowStockCount = parseInt(row.low_stock_count, 10);
  const oldestAcquiredAt = row.oldest_acquired_at;

  function buildSaleStats(prefix: "sales_today" | "sales_7d" | "sales_30d") {
    const count = parseInt(row[`${prefix}_count` as keyof DashboardRow] as string, 10);
    const totalCollected = parseFloat(row[`${prefix}_collected` as keyof DashboardRow] as string);
    const lineProfit = parseFloat(row[`${prefix}_profit` as keyof DashboardRow] as string);
    const shippingCost = parseFloat(row[`${prefix}_shipping` as keyof DashboardRow] as string);
    const fees = parseFloat(row[`${prefix}_fees` as keyof DashboardRow] as string);
    return {
      count,
      totalCollected,
      totalProfit: lineProfit - shippingCost - fees,
    };
  }

  // Map recent activity from raw rows to match the expected shapes
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
    salesToday: buildSaleStats("sales_today"),
    sales7d: buildSaleStats("sales_7d"),
    sales30d: buildSaleStats("sales_30d"),
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
