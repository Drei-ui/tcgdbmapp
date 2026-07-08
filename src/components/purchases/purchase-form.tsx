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
import { createPurchase } from "@/lib/actions/purchases";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { useCurrency, useRate } from "@/components/currency-provider";
import { convertToBase } from "@/lib/currency";
import type { Supplier, ProductCatalog } from "@prisma/client";

const PRODUCT_TYPES = [
  { value: "SEALED_BOX", label: "Sealed Box" },
  { value: "PACK", label: "Pack" },
  { value: "ETB", label: "ETB" },
  { value: "SINGLE", label: "Single" },
  { value: "BULK_LOT", label: "Bulk Lot" },
  { value: "ACCESSORY", label: "Accessory" },
];

type LineItem = {
  brand: string;
  productType: string;
  setCode: string;
  productName: string;
  language: string;
  rarity: string;
  condition: string;
  qty: string;
  unitCost: string;
};

const emptyLineItem: LineItem = {
  brand: "Pokemon",
  productType: "SEALED_BOX",
  setCode: "",
  productName: "",
  language: "EN",
  rarity: "",
  condition: "",
  qty: "1",
  unitCost: "",
};

export function PurchaseForm({
  suppliers,
  catalog = [],
}: {
  suppliers: Supplier[];
  catalog?: ProductCatalog[];
}) {
  const router = useRouter();
  const currency = useCurrency();
  const rate = useRate();
  const [loading, setLoading] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [shippingCost, setShippingCost] = useState("0");
  const [fees, setFees] = useState("0");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { ...emptyLineItem },
  ]);

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function applyProduct(index: number, product: ProductCatalog) {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              brand: product.brand,
              productType: product.productType,
              setCode: product.setCode || "",
              productName: product.productName,
              language: product.language,
              rarity: product.rarity || "",
            }
          : item
      )
    );
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { ...emptyLineItem }]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  const total =
    lineItems.reduce(
      (sum, item) =>
        sum + (parseFloat(item.unitCost) || 0) * (parseInt(item.qty) || 0),
      0
    ) +
    (parseFloat(shippingCost) || 0) +
    (parseFloat(fees) || 0);

  async function handleSubmit() {
    setLoading(true);
    // Amounts are typed in the active display currency; store them in the PHP base.
    const result = await createPurchase({
      supplierId: supplierId && supplierId !== "new" ? supplierId : undefined,
      newSupplierName: newSupplierName || undefined,
      shippingCost: convertToBase(parseFloat(shippingCost) || 0, rate),
      fees: convertToBase(parseFloat(fees) || 0, rate),
      notes: notes || undefined,
      lineItems: lineItems.map((item) => ({
        brand: item.brand,
        productType: item.productType,
        setCode: item.setCode || undefined,
        productName: item.productName,
        language: item.language || "EN",
        rarity: item.rarity || undefined,
        condition: item.condition || undefined,
        qty: parseInt(item.qty) || 1,
        unitCost: convertToBase(parseFloat(item.unitCost) || 0, rate),
      })),
    });

    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Purchase created");
      router.push(`/purchases/${result.purchaseId}`);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supplier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="Select supplier..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">+ New Supplier</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {supplierId === "new" && (
            <Input
              placeholder="New supplier name"
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Shipping Cost</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fees</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
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

      {lineItems.map((item, index) => (
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
            {catalog.length > 0 && (
              <div className="space-y-1.5">
                <Label>Saved Product</Label>
                <Select
                  value=""
                  onValueChange={(id) => {
                    const product = catalog.find((p) => p.id === id);
                    if (product) applyProduct(index, product);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick from saved products..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.brand} — {p.productName}
                        {p.setCode ? ` (${p.setCode})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={item.productType}
                  onValueChange={(v) =>
                    updateLineItem(index, "productType", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Input
                  value={item.brand}
                  onChange={(e) =>
                    updateLineItem(index, "brand", e.target.value)
                  }
                  placeholder="Pokemon"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Product Name</Label>
              <Input
                value={item.productName}
                onChange={(e) =>
                  updateLineItem(index, "productName", e.target.value)
                }
                placeholder="e.g., Surging Sparks BB"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Set Code</Label>
                <Input
                  value={item.setCode}
                  onChange={(e) =>
                    updateLineItem(index, "setCode", e.target.value)
                  }
                  placeholder="SV7"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lang</Label>
                <Select
                  value={item.language}
                  onValueChange={(v) =>
                    updateLineItem(index, "language", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EN">EN</SelectItem>
                    <SelectItem value="JP">JP</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Condition</Label>
                <Input
                  value={item.condition}
                  onChange={(e) =>
                    updateLineItem(index, "condition", e.target.value)
                  }
                  placeholder="NM"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Rarity</Label>
                <Input
                  value={item.rarity}
                  onChange={(e) =>
                    updateLineItem(index, "rarity", e.target.value)
                  }
                  placeholder="SAR"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(e) =>
                    updateLineItem(index, "qty", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Cost</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitCost}
                  onChange={(e) =>
                    updateLineItem(index, "unitCost", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" className="w-full" onClick={addLineItem}>
        <Plus className="h-4 w-4 mr-1" />
        Add Line Item
      </Button>

      <Separator />

      <div className="flex items-center justify-between rounded-md bg-muted p-3">
        <span className="text-sm font-medium">Total Purchase Cost</span>
        <span className="text-lg font-bold">{formatCurrency(total, currency)}</span>
      </div>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={
          loading || lineItems.some((i) => !i.productName || !i.unitCost)
        }
      >
        {loading ? "Creating..." : "Create Purchase"}
      </Button>
    </div>
  );
}
