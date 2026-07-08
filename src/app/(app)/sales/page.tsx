import { getSales } from "@/lib/actions/sales";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCurrency } from "@/lib/auth";
import { getRate } from "@/lib/fx";
import { ExportButton } from "@/components/export-button";

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  CONFIRMED: "default",
  CANCELLED: "outline",
  REFUNDED: "destructive",
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const result = await getSales({ page }) as {
    items: {
      id: string;
      soldAt: string;
      status: string;
      channel: string;
      buyerName?: string;
      totalCollected: string;
      lineItems: { id: string; profitTotal: string }[];
    }[];
    total: number;
    page: number;
    totalPages: number;
  };

  const currency = await getCurrency();
  const rate = await getRate(currency);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sales</h2>
          <p className="text-muted-foreground text-sm">
            {result.total} sale{result.total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton type="sales" />
          <Link href="/sales/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Sale
            </Button>
          </Link>
        </div>
      </div>

      {result.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No sales yet. Create your first sale.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
          {result.items.map((sale) => {
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
                        {formatCurrency(sale.totalCollected.toString(), currency, rate)}
                      </div>
                      {sale.status === "CONFIRMED" && profit > 0 && (
                        <div className="text-xs text-green-600">
                          +{formatCurrency(profit, currency, rate)}
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

      <Pagination page={result.page} totalPages={result.totalPages} total={result.total} />
    </div>
  );
}
