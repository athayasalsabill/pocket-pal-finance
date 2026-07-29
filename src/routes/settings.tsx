import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel } from "@/components/finance/Panel";
import { Field, TextInput, SelectInput, GhostButton, PrimaryButton } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";
import { emptyData, normalize, todayISO, type AccountType } from "@/lib/finance";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Backup & Pengaturan | Duit & Catatan" },
      {
        name: "description",
        content:
          "Export semua data keuangan, kelola akun, atau import kembali saat pindah HP.",
      },
      { property: "og:title", content: "Backup & Pengaturan | Duit & Catatan" },
      { property: "og:description", content: "Export dan import backup data keuangan kamu." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, replaceAll, addAccount } = useFinance();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  
  // State untuk form Tambah Akun
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("cash");
  const [initial, setInitial] = useState("");

  // Submit Tambah Akun
  function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addAccount({ name: name.trim(), type, initialBalance: Number(initial) || 0 });
    setName("");
    setInitial("");
    setOpen(false);
    setMsg("Akun baru berhasil ditambahkan.");
  }

  // Export ke JSON
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-duit-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Backup JSON berhasil diunduh.");
  }

  // --- FITUR BARU: Export ke CSV ---
  function exportCSV() {
    const transactions = data.transactions;
    if (transactions.length === 0) {
      setMsg("Tidak ada transaksi untuk diekspor.");
      return;
    }

    // Membuat header CSV
    let csvContent = "ID,Tanggal,Tipe,Jumlah (Rp),Dari Akun,Ke Akun,Kategori/Sumber,Catatan\n";

    // Mengisi baris data
    transactions.forEach(tx => {
      // Mencari nama akun dari ID-nya
      const fromAccountName = data.accounts.find(a => a.id === tx.accountId)?.name || "Unknown";
      let toAccountName = "";
      if (tx.type === "transfer" && tx.toAccountId) {
         toAccountName = data.accounts.find(a => a.id === tx.toAccountId)?.name || "Unknown";
      }

      // Mengatasi koma di catatan agar tidak merusak format CSV
      const safeNote = tx.note ? `"${tx.note.replace(/"/g, '""')}"` : "";
      
      const categoryOrSource = tx.type === "expense" ? tx.category : tx.type === "income" ? tx.source : "";

      const row = [
        tx.id,
        tx.date,
        tx.type,
        tx.amount,
        fromAccountName,
        toAccountName,
        categoryOrSource,
        safeNote
      ].join(",");

      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transaksi-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Data transaksi berhasil diekspor ke CSV.");
  }

  // Import JSON
  async function importData(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      const next = normalize(parsed);
      if (
        confirm(
          `Import ${next.accounts.length} akun, ${next.transactions.length} transaksi, ${next.debts.length} debt? Data sekarang akan diganti.`
        )
      ) {
        replaceAll(next);
        setMsg("Data berhasil di-import.");
      }
    } catch {
      setMsg("File tidak valid. Pastikan itu file backup .json dari app ini.");
    }
  }

  return (
    <AppShell>
      
      {/* --- PANEL BARU: KELOLA AKUN --- */}
      <Panel title="kelola akun" className="mb-4">
        {open ? (
          <form onSubmit={submitAccount} className="space-y-3 pt-1">
            <Field label="nama akun">
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. BCA / Dompet / GoPay"
                required
              />
            </Field>
            <Field label="tipe">
              <SelectInput value={type} onChange={(e) => setType(e.target.value as AccountType)}>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="ewallet">E-Wallet</option>
              </SelectInput>
            </Field>
            <Field label="saldo awal (Rp)">
              <TextInput
                inputMode="numeric"
                value={initial}
                onChange={(e) => setInitial(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
              />
            </Field>
            <div className="flex gap-2">
              <PrimaryButton type="submit">simpan akun</PrimaryButton>
              <GhostButton type="button" onClick={() => setOpen(false)}>
                batal
              </GhostButton>
            </div>
          </form>
        ) : (
          <GhostButton
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-center gap-1"
          >
            <Plus className="size-4" /> tambah akun
          </GhostButton>
        )}
      </Panel>

      <Panel title="backup data" className="mb-4">
        <p className="text-sm text-muted-foreground">
          Semua data disimpan di HP kamu (localStorage). Simpan backup rutin supaya aman kalau ganti
          HP atau data browser terhapus.
        </p>
        <div className="mt-3 space-y-2">
          
          <PrimaryButton type="button" onClick={exportData}>
            export .json
          </PrimaryButton>
          
          {/* Tombol Export CSV */}
          <PrimaryButton type="button" className="bg-sky text-ink border-ink hover:bg-sky/80" onClick={exportCSV}>
            export transaksi ke .csv
          </PrimaryButton>
          
          <GhostButton type="button" className="w-full" onClick={() => fileRef.current?.click()}>
            import .json
          </GhostButton>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importData(file);
              e.target.value = "";
            }}
          />
        </div>
        {msg ? <p className="hand mt-3 text-lg text-primary">{msg}</p> : null}
      </Panel>
      <Panel title="pasang di homescreen" className="mb-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/80">
          <li>Buka link app ini di Safari (iPhone) atau Chrome (Android).</li>
          <li>Tekan tombol Share / menu titik tiga.</li>
          <li>Pilih "Add to Home Screen".</li>
          <li>Buka dari icon-nya — fullscreen dan tetap jalan tanpa internet.</li>
        </ol>
      </Panel>
      <Panel title="zona bahaya">
        <GhostButton
          type="button"
          className="w-full border-primary text-primary hover:bg-red-50"
          onClick={() => {
            if (confirm("Hapus SEMUA data di HP ini? Tindakan ini tidak bisa dibatalkan.")) {
              replaceAll(emptyData);
              setMsg("Semua data dihapus.");
            }
          }}
        >
          hapus semua data
        </GhostButton>
      </Panel>
    </AppShell>
  );
}