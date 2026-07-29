import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { useFinance } from "@/lib/finance-store";
import {
  ACCOUNT_TYPE_LABEL,
  accountBalance,
  formatIDR,
  totalBalance,
  type AccountType,
} from "@/lib/finance";
import { ChevronRight, Wallet, Landmark, Smartphone } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Duit & Catatan — Finance Tracker Offline" },
      {
        name: "description",
        content:
          "Catat pemasukan, pengeluaran, transfer, dan utang. Semua data tersimpan di HP kamu dan tetap jalan tanpa internet.",
      },
      { property: "og:title", content: "Duit & Catatan — Finance Tracker Offline" },
      {
        property: "og:description",
        content: "Catat pemasukan, pengeluaran, transfer, dan utang. Semua data tersimpan di HP kamu dan tetap jalan tanpa internet.",
      },
    ],
  }),
  component: HomePage,
});

const ICONS: Record<AccountType, typeof Wallet> = {
  cash: Wallet,
  bank: Landmark,
  ewallet: Smartphone,
};

function HomePage() {
  const { data, ready } = useFinance();

  return (
    <AppShell>
      <h1 className="sr-only">Finance tracker Duit &amp; Catatan</h1>
      <Panel className="mb-4 text-center">
        <p className="hand text-xl text-ink/70">total saldo</p>
        <p className="mt-1 text-3xl font-extrabold text-primary">
          {formatIDR(ready ? totalBalance(data) : 0)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {data.accounts.length} akun · tersimpan di HP kamu
        </p>
      </Panel>
      <Panel title="akun kamu">
        {data.accounts.length === 0 ? (
          <EmptyNote>Belum ada akun. Pergi ke Pengaturan (ikon gir di kanan atas) untuk menambah akun pertamamu!</EmptyNote>
        ) : (
          <ul className="space-y-1">
            {data.accounts.map((a) => {
              const Icon = ICONS[a.type];
              return (
                <li key={a.id}>
                  <Link
                    to="/accounts/$accountId"
                    params={{ accountId: a.id }}
                    className="flex items-center gap-3 rounded-md border-b border-ink/10 px-1 py-2.5 transition-colors hover:bg-muted"
                  >
                    <span className="rounded-md bg-sky p-2 text-ink">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{a.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {ACCOUNT_TYPE_LABEL[a.type]}
                      </span>
                    </span>
                    <span className="font-bold text-ink">{formatIDR(accountBalance(a, data))}</span>
                    <ChevronRight className="size-4 text-ink/40" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </AppShell>
  );
}