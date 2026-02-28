import { getDashboardStats } from "@/lib/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Wallet,
  Package,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Clock,
  Plus,
  Truck,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Hero stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash Balance</p>
                <p
                  className={`text-2xl font-bold ${stats.cashBalance >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(stats.cashBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Inventory Value
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.inventoryValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profit (30d)</p>
                <p
                  className={`text-2xl font-bold ${stats.sales30d.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(stats.sales30d.totalProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Sales Today</p>
            <p className="text-lg font-bold">{stats.salesToday.count}</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.salesToday.totalCollected)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Sales 7d</p>
            <p className="text-lg font-bold">{stats.sales7d.count}</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.sales7d.totalCollected)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
              <p className="text-xs text-muted-foreground">Low Stock</p>
            </div>
            <p className="text-lg font-bold">{stats.lowStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Oldest Stock</p>
            </div>
            <p className="text-lg font-bold">{stats.oldestStockDays}d</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <Link href="/sales/new" className="flex-1">
          <Button variant="outline" className="w-full">
            <ShoppingCart className="h-4 w-4 mr-1" />
            New Sale
          </Button>
        </Link>
        <Link href="/purchases/new" className="flex-1">
          <Button variant="outline" className="w-full">
            <Truck className="h-4 w-4 mr-1" />
            New Purchase
          </Button>
        </Link>
        <Link href="/cash?action=in" className="flex-1">
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            Cash IN
          </Button>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              ...stats.recentSales.map((s) => ({
                type: "sale" as const,
                id: s.id,
                label: s.buyerName || `Sale #${s.id.slice(0, 8)}`,
                detail: formatCurrency(s.totalCollected.toString()),
                badge: s.status,
                date: s.createdAt,
                href: `/sales/${s.id}`,
              })),
              ...stats.recentPurchases.map((p) => ({
                type: "purchase" as const,
                id: p.id,
                label: p.supplier?.name || `Purchase #${p.id.slice(0, 8)}`,
                detail: `${p._count?.lineItems || 0} items`,
                badge: "PURCHASE",
                date: p.createdAt,
                href: `/purchases/${p.id}`,
              })),
              ...stats.recentCash.map((c) => ({
                type: "cash" as const,
                id: c.id,
                label: c.description,
                detail: `${c.type === "IN" ? "+" : "-"}${formatCurrency(c.amount.toString())}`,
                badge: c.type,
                date: c.createdAt,
                href: "/cash",
              })),
            ]
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              )
              .slice(0, 10)
              .map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className="flex items-center justify-between text-sm hover:bg-muted/50 rounded p-1.5 -mx-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium truncate block">
                      {item.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs">{item.detail}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0"
                    >
                      {item.badge}
                    </Badge>
                  </div>
                </Link>
              ))}
            {stats.recentSales.length === 0 &&
              stats.recentPurchases.length === 0 &&
              stats.recentCash.length === 0 && (
                <p className="text-center py-4 text-muted-foreground text-sm">
                  No activity yet. Start by creating a purchase.
                </p>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
