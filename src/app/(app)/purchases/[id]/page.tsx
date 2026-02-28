import { getPurchase } from "@/lib/actions/purchases";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ReceiveButton } from "@/components/purchases/receive-button";
import { DeletePurchaseButton } from "@/components/purchases/delete-purchase-button";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const purchase = await getPurchase(id);

  if (!purchase) notFound();

  const isReceived = purchase.inventoryLots.length > 0;
  const itemTotal = purchase.lineItems.reduce(
    (sum, li) => sum + parseFloat(li.unitCost.toString()) * li.qty,
    0
  );
  const total =
    itemTotal +
    parseFloat(purchase.shippingCost.toString()) +
    parseFloat(purchase.fees.toString());

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <Link href="/purchases">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Purchases
        </Button>
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Purchase #{id.slice(0, 8)}
          </h2>
          <p className="text-muted-foreground text-sm">
            {formatDate(purchase.purchasedAt)}
          </p>
        </div>
        <Badge variant={isReceived ? "default" : "secondary"}>
          {isReceived ? "Received" : "Pending"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Supplier</span>
              <p className="font-medium">
                {purchase.supplier?.name || "\u2014"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Shipping</span>
              <p className="font-medium">
                {formatCurrency(purchase.shippingCost.toString())}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Fees</span>
              <p className="font-medium">
                {formatCurrency(purchase.fees.toString())}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Total</span>
              <p className="font-medium text-lg">{formatCurrency(total)}</p>
            </div>
          </div>
          {purchase.notes && (
            <>
              <Separator className="my-3" />
              <div className="text-sm">
                <span className="text-muted-foreground">Notes</span>
                <p>{purchase.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Line Items ({purchase.lineItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {purchase.lineItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {item.setCode && `${item.setCode} `}
                    {item.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.productType.replace("_", " ")} &bull; {item.language}
                    {item.condition && ` \u2022 ${item.condition}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium">
                    {item.qty}x {formatCurrency(item.unitCost.toString())}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(
                      (parseFloat(item.unitCost.toString()) * item.qty).toString()
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isReceived && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Inventory Lots Created ({purchase.inventoryLots.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {purchase.inventoryLots.map((lot) => (
                <Link
                  key={lot.id}
                  href={`/inventory/${lot.id}`}
                  className="flex items-center justify-between text-sm hover:bg-muted/50 rounded p-1 -m-1"
                >
                  <span className="truncate">
                    {lot.setCode && `${lot.setCode} `}
                    {lot.productName}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {lot.qtyOnHand}x @ {formatCurrency(lot.unitCost.toString())}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isReceived && <ReceiveButton purchaseId={id} />}

      <DeletePurchaseButton purchaseId={id} />
    </div>
  );
}
