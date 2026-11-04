import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "./AuthContext";

const StockContext = createContext(null);

/** Bentuk barang di frontend. `note` ("Per pcs") dipertahankan untuk halaman yang sudah memakainya. */
const fromApi = (p) => ({
  id: p.id,
  sku: p.sku ?? "",
  name: p.name,
  description: p.description ?? "",
  categoryId: p.category_id,
  category: p.category ?? "",
  unit: p.unit,
  note: `Per ${p.unit}`,
  buyPrice: p.buy_price,
  sellPrice: p.sell_price,
  stock: p.stock,
  minStock: p.min_stock,
  image: p.image_url,
});

const toBody = (d) => ({
  name: d.name,
  description: d.description,
  category_id: Number(d.categoryId),
  buy_price: d.buyPrice,
  sell_price: d.sellPrice,
  stock: d.stock,
  min_stock: d.minStock,
});

/**
 * Data Stok Barang dari database (API /api/products & /api/categories).
 * Semua fungsi ubah data bersifat async dan melempar ApiError ke pemanggil (mis. error validasi 422).
 */
export function StockProvider({ children }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, c] = await Promise.all([api("/api/products"), api("/api/categories")]);
      setProducts(p.data.map(fromApi));
      setCategories(c.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setCategories([]);
      return;
    }
    reload();
  }, [user?.id, reload]);

  const replace = (p) => setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  const refreshCategories = useCallback(() => api("/api/categories").then((c) => setCategories(c.data)), []);

  /** image: File (unggah), string (tidak berubah), null (hapus foto). */
  const syncImage = async (product, image) => {
    if (image instanceof File) {
      const form = new FormData();
      form.append("image", image);
      return fromApi((await api(`/api/products/${product.id}/image`, { method: "POST", body: form })).data);
    }
    if (image == null && product.image) {
      return fromApi((await api(`/api/products/${product.id}/image`, { method: "DELETE" })).data);
    }
    return product;
  };

  const addProduct = useCallback(async (data) => {
    let p = fromApi((await api("/api/products", { method: "POST", body: toBody(data) })).data);
    setProducts((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));
    p = await syncImage(p, data.image);
    replace(p);
    refreshCategories();
    return p;
  }, [refreshCategories]);

  const updateProduct = useCallback(async (id, data) => {
    let p = fromApi((await api(`/api/products/${id}`, { method: "PUT", body: toBody(data) })).data);
    replace(p);
    p = await syncImage(p, data.image);
    replace(p);
    refreshCategories();
    return p;
  }, [refreshCategories]);

  const deleteProduct = useCallback(async (id) => {
    await api(`/api/products/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
    refreshCategories();
  }, [refreshCategories]);

  const addCategory = useCallback(async (name) => {
    const c = (await api("/api/categories", { method: "POST", body: { name } })).data;
    setCategories((prev) => [...prev, { ...c, product_count: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
    return c;
  }, []);

  const renameCategory = useCallback(async (id, name) => {
    const c = (await api(`/api/categories/${id}`, { method: "PUT", body: { name } })).data;
    setCategories((prev) =>
      prev.map((x) => (x.id === id ? { ...x, name: c.name } : x)).sort((a, b) => a.name.localeCompare(b.name))
    );
    setProducts((prev) => prev.map((p) => (p.categoryId === id ? { ...p, category: c.name } : p)));
  }, []);

  const deleteCategory = useCallback(async (id) => {
    await api(`/api/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /**
   * SEMENTARA: ubah stok hanya di layar (tidak ke database), dipakai Kasir & Terima Barang
   * yang belum tersambung ke API. Hapus setelah modul Kasir & Pembelian memotong/menambah
   * stok di backend (StockService), lalu cukup panggil reload().
   * deltas = { [productId]: +n | -n }
   */
  const adjustLocal = useCallback((deltas) => {
    setProducts((prev) => prev.map((p) => (deltas[p.id] ? { ...p, stock: Math.max(0, p.stock + deltas[p.id]) } : p)));
  }, []);

  const value = useMemo(
    () => ({
      products, categories, loading, error, reload,
      addProduct, updateProduct, deleteProduct,
      addCategory, renameCategory, deleteCategory,
      adjustLocal,
    }),
    [products, categories, loading, error, reload, addProduct, updateProduct, deleteProduct, addCategory, renameCategory, deleteCategory, adjustLocal]
  );

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error("useStock harus dipakai di dalam <StockProvider>");
  return ctx;
}
