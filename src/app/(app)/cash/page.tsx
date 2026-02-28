import { getCashTransactions, getCashBalance } from "@/lib/actions/cash";
import { CashList } from "@/components/cash/cash-list";
import { serialize } from "@/lib/utils";
import { ExportButton } from "@/components/export-button";

export default async function CashLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const params = await searchParams;
  const [transactions, balance] = await Promise.all([
    getCashTransactions(),
    getCashBalance(),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cash Ledger</h2>
          <p className="text-muted-foreground text-sm">Track cash in and out</p>
        </div>
        <ExportButton type="cash" />
      </div>

      <CashList
        transactions={serialize(transactions)}
        balance={balance}
        defaultAction={params.action}
      />
    </div>
  );
}
