import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "./AuthContext";
import { useTransactions } from "./TransactionContext";
import { remainingOf } from "../utils/transaction";

const Ctx = createContext(null);
export const useCustomers = () => useContext(Ctx);

// Data pelanggan ada di database (API). Id di frontend "c<id>" supaya tetap cocok dengan transaksi tiruan (c1–c12).
const fromApi = (c) => ({ id: `c${c.id}`, name: c.name, phone: c.phone ?? "", address: c.address ?? "", note: c.note ?? "" });
const apiId = (id) => String(id).replace(/^c/, "");
const toBody = ({ name, phone, address, note }) => ({ name, phone, address, note });

export function CustomerProvider({ children }) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    if (!user) return setCustomers([]);
    api("/api/customers")
      .then((res) => setCustomers(res.data.map(fromApi)))
      .catch(() => setCustomers([]));
  }, [user?.id]);

  // Ketiga fungsi async: error dari server (mis. validasi) dilempar ke pemanggil
  const addCustomer = useCallback(async (data) => {
    const res = await api("/api/customers", { method: "POST", body: toBody(data) });
    const c = fromApi(res.data);
    setCustomers((p) => [c, ...p]);
    return c;
  }, []);
  const updateCustomer = useCallback(async (id, data) => {
    const res = await api(`/api/customers/${apiId(id)}`, { method: "PUT", body: toBody(data) });
    setCustomers((p) => p.map((c) => (c.id === id ? fromApi(res.data) : c)));
  }, []);
  const removeCustomer = useCallback(async (id) => {
    await api(`/api/customers/${apiId(id)}`, { method: "DELETE" });
    setCustomers((p) => p.filter((c) => c.id !== id));
  }, []);

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
