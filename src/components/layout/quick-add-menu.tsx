"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingCart,
  Truck,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

export function QuickAddMenu({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => router.push("/sales/new")}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          New Sale
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/purchases/new")}>
          <Truck className="mr-2 h-4 w-4" />
          New Purchase
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/cash?action=in")}
        >
          <ArrowDownCircle className="mr-2 h-4 w-4" />
          Cash IN
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/cash?action=out")}
        >
          <ArrowUpCircle className="mr-2 h-4 w-4" />
          Cash OUT
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
