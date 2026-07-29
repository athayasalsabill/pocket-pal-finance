import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel } from "@/components/finance/Panel";
import { PrimaryButton } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";

export const Route = createFileRoute("/import-excel")({
  component: ImportExcelPage,
});

function ImportExcelPage() {
  const { replaceAll } = useFinance();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");

  function processExcel() {
    if (!text.trim()) return;
    
    const lines = text.split(/\r?\n/);
    const newAccounts = new Map();
    const accounts: any[] = [];
    const transactions: any[] = [];
    const debts: any[] = [];

    function getAccountId(name: string) {
      if (!name) return "";
      const trimName = name.trim();
      if (newAccounts.has(trimName)) return newAccounts.get(trimName);
      
      const id = crypto.randomUUID();
      newAccounts.set(trimName, id);
      
      let type = "ewallet";
      const lower = trimName.toLowerCase();
      if (lower.includes("cash")) type = "cash";
      else if (["bank", "mandiri", "bca", "seabank", "blu"].some(k => lower.includes(k))) type = "bank";
      
      accounts.push({ id, name: trimName, type, initialBalance: 0 });
      return id;
    }

    lines.forEach((line) => {
      const cols = line.split('\t');
      
      if (cols.length < 4) return; 
      if (cols[0]?.toLowerCase().includes("timestamp")) return;
      
      // 1. BERSIHKAN TANGGAL
      let dateVal = cols[1]?.trim().split(' ')[0] || ""; 
      if (!dateVal || dateVal.toLowerCase() === 'date') return;
      
      let dateStr = dateVal.replace(/\//g, '-');
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[2].length === 4) { // Jika DD-MM-YYYY
          dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) { // Jika YYYY-MM-DD
          dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
      
      // 2. BERSIHKAN ANGKA (Hapus Rp, spasi, dan titik pemisah ribuan)
      let rawAmount = cols[2] || "0";
      rawAmount = rawAmount.replace(/rp/ig, '').replace(/\s/g, '').replace(/\./g, '');
      rawAmount = rawAmount.replace(/,/g, '.'); // koma desimal jadi titik
      const amount = Number(rawAmount) || 0;
      
      if (amount <= 0) return;
      
      const transType = (cols[3] || "").trim().toLowerCase();
      const note = cols.length > 12 ? (cols[12] || "").trim() : "";
      
      if (transType === 'expense' || transType === 'debt') {
         const accName = cols[6]?.trim() || cols[8]?.trim() || "";
         const catName = cols[7]?.trim() || cols[9]?.trim() || "";
         
         if (catName.toLowerCase() === 'nalangin') {
             debts.push({
                 id: crypto.randomUUID(),
                 direction: "owed",
                 person: note || "Seseorang",
                 amount,
                 date: dateStr,
                 note,
                 accountId: getAccountId(accName)
             });
         } else {
             transactions.push({
                 id: crypto.randomUUID(),
                 type: "expense",
                 amount,
                 date: dateStr,
                 note,
                 accountId: getAccountId(accName),
                 category: catName
             });
         }
      } 
      else if (transType === 'income') {
         const accName = (cols[4] || "").trim();
         const source = (cols[5] || "").trim();
         
         if (source.toLowerCase() === 'payback' || note.toLowerCase().includes('payback')) {
             transactions.push({
                 id: crypto.randomUUID(),
                 type: "debt_payment",
                 amount,
                 date: dateStr,
                 note,
                 accountId: getAccountId(accName)
             });
         } else {
             transactions.push({
                 id: crypto.randomUUID(),
                 type: "income",
                 amount,
                 date: dateStr,
                 note,
                 accountId: getAccountId(accName),
                 source
             });
         }
      } 
      else if (transType === 'transfer') {
         const fromAcc = (cols[10] || "").trim();
         const toAcc = (cols[11] || "").trim();
         
         transactions.push({
             id: crypto.randomUUID(),
             type: "transfer",
             amount,
             date: dateStr,
             note,
             accountId: getAccountId(fromAcc),
             toAccountId: getAccountId(toAcc)
         });
      }
    });

    if (confirm(`Ditemukan ${accounts.length} akun, ${transactions.length} transaksi, dan ${debts.length} catatan piutang/utang. Proses sekarang?`)) {
       replaceAll({ accounts, transactions, debts });
       setMsg(`Berhasil! Data telah tersimpan.`);
       setTimeout(() => navigate({ to: "/" }), 1500);
    }
  }

  return (
    <AppShell>
      <Panel title="Import Excel">
        <p className="text-sm text-ink/70 mb-4">
          Buka sheet <strong>"Form Responses 1"</strong> di Excel, blok semua data dari kiri atas sampai kanan bawah, lalu Copy & Paste ke sini.
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full h-48 p-2 border-2 border-ink/20 rounded-md mb-4 text-xs font-mono bg-background text-ink outline-none focus:border-primary"
          placeholder="Paste data Excel di sini..."
        />
        <PrimaryButton onClick={processExcel}>
          Proses & Simpan ke Aplikasi
        </PrimaryButton>
        {msg && <p className="hand mt-3 text-xl text-primary">{msg}</p>}
      </Panel>
    </AppShell>
  );
}