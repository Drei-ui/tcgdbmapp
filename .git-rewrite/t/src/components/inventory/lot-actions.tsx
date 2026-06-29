"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QuickSellSheet } from "./quick-sell-sheet";
import { AdjustQtyDialog } from "./adjust-qty-dialog";
import {
  adjustInventoryQty,
  reserveInventoryLot,
  unreserveInventoryLot,
} from "@/lib/actions/inventory";
import { quickSell } from "@/lib/actions/sales";
import { toast } from "sonner";
import { ShoppingCart, Bookmark, PenLine } from "lucide-react";
import type { InventoryLot } from "@prisma/client";

export function LotActions({ lot }: { lot: InventoryLot }) {
  const [showQuickSell, setShowQuickSell] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);

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

  async function handleReserve() {
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

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => setShowQuickSell(true)} className="flex-1">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Sell
        </Button>
        <Button variant="secondary" onClick={handleReserve} className="flex-1">
          <Bookmark className="h-4 w-4 mr-2" />
          {lot.status === "RESERVED" ? "Unreserve" : "Reserve"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowAdjust(true)}
          className="flex-1"
        >
          <PenLine className="h-4 w-4 mr-2" />
          Adjust
        </Button>
      </div>

      <QuickSellSheet
        lot={showQuickSell ? lot : null}
        open={showQuickSell}
        onOpenChange={setShowQuickSell}
        onConfirm={handleQuickSell}
      />

      <AdjustQtyDialog
        lot={showAdjust ? lot : null}
        open={showAdjust}
        onOpenChange={setShowAdjust}
        onConfirm={handleAdjust}
      />
    </>
  );
}
