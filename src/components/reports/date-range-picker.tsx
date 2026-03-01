"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "mtd", label: "MTD" },
  { value: "custom", label: "Custom" },
];

interface DateRangePickerProps {
  currentRange: string;
  currentFrom?: string;
  currentTo?: string;
  onRangeChange: (range: string, from?: string, to?: string) => void;
}

export function DateRangePicker({
  currentRange,
  currentFrom,
  currentTo,
  onRangeChange,
}: DateRangePickerProps) {
  const [customFrom, setCustomFrom] = useState(currentFrom || "");
  const [customTo, setCustomTo] = useState(currentTo || "");
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.filter((p) => p.value !== "custom").map((preset) => (
        <Badge
          key={preset.value}
          variant={currentRange === preset.value ? "default" : "outline"}
          className="cursor-pointer text-xs"
          onClick={() => onRangeChange(preset.value)}
        >
          {preset.label}
        </Badge>
      ))}

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Badge
            variant={currentRange === "custom" ? "default" : "outline"}
            className={cn("cursor-pointer text-xs gap-1")}
          >
            <CalendarDays className="h-3 w-3" />
            {currentRange === "custom" && currentFrom && currentTo
              ? `${currentFrom} — ${currentTo}`
              : "Custom"}
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 space-y-3" align="start">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              From
            </label>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-1.5 text-sm bg-background"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              To
            </label>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-1.5 text-sm bg-background"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!customFrom || !customTo}
            onClick={() => {
              onRangeChange("custom", customFrom, customTo);
              setPopoverOpen(false);
            }}
          >
            Apply
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
