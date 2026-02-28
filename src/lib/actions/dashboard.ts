"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { SaleStatus } from "@/generated/prisma/client";

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  return parseFloat(String(val)) || 0;
}

export async function getDashboardStats() {
  await requireUser();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);

  const confirmedWhere = (from: Date) => ({
    status: "CONFIRMED" as SaleStatus,
    soldAt: { gte: from },
  });

  // Fire ALL queries in parallel — one round-trip
  const [
    cashGroups,
    inventoryValueResult,
    saleAggToday,
    profitAggToday,
    saleAgg7d,
    profitAgg7d,
    saleAgg30d,
    profitAgg30d,
    lowStockCount,
    oldestLot,
    recentSales,
    recentPurchases,
    recentCash,
  ] = await Promise.all([
    // Cash balance
    prisma.cashTransaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
    }),
    // Inventory value — raw SQL for SUM(qty * cost) without fetching rows
    prisma.$queryRaw<[{ value: string }]>`
      SELECT COALESCE(SUM(qty_on_hand * unit_cost), 0)::text as value
      FROM inventory_lots
      WHERE status != 'SOLD_OUT'
    `,
    // Sale aggregates: today
    prisma.sale.aggregate({
      where: confirmedWhere(today),
      _count: true,
      _sum: { totalCollected: true, shippingCostPaid: true, platformFees: true },
    }),
    prisma.saleLineItem.aggregate({
      where: { sale: confirmedWhere(today) },
      _sum: { profitTotal: true },
    }),
    // Sale aggregates: 7d
    prisma.sale.aggregate({
      where: confirmedWhere(sevenDaysAgo),
      _count: true,
      _sum: { totalCollected: true, shippingCostPaid: true, platformFees: true },
    }),
    prisma.saleLineItem.aggregate({
      where: { sale: confirmedWhere(sevenDaysAgo) },
      _sum: { profitTotal: true },
    }),
    // Sale aggregates: 30d
    prisma.sale.aggregate({
      where: confirmedWhere(thirtyDaysAgo),
      _count: true,
      _sum: { totalCollected: true, shippingCostPaid: true, platformFees: true },
    }),
    prisma.saleLineItem.aggregate({
      where: { sale: confirmedWhere(thirtyDaysAgo) },
      _sum: { profitTotal: true },
    }),
    // Low stock count
    prisma.inventoryLot.count({
      where: { qtyOnHand: { lte: 2, gt: 0 }, status: { not: "SOLD_OUT" } },
    }),
    // Oldest stock
    prisma.inventoryLot.findFirst({
      where: { status: { not: "SOLD_OUT" } },
      orderBy: { acquiredAt: "asc" },
      select: { acquiredAt: true },
    }),
    // Recent activity — minimal selects
    prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        totalCollected: true,
        createdAt: true,
        buyerName: true,
      },
    }),
    prisma.purchase.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        supplier: { select: { name: true } },
        _count: { select: { lineItems: true } },
      },
    }),
    prisma.cashTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        createdAt: true,
      },
    }),
  ]);

  // Compute cash balance
  let cashBalance = 0;
  for (const row of cashGroups) {
    const amount = toNum(row._sum.amount);
    if (row.type === "IN") cashBalance += amount;
    else cashBalance -= amount;
  }

  // Compute inventory value from raw result
  const inventoryValue = parseFloat(inventoryValueResult[0]?.value ?? "0");

  // Build sale stats from aggregates
  function buildSaleStats(
    saleAgg: typeof saleAggToday,
    profitAgg: typeof profitAggToday
  ) {
    const lineProfit = toNum(profitAgg._sum.profitTotal);
    return {
      count: saleAgg._count,
      totalCollected: toNum(saleAgg._sum.totalCollected),
      totalProfit:
        lineProfit -
        toNum(saleAgg._sum.shippingCostPaid) -
        toNum(saleAgg._sum.platformFees),
    };
  }

  return {
    cashBalance,
    inventoryValue,
    salesToday: buildSaleStats(saleAggToday, profitAggToday),
    sales7d: buildSaleStats(saleAgg7d, profitAgg7d),
    sales30d: buildSaleStats(saleAgg30d, profitAgg30d),
    lowStockCount,
    oldestStockDays: oldestLot
      ? Math.floor(
          (now.getTime() - oldestLot.acquiredAt.getTime()) / 86400000
        )
      : 0,
    recentSales,
    recentPurchases,
    recentCash,
  };
}
