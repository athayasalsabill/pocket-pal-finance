import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { SelectInput } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";
import { formatIDR } from "@/lib/finance";
import { Lightbulb, TrendingDown, Wallet, Flame, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/stats")({
  component: StatsPage,
});

function StatsPage() {
  const { data } = useFinance();
  const txs = data?.transactions || [];

  // 1. Kumpulkan semua bulan yang ada di datamu
  const months = useMemo(() => {
    const m = new Set<string>();
    txs.forEach((tx) => {
      if (tx && tx.date) m.add(tx.date.substring(0, 7)); // Ambil format YYYY-MM
    });
    return Array.from(m).sort().reverse(); // Urutkan dari yang paling baru
  }, [txs]);

  const [selectedMonth, setSelectedMonth] = useState(months[0] || "");

  // 2. Mesin Analisis Insight (Berjalan otomatis saat bulan dipilih)
  const insights = useMemo(() => {
    if (!selectedMonth) return null;

    const monthTxs = txs.filter((tx) => tx && tx.date && tx.date.startsWith(selectedMonth));
    const expenses = monthTxs.filter((tx) => tx.type === "expense");
    const incomes = monthTxs.filter((tx) => tx.type === "income");

    const totalExpense = expenses.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const totalIncome = incomes.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    // Mencari Gaji (Cari kata "salary" di sumber, atau "gaji" di catatan)
    const salaryTxs = incomes.filter((tx) => 
        (tx.source || "").toLowerCase().includes("salary") || 
        (tx.note || "").toLowerCase().includes("gaji")
    );
    const totalSalary = salaryTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    
    // Jika tidak ada label gaji yang jelas, ambil pemasukan dengan nominal paling besar
    const bestIncome = incomes.length ? incomes.reduce((prev, curr) => (Number(prev.amount) > Number(curr.amount) ? prev : curr)) : null;

    // Mencari Pengeluaran Terbesar (Mencegah Crash jika data kosong)
    const biggestExpense = expenses.length ? expenses.reduce((prev, curr) => (Number(prev.amount) > Number(curr.amount) ? prev : curr)) : null;

    // Menghitung Kategori Paling Boros
    const catTotals = expenses.reduce((acc, tx) => {
        const cat = tx.category || "Lainnya";
        acc[cat] = (acc[cat] || 0) + (Number(tx.amount) || 0);
        return acc;
    }, {} as Record<string, number>);
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

    // Menganalisis Kebiasaan Hari
    const dayTotals = expenses.reduce((acc, tx) => {
        const date = new Date(tx.date);
        const day = date.toLocaleDateString("id-ID", { weekday: "long" }); // Menghasilkan "Senin", "Selasa", dll
        acc[day] = (acc[day] || 0) + (Number(tx.amount) || 0);
        return acc;
    }, {} as Record<string, number>);
    const topDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];

    // Membuat Kesimpulan Unik
    let message = "Arus kas kamu terlihat cukup stabil bulan ini. Pertahankan!";
    if (totalExpense > totalIncome && totalIncome > 0) {
        message = "Ups! Pengeluaranmu lebih besar dari pemasukan bulan ini. Yuk rem sedikit belanjanya!";
    } else if (totalIncome > 0 && totalExpense <= (totalIncome * 0.4)) {
        message = "Luar biasa! Kamu super hemat bulan ini, sisa uangmu lebih dari 60%. Jangan lupa ditabung ya!";
    } else if (biggestExpense && biggestExpense.amount > (totalExpense * 0.5)) {
        message = "Wow, satu transaksimu menghabiskan lebih dari setengah total pengeluaran bulan ini!";
    }

    return {
        totalExpense,
        totalIncome,
        totalSalary: totalSalary > 0 ? totalSalary : (bestIncome ? Number(bestIncome.amount) : 0),
        bestIncomeName: totalSalary > 0 ? "Total Gaji/Salary" : (bestIncome ? bestIncome.source : "-"),
        biggestExpense,
        topCat,
        topDay,
        message
    };
  }, [txs, selectedMonth]);

  // Merapikan nama bulan (contoh: "2026-06" -> "Juni 2026")
  const formatMonthLabel = (yyyymm: string) => {
    if (!yyyymm) return "";
    const [y, m] = yyyymm.split("-");
    const date = new Date(Number(y), Number(m) - 1);
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  return (
    <AppShell>
      <Panel title="Insight Bulanan 💡">
        {months.length === 0 ? (
          <EmptyNote>Belum ada data transaksi untuk dianalisis.</EmptyNote>
        ) : (
          <div className="space-y-4">
            <SelectInput 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {months.map(m => (
                <option key={m} value={m}>{formatMonthLabel(m)}</option>
              ))}
            </SelectInput>

            {insights && (
              <div className="space-y-3 mt-4">
                {/* Ringkasan Atas */}
                <div className="flex justify-between rounded-md bg-ink/5 p-3 text-sm">
                  <div className="text-center w-1/2 border-r border-ink/10">
                    <p className="text-ink/60">Pemasukan</p>
                    <p className="font-bold text-emerald-600">{formatIDR(insights.totalIncome)}</p>
                  </div>
                  <div className="text-center w-1/2">
                    <p className="text-ink/60">Pengeluaran</p>
                    <p className="font-bold text-primary">{formatIDR(insights.totalExpense)}</p>
                  </div>
                </div>

                {/* Card Insight 1: Pendapatan Terbesar */}
                {insights.totalIncome > 0 && (
                  <div className="flex items-start gap-3 rounded-md border border-ink/10 p-3 shadow-sm bg-card">
                    <div className="rounded-full bg-emerald-100 p-2 text-emerald-600 shrink-0">
                      <Wallet className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] tracking-widest font-bold text-ink/50 uppercase">PENDAPATAN UTAMA</p>
                      <p className="text-sm font-bold truncate">{insights.bestIncomeName}</p>
                      <p className="text-lg font-black text-emerald-600">{formatIDR(insights.totalSalary)}</p>
                    </div>
                  </div>
                )}

                {/* Card Insight 2: Pengeluaran Terbesar */}
                {insights.biggestExpense && (
                  <div className="flex items-start gap-3 rounded-md border border-ink/10 p-3 shadow-sm bg-card">
                    <div className="rounded-full bg-primary/10 p-2 text-primary shrink-0">
                      <Flame className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] tracking-widest font-bold text-ink/50 uppercase">PENGELUARAN TERBESAR</p>
                      <p className="text-sm font-bold truncate">{insights.biggestExpense.note || "Tanpa Catatan"} ({insights.biggestExpense.category})</p>
                      <p className="text-lg font-black text-primary">{formatIDR(insights.biggestExpense.amount)}</p>
                    </div>
                  </div>
                )}

                {/* Card Insight 3: Kategori Terboros */}
                {insights.topCat && (
                  <div className="flex items-start gap-3 rounded-md border border-ink/10 p-3 shadow-sm bg-card">
                    <div className="rounded-full bg-orange-100 p-2 text-orange-600 shrink-0">
                      <TrendingDown className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] tracking-widest font-bold text-ink/50 uppercase">KATEGORI PALING BOROS</p>
                      <p className="text-sm font-bold truncate">{insights.topCat[0]}</p>
                      <p className="text-lg font-black text-orange-600">{formatIDR(insights.topCat[1])}</p>
                    </div>
                  </div>
                )}

                {/* Card Insight 4: Fakta Unik Hari */}
                {insights.topDay && (
                  <div className="flex items-start gap-3 rounded-md border border-ink/10 p-3 shadow-sm bg-card">
                    <div className="rounded-full bg-blue-100 p-2 text-blue-600 shrink-0">
                      <CalendarDays className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] tracking-widest font-bold text-ink/50 uppercase">FAKTA UNIK</p>
                      <p className="text-xs leading-snug mt-1 text-ink/80">
                        Bulan ini kamu paling sering menghabiskan uang di hari <strong className="text-blue-700">{insights.topDay[0]}</strong> dengan total <strong className="text-ink">{formatIDR(insights.topDay[1])}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Pesan Kesimpulan */}
                <div className="mt-5 flex items-start gap-3 rounded-md bg-yellow-50 p-3 text-yellow-800 border border-yellow-200">
                  <Lightbulb className="size-6 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium leading-relaxed">{insights.message}</p>
                </div>

              </div>
            )}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}