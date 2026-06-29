"use server";

import { prisma, actionTimer } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { cashTransactionSchema } from "@/lib/validators";
import { revalidatePath, updateTag } from "next/cache";
import { unstable_cache } from "next/cache";
import { type Prisma, CashType } from "@prisma/client";

const PAGE_SIZE = 50;

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  return parseFloat(String(val)) || 0;
}

// ── Cached data fetchers ──

const fetchCashTransactions = unstable_cache(
  async (whereJSON: string, skip: number, take: number) => {
    const where: Prisma.CashTransactionWhereInput = JSON.parse(whereJSON);
    const [items, total] = await prisma.$transaction([
      prisma.cashTransaction.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take,
      }),
      prisma.cashTransaction.count({ where }),
    ]);
    return { items: JSON.parse(JSON.stringify(items)), total };
  },
  ["cash-list"],
  { revalidate: 60, tags: ["cash"] }
);

const fetchCashBalance = unstable_cache(
  async (userId: string) => {
    const result = await prisma.cashTransaction.groupBy({
      by: ["type"],
      where: { createdById: userId },
      _sum: { amount: true },
    });

    let balance = 0;
    for (const row of result) {
      const amount = toNum(row._sum.amount);
      if (row.type === "IN") balance += amount;
      else balance -= amount;
    }

    return balance;
  },
  ["cash-balance"],
  { revalidate: 60, tags: ["cash"] }
);

// ── Public server actions ──

export async function getCashTransactions(filters?: {
  type?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}) {
  const timer = actionTimer("getCashTransactions");
  const user = await requireUser();

  const where: Prisma.CashTransactionWhereInput = { createdById: user.id };
  if (filters?.type) where.type = filters.type as CashType;
  if (filters?.category) where.category = filters.category as never;
  if (filters?.dateFrom || filters?.dateTo) {
    where.date = {};
    if (filters?.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters?.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  const page = Math.max(1, filters?.page ?? 1);
  const skip = (page - 1) * PAGE_SIZE;

  const result = await fetchCashTransactions(JSON.stringify(where), skip, PAGE_SIZE);

  timer.done();
  return { ...result, page, totalPages: Math.ceil(result.total / PAGE_SIZE) };
}

export async function getCashBalance() {
  const user = await requireUser();
  return fetchCashBalance(user.id);
}

export async function createCashTransaction(data: {
  type: string;
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
  date?: string;
  linkedSaleId?: string;
  linkedPurchaseId?: string;
}) {
  const timer = actionTimer("createCashTransaction");
  const user = await requireUser();

  const parsed = cashTransactionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const tx = await prisma.$transaction(async (db) => {
    const created = await db.cashTransaction.create({
      data: {
        type: parsed.data.type as never,
        category: parsed.data.category as never,
        amount: parsed.data.amount,
        description: parsed.data.description,
        paymentMethod: parsed.data.paymentMethod as never,
        date: parsed.data.date || new Date(),
        linkedSaleId: parsed.data.linkedSaleId,
        linkedPurchaseId: parsed.data.linkedPurchaseId,
        createdById: user.id,
      },
    });

    await db.auditLog.create({
      data: {
        entityType: "cash_transaction",
        entityId: created.id,
        action: "CREATE",
        diff: {
          type: parsed.data.type,
          category: parsed.data.category,
          amount: parsed.data.amount,
          description: parsed.data.description,
        },
        actorId: user.id,
      },
    });

    return created;
  });

  timer.done();
  revalidatePath("/cash");
  revalidatePath("/dashboard");
  updateTag("cash");
  updateTag("dashboard");
  updateTag("reports");
  return { success: true };
}

export async function deleteCashTransaction(id: string) {
  const user = await requireUser();

  const tx = await prisma.cashTransaction.findUnique({ where: { id } });
  if (!tx) return { error: "Transaction not found" };
  if (tx.createdById !== user.id) return { error: "Transaction not found" };

  // Don't allow deletion of auto-linked transactions
  if (tx.linkedSaleId || tx.linkedPurchaseId) {
    return {
      error:
        "Cannot delete auto-linked transactions. Refund/cancel the linked sale or purchase instead.",
    };
  }

  await prisma.$transaction([
    prisma.cashTransaction.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        entityType: "cash_transaction",
        entityId: id,
        action: "DELETE",
        diff: tx,
        actorId: user.id,
      },
    }),
  ]);

  revalidatePath("/cash");
  revalidatePath("/dashboard");
  updateTag("cash");
  updateTag("dashboard");
  updateTag("reports");
  return { success: true };
}
