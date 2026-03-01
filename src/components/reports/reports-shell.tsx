"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { DateRangePicker } from "./date-range-picker";
import { ReportFilterBar } from "./report-filter-bar";
import { ProfitReport } from "./profit-report";
import { InventoryAging } from "./inventory-aging";
import { BestSellers } from "./best-sellers";
import { ChannelPerformance } from "./channel-performance";
import { CashFlowSummary } from "./cash-flow-summary";
import type {
  ProfitReport as ProfitReportType,
  InventoryAgingReport,
  BestSellersReport,
  ChannelRow,
  CashFlowReport,
} from "@/lib/actions/reports";

interface ReportsShellProps {
  profit: ProfitReportType | null;
  aging: InventoryAgingReport | null;
  bestSellers: BestSellersReport | null;
  channels: ChannelRow[] | null;
  cashFlow: CashFlowReport | null;
  brands: string[];
  currentRange: string;
  currentFrom?: string;
  currentTo?: string;
  currentBrand?: string;
  currentChannel?: string;
  currentProductType?: string;
  currentTab: string;
  currentGroup: string;
}

const TAB_ITEMS = [
  { value: "profit", label: "Profit" },
  { value: "aging", label: "Aging" },
  { value: "best-sellers", label: "Best Sellers" },
  { value: "channels", label: "Channels" },
  { value: "cash-flow", label: "Cash Flow" },
];

export function ReportsShell({
  profit,
  aging,
  bestSellers,
  channels,
  cashFlow,
  brands,
  currentRange,
  currentFrom,
  currentTo,
  currentBrand,
  currentChannel,
  currentProductType,
  currentTab,
  currentGroup,
}: ReportsShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset page-level params when changing filters
      if (key !== "tab" && key !== "group") {
        params.delete("page");
      }
      router.push(`/reports?${params.toString()}`);
    },
    [router, searchParams]
  );

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/reports?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-4">
      {/* Date range + filters */}
      <div className="flex flex-col gap-3">
        <DateRangePicker
          currentRange={currentRange}
          currentFrom={currentFrom}
          currentTo={currentTo}
          onRangeChange={(range, from, to) => {
            updateParams({ range, from: from || "", to: to || "" });
          }}
        />
        <ReportFilterBar
          brands={brands}
          currentBrand={currentBrand}
          currentChannel={currentChannel}
          currentProductType={currentProductType}
          onFilterChange={updateParam}
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onValueChange={(val) => updateParam("tab", val)}
      >
        <TabsList className="w-full overflow-x-auto">
          {TAB_ITEMS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profit">
          {profit && (
            <ProfitReport
              data={profit}
              currentGroup={currentGroup}
              onGroupChange={(g) => updateParam("group", g)}
            />
          )}
        </TabsContent>

        <TabsContent value="aging">
          {aging && <InventoryAging data={aging} />}
        </TabsContent>

        <TabsContent value="best-sellers">
          {bestSellers && <BestSellers data={bestSellers} />}
        </TabsContent>

        <TabsContent value="channels">
          {channels && <ChannelPerformance data={channels} />}
        </TabsContent>

        <TabsContent value="cash-flow">
          {cashFlow && <CashFlowSummary data={cashFlow} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
