import {
  getReportProfit,
  getReportInventoryAging,
  getReportBestSellers,
  getReportChannelPerformance,
  getReportCashFlow,
} from "@/lib/actions/reports";
import { getInventoryBrands } from "@/lib/actions/inventory";
import { ReportsShell } from "@/components/reports/reports-shell";
import type {
  ProfitReport,
  InventoryAgingReport,
  BestSellersReport,
  ChannelRow,
  CashFlowReport,
} from "@/lib/actions/reports";

function parseDateRange(range: string, from?: string, to?: string) {
  const now = new Date();
  let start: Date;
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // end of today

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

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    brand?: string;
    channel?: string;
    productType?: string;
    tab?: string;
    group?: string;
  }>;
}) {
  const params = await searchParams;
  const range = params.range || "30d";
  const group = params.group || "day";
  const tab = params.tab || "profit";
  const { start, end } = parseDateRange(range, params.from, params.to);
  const filters = {
    brand: params.brand || undefined,
    channel: params.channel || undefined,
    productType: params.productType || undefined,
  };

  // Only fetch the active tab's data + brands (in parallel)
  let profit: ProfitReport | null = null;
  let aging: InventoryAgingReport | null = null;
  let bestSellers: BestSellersReport | null = null;
  let channels: ChannelRow[] | null = null;
  let cashFlow: CashFlowReport | null = null;

  const activeTabFetch =
    tab === "profit" ? getReportProfit(start, end, group, filters).then((d) => { profit = d; })
    : tab === "aging" ? getReportInventoryAging(filters).then((d) => { aging = d; })
    : tab === "best-sellers" ? getReportBestSellers(start, end, filters).then((d) => { bestSellers = d; })
    : tab === "channels" ? getReportChannelPerformance(start, end, filters).then((d) => { channels = d; })
    : getReportCashFlow(start, end).then((d) => { cashFlow = d; });

  const [brands] = await Promise.all([getInventoryBrands(), activeTabFetch]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-2xl font-bold">Reports</h2>
      <ReportsShell
        profit={profit}
        aging={aging}
        bestSellers={bestSellers}
        channels={channels}
        cashFlow={cashFlow}
        brands={brands}
        currentRange={range}
        currentFrom={params.from}
        currentTo={params.to}
        currentBrand={params.brand}
        currentChannel={params.channel}
        currentProductType={params.productType}
        currentTab={tab}
        currentGroup={group}
      />
    </div>
  );
}
