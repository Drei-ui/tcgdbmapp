"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  return parseFloat(String(val)) || 0;
}

export async function getDashboardStats() {
  await requireUser();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Cash balance
  const cashGroups = await prisma.cashTransaction.groupBy({
    by: ["type"],
    _sum: { amount: true },
  });
  let cashBalance = 0;
  for (const row of cashGroups) {
    const amount = toNum(row._sum.amount);
    if (row.type === "IN") cashBalance += amount;
    else cashBalance -= amount;
  }

  // Inventory value at cost
  const inventoryLots = await prisma.inventoryLot.findMany({
    where: { status: { not: "SOLD_OUT" } },
    select: { qtyOnHand: true, unitCost: true },
  });
  const inventoryValue = inventoryLots.reduce(
    (sum, lot) => sum + toNum(lot.unitCost) * lot.qtyOnHand,
    0
  );

  // Sales + Profit for different periods
  async function getSaleStats(from: Date) {
    const sales = await prisma.sale.findMany({
      where: {
        status: "CONFIRMED",
        soldAt: { gte: from },
      },
      include: { lineItems: true },
    });

    const totalCollected = sales.reduce(
      (sum, s) => sum + toNum(s.totalCollected),
      0
    );
    const totalProfit = sales.reduce((sum, s) => {
      const lineProfit = s.lineItems.reduce(
        (lSum, li) => lSum + toNum(li.profitTotal),
        0
      );
      return (
        sum + lineProfit - toNum(s.shippingCostPaid) - toNum(s.platformFees)
      );
    }, 0);

    return { count: sales.length, totalCollected, totalProfit };
  }

  const [salesToday, sales7d, sales30d] = await Promise.all([
    getSaleStats(today),
    getSaleStats(sevenDaysAgo),
    getSaleStats(thirtyDaysAgo),
  ]);

  // Low stock (qty <= 2 and not sold out)
  const lowStockCount = await prisma.inventoryLot.count({
    where: {
      qtyOnHand: { lte: 2, gt: 0 },
      status: { not: "SOLD_OUT" },
    },
  });

  // Oldest stock
  const oldestLot = await prisma.inventoryLot.findFirst({
    where: { status: { not: "SOLD_OUT" } },
    orderBy: { acquiredAt: "asc" },
    select: { acquiredAt: true },
  });
  const oldestStockDays = oldestLot
    ? Math.floor(
        (now.getTime() - oldestLot.acquiredAt.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  // Recent activity (last 10 events)
  const [recentSales, recentPurchases, recentCash] = await Promise.all([
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
      include: { supplier: true, lineItems: true },
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

  return {
    cashBalance,
    inventoryValue,
    salesToday,
    sales7d,
    sales30d,
    lowStockCount,
    oldestStockDays,
    recentSales,
    recentPurchases,
    recentCash,
  };
}
