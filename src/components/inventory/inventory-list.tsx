"use client";

import { useState, useOptimistic, useTransition } from "react";
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
  const [pending, startTransition] = useTransition();

  const [optimisticLots, setOptimisticLot] = useOptimistic(
    lots,
    (state, update: { id: string; status: "ON_HAND" | "RESERVED" }) =>
      state.map((lot) =>
        lot.id === update.id ? { ...lot, status: update.status } : lot
      )
  );

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
      toast.success("Sale created");
    }
  }

  function handleReserve(lot: InventoryLot) {
    const newStatus = lot.status === "RESERVED" ? "ON_HAND" as const : "RESERVED" as const;
    startTransition(async () => {
      setOptimisticLot({ id: lot.id, status: newStatus });
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
    });
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

  if (optimisticLots.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No inventory lots found. Create a purchase or add lots manually.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
        {optimisticLots.map((lot) => (
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
