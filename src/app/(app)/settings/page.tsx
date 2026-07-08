import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencySelect } from "@/components/settings/currency-select";
import { getCurrency } from "@/lib/auth";

export default async function SettingsPage() {
  const currency = await getCurrency();

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Currency</CardTitle>
          <CardDescription>
            Choose how monetary amounts are displayed across the app. This only
            changes formatting — stored values are unchanged, so all existing
            records re-display in the selected currency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CurrencySelect current={currency} />
        </CardContent>
      </Card>
    </div>
  );
}
