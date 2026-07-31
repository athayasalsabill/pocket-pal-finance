import { formatDate, formatIDR, txLabel, txSign, type FinanceData, type Transaction } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function TxRow({
  tx,
  data,
  onDelete,
}: {
  tx: Transaction;
  data: FinanceData;
  onDelete?: (id: string) => void;
}) {
  const navigate = useNavigate();

  if (!tx) return null;

  const safeTx: Transaction = {
    ...tx,
    amount: Number(tx.amount) || 0,
    type: tx.type || "expense",
    date: tx.date || "2000-01-01",
    accountId: tx.accountId || "unknown",
  };

  let sign = -1;
  let label = "Transaksi";
  try {
    sign = txSign(safeTx, data);
    label = txLabel(safeTx, data);
  } catch (e) {
    sign = safeTx.type === "income" ? 1 : safeTx.type === "transfer" ? 0 : -1;
    label = "Transaksi Tidak Dikenal";
  }

  const account = data.accounts?.find((a) => a.id === safeTx.accountId);

  return (
    <div className="flex items-center gap-3 border-b border-ink/10 py-2 last:border-b-0">
      {/* Bagian kiri yang sekarang bisa diklik */}
      <div 
        className="min-w-0 flex-1 cursor-pointer hover:opacity-60 transition-opacity"
        onClick={() => navigate({ to: `/transaction/${safeTx.id}` as any })}
      >
        <p className="truncate text-sm font-semibold text-ink">{label}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDate(safeTx.date)}
          {account ? ` · ${account.name}` : ""}
          {safeTx.note ? ` · ${safeTx.note}` : ""}
        </p>
      </div>
      
      {/* Nominal */}
      <span
        className={cn(
          "shrink-0 text-sm font-bold",
          sign > 0 ? "text-emerald-700" : sign < 0 ? "text-primary" : "text-muted-foreground",
        )}
      >
        {sign > 0 ? "+" : sign < 0 ? "-" : ""}
        {formatIDR(safeTx.amount).replace("-", "")}
      </span>
      
      {/* Tombol Hapus Bawaan */}
      {onDelete ? (
        <button
          onClick={() => onDelete(safeTx.id)}
          aria-label="Hapus transaksi"
          className="shrink-0 rounded p-1 text-ink/40 hover:text-primary transition-colors"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
    </div>
  );
}