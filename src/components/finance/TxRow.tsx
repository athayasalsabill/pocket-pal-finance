import { formatDate, formatIDR, txLabel, txSign, type FinanceData, type Transaction } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
export function TxRow({
  tx,
  data,
  onDelete,
}: {
  tx: Transaction;
  data: FinanceData;
  onDelete?: (id: string) => void;
}) {
  const sign = txSign(tx, data);
  const account = data.accounts.find((a) => a.id === tx.accountId);
  return (
    <div className="flex items-center gap-3 border-b border-ink/10 py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{txLabel(tx, data)}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDate(tx.date)}
          {account ? ` · ${account.name}` : ""}
          {tx.note ? ` · ${tx.note}` : ""}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-bold",
          sign > 0 ? "text-emerald-700" : sign < 0 ? "text-primary" : "text-muted-foreground",
        )}
      >
        {sign > 0 ? "+" : sign < 0 ? "-" : ""}
        {formatIDR(tx.amount).replace("-", "")}
      </span>
      {onDelete ? (
        <button
          onClick={() => onDelete(tx.id)}
          aria-label="Hapus transaksi"
          className="shrink-0 rounded p-1 text-ink/40 hover:text-primary"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
    </div>
  );
}