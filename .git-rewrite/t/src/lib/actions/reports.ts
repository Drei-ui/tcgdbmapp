"use server";

import { prisma, actionTimer } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { unstable_cache } from "next/cache";

// ── Types ──

export interface ProfitReport {
  summary: {
    grossSales: number;
    cogs: number;
    grossProfit: number;
    marginPct: number;
    shippingCost: number;
    platformFees: number;
    netProfit: number;
  };
  rows: {
    period: string;
    sales: number;
    cogs: number;
    profit: number;
    marginPct: number;
    orderCount: number;
  }[];
}

export interface AgingBucket {
  bucket: string;
  lotCount: number;
  totalQty: number;
  totalValue: number;
}

export interface AgingItem {
  id: string;
  productName: string;
  setCode: string | null;
  brand: string;
  productType: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  ageDays: number;
  suggestedAction: string;
}

export interface InventoryAgingReport {
  buckets: AgingBucket[];
  items: AgingItem[];
}

export interface BestSellerItem {
  productName: string;
  setCode: string | null;
  brand: string;
  totalRevenue: number;
  totalProfit: number;
  totalQty: number;
  avgDaysHeld: number;
}

export interface BestSellersReport {
  byRevenue: BestSellerItem[];
  byProfit: BestSellerItem[];
  byQty: BestSellerItem[];
  byTurnover: BestSellerItem[];
}

export interface ChannelRow {
  channel: string;
  orderCount: number;
  revenue: number;
  profit: number;
  avgOrderValue: number;
}

export interface CashFlowReport {
  cashIn: number;
  cashOut: number;
  netChange: number;
  currentBalance: number;
}

interface ReportFilters {
  brand?: string;
  channel?: string;
  productType?: string;
}

// ── Helpers ──

function p(val: unknown): number {
  if (typeof val === "number") return val;
  return parseFloat(String(val)) || 0;
}

// ── Cached fetchers ──

/**
 * Profit report: single CTE query combining summary + grouped rows.
 * Groups by sale first to avoid double-counting sale-level fields.
 */
const fetchProfitReport = unstable_cache(
  async (fromISO: string, toISO: string, group: string, filtersJSON: string) => {
    const from = new Date(fromISO);
    const to = new Date(toISO);
    const filters: ReportFilters = JSON.parse(filtersJSON);

    const conditions = [`s.status = 'CONFIRMED'`, `s.sold_at >= $1`, `s.sold_at < $2`];
    const params: unknown[] = [from, to];
    let paramIdx = 3;

    if (filters.channel) {
      conditions.push(`s.channel = $${paramIdx}::"SalesChannel"`);
      params.push(filters.channel);
      paramIdx++;
    }
    if (filters.brand) {
      conditions.push(`il.brand = $${paramIdx}`);
      params.push(filters.brand);
      paramIdx++;
    }
    if (filters.productType) {
      conditions.push(`il.product_type = $${paramIdx}`);
      params.push(filters.productType);
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");
    const needsILJoin = filters.brand || filters.productType;
    const ilJoin = needsILJoin
      ? `JOIN inventory_lots il ON sli.inventory_lot_id = il.id`
      : "";
    const groupFn = group === "week" ? "'week'" : group === "month" ? "'month'" : "'day'";

    // Single CTE: aggregate per-sale first, then group by period
    const sql = `
      WITH sale_agg AS (
        SELECT
          s.id AS sale_id,
          date_trunc(${groupFn}, s.sold_at) AS period,
          s.total_collected,
          s.shipping_cost_paid,
          s.platform_fees,
          COALESCE(SUM(sli.cogs_total), 0) AS cogs,
          COALESCE(SUM(sli.profit_total), 0) AS profit
        FROM sales s
        JOIN sale_line_items sli ON sli.sale_id = s.id
        ${ilJoin}
        WHERE ${whereClause}
        GROUP BY s.id, date_trunc(${groupFn}, s.sold_at), s.total_collected, s.shipping_cost_paid, s.platform_fees
      ),
      grouped AS (
        SELECT
          period,
          COUNT(*)::int AS order_count,
          SUM(total_collected) AS sales,
          SUM(cogs) AS cogs,
          SUM(profit) AS profit,
          SUM(shipping_cost_paid) AS shipping_cost,
          SUM(platform_fees) AS platform_fees
        FROM sale_agg
        GROUP BY period
      )
      SELECT
        COALESCE(SUM(sales), 0)::text AS gross_sales,
        COALESCE(SUM(cogs), 0)::text AS total_cogs,
        COALESCE(SUM(profit), 0)::text AS gross_profit,
        COALESCE(SUM(shipping_cost), 0)::text AS shipping_cost,
        COALESCE(SUM(platform_fees), 0)::text AS platform_fees,
        COALESCE(json_agg(
          json_build_object(
            'period', period,
            'order_count', order_count,
            'sales', sales::text,
            'cogs', cogs::text,
            'profit', profit::text
          ) ORDER BY period DESC
        ) FILTER (WHERE period IS NOT NULL), '[]'::json) AS rows
      FROM grouped
    `;

    const results = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params);
    const row = results[0] || {};

    const grossSales = p(row.gross_sales);
    const cogs = p(row.total_cogs);
    const grossProfit = p(row.gross_profit);
    const shippingCost = p(row.shipping_cost);
    const platformFees = p(row.platform_fees);
    const netProfit = grossProfit - shippingCost - platformFees;

    // Parse the JSON array of grouped rows
    const rawRows = typeof row.rows === "string" ? JSON.parse(row.rows) : (row.rows || []);

    return {
      summary: {
        grossSales,
        cogs,
        grossProfit,
        marginPct: grossSales > 0 ? (grossProfit / grossSales) * 100 : 0,
        shippingCost,
        platformFees,
        netProfit,
      },
      rows: (rawRows as Record<string, unknown>[]).map((r) => {
        const sales = p(r.sales);
        const rowCogs = p(r.cogs);
        const profit = p(r.profit);
        return {
          period: new Date(r.period as string).toISOString(),
          sales,
          cogs: rowCogs,
          profit,
          marginPct: sales > 0 ? (profit / sales) * 100 : 0,
          orderCount: Number(r.order_count) || 0,
        };
      }),
    };
  },
  ["report-profit-v2"],
  { revalidate: 300, tags: ["reports"] }
);

