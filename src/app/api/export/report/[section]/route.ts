import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getReportProfit,
  getReportInventoryAging,
  getReportBestSellers,
  getReportChannelPerformance,
  getReportCashFlow,
} from "@/lib/actions/reports";

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

function parseDateRange(range: string, from?: string, to?: string) {
  const now = new Date();
  let start: Date;
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  switch (range) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "7d":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case "mtd":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "custom":
      start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      end = to ? new Date(new Date(to).getTime() + 86400000) : end;
      break;
    case "30d":
    default:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      break;
  }

  return { start, end };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ section: string }> }
) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { section } = await params;
  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "30d";
  const group = url.searchParams.get("group") || "day";
  const fromParam = url.searchParams.get("from") || undefined;
  const toParam = url.searchParams.get("to") || undefined;

  if (fromParam && isNaN(new Date(fromParam).getTime())) {
    return NextResponse.json({ error: "Invalid 'from' date" }, { status: 400 });
  }
  if (toParam && isNaN(new Date(toParam).getTime())) {
    return NextResponse.json({ error: "Invalid 'to' date" }, { status: 400 });
  }
  const filters = {
    brand: url.searchParams.get("brand") || undefined,
    channel: url.searchParams.get("channel") || undefined,
    productType: url.searchParams.get("productType") || undefined,
  };

  const { start, end } = parseDateRange(range, fromParam, toParam);
  const dateStr = new Date().toISOString().split("T")[0];

  let csv = "";
  let filename = "";

  switch (section) {
    case "profit": {
      const data = await getReportProfit(start, end, group, filters);
      const headers = ["Period", "Sales", "Total Cost", "Profit", "Margin%", "Orders"];
      const rows = data.rows.map((r) => [
        new Date(r.period).toISOString().split("T")[0],
        r.sales.toFixed(2),
        r.cogs.toFixed(2),
        r.profit.toFixed(2),
        r.marginPct.toFixed(1),
        r.orderCount.toString(),
      ]);
      csv = toCsv(headers, rows);
      filename = `report-profit-${dateStr}.csv`;
      break;
    }

    case "aging": {
      const data = await getReportInventoryAging(filters);
      const headers = [
        "Product",
        "Set",
        "Brand",
        "Type",
        "Qty",
        "Unit Cost",
        "Total Cost",
        "Age (days)",
        "Suggested Action",
      ];
      const rows = data.items.map((item) => [
        item.productName,
        item.setCode || "",
        item.brand,
        item.productType,
        item.qty.toString(),
        item.unitCost.toFixed(2),
        item.totalCost.toFixed(2),
        item.ageDays.toString(),
        item.suggestedAction,
      ]);
      csv = toCsv(headers, rows);
      filename = `report-aging-${dateStr}.csv`;
      break;
    }

    case "best-sellers": {
      const data = await getReportBestSellers(start, end, filters);
      const headers = [
        "Product",
        "Set",
        "Brand",
        "Revenue",
        "Profit",
        "Qty Sold",
        "Avg Days Held",
      ];
      const rows = data.byRevenue.map((item) => [
        item.productName,
        item.setCode || "",
        item.brand,
        item.totalRevenue.toFixed(2),
        item.totalProfit.toFixed(2),
        item.totalQty.toString(),
        item.avgDaysHeld.toString(),
      ]);
      csv = toCsv(headers, rows);
      filename = `report-best-sellers-${dateStr}.csv`;
      break;
    }

    case "channels": {
      const data = await getReportChannelPerformance(start, end, filters);
      const headers = ["Channel", "Orders", "Revenue", "Profit", "Avg Order Value"];
      const rows = data.map((ch) => [
        ch.channel,
        ch.orderCount.toString(),
        ch.revenue.toFixed(2),
        ch.profit.toFixed(2),
        ch.avgOrderValue.toFixed(2),
      ]);
      csv = toCsv(headers, rows);
      filename = `report-channels-${dateStr}.csv`;
      break;
    }

    case "cash-flow": {
      const data = await getReportCashFlow(start, end);
      const headers = ["Metric", "Amount"];
      const rows = [
        ["Cash In", data.cashIn.toFixed(2)],
        ["Cash Out", data.cashOut.toFixed(2)],
        ["Net Change", data.netChange.toFixed(2)],
        ["Current Balance (All-Time)", data.currentBalance.toFixed(2)],
      ];
      csv = toCsv(headers, rows);
      filename = `report-cash-flow-${dateStr}.csv`;
      break;
    }

    default:
      return NextResponse.json(
        { error: "Invalid report section" },
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
