import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { CurrencyProvider } from "@/components/currency-provider";
import { getCurrency } from "@/lib/auth";
import { getRate } from "@/lib/fx";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currency = await getCurrency();
  const rate = await getRate(currency);

  return (
    <CurrencyProvider currency={currency} rate={rate}>
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <div className="flex flex-1">
          <SidebarNav />
          <main className="flex-1 overflow-auto pb-20 md:pb-4">
            <div className="mx-auto w-full max-w-screen-xl">{children}</div>
          </main>
        </div>
        <BottomNav />
      </div>
    </CurrencyProvider>
  );
}
