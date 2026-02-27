"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { purchaseSchema, supplierSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  return parseFloat(String(val)) || 0;
}

export async function getSuppliers() {
  await requireUser();
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function createSupplier(data: {
  name: string;
  contact?: string;
  notes?: string;
}) {
  await requireUser();
  const parsed = supplierSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supplier = await prisma.supplier.create({ data: parsed.data });
  return { success: true, supplier };
}

export async function getPurchases() {
  await requireUser();
  return prisma.purchase.findMany({
    orderBy: { purchasedAt: "desc" },
    include: {
      supplier: true,
      lineItems: true,
      inventoryLots: true,
    },
  });
}

export async function getPurchase(id: string) {
  await requireUser();
  return prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      lineItems: true,
      inventoryLots: true,
    },
  });
}

export async function createPurchase(data: {
  supplierId?: string;
  newSupplierName?: string;
  purchasedAt?: string;
  shippingCost: number;
  fees: number;
  notes?: string;
  lineItems: {
    brand: string;
    productType: string;
    setCode?: string;
    productName: string;
    language?: string;
    rarity?: string;
    condition?: string;
    qty: number;
    unitCost: number;
  }[];
}) {
  const user = await requireUser();

  const parsed = purchaseSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let supplierId = parsed.data.supplierId;

  // Create supplier if new name is provided
  if (!supplierId && parsed.data.newSupplierName) {
    const supplier = await prisma.supplier.create({
      data: { name: parsed.data.newSupplierName },
    });
    supplierId = supplier.id;
  }

  const purchase = await prisma.purchase.create({
    data: {
      supplierId,
      purchasedAt: parsed.data.purchasedAt || new Date(),
      shippingCost: parsed.data.shippingCost,
      fees: parsed.data.fees,
      notes: parsed.data.notes,
      createdById: user.id,
      lineItems: {
        create: parsed.data.lineItems.map((item) => ({
          brand: item.brand,
          productType: item.productType as never,
          setCode: item.setCode,
          productName: item.productName,
          language: (item.language || "EN") as never,
          rarity: item.rarity,
          condition: item.condition,
          qty: item.qty,
          unitCost: item.unitCost,
        })),
      },
    },
  });

  revalidatePath("/purchases");
  return { success: true, purchaseId: purchase.id };
}

export async function receivePurchase(purchaseId: string) {
  const user = await requireUser();

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { lineItems: true, inventoryLots: true },
  });

  if (!purchase) return { error: "Purchase not found" };
  if (purchase.inventoryLots.length > 0) {
    return { error: "Purchase has already been received" };
  }

  // Calculate per-item share of shipping cost
  const totalItemCost = purchase.lineItems.reduce(
    (sum, item) => sum + toNum(item.unitCost) * item.qty,
    0
  );
  const shippingCost = toNum(purchase.shippingCost);
  const fees = toNum(purchase.fees);

  await prisma.$transaction(async (tx) => {
    for (const item of purchase.lineItems) {
      // Allocate shipping + fees proportionally
      const itemTotal = toNum(item.unitCost) * item.qty;
      const proportion = totalItemCost > 0 ? itemTotal / totalItemCost : 0;
      const allocatedExtra =
        (shippingCost + fees) * proportion;
      const adjustedUnitCost =
        toNum(item.unitCost) + allocatedExtra / item.qty;

      await tx.inventoryLot.create({
        data: {
          brand: item.brand,
          productType: item.productType,
          setCode: item.setCode,
          productName: item.productName,
          language: item.language,
          rarity: item.rarity,
          condition: item.condition,
          qtyOnHand: item.qty,
          unitCost: Math.round(adjustedUnitCost * 100) / 100,
          purchaseId: purchaseId,
          supplierId: purchase.supplierId,
          createdById: user.id,
        },
      });
    }

    // Auto-create cash OUT for the purchase
    const totalAmount = totalItemCost + shippingCost + fees;
    await tx.cashTransaction.create({
      data: {
        type: "OUT",
        category: "INVENTORY_BUY",
        amount: totalAmount,
        description: `Purchase #${purchaseId.slice(0, 8)} received`,
        paymentMethod: "CASH",
        linkedPurchaseId: purchaseId,
        createdById: user.id,
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        entityType: "purchase",
        entityId: purchaseId,
        action: "RECEIVE_PURCHASE",
        diff: { lineItemCount: purchase.lineItems.length },
        actorId: user.id,
      },
    });
  });

  revalidatePath("/purchases");
  revalidatePath(`/purchases/${purchaseId}`);
  revalidatePath("/inventory");
  revalidatePath("/cash");
  revalidatePath("/dashboard");
  return { success: true };
}
