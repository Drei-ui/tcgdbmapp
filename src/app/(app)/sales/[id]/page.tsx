import { getSale } from "@/lib/actions/sales";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SaleActions } from "@/components/sales/sale-actions";

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  CONFIRMED: "default",
  CANCELLED: "outline",
  REFUNDED: "destructive",
};

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await getSale(id);

  if (!sale) notFound();

  const totalCogs = sale.lineItems.reduce(
    (sum, li) => sum + parseFloat(li.cogsTotal.toString()),
    0
  );
  const totalProfit = sale.lineItems.reduce(
    (sum, li) => sum + parseFloat(li.profitTotal.toString()),
    0
  );
  const netProfit =
    totalProfit -
    parseFloat(sale.shippingCostPaid.toString()) -
    parseFloat(sale.platformFees.toString());

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">
      <Link href="/sales">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sales
        </Button>
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {sale.buyerName || `Sale #${id.slice(0, 8)}`}
          </h2>
          <p className="text-muted-foreground text-sm">
            {formatDate(sale.soldAt)}
          </p>
        </div>
        <Badge variant={statusColors[sale.status] || "outline"}>
          {sale.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Channel</span>
              <p className="font-medium">{sale.channel.replace("_", " ")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Payment</span>
              <p className="font-medium">{sale.paymentMethod}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Subtotal</span>
              <p className="font-medium">
                {formatCurrency(sale.subtotal.toString())}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Discount</span>
              <p className="font-medium">
                -{formatCurrency(sale.discount.toString())}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Shipping Charged</span>
              <p className="font-medium">
                +{formatCurrency(sale.shippingCharged.toString())}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Collected</span>
              <p className="font-medium text-lg">
                {formatCurrency(sale.totalCollected.toString())}
              </p>
            </div>
          </div>

          {sale.status === "CONFIRMED" && (
            <>
              <Separator className="my-3" />
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">COGS</span>
                  <p className="font-medium text-red-600">
                    -{formatCurrency(totalCogs)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ship + Fees</span>
                  <p className="font-medium text-red-600">
                    -
                    {formatCurrency(
                      parseFloat(sale.shippingCostPaid.toString()) +
                        parseFloat(sale.platformFees.toString())
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Profit</span>
                  <p
                    className={`font-bold text-lg ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(netProfit)}
                  </p>
                </div>
              </div>
            </>
          )}

          {sale.notes && (
            <>
              <Separator className="my-3" />
              <div className="text-sm">
                <span className="text-muted-foreground">Notes</span>
                <p>{sale.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Items ({sale.lineItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sale.lineItems.map((item) => (
              <div key={item.id} className="text-sm">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/inventory/${item.inventoryLotId}`}
                    className="font-medium truncate hover:underline"
                  >
                    {item.inventoryLot.setCode &&
                      `${item.inventoryLot.setCode} `}
                    {item.inventoryLot.productName}
                  </Link>
                  <span className="shrink-0 font-medium">
                    {item.qty}x {formatCurrency(item.unitPrice.toString())} ={" "}
                    {formatCurrency(
                      (
                        parseFloat(item.unitPrice.toString()) * item.qty
                      ).toString()
                    )}
                  </span>
                </div>
                {sale.status === "CONFIRMED" && (
                  <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                    <span>
                      COGS: {formatCurrency(item.cogsTotal.toString())}
                    </span>
                    <span
                      className={
                        parseFloat(item.profitTotal.toString()) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      Profit: {formatCurrency(item.profitTotal.toString())}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <SaleActions saleId={id} status={sale.status} />
    </div>
  );
}
