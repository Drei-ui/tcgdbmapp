"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { saleSchema, quickSellSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { SaleStatus, type Prisma } from "@/generated/prisma/client";

/** Convert Prisma Decimal to number safely */
function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  return parseFloat(String(val)) || 0;
}

export async function quickSell(data: {
  inventoryLotId: string;
  qty: number;
  unitPrice: number;
  channel: string;
  paymentMethod: string;
  shippingCharged: number;
  shippingCostPaid: number;
}) {
  const user = await requireUser();

  const parsed = quickSellSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const lot = await prisma.inventoryLot.findUnique({
    where: { id: parsed.data.inventoryLotId },
  });
  if (!lot) return { error: "Lot not found" };
  if (lot.qtyOnHand < parsed.data.qty) {
    return { error: `Only ${lot.qtyOnHand} available` };
  }

  const subtotal = parsed.data.unitPrice * parsed.data.qty;
  const totalCollected = subtotal + parsed.data.shippingCharged;
  const cogs = toNum(lot.unitCost) * parsed.data.qty;
  const profit = subtotal - cogs;

  const sale = await prisma.$transaction(async (tx) => {
    // Create sale as CONFIRMED directly
    const s = await tx.sale.create({
      data: {
        status: "CONFIRMED",
        channel: parsed.data.channel as never,
        paymentMethod: parsed.data.paymentMethod as never,
        subtotal,
        totalCollected,
        shippingCharged: parsed.data.shippingCharged,
        shippingCostPaid: parsed.data.shippingCostPaid,
        createdById: user.id,
        lineItems: {
          create: {
            inventoryLotId: parsed.data.inventoryLotId,
            qty: parsed.data.qty,
            unitPrice: parsed.data.unitPrice,
            cogsTotal: cogs,
            profitTotal: profit,
          },
        },
      },
    });

    // Decrement inventory
    const newQty = lot.qtyOnHand - parsed.data.qty;
    await tx.inventoryLot.update({
      where: { id: lot.id },
      data: {
        qtyOnHand: newQty,
        status: newQty === 0 ? "SOLD_OUT" : lot.status,
      },
    });

    // Cash IN for the sale
    await tx.cashTransaction.create({
      data: {
        type: "IN",
        category: "SALE_INCOME",
        amount: totalCollected,
        description: `Sale #${s.id.slice(0, 8)} — quick sell`,
        paymentMethod: parsed.data.paymentMethod as never,
        linkedSaleId: s.id,
        createdById: user.id,
      },
    });

    // Cash OUT for shipping cost if any
    if (parsed.data.shippingCostPaid > 0) {
      await tx.cashTransaction.create({
        data: {
          type: "OUT",
          category: "SHIPPING_COST",
          amount: parsed.data.shippingCostPaid,
          description: `Shipping for sale #${s.id.slice(0, 8)}`,
          paymentMethod: parsed.data.paymentMethod as never,
          linkedSaleId: s.id,
          createdById: user.id,
        },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        entityType: "sale",
        entityId: s.id,
        action: "QUICK_SELL",
        diff: { cogs: cogs.toFixed(2), profit: profit.toFixed(2) },
        actorId: user.id,
      },
    });

    return s;
  });

  revalidatePath("/inventory");
  revalidatePath("/sales");
  revalidatePath("/cash");
  revalidatePath("/dashboard");
  return { success: true, saleId: sale.id };
}

