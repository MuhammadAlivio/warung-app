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
  status: p.status,
  paymentStatus: p.payment_status,
  total: p.total,
  paid: p.paid,
  debt: p.debt,
  notes: p.notes,
  estimatedNextDelivery: p.estimated_next_delivery,
  createdBy: p.created_by ?? "-",
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
  const [loading, setLoading] = useState(false);
  // false sampai pemuatan pertama selesai: halaman detail tidak mengalihkan ke daftar sebelum data ada
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, s] = await Promise.all([api("/api/purchases"), api("/api/suppliers")]);
      setPurchases(p.data.map(fromApi));
      setSuppliers(s.data);
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

  const getPurchase = useCallback((id) => purchases.find((p) => String(p.id) === String(id)), [purchases]);

  const value = useMemo(
    () => ({ purchases, suppliers, loading, loaded, error, reload, getPurchase, addPurchase, addPayment, receiveItems, addSupplier }),
    [purchases, suppliers, loading, loaded, error, reload, getPurchase, addPurchase, addPayment, receiveItems, addSupplier],
  );

  return <PurchaseCtx.Provider value={value}>{children}</PurchaseCtx.Provider>;
}

export function usePurchase() {
  const ctx = useContext(PurchaseCtx);
  if (!ctx) throw new Error("usePurchase must be inside PurchaseProvider");
  return ctx;
}
