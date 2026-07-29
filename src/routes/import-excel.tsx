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
    
    const lines = text.split('\n');
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

    lines.forEach(line => {
      const cols = line.split('\t');
      if (cols.length < 13) return; // Skip baris yang tidak lengkap
      
      const dateVal = cols[1]?.trim();
      if (!dateVal || dateVal.toLowerCase() === 'date') return; // Skip header
      
      // Standarisasi format tanggal
      let dateStr = dateVal.split(' ')[0];
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts[2]?.length === 4) { // DD/MM/YYYY -> YYYY-MM-DD
          dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      
      const amount = parseFloat(cols[2]) || 0;
      if (amount <= 0) return;
      
      const transType = (cols[3] || "").trim().toLowerCase();
      const note = (cols[12] || "").trim();
      
      // Logika khusus Expense & Debt
      if (transType === 'expense' || transType === 'debt') {
         const accName = cols[6] ? cols[6].trim() : (cols[8] ? cols[8].trim() : "");
         const catName = cols[7] ? cols[7].trim() : (cols[9] ? cols[9].trim() : "");
         
         // Jika kategorinya "Nalangin", jadikan piutang
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
      // Logika khusus Income
      else if (transType === 'income') {
         const accName = (cols[4] || "").trim();
         const source = (cols[5] || "").trim();
         
         // Jika sumbernya "Payback", jadikan pembayaran utang
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
      // Logika Transfer
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

    if (confirm(`Ditemukan ${accounts.length} akun, ${transactions.length} transaksi, dan ${debts.length} catatan utang/piutang. Proses sekarang?`)) {
       replaceAll({ accounts, transactions, debts });
       setMsg(`Berhasil! Data telah tersimpan.`);
       setTimeout(() => navigate({ to: "/" }), 1500);
    }
  }

  return (
    <AppShell>
      <Panel title="Rahasia: Import Excel">
        <p className="text-sm text-ink/70 mb-4">
          Buka sheet <strong>"Form Responses 1"</strong> di Excel-mu, blok semua datanya (dari ujung kiri atas sampai kanan bawah), lalu Copy (Ctrl+C), dan Paste (Ctrl+V) di kotak bawah ini.
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full h-48 p-2 border-2 border-ink/20 rounded-md mb-4 text-xs font-mono bg-background text-ink outline-none focus:border-primary"
          placeholder="Paste data dari Excel di sini..."
        />
        <PrimaryButton onClick={processExcel}>
          Proses & Simpan ke Aplikasi
        </PrimaryButton>
        {msg && <p className="hand mt-3 text-xl text-primary">{msg}</p>}
      </Panel>
    </AppShell>
  );
}