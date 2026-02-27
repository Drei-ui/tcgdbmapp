"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import type { InventoryLot } from "@/generated/prisma/client";

const CHANNELS = [
  { value: "FB_PAGE", label: "FB Page" },
  { value: "FB_PROFILE", label: "FB Profile" },
  { value: "MEETUP", label: "Meetup" },
  { value: "SHIPPING", label: "Shipping" },
  { value: "OTHER", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "BANK", label: "Bank Transfer" },
  { value: "CASH", label: "Cash" },
  { value: "MIXED", label: "Mixed" },
  { value: "OTHER", label: "Other" },
];

export function QuickSellSheet({
  lot,
  open,
  onOpenChange,
  onConfirm,
}: {
  lot: InventoryLot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    inventoryLotId: string;
    qty: number;
    unitPrice: number;
    channel: string;
    paymentMethod: string;
    shippingCharged: number;
    shippingCostPaid: number;
  }) => void;
}) {
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [channel, setChannel] = useState("FB_PAGE");
  const [paymentMethod, setPaymentMethod] = useState("GCASH");
  const [shippingCharged, setShippingCharged] = useState("0");
  const [shippingCostPaid, setShippingCostPaid] = useState("0");
  const [loading, setLoading] = useState(false);

  if (!lot) return null;

  const total =
    (parseFloat(unitPrice) || 0) * (parseInt(qty) || 0) +
    (parseFloat(shippingCharged) || 0);

  async function handleConfirm() {
    if (!lot) return;
    setLoading(true);
    await onConfirm({
      inventoryLotId: lot.id,
      qty: parseInt(qty),
      unitPrice: parseFloat(unitPrice),
      channel,
      paymentMethod,
      shippingCharged: parseFloat(shippingCharged) || 0,
      shippingCostPaid: parseFloat(shippingCostPaid) || 0,
    });
    setLoading(false);
    onOpenChange(false);
    // Reset form
    setQty("1");
    setUnitPrice("");
    setChannel("FB_PAGE");
    setPaymentMethod("GCASH");
    setShippingCharged("0");
    setShippingCostPaid("0");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">
            Quick Sell: {lot.productName}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="text-sm text-muted-foreground">
            Available: {lot.qtyOnHand} @ {formatCurrency(lot.unitCost.toString())} each
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qs-qty">Qty</Label>
              <Input
                id="qs-qty"
                type="number"
                min="1"
                max={lot.qtyOnHand}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qs-price">Unit Price</Label>
              <Input
                id="qs-price"
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((ch) => (
                    <SelectItem key={ch.value} value={ch.value}>
                      {ch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((pm) => (
                    <SelectItem key={pm.value} value={pm.value}>
                      {pm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qs-ship-charged">Shipping Charged</Label>
              <Input
                id="qs-ship-charged"
                type="number"
                min="0"
                step="0.01"
                value={shippingCharged}
                onChange={(e) => setShippingCharged(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qs-ship-cost">Shipping Cost (yours)</Label>
              <Input
                id="qs-ship-cost"
                type="number"
                min="0"
                step="0.01"
                value={shippingCostPaid}
                onChange={(e) => setShippingCostPaid(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-muted p-3">
            <span className="text-sm font-medium">Total Collected</span>
            <span className="text-lg font-bold">{formatCurrency(total)}</span>
          </div>

          <Button
            className="w-full"
            onClick={handleConfirm}
            disabled={loading || !unitPrice || parseInt(qty) < 1}
          >
            {loading ? "Creating Sale..." : "Confirm Sale"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
