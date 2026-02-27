"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { confirmSale, cancelSale, refundSale } from "@/lib/actions/sales";
import { toast } from "sonner";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";

export function SaleActions({
  saleId,
  status,
}: {
  saleId: string;
  status: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await confirmSale(saleId);
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Sale confirmed! Inventory updated, cash recorded.");
    }
  }

  async function handleCancel() {
    setLoading(true);
    const result = await cancelSale(saleId);
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Sale cancelled");
    }
  }

  async function handleRefund() {
    setLoading(true);
    const result = await refundSale(saleId);
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Sale refunded. Inventory restored.");
    }
  }

  if (status === "DRAFT") {
    return (
      <div className="flex gap-2">
        <Button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {loading ? "Processing..." : "Confirm Sale"}
        </Button>
        <Button
          variant="destructive"
          onClick={handleCancel}
          disabled={loading}
          className="flex-1"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    );
  }

  if (status === "CONFIRMED") {
    return (
      <Button
        variant="outline"
        onClick={handleRefund}
        disabled={loading}
        className="w-full"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        {loading ? "Processing..." : "Refund Sale"}
      </Button>
    );
  }

  return null;
}
