import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  emptyData,
  loadData,
  normalize,
  saveData,
  todayISO,
  uid,
  type Account,
  type Debt,
  type FinanceData,
  type Transaction,
} from "./finance";
interface FinanceContextValue {
  data: FinanceData;
  ready: boolean;
  addAccount: (input: Omit<Account, "id" | "createdAt">) => void;
  deleteAccount: (id: string) => void;
  addTransaction: (input: Omit<Transaction, "id" | "createdAt">) => void;
  deleteTransaction: (id: string) => void;
  addDebt: (
    input: Omit<Debt, "id" | "createdAt">,
  ) => void;
  recordPayment: (debtId: string, amount: number, accountId: string, date: string) => void;
  deleteDebt: (id: string) => void;
  replaceAll: (data: FinanceData) => void;
}
const FinanceContext = createContext<FinanceContextValue | null>(null);
export function FinanceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FinanceData>(emptyData);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setData(loadData());
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) saveData(data);
  }, [data, ready]);
  const addAccount = useCallback((input: Omit<Account, "id" | "createdAt">) => {
    setData((d) => ({
      ...d,
      accounts: [...d.accounts, { ...input, id: uid(), createdAt: new Date().toISOString() }],
    }));
  }, []);
  const deleteAccount = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      accounts: d.accounts.filter((a) => a.id !== id),
      transactions: d.transactions.filter((t) => t.accountId !== id && t.toAccountId !== id),
    }));
  }, []);
  const addTransaction = useCallback((input: Omit<Transaction, "id" | "createdAt">) => {
    setData((d) => ({
      ...d,
      transactions: [
        ...d.transactions,
        { ...input, id: uid(), createdAt: new Date().toISOString() },
      ],
    }));
  }, []);
  const deleteTransaction = useCallback((id: string) => {
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
  }, []);
  const addDebt = useCallback((input: Omit<Debt, "id" | "createdAt">) => {
    setData((d) => {
      const debt: Debt = { ...input, id: uid(), createdAt: new Date().toISOString() };
      const tx: Transaction = {
        id: uid(),
        type: "debt",
        amount: debt.amount,
        date: debt.date,
        note: debt.note,
        accountId: debt.accountId,
        debtId: debt.id,
        createdAt: new Date().toISOString(),
      };
      return {
        ...d,
        debts: [...d.debts, debt],
        transactions: debt.accountId ? [...d.transactions, tx] : d.transactions,
      };
    });
  }, []);
  const recordPayment = useCallback(
    (debtId: string, amount: number, accountId: string, date: string) => {
      setData((d) => ({
        ...d,
        transactions: [
          ...d.transactions,
          {
            id: uid(),
            type: "debt_payment",
            amount,
            date: date || todayISO(),
            accountId,
            debtId,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
    },
    [],
  );
  const deleteDebt = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      debts: d.debts.filter((x) => x.id !== id),
      transactions: d.transactions.filter((t) => t.debtId !== id),
    }));
  }, []);
  const replaceAll = useCallback((next: FinanceData) => setData(normalize(next)), []);
  const value = useMemo(
    () => ({
      data,
      ready,
      addAccount,
      deleteAccount,
      addTransaction,
      deleteTransaction,
      addDebt,
      recordPayment,
      deleteDebt,
      replaceAll,
    }),
    [
      data,
      ready,
      addAccount,
      deleteAccount,
      addTransaction,
      deleteTransaction,
      addDebt,
      recordPayment,
      deleteDebt,
      replaceAll,
    ],
  );
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
}