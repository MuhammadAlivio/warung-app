import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CUSTOMERS } from "../data/posMockData";
import { useTransactions } from "./TransactionContext";
import { remainingOf } from "../utils/transaction";

const Ctx = createContext(null);
export const useCustomers = () => useContext(Ctx);

export function CustomerProvider({ children }) {
  const [customers, setCustomers] = useState(CUSTOMERS);

  const addCustomer = useCallback((data) => {
    const c = { id: `c${Date.now()}`, ...data };
    setCustomers((p) => [c, ...p]);
    return c;
  }, []);
  const updateCustomer = useCallback((id, data) => setCustomers((p) => p.map((c) => (c.id === id ? { ...c, ...data } : c))), []);
  const removeCustomer = useCallback((id) => setCustomers((p) => p.filter((c) => c.id !== id)), []);

  const value = useMemo(() => ({ customers, addCustomer, updateCustomer, removeCustomer }), [customers, addCustomer, updateCustomer, removeCustomer]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Ringkasan tagihan per pelanggan, dihitung dari transaksi (satu sumber data). */
export function useCustomerSummary() {
  const { transactions } = useTransactions();
  return useMemo(() => {
    const map = new Map();
    [...transactions].sort((a, b) => b.date - a.date).forEach((t) => {
      const s = map.get(t.customer.id) ?? { outstanding: 0, last: null, lastUnpaid: null };
      s.last ??= t;
      const r = remainingOf(t);
      if (r > 0) { s.outstanding += r; s.lastUnpaid ??= t; }
      map.set(t.customer.id, s);
    });
    return (id) => map.get(id) ?? { outstanding: 0, last: null, lastUnpaid: null };
  }, [transactions]);
}
