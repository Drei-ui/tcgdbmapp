import { getPurchases } from "@/lib/actions/purchases";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PurchasesPage() {
  const purchases = await getPurchases();

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Purchases</h2>
          <p className="text-muted-foreground text-sm">
            {purchases.length} purchase{purchases.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/purchases/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Purchase
          </Button>
        </Link>
      </div>

      {purchases.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No purchases yet. Create your first purchase order.
        </div>
      ) : (
        <div className="space-y-2">
          {purchases.map((purchase) => {
            const itemTotal = purchase.lineItems.reduce(
              (sum, li) =>
                sum + parseFloat(li.unitCost.toString()) * li.qty,
              0
            );
            const total =
              itemTotal +
              parseFloat(purchase.shippingCost.toString()) +
              parseFloat(purchase.fees.toString());
            const isReceived = (purchase._count?.inventoryLots ?? 0) > 0;

            return (
              <Link key={purchase.id} href={`/purchases/${purchase.id}`}>
                <Card className="p-3 gap-0 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {purchase.supplier?.name || "No supplier"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(purchase.purchasedAt)} &bull;{" "}
                        {purchase.lineItems.length} item
                        {purchase.lineItems.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold">
                        {formatCurrency(total)}
                      </div>
                      <Badge
                        variant={isReceived ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0 mt-0.5"
                      >
                        {isReceived ? "Received" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
