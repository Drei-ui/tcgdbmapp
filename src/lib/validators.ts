import { z } from "zod";

// ─── Sanitization helpers ─────────────────────────────────

/** Trim whitespace and strip HTML tags from user input */
const safeString = z.string().transform((s) => s.trim().replace(/<[^>]*>/g, ""));
const safeStringRequired = (msg: string) =>
  safeString.pipe(z.string().min(1, msg));
const safeStringOptional = safeString.optional();

// ─── Auth ─────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    displayName: safeStringRequired("Display name is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ─── Inventory ────────────────────────────────────────────

export const inventoryLotSchema = z.object({
  brand: safeStringRequired("Brand is required"),
  productType: z.enum([
    "SEALED_BOX",
    "PACK",
    "ETB",
    "SINGLE",
    "BULK_LOT",
    "ACCESSORY",
  ]),
  setCode: safeStringOptional,
  productName: safeStringRequired("Product name is required"),
  language: z.enum(["EN", "JP", "OTHER"]).default("EN"),
  rarity: safeStringOptional,
  condition: safeStringOptional,
  notes: safeStringOptional,
  qtyOnHand: z.coerce.number().int().min(0, "Quantity must be >= 0"),
  unitCost: z.coerce.number().min(0, "Unit cost must be >= 0"),
  location: safeStringOptional,
});

export const adjustQtySchema = z.object({
  lotId: z.string().uuid(),
  newQty: z.coerce.number().int().min(0, "Quantity must be >= 0"),
  reason: safeStringOptional,
});

// ─── Supplier ─────────────────────────────────────────────

export const supplierSchema = z.object({
  name: safeStringRequired("Supplier name is required"),
  contact: safeStringOptional,
  notes: safeStringOptional,
});

// ─── Purchase ─────────────────────────────────────────────

export const purchaseLineItemSchema = z.object({
  brand: safeStringRequired("Brand is required"),
  productType: z.enum([
    "SEALED_BOX",
    "PACK",
    "ETB",
    "SINGLE",
    "BULK_LOT",
    "ACCESSORY",
  ]),
  setCode: safeStringOptional,
  productName: safeStringRequired("Product name is required"),
  language: z.enum(["EN", "JP", "OTHER"]).default("EN"),
  rarity: safeStringOptional,
  condition: safeStringOptional,
  qty: z.coerce.number().int().min(1, "Quantity must be >= 1"),
  unitCost: z.coerce.number().min(0, "Unit cost must be >= 0"),
});

export const purchaseSchema = z.object({
  supplierId: z.string().uuid().optional(),
  newSupplierName: safeStringOptional,
  purchasedAt: z.coerce.date().optional(),
  shippingCost: z.coerce.number().min(0).default(0),
  fees: z.coerce.number().min(0).default(0),
  notes: safeStringOptional,
  lineItems: z.array(purchaseLineItemSchema).min(1, "At least one line item"),
});

// ─── Sale ─────────────────────────────────────────────────

export const saleLineItemSchema = z.object({
  inventoryLotId: z.string().uuid(),
  qty: z.coerce.number().int().min(1, "Quantity must be >= 1"),
  unitPrice: z.coerce.number().min(0, "Unit price must be >= 0"),
});

export const saleSchema = z.object({
  channel: z
    .enum(["FB_PAGE", "FB_PROFILE", "MEETUP", "SHIPPING", "OTHER"])
    .default("FB_PAGE"),
  buyerName: safeStringOptional,
  paymentMethod: z
    .enum(["GCASH", "MAYA", "BANK", "CASH", "MIXED", "OTHER"])
    .default("GCASH"),
  discount: z.coerce.number().min(0).default(0),
  shippingCharged: z.coerce.number().min(0).default(0),
  shippingCostPaid: z.coerce.number().min(0).default(0),
  platformFees: z.coerce.number().min(0).default(0),
  notes: safeStringOptional,
  lineItems: z.array(saleLineItemSchema).min(1, "At least one line item"),
});

// ─── Quick Sell ───────────────────────────────────────────

export const quickSellSchema = z.object({
  inventoryLotId: z.string().uuid(),
  qty: z.coerce.number().int().min(1, "Quantity must be >= 1"),
  unitPrice: z.coerce.number().min(0, "Unit price must be >= 0"),
  channel: z
    .enum(["FB_PAGE", "FB_PROFILE", "MEETUP", "SHIPPING", "OTHER"])
    .default("FB_PAGE"),
  paymentMethod: z
    .enum(["GCASH", "MAYA", "BANK", "CASH", "MIXED", "OTHER"])
    .default("GCASH"),
  shippingCharged: z.coerce.number().min(0).default(0),
  shippingCostPaid: z.coerce.number().min(0).default(0),
});

// ─── Cash Transaction ─────────────────────────────────────

export const cashTransactionSchema = z.object({
  type: z.enum(["IN", "OUT"]),
  category: z.enum([
    "SALE_INCOME",
    "INVENTORY_BUY",
    "SHIPPING_COST",
    "SUPPLIES",
    "PLATFORM_FEES",
    "CAPITAL_IN",
    "OTHER",
  ]),
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  description: safeStringRequired("Description is required"),
  paymentMethod: z
    .enum(["GCASH", "MAYA", "BANK", "CASH", "MIXED", "OTHER"])
    .default("GCASH"),
  date: z.coerce.date().optional(),
  linkedSaleId: z.string().uuid().optional(),
  linkedPurchaseId: z.string().uuid().optional(),
});

// ─── Update Purchase ──────────────────────────────────────

export const updatePurchaseSchema = z.object({
  shippingCost: z.coerce.number().min(0).default(0),
  fees: z.coerce.number().min(0).default(0),
  notes: safeStringOptional,
  supplierId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || undefined),
  purchasedAt: z.coerce.date().optional(),
});

// ─── Types ────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type InventoryLotInput = z.infer<typeof inventoryLotSchema>;
export type AdjustQtyInput = z.infer<typeof adjustQtySchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type PurchaseLineItemInput = z.infer<typeof purchaseLineItemSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type SaleLineItemInput = z.infer<typeof saleLineItemSchema>;
export type QuickSellInput = z.infer<typeof quickSellSchema>;
export type CashTransactionInput = z.infer<typeof cashTransactionSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
