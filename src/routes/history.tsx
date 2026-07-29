import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { TxRow } from "@/components/finance/TxRow";
import { useFinance } from "@/lib/finance-store";
import { monthKey, monthLabel, sortByDateDesc } from "@/lib/finance";
import { ChevronDown, ChevronRight } from "lucide-react";
export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Riwayat Transaksi | Duit & Catatan" },
      {
        name: "description",
        content: "Semua transaksi kamu dikelompokkan per bulan, tinggal expand untuk lihat detail.",
      },
      { property: "og:title", content: "Riwayat Transaksi | Duit & Catatan" },
      { property: "og:description", content: "Transaksi per bulan, rapi dan bisa dibuka-tutup." },
    ],
  }),
  component: HistoryPage,
});
function HistoryPage() {
  const { data, deleteTransaction } = useFinance();
  const groups = useMemo(() => {
    const map = new Map<string, typeof data.transactions>();
    [...data.transactions].sort(sortByDateDesc).forEach((tx) => {
      const key = monthKey(tx.date);
      map.set(key, [...(map.get(key) ?? []), tx]);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data.transactions]);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  return (
    <AppShell>
      <Panel title="history">
        {groups.length === 0 ? (
          <EmptyNote>Belum ada transaksi.</EmptyNote>
        ) : (
          groups.map(([key, txs]) => {
            const isOpen = !closed[key];
            return (
              <div key={key} className="mb-3 last:mb-0">
                <button
                  onClick={() => setClosed((c) => ({ ...c, [key]: isOpen }))}
                  className="flex w-full items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="size-4 text-ink/60" />
                  ) : (
                    <ChevronRight className="size-4 text-ink/60" />
                  )}
                  <span className="hand flex-1 text-xl text-ink">{monthLabel(key)}</span>
                  <span className="text-xs text-muted-foreground">{txs.length} transaksi</span>
                </button>
                {isOpen && (
                  <div className="px-1">
                    {txs.map((tx) => (
                      <TxRow key={tx.id} tx={tx} data={data} onDelete={deleteTransaction} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Panel>
    </AppShell>
  );
}