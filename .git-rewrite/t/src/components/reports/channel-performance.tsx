"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { ReportExportButton } from "./report-export-button";
import type { ChannelRow } from "@/lib/actions/reports";

interface ChannelPerformanceProps {
  data: ChannelRow[];
}

const CHANNEL_LABELS: Record<string, string> = {
  FB_PAGE: "FB Page",
  FB_PROFILE: "FB Profile",
  MEETUP: "Meetup",
  SHIPPING: "Shipping",
  OTHER: "Other",
};

export function ChannelPerformance({ data }: ChannelPerformanceProps) {
  const totalRevenue = data.reduce((sum, ch) => sum + ch.revenue, 0);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <ReportExportButton section="channels" />
      </div>

      {data.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">
          No sales data for this period.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Avg Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((ch) => (
              <TableRow key={ch.channel}>
                <TableCell className="font-medium">
                  {CHANNEL_LABELS[ch.channel] || ch.channel}
                </TableCell>
                <TableCell className="text-right">{ch.orderCount}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(ch.revenue)}
                </TableCell>
                <TableCell className="text-right">
                  {totalRevenue > 0
                    ? ((ch.revenue / totalRevenue) * 100).toFixed(1)
                    : "0.0"}
                  %
                </TableCell>
                <TableCell
                  className={`text-right ${ch.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {formatCurrency(ch.profit)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(ch.avgOrderValue)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
