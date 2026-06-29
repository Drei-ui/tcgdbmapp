"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InventoryLot } from "@prisma/client";

export function AdjustQtyDialog({
  lot,
  open,
  onOpenChange,
  onConfirm,
}: {
  lot: InventoryLot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (lotId: string, newQty: number, reason?: string) => void;
}) {
  const [newQty, setNewQty] = useState(lot?.qtyOnHand?.toString() || "0");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!lot) return null;

  async function handleConfirm() {
    if (!lot) return;
    setLoading(true);
    await onConfirm(lot.id, parseInt(newQty), reason || undefined);
    setLoading(false);
    onOpenChange(false);
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Quantity: {lot.productName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Current quantity: {lot.qtyOnHand}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adj-qty">New Quantity</Label>
            <Input
              id="adj-qty"
              type="number"
              min="0"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">Reason (optional)</Label>
            <Textarea
              id="adj-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Recount, damaged, etc."
              rows={2}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Saving..." : "Update Quantity"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
