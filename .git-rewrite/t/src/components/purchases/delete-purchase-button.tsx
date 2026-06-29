"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deletePurchase } from "@/lib/actions/purchases";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeletePurchaseButton({ purchaseId }: { purchaseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setLoading(true);
    const result = await deletePurchase(purchaseId);
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
      setConfirming(false);
    } else {
      toast.success("Purchase deleted");
      router.push("/purchases");
    }
  }

  return (
    <Button
      variant="destructive"
      onClick={handleDelete}
      disabled={loading}
      className="w-full"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      {loading
        ? "Deleting..."
        : confirming
          ? "Tap again to confirm delete"
          : "Delete Purchase"}
    </Button>
  );
}
