import { getSuppliers } from "@/lib/actions/purchases";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewPurchasePage() {
  const suppliers = await getSuppliers();

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">
      <Link href="/purchases">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </Link>
      <h2 className="text-2xl font-bold">Create Purchase</h2>
      <PurchaseForm suppliers={suppliers} />
    </div>
  );
}
