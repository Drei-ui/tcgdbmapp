import { getInventoryLots } from "@/lib/actions/inventory";
import { SaleForm } from "@/components/sales/sale-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewSalePage() {
  const lots = await getInventoryLots({ status: "ON_HAND" });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">
      <Link href="/sales">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </Link>
      <h2 className="text-2xl font-bold">Create Sale</h2>
      <SaleForm lots={lots} />
    </div>
  );
}