const fetchInventoryAging = unstable_cache(
  async (filtersJSON: string) => {
    const filters: ReportFilters = JSON.parse(filtersJSON);

    const conditions = [`il.status != 'SOLD_OUT'`, `il.qty_on_hand > 0`];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters.brand) {
      conditions.push(`il.brand = $${paramIdx}`);
      params.push(filters.brand);
      paramIdx++;
    }
    if (filters.productType) {
      conditions.push(`il.product_type = $${paramIdx}`);
      params.push(filters.productType);
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");

    const sql = `
      SELECT
        il.id,
        il.product_name,
        il.set_code,
        il.brand,
        il.product_type,
        il.qty_on_hand AS qty,
        il.unit_cost::text AS unit_cost,
        (il.qty_on_hand * il.unit_cost)::text AS total_cost,
        EXTRACT(DAY FROM NOW() - il.acquired_at)::int AS age_days
      FROM inventory_lots il
      WHERE ${whereClause}
      ORDER BY EXTRACT(DAY FROM NOW() - il.acquired_at) DESC
    `;

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params);

    const bucketMap: Record<string, AgingBucket> = {
      "0-7d": { bucket: "0-7d", lotCount: 0, totalQty: 0, totalValue: 0 },
      "8-30d": { bucket: "8-30d", lotCount: 0, totalQty: 0, totalValue: 0 },
      "31-60d": { bucket: "31-60d", lotCount: 0, totalQty: 0, totalValue: 0 },
      "60+d": { bucket: "60+d", lotCount: 0, totalQty: 0, totalValue: 0 },
    };

    const items: AgingItem[] = rows.map((r) => {
      const ageDays = Number(r.age_days) || 0;
      const qty = Number(r.qty) || 0;
      const totalCost = p(r.total_cost);

      let bucketKey: string;
      let suggestedAction: string;
      if (ageDays <= 7) {
        bucketKey = "0-7d";
        suggestedAction = "Hold";
      } else if (ageDays <= 30) {
        bucketKey = "8-30d";
        suggestedAction = "Monitor";
      } else if (ageDays <= 60) {
        bucketKey = "31-60d";
        suggestedAction = "Bundle";
      } else {
        bucketKey = "60+d";
        suggestedAction = "Discount / Take-all";
      }

      bucketMap[bucketKey].lotCount++;
      bucketMap[bucketKey].totalQty += qty;
      bucketMap[bucketKey].totalValue += totalCost;

      return {
        id: String(r.id),
        productName: String(r.product_name),
        setCode: r.set_code ? String(r.set_code) : null,
        brand: String(r.brand),
        productType: String(r.product_type),
        qty,
        unitCost: p(r.unit_cost),
        totalCost,
        ageDays,
        suggestedAction,
      };
    });

    return {
      buckets: Object.values(bucketMap),
      items,
    };
  },
  ["report-aging"],
  { revalidate: 300, tags: ["reports"] }
);

