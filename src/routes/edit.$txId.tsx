import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { PrimaryButton, GhostButton, TextInput, SelectInput } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";
import { ArrowLeft } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/lib/finance";

export const Route = createFileRoute("/edit/$txId")({
  component: EditTxPage,
});

function EditTxPage() {
  const { txId } = Route.useParams();
  const { data, replaceAll, deleteTransaction } = useFinance();

  // Cari transaksi yang sedang diklik
  const tx = useMemo(() => data.transactions?.find((t) => t.id === txId), [data, txId]);

  // Siapkan kolom isian (State)
  const [amount, setAmount] = useState(tx?.amount?.toString() || "0");
  const [date, setDate] = useState(tx?.date || "");
  const [note, setNote] = useState(tx?.note || "");
  const [category, setCategory] = useState(tx?.category || "");
  const [source, setSource] = useState(tx?.source || "");
  const [accountId, setAccountId] = useState(tx?.accountId || "");

  if (!tx) {
    return (
      <AppShell>
        <Panel>
          <EmptyNote>Transaksi tidak ditemukan.</EmptyNote>
          <GhostButton onClick={() => history.back()} className="mt-4 w-full">Kembali</GhostButton>
        </Panel>
      </AppShell>
    );
  }

  const handleSave = () => {
    const numAmount = Number(amount);
    if (numAmount <= 0) {
      alert("Nominal harus lebih dari 0");
      return;
    }

    // Timpa transaksi lama dengan data yang baru
    const updatedTx = {
      ...tx,
      amount: numAmount,
      date,
      note,
      accountId,
      ...(tx.type === "expense" ? { category } : {}),
      ...(tx.type === "income" ? { source } : {})
    };

    // Simpan ke database dengan aman
    const newTxs = data.transactions.map((t) => t.id === tx.id ? updatedTx : t);
    replaceAll({ ...data, transactions: newTxs });
    
    // Langsung pulang ke halaman sebelumnya
    history.back();
  };

  return (
    <AppShell>
      <button onClick={() => history.back()} className="hand mb-2 inline-flex items-center gap-1 text-lg text-ink/70">
        <ArrowLeft className="size-4" /> kembali
      </button>
      
      <Panel title="Edit Detail Transaksi">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Nominal (Rp)</label>
            <TextInput 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
            />
          </div>
          
          <div>
            <label className="mb-1 block text-sm font-semibold">Tanggal</label>
            <TextInput 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Dompet / Akun</label>
            <SelectInput value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Pilih Akun...</option>
              {data.accounts?.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </SelectInput>
          </div>
          
          {tx.type === "expense" && (
            <div>
              <label className="mb-1 block text-sm font-semibold">Kategori</label>
              <SelectInput value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Pilih Kategori...</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </SelectInput>
            </div>
          )}

          {tx.type === "income" && (
            <div>
              <label className="mb-1 block text-sm font-semibold">Sumber Pemasukan</label>
              <TextInput 
                type="text" 
                value={source} 
                onChange={(e) => setSource(e.target.value)} 
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-semibold">Catatan</label>
            <TextInput 
              type="text" 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
            />
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <PrimaryButton onClick={handleSave}>Simpan Perubahan</PrimaryButton>
            <GhostButton 
              onClick={() => {
                if (confirm("Yakin ingin menghapus transaksi ini permanen?")) {
                  deleteTransaction(tx.id);
                  history.back();
                }
              }} 
              className="text-primary border-primary/20 hover:bg-red-50"
            >
              Hapus Transaksi
            </GhostButton>
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}