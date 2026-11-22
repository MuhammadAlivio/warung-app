import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import DashboardLayout from "../lib/components/layout/DashboardLayout";
import FinanceCharts from "../lib/components/finance/FinanceCharts";
import CategoryCombobox from "../lib/components/finance/CategoryCombobox";
import { Button, Card } from "../lib/components/ui";
import Pagination from "../lib/components/ui/Pagination";
import { formatRupiah } from "../lib/utils/format";
import { cn } from "../lib/utils/cn";
import { getStoreProfile } from "../lib/utils/pos";
import {
  addFinanceCategory,
  addFinanceType,
  createFinanceEntry,
  deleteFinanceEntry,
  downloadFinanceReport,
  updateFinanceEntry,
  useFinanceCategories,
  useFinanceTypes,
  useFinanceEntries,
  useFinanceReport,
} from "../lib/hooks/useFinance";
import {
  FINANCE_AUTO_CATEGORIES_IN,
} from "../lib/data/financeMockData";

// ── helpers ─────────────────────────────────────────────────────────────────

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function toDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function getMonday(d) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function formatShortDate(d) {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatShortMonth(d) {
  return d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
}

function getWeekLabel(d) {
  const mon = getMonday(d);
  const sun = addDays(mon, 6);
  return `${formatShortDate(mon)} - ${formatShortDate(sun)}`;
}

function getMonthRange(d) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start, end };
}

function getWeekNumber(d) {
  const mon = getMonday(d);
  const day = mon.getDate();
  return Math.ceil(day / 7);
}

// Get weeks in a month
function getWeeksInMonth(d) {
  const { start, end } = getMonthRange(d);
  const weeks = [];
  let cur = getMonday(start);
  while (cur <= end) {
    const sun = addDays(cur, 6);
    weeks.push({ start: isoDate(cur), end: isoDate(sun < end ? sun : end), mon: cur });
    cur = addDays(cur, 7);
  }
  return weeks;
}

/** Label rincian baris kas: kategori bila ada ("Gaji"), selain itu jenisnya ("Pembelian barang"). */
function entryLabel(e) {
  return e.subcategory || e.category;
}

// ── Catat Modal ──────────────────────────────────────────────────────────────

/** Pilihan "dihitung sebagai" saat menambah jenis baru (sama dengan FinanceService::EFFECTS). */
const EFFECT_OPTIONS = {
  keluar: [
    { value: "biaya", label: "Biaya usaha", hint: "Kas berkurang dan laba usaha berkurang. Mis. iuran sampah, servis kulkas." },
    { value: "bukan_biaya", label: "Bukan biaya", hint: "Hanya kas berkurang, laba tidak berubah. Mis. cicilan pinjaman, beli etalase." },
  ],
  masuk: [
    { value: "pemasukan", label: "Pemasukan lain", hint: "Kas bertambah, bukan dari penjualan. Mis. bunga bank, sewa lahan parkir." },
    { value: "modal", label: "Modal pemilik", hint: "Uang pribadi pemilik yang dimasukkan ke toko." },
  ],
};

/** Efek jenis ke laporan; jenis lama yang tidak ada di daftar mengikuti aturan lama (sama dengan backend). */
function typeEffect(types, direction, category) {
  const found = types?.[direction]?.find((t) => t.name === category);
  if (found) return found.effect;
  if (direction === "keluar") return ["Pembelian barang", "Prive pemilik"].includes(category) ? "bukan_biaya" : "biaya";
  return category === "Prive masuk" ? "modal" : "pemasukan";
}

/** Penjelasan pengaruh catatan ke laporan, sesuai cara FinanceService menghitungnya. */
function previewText(effect, category, amount) {
  switch (effect) {
    case "biaya":
      return `Kas berkurang ${amount} dan laba usaha berkurang ${amount}.`;
    case "bukan_biaya":
      if (category === "Pembelian barang") return `Kas berkurang ${amount}. Laba usaha tidak berubah karena dicatat sebagai belanja stok.`;
      if (category === "Prive pemilik") return `Kas berkurang ${amount}. Laba usaha tidak berubah karena ini pengambilan pribadi pemilik.`;
      return `Kas berkurang ${amount}. Laba usaha tidak berubah karena bukan biaya usaha.`;
    case "modal":
      return `Kas bertambah ${amount} sebagai modal dari pemilik. Laba usaha tidak berubah.`;
    default:
      return `Kas bertambah ${amount}. Tidak dihitung sebagai penjualan.`;
  }
}

