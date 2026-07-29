import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { TxRow } from "@/components/finance/TxRow";
import { TextInput, SelectInput } from "@/components/finance/fields"; 
import { useFinance } from "@/lib/finance-store";
import { monthKey, monthLabel, EXPENSE_CATEGORIES } from "@/lib/finance";
import { ChevronDown, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { data, deleteTransaction } = useFinance();
  
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchDate, setSearchDate] = useState("");
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  // 1. DATA SAFEGUARD (SISTEM ANTI-CRASH)
  // Menyediakan akun bayangan agar aplikasi tidak crash jika ada ID Akun yang hilang/dihapus
  const safeData = useMemo(() => {
    return {
      ...data,
      accounts: [
        ...(data.accounts || []),
        { id: "", name: "Akun Tidak Diketahui", type: "cash" as const, initialBalance: 0 }
      ]
    };
  }, [data]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof data.transactions>();
    
    // Pastikan data.transactions ada, jika tidak jadikan array kosong
    const rawTxs = data.transactions || [];
    
    const filteredTransactions = rawTxs.filter((tx) => {
      if (!tx) return false;
      
      const safeTxDate = tx.date || "";
      const safeTxType = tx.type || "";
      const safeTxCat = tx.category || "";
      const safeTxSrc = tx.source || "";
      
      if (filterType !== "all" && safeTxType !== filterType) return false;
      if (filterType === "expense" && filterCategory !== "all" && safeTxCat !== filterCategory) return false;
      if (searchDate && !safeTxDate.startsWith(searchDate)) return false;
      
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const noteStr = (tx.note || "").toLowerCase();
        const catStr = safeTxCat.toLowerCase();
        const srcStr = safeTxSrc.toLowerCase();
        const amountStr = String(tx.amount || 0);
        
        if (!noteStr.includes(kw) && !catStr.includes(kw) && !srcStr.includes(kw) && !amountStr.includes(kw)) {
          return false;
        }
      }
      return true;
    });

    // Urutkan dan kelompokkan secara aman
    [...filteredTransactions].sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      return dateB.localeCompare(dateA);
    }).forEach((tx) => {
      // Pengecekan agar fungsi pemisah bulan tidak crash saat tanggal rusak
      const dateVal = tx.date && tx.date.length >= 7 ? tx.date : "2000-01-01";
      try {
        const key = monthKey(dateVal);
        map.set(key, [...(map.get(key) ?? []), tx]);
      } catch (e) {
        const fallbackKey = "Unknown";
        map.set(fallbackKey, [...(map.get(fallbackKey) ?? []), tx]);
      }
    });
    
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data.transactions, filterType, filterCategory, searchDate, searchKeyword]);

  // Penambal nama bulan agar tidak rusak
  const safeMonthLabel = (key: string) => {
    if (key === "Unknown") return "Tanggal Tidak Valid";
    try {
      return monthLabel(key);
    } catch (e) {
      return key;
    }
  };

  return (
    <AppShell>
      <Panel title="history">
        
        <div className="mb-5 space-y-2 rounded-md border-2 border-ink/20 bg-card p-3 shadow-sm">
          <TextInput
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Cari catatan, kategori, nominal..."
          />
          <SelectInput value={filterType} onChange={(e) => {
             setFilterType(e.target.value);
             setFilterCategory("all");
          }}>
            <option value="all">Semua Jenis Transaksi</option>
            <option value="expense">Pengeluaran (Expense)</option>
            <option value="income">Pemasukan (Income)</option>
            <option value="transfer">Transfer</option>
            <option value="debt_payment">Pembayaran Utang</option>
          </SelectInput>
          {filterType === "expense" && (
            <SelectInput value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">Semua Kategori</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </SelectInput>
          )}
          <TextInput
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            placeholder="Cari Tanggal..."
          />
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
                  <span className="hand flex-1 text-xl text-ink">{safeMonthLabel(key)}</span>
                  <span className="text-xs text-muted-foreground">{txs.length} transaksi</span>
                </button>
                {isOpen && (
                  <div className="px-1 mt-1">
                    {txs.map((tx) => {
                      // Tambalan agar komponen list per-barisnya kebal terhadap data kosong
                      const patchedTx = {
                        ...tx,
                        date: tx.date || "2000-01-01",
                        category: tx.category || "Lainnya",
                        source: tx.source || "Lainnya",
                      };
                      return (
                        <TxRow key={tx.id} tx={patchedTx} data={safeData} onDelete={deleteTransaction} />
                      );
                    })}
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