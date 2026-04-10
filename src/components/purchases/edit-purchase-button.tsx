"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePurchase } from "@/lib/actions/purchases";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

interface EditPurchaseButtonProps {
  purchaseId: string;
  initialValues: {
    shippingCost: string | number;
    fees: string | number;
    notes?: string;
  };
  isReceived: boolean;
}

export function EditPurchaseButton({
  purchaseId,
  initialValues,
  isReceived,
}: EditPurchaseButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shippingCost, setShippingCost] = useState(
    String(initialValues.shippingCost)
  );
  const [fees, setFees] = useState(String(initialValues.fees));
  const [notes, setNotes] = useState(initialValues.notes ?? "");

  async function handleSave() {
    setLoading(true);
    const result = await updatePurchase(purchaseId, {
      shippingCost: parseFloat(shippingCost) || 0,
      fees: parseFloat(fees) || 0,
      notes: notes || undefined,
    });
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Purchase updated");
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Pencil className="h-4 w-4 mr-2" />
        Edit Purchase
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Purchase</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="shippingCost">Shipping Cost</Label>
              <Input
                id="shippingCost"
                type="number"
                min="0"
                step="0.01"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fees">Fees</Label>
              <Input
                id="fees"
                type="number"
                min="0"
                step="0.01"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {isReceived && (
              <p className="text-xs text-muted-foreground">
                Inventory lot unit costs will be recalculated with the new
                shipping & fees allocation.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
