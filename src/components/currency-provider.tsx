"use client";

import { createContext, useContext } from "react";
import { DEFAULT_CURRENCY, type CurrencyCode } from "@/lib/currency";

const CurrencyContext = createContext<CurrencyCode>(DEFAULT_CURRENCY);

export function CurrencyProvider({
  currency,
  children,
}: {
  currency: CurrencyCode;
  children: React.ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={currency}>
      {children}
    </CurrencyContext.Provider>
  );
}

/** The active display currency for the signed-in user. */
export function useCurrency(): CurrencyCode {
  return useContext(CurrencyContext);
}
