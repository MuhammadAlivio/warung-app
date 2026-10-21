import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { INITIAL_PRODUCTS } from "../data/stockMockData";

const StockContext = createContext(null);

/**
 * Penyimpanan stok in-memory agar tambah/edit/hapus langsung terasa di UI.
 * TODO: ganti isi fungsi dengan panggilan API (atau React Query) saat backend siap.
 */
export function StockProvider({ children }) {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);

  const addProduct = useCallback((data) => {
    setProducts((prev) => [{ ...data, note: "Per pcs", id: crypto.randomUUID() }, ...prev]);
  }, []);

  const updateProduct = useCallback((id, data) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const deleteProduct = useCallback((id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const value = useMemo(
    () => ({ products, addProduct, updateProduct, deleteProduct }),
    [products, addProduct, updateProduct, deleteProduct]
  );

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error("useStock harus dipakai di dalam <StockProvider>");
  return ctx;
}
