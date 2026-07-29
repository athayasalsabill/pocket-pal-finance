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
    meta: [
      { title: "Riwayat Akun | Duit & Catatan" },
      {
        name: "description",
        content: "Lihat saldo dan seluruh riwayat transaksi dari satu akun keuangan kamu.",
      },
      { property: "og:title", content: "Riwayat Akun | Duit & Catatan" },
      { property: "og:description", content: "Saldo dan riwayat transaksi per akun." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { accountId } = Route.useParams();
  const { data, deleteAccount, deleteTransaction } = useFinance();
  
  const account = data.accounts.find((a) => a.id === accountId);
  
  // 1. SISTEM ANTI-CRASH: Membuat salinan data yang aman dan menambal data kosong
  const safeData = useMemo(() => {
    return {
      ...data,
      accounts: [
        ...(data.accounts || []),
        { id: "", name: "Akun Tidak Diketahui", type: "cash" as const, initialBalance: 0 }
      ],
      // Filter transaksi yang null/undefined agar fungsi accountTransactions tidak crash
      transactions: (data.transactions || []).filter(tx => tx)
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
  
  // Menggunakan safeData alih-alih data asli
  const txs = accountTransactions(account.id, safeData);
  
  return (
    <AppShell>
      <Link to="/" className="hand mb-2 inline-flex items-center gap-1 text-lg text-ink/70">
        <ArrowLeft className="size-4" /> home
      </Link>
      <Panel className="mb-4 text-center">
        <p className="hand text-2xl text-ink">{account.name}</p>
        <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABEL[account.type]}</p>
        <p className="mt-2 text-3xl font-extrabold text-primary">
          {formatIDR(accountBalance(account, safeData))}
        </p>
      </Panel>
      <Panel title="riwayat akun ini">
        {txs.length === 0 ? (
          <EmptyNote>Belum ada transaksi di akun ini.</EmptyNote>
        ) : (
          txs.map((tx) => {
            // 2. PENAMBALAN DATA: Memberikan nilai default jika ada kolom yang kosong
            const patchedTx = {
              ...tx,
              date: tx.date || "2000-01-01",
              category: tx.category || "Lainnya",
              source: tx.source || "Lainnya",
            };
            
            return <TxRow key={tx.id} tx={patchedTx} data={safeData} onDelete={deleteTransaction} />
          })
        )}
        <GhostButton
          type="button"
          className="mt-4 w-full border-primary/60 text-primary"
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