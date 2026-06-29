"use server";

import { prisma, actionTimer } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { inventoryLotSchema, adjustQtySchema } from "@/lib/validators";
import { revalidatePath, updateTag } from "next/cache";
import { unstable_cache } from "next/cache";
import { InventoryStatus, type Prisma } from "@prisma/client";

const PAGE_SIZE = 50;

// ── Cached data fetchers ──

const fetchInventoryLots = unstable_cache(
  async (whereJSON: string, skip: number, take: number) => {
    const where: Prisma.InventoryLotWhereInput = JSON.parse(whereJSON);
    const [items, total] = await prisma.$transaction([
      prisma.inventoryLot.findMany({
        where,
        orderBy: { acquiredAt: "asc" },
        skip,
        take,
      }),
      prisma.inventoryLot.count({ where }),
    ]);
    return { items: JSON.parse(JSON.stringify(items)), total };
  },
  ["inventory-list"],
  { revalidate: 60, tags: ["inventory"] }
);

const fetchInventoryLot = unstable_cache(
  async (id: string) => {
    const lot = await prisma.inventoryLot.findUnique({
      where: { id },
      include: { supplier: true, purchase: true },
    });
    return lot ? JSON.parse(JSON.stringify(lot)) : null;
  },
  ["inventory-detail"],
  { revalidate: 60, tags: ["inventory"] }
);

const fetchInventoryBrands = unstable_cache(
  async (userId: string) => {
    const brands = await prisma.inventoryLot.findMany({
      where: { createdById: userId },
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
    });
    return brands.map((b) => b.brand);
  },
  ["inventory-brands"],
  { revalidate: 60, tags: ["inventory"] }
);

// ── Public server actions ──

