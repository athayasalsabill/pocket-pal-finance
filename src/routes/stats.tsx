import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { SelectInput } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";
import { formatIDR, monthKey, monthLabel, todayISO } from "@/lib/finance";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistik Bulanan | Duit & Catatan" },
      {
        name: "description",
        content:
          "Lihat total pemasukan, pengeluaran, dan pembayaran utang per bulan lengkap dengan pie chart.",
      },
      { property: "og:title", content: "Statistik Bulanan | Duit & Catatan" },
      { property: "og:description", content: "Pie chart kategori expense, sumber income, dan status debt." },
    ],
  }),
  component: StatsPage,
});

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function StatsPage() {
  const { data } = useFinance();
  const months = useMemo(() => {
    const set = new Set(data.transactions.map((t) => monthKey(t.date)));
    set.add(monthKey(todayISO()));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [data.transactions]);
  
  const [month, setMonth] = useState(months[0]);
  const active = months.includes(month) ? month : months[0];
  
  const txs = data.transactions.filter((t) => monthKey(t.date) === active);
  const income = sum(txs.filter((t) => t.type === "income"));
  const expense = sum(txs.filter((t) => t.type === "expense"));
  const debtPaidTotal = sum(txs.filter((t) => t.type === "debt_payment"));
  const byCategory = group(txs.filter((t) => t.type === "expense"), (t) => t.category ?? "Lainnya");
  const bySource = group(txs.filter((t) => t.type === "income"), (t) => t.source ?? "Lainnya");
  
  const debtStatus = useMemo(() => {
    const paid = data.transactions
      .filter((t) => t.type === "debt_payment")
      .reduce((s, t) => s + t.amount, 0);
    const total = data.debts.reduce((s, d) => s + d.amount, 0);
    const remaining = Math.max(0, total - paid);
    return [
      { name: "Sudah dibayar", value: paid },
      { name: "Sisa", value: remaining },
    ].filter((d) => d.value > 0);
  }, [data]);

  return (
    <AppShell>
      <Panel className="mb-4">
        <SelectInput value={active} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </SelectInput>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="income" value={income} />
          <Stat label="expense" value={expense} />
          <Stat label="debt paid" value={debtPaidTotal} />
        </div>
      </Panel>
      <ChartPanel title="expense per kategori" data={byCategory} />
      <ChartPanel title="income per sumber" data={bySource} />
      <ChartPanel title="status debt (semua)" data={debtStatus} />
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border-2 border-ink/15 bg-background px-1 py-2">
      <p className="hand text-lg text-ink/70">{label}</p>
      <p className="text-sm font-bold text-ink">{formatIDR(value)}</p>
    </div>
  );
}

function ChartPanel({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Panel title={title} className="mb-4">
      {data.length === 0 ? (
        <EmptyNote>Belum ada data.</EmptyNote>
      ) : (
        <>
          {/* Visual Pie Chart */}
          <div className="h-48 w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" outerRadius={72} label={false}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="var(--ink)" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatIDR(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Rincian Angka per Kategori */}
          <div className="space-y-2 border-t-2 border-ink/10 pt-3">
            {data.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full border border-ink/20"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-base text-ink">{item.name}</span>
                </div>
                <span className="text-base font-bold text-ink">{formatIDR(item.value)}</span>
              </div>
            ))}
          </div>

          {/* Total Keseluruhan */}
          <div className="mt-3 flex items-center justify-between border-t-2 border-ink/20 pt-2">
            <span className="hand text-lg font-bold text-ink/80">Total</span>
            <span className="text-lg font-bold text-ink">{formatIDR(totalValue)}</span>
          </div>
        </>
      )}
    </Panel>
  );
}

function sum(items: { amount: number }[]) {
  return items.reduce((s, t) => s + t.amount, 0);
}

function group<T extends { amount: number }>(items: T[], key: (t: T) => string) {
  const map = new Map<string, number>();
  items.forEach((t) => map.set(key(t), (map.get(key(t)) ?? 0) + t.amount));
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}