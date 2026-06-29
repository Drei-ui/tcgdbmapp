"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { confirmSale, cancelSale, refundSale, deleteSale } from "@/lib/actions/sales";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, RotateCcw, Trash2 } from "lucide-react";

export function SaleActions({
  saleId,
  status,
}: {
  saleId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setLoading(true);
    const result = await deleteSale(saleId);
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
      setConfirmingDelete(false);
    } else {
      toast.success("Sale deleted");
      router.push("/sales");
    }
  }

  const deleteButton = (
    <Button
      variant="destructive"
      onClick={handleDelete}
      disabled={loading}
      className="w-full"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      {loading && confirmingDelete
        ? "Deleting..."
        : confirmingDelete
          ? "Tap again to confirm delete"
          : "Delete Sale"}
    </Button>
  );

  if (status === "DRAFT") {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {loading && !confirmingDelete ? "Processing..." : "Confirm Sale"}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
        {deleteButton}
      </div>
    );
  }

  if (status === "CONFIRMED") {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          onClick={handleRefund}
          disabled={loading}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {loading && !confirmingDelete ? "Processing..." : "Refund Sale"}
        </Button>
        {deleteButton}
      </div>
    );
  }

  // CANCELLED or REFUNDED — only show delete
  return deleteButton;
}
