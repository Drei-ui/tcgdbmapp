import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getCurrency } from "@/lib/auth";
import { getRate } from "@/lib/fx";
import { convertFromBase } from "@/lib/currency";

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  return parseFloat(String(val)) || 0;
}

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function toCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsv).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsv).join(","));
  return [headerLine, ...dataLines].join("\n");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await params;

  // Stored amounts are PHP; convert to the user's display currency for export.
  const currency = await getCurrency();
  const rate = await getRate(currency);
  const money = (n: number) => convertFromBase(n, rate).toFixed(2);
  const dateStr = new Date().toISOString().split("T")[0];

  let csv = "";
  let filename = "";

  switch (type) {
    case "inventory": {
      const lots = await prisma.inventoryLot.findMany({
        where: { createdById: user.id },
        orderBy: { acquiredAt: "asc" },
        include: { supplier: true },
      });
      const headers = [
        "Brand",
        "Type",
        "Set Code",
        "Product Name",
        "Language",
        "Rarity",
        "Condition",
        "Qty",
        `Unit Cost (${currency})`,
        `Total Value (${currency})`,
        "Status",
        "Supplier",
        "Acquired",
        "Notes",
      ];
      const rows = lots.map((lot) => [
        lot.brand,
        lot.productType,
        lot.setCode || "",
        lot.productName,
        lot.language,
        lot.rarity || "",
        lot.condition || "",
        lot.qtyOnHand.toString(),
        money(toNum(lot.unitCost)),
        money(toNum(lot.unitCost) * lot.qtyOnHand),
        lot.status,
        lot.supplier?.name || "",
        lot.acquiredAt.toISOString().split("T")[0],
        lot.notes || "",
      ]);
      csv = toCsv(headers, rows);
      filename = `inventory-${currency}-${dateStr}.csv`;
      break;
    }

    case "sales": {
      const sales = await prisma.sale.findMany({
        where: { createdById: user.id },
        orderBy: { soldAt: "desc" },
        include: { lineItems: { include: { inventoryLot: true } } },
      });
      const headers = [
        "Sale ID",
        "Date",
        "Status",
        "Buyer",
        "Channel",
        "Payment",
        `Subtotal (${currency})`,
        `Discount (${currency})`,
        `Shipping Charged (${currency})`,
        `Total Collected (${currency})`,
        `Total Cost (${currency})`,
        `Shipping Cost (${currency})`,
        `Fees (${currency})`,
        `Net Profit (${currency})`,
        "Items",
      ];
      const rows = sales.map((sale) => {
        const cogs = sale.lineItems.reduce(
          (sum, li) => sum + toNum(li.cogsTotal),
          0
        );
        const profit = sale.lineItems.reduce(
          (sum, li) => sum + toNum(li.profitTotal),
          0
        );
        const netProfit =
          profit - toNum(sale.shippingCostPaid) - toNum(sale.platformFees);
        const items = sale.lineItems
          .map(
            (li) =>
              `${li.qty}x ${li.inventoryLot.productName}`
          )
          .join("; ");
        return [
          sale.id.slice(0, 8),
          sale.soldAt.toISOString().split("T")[0],
          sale.status,
          sale.buyerName || "",
          sale.channel,
          sale.paymentMethod,
          money(toNum(sale.subtotal)),
          money(toNum(sale.discount)),
          money(toNum(sale.shippingCharged)),
          money(toNum(sale.totalCollected)),
          money(cogs),
          money(toNum(sale.shippingCostPaid)),
          money(toNum(sale.platformFees)),
          money(netProfit),
          items,
        ];
      });
      csv = toCsv(headers, rows);
      filename = `sales-${currency}-${dateStr}.csv`;
      break;
    }

    case "cash": {
      const txns = await prisma.cashTransaction.findMany({
        where: { createdById: user.id },
        orderBy: { date: "desc" },
      });
      const headers = [
        "Date",
        "Type",
        "Category",
        `Amount (${currency})`,
        "Description",
        "Payment Method",
      ];
      const rows = txns.map((tx) => [
        tx.date.toISOString().split("T")[0],
        tx.type,
        tx.category,
        money(toNum(tx.amount)),
        tx.description,
        tx.paymentMethod,
      ]);
      csv = toCsv(headers, rows);
      filename = `cash-${currency}-${dateStr}.csv`;
      break;
    }

    default:
      return NextResponse.json(
        { error: "Invalid export type. Use: inventory, sales, or cash" },
        { status: 400 }
      );
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
