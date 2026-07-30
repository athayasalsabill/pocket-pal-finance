import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { TxRow } from "@/components/finance/TxRow";
import { GhostButton } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";
// KITA HAPUS import accountBalance dan accountTransactions dari sini!
import { ACCOUNT_TYPE_LABEL, formatIDR } from "@/lib/finance";
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
  
  // SISTEM KEBAL TOTAL: Kita hitung saldo & daftar secara manual!
  const { safeTxs, safeBalance, safeData } = useMemo(() => {
    const rawTxs = data.transactions || [];
    
    // 1. Saring transaksi khusus untuk akun ini saja
    const accountTxs = rawTxs.filter(
      (tx) => tx && (tx.accountId === accountId || tx.toAccountId === accountId)
    );

    // 2. Hitung saldo secara manual & aman
    let balance = Number(account?.initialBalance) || 0;
    
    const cleanedTxs = accountTxs.map(tx => {
        // Amankan nilai uang agar tidak NaN
        const amt = Number(tx.amount) || 0;
        
        // Kalkulasi ke saldo
        if (tx.type === "income" && tx.accountId === accountId) {
            balance += amt;
        } else if (tx.type === "expense" && tx.accountId === accountId) {
            balance -= amt;
        } else if (tx.type === "transfer") {
            if (tx.accountId === accountId) balance -= amt;
            if (tx.toAccountId === accountId) balance += amt;
        }

        // Amankan bentuk transaksinya agar komponen TxRow tidak meledak
        return {
            ...tx,
            id: tx.id || crypto.randomUUID(),
            type: tx.type || "expense",
            amount: amt,
            date: tx.date || "2000-01-01",
            category: tx.category || "Lainnya",
            source: tx.source || "Lainnya",
            note: tx.note || ""
        };
    });

    // Urutkan transaksi dari yang paling baru
    cleanedTxs.sort((a, b) => b.date.localeCompare(a.date));

    // Siapkan safeData untuk dilempar ke TxRow (agar tidak merusak fungsi dalam)
    const validData = { ...data, transactions: rawTxs.filter(tx => !!tx) };

    return { 
      safeTxs: cleanedTxs, 
      safeBalance: Math.round(balance), 
      safeData: validData 
    };
  }, [data, accountId, account]);

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
  
  // Pengaman tipe akun (E-Wallet, Bank, dsb)
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
          {formatIDR(safeBalance)}
        </p>
      </Panel>
      
      <Panel title="riwayat akun ini">
        {safeTxs.length === 0 ? (
          <EmptyNote>Belum ada transaksi di akun ini.</EmptyNote>
        ) : (
          safeTxs.map((tx) => (
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