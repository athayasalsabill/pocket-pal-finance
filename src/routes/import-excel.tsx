import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel } from "@/components/finance/Panel";
import { GhostButton } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";

export const Route = createFileRoute("/import-excel")({
  component: ImportCSVPage,
});

// Fungsi pembaca CSV (tahan banting terhadap koma dan enter di dalam catatan)
function parseCSV(str: string) {
    const result: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let val = '';
    for (let i = 0; i < str.length; i++) {
        let char = str[i];
        if (inQuotes) {
            if (char === '"') {
                if (str[i + 1] === '"') {
                    val += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                val += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(val);
                val = '';
            } else if (char === '\n' || char === '\r') {
                if (char === '\r' && str[i + 1] === '\n') i++; // lewati \n
                row.push(val);
                result.push(row);
                row = [];
                val = '';
            } else {
                val += char;
            }
        }
    }
    if (val || row.length > 0) {
        row.push(val);
        result.push(row);
    }
    return result;
}

function ImportCSVPage() {
  const { replaceAll } = useFinance();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const lines = parseCSV(text);
        
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

        lines.forEach((cols, index) => {
          // Baris pertama (index 0) adalah header, kita lewati. 
          // Jika kolom kurang dari 4, berarti baris kosong/rusak, lewati.
          if (index === 0 || cols.length < 4) return;
          
          let dateVal = (cols[1] || "").trim().split(' ')[0]; 
          if (!dateVal || dateVal.toLowerCase() === 'date') return;
          
          // Standarisasi format tanggal ke YYYY-MM-DD
          let dateStr = dateVal.replace(/\//g, '-');
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            if (parts[2].length === 4) { // Jika format DD-MM-YYYY
              dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else if (parts[0].length === 4) { // Jika format YYYY-MM-DD
              dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
          }
          
          // Bersihkan angka (hapus Rp, hapus titik pemisah ribuan)
          let rawAmount = cols[2] || "0";
          rawAmount = rawAmount.replace(/rp/ig, '').replace(/\s/g, '').replace(/\./g, '');
          rawAmount = rawAmount.replace(/,/g, '.');
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

        if (confirm(`Ditemukan ${accounts.length} akun, ${transactions.length} transaksi, dan ${debts.length} catatan piutang/utang. Simpan ke aplikasi?`)) {
           replaceAll({ accounts, transactions, debts });
           setMsg(`Berhasil! ${transactions.length} transaksi tersimpan.`);
           setTimeout(() => navigate({ to: "/" }), 2000);
        } else {
            setMsg("Dibatalkan.");
        }
    } catch (error) {
        setMsg("Gagal memproses file. Pastikan itu file CSV yang benar.");
        console.error(error);
    }
    
    // Reset file input agar bisa klik file yang sama lagi kalau gagal
    e.target.value = "";
  }

  return (
    <AppShell>
      <Panel title="Import dari CSV">
        <p className="text-sm text-ink/70 mb-4">
          Pilih file CSV yang sudah di-export dari Google Sheets / Excel.
        </p>
        
        <GhostButton 
            type="button" 
            className="w-full bg-primary/10 text-primary border-primary hover:bg-primary/20 h-16" 
            onClick={() => fileRef.current?.click()}
        >
          Pilih File .csv
        </GhostButton>
        
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileUpload}
        />

        {msg && <p className="hand mt-4 text-xl text-center text-primary">{msg}</p>}
      </Panel>
    </AppShell>
  );
}