import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { PrimaryButton, GhostButton } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { formatIDR, formatDate, txLabel, txSign } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transaction/$txId")({
  component: TransactionDetailPage,
});

function TransactionDetailPage() {
  const { txId } = Route.useParams();
  const { data, deleteTransaction } = useFinance();
  const navigate = useNavigate();

  // Cari transaksi beserta akunnya
  const tx = useMemo(() => data.transactions?.find((t) => t.id === txId), [data, txId]);
  const account = useMemo(() => data.accounts?.find(a => a.id === tx?.accountId), [data, tx]);
  const toAccount = useMemo(() => data.accounts?.find(a => a.id === tx?.toAccountId), [data, tx]);

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

  // Data kebal anti-crash
  const safeTx = {
    ...tx,
    amount: Number(tx.amount) || 0,
    type: tx.type || "expense",
    date: tx.date || "2000-01-01",
  };

  let sign = -1;
  let label = "Transaksi";
  try {
    sign = txSign(safeTx, data);
    label = txLabel(safeTx, data);
  } catch (e) {
    sign = safeTx.type === "income" ? 1 : safeTx.type === "transfer" ? 0 : -1;
  }

  return (
    <AppShell>
      {/* Header dengan tombol back dan icon EDIT */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => history.back()} className="hand inline-flex items-center gap-1 text-lg text-ink/70 hover:text-ink">
          <ArrowLeft className="size-4" /> kembali
        </button>
        <button 
          onClick={() => navigate({ to: `/edit/${tx.id}` as any })}
          className="rounded-full p-2 text-ink/70 hover:bg-muted hover:text-primary transition-colors"
          aria-label="Edit Transaksi"
        >
          <Edit className="size-5" />
        </button>
      </div>
      
      {/* Rangkuman Nominal Besar */}
      <Panel className="text-center mb-4">
        <p className="hand text-2xl text-ink">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{formatDate(safeTx.date)}</p>
        <p className={cn(
          "mt-3 text-4xl font-extrabold",
          sign > 0 ? "text-emerald-700" : sign < 0 ? "text-primary" : "text-ink"
        )}>
          {sign > 0 ? "+" : sign < 0 ? "-" : ""}
          {formatIDR(safeTx.amount).replace("-", "")}
        </p>
      </Panel>

      {/* Rincian Struk */}
      <Panel title="Rincian Transaksi">
        <div className="space-y-3 text-sm mt-2">
          <div className="flex justify-between border-b border-ink/10 pb-2">
            <span className="text-ink/60">Jenis Transaksi</span>
            <span className="font-medium capitalize">{safeTx.type.replace("_", " ")}</span>
          </div>
          
          <div className="flex justify-between border-b border-ink/10 pb-2">
            <span className="text-ink/60">Dompet/Akun</span>
            <span className="font-medium text-right">{account?.name || "Tidak Diketahui"}</span>
          </div>

          {safeTx.type === "transfer" && (
            <div className="flex justify-between border-b border-ink/10 pb-2">
              <span className="text-ink/60">Tujuan Transfer</span>
              <span className="font-medium text-right">{toAccount?.name || "Tidak Diketahui"}</span>
            </div>
          )}

          {safeTx.type === "expense" && safeTx.category && (
            <div className="flex justify-between border-b border-ink/10 pb-2">
              <span className="text-ink/60">Kategori</span>
              <span className="font-medium text-right">{safeTx.category}</span>
            </div>
          )}

          {safeTx.type === "income" && safeTx.source && (
            <div className="flex justify-between border-b border-ink/10 pb-2">
              <span className="text-ink/60">Sumber</span>
              <span className="font-medium text-right">{safeTx.source}</span>
            </div>
          )}

          <div className="flex flex-col border-b border-ink/10 pb-2">
            <span className="text-ink/60 mb-1">Catatan</span>
            <span className="font-medium">{safeTx.note || "-"}</span>
          </div>
        </div>

        {/* Tombol Aksi Bawah */}
        <div className="mt-6 flex flex-col gap-2">
          <PrimaryButton onClick={() => navigate({ to: `/edit/${tx.id}` as any })}>
            Edit Transaksi
          </PrimaryButton>
          <GhostButton 
            onClick={() => {
              if (confirm("Yakin ingin menghapus transaksi ini permanen?")) {
                deleteTransaction(tx.id);
                history.back();
              }
            }} 
            className="text-primary border-primary/20 hover:bg-red-50 flex items-center justify-center gap-2"
          >
            <Trash2 className="size-4" /> Hapus Transaksi
          </GhostButton>
        </div>
      </Panel>
    </AppShell>
  );
}