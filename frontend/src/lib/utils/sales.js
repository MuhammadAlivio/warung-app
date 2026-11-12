// API transaksi kasir (backend /api/sales). Respons dipetakan ke bentuk `tx` yang sudah dipakai
// ReceiptPreview, InvoiceDocument, PaymentSuccess, dan modal di Riwayat Transaksi.
import { api } from "../api";
import { GENERAL_CUSTOMER } from "../data/posMockData";
import { toInputDate } from "./pos";

/** Id pelanggan di frontend "c<id>" (lihat CustomerContext) -> id database; pelanggan umum -> null. */
export const customerApiId = (id) => (!id || id === GENERAL_CUSTOMER.id ? null : Number(String(id).replace(/^c/, "")));

export const saleFromApi = (s) => ({
  id: s.id,
  seq: 0,
  no: s.no,
  date: new Date(s.date),
  customer: s.customer?.id
    ? { id: `c${s.customer.id}`, name: s.customer.name, phone: s.customer.phone ?? "", address: s.customer.address ?? "" }
    : { ...GENERAL_CUSTOMER },
  method: s.method,
  status: s.status,
  cancelled: s.cancelled,
  total: s.total,
  paid: s.paid,
  units: s.units ?? 0,
  // id item = id barang, sama seperti keranjang Kasir & form Edit Transaksi
  items: (s.items ?? []).map((i) => ({ id: i.product_id, name: i.name, unit: i.unit, price: i.price, qty: i.qty })),
  payments: (s.payments ?? []).map((p) => ({ ...p, date: new Date(p.date) })),
  history: (s.history ?? []).map((h) => ({ ...h, at: new Date(h.at) })),
  cash: s.cash ?? null,
  change: s.change ?? 0,
  printDoc: s.print_doc ?? "receipt",
  cashier: s.cashier ?? "",
  cancelReason: s.cancel_reason ?? "",
});

const query = (params) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null)).toString();

/** filters: { date, method, status, q, categoryId, page, perPage } */
export async function fetchSales({ date, method, status, q, categoryId, page = 1, perPage = 6 }) {
  const res = await api(`/api/sales?${query({ date, method, status, q: q?.trim(), category_id: categoryId, page, per_page: perPage })}`);
  return { rows: res.data.map(saleFromApi), meta: res.meta };
}

export const fetchSalesSummary = (date = toInputDate()) => api(`/api/sales/summary?${query({ date })}`).then((r) => r.data);

export const fetchSale = (id) => api(`/api/sales/${id}`).then((r) => saleFromApi(r.data));

export const fetchNextSaleNo = () => api("/api/sales/next-number").then((r) => r.data.no);

/** Simpan transaksi dari Kasir. */
export const createSale = ({ customer, method, cash, items, printDoc }) =>
  api("/api/sales", {
    method: "POST",
    body: {
      customer_id: customerApiId(customer?.id),
      method,
      cash,
      print_doc: printDoc,
      items: items.map((i) => ({ product_id: i.id, qty: i.qty })),
    },
  }).then((r) => saleFromApi(r.data));

export const updateSaleItems = (id, items, reason) =>
  api(`/api/sales/${id}/items`, {
    method: "PUT",
    body: { items: items.map((i) => ({ product_id: i.id, qty: Number(i.qty) })), reason },
  }).then((r) => saleFromApi(r.data));

export const addSalePayment = (id, pay) =>
  api(`/api/sales/${id}/payments`, {
    method: "POST",
    body: { date: toInputDate(pay.date), method: pay.method, amount: Number(pay.amount), note: pay.note },
  }).then((r) => saleFromApi(r.data));

export const cancelSale = (id, reason) =>
  api(`/api/sales/${id}/cancel`, { method: "POST", body: { reason } }).then((r) => saleFromApi(r.data));
