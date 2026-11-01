import { formatRupiah } from "./format";

export const purchaseTotal = (p) => p.items.reduce((sum, i) => sum + i.qty * i.buyPrice, 0);
export const purchaseQty = (p) => p.items.reduce((sum, i) => sum + i.qty, 0);
export const purchaseReceived = (p) => p.items.reduce((sum, i) => sum + (i.qtyReceived || 0), 0);
/** Total terbayar: pembayaran awal + cicilan yang dicatat belakangan. */
export const purchasePaid = (p) =>
  (p.initialPayment || 0) + (p.payments || []).reduce((sum, x) => sum + x.amount, 0);
export const purchaseDebt = (p) => Math.max(0, purchaseTotal(p) - purchasePaid(p));
/** Tanggal pembayaran terakhir (cicilan terakhir, atau pembayaran awal). */
export const lastPaymentDate = (p) => (p.payments || []).at(-1)?.date || p.initialPaymentDate || p.date;

/** "16 Okt 2026" */
export const formatDateShort = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

/** "16 Oktober 2026" */
export const formatDateLong = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

/** "09:15" -> "09.15" (format jam di desain) */
export const formatTime = (t) => (t ? t.replace(":", ".") : "");

const PILL = "inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold";
export const PILL_CLASS = {
  amber: `${PILL} bg-amber-50 text-amber-700`,
  green: `${PILL} bg-brand-50 text-brand-700`,
  gray: `${PILL} bg-neutral-100 text-neutral-600`,
};

/** Label + warna pill status penerimaan; `short` menambahkan "· 24/48" pada status sebagian. */
export function receiptPill(p, { short = false } = {}) {
  if (p.status === "diterima") return { label: "Diterima semua", tone: "green" };
  if (p.status === "diterima_sebagian") {
    return {
      label: short ? `Sebagian · ${purchaseReceived(p)}/${purchaseQty(p)}` : "Diterima sebagian",
      tone: "amber",
    };
  }
  return { label: "Belum diterima", tone: "gray" };
}

export function paymentPill(p) {
  return purchaseDebt(p) > 0 ? { label: "Sebagian", tone: "amber" } : { label: "Lunas", tone: "green" };
}

export { formatRupiah };