export async function getSales(filters?: {
  status?: string;
  channel?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  await requireUser();

  const where: Prisma.SaleWhereInput = {};
  if (filters?.status) where.status = filters.status as SaleStatus;
  if (filters?.channel) where.channel = filters.channel as never;
  if (filters?.dateFrom || filters?.dateTo) {
    where.soldAt = {};
    if (filters?.dateFrom) where.soldAt.gte = new Date(filters.dateFrom);
    if (filters?.dateTo) where.soldAt.lte = new Date(filters.dateTo);
  }

  return prisma.sale.findMany({
    where,
    orderBy: { soldAt: "desc" },
    select: {
      id: true,
      soldAt: true,
      status: true,
      channel: true,
      buyerName: true,
      totalCollected: true,
      lineItems: {
        select: { id: true, profitTotal: true },
      },
    },
  });
}

export async function getSale(id: string) {
  await requireUser();
  return prisma.sale.findUnique({
    where: { id },
    include: {
      lineItems: {
        include: { inventoryLot: true },
      },
    },
  });
}

export async function createSale(data: {
  channel: string;
  buyerName?: string;
  paymentMethod: string;
  discount: number;
  shippingCharged: number;
  shippingCostPaid: number;
  platformFees: number;
  notes?: string;
  lineItems: { inventoryLotId: string; qty: number; unitPrice: number }[];
}) {
  const user = await requireUser();

  const parsed = saleSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Validate all lots exist and have sufficient qty
  for (const item of parsed.data.lineItems) {
    const lot = await prisma.inventoryLot.findUnique({
      where: { id: item.inventoryLotId },
    });
    if (!lot) return { error: `Lot not found: ${item.inventoryLotId}` };
    if (lot.qtyOnHand < item.qty) {
      return { error: `Insufficient qty for ${lot.productName}` };
    }
  }

  const subtotal = parsed.data.lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.qty,
    0
  );
  const totalCollected =
    subtotal - parsed.data.discount + parsed.data.shippingCharged;

  const sale = await prisma.sale.create({
    data: {
      status: "DRAFT",
      channel: parsed.data.channel as never,
      buyerName: parsed.data.buyerName,
      paymentMethod: parsed.data.paymentMethod as never,
      subtotal,
      discount: parsed.data.discount,
      shippingCharged: parsed.data.shippingCharged,
      totalCollected,
      shippingCostPaid: parsed.data.shippingCostPaid,
      platformFees: parsed.data.platformFees,
      notes: parsed.data.notes,
      createdById: user.id,
      lineItems: {
        create: parsed.data.lineItems.map((item) => ({
          inventoryLotId: item.inventoryLotId,
          qty: item.qty,
          unitPrice: item.unitPrice,
        })),
      },
    },
  });

  revalidatePath("/sales");
  revalidatePath("/inventory");
  return { success: true, saleId: sale.id };
}

