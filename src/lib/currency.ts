/**
 * Supported display currencies. Amounts are stored as plain Decimals with no
 * currency of their own — this only controls how those numbers are formatted,
 * so switching currency re-renders all existing data in the new format.
 */
export const CURRENCIES = {
  PHP: { label: "Philippine Peso", symbol: "₱", locale: "en-PH" },
  NZD: { label: "New Zealand Dollar", symbol: "$", locale: "en-NZ" },
  AUD: { label: "Australian Dollar", symbol: "$", locale: "en-AU" },
  USD: { label: "US Dollar", symbol: "$", locale: "en-US" },
  SGD: { label: "Singapore Dollar", symbol: "$", locale: "en-SG" },
  EUR: { label: "Euro", symbol: "€", locale: "en-IE" },
  GBP: { label: "British Pound", symbol: "£", locale: "en-GB" },
  JPY: { label: "Japanese Yen", symbol: "¥", locale: "ja-JP" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export const DEFAULT_CURRENCY: CurrencyCode = "PHP";

export const CURRENCY_OPTIONS = (
  Object.keys(CURRENCIES) as CurrencyCode[]
).map((code) => ({ code, ...CURRENCIES[code] }));

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && value in CURRENCIES;
}

/** Convert a base-currency (PHP) amount into the display currency. */
export function convertFromBase(amountBase: number, rate: number): number {
  return amountBase * rate;
}

/** Convert a value typed in the display currency back into the base (PHP). */
export function convertToBase(amount: number, rate: number): number {
  return rate > 0 ? amount / rate : amount;
}

/** Coerce any stored/user value to a known currency, falling back to the default. */
export function toCurrencyCode(value: unknown): CurrencyCode {
  return isCurrencyCode(value) ? value : DEFAULT_CURRENCY;
}
