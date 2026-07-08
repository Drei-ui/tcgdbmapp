import "server-only";
import { cache } from "react";
import { DEFAULT_CURRENCY, type CurrencyCode } from "@/lib/currency";

/**
 * Live foreign-exchange rates, based on PHP (our stored base currency).
 *
 * `rates[code]` = how many units of `code` equal 1 PHP. So a stored PHP amount
 * is converted to the display currency by multiplying, and a value typed in the
 * display currency is converted back to PHP by dividing.
 *
 * Rates are fetched from a keyless endpoint and cached at the data layer for an
 * hour. Any failure falls back to 1:1 (no conversion) so the app never breaks on
 * a network hiccup — amounts just display in their PHP base until rates return.
 */
const FX_ENDPOINT = "https://open.er-api.com/v6/latest/PHP";
const FX_REVALIDATE_SECONDS = 3600;

export interface FxRates {
  base: CurrencyCode;
  rates: Record<string, number>;
  updatedAt: string | null;
}

const fetchRates = cache(async (): Promise<FxRates> => {
  try {
    const res = await fetch(FX_ENDPOINT, {
      next: { revalidate: FX_REVALIDATE_SECONDS },
    });
    if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
    const json = await res.json();
    if (json?.result !== "success" || !json?.rates) {
      throw new Error("FX response missing rates");
    }
    return {
      base: DEFAULT_CURRENCY,
      rates: json.rates as Record<string, number>,
      updatedAt: json.time_last_update_utc ?? null,
    };
  } catch (error) {
    console.error("[fx] rate fetch failed, falling back to 1:1", error);
    return { base: DEFAULT_CURRENCY, rates: {}, updatedAt: null };
  }
});

export const getRates = fetchRates;

/** Rate to convert a PHP amount into `currency` (1 for the base currency). */
export async function getRate(currency: CurrencyCode): Promise<number> {
  if (currency === DEFAULT_CURRENCY) return 1;
  const { rates } = await getRates();
  const rate = rates[currency];
  return typeof rate === "number" && rate > 0 ? rate : 1;
}
