"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY_OPTIONS, type CurrencyCode } from "@/lib/currency";
import { updateCurrency } from "@/lib/actions/settings";

export function CurrencySelect({ current }: { current: CurrencyCode }) {
  const router = useRouter();
  const [value, setValue] = useState<CurrencyCode>(current);
  const [isPending, startTransition] = useTransition();

  const isDirty = value !== current;

  function handleSave() {
    startTransition(async () => {
      const result = await updateCurrency(value);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Currency updated");
      router.refresh();
    });
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 space-y-1.5">
        <label className="text-sm font-medium">Display currency</label>
        <Select
          value={value}
          onValueChange={(v) => setValue(v as CurrencyCode)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_OPTIONS.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {option.code} — {option.label} ({option.symbol})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSave} disabled={!isDirty || isPending}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
