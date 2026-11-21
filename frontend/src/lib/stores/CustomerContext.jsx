import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "./AuthContext";

const Ctx = createContext(null);
export const useCustomers = () => useContext(Ctx);

// Data pelanggan ada di database (API). Id di frontend "c<id>". Tagihan (outstanding, unpaidCount) juga dari database:
// outstanding = akumulasi sisa tagihan semua transaksi belum lunas, bukan satu transaksi.
export const fromApi = (c) => ({
  id: `c${c.id}`,
  name: c.name,
  phone: c.phone ?? "",
  address: c.address ?? "",
  note: c.note ?? "",
  outstanding: c.outstanding ?? 0,
  unpaidCount: c.unpaid_count ?? 0,
  transactionCount: c.transaction_count ?? 0,
});
export const customerApiId = (id) => String(id).replace(/^c/, "");
const toBody = ({ name, phone, address, note }) => ({ name, phone, address, note });

export function CustomerProvider({ children }) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);

  // Ambil ulang dari database, mis. saat halaman dibuka, supaya tagihan dari transaksi baru ikut terlihat
  const refresh = useCallback(
    () =>
      api("/api/customers")
        .then((res) => setCustomers(res.data.map(fromApi)))
        .catch(() => {}),
    []
  );

  useEffect(() => {
    if (!user) return setCustomers([]);
    refresh();
  }, [user?.id, refresh]);

  // Ketiga fungsi async: error dari server (mis. validasi) dilempar ke pemanggil
  const addCustomer = useCallback(async (data) => {
    const res = await api("/api/customers", { method: "POST", body: toBody(data) });
    const c = fromApi(res.data);
    setCustomers((p) => [c, ...p]);
    return c;
  }, []);
  const updateCustomer = useCallback(async (id, data) => {
    const res = await api(`/api/customers/${customerApiId(id)}`, { method: "PUT", body: toBody(data) });
    setCustomers((p) => p.map((c) => (c.id === id ? fromApi(res.data) : c)));
  }, []);
  const removeCustomer = useCallback(async (id) => {
    await api(`/api/customers/${customerApiId(id)}`, { method: "DELETE" });
    setCustomers((p) => p.filter((c) => c.id !== id));
  }, []);

  const value = useMemo(() => ({ customers, addCustomer, updateCustomer, removeCustomer, refresh }), [customers, addCustomer, updateCustomer, removeCustomer, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Ringkasan tagihan per pelanggan: { outstanding, unpaidCount, transactionCount }, dari database. */
export function useCustomerSummary() {
  const { customers } = useCustomers();
  return useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c]));
    return (id) => map.get(id) ?? { outstanding: 0, unpaidCount: 0, transactionCount: 0 };
  }, [customers]);
}