const fetchBestSellers = unstable_cache(
  async (fromISO: string, toISO: string, filtersJSON: string) => {
    const from = new Date(fromISO);
    const to = new Date(toISO);
    const filters: ReportFilters = JSON.parse(filtersJSON);

    const conditions = [`s.status = 'CONFIRMED'`, `s.sold_at >= $1`, `s.sold_at < $2`];
    const params: unknown[] = [from, to];
    let paramIdx = 3;

    if (filters.channel) {
      conditions.push(`s.channel = $${paramIdx}::"SalesChannel"`);
      params.push(filters.channel);
      paramIdx++;
    }
    if (filters.brand) {
      conditions.push(`il.brand = $${paramIdx}`);
      params.push(filters.brand);
      paramIdx++;
    }
    if (filters.productType) {
      conditions.push(`il.product_type = $${paramIdx}`);
      params.push(filters.productType);
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");

    const sql = `
      SELECT
        il.product_name,
        il.set_code,
        il.brand,
        COALESCE(SUM(sli.qty * sli.unit_price), 0)::text AS total_revenue,
        COALESCE(SUM(sli.profit_total), 0)::text AS total_profit,
        COALESCE(SUM(sli.qty), 0)::int AS total_qty,
        COALESCE(AVG(EXTRACT(DAY FROM s.sold_at - il.acquired_at)), 0)::int AS avg_days_held
      FROM sale_line_items sli
      JOIN sales s ON sli.sale_id = s.id
      JOIN inventory_lots il ON sli.inventory_lot_id = il.id
      WHERE ${whereClause}
      GROUP BY il.product_name, il.set_code, il.brand
    `;

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params);

    const items: BestSellerItem[] = rows.map((r) => ({
      productName: String(r.product_name),
      setCode: r.set_code ? String(r.set_code) : null,
      brand: String(r.brand),
      totalRevenue: p(r.total_revenue),
      totalProfit: p(r.total_profit),
      totalQty: Number(r.total_qty) || 0,
      avgDaysHeld: Number(r.avg_days_held) || 0,
    }));

    return {
      byRevenue: [...items].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 20),
      byProfit: [...items].sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 20),
      byQty: [...items].sort((a, b) => b.totalQty - a.totalQty).slice(0, 20),
      byTurnover: [...items].sort((a, b) => a.avgDaysHeld - b.avgDaysHeld).slice(0, 20),
    };
  },
  ["report-best-sellers"],
  { revalidate: 300, tags: ["reports"] }
);

/**
 * Channel performance: CTE pre-aggregates line-item profit per sale
 * to replace the expensive correlated subquery.
 */
const fetchChannelPerformance = unstable_cache(
  async (fromISO: string, toISO: string, filtersJSON: string) => {
    const from = new Date(fromISO);
    const to = new Date(toISO);
    const filters: ReportFilters = JSON.parse(filtersJSON);

    const conditions = [`s.status = 'CONFIRMED'`, `s.sold_at >= $1`, `s.sold_at < $2`];
    const params: unknown[] = [from, to];
    let paramIdx = 3;

    if (filters.brand) {
      conditions.push(`EXISTS (
        SELECT 1 FROM sale_line_items sli2
        JOIN inventory_lots il2 ON sli2.inventory_lot_id = il2.id
        WHERE sli2.sale_id = s.id AND il2.brand = $${paramIdx}
      )`);
      params.push(filters.brand);
      paramIdx++;
    }
    if (filters.productType) {
      conditions.push(`EXISTS (
        SELECT 1 FROM sale_line_items sli3
        JOIN inventory_lots il3 ON sli3.inventory_lot_id = il3.id
        WHERE sli3.sale_id = s.id AND il3.product_type = $${paramIdx}
      )`);
      params.push(filters.productType);
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");

    // CTE pre-aggregates profit per sale (1 scan of sale_line_items)
    // then outer query groups by channel — no correlated subquery
    const sql = `
      WITH sale_line_agg AS (
        SELECT sli.sale_id, COALESCE(SUM(sli.profit_total), 0) AS line_profit
        FROM sale_line_items sli
        GROUP BY sli.sale_id
      )
      SELECT
        s.channel,
        COUNT(*)::int AS order_count,
        COALESCE(SUM(s.total_collected), 0)::text AS revenue,
        COALESCE(
          SUM(sla.line_profit) - SUM(s.shipping_cost_paid) - SUM(s.platform_fees),
          0
        )::text AS profit,
        CASE WHEN COUNT(*) > 0
          THEN (SUM(s.total_collected) / COUNT(*))::text
          ELSE '0'
        END AS avg_order_value
      FROM sales s
      LEFT JOIN sale_line_agg sla ON sla.sale_id = s.id
      WHERE ${whereClause}
      GROUP BY s.channel
      ORDER BY SUM(s.total_collected) DESC
    `;

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params);

    return rows.map((r) => ({
      channel: String(r.channel),
      orderCount: Number(r.order_count) || 0,
      revenue: p(r.revenue),
      profit: p(r.profit),
      avgOrderValue: p(r.avg_order_value),
    }));
  },
  ["report-channels-v2"],
  { revalidate: 300, tags: ["reports"] }
);

