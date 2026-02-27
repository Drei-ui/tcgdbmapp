"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CashForm } from "./cash-form";
import { ArrowDownCircle, ArrowUpCircle, Plus } from "lucide-react";
import Link from "next/link";
import type {
  CashTransaction,
  Sale,
  Purchase,
} from "@/generated/prisma/client";

type CashTxWithRelations = CashTransaction & {
  linkedSale: Sale | null;
  linkedPurchase: Purchase | null;
};

export function CashList({
  transactions,
  balance,
  defaultAction,
}: {
  transactions: CashTxWithRelations[];
  balance: number;
  defaultAction?: string;
}) {
  const [showForm, setShowForm] = useState(
    defaultAction === "in" || defaultAction === "out"
  );
  const [formType, setFormType] = useState<"IN" | "OUT">(
    defaultAction === "out" ? "OUT" : "IN"
  );

  function openForm(type: "IN" | "OUT") {
    setFormType(type);
    setShowForm(true);
  }

  return (
    <>
      <div className="rounded-lg bg-muted p-4 text-center">
        <p className="text-sm text-muted-foreground">Running Balance</p>
        <p
          className={`text-3xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}
        >
          {formatCurrency(balance)}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => openForm("IN")}
        >
          <ArrowDownCircle className="h-4 w-4 mr-1 text-green-600" />
          Cash IN
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => openForm("OUT")}
        >
          <ArrowUpCircle className="h-4 w-4 mr-1 text-red-600" />
          Cash OUT
        </Button>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No transactions yet.
        </div>
      ) : (
        <div className="space-y-1">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {tx.type === "IN" ? (
                    <ArrowDownCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  ) : (
                    <ArrowUpCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  )}
                  <span className="font-medium truncate">
                    {tx.description}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 ml-5">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(tx.date)}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0"
                  >
                    {tx.category.replace("_", " ")}
                  </Badge>
                  {tx.linkedSaleId && (
                    <Link
                      href={`/sales/${tx.linkedSaleId}`}
                      className="text-[10px] text-primary underline"
                    >
                      Sale
                    </Link>
                  )}
                  {tx.linkedPurchaseId && (
                    <Link
                      href={`/purchases/${tx.linkedPurchaseId}`}
                      className="text-[10px] text-primary underline"
                    >
                      Purchase
                    </Link>
                  )}
                </div>
              </div>
              <span
                className={`font-semibold shrink-0 ${tx.type === "IN" ? "text-green-600" : "text-red-600"}`}
              >
                {tx.type === "IN" ? "+" : "-"}
                {formatCurrency(tx.amount.toString())}
              </span>
            </div>
          ))}
        </div>
      )}

      <CashForm
        open={showForm}
        onOpenChange={setShowForm}
        defaultType={formType}
      />
    </>
  );
}
