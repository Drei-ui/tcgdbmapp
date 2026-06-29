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
    purchases,
    purchaseLineItems,
    inventoryLots,
    sales,
    saleLineItems,
    cashTransactions,
    auditLogs,
  ] = await Promise.all([
    prisma.purchase.findMany({ where: { createdById: user.id }, orderBy: { purchasedAt: "desc" } }),
    prisma.purchaseLineItem.findMany({
      where: { purchase: { createdById: user.id } },
    }),
    prisma.inventoryLot.findMany({ where: { createdById: user.id }, orderBy: { acquiredAt: "asc" } }),
    prisma.sale.findMany({ where: { createdById: user.id }, orderBy: { soldAt: "desc" } }),
    prisma.saleLineItem.findMany({
      where: { sale: { createdById: user.id } },
    }),
    prisma.cashTransaction.findMany({ where: { createdById: user.id }, orderBy: { date: "desc" } }),
    prisma.auditLog.findMany({ where: { actorId: user.id }, orderBy: { createdAt: "desc" }, take: 1000 }),
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    exportedBy: user.id,
    tables: {
      purchases,
      purchaseLineItems,
      inventoryLots,
      sales,
      saleLineItems,
      cashTransactions,
      auditLogs,
    },
    counts: {
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
