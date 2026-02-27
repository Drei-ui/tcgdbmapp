import { Suspense } from "react";
import { getInventoryLots, getInventoryBrands } from "@/lib/actions/inventory";
import { FilterChips } from "@/components/inventory/filter-chips";
import { InventoryList } from "@/components/inventory/inventory-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { serialize } from "@/lib/utils";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    brand?: string;
    productType?: string;
    language?: string;
    status?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const [lots, brands] = await Promise.all([
    getInventoryLots(params),
    getInventoryBrands(),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory</h2>
          <p className="text-muted-foreground text-sm">
            {lots.length} lot{lots.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/purchases/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Stock
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div>Loading filters...</div>}>
        <FilterChips brands={brands} />
      </Suspense>

      <InventoryList lots={serialize(lots)} />
    </div>
  );
}
