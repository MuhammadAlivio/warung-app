import { formatRupiah } from "./format";

/*
 * Satu sumber label & pilihan untuk modul Pembelian & Barang Masuk.
 * Ubah teks status cukup di sini; semua halaman (daftar, detail, terima barang, filter) ikut berubah.
 */

/** Status penerimaan barang (kolom purchases.status). */
export const RECEIPT_STATUS = {
  belum_diterima: { label: "Belum Diterima", tone: "gray" },
  diterima_sebagian: { label: "Diterima Sebagian", tone: "amber" },
  diterima: { label: "Diterima Lengkap", tone: "green" },
};

/** Status pembayaran ke pemasok (dihitung backend dari total & pembayaran). */
export const PAYMENT_STATUS = {
  belum_bayar: { label: "Belum Dibayar", tone: "red" },
  sebagian: { label: "Dibayar Sebagian", tone: "amber" },
  lunas: { label: "Lunas", tone: "green" },
};

/** Faktur yang tidak jadi (dibatalkan admin). Menggantikan status penerimaan & pembayaran di tampilan. */
export const CANCELLED_STATUS = { label: "Dibatalkan", tone: "red" };

export const RECEIPT_STATUS_OPTIONS = [
  ...Object.entries(RECEIPT_STATUS).map(([value, s]) => ({ value, label: s.label })),
  { value: "batal", label: CANCELLED_STATUS.label },
];

/** Filter status di daftar faktur: "batal" = faktur dibatalkan; status lain hanya faktur aktif. */
export const matchesStatus = (p, status) =>
  !status || (status === "batal" ? p.cancelled : !p.cancelled && p.status === status);

/** Faktur bisa dibatalkan selama belum ada barang diterima (aturan sama dengan backend). */
export const canCancel = (p) => !p.cancelled && p.status === "belum_diterima" && p.receptions.length === 0;

// Lokasi penerimaan dikelola admin di database (PurchaseContext.locations), nama tampil = purchase.locationName

export const PAYMENT_METHODS = [
  { value: "transfer_bank", label: "Transfer bank" },
  { value: "tunai", label: "Tunai" },
  { value: "cek", label: "Cek / Giro" },
];

export const methodLabel = (v) => PAYMENT_METHODS.find((m) => m.value === v)?.label ?? v;

export const purchaseTotal = (p) => p.total;
export const purchasePaid = (p) => p.paid;
export const purchaseDebt = (p) => p.debt;
export const purchaseQty = (p) => p.items.reduce((sum, i) => sum + i.qty, 0);
export const purchaseReceived = (p) => p.items.reduce((sum, i) => sum + (i.qtyReceived || 0), 0);
/** Tanggal pembayaran terakhir, atau null jika belum ada pembayaran. */
export const lastPaymentDate = (p) => p.payments.at(-1)?.date ?? null;

/**
 * Satuan untuk jumlah gabungan beberapa barang: satuan barangnya jika semua sama
 * (mis. "12 karung"), selain itu "unit" (mis. 10 karung + 4 pcs = "14 unit").
 */
export const unitOf = (items) => {
  const units = new Set(items.map((i) => i.unit || "pcs"));
  return units.size === 1 ? [...units][0] : "unit";
};
export const qtyText = (qty, unit) => `${qty} ${unit}`;

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
  red: `${PILL} bg-red-50 text-red-700`,
};

/** Label + warna pill status penerimaan; `short` menambahkan "· 6/14 unit" pada status sebagian. */
export function receiptPill(p, { short = false } = {}) {
  if (p.cancelled) return CANCELLED_STATUS;
  const s = RECEIPT_STATUS[p.status] ?? RECEIPT_STATUS.belum_diterima;
  if (short && p.status === "diterima_sebagian") {
    return { label: `Sebagian · ${purchaseReceived(p)}/${qtyText(purchaseQty(p), unitOf(p.items))}`, tone: s.tone };
  }
  return s;
}

export function paymentPill(p) {
  if (p.cancelled) return p.paid > 0 ? { label: "Dana dikembalikan", tone: "gray" } : CANCELLED_STATUS;
  return PAYMENT_STATUS[p.paymentStatus] ?? PAYMENT_STATUS.belum_bayar;
}

/** Jumlah hari dari hari ini ke tanggal "YYYY-MM-DD" (negatif = sudah lewat). */
export const daysUntil = (date) => {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
};

/** Kartu ringkasan halaman Pembelian, dihitung dari data faktur (faktur dibatalkan tidak dihitung). */
export function purchaseSummary(allPurchases, month) {
  const purchases = allPurchases.filter((p) => !p.cancelled);
  const inMonth = purchases.filter((p) => p.date.slice(0, 7) === month);
  const withDebt = purchases.filter((p) => p.debt > 0);
  const dueSoon = withDebt.filter((p) => {
    const n = daysUntil(p.dueDate);
    return n !== null && n <= 7;
  });
  return {
    monthTotal: inMonth.reduce((s, p) => s + p.total, 0),
    monthCount: inMonth.length,
    unfinishedCount: purchases.filter((p) => p.status !== "diterima").length,
    debtTotal: withDebt.reduce((s, p) => s + p.debt, 0),
    debtCount: withDebt.length,
    dueSoonTotal: dueSoon.reduce((s, p) => s + p.debt, 0),
    dueSoonCount: dueSoon.length,
  };
}

export { formatRupiah };
