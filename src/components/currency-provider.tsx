"use client";

import { createContext, useContext } from "react";
import { DEFAULT_CURRENCY, type CurrencyCode } from "@/lib/currency";

interface CurrencyContextValue {
  /** The user's active display currency. */
  currency: CurrencyCode;
  /** Live rate to convert a base (PHP) amount into the display currency. */
  rate: number;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: DEFAULT_CURRENCY,
  rate: 1,
});

export function CurrencyProvider({
  currency,
  rate,
  children,
}: {
  currency: CurrencyCode;
  rate: number;
  children: React.ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={{ currency, rate }}>
      {children}
    </CurrencyContext.Provider>
  );
}

/** The active display currency for the signed-in user. */
export function useCurrency(): CurrencyCode {
  return useContext(CurrencyContext).currency;
}

/** Live rate to convert a base (PHP) amount into the display currency. */
export function useRate(): number {
  return useContext(CurrencyContext).rate;
}
