import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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

  let csv = "";
  let filename = "";

  switch (type) {
    case "inventory": {
      const lots = await prisma.inventoryLot.findMany({
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
        "Unit Cost",
        "Total Value",
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
        toNum(lot.unitCost).toFixed(2),
        (toNum(lot.unitCost) * lot.qtyOnHand).toFixed(2),
        lot.status,
        lot.supplier?.name || "",
        lot.acquiredAt.toISOString().split("T")[0],
        lot.notes || "",
      ]);
      csv = toCsv(headers, rows);
      filename = `inventory-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }

    case "sales": {
      const sales = await prisma.sale.findMany({
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
        "Subtotal",
        "Discount",
        "Shipping Charged",
        "Total Collected",
        "Total Cost",
        "Shipping Cost",
        "Fees",
        "Net Profit",
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
          toNum(sale.subtotal).toFixed(2),
          toNum(sale.discount).toFixed(2),
          toNum(sale.shippingCharged).toFixed(2),
          toNum(sale.totalCollected).toFixed(2),
          cogs.toFixed(2),
          toNum(sale.shippingCostPaid).toFixed(2),
          toNum(sale.platformFees).toFixed(2),
          netProfit.toFixed(2),
          items,
        ];
      });
      csv = toCsv(headers, rows);
      filename = `sales-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }

    case "cash": {
      const txns = await prisma.cashTransaction.findMany({
        orderBy: { date: "desc" },
      });
      const headers = [
        "Date",
        "Type",
        "Category",
        "Amount",
        "Description",
        "Payment Method",
      ];
      const rows = txns.map((tx) => [
        tx.date.toISOString().split("T")[0],
        tx.type,
        tx.category,
        toNum(tx.amount).toFixed(2),
        tx.description,
        tx.paymentMethod,
      ]);
      csv = toCsv(headers, rows);
      filename = `cash-${new Date().toISOString().split("T")[0]}.csv`;
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
