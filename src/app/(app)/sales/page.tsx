import { getSales } from "@/lib/actions/sales";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  CONFIRMED: "default",
  CANCELLED: "outline",
  REFUNDED: "destructive",
};

export default async function SalesPage() {
  const sales = await getSales();

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sales</h2>
          <p className="text-muted-foreground text-sm">
            {sales.length} sale{sales.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/sales/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Sale
          </Button>
        </Link>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No sales yet. Create your first sale.
        </div>
      ) : (
        <div className="space-y-2">
          {sales.map((sale) => {
            const profit = sale.lineItems.reduce(
              (sum, li) => sum + parseFloat(li.profitTotal.toString()),
              0
            );
            return (
              <Link key={sale.id} href={`/sales/${sale.id}`}>
                <Card className="p-3 gap-0 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {sale.buyerName || `Sale #${sale.id.slice(0, 8)}`}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(sale.soldAt)} &bull;{" "}
                        {sale.channel.replace("_", " ")} &bull;{" "}
                        {sale.lineItems.length} item
                        {sale.lineItems.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold">
                        {formatCurrency(sale.totalCollected.toString())}
                      </div>
                      {sale.status === "CONFIRMED" && profit > 0 && (
                        <div className="text-xs text-green-600">
                          +{formatCurrency(profit)}
                        </div>
                      )}
                      <Badge
                        variant={statusColors[sale.status] || "outline"}
                        className="text-[10px] px-1.5 py-0 mt-0.5"
                      >
                        {sale.status}
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
