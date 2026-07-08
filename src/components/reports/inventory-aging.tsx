"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useCurrency, useRate } from "@/components/currency-provider";
import { ReportExportButton } from "./report-export-button";
import type { InventoryAgingReport } from "@/lib/actions/reports";

interface InventoryAgingProps {
  data: InventoryAgingReport;
}

const BUCKET_COLORS: Record<string, string> = {
  "0-7d": "bg-green-50/60 border-green-200/50 dark:bg-green-950/30 dark:border-green-800/30",
  "8-30d": "bg-yellow-50/60 border-yellow-200/50 dark:bg-yellow-950/30 dark:border-yellow-800/30",
  "31-60d": "bg-orange-50/60 border-orange-200/50 dark:bg-orange-950/30 dark:border-orange-800/30",
  "60+d": "bg-red-50/60 border-red-200/50 dark:bg-red-950/30 dark:border-red-800/30",
};

const BUCKET_TEXT_COLORS: Record<string, string> = {
  "0-7d": "text-green-700 dark:text-green-400",
  "8-30d": "text-yellow-700 dark:text-yellow-400",
  "31-60d": "text-orange-700 dark:text-orange-400",
  "60+d": "text-red-700 dark:text-red-400",
};

const ACTION_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Hold: "outline",
  Monitor: "secondary",
  Bundle: "default",
  "Discount / Take-all": "destructive",
};

export function InventoryAging({ data }: InventoryAgingProps) {
  const { buckets, items } = data;
  const currency = useCurrency();
  const rate = useRate();

  return (
    <div className="space-y-4 mt-4">
      {/* Bucket summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buckets.map((bucket) => (
          <Card key={bucket.bucket} className={BUCKET_COLORS[bucket.bucket]}>
            <CardContent className="pt-4 text-center">
              <p className={`text-xs font-medium ${BUCKET_TEXT_COLORS[bucket.bucket]}`}>
                {bucket.bucket}
              </p>
              <p className="text-lg font-bold">{bucket.lotCount} lots</p>
              <p className="text-xs text-muted-foreground">
                {bucket.totalQty} pcs &middot; {formatCurrency(bucket.totalValue, currency, rate)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <ReportExportButton section="aging" />
      </div>

      {/* Items table */}
      {items.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">
          No inventory to display.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Set</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Age</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {item.productName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.setCode || "—"}
                </TableCell>
                <TableCell className="text-right">{item.qty}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.unitCost, currency, rate)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.totalCost, currency, rate)}
                </TableCell>
                <TableCell className="text-right">{item.ageDays}d</TableCell>
                <TableCell>
                  <Badge
                    variant={ACTION_VARIANTS[item.suggestedAction] || "outline"}
                    className="text-[10px]"
                  >
                    {item.suggestedAction}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