export async function confirmSale(saleId: string) {
  const user = await requireUser();

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { lineItems: { include: { inventoryLot: true } } },
  });

  if (!sale) return { error: "Sale not found" };
  if (sale.status !== "DRAFT") return { error: "Sale is not a draft" };

  // Validate all line items still have sufficient qty
  for (const item of sale.lineItems) {
    if (item.inventoryLot.qtyOnHand < item.qty) {
      return {
        error: `Insufficient qty for ${item.inventoryLot.productName}: need ${item.qty}, have ${item.inventoryLot.qtyOnHand}`,
      };
    }
  }

  // Execute confirmation in a transaction
  await prisma.$transaction(async (tx) => {
    let totalCogs = 0;

    for (const item of sale.lineItems) {
      const lot = item.inventoryLot;
      // COGS = unit_cost * qty (lot-based cost)
      const itemCogs = toNum(lot.unitCost) * item.qty;
      const itemRevenue = toNum(item.unitPrice) * item.qty;
      const itemProfit = itemRevenue - itemCogs;

      totalCogs += itemCogs;

      // Update line item with COGS and profit
      await tx.saleLineItem.update({
        where: { id: item.id },
        data: {
          cogsTotal: itemCogs,
          profitTotal: itemProfit,
        },
      });

      // Decrement inventory
      const newQty = lot.qtyOnHand - item.qty;
      await tx.inventoryLot.update({
        where: { id: lot.id },
        data: {
          qtyOnHand: newQty,
          status: newQty === 0 ? "SOLD_OUT" : lot.status,
        },
      });
    }

    // Calculate total profit
    const totalProfit =
      toNum(sale.totalCollected) -
      totalCogs -
      toNum(sale.shippingCostPaid) -
      toNum(sale.platformFees);

    // Update sale status
    await tx.sale.update({
      where: { id: saleId },
      data: { status: "CONFIRMED" },
    });

    // Auto-create linked cash IN transaction
    await tx.cashTransaction.create({
      data: {
        type: "IN",
        category: "SALE_INCOME",
        amount: toNum(sale.totalCollected),
        description: `Sale #${saleId.slice(0, 8)} confirmed`,
        paymentMethod: sale.paymentMethod,
        linkedSaleId: saleId,
        createdById: user.id,
      },
    });

    // If there's shipping cost paid, create cash OUT
    if (toNum(sale.shippingCostPaid) > 0) {
      await tx.cashTransaction.create({
        data: {
          type: "OUT",
          category: "SHIPPING_COST",
          amount: toNum(sale.shippingCostPaid),
          description: `Shipping for sale #${saleId.slice(0, 8)}`,
          paymentMethod: sale.paymentMethod,
          linkedSaleId: saleId,
          createdById: user.id,
        },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        entityType: "sale",
        entityId: saleId,
        action: "CONFIRM_SALE",
        diff: {
          totalCogs: totalCogs.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
        },
        actorId: user.id,
      },
    });
  });

  revalidatePath("/sales");
  revalidatePath(`/sales/${saleId}`);
  revalidatePath("/inventory");
  revalidatePath("/cash");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteSale(saleId: string) {
  const user = await requireUser();

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { lineItems: true },
  });

  if (!sale) return { error: "Sale not found" };

  await prisma.$transaction(async (tx) => {
    // If sale was confirmed, restore inventory
    if (sale.status === "CONFIRMED") {
      for (const item of sale.lineItems) {
        await tx.inventoryLot.update({
          where: { id: item.inventoryLotId },
          data: {
            qtyOnHand: { increment: item.qty },
            status: "ON_HAND",
          },
        });
      }
    }

    // Delete linked cash transactions
    await tx.cashTransaction.deleteMany({
      where: { linkedSaleId: saleId },
    });

    // Delete sale (cascades to line items)
    await tx.sale.delete({
      where: { id: saleId },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        entityType: "sale",
        entityId: saleId,
        action: "DELETE_SALE",
        diff: { previousStatus: sale.status },
        actorId: user.id,
      },
    });
  });

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/cash");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function cancelSale(saleId: string) {
  const user = await requireUser();

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
  });
  if (!sale) return { error: "Sale not found" };
  if (sale.status !== "DRAFT")
    return { error: "Only draft sales can be cancelled" };

  await prisma.$transaction([
    prisma.sale.update({
      where: { id: saleId },
      data: { status: "CANCELLED" },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "sale",
        entityId: saleId,
        action: "CANCEL_SALE",
        actorId: user.id,
      },
    }),
  ]);

  revalidatePath("/sales");
  revalidatePath(`/sales/${saleId}`);
  return { success: true };
}

export async function refundSale(saleId: string) {
  const user = await requireUser();

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { lineItems: true },
  });
  if (!sale) return { error: "Sale not found" };
  if (sale.status !== "CONFIRMED")
    return { error: "Only confirmed sales can be refunded" };

  await prisma.$transaction(async (tx) => {
    // Restore inventory
    for (const item of sale.lineItems) {
      await tx.inventoryLot.update({
        where: { id: item.inventoryLotId },
        data: {
          qtyOnHand: { increment: item.qty },
          status: "ON_HAND",
        },
      });
    }

    // Update sale status
    await tx.sale.update({
      where: { id: saleId },
      data: { status: "REFUNDED" },
    });

    // Create reversing cash transaction
    await tx.cashTransaction.create({
      data: {
        type: "OUT",
        category: "SALE_INCOME",
        amount: toNum(sale.totalCollected),
        description: `Refund for sale #${saleId.slice(0, 8)}`,
        paymentMethod: sale.paymentMethod,
        linkedSaleId: saleId,
        createdById: user.id,
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        entityType: "sale",
        entityId: saleId,
        action: "REFUND_SALE",
        actorId: user.id,
      },
    });
  });

  revalidatePath("/sales");
  revalidatePath(`/sales/${saleId}`);
  revalidatePath("/inventory");
  revalidatePath("/cash");
  revalidatePath("/dashboard");
  return { success: true };
}
