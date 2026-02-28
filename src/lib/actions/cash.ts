"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { cashTransactionSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { type Prisma, CashType } from "@/generated/prisma/client";

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  return parseFloat(String(val)) || 0;
}

export async function getCashTransactions(filters?: {
  type?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  await requireUser();

  const where: Prisma.CashTransactionWhereInput = {};
  if (filters?.type) where.type = filters.type as CashType;
  if (filters?.category) where.category = filters.category as never;
  if (filters?.dateFrom || filters?.dateTo) {
    where.date = {};
    if (filters?.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters?.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  return prisma.cashTransaction.findMany({
    where,
    orderBy: { date: "desc" },
  });
}

export async function getCashBalance() {
  await requireUser();

  const result = await prisma.cashTransaction.groupBy({
    by: ["type"],
    _sum: { amount: true },
  });

  let balance = 0;
  for (const row of result) {
    const amount = toNum(row._sum.amount);
    if (row.type === "IN") balance += amount;
    else balance -= amount;
  }

  return balance;
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
  const user = await requireUser();

  const parsed = cashTransactionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.cashTransaction.create({
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

  revalidatePath("/cash");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteCashTransaction(id: string) {
  const user = await requireUser();

  const tx = await prisma.cashTransaction.findUnique({ where: { id } });
  if (!tx) return { error: "Transaction not found" };

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
  return { success: true };
}
