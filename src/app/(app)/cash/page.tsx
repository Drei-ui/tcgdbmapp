import { getCashTransactions, getCashBalance } from "@/lib/actions/cash";
import { CashList } from "@/components/cash/cash-list";
import { serialize } from "@/lib/utils";

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
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Cash Ledger</h2>
        <p className="text-muted-foreground text-sm">Track cash in and out</p>
      </div>

      <CashList
        transactions={serialize(transactions)}
        balance={balance}
        defaultAction={params.action}
      />
    </div>
  );
}
