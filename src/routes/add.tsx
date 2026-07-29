import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { Field, TextInput, SelectInput, PrimaryButton } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";
import { EXPENSE_CATEGORIES, INCOME_SOURCES, todayISO } from "@/lib/finance";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/add")({
  head: () => ({
    meta: [
      { title: "Catat Transaksi Baru | Duit & Catatan" },
      {
        name: "description",
        content:
          "Catat pengeluaran, pemasukan, transfer antar akun, atau utang dan piutang langsung dari HP kamu.",
      },
      { property: "og:title", content: "Catat Transaksi Baru | Duit & Catatan" },
      {
        property: "og:description",
        content: "Catat expense, income, transfer, dan debt dalam hitungan detik.",
      },
    ],
  }),
  component: AddPage,
});
type Tab = "expense" | "income" | "transfer" | "debt";
const TABS: { key: Tab; label: string }[] = [
  { key: "expense", label: "expense" },
  { key: "income", label: "income" },
  { key: "transfer", label: "transfer" },
  { key: "debt", label: "debt" },
];
function AddPage() {
  const { data, addTransaction, addDebt } = useFinance();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [source, setSource] = useState(INCOME_SOURCES[0]);
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [direction, setDirection] = useState<"owe" | "owed">("owe");
  const [person, setPerson] = useState("");
  const accounts = data.accounts;
  const from = accountId || accounts[0]?.id || "";
  const to = toAccountId || accounts.find((a) => a.id !== from)?.id || "";
  const value = Number(amount);
  function reset() {
    setAmount("");
    setNote("");
    setPerson("");
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value || value <= 0) return;
    if (tab === "debt") {
      if (!person.trim()) return;
      addDebt({ direction, person: person.trim(), amount: value, date, note, accountId: from });
    } else if (tab === "transfer") {
      if (!from || !to || from === to) return;
      addTransaction({ type: "transfer", amount: value, date, note, accountId: from, toAccountId: to });
    } else if (tab === "expense") {
      if (!from) return;
      addTransaction({ type: "expense", amount: value, date, note, accountId: from, category });
    } else {
      if (!from) return;
      addTransaction({ type: "income", amount: value, date, note, accountId: from, source });
    }
    reset();
    navigate({ to: tab === "debt" ? "/debts" : "/history" });
  }
  return (
    <AppShell>
      <div className="mb-3 grid grid-cols-4 gap-1 rounded-lg border-2 border-ink/20 bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "hand rounded-md py-1.5 text-lg transition-colors",
              tab === t.key ? "bg-primary text-primary-foreground" : "text-ink/60",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Panel>
        {accounts.length === 0 ? (
          <EmptyNote>Tambah akun dulu di halaman Home ya.</EmptyNote>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="jumlah (Rp)">
              <TextInput
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                required
              />
            </Field>
            {tab === "expense" && (
              <Field label="kategori">
                <SelectInput value={category} onChange={(e) => setCategory(e.target.value)}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </SelectInput>
              </Field>
            )}
            {tab === "income" && (
              <Field label="sumber">
                <SelectInput value={source} onChange={(e) => setSource(e.target.value)}>
                  {INCOME_SOURCES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </SelectInput>
              </Field>
            )}
            {tab === "debt" && (
              <>
                <Field label="jenis">
                  <SelectInput
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as "owe" | "owed")}
                  >
                    <option value="owe">Aku berutang (utang)</option>
                    <option value="owed">Orang berutang ke aku (piutang)</option>
                  </SelectInput>
                </Field>
                <Field label="nama orang">
                  <TextInput
                    value={person}
                    onChange={(e) => setPerson(e.target.value)}
                    placeholder="mis. Budi"
                    required
                  />
                </Field>
              </>
            )}
            <Field label={tab === "transfer" ? "dari akun" : "akun"}>
              <SelectInput value={from} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            {tab === "transfer" && (
              <Field label="ke akun">
                <SelectInput value={to} onChange={(e) => setToAccountId(e.target.value)}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            )}
            <Field label="tanggal">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="catatan (opsional)">
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="..." />
            </Field>
            <PrimaryButton type="submit">simpan</PrimaryButton>
          </form>
        )}
      </Panel>
    </AppShell>
  );
}