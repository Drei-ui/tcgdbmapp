"use client";

import { useState } from "react";
import { InventoryCard } from "./inventory-card";
import { QuickSellSheet } from "./quick-sell-sheet";
import { AdjustQtyDialog } from "./adjust-qty-dialog";
import {
  adjustInventoryQty,
  reserveInventoryLot,
  unreserveInventoryLot,
} from "@/lib/actions/inventory";
import { quickSell } from "@/lib/actions/sales";
import { toast } from "sonner";
import type { InventoryLot } from "@/generated/prisma/client";

export function InventoryList({
  lots,
}: {
  lots: InventoryLot[];
}) {
  const [quickSellLot, setQuickSellLot] =
    useState<InventoryLot | null>(null);
  const [adjustLot, setAdjustLot] =
    useState<InventoryLot | null>(null);

  async function handleQuickSell(data: {
    inventoryLotId: string;
    qty: number;
    unitPrice: number;
    channel: string;
    paymentMethod: string;
    shippingCharged: number;
    shippingCostPaid: number;
  }) {
    const result = await quickSell(data);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Sale created as DRAFT");
    }
  }

  async function handleReserve(lot: InventoryLot) {
    const result =
      lot.status === "RESERVED"
        ? await unreserveInventoryLot(lot.id)
        : await reserveInventoryLot(lot.id);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(
        lot.status === "RESERVED" ? "Lot unreserved" : "Lot reserved"
      );
    }
  }

  async function handleAdjust(
    lotId: string,
    newQty: number,
    reason?: string
  ) {
    const result = await adjustInventoryQty({ lotId, newQty, reason });
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Quantity adjusted");
    }
  }

  if (lots.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No inventory lots found. Create a purchase or add lots manually.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {lots.map((lot) => (
          <InventoryCard
            key={lot.id}
            lot={lot}
            onQuickSell={setQuickSellLot}
            onReserve={handleReserve}
            onAdjust={setAdjustLot}
          />
        ))}
      </div>

      <QuickSellSheet
        lot={quickSellLot}
        open={!!quickSellLot}
        onOpenChange={(open) => !open && setQuickSellLot(null)}
        onConfirm={handleQuickSell}
      />

      <AdjustQtyDialog
        lot={adjustLot}
        open={!!adjustLot}
        onOpenChange={(open) => !open && setAdjustLot(null)}
        onConfirm={handleAdjust}
      />
    </>
  );
}
