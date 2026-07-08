"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/currency-provider";
import { ShoppingCart, Bookmark, PenLine } from "lucide-react";
import Link from "next/link";
import type { InventoryLot } from "@prisma/client";

export function InventoryCard({
  lot,
  onQuickSell,
  onReserve,
  onAdjust,
}: {
  lot: InventoryLot;
  onQuickSell: (lot: InventoryLot) => void;
  onReserve: (lot: InventoryLot) => void;
  onAdjust: (lot: InventoryLot) => void;
}) {
  const currency = useCurrency();
  const subtitle = [lot.productType.replace("_", " "), lot.setCode, lot.rarity, lot.condition]
    .filter(Boolean)
    .join(" \u2022 ");

  return (
    <Card className="p-3 gap-0">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/inventory/${lot.id}`}
          className="flex-1 min-w-0"
        >
          <h3 className="font-medium text-sm leading-tight truncate">
            {lot.setCode && `${lot.setCode} `}
            {lot.productName} ({lot.language})
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {subtitle}
          </p>
        </Link>

        <div className="text-right shrink-0">
          <div className="text-sm font-semibold">{lot.qtyOnHand}x</div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(lot.unitCost.toString(), currency)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2">
        <Badge
          variant={
            lot.status === "ON_HAND"
              ? "default"
              : lot.status === "RESERVED"
                ? "secondary"
                : "outline"
          }
          className="text-[10px] px-1.5 py-0"
        >
          {lot.status.replace("_", " ")}
        </Badge>
        {lot.notes && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {lot.notes}
          </Badge>
        )}
        {lot.brand && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {lot.brand}
          </Badge>
        )}

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onQuickSell(lot)}
          title="Quick Sell"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onReserve(lot)}
          title={lot.status === "RESERVED" ? "Unreserve" : "Reserve"}
        >
          <Bookmark className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onAdjust(lot)}
          title="Adjust Qty"
        >
          <PenLine className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
