"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useCallback, useState } from "react";

const PRODUCT_TYPES = [
  { value: "", label: "All Types" },
  { value: "SEALED_BOX", label: "Sealed" },
  { value: "PACK", label: "Packs" },
  { value: "ETB", label: "ETB" },
  { value: "SINGLE", label: "Singles" },
  { value: "BULK_LOT", label: "Bulk" },
  { value: "ACCESSORY", label: "Accessories" },
];

const LANGUAGES = [
  { value: "", label: "All" },
  { value: "EN", label: "EN" },
  { value: "JP", label: "JP" },
];

const STATUSES = [
  { value: "", label: "Active" },
  { value: "ON_HAND", label: "On Hand" },
  { value: "RESERVED", label: "Reserved" },
  { value: "SOLD_OUT", label: "Sold Out" },
];

export function FilterChips({ brands }: { brands: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") || ""
  );

  const currentType = searchParams.get("productType") || "";
  const currentLang = searchParams.get("language") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentBrand = searchParams.get("brand") || "";

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/inventory?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      router.push(`/inventory?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, set code, brand..."
          className="pl-9 h-9"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {brands.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={currentBrand === "" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => updateFilter("brand", "")}
            >
              All Brands
            </Badge>
            {brands.map((brand) => (
              <Badge
                key={brand}
                variant={currentBrand === brand ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => updateFilter("brand", brand)}
              >
                {brand}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {PRODUCT_TYPES.map((type) => (
          <Badge
            key={type.value}
            variant={currentType === type.value ? "default" : "outline"}
            className={cn("cursor-pointer text-xs")}
            onClick={() => updateFilter("productType", type.value)}
          >
            {type.label}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {LANGUAGES.map((lang) => (
          <Badge
            key={lang.value}
            variant={currentLang === lang.value ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => updateFilter("language", lang.value)}
          >
            {lang.label}
          </Badge>
        ))}
        <span className="mx-1" />
        {STATUSES.map((status) => (
          <Badge
            key={status.value}
            variant={currentStatus === status.value ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => updateFilter("status", status.value)}
          >
            {status.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
