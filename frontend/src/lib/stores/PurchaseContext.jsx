import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "./AuthContext";
import { useStock } from "./StockContext";

const PurchaseCtx = createContext(null);

/** Bentuk faktur pembelian di frontend (camelCase). */
const fromApi = (p) => ({
  id: p.id,
  purchaseNo: p.purchase_no,
  supplierId: p.supplier?.id,
  supplierName: p.supplier?.name ?? "-",
  date: p.purchase_date,
  dueDate: p.due_date,
  location: p.location,
  locationName: p.location_name ?? p.location,
  status: p.status,
  paymentStatus: p.payment_status,
  total: p.total,
  paid: p.paid,
  debt: p.debt,
  notes: p.notes,
  estimatedNextDelivery: p.estimated_next_delivery,
  createdBy: p.created_by ?? "-",
  cancelled: !!p.cancelled,
  cancelledAt: p.cancelled_at,
  cancelledBy: p.cancelled_by ?? "-",
  cancelReason: p.cancel_reason ?? "",
  createdAt: p.created_at,
  items: p.items.map((i) => ({
    id: i.id,
    productId: i.product_id,
    productName: i.product_name,
    sku: i.sku,
    unit: i.unit,
    qty: i.qty,
    qtyReceived: i.qty_received,
    buyPrice: i.unit_price,
  })),
  payments: p.payments.map((x) => ({
    id: x.id, date: x.paid_at, method: x.method, amount: x.amount, note: x.note, userName: x.user_name,
  })),
  receptions: p.receipts.map((r) => ({
    id: r.id,
    receptionNo: r.receipt_no,
    date: r.date,
    time: r.time,
    receivedBy: r.received_by,
    deliveryNote: r.delivery_note,
    notes: r.notes,
    items: r.items.map((ri) => ({
      purchaseItemId: ri.purchase_item_id, productId: ri.product_id, productName: ri.product_name, unit: ri.unit, qty: ri.qty,
    })),
  })),
});

/**
 * Pembelian & Barang Masuk dari database (API /api/purchases, /api/suppliers). Khusus admin:
 * akun kasir tidak memuat data ini sama sekali. Semua fungsi ubah data async dan melempar ApiError.
 */
export function PurchaseProvider({ children }) {
  const { user } = useAuth();
  const { reload: reloadStock } = useStock();
  const isAdmin = user?.role === "admin";

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  // false sampai pemuatan pertama selesai: halaman detail tidak mengalihkan ke daftar sebelum data ada
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, s, l] = await Promise.all([api("/api/purchases"), api("/api/suppliers"), api("/api/purchase-locations")]);
      setPurchases(p.data.map(fromApi));
      setSuppliers(s.data);
      setLocations(l.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setPurchases([]);
      setSuppliers([]);
      setLocations([]);
      setLoaded(false);
      return;
    }
    reload();
  }, [user?.id, isAdmin, reload]);

  const upsert = (p) =>
    setPurchases((prev) => (prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]));

  const addPurchase = useCallback(async (body) => {
    const p = fromApi((await api("/api/purchases", { method: "POST", body })).data);
    upsert(p);
    if (body.receive_all) reloadStock();
    return p;
  }, [reloadStock]);

  const addPayment = useCallback(async (id, { amount, date, method, note }) => {
    const p = fromApi((await api(`/api/purchases/${id}/payments`, {
      method: "POST", body: { amount, paid_at: date, method, note },
    })).data);
    upsert(p);
    return p;
  }, []);

  /** Batalkan faktur yang tidak jadi (hanya jika belum ada barang diterima). */
  const cancelPurchase = useCallback(async (id, reason) => {
    const p = fromApi((await api(`/api/purchases/${id}/cancel`, { method: "POST", body: { reason } })).data);
    upsert(p);
    return p;
  }, []);

  /** items: [{ purchaseItemId, qty }]. Stok barang bertambah di backend, lalu daftar stok dimuat ulang. */
  const receiveItems = useCallback(async (id, { date, deliveryNote, notes, items }) => {
    const p = fromApi((await api(`/api/purchases/${id}/receipts`, {
      method: "POST",
      body: {
        received_at: date,
        delivery_note: deliveryNote,
        notes,
        items: items.map((i) => ({ purchase_item_id: i.purchaseItemId, qty: i.qty })),
      },
    })).data);
    upsert(p);
    reloadStock();
    return p;
  }, [reloadStock]);

  const addSupplier = useCallback(async (data) => {
    const s = (await api("/api/suppliers", { method: "POST", body: data })).data;
    setSuppliers((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)));
    return s;
  }, []);

  /** Ubah data pemasok; nama di daftar faktur ikut diperbarui. */
  const updateSupplier = useCallback(async (id, data) => {
    const s = (await api(`/api/suppliers/${id}`, { method: "PUT", body: data })).data;
    setSuppliers((prev) => prev.map((x) => (x.id === id ? s : x)).sort((a, b) => a.name.localeCompare(b.name)));
    setPurchases((prev) => prev.map((p) => (p.supplierId === id ? { ...p, supplierName: s.name } : p)));
    return s;
  }, []);

  // Daftar lokasi penerimaan. Faktur menyimpan kode lokasi, jadi ganti nama cukup memperbarui tampilan.
  const addLocation = useCallback(async (name) => {
    const l = (await api("/api/purchase-locations", { method: "POST", body: { name } })).data;
    setLocations((prev) => [...prev, l]);
    return l;
  }, []);

  const renameLocation = useCallback(async (id, name) => {
    const l = (await api(`/api/purchase-locations/${id}`, { method: "PUT", body: { name } })).data;
    setLocations((prev) => prev.map((x) => (x.id === id ? l : x)));
    setPurchases((prev) => prev.map((p) => (p.location === l.code ? { ...p, locationName: l.name } : p)));
  }, []);

  const deleteLocation = useCallback(async (id) => {
    await api(`/api/purchase-locations/${id}`, { method: "DELETE" });
    setLocations((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const getPurchase = useCallback((id) => purchases.find((p) => String(p.id) === String(id)), [purchases]);

  const value = useMemo(
    () => ({
      purchases, suppliers, locations, loading, loaded, error, reload, getPurchase,
      addPurchase, addPayment, receiveItems, cancelPurchase, addSupplier, updateSupplier, addLocation, renameLocation, deleteLocation,
    }),
    [purchases, suppliers, locations, loading, loaded, error, reload, getPurchase,
      addPurchase, addPayment, receiveItems, cancelPurchase, addSupplier, updateSupplier, addLocation, renameLocation, deleteLocation],
  );

  return <PurchaseCtx.Provider value={value}>{children}</PurchaseCtx.Provider>;
}

export function usePurchase() {
  const ctx = useContext(PurchaseCtx);
  if (!ctx) throw new Error("usePurchase must be inside PurchaseProvider");
  return ctx;
}
