import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { Field, TextInput, SelectInput, PrimaryButton, GhostButton } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";
import {
  debtPaid,
  debtRemaining,
  formatDate,
  formatIDR,
  todayISO,
  type Debt,
} from "@/lib/finance";
export const Route = createFileRoute("/debts")({
  head: () => ({
    meta: [
      { title: "Utang & Piutang | Duit & Catatan" },
      {
        name: "description",
        content:
          "Pantau siapa yang kamu utangi dan siapa yang berutang ke kamu, lengkap dengan progress pelunasan.",
      },
      { property: "og:title", content: "Utang & Piutang | Duit & Catatan" },
      { property: "og:description", content: "Progress pelunasan utang dan piutang kamu." },
    ],
  }),
  component: DebtsPage,
});
function DebtsPage() {
  const { data } = useFinance();
  const owe = data.debts.filter((d) => d.direction === "owe");
  const owed = data.debts.filter((d) => d.direction === "owed");
  return (
    <AppShell>
      <Panel title="aku berutang ke" className="mb-4">
        {owe.length === 0 ? (
          <EmptyNote>Bebas utang! 🎉</EmptyNote>
        ) : (
          owe.map((d) => <DebtCard key={d.id} debt={d} />)
        )}
      </Panel>
      <Panel title="mereka berutang ke aku">
        {owed.length === 0 ? (
          <EmptyNote>Belum ada piutang.</EmptyNote>
        ) : (
          owed.map((d) => <DebtCard key={d.id} debt={d} />)
        )}
      </Panel>
    </AppShell>
  );
}
function DebtCard({ debt }: { debt: Debt }) {
  const { data, recordPayment, deleteDebt } = useFinance();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [accountId, setAccountId] = useState(debt.accountId ?? data.accounts[0]?.id ?? "");
  const paid = debtPaid(debt.id, data);
  const remaining = debtRemaining(debt, data);
  const pct = debt.amount > 0 ? Math.min(100, Math.round((paid / debt.amount) * 100)) : 0;
  const done = remaining === 0;
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0 || !accountId) return;
    recordPayment(debt.id, Math.min(value, remaining), accountId, date);
    setAmount("");
    setOpen(false);
  }
  return (
    <div className="mb-3 rounded-md border-2 border-ink/15 bg-background p-3 last:mb-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="hand text-xl text-ink">{debt.person}</p>
        <p className="text-sm font-bold text-primary">{formatIDR(remaining)}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        {formatDate(debt.date)} · total {formatIDR(debt.amount)}
        {debt.note ? ` · ${debt.note}` : ""}
      </p>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full border-2 border-ink/20 bg-card">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatIDR(paid)} terbayar · {pct}%
      </p>
      {open ? (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <Field label="jumlah bayar (Rp)">
            <TextInput
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              required
            />
          </Field>
          <Field label="akun">
            <SelectInput value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {data.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="tanggal">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <PrimaryButton type="submit">simpan</PrimaryButton>
            <GhostButton type="button" onClick={() => setOpen(false)}>
              batal
            </GhostButton>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex gap-2">
          {!done && data.accounts.length > 0 && (
            <GhostButton type="button" onClick={() => setOpen(true)} className="flex-1">
              record payment
            </GhostButton>
          )}
          {done && <span className="hand flex-1 text-lg text-emerald-700">lunas ✔</span>}
          <GhostButton
            type="button"
            className="border-primary/50 text-primary"
            onClick={() => {
              if (confirm(`Hapus catatan dengan ${debt.person}?`)) deleteDebt(debt.id);
            }}
          >
            hapus
          </GhostButton>
        </div>
      )}
    </div>
  );
}