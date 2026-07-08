"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { createSale } from "@/lib/actions/sales";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/currency-provider";
import type { InventoryLot } from "@prisma/client";

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

type SaleLineItem = {
  inventoryLotId: string;
  qty: string;
  unitPrice: string;
};

export function SaleForm({ lots }: { lots: InventoryLot[] }) {
  const router = useRouter();
  const currency = useCurrency();
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState("FB_PAGE");
  const [buyerName, setBuyerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("GCASH");
  const [discount, setDiscount] = useState("0");
  const [shippingCharged, setShippingCharged] = useState("0");
  const [shippingCostPaid, setShippingCostPaid] = useState("0");
  const [platformFees, setPlatformFees] = useState("0");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<SaleLineItem[]>([
    { inventoryLotId: "", qty: "1", unitPrice: "" },
  ]);

  function updateLineItem(
    index: number,
    field: keyof SaleLineItem,
    value: string
  ) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { inventoryLotId: "", qty: "1", unitPrice: "" },
    ]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = lineItems.reduce(
    (sum, item) =>
      sum + (parseFloat(item.unitPrice) || 0) * (parseInt(item.qty) || 0),
    0
  );
  const totalCollected =
    subtotal - (parseFloat(discount) || 0) + (parseFloat(shippingCharged) || 0);

  async function handleSubmit() {
    setLoading(true);
    const result = await createSale({
      channel,
      buyerName: buyerName || undefined,
      paymentMethod,
      discount: parseFloat(discount) || 0,
      shippingCharged: parseFloat(shippingCharged) || 0,
      shippingCostPaid: parseFloat(shippingCostPaid) || 0,
      platformFees: parseFloat(platformFees) || 0,
      notes: notes || undefined,
      lineItems: lineItems.map((item) => ({
        inventoryLotId: item.inventoryLotId,
        qty: parseInt(item.qty) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
      })),
    });

    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Sale created as DRAFT");
      router.push(`/sales/${result.saleId}`);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sale Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Buyer Name (optional)</Label>
            <Input
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Buyer name"
            />
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
        </CardContent>
      </Card>

      {lineItems.map((item, index) => {
        const selectedLot = lots.find((l) => l.id === item.inventoryLotId);
        return (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Item {index + 1}</CardTitle>
                {lineItems.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeLineItem(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Select Inventory Lot</Label>
                <Select
                  value={item.inventoryLotId}
                  onValueChange={(v) =>
                    updateLineItem(index, "inventoryLotId", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick an item..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lots
                      .filter((l) => l.qtyOnHand > 0)
                      .map((lot) => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.setCode && `${lot.setCode} `}
                          {lot.productName} ({lot.language}) — {lot.qtyOnHand}x
                          @ {formatCurrency(lot.unitCost.toString(), currency)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    Qty{" "}
                    {selectedLot && (
                      <span className="text-muted-foreground font-normal">
                        (max {selectedLot.qtyOnHand})
                      </span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedLot?.qtyOnHand}
                    value={item.qty}
                    onChange={(e) =>
                      updateLineItem(index, "qty", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sell Price (each)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateLineItem(index, "unitPrice", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button variant="outline" className="w-full" onClick={addLineItem}>
        <Plus className="h-4 w-4 mr-1" />
        Add Item
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adjustments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Discount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Shipping Charged</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={shippingCharged}
                onChange={(e) => setShippingCharged(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Shipping Cost (yours)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={shippingCostPaid}
                onChange={(e) => setShippingCostPaid(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Platform Fees</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={platformFees}
                onChange={(e) => setPlatformFees(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5 mt-3">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between rounded-md bg-muted p-3">
        <span className="text-sm font-medium">Total Collected</span>
        <span className="text-lg font-bold">
          {formatCurrency(totalCollected, currency)}
        </span>
      </div>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={
          loading || lineItems.some((i) => !i.inventoryLotId || !i.unitPrice)
        }
      >
        {loading ? "Creating..." : "Create Sale (Draft)"}
      </Button>
    </div>
  );
}
