import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { TxRow } from "@/components/finance/TxRow";
// Import field UI yang dibutuhkan
import { TextInput, SelectInput } from "@/components/finance/fields"; 
import { useFinance } from "@/lib/finance-store";
// Import EXPENSE_CATEGORIES untuk filter
import { monthKey, monthLabel, sortByDateDesc, EXPENSE_CATEGORIES } from "@/lib/finance";
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
  
  // State untuk Filter & Pencarian
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchDate, setSearchDate] = useState("");
  
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const map = new Map<string, typeof data.transactions>();
    
    // --- FITUR BARU: Logika Penyaringan (Filtering & Search) ---
    const filteredTransactions = data.transactions.filter((tx) => {
      // 1. Filter Jenis Transaksi
      if (filterType !== "all" && tx.type !== filterType) return false;
      // 2. Filter Kategori (Khusus Expense)
      if (filterType === "expense" && filterCategory !== "all" && tx.category !== filterCategory) return false;
      // 3. Filter Tanggal
      if (searchDate && !tx.date.startsWith(searchDate)) return false;
      
      // 4. Filter Kata Kunci (Mencari di catatan, kategori, sumber, atau nominal)
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const noteStr = (tx.note || "").toLowerCase();
        const catStr = (tx.category || "").toLowerCase();
        const srcStr = (tx.source || "").toLowerCase();
        const amountStr = String(tx.amount);
        
        if (!noteStr.includes(kw) && !catStr.includes(kw) && !srcStr.includes(kw) && !amountStr.includes(kw)) {
          return false;
        }
      }
      
      return true;
    });

    [...filteredTransactions].sort(sortByDateDesc).forEach((tx) => {
      const key = monthKey(tx.date);
      map.set(key, [...(map.get(key) ?? []), tx]);
    });
    
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data.transactions, filterType, filterCategory, searchDate, searchKeyword]);

  return (
    <AppShell>
      <Panel title="history">
        
        {/* --- UI FILTER & SEARCH --- */}
        <div className="mb-5 space-y-2 rounded-md border-2 border-ink/20 bg-card p-3 shadow-sm">
          
          {/* Input Kata Kunci */}
          <TextInput
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Cari catatan, kategori, nominal..."
          />

          {/* Filter Tipe Transaksi */}
          <SelectInput value={filterType} onChange={(e) => {
             setFilterType(e.target.value);
             setFilterCategory("all"); // reset kategori jika jenis berubah
          }}>
            <option value="all">Semua Jenis Transaksi</option>
            <option value="expense">Pengeluaran (Expense)</option>
            <option value="income">Pemasukan (Income)</option>
            <option value="transfer">Transfer</option>
            <option value="debt_payment">Pembayaran Utang</option>
          </SelectInput>

          {/* Filter Kategori (Muncul jika pilih pengeluaran) */}
          {filterType === "expense" && (
            <SelectInput value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">Semua Kategori</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </SelectInput>
          )}

          {/* Filter Tanggal */}
          <TextInput
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            placeholder="Cari Tanggal..."
          />
          
          {/* Tombol Reset jika ada filter aktif */}
          {(filterType !== "all" || searchDate !== "" || searchKeyword !== "") && (
            <div className="pt-1 text-right">
              <button 
                onClick={() => { 
                  setFilterType("all"); 
                  setFilterCategory("all"); 
                  setSearchDate(""); 
                  setSearchKeyword(""); 
                }}
                className="hand text-base text-ink/70 hover:text-ink underline transition-colors"
              >
                reset filter
              </button>
            </div>
          )}
        </div>

        {/* --- DAFTAR TRANSAKSI --- */}
        {groups.length === 0 ? (
          <EmptyNote>Tidak ada transaksi yang cocok.</EmptyNote>
        ) : (
          groups.map(([key, txs]) => {
            const isOpen = !closed[key];
            return (
              <div key={key} className="mb-3 last:mb-0">
                <button
                  onClick={() => setClosed((c) => ({ ...c, [key]: isOpen }))}
                  className="flex w-full items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-left transition-colors hover:bg-ink/5"
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
                  <div className="px-1 mt-1">
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