export async function getInventoryLots(filters?: {
  brand?: string;
  productType?: string;
  language?: string;
  status?: string;
  search?: string;
  page?: number;
}) {
  const timer = actionTimer("getInventoryLots");
  const user = await requireUser();

  const where: Prisma.InventoryLotWhereInput = { createdById: user.id };

  if (filters?.brand) where.brand = filters.brand;
  if (filters?.productType) {
    where.productType = filters.productType as Prisma.EnumProductTypeFilter["equals"];
  }
  if (filters?.language) {
    where.language = filters.language as Prisma.EnumLanguageTypeFilter["equals"];
  }
  if (filters?.status) {
    where.status = filters.status as InventoryStatus;
  } else {
    where.status = { not: "SOLD_OUT" };
  }
  if (filters?.search) {
    where.OR = [
      { productName: { contains: filters.search, mode: "insensitive" } },
      { setCode: { contains: filters.search, mode: "insensitive" } },
      { brand: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const page = Math.max(1, filters?.page ?? 1);
  const skip = (page - 1) * PAGE_SIZE;

  const result = await fetchInventoryLots(JSON.stringify(where), skip, PAGE_SIZE);

  timer.done();
  return { ...result, page, totalPages: Math.ceil(result.total / PAGE_SIZE) };
}

export async function getInventoryLot(id: string) {
  const user = await requireUser();
  const lot = await fetchInventoryLot(id);
  if (lot && lot.createdById !== user.id) return null;
  return lot;
}

export async function createInventoryLot(formData: FormData) {
  const timer = actionTimer("createInventoryLot");
  const user = await requireUser();

  const raw = {
    brand: formData.get("brand") as string,
    productType: formData.get("productType") as string,
    setCode: formData.get("setCode") as string,
    productName: formData.get("productName") as string,
    language: formData.get("language") as string,
    rarity: formData.get("rarity") as string,
    condition: formData.get("condition") as string,
    notes: formData.get("notes") as string,
    qtyOnHand: formData.get("qtyOnHand") as string,
    unitCost: formData.get("unitCost") as string,
    location: formData.get("location") as string,
  };

  const parsed = inventoryLotSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const lot = await prisma.inventoryLot.create({
    data: {
      ...parsed.data,
      productType: parsed.data.productType as never,
      language: parsed.data.language as never,
      unitCost: parsed.data.unitCost,
      createdById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "inventory_lot",
      entityId: lot.id,
      action: "CREATE",
      diff: parsed.data,
      actorId: user.id,
    },
  });

  timer.done();
  revalidatePath("/inventory");
  updateTag("inventory");
  updateTag("dashboard");
  updateTag("reports");
  return { success: true };
}

export async function updateInventoryLot(id: string, formData: FormData) {
  const timer = actionTimer("updateInventoryLot");
  const user = await requireUser();

  const existing = await prisma.inventoryLot.findUnique({ where: { id }, select: { createdById: true } });
  if (!existing || existing.createdById !== user.id) return { error: "Not found" };

  const raw = {
    brand: formData.get("brand") as string,
    productType: formData.get("productType") as string,
    setCode: formData.get("setCode") as string,
    productName: formData.get("productName") as string,
    language: formData.get("language") as string,
    rarity: formData.get("rarity") as string,
    condition: formData.get("condition") as string,
    notes: formData.get("notes") as string,
    qtyOnHand: formData.get("qtyOnHand") as string,
    unitCost: formData.get("unitCost") as string,
    location: formData.get("location") as string,
  };

  const parsed = inventoryLotSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const lot = await prisma.inventoryLot.findUnique({ where: { id } });
  if (!lot) return { error: "Lot not found" };
  if (lot.createdById !== user.id) return { error: "Not found" };

  await prisma.$transaction([
    prisma.inventoryLot.update({
      where: { id },
      data: {
        ...parsed.data,
        productType: parsed.data.productType as never,
        language: parsed.data.language as never,
        unitCost: parsed.data.unitCost,
        status:
          parsed.data.qtyOnHand === 0
            ? "SOLD_OUT"
            : lot.status === "SOLD_OUT"
              ? "ON_HAND"
              : lot.status,
      },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "inventory_lot",
        entityId: id,
        action: "UPDATE",
        diff: { before: lot, after: parsed.data },
        actorId: user.id,
      },
    }),
  ]);

  timer.done();
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  updateTag("inventory");
  updateTag("dashboard");
  updateTag("reports");
  return { success: true };
}

export async function adjustInventoryQty(data: {
  lotId: string;
  newQty: number;
  reason?: string;
}) {
  const timer = actionTimer("adjustInventoryQty");
  const user = await requireUser();

  const parsed = adjustQtySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const lot = await prisma.inventoryLot.findUnique({
    where: { id: parsed.data.lotId },
  });
  if (!lot) return { error: "Lot not found" };
  if (lot.createdById !== user.id) return { error: "Not found" };

  const newStatus: InventoryStatus =
    parsed.data.newQty === 0
      ? "SOLD_OUT"
      : lot.status === "SOLD_OUT"
        ? "ON_HAND"
        : lot.status;

  await prisma.$transaction([
    prisma.inventoryLot.update({
      where: { id: parsed.data.lotId },
      data: {
        qtyOnHand: parsed.data.newQty,
        status: newStatus,
      },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "inventory_lot",
        entityId: parsed.data.lotId,
        action: "ADJUST_QTY",
        diff: {
          from: lot.qtyOnHand,
          to: parsed.data.newQty,
          reason: parsed.data.reason || "Manual adjustment",
        },
        actorId: user.id,
      },
    }),
  ]);

  timer.done();
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${parsed.data.lotId}`);
  updateTag("inventory");
  updateTag("dashboard");
  updateTag("reports");
  return { success: true };
}

export async function reserveInventoryLot(lotId: string) {
  const user = await requireUser();

  const lot = await prisma.inventoryLot.findUnique({ where: { id: lotId } });
  if (!lot) return { error: "Lot not found" };
  if (lot.createdById !== user.id) return { error: "Not found" };
  if (lot.status !== "ON_HAND") return { error: "Lot is not on hand" };

  await prisma.$transaction([
    prisma.inventoryLot.update({
      where: { id: lotId },
      data: { status: "RESERVED" },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "inventory_lot",
        entityId: lotId,
        action: "RESERVE",
        diff: { from: "ON_HAND", to: "RESERVED" },
        actorId: user.id,
      },
    }),
  ]);

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${lotId}`);
  updateTag("inventory");
  updateTag("reports");
  return { success: true };
}

export async function unreserveInventoryLot(lotId: string) {
  const user = await requireUser();

  const lot = await prisma.inventoryLot.findUnique({ where: { id: lotId } });
  if (!lot) return { error: "Lot not found" };
  if (lot.createdById !== user.id) return { error: "Not found" };
  if (lot.status !== "RESERVED") return { error: "Lot is not reserved" };

  await prisma.$transaction([
    prisma.inventoryLot.update({
      where: { id: lotId },
      data: { status: "ON_HAND" },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "inventory_lot",
        entityId: lotId,
        action: "UNRESERVE",
        diff: { from: "RESERVED", to: "ON_HAND" },
        actorId: user.id,
      },
    }),
  ]);

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${lotId}`);
  updateTag("inventory");
  updateTag("reports");
  return { success: true };
}

export async function getInventoryBrands() {
  const user = await requireUser();
  return fetchInventoryBrands(user.id);
}
