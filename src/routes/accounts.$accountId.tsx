import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { TxRow } from "@/components/finance/TxRow";
import { GhostButton } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";
import { ACCOUNT_TYPE_LABEL, accountBalance, accountTransactions, formatIDR } from "@/lib/finance";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/accounts/$accountId")({
  head: () => ({
    meta: [{ title: "Riwayat Akun | Duit & Catatan" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { accountId } = Route.useParams();
  const { data, deleteAccount, deleteTransaction } = useFinance();
  
  const account = data.accounts?.find((a) => a.id === accountId);
  
  // 1. SISTEM PERTAHANAN SUPER: Memperbaiki semua relasi dan angka cacat sebelum dihitung
  const safeData = useMemo(() => {
    // A. Buat jaring pengaman untuk akun
    const safeAccounts = [
      ...(data.accounts || []),
      { id: "fallback-id", name: "Akun Dihapus/Tidak Diketahui", type: "cash" as const, initialBalance: 0 }
    ];
    
    const validAccountIds = new Set(safeAccounts.map(a => a.id));

    // B. Tambal SEMUA transaksi yang rusak/bolong
    const safeTransactions = (data.transactions || [])
      .filter(tx => !!tx) // buang data yg benar-benar null
      .map(tx => {
        // Jika akunnya tidak ada di database, arahkan ke akun fallback
        const accId = validAccountIds.has(tx.accountId) ? tx.accountId : "fallback-id";
        const toAccId = tx.toAccountId && validAccountIds.has(tx.toAccountId) ? tx.toAccountId : "fallback-id";
        
        return {
          ...tx,
          id: tx.id || crypto.randomUUID(),
          type: tx.type || "expense",
          amount: Number(tx.amount) || 0, // Paksa jadi angka, cegah NaN
          date: tx.date || "2000-01-01",
          accountId: accId,
          toAccountId: tx.type === "transfer" ? toAccId : undefined,
          category: tx.category || "Lainnya",
          source: tx.source || "Lainnya",
          note: tx.note || ""
        };
      });

    return {
      ...data,
      accounts: safeAccounts,
      transactions: safeTransactions
    };
  }, [data]);

  if (!account) {
    return (
      <AppShell>
        <Panel>
          <EmptyNote>Akun tidak ditemukan.</EmptyNote>
          <Link to="/" className="hand block text-center text-lg text-primary underline">
            kembali ke home
          </Link>
        </Panel>
      </AppShell>
    );
  }
  
  // 2. Sekarang kita gunakan safeData untuk menghitung semuanya dengan aman
  const txs = accountTransactions(account.id, safeData);
  
  // Mencegah crash jika tipe akun tidak dikenali
  // @ts-ignore
  const typeLabel = ACCOUNT_TYPE_LABEL[account.type] || "Dompet/Bank"; 
  
  return (
    <AppShell>
      <Link to="/" className="hand mb-2 inline-flex items-center gap-1 text-lg text-ink/70">
        <ArrowLeft className="size-4" /> home
      </Link>
      
      <Panel className="mb-4 text-center">
        <p className="hand text-2xl text-ink">{account.name}</p>
        <p className="text-xs text-muted-foreground">{typeLabel}</p>
        <p className="mt-2 text-3xl font-extrabold text-primary">
          {formatIDR(accountBalance(account, safeData) || 0)}
        </p>
      </Panel>
      
      <Panel title="riwayat akun ini">
        {txs.length === 0 ? (
          <EmptyNote>Belum ada transaksi di akun ini.</EmptyNote>
        ) : (
          txs.map((tx) => (
            <TxRow key={tx.id} tx={tx} data={safeData} onDelete={deleteTransaction} />
          ))
        )}
        <GhostButton
          type="button"
          className="mt-4 w-full border-primary/60 text-primary hover:bg-red-50"
          onClick={() => {
            if (confirm(`Hapus akun "${account.name}" beserta transaksinya?`)) {
              deleteAccount(account.id);
              history.back();
            }
          }}
        >
          hapus akun
        </GhostButton>
      </Panel>
    </AppShell>
  );
}