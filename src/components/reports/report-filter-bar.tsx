"use client";

import { Badge } from "@/components/ui/badge";

const CHANNELS = [
  { value: "", label: "All Channels" },
  { value: "FB_PAGE", label: "FB Page" },
  { value: "FB_PROFILE", label: "FB Profile" },
  { value: "MEETUP", label: "Meetup" },
  { value: "SHIPPING", label: "Shipping" },
  { value: "OTHER", label: "Other" },
];

const PRODUCT_TYPES = [
  { value: "", label: "All Types" },
  { value: "SEALED_BOX", label: "Sealed" },
  { value: "PACK", label: "Packs" },
  { value: "ETB", label: "ETB" },
  { value: "SINGLE", label: "Singles" },
  { value: "BULK_LOT", label: "Bulk" },
  { value: "ACCESSORY", label: "Accessories" },
];

interface ReportFilterBarProps {
  brands: string[];
  currentBrand?: string;
  currentChannel?: string;
  currentProductType?: string;
  onFilterChange: (key: string, value: string) => void;
}

export function ReportFilterBar({
  brands,
  currentBrand,
  currentChannel,
  currentProductType,
  onFilterChange,
}: ReportFilterBarProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Brand row */}
      {brands.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <Badge
            variant={!currentBrand ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => onFilterChange("brand", "")}
          >
            All Brands
          </Badge>
          {brands.map((brand) => (
            <Badge
              key={brand}
              variant={currentBrand === brand ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => onFilterChange("brand", brand)}
            >
              {brand}
            </Badge>
          ))}
        </div>
      )}

      {/* Channel + Product Type row */}
      <div className="flex flex-wrap gap-1">
        {CHANNELS.map((ch) => (
          <Badge
            key={ch.value}
            variant={
              (currentChannel || "") === ch.value ? "default" : "outline"
            }
            className="cursor-pointer text-xs"
            onClick={() => onFilterChange("channel", ch.value)}
          >
            {ch.label}
          </Badge>
        ))}
        <span className="mx-1" />
        {PRODUCT_TYPES.map((type) => (
          <Badge
            key={type.value}
            variant={
              (currentProductType || "") === type.value ? "default" : "outline"
            }
            className="cursor-pointer text-xs"
            onClick={() => onFilterChange("productType", type.value)}
          >
            {type.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
