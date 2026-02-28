import { getInventoryLot } from "@/lib/actions/inventory";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, daysAgo, serialize } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LotActions } from "@/components/inventory/lot-actions";

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lot = await getInventoryLot(id);

  if (!lot) notFound();

  const age = daysAgo(lot.acquiredAt);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <Link href="/inventory">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Inventory
        </Button>
      </Link>

      <div>
        <h2 className="text-2xl font-bold">
          {lot.setCode && `${lot.setCode} `}
          {lot.productName}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant={
              lot.status === "ON_HAND"
                ? "default"
                : lot.status === "RESERVED"
                  ? "secondary"
                  : "outline"
            }
          >
            {lot.status.replace("_", " ")}
          </Badge>
          <Badge variant="outline">{lot.language}</Badge>
          <Badge variant="outline">{lot.productType.replace("_", " ")}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Brand</span>
              <p className="font-medium">{lot.brand}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Set Code</span>
              <p className="font-medium">{lot.setCode || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Rarity</span>
              <p className="font-medium">{lot.rarity || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Condition</span>
              <p className="font-medium">{lot.condition || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Language</span>
              <p className="font-medium">{lot.language}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Location</span>
              <p className="font-medium">{lot.location || "—"}</p>
            </div>
          </div>

          {lot.notes && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">Notes</span>
                <p className="font-medium">{lot.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock & Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Qty On Hand</span>
              <p className="text-xl font-bold">{lot.qtyOnHand}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Unit Cost</span>
              <p className="text-xl font-bold">
                {formatCurrency(lot.unitCost.toString())}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Value</span>
              <p className="font-medium">
                {formatCurrency(
                  (
                    parseFloat(lot.unitCost.toString()) * lot.qtyOnHand
                  ).toString()
                )}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Age</span>
              <p className="font-medium">{age} days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acquisition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Acquired</span>
              <p className="font-medium">{formatDate(lot.acquiredAt)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Supplier</span>
              <p className="font-medium">{lot.supplier?.name || "—"}</p>
            </div>
            {lot.purchaseId && (
              <div>
                <span className="text-muted-foreground">Purchase</span>
                <Link
                  href={`/purchases/${lot.purchaseId}`}
                  className="text-primary underline block font-medium"
                >
                  View Purchase
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <LotActions lot={serialize(lot)} />
    </div>
  );
}
