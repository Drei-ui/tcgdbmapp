"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCurrency } from "@/components/currency-provider";
import { ReportExportButton } from "./report-export-button";
import type { ProfitReport as ProfitReportType } from "@/lib/actions/reports";

interface ProfitReportProps {
  data: ProfitReportType;
  currentGroup: string;
  onGroupChange: (group: string) => void;
}

const GROUP_OPTIONS = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

export function ProfitReport({
  data,
  currentGroup,
  onGroupChange,
}: ProfitReportProps) {
  const { summary, rows } = data;
  const currency = useCurrency();

  return (
    <div className="space-y-4 mt-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Gross Sales</p>
            <p className="text-lg font-bold">
              {formatCurrency(summary.grossSales, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="text-lg font-bold">
              {formatCurrency(summary.cogs, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Gross Profit</p>
            <p
              className={`text-lg font-bold ${summary.grossProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {formatCurrency(summary.grossProfit, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Margin</p>
            <p className="text-lg font-bold">
              {summary.marginPct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Shipping Cost</p>
            <p className="text-sm font-semibold">
              {formatCurrency(summary.shippingCost, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Platform Fees</p>
            <p className="text-sm font-semibold">
              {formatCurrency(summary.platformFees, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Net Profit</p>
            <p
              className={`text-sm font-semibold ${summary.netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {formatCurrency(summary.netProfit, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Group toggle + Export */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {GROUP_OPTIONS.map((opt) => (
            <Badge
              key={opt.value}
              variant={currentGroup === opt.value ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => onGroupChange(opt.value)}
            >
              {opt.label}
            </Badge>
          ))}
        </div>
        <ReportExportButton section="profit" />
      </div>

      {/* Period table */}
      {rows.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">
          No sales data for this period.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-right">Orders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.period}>
                <TableCell className="font-medium">
                  {formatDate(row.period)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(row.sales, currency)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(row.cogs, currency)}
                </TableCell>
                <TableCell
                  className={`text-right ${row.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {formatCurrency(row.profit, currency)}
                </TableCell>
                <TableCell className="text-right">
                  {row.marginPct.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">{row.orderCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
