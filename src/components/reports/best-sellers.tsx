"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/currency-provider";
import { ReportExportButton } from "./report-export-button";
import type { BestSellersReport, BestSellerItem } from "@/lib/actions/reports";

interface BestSellersProps {
  data: BestSellersReport;
}

type SortKey = "byRevenue" | "byProfit" | "byQty" | "byTurnover";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "byRevenue", label: "Revenue" },
  { value: "byProfit", label: "Profit" },
  { value: "byQty", label: "Qty Sold" },
  { value: "byTurnover", label: "Fastest" },
];

export function BestSellers({ data }: BestSellersProps) {
  const [sort, setSort] = useState<SortKey>("byRevenue");
  const currency = useCurrency();
  const items: BestSellerItem[] = data[sort];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {SORT_OPTIONS.map((opt) => (
            <Badge
              key={opt.value}
              variant={sort === opt.value ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setSort(opt.value)}
            >
              {opt.label}
            </Badge>
          ))}
        </div>
        <ReportExportButton section="best-sellers" />
      </div>

      {items.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">
          No sales data for this period.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Set</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Avg Days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => (
              <TableRow key={`${item.productName}-${item.setCode}-${item.brand}`}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {item.productName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.setCode || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.brand}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.totalRevenue, currency)}
                </TableCell>
                <TableCell
                  className={`text-right ${item.totalProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {formatCurrency(item.totalProfit, currency)}
                </TableCell>
                <TableCell className="text-right">{item.totalQty}</TableCell>
                <TableCell className="text-right">
                  {item.avgDaysHeld}d
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
