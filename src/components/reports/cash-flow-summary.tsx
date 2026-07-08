"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useCurrency, useRate } from "@/components/currency-provider";
import { ReportExportButton } from "./report-export-button";
import type { CashFlowReport } from "@/lib/actions/reports";

interface CashFlowSummaryProps {
  data: CashFlowReport;
}

export function CashFlowSummary({ data }: CashFlowSummaryProps) {
  const currency = useCurrency();
  const rate = useRate();
  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-green-50/60 border-green-200/50 dark:bg-green-950/30 dark:border-green-800/30">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Cash In</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(data.cashIn, currency, rate)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-50/60 border-red-200/50 dark:bg-red-950/30 dark:border-red-800/30">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Cash Out</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {formatCurrency(data.cashOut, currency, rate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Net Change</p>
            <p
              className={`text-lg font-bold ${data.netChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {formatCurrency(data.netChange, currency, rate)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/60 border-blue-200/50 dark:bg-blue-950/30 dark:border-blue-800/30">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p
              className={`text-lg font-bold ${data.currentBalance >= 0 ? "text-blue-700 dark:text-blue-300" : "text-red-600 dark:text-red-400"}`}
            >
              {formatCurrency(data.currentBalance, currency, rate)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <ReportExportButton section="cash-flow" />
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Cash In / Cash Out reflect the selected date range. Current Balance is
        the all-time running total.
      </p>
    </div>
  );
}