/** Catat baru, atau ubah/hapus catatan manual bila `entry` (baris buku kas) diisi. */
function CatatModal({ open, onClose, onSave, entry = null, onDelete, types, onTypesChange, categories, onCategoriesChange }) {
  const [jenis, setJenis] = useState("keluar");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  // Jenis baru yang sedang dibuat: menunggu admin memilih "dihitung sebagai"
  const [newType, setNewType] = useState(null); // { name, effect }
  const [newTypeSaving, setNewTypeSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [method, setMethod] = useState("tunai");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  // Isi form setiap kali modal dibuka: data catatan (mode ubah) atau kosong (catat baru)
  useEffect(() => {
    if (!open) return;
    setJenis(entry?.type ?? "keluar");
    setCategory(entry?.category ?? "");
    setSubcategory(entry?.subcategory ?? "");
    setNewType(null);
    setAmount(entry ? String(entry.amount) : "");
    setDate(entry?.date ?? isoDate(new Date()));
    setMethod(entry?.method ?? "tunai");
    setDescription(entry?.description ?? "");
    setError("");
    setConfirmDelete(false);
    setDeleteReason("");
  }, [open, entry]);

  async function handleDelete() {
    if (deleteReason.trim().length < 5) {
      setError("Alasan penghapusan wajib diisi (min. 5 karakter).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onDelete(deleteReason.trim());
      onClose();
    } catch (err) {
      const firstFieldError = err.data?.errors && Object.values(err.data.errors)[0]?.[0];
      setError(firstFieldError || err.message || "Gagal menghapus catatan.");
    } finally {
      setSaving(false);
    }
  }

  // Jenis yang bisa dipilih. Catatan lama berjenis yang sudah dihapus dari daftar (mis. "Prive pemilik")
  // tetap ditampilkan saat diubah supaya bisa diperbaiki tanpa mengganti jenisnya.
  const typeList = types?.[jenis] ?? [];
  const baseOptions = typeList.map((t) => t.name);
  const categoryOptions = entry && entry.type === jenis && entry.category && !baseOptions.includes(entry.category)
    ? [...baseOptions, entry.category]
    : baseOptions;
  const needsSub = !!typeList.find((t) => t.name === category)?.has_subcategory;
  const subOptions = categories?.[category] ?? [];
  const effect = typeEffect(types, jenis, category);

  function chooseCategory(value) {
    setCategory(value);
    setSubcategory("");
    setError("");
  }

  /** Kotak jenis memilih "+ Tambah": tampilkan pilihan efek dulu, simpan setelah dipilih. */
  async function handleAddType(name) {
    setError("");
    setNewType({ name, effect: "" });
    return null;
  }

  async function saveNewType() {
    if (!newType.effect) {
      setError("Pilih cara jenis baru ini dihitung di laporan.");
      return;
    }
    setNewTypeSaving(true);
    setError("");
    try {
      const res = await addFinanceType(jenis, newType.name, newType.effect);
      onTypesChange(res.types);
      chooseCategory(res.type.name);
      setNewType(null);
    } catch (err) {
      const firstFieldError = err.data?.errors && Object.values(err.data.errors)[0]?.[0];
      setError(firstFieldError || err.message || "Gagal menambah jenis.");
    } finally {
      setNewTypeSaving(false);
    }
  }

  /** Dipanggil kotak kategori saat memilih "+ Tambah "…"". Mengembalikan nama tersimpan. */
  async function handleAddSub(name) {
    setError("");
    try {
      const res = await addFinanceCategory(category, name);
      onCategoriesChange(res.categories);
      return res.name;
    } catch (err) {
      const firstFieldError = err.data?.errors && Object.values(err.data.errors)[0]?.[0];
      setError(firstFieldError || err.message || "Gagal menambah kategori.");
      throw err;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (newType) {
      setError("Simpan atau batalkan dulu jenis baru.");
      return;
    }
    if (!category || !amount) {
      setError("Jenis dan jumlah wajib diisi.");
      return;
    }
    if (needsSub && !subcategory) {
      setError("Pilih kategori, atau ketik nama lalu pilih \"Tambah\" untuk kategori baru.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ type: jenis, category, subcategory: needsSub ? subcategory : null, amount: Number(amount), date, description, method });
      onClose();
    } catch (err) {
      const firstFieldError = err.data?.errors && Object.values(err.data.errors)[0]?.[0];
      setError(firstFieldError || err.message || "Gagal menyimpan catatan.");
    } finally {
      setSaving(false);
    }
  }

  const netAmount = Number(amount) || 0;
  const preview = previewText(effect, category, `Rp${netAmount.toLocaleString("id-ID")}`);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">{entry ? "Ubah catatan kas" : "Catat pengeluaran"}</h2>
            <p className="text-[11px] text-neutral-400">
              {entry ? `Dicatat oleh ${entry.created_by ?? "—"}.` : "Catat transaksi kas di luar penjualan dan pembelian."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-4">
            {/* Uang masuk tidak dicatat manual: penjualan & pelunasan otomatis dari Kasir.
                Catatan uang masuk lama tetap bisa diperbaiki atau dihapus. */}
            {jenis === "masuk" ? (
              <p className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-[11px] text-green-800">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Catatan uang masuk lama. Uang masuk sekarang tidak dicatat manual, tapi catatan ini masih bisa diperbaiki atau dihapus.
              </p>
            ) : (
              <p className="flex items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-[11px] text-neutral-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Hanya untuk uang keluar. Uang masuk dari penjualan & pelunasan sudah tercatat otomatis dari Kasir.
              </p>
            )}

            {/* Jenis */}
            <div>
              <label htmlFor="catat-jenis" className="mb-1.5 block text-xs font-semibold text-neutral-900">Jenis</label>
              <CategoryCombobox
                key={jenis /* daftar berganti saat arah transaksi berganti */}
                id="catat-jenis"
                noun="jenis"
                value={category}
                options={categoryOptions}
                onChange={chooseCategory}
                onAdd={jenis === "keluar" ? handleAddType : undefined /* jenis uang masuk tidak bisa ditambah */}
              />

              {/* Jenis baru: wajib memilih cara dihitung di laporan sebelum disimpan */}
              {newType && (
                <div className="mt-2 space-y-2 rounded-lg border border-brand-100 bg-brand-50/60 p-3">
                  <p className="text-xs font-semibold text-neutral-900">
                    Jenis baru: <span className="text-brand-700">{newType.name}</span>
                  </p>
                  <fieldset>
                    <legend className="mb-1.5 text-[11px] text-neutral-600">Dihitung sebagai apa di laporan?</legend>
                    <div className="space-y-1.5">
                      {EFFECT_OPTIONS[jenis].map((opt) => (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex cursor-pointer items-start gap-2 rounded-lg border bg-white px-3 py-2 transition-colors",
                            newType.effect === opt.value ? "border-brand-600 ring-2 ring-brand-600/15" : "border-neutral-200 hover:border-neutral-300",
                          )}
                        >
                          <input
                            type="radio"
                            name="new-type-effect"
                            value={opt.value}
                            checked={newType.effect === opt.value}
                            onChange={() => { setNewType({ ...newType, effect: opt.value }); setError(""); }}
                            className="mt-0.5 accent-brand-600"
                          />
                          <span>
                            <span className="block text-xs font-semibold text-neutral-900">{opt.label}</span>
                            <span className="block text-[11px] text-neutral-500">{opt.hint}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <p className="text-[11px] text-neutral-500">Pilihan ini tidak bisa diubah setelah disimpan.</p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setNewType(null); setError(""); }}
                      className="h-8 rounded-lg px-3 text-xs font-semibold text-neutral-600 hover:bg-white"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={saveNewType}
                      disabled={newTypeSaving}
                      className="h-8 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {newTypeSaving ? "Menyimpan..." : "Simpan jenis"}
                    </button>
                  </div>
                </div>
              )}
              {!newType && jenis === "keluar" && <p className="mt-1 text-[11px] text-neutral-400">Tidak ada di daftar? Ketik namanya lalu pilih "Tambah".</p>}
            </div>

            {/* Kategori: hanya untuk Biaya operasional & Pemasukan lain, bisa ditambah admin */}
            {needsSub && (
              <div>
                <label htmlFor="catat-kategori" className="mb-1.5 block text-xs font-semibold text-neutral-900">Kategori</label>
                <CategoryCombobox
                  id="catat-kategori"
                  value={subcategory}
                  options={subOptions}
                  onChange={(name) => { setSubcategory(name); setError(""); }}
                  onAdd={handleAddSub}
                />
                <p className="mt-1 text-[11px] text-neutral-400">Tidak ada di daftar? Ketik namanya lalu pilih "Tambah".</p>
              </div>
            )}

            {/* Tanggal + Metode */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-900">Tanggal</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-900">Metode</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                >
                  <option value="tunai">Tunai</option>
                  <option value="transfer">Transfer</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>
            </div>

            {/* Jumlah */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-900">Jumlah</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">Rp</span>
                <input
                  type="number"
                  min={0}
                  placeholder="150.000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-xs tabular-nums text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                />
              </div>
            </div>

            {/* Catatan */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-900">Catatan</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Ongkos pengiriman barang ke toko"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs placeholder:text-neutral-400 text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15 resize-none"
              />
            </div>

            {/* Preview */}
            {netAmount > 0 && category && (
              <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="font-semibold">Pengaruh ke laporan</p>
                  <p className="mt-0.5">{preview}</p>
                  <p className="mt-0.5 text-brand-500">Transaksi akan dicatat pada {formatShortDate(toDate(date))}.</p>
                </div>
              </div>
            )}

            {confirmDelete && (
              <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/60 p-3">
                <p className="text-xs font-semibold text-red-700">Hapus catatan ini?</p>
                <p className="text-[11px] text-red-600">Catatan tidak lagi dihitung di laporan. Jejak dan alasannya tetap tersimpan.</p>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Alasan penghapusan, mis. salah input nominal"
                  aria-label="Alasan penghapusan"
                  className="w-full resize-none rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/15"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setConfirmDelete(false); setError(""); }} className="h-8 rounded-lg px-3 text-xs font-semibold text-neutral-600 hover:bg-white">
                    Batal hapus
                  </button>
                  <button type="button" onClick={handleDelete} disabled={saving} className="h-8 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                    {saving ? "Menghapus..." : "Hapus catatan"}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 border-t border-neutral-100 px-5 py-4">
            {entry && !confirmDelete && (
              <button
                type="button"
                onClick={() => { setConfirmDelete(true); setError(""); }}
                aria-label="Hapus catatan"
                className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || confirmDelete}
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
            >
              {saving && !confirmDelete ? "Menyimpan..." : entry ? "Simpan perubahan" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Unduh Modal ──────────────────────────────────────────────────────────────

const MAX_EXPORT_DAYS = 366;

/** Unduh laporan PDF / Excel. Rentang awal = periode yang sedang dilihat. */
function UnduhModal({ open, onClose, defaultStart, defaultEnd }) {
  const [format, setFormat] = useState("pdf");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const storeName = open ? getStoreProfile().name : "";

  useEffect(() => {
    if (!open) return;
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setError("");
  }, [open, defaultStart, defaultEnd]);

  const rangeError = !startDate || !endDate
    ? "Isi tanggal mulai dan tanggal akhir."
    : startDate > endDate
      ? "Tanggal akhir tidak boleh sebelum tanggal mulai."
      : (toDate(endDate) - toDate(startDate)) / 86400000 > MAX_EXPORT_DAYS
        ? `Rentang tanggal maksimal ${MAX_EXPORT_DAYS} hari.`
        : "";

  async function handleDownload() {
    if (rangeError) return;
    setDownloading(true);
    setError("");
    try {
      // Pilihan di modal "pdf" | "excel"; backend menerima "pdf" | "xlsx"
      await downloadFinanceReport({ start: startDate, end: endDate, format: format === "excel" ? "xlsx" : format });
      onClose();
    } catch (err) {
      setError(err.message || "Laporan gagal dibuat. Coba lagi.");
    } finally {
      setDownloading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Unduh laporan</h2>
            <p className="text-[11px] text-neutral-400">Pilih periode dan format laporan keuangan toko.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Rentang tanggal */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-neutral-900">Rentang tanggal</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] text-neutral-500">Tanggal mulai</label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-neutral-500">Tanggal akhir</label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                  />
                </div>
              </div>
            </div>
            {rangeError ? (
              <p role="alert" className="mt-1.5 text-[11px] text-red-600">{rangeError}</p>
            ) : (
              <p className="mt-1.5 text-[11px] text-neutral-400">
                Data hingga {formatShortDate(toDate(endDate))}. Termasuk kedua tanggal.
              </p>
            )}
          </div>

          {/* Format */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-neutral-900">Format File</label>
            <div className="space-y-2">
              <label className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                format === "pdf" ? "border-brand-600 bg-brand-50" : "border-neutral-200 hover:bg-neutral-50"
              )}>
                <input type="radio" name="format" value="pdf" checked={format === "pdf"} onChange={() => setFormat("pdf")} className="mt-0.5 accent-brand-600" />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
                    <FileText className="h-3.5 w-3.5 text-red-500" />
                    PDF
                  </div>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    Ringkasan 1-2 halaman berisi laba rugi, arus kas, dan indikator keuangan.
                  </p>
                </div>
              </label>
              <label className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                format === "excel" ? "border-brand-600 bg-brand-50" : "border-neutral-200 hover:bg-neutral-50"
              )}>
                <input type="radio" name="format" value="excel" checked={format === "excel"} onChange={() => setFormat("excel")} className="mt-0.5 accent-brand-600" />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                    Excel
                  </div>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    4 sheet: Ringkasan, Penjualan, Arus Kas, Transaksi kas. Cocok untuk analisis lebih lanjut.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Preview */}
          {!rangeError && (
            <div className="rounded-lg bg-neutral-50 px-3 py-2.5 text-[11px] text-neutral-600">
              <span className="font-semibold">{storeName}:</span>{" "}
              Periode {formatShortDate(toDate(startDate))} - {formatShortDate(toDate(endDate))}. Laporan memisahkan laba usaha dan
              pengeluaran kas agar mudah dibaca.
            </div>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-neutral-100 px-5 py-4">
          <button type="button" onClick={onClose} className="flex h-10 flex-1 items-center justify-center rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
            Batal
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || !!rangeError}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? "Menyiapkan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Semua transaksi kas ("Lihat semua") ──────────────────────────────────────

const PAGE_SIZE = 10;
const SOURCE_LABEL = { penjualan: "Kasir", pembelian: "Pembelian" };
const FIELD_SM =
  "h-9 rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15";

/** Daftar lengkap kas masuk / keluar pada periode terpilih. Catatan manual bisa diklik untuk diubah / dihapus. */
function SemuaKasModal({ open, ...props }) {
  // Isi panel baru dipasang saat dibuka: filter mulai dari awal dan tidak ada request saat tertutup
  return open ? <SemuaKasPanel {...props} /> : null;
}

function SemuaKasPanel({ onClose, initialType, start, end, rangeLabel, refreshKey, onEdit, types, categories }) {
  const [type, setType] = useState(initialType);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  // Kembali ke halaman 1 setiap filter berubah
  useEffect(() => setPage(1), [type, category, q, start, end]);

  const { entries, meta, loading, error } = useFinanceEntries(
    { start, end, type, category, q, page, perPage: PAGE_SIZE },
    refreshKey,
  );

  // Filter: jenis (termasuk penjualan otomatis dari Kasir) lalu kategori per jenis
  const jenisOptions = [...(type === "masuk" ? FINANCE_AUTO_CATEGORIES_IN : []), ...(types?.[type] ?? []).map((t) => t.name)];
  const subGroups = jenisOptions.filter((j) => categories?.[j]?.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
      <div role="dialog" aria-modal="true" aria-label="Semua transaksi kas" className="flex max-h-full w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Semua transaksi kas</h2>
            <p className="text-[11px] text-neutral-400">{rangeLabel} · klik catatan manual untuk mengubah atau menghapus</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 px-5 py-3">
          <div role="tablist" className="flex rounded-lg bg-neutral-100 p-0.5 text-xs font-semibold">
            {[["keluar", "Keluar"], ["masuk", "Masuk"]].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={type === id}
                onClick={() => { setType(id); setCategory(""); }}
                className={cn("rounded-md px-3 py-1.5 transition-colors", type === id ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700")}
              >
                {label}
              </button>
            ))}
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter jenis" className={FIELD_SM}>
            <option value="">Semua jenis</option>
            <optgroup label="Jenis">
              {jenisOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
            {subGroups.map((j) => (
              <optgroup key={j} label={`Kategori ${j.toLowerCase()}`}>
                {/* "Lainnya" ada di dua jenis; filter sudah dibatasi tab Masuk/Keluar */}
                {categories[j].map((c) => <option key={`${j}-${c}`} value={c}>{c}</option>)}
              </optgroup>
            ))}
          </select>
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari keterangan, nota, pelanggan..."
              aria-label="Cari transaksi kas"
              maxLength={80}
              className={cn(FIELD_SM, "w-full pl-9")}
            />
          </div>
        </div>

        <div className={cn("min-h-0 flex-1 overflow-auto transition-opacity", loading && "opacity-60")} aria-busy={loading}>
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0">
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Tanggal</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Jenis</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Keterangan</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Metode</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const manual = e.source === "manual";
                return (
                  <tr
                    key={e.id}
                    onClick={manual ? () => onEdit(e) : undefined}
                    className={cn("border-b border-neutral-100 last:border-0", manual ? "cursor-pointer hover:bg-brand-50/50" : "hover:bg-neutral-50")}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-500">{formatShortDate(toDate(e.date))}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      {e.category}
                      {e.subcategory && <span className="block text-[11px] text-neutral-400">{e.subcategory}</span>}
                      {!manual && (
                        <span className="ml-1.5 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">{SOURCE_LABEL[e.source]}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {e.source === "penjualan" ? (
                        <Link
                          to="/riwayat-transaksi"
                          state={{ search: e.reference }}
                          onClick={(ev) => ev.stopPropagation()}
                          className="text-brand-700 hover:underline"
                          title="Ubah dari Riwayat Transaksi"
                        >
                          {e.description}
                        </Link>
                      ) : (
                        e.description || "—"
                      )}
                      {e.customer_name && <span className="ml-1.5 text-[11px] text-neutral-400">{e.customer_name}</span>}
                    </td>
                    <td className="px-4 py-3 text-neutral-500 capitalize">{e.method || "Tunai"}</td>
                    <td className={cn("px-4 py-3 tabular-nums text-right", e.type === "masuk" ? "text-green-600" : "text-neutral-700")}>
                      {formatRupiah(e.amount)}
                      {manual && <span className="sr-only"> (klik untuk mengubah)</span>}
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    {error || "Tidak ada transaksi kas yang cocok pada periode ini."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 border-t border-neutral-100 px-5 py-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-neutral-900">Total {type === "masuk" ? "kas masuk" : "kas keluar"}{category ? ` · ${category}` : ""}</span>
            <span className={cn("tabular-nums", type === "masuk" ? "text-green-600" : "text-red-600")}>{formatRupiah(meta.total_amount)}</span>
          </div>
          <Pagination page={meta.page ?? 1} pageCount={meta.page_count ?? 1} total={meta.total} pageSize={PAGE_SIZE} onChange={setPage} itemLabel="transaksi" />
        </div>
      </div>
    </div>
  );
}

// ── Main Keuangan Page ───────────────────────────────────────────────────────

const EMPTY_SUMMARY = {
  pemasukan: 0, pengeluaran: 0, penjualan: 0, hpp: 0, laba_kotor: 0, biaya_operasional: 0,
  laba_usaha: 0, kas_masuk: 0, kas_keluar: 0, masuk_penjualan: 0, masuk_modal: 0, masuk_lainnya: 0,
  bayar_pemasok: 0, keluar_lainnya: 0, prive: 0, arus_kas_bersih: 0, saldo_awal: 0, saldo_akhir: 0, piutang: 0, jumlah_transaksi: 0,
};

// Klik di mana saja pada label langsung membuka kalender (input tanggal transparan menutupi label)
const openPicker = (e) => { try { e.currentTarget.showPicker?.(); } catch { /* browser lama: tetap bisa diketik */ } };

function DatePickerLabel({ label, value, onChange, withIcon = true, children }) {
  return (
    <label
      title={label}
      className="relative flex cursor-pointer items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 focus-within:ring-2 focus-within:ring-brand-600/30"
    >
      {withIcon && <Calendar className="h-3 w-3 text-neutral-400" aria-hidden />}
      {children}
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}

const signedRupiah = (n) => `${n < 0 ? "− " : "+ "}${formatRupiah(Math.abs(n))}`;

export default function KeuanganPage() {
  const [tab, setTab] = useState("harian");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  // Tab "Rentang": tanggal awal & akhir bebas (YYYY-MM-DD)
  const [rangeStart, setRangeStart] = useState(() => isoDate(addDays(new Date(), -6)));
  const [rangeEnd, setRangeEnd] = useState(() => isoDate(new Date()));
  const [catatOpen, setCatatOpen] = useState(false);
  const [unduhOpen, setUnduhOpen] = useState(false);
  const [customerQ, setCustomerQ] = useState("");
  const [incomeRefresh, setIncomeRefresh] = useState(0);
  const [incomePage, setIncomePage] = useState(1);
  const [editEntry, setEditEntry] = useState(null); // catatan manual yang sedang diubah
  const [semuaOpen, setSemuaOpen] = useState(false);

  const { report, loading, error, reload } = useFinanceReport(tab, isoDate(currentDate), rangeStart, rangeEnd);
  // Rincian & grafik per minggu (bulanan, atau rentang > 31 hari) atau per hari
  const perWeek = report?.period?.breakdown ? report.period.breakdown === "week" : tab === "bulanan";
  const { categories: cashCategories, setCategories: setCashCategories } = useFinanceCategories();
  const { types: cashTypes, setTypes: setCashTypes } = useFinanceTypes();

  // Muat ulang laporan + semua daftar kas setelah catatan ditambah / diubah / dihapus
  function refreshAll() {
    reload();
    setIncomeRefresh((k) => k + 1);
  }

  async function handleSave(data) {
    if (editEntry) await updateFinanceEntry(editEntry.entry_id, data);
    else await createFinanceEntry(data);
    refreshAll();
  }

  async function handleDelete(reason) {
    await deleteFinanceEntry(editEntry.entry_id, reason);
    refreshAll();
  }

  const openEdit = (entry) => {
    if (entry.source === "manual") setEditEntry(entry);
  };

  // ── date ranges ─────────────────────────────────────────────────────────

  const { startDate, endDate } = useMemo(() => {
    if (tab === "rentang") return { startDate: rangeStart, endDate: rangeEnd };
    if (tab === "harian") {
      const iso = isoDate(currentDate);
      return { startDate: iso, endDate: iso };
    }
    if (tab === "mingguan") {
      const mon = getMonday(currentDate);
      const sun = addDays(mon, 6);
      return { startDate: isoDate(mon), endDate: isoDate(sun) };
    }
    // bulanan
    const { start, end } = getMonthRange(currentDate);
    return { startDate: isoDate(start), endDate: isoDate(end) };
  }, [tab, currentDate, rangeStart, rangeEnd]);

  // ── stats (dihitung backend: FinanceService) ─────────────────────────────

  const s = report?.summary ?? EMPTY_SUMMARY;
  const stats = {
    pemasukan: s.pemasukan, pengeluaran: s.pengeluaran, penjualan: s.penjualan, hppTerjual: s.hpp,
    labaKotor: s.laba_kotor, biayaOperasional: s.biaya_operasional, prive: s.prive, labaUsaha: s.laba_usaha,
    masukPenjualan: s.masuk_penjualan, masukModal: s.masuk_modal ?? 0, masukLainnya: s.masuk_lainnya, bayarPemasok: s.bayar_pemasok,
    keluarLainnya: s.keluar_lainnya ?? 0,
    arusKasBersih: s.arus_kas_bersih, saldoAwal: s.saldo_awal, saldoAkhir: s.saldo_akhir, piutang: s.piutang,
  };

  // ── pemasukan + cari pelanggan ───────────────────────────────────────────

  // Halaman kembali ke 1 saat pencarian / periode berubah
  useEffect(() => setIncomePage(1), [customerQ, startDate, endDate]);

  const { entries: incomeEntries, meta: incomeMeta, loading: incomeLoading, error: incomeError } = useFinanceEntries(
    { start: startDate, end: endDate, type: "masuk", search: customerQ, page: incomePage, perPage: PAGE_SIZE },
    incomeRefresh,
  );
  const totalIncome = incomeMeta.total_amount ?? 0; // total seluruh halaman, bukan hanya yang tampil

  // ── date navigation ──────────────────────────────────────────────────────

  function navigate(dir) {
    if (tab === "rentang") {
      // Geser rentang sepanjang dirinya sendiri, mis. 7 hari -> 7 hari sebelumnya / sesudahnya
      const days = Math.round((toDate(rangeEnd) - toDate(rangeStart)) / 86400000) + 1;
      setRangeStart(isoDate(addDays(toDate(rangeStart), dir * days)));
      setRangeEnd(isoDate(addDays(toDate(rangeEnd), dir * days)));
    } else if (tab === "harian") setCurrentDate((d) => addDays(d, dir));
    else if (tab === "mingguan") setCurrentDate((d) => addDays(d, dir * 7));
    else setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
  }

  // Pindah ke tab Rentang: mulai dari periode yang sedang dilihat
  function chooseTab(t) {
    if (t === "rentang" && tab !== "rentang") {
      setRangeStart(startDate);
      setRangeEnd(endDate);
    }
    setTab(t);
  }

  // Tanggal awal tidak boleh melewati tanggal akhir (dan sebaliknya): ujung lainnya ikut digeser
  function changeRangeStart(v) {
    if (!v) return;
    setRangeStart(v);
    if (v > rangeEnd) setRangeEnd(v);
  }
  function changeRangeEnd(v) {
    if (!v) return;
    setRangeEnd(v);
    if (v < rangeStart) setRangeStart(v);
  }

  const dateLabel = useMemo(() => {
    if (tab === "harian") return formatShortDate(currentDate);
    if (tab === "mingguan") return getWeekLabel(currentDate);
    return formatShortMonth(currentDate);
  }, [tab, currentDate]);

  // ── rincian: per hari (harian/mingguan) atau per minggu (bulanan) ───────

  const dailyRows = useMemo(
    () =>
      (report?.breakdown ?? []).map((b) => ({
        iso: b.start,
        label: perWeek
          ? `${b.label} · ${formatShortDate(toDate(b.start)).replace(/\s\d{4}$/, "")} - ${formatShortDate(toDate(b.end))}`
          : formatShortDate(toDate(b.start)),
        penjualan: b.penjualan,
        kasMasuk: b.kas_masuk,
        kasKeluar: b.kas_keluar,
        labaUsaha: b.laba_usaha,
        hasData: b.has_data,
      })),
    [report, perWeek]
  );

  // ── operational costs for current period ─────────────────────────────────

  const opCosts = report?.operational_costs ?? [];
  const totalOpCost = stats.biayaOperasional;

  // ── pilihan minggu (tab mingguan): minggu-minggu di bulan yang sedang dilihat ─
  const weeksInMonth = useMemo(() => getWeeksInMonth(currentDate), [currentDate]);
  const selectedWeekStart = isoDate(getMonday(currentDate));
  const selectedWeekNo = weeksInMonth.findIndex((w) => w.start === selectedWeekStart) + 1;

  // ── warning: penjualan belum lunas (piutang) ─────────────────────────────
  const pendingSalesWarning = stats.piutang > 0;

  // ── the "week" range label ────────────────────────────────────────────────
  const rangeLabel = useMemo(() => {
    if (tab === "rentang") {
      return startDate === endDate ? formatShortDate(toDate(startDate)) : `${formatShortDate(toDate(startDate))} - ${formatShortDate(toDate(endDate))}`;
    }
    if (tab === "harian") return formatShortDate(toDate(startDate));
    if (tab === "mingguan") {
      const prefix = selectedWeekNo > 0 ? `Minggu ${selectedWeekNo} · ` : "";
      return `${prefix}${formatShortDate(toDate(startDate))} - ${formatShortDate(toDate(endDate))}`;
    }
    return `${formatShortMonth(currentDate)} · ${dailyRows.length} minggu`;
  }, [tab, startDate, endDate, currentDate, selectedWeekNo, dailyRows.length]);

  return (
    <DashboardLayout breadcrumb="Keuangan">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Keuangan</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Lihat laba yang sebenarnya, bukan hanya uang yang masuk.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date nav: panah geser periode; klik tanggal membuka kalender */}
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1.5">
            <button type="button" aria-label="Periode sebelumnya" onClick={() => navigate(-1)} className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {tab === "rentang" ? (
              <div className="flex items-center gap-1">
                <DatePickerLabel label="Dari tanggal" value={rangeStart} onChange={changeRangeStart}>
                  {formatShortDate(toDate(rangeStart))}
                </DatePickerLabel>
                <span className="text-[11px] text-neutral-400">s/d</span>
                <DatePickerLabel label="Sampai tanggal" value={rangeEnd} onChange={changeRangeEnd} withIcon={false}>
                  {formatShortDate(toDate(rangeEnd))}
                </DatePickerLabel>
              </div>
            ) : (
              <DatePickerLabel
                label={tab === "bulanan" ? "Pilih bulan (klik tanggal mana saja di bulan itu)" : tab === "mingguan" ? "Pilih minggu (klik tanggal mana saja di minggu itu)" : "Pilih tanggal"}
                value={isoDate(currentDate)}
                onChange={(v) => v && setCurrentDate(toDate(v))}
              >
                {dateLabel}
              </DatePickerLabel>
            )}
            <button type="button" aria-label="Periode berikutnya" onClick={() => navigate(1)} className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setUnduhOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Unduh laporan
          </button>
          <Button size="sm" fullWidth={false} onClick={() => setCatatOpen(true)}>
            <Plus className="h-4 w-4" />
            Catat pengeluaran
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mt-4 flex gap-0 rounded-lg bg-neutral-100 p-1 w-fit">
        {["harian", "mingguan", "bulanan", "rentang"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => chooseTab(t)}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-semibold capitalize transition-colors",
              tab === t ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            {t === "rentang" ? "Custom" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Week selector (mingguan only) */}
      {tab === "mingguan" && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {weeksInMonth.map((w, i) => {
            const mon = w.mon;
            const isSelected = w.start === selectedWeekStart;
            return (
              <button
                key={w.start}
                type="button"
                onClick={() => setCurrentDate(mon)}
                className={cn(
                  "flex-shrink-0 rounded-xl border px-4 py-3 text-left transition-colors",
                  isSelected ? "border-brand-600 bg-brand-600 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                )}
              >
                <p className={cn("text-[11px] font-semibold", isSelected ? "text-brand-200" : "text-neutral-400")}>
                  Minggu {i + 1}
                </p>
                <p className={cn("text-xs font-semibold mt-0.5", isSelected ? "text-white" : "text-neutral-700")}>
                  {formatShortDate(mon).replace(/\d{4}/, "").trim()}
                </p>
                {isSelected && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-brand-200">
                    ✓ Tampil
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </span>
          <button type="button" onClick={reload} className="font-semibold underline">Coba lagi</button>
        </div>
      )}

      {/* Stat cards */}
      <div className={cn("mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
        <Card className="p-4">
          <p className="text-[11px] text-neutral-500">Pemasukan</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-neutral-900">{formatRupiah(stats.pemasukan)}</p>
          <p className="mt-1 text-[11px] text-neutral-400">Penjualan aktual terkonfirmasi</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-neutral-500">Pengeluaran</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-neutral-900">{formatRupiah(stats.pengeluaran)}</p>
          <p className="mt-1 text-[11px] text-neutral-400">Pembelian, operasional & prive</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-neutral-500">Laba usaha</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-neutral-900">{formatRupiah(stats.labaUsaha)}</p>
          <p className="mt-1 text-[11px] text-neutral-400">Setelah biaya operasional</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-neutral-500">Arus kas bersih</p>
          <p className={cn("mt-1 text-xl font-bold tabular-nums", stats.arusKasBersih >= 0 ? "text-green-600" : "text-red-600")}>
            {signedRupiah(stats.arusKasBersih)}
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">Perubahan saldo kas vs pengeluaran</p>
        </Card>
      </div>

      {/* Grafik */}
      <FinanceCharts charts={report?.charts} tab={tab} perWeek={perWeek} loading={loading} />

      {/* Two column: Laba Rugi + Arus Kas */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Ringkasan laba rugi */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900">Ringkasan laba rugi</h2>
            <span className="text-[11px] text-neutral-400">{loading ? "Memuat..." : dateLabel}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-600">Penjualan</span>
              <span className="tabular-nums font-semibold text-neutral-900">{formatRupiah(stats.penjualan)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">HPP barang terjual</span>
              <span className="tabular-nums text-red-600">− {formatRupiah(stats.hppTerjual)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-xs">
              <span className="font-semibold text-neutral-700">Laba kotor</span>
              <span className="tabular-nums font-semibold text-neutral-900">{formatRupiah(stats.labaKotor)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Biaya operasional</span>
              <span className="tabular-nums text-red-600">− {formatRupiah(stats.biayaOperasional)}</span>
            </div>
            <div className="border-t border-neutral-100 pt-2">
              <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm font-bold">
                <span className="text-neutral-900">Laba usaha</span>
                <span className={cn("tabular-nums", stats.labaUsaha >= 0 ? "text-brand-700" : "text-red-700")}>
                  {formatRupiah(stats.labaUsaha)}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-neutral-400 leading-relaxed">
            HPP hanya untuk barang yang terjual. Barang yang belum terjual tetap menjadi aset persediaan.
          </p>
        </Card>

        {/* Arus kas */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900">Arus kas</h2>
            <span className="text-[11px] text-neutral-400">Kas & Bank</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-600">Penjualan dibayar</span>
              <span className="tabular-nums font-semibold text-green-600">+ {formatRupiah(stats.masukPenjualan)}</span>
            </div>
            {stats.masukModal > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-600">Modal pemilik</span>
                <span className="tabular-nums font-semibold text-green-600">+ {formatRupiah(stats.masukModal)}</span>
              </div>
            )}
            {stats.masukLainnya > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-600">Pemasukan lain</span>
                <span className="tabular-nums font-semibold text-green-600">+ {formatRupiah(stats.masukLainnya)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Bayar pemasok</span>
              <span className="tabular-nums text-red-600">− {formatRupiah(stats.bayarPemasok)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Operasional</span>
              <span className="tabular-nums text-red-600">− {formatRupiah(stats.biayaOperasional)}</span>
            </div>
            {/* Jenis "bukan biaya" buatan admin, mis. cicilan pinjaman */}
            {stats.keluarLainnya > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Pengeluaran lain</span>
                <span className="tabular-nums text-red-600">− {formatRupiah(stats.keluarLainnya)}</span>
              </div>
            )}
            {/* Hanya muncul untuk catatan lama; jenis Prive pemilik tidak bisa dipilih lagi */}
            {stats.prive > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Prive pemilik</span>
                <span className="tabular-nums text-neutral-500">− {formatRupiah(stats.prive)}</span>
              </div>
            )}
            <div className="border-t border-neutral-100 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-700">Arus kas bersih</span>
                <span className={cn("tabular-nums font-semibold", stats.arusKasBersih >= 0 ? "text-green-600" : "text-red-600")}>
                  {signedRupiah(stats.arusKasBersih)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Saldo awal</span>
                <span className="tabular-nums text-neutral-600">{formatRupiah(stats.saldoAwal)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm font-bold">
              <span className="text-neutral-900">Saldo akhir</span>
              <span className="tabular-nums text-brand-700">{formatRupiah(stats.saldoAkhir)}</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-neutral-400 leading-relaxed">
            Saldo awal = saldo akhir periode sebelumnya. Arus kas bersih bisa berbeda dari laba usaha.
          </p>
        </Card>
      </div>

      {/* Warning: unpaid sales */}
      {pendingSalesWarning && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {formatRupiah(stats.piutang)} penjualan belum lunas, belum masuk kas.
          </span>
        </div>
      )}

      {/* Rincian harian table */}
      <Card className="mt-4 p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-neutral-900">Rincian {perWeek ? "per minggu" : "harian"}</h2>
          <span className="text-[11px] text-neutral-400">{rangeLabel}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Tanggal</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Penjualan</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Kas Masuk</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Kas Keluar</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Laba Usaha</th>
              </tr>
            </thead>
            <tbody>
              {dailyRows.filter((r) => r.hasData).map((row) => (
                <tr key={row.iso} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-700">{row.label}</td>
                  <td className="px-4 py-3 tabular-nums text-right text-neutral-700">{formatRupiah(row.penjualan)}</td>
                  <td className="px-4 py-3 tabular-nums text-right text-neutral-700">{formatRupiah(row.kasMasuk)}</td>
                  <td className="px-4 py-3 tabular-nums text-right text-neutral-700">{formatRupiah(row.kasKeluar)}</td>
                  <td className={cn(
                    "px-4 py-3 tabular-nums text-right font-semibold",
                    row.labaUsaha >= 0 ? "text-brand-700" : "text-red-600"
                  )}>
                    {formatRupiah(row.labaUsaha)}
                  </td>
                </tr>
              ))}
              {/* Total row */}
              <tr className="bg-neutral-50 border-t border-neutral-200 font-semibold">
                <td className="px-4 py-3 text-neutral-900">Total</td>
                <td className="px-4 py-3 tabular-nums text-right text-neutral-900">{formatRupiah(dailyRows.reduce((s, r) => s + r.penjualan, 0))}</td>
                <td className="px-4 py-3 tabular-nums text-right text-neutral-900">{formatRupiah(dailyRows.reduce((s, r) => s + r.kasMasuk, 0))}</td>
                <td className="px-4 py-3 tabular-nums text-right text-neutral-900">{formatRupiah(dailyRows.reduce((s, r) => s + r.kasKeluar, 0))}</td>
                <td className={cn(
                  "px-4 py-3 tabular-nums text-right",
                  stats.labaUsaha >= 0 ? "text-brand-700" : "text-red-600"
                )}>
                  {formatRupiah(stats.labaUsaha)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="px-5 py-2 text-[11px] text-neutral-400">
          * {perWeek ? "Minggu" : "Hari"} tanpa transaksi tidak ditampilkan.
        </p>
      </Card>

      {/* Biaya operasional */}
      <Card className="mt-4 p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-neutral-900">Biaya operasional</h2>
          <button type="button" onClick={() => setSemuaOpen(true)} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            Lihat semua →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Tanggal</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Kategori/Biaya</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Metode</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {opCosts.slice(0, 6).map((e) => (
                <tr
                  key={e.id}
                  onClick={() => openEdit(e)}
                  title="Klik untuk mengubah atau menghapus"
                  className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td className="px-4 py-3 text-neutral-500">
                    {toDate(e.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {e.description || entryLabel(e)}
                    {e.description && <span className="ml-1.5 text-[11px] text-neutral-400">{entryLabel(e)}</span>}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 capitalize">{e.method || "Tunai"}</td>
                  <td className="px-4 py-3 tabular-nums text-right text-neutral-700">{formatRupiah(e.amount)}</td>
                </tr>
              ))}
              <tr className="bg-neutral-50 border-t border-neutral-200 font-semibold">
                <td colSpan={3} className="px-4 py-3 text-neutral-900">Total biaya operasional</td>
                <td className="px-4 py-3 tabular-nums text-right text-red-600">{formatRupiah(totalOpCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pemasukan + cari pelanggan */}
      <Card className="mt-4 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Pemasukan</h2>
            <p className="text-[11px] text-neutral-400">
              {customerQ.trim() ? "Penjualan & pelunasan pelanggan yang dicari" : "Semua kas masuk"} · {rangeLabel}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" aria-hidden />
            <input
              type="search"
              value={customerQ}
              onChange={(e) => setCustomerQ(e.target.value)}
              placeholder="Cari nama / no. HP pelanggan..."
              aria-label="Cari pelanggan"
              maxLength={80}
              className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
            />
          </div>
        </div>
        <div className={cn("overflow-x-auto transition-opacity", incomeLoading && "opacity-60")} aria-busy={incomeLoading}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Tanggal</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Pelanggan</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Keterangan</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Metode</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {incomeEntries.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => openEdit(e)}
                  title={e.source === "manual" ? "Klik untuk mengubah atau menghapus" : undefined}
                  className={cn("border-b border-neutral-100 last:border-0 hover:bg-neutral-50", e.source === "manual" && "cursor-pointer")}
                >
                  <td className="px-4 py-3 text-neutral-500">
                    {toDate(e.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{e.customer_name ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-700">
                    {e.description || entryLabel(e)}
                    {e.description && e.description !== entryLabel(e) && (
                      <span className="ml-1.5 text-[11px] text-neutral-400">{entryLabel(e)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 capitalize">{e.method || "Tunai"}</td>
                  <td className="px-4 py-3 tabular-nums text-right text-green-600">{formatRupiah(e.amount)}</td>
                </tr>
              ))}
              {incomeEntries.length === 0 && !incomeLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                    {incomeError || (customerQ.trim() ? "Tidak ada pemasukan dari pelanggan tersebut di periode ini." : "Belum ada pemasukan di periode ini.")}
                  </td>
                </tr>
              )}
              <tr className="bg-neutral-50 border-t border-neutral-200 font-semibold">
                <td colSpan={4} className="px-4 py-3 text-neutral-900">Total pemasukan</td>
                <td className="px-4 py-3 tabular-nums text-right text-green-600">{formatRupiah(totalIncome)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Pagination
          className="border-t border-neutral-100 px-5 py-3"
          page={incomeMeta.page ?? 1}
          pageCount={incomeMeta.page_count ?? 1}
          total={incomeMeta.total}
          pageSize={PAGE_SIZE}
          onChange={setIncomePage}
          itemLabel="pemasukan"
        />
      </Card>

      {/* Modals (CatatModal terakhir supaya tampil di atas panel "Lihat semua") */}
      <SemuaKasModal
        open={semuaOpen}
        onClose={() => setSemuaOpen(false)}
        initialType="keluar"
        start={startDate}
        end={endDate}
        rangeLabel={rangeLabel}
        refreshKey={incomeRefresh}
        onEdit={openEdit}
        types={cashTypes}
        categories={cashCategories}
      />
      <UnduhModal open={unduhOpen} onClose={() => setUnduhOpen(false)} defaultStart={startDate} defaultEnd={endDate} />
      <CatatModal
        open={catatOpen || !!editEntry}
        entry={editEntry}
        onClose={() => { setCatatOpen(false); setEditEntry(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
        types={cashTypes}
        categories={cashCategories}
        onCategoriesChange={setCashCategories}
        onTypesChange={setCashTypes}
      />
    </DashboardLayout>
  );
}
