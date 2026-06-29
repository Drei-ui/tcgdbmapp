"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { receivePurchase } from "@/lib/actions/purchases";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";

export function ReceiveButton({ purchaseId }: { purchaseId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleReceive() {
    setLoading(true);
    const result = await receivePurchase(purchaseId);
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Purchase received! Inventory lots created.");
    }
  }

  return (
    <Button onClick={handleReceive} disabled={loading} className="w-full">
      <PackageCheck className="h-4 w-4 mr-2" />
      {loading ? "Receiving..." : "Receive Purchase"}
    </Button>
  );
}
