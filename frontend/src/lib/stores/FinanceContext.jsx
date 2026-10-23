import { createContext, useContext, useMemo, useState } from "react";
import { INITIAL_FINANCE_ENTRIES } from "../data/financeMockData";

const FinanceCtx = createContext(null);

export function FinanceProvider({ children }) {
  const [entries, setEntries] = useState(INITIAL_FINANCE_ENTRIES);

  const addEntry = (data) =>
    setEntries((prev) => [{ ...data, id: crypto.randomUUID() }, ...prev]);

  const updateEntry = (id, data) =>
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...data } : e)),
    );

  const deleteEntry = (id) =>
    setEntries((prev) => prev.filter((e) => e.id !== id));

  const value = useMemo(
    () => ({ entries, addEntry, updateEntry, deleteEntry }),
    [entries],
  );

  return <FinanceCtx.Provider value={value}>{children}</FinanceCtx.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceCtx);
  if (!ctx) throw new Error("useFinance must be inside FinanceProvider");
  return ctx;
}