/**
 * Cash flow: single query with conditional CASE for range vs all-time.
 */
const fetchCashFlow = unstable_cache(
  async (fromISO: string, toISO: string) => {
    const from = new Date(fromISO);
    const to = new Date(toISO);

    // One scan of cash_transactions: range totals via CASE + all-time balance
    const sql = `
      SELECT
        COALESCE(SUM(CASE WHEN date >= $1 AND date < $2 AND type = 'IN' THEN amount ELSE 0 END), 0)::text AS cash_in,
        COALESCE(SUM(CASE WHEN date >= $1 AND date < $2 AND type = 'OUT' THEN amount ELSE 0 END), 0)::text AS cash_out,
        COALESCE(SUM(CASE WHEN date >= $1 AND date < $2 THEN CASE WHEN type = 'IN' THEN amount ELSE -amount END ELSE 0 END), 0)::text AS net_change,
        COALESCE(SUM(CASE WHEN type = 'IN' THEN amount ELSE -amount END), 0)::text AS balance
      FROM cash_transactions
    `;

    const results = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, from, to);
    const r = results[0] || {};

    return {
      cashIn: p(r.cash_in),
      cashOut: p(r.cash_out),
      netChange: p(r.net_change),
      currentBalance: p(r.balance),
    };
  },
  ["report-cashflow-v2"],
  { revalidate: 300, tags: ["reports"] }
);

// ── Public server actions ──

export async function getReportProfit(
  from: Date,
  to: Date,
  group: string,
  filters: ReportFilters
): Promise<ProfitReport> {
  const timer = actionTimer("getReportProfit");
  await requireUser();
  const result = await fetchProfitReport(
    from.toISOString(),
    to.toISOString(),
    group,
    JSON.stringify(filters)
  );
  timer.done();
  return result;
}

export async function getReportInventoryAging(
  filters: ReportFilters
): Promise<InventoryAgingReport> {
  const timer = actionTimer("getReportInventoryAging");
  await requireUser();
  const result = await fetchInventoryAging(JSON.stringify(filters));
  timer.done();
  return result;
}

export async function getReportBestSellers(
  from: Date,
  to: Date,
  filters: ReportFilters
): Promise<BestSellersReport> {
  const timer = actionTimer("getReportBestSellers");
  await requireUser();
  const result = await fetchBestSellers(
    from.toISOString(),
    to.toISOString(),
    JSON.stringify(filters)
  );
  timer.done();
  return result;
}

export async function getReportChannelPerformance(
  from: Date,
  to: Date,
  filters: ReportFilters
): Promise<ChannelRow[]> {
  const timer = actionTimer("getReportChannelPerformance");
  await requireUser();
  const result = await fetchChannelPerformance(
    from.toISOString(),
    to.toISOString(),
    JSON.stringify(filters)
  );
  timer.done();
  return result;
}

export async function getReportCashFlow(
  from: Date,
  to: Date
): Promise<CashFlowReport> {
  const timer = actionTimer("getReportCashFlow");
  await requireUser();
  const result = await fetchCashFlow(from.toISOString(), to.toISOString());
  timer.done();
  return result;
}
