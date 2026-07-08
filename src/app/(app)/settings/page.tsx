import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencySelect } from "@/components/settings/currency-select";
import { getCurrency } from "@/lib/auth";
import { getRate, getRates } from "@/lib/fx";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";

export default async function SettingsPage() {
  const currency = await getCurrency();
  const [rate, { updatedAt }] = await Promise.all([
    getRate(currency),
    getRates(),
  ]);
  const isBase = currency === DEFAULT_CURRENCY;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Currency</CardTitle>
          <CardDescription>
            Choose the currency amounts are shown in. Values are stored in{" "}
            {CURRENCIES[DEFAULT_CURRENCY].label} and converted at the current
            exchange rate — so existing records re-display in the selected
            currency, and new amounts you enter are converted back to{" "}
            {DEFAULT_CURRENCY} on save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CurrencySelect current={currency} />

          {!isBase && (
            <p className="text-xs text-muted-foreground">
              Live rate: {formatCurrency(1, DEFAULT_CURRENCY)} ={" "}
              {formatCurrency(rate, currency)} &middot;{" "}
              {formatCurrency(1, currency)} &asymp;{" "}
              {formatCurrency(1 / rate, DEFAULT_CURRENCY)}
              {updatedAt ? ` · updated ${updatedAt}` : " · rates unavailable, showing 1:1"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
