export type AccountType = "cash" | "bank" | "ewallet";
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  createdAt: string;
}
export type TxType = "expense" | "income" | "transfer" | "debt" | "debt_payment";
export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  date: string;
  note?: string;
  category?: string;
  source?: string;
  accountId?: string;
  toAccountId?: string;
  debtId?: string;
  createdAt: string;
}
/** "owe" = kamu berutang ke orang. "owed" = orang berutang ke kamu (piutang). */
export type DebtDirection = "owe" | "owed";
export interface Debt {
  id: string;
  direction: DebtDirection;
  person: string;
  amount: number;
  date: string;
  note?: string;
  accountId?: string;
  createdAt: string;
}
export interface FinanceData {
  version: 1;
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
}
export const STORAGE_KEY = "finance-tracker-data-v1";
export const EXPENSE_CATEGORIES = [
  "Makan & Minum",
  "Transport",
  "Belanja",
  "Tagihan",
  "Kesehatan",
  "Hiburan",
  "Pendidikan",
  "Lainnya",
];
export const INCOME_SOURCES = [
  "Gaji",
  "Bonus",
  "Freelance",
  "Hadiah",
  "Investasi",
  "Lainnya",
];
export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: "Cash",
  bank: "Bank",
  ewallet: "E-Wallet",
};
export const emptyData: FinanceData = {
  version: 1,
  accounts: [],
  transactions: [],
  debts: [],
};
export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
export function normalize(input: unknown): FinanceData {
  const d = (input ?? {}) as Partial<FinanceData>;
  return {
    version: 1,
    accounts: Array.isArray(d.accounts) ? d.accounts : [],
    transactions: Array.isArray(d.transactions) ? d.transactions : [],
    debts: Array.isArray(d.debts) ? d.debts : [],
  };
}
export function loadData(): FinanceData {
  if (typeof window === "undefined") return emptyData;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;
    return normalize(JSON.parse(raw));
  } catch {
    return emptyData;
  }
}
export function saveData(data: FinanceData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
/** Efek transaksi terhadap saldo sebuah akun (positif = uang masuk). */
export function txEffect(tx: Transaction, accountId: string, debts: Debt[]): number {
  switch (tx.type) {
    case "expense":
      return tx.accountId === accountId ? -tx.amount : 0;
    case "income":
      return tx.accountId === accountId ? tx.amount : 0;
    case "transfer":
      if (tx.accountId === accountId) return -tx.amount;
      if (tx.toAccountId === accountId) return tx.amount;
      return 0;
    case "debt": {
      if (tx.accountId !== accountId) return 0;
      const debt = debts.find((d) => d.id === tx.debtId);
      return debt?.direction === "owe" ? tx.amount : -tx.amount;
    }
    case "debt_payment": {
      if (tx.accountId !== accountId) return 0;
      const debt = debts.find((d) => d.id === tx.debtId);
      return debt?.direction === "owe" ? -tx.amount : tx.amount;
    }
    default:
      return 0;
  }
}
export function accountBalance(account: Account, data: FinanceData): number {
  return data.transactions.reduce(
    (sum, tx) => sum + txEffect(tx, account.id, data.debts),
    account.initialBalance,
  );
}
export function totalBalance(data: FinanceData): number {
  return data.accounts.reduce((sum, a) => sum + accountBalance(a, data), 0);
}
export function debtPaid(debtId: string, data: FinanceData): number {
  return data.transactions
    .filter((t) => t.type === "debt_payment" && t.debtId === debtId)
    .reduce((s, t) => s + t.amount, 0);
}
export function debtRemaining(debt: Debt, data: FinanceData): number {
  return Math.max(0, debt.amount - debtPaid(debt.id, data));
}
export function sortByDateDesc(a: Transaction, b: Transaction) {
  if (a.date === b.date) return b.createdAt.localeCompare(a.createdAt);
  return b.date.localeCompare(a.date);
}
export function accountTransactions(accountId: string, data: FinanceData): Transaction[] {
  return data.transactions
    .filter((t) => t.accountId === accountId || t.toAccountId === accountId)
    .sort(sortByDateDesc);
}
export function formatIDR(value: number): string {
  const sign = value < 0 ? "-" : "";
  return (
    sign +
    "Rp " +
    Math.abs(Math.round(value))
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}
export function monthKey(date: string) {
  return date.slice(0, 7);
}
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
export function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
}
export function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}
export function todayISO() {
  const now = new Date();
  const off = now.getTimezoneOffset();
  return new Date(now.getTime() - off * 60000).toISOString().slice(0, 10);
}
export function txLabel(tx: Transaction, data: FinanceData): string {
  const acc = (id?: string) => data.accounts.find((a) => a.id === id)?.name ?? "—";
  switch (tx.type) {
    case "expense":
      return tx.category ?? "Expense";
    case "income":
      return tx.source ?? "Income";
    case "transfer":
      return `${acc(tx.accountId)} → ${acc(tx.toAccountId)}`;
    case "debt": {
      const debt = data.debts.find((d) => d.id === tx.debtId);
      return debt
        ? debt.direction === "owe"
          ? `Utang ke ${debt.person}`
          : `Piutang dari ${debt.person}`
        : "Debt";
    }
    case "debt_payment": {
      const debt = data.debts.find((d) => d.id === tx.debtId);
      return debt
        ? debt.direction === "owe"
          ? `Bayar utang ke ${debt.person}`
          : `Terima bayaran dari ${debt.person}`
        : "Bayar debt";
    }
    default:
      return "Transaksi";
  }
}
export function txSign(tx: Transaction, data: FinanceData): 1 | -1 | 0 {
  switch (tx.type) {
    case "expense":
      return -1;
    case "income":
      return 1;
    case "transfer":
      return 0;
    case "debt": {
      const debt = data.debts.find((d) => d.id === tx.debtId);
      return debt?.direction === "owe" ? 1 : -1;
    }
    case "debt_payment": {
      const debt = data.debts.find((d) => d.id === tx.debtId);
      return debt?.direction === "owe" ? -1 : 1;
    }
    default:
      return 0;
  }
}