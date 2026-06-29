import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    suppliers,
    productCatalog,
    purchases,
    purchaseLineItems,
    inventoryLots,
    sales,
    saleLineItems,
    cashTransactions,
    auditLogs,
  ] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.productCatalog.findMany({ orderBy: { brand: "asc" } }),
    prisma.purchase.findMany({ orderBy: { purchasedAt: "desc" } }),
    prisma.purchaseLineItem.findMany(),
    prisma.inventoryLot.findMany({ orderBy: { acquiredAt: "asc" } }),
    prisma.sale.findMany({ orderBy: { soldAt: "desc" } }),
    prisma.saleLineItem.findMany(),
    prisma.cashTransaction.findMany({ orderBy: { date: "desc" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 1000 }),
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    exportedBy: user.id,
    tables: {
      suppliers,
      productCatalog,
      purchases,
      purchaseLineItems,
      inventoryLots,
      sales,
      saleLineItems,
      cashTransactions,
      auditLogs,
    },
    counts: {
      suppliers: suppliers.length,
      productCatalog: productCatalog.length,
      purchases: purchases.length,
      purchaseLineItems: purchaseLineItems.length,
      inventoryLots: inventoryLots.length,
      sales: sales.length,
      saleLineItems: saleLineItems.length,
      cashTransactions: cashTransactions.length,
      auditLogs: auditLogs.length,
    },
  };

  const filename = `tcgdbm-snapshot-${new Date().toISOString().split("T")[0]}.json`;

  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
