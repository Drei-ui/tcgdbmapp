"use client";

import { useState } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createCashTransaction } from "@/lib/actions/cash";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "SALE_INCOME", label: "Sale Income" },
  { value: "INVENTORY_BUY", label: "Inventory Buy" },
  { value: "SHIPPING_COST", label: "Shipping Cost" },
  { value: "SUPPLIES", label: "Supplies" },
  { value: "PLATFORM_FEES", label: "Platform Fees" },
  { value: "CAPITAL_IN", label: "Capital In" },
  { value: "OTHER", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "BANK", label: "Bank" },
  { value: "CASH", label: "Cash" },
  { value: "MIXED", label: "Mixed" },
  { value: "OTHER", label: "Other" },
];

export function CashForm({
  open,
  onOpenChange,
  defaultType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType: "IN" | "OUT";
}) {
  const [type, setType] = useState(defaultType);
  const [category, setCategory] = useState(
    defaultType === "IN" ? "SALE_INCOME" : "SUPPLIES"
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("GCASH");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    const result = await createCashTransaction({
      type,
      category,
      amount: parseFloat(amount) || 0,
      description,
      paymentMethod,
    });
    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Transaction recorded");
      onOpenChange(false);
      setAmount("");
      setDescription("");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">
            Cash {type === "IN" ? "IN" : "OUT"}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "IN" | "OUT")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Cash IN</SelectItem>
                  <SelectItem value="OUT">Cash OUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
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

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this transaction for?"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading || !amount || !description}
          >
            {loading ? "Saving..." : "Record Transaction"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
