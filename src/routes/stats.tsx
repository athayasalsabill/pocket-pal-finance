import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { SelectInput } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";
import { formatIDR, monthKey, monthLabel, todayISO } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { Lightbulb, TrendingDown, Wallet, Flame, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistik & Insight | Duit & Catatan" },
      { name: "description", content: "Lihat total pengeluaran, grafik, dan insight bulanan." },
    ],
  }),
  component: StatsPage,
});

const COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)",
  "var(--chart-4)", "var(--chart-5)", "var(--chart-6)",
];

function StatsPage() {
  const { data } = useFinance();
  const [viewMode, setViewMode] = useState<"stats" | "insight">("stats");

  // Kumpulkan daftar bulan
  const months = useMemo(() => {
    const set = new Set(data.transactions.map((t) => monthKey(t.date || "2000-01-01")));
    set.add(monthKey(todayISO()));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [data.transactions]);

  const [month, setMonth] = useState(months[0]);
  const active = months.includes(month) ? month : months[0];

  // ======================================
  // 1. DATA UNTUK STATISTIK (PIE CHART)
  // ======================================
  const txs = data.transactions.filter((t) => monthKey(t.date || "2000-01-01") === active);
  const income = sum(txs.filter((t) => t.type === "income"));
  const expense = sum(txs.filter((t) => t.type === "expense"));
  const debtPaidTotal = sum(txs.filter((t) => t.type === "debt_payment"));
  const byCategory = group(txs.filter((t) => t.type === "expense"), (t) => t.category ?? "Lainnya");
  const bySource = group(txs.filter((t) => t.type === "income"), (t) => t.source ?? "Lainnya");

  const debtStatus = useMemo(() => {
    const paid = data.transactions
      .filter((t) => t.type === "debt_payment")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const total = data.debts.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const remaining = Math.max(0, total - paid);
    return [
      { name: "Sudah dibayar", value: paid },
      { name: "Sisa", value: remaining },
    ].filter((d) => d.value > 0);
  }, [data]);

  // ======================================
  // 2. DATA UNTUK INSIGHT CERDAS
  // ======================================
  const insights = useMemo(() => {
    const expenses = txs.filter((t) => t.type === "expense");
    const incomes = txs.filter((t) => t.type === "income");

    const salaryTxs = incomes.filter((t) => 
        (t.source || "").toLowerCase().includes("salary") || 
        (t.note || "").toLowerCase().includes("gaji")
    );
    const totalSalary = sum(salaryTxs);
    const bestIncome = incomes.length ? incomes.reduce((prev, curr) => (Number(prev.amount) > Number(curr.amount) ? prev : curr)) : null;
    const biggestExpense = expenses.length ? expenses.reduce((prev, curr) => (Number(prev.amount) > Number(curr.amount) ? prev : curr)) : null;

    const dayTotals = expenses.reduce((acc, t) => {
        const date = new Date(t.date || "2000-01-01");
        const day = date.toLocaleDateString("id-ID", { weekday: "long" });
        acc[day] = (acc[day] || 0) + (Number(t.amount) || 0);
        return acc;
    }, {} as Record<string, number>);
    const topDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
    const topCat = byCategory.length ? byCategory[0] : null;

    let message = "Arus kas kamu terlihat cukup stabil bulan ini. Pertahankan!";
    if (expense > income && income > 0) {
        message = "Ups! Pengeluaranmu lebih besar dari pemasukan bulan ini. Yuk rem sedikit belanjanya!";
    } else if (income > 0 && expense <= (income * 0.4)) {
        message = "Luar biasa! Kamu super hemat bulan ini, sisa uangmu lebih dari 60%. Jangan lupa ditabung ya!";
    } else if (biggestExpense && biggestExpense.amount > (expense * 0.5)) {
        message = "Wow, satu transaksimu menghabiskan lebih dari setengah total pengeluaran bulan ini!";
    }

    return {
        totalSalary: totalSalary > 0 ? totalSalary : (bestIncome ? Number(bestIncome.amount) : 0),
        bestIncomeName: totalSalary > 0 ? "Total Gaji/Salary" : (bestIncome ? bestIncome.source : "-"),
        biggestExpense,
        topCat,
        topDay,
        message
    };
  }, [txs, expense, income, byCategory]);


  return (
    <AppShell>
      {/* HEADER BERSAMA: Pilihan Bulan & Tombol Mode */}
      <Panel className="mb-4">
        <SelectInput value={active} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </SelectInput>
        
        {/* Tombol Pemisah Mode */}
        <div className="mt-4 flex rounded-md border-2 border-ink/20 bg-background p-1">
          <button
            onClick={() => setViewMode("stats")}
            className={cn(
              "hand flex-1 rounded px-3 py-1.5 text-center text-sm transition-colors",
              viewMode === "stats" ? "bg-primary text-white" : "text-ink/60 hover:text-ink"
            )}
          >
            Statistik
          </button>
          <button
            onClick={() => setViewMode("insight")}
            className={cn(
              "hand flex-1 rounded px-3 py-1.5 text-center text-sm transition-colors",
              viewMode === "insight" ? "bg-primary text-white" : "text-ink/60 hover:text-ink"
            )}
          >
            Insight
          </button>
        </div>
      </Panel>

      {/* TAMPILAN MODE STATISTIK (LAMA) */}
      {viewMode === "stats" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Panel className="mb-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="income" value={income} />
              <Stat label="expense" value={expense} />
              <Stat label="debt paid" value={debtPaidTotal} />
            </div>
          </Panel>
          <ChartPanel title="expense per kategori" data={byCategory} />
          <ChartPanel title="income per sumber" data={bySource} />
          <ChartPanel title="status debt (semua)" data={debtStatus} />
        </div>
      )}

      {/* TAMPILAN MODE INSIGHT (BARU) */}
      {viewMode === "insight" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
          {/* Rangkuman Cepat */}
          <Panel>
            <div className="flex justify-between rounded-md bg-ink/5 p-3 text-sm">
              <div className="text-center w-1/2 border-r border-ink/10">
                <p className="text-ink/60">Total Pemasukan</p>
                <p className="font-bold text-emerald-600">{formatIDR(income)}</p>
              </div>
              <div className="text-center w-1/2">
                <p className="text-ink/60">Total Pengeluaran</p>
                <p className="font-bold text-primary">{formatIDR(expense)}</p>
              </div>
            </div>
          </Panel>

          {/* Card Pendapatan Terbesar */}
          {income > 0 && (
            <Panel className="!p-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-100 p-2 text-emerald-600 shrink-0">
                  <Wallet className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] tracking-widest font-bold text-ink/50 uppercase">PENDAPATAN UTAMA</p>
                  <p className="text-sm font-bold truncate">{insights.bestIncomeName}</p>
                  <p className="text-lg font-black text-emerald-600">{formatIDR(insights.totalSalary)}</p>
                </div>
              </div>
            </Panel>
          )}

          {/* Card Pengeluaran Terbesar */}
          {insights.biggestExpense && (
            <Panel className="!p-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary shrink-0">
                  <Flame className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] tracking-widest font-bold text-ink/50 uppercase">PENGELUARAN TERBESAR</p>
                  <p className="text-sm font-bold truncate">{insights.biggestExpense.note || "Tanpa Catatan"} ({insights.biggestExpense.category})</p>
                  <p className="text-lg font-black text-primary">{formatIDR(insights.biggestExpense.amount)}</p>
                </div>
              </div>
            </Panel>
          )}

          {/* Card Kategori Terboros */}
          {insights.topCat && (
            <Panel className="!p-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-orange-100 p-2 text-orange-600 shrink-0">
                  <TrendingDown className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] tracking-widest font-bold text-ink/50 uppercase">KATEGORI PALING BOROS</p>
                  <p className="text-sm font-bold truncate">{insights.topCat.name}</p>
                  <p className="text-lg font-black text-orange-600">{formatIDR(insights.topCat.value)}</p>
                </div>
              </div>
            </Panel>
          )}

          {/* Card Fakta Unik Hari */}
          {insights.topDay && (
            <Panel className="!p-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-2 text-blue-600 shrink-0">
                  <CalendarDays className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] tracking-widest font-bold text-ink/50 uppercase">FAKTA UNIK</p>
                  <p className="text-xs leading-snug mt-1 text-ink/80">
                    Bulan ini kamu paling boros di hari <strong className="text-blue-700">{insights.topDay[0]}</strong>, menghabiskan <strong className="text-ink">{formatIDR(insights.topDay[1])}</strong>.
                  </p>
                </div>
              </div>
            </Panel>
          )}

          {/* Pesan Kesimpulan */}
          <div className="flex items-start gap-3 rounded-md bg-yellow-50 p-3 text-yellow-800 border border-yellow-200 shadow-sm">
            <Lightbulb className="size-6 shrink-0 mt-0.5" />
            <p className="text-xs font-medium leading-relaxed">{insights.message}</p>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ======================================
// FUNGSI HELPER BAWAAN
// ======================================
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
  return items.reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

function group<T extends { amount: number }>(items: T[], key: (t: T) => string) {
  const map = new Map<string, number>();
  items.forEach((t) => map.set(key(t), (map.get(key(t)) ?? 0) + (Number(t.amount) || 0)));
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}