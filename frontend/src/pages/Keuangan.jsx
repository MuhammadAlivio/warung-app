import { useMemo, useState } from "react";
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
  X,
} from "lucide-react";
import DashboardLayout from "../lib/components/layout/DashboardLayout";
import { Button, Card } from "../lib/components/ui";
import { formatRupiah } from "../lib/utils/format";
import { cn } from "../lib/utils/cn";
import { createFinanceEntry, useFinanceEntries, useFinanceReport } from "../lib/hooks/useFinance";
import {
  FINANCE_CATEGORIES_IN,
  FINANCE_CATEGORIES_OUT,
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

// ── Catat Modal ──────────────────────────────────────────────────────────────

function CatatModal({ open, onClose, onSave }) {
  const [jenis, setJenis] = useState("keluar");
  const [jenisTipe, setJenisTipe] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [method, setMethod] = useState("tunai");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const OUT_TYPES = [
    { value: "biaya_operasional", label: "Biaya operasional" },
    { value: "prive_pemilik", label: "Prive pemilik" },
  ];
  const IN_TYPES = [
    { value: "penjualan", label: "Penjualan" },
    { value: "pelunasan", label: "Pelunasan piutang" },
  ];
  const categoryOptions = jenis === "masuk" ? FINANCE_CATEGORIES_IN : FINANCE_CATEGORIES_OUT;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!category || !amount) {
      setError("Jenis dan jumlah wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ type: jenis, category, amount: Number(amount), date, description, method });
      setAmount(""); setDescription(""); setCategory(""); setJenisTipe("");
      onClose();
    } catch (err) {
      const firstFieldError = err.data?.errors && Object.values(err.data.errors)[0]?.[0];
      setError(firstFieldError || err.message || "Gagal menyimpan catatan.");
    } finally {
      setSaving(false);
    }
  }

  const netAmount = Number(amount) || 0;
  const preview = jenis === "keluar"
    ? `Kas berkurang Rp${netAmount.toLocaleString("id-ID")} dan laba usaha berkurang Rp${netAmount.toLocaleString("id-ID")} sebagai biaya operasional.`
    : `Kas bertambah Rp${netAmount.toLocaleString("id-ID")}.`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Catat masuk / keluar</h2>
            <p className="text-[11px] text-neutral-400">Catat transaksi kas di luar penjualan dan pembelian.</p>
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
            {/* Transaksi toggle */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-900">Transaksi</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setJenis("keluar"); setCategory(""); }}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-colors",
                    jenis === "keluar"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  ↑ Uang keluar
                </button>
                <button
                  type="button"
                  onClick={() => { setJenis("masuk"); setCategory(""); }}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-colors",
                    jenis === "masuk"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  ↓ Uang masuk
                </button>
              </div>
            </div>

            {/* Jenis */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-900">Jenis</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
              >
                <option value="">Pilih jenis</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Kategori */}
            {category && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-900">Kategori</label>
                <select
                  value={jenisTipe}
                  onChange={(e) => setJenisTipe(e.target.value)}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                >
                  <option value="">Transportasi</option>
                  <option value="listrik">Listrik & Air</option>
                  <option value="sewa">Sewa toko</option>
                  <option value="gaji">Gaji</option>
                  <option value="lainnya">Biaya lainnya</option>
                </select>
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
            {netAmount > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="font-semibold">Pengaruh ke laporan</p>
                  <p className="mt-0.5">{preview}</p>
                  <p className="mt-0.5 text-brand-500">Transaksi akan dicatat pada {formatShortDate(toDate(date))}.</p>
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
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Unduh Modal ──────────────────────────────────────────────────────────────

function UnduhModal({ open, onClose, dateLabel }) {
  const [format, setFormat] = useState("pdf");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-10-17");

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
            <p className="mt-1.5 text-[11px] text-neutral-400">
              Data hingga {formatShortDate(toDate(endDate))}. Termasuk kedua tanggal.
            </p>
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
          <div className="rounded-lg bg-neutral-50 px-3 py-2.5 text-[11px] text-neutral-600">
            <span className="font-semibold">Toko Sumber Rezeki:</span>{" "}
            Periode {formatShortDate(toDate(startDate))} - {formatShortDate(toDate(endDate))}. Laporan memisahkan laba usaha dan
            pengeluaran kas agar mudah dibaca.
          </div>
        </div>

        <div className="flex gap-2 border-t border-neutral-100 px-5 py-4">
          <button type="button" onClick={onClose} className="flex h-10 flex-1 items-center justify-center rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
            Batal
          </button>
          <button type="button" onClick={onClose} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700">
            <Download className="h-3.5 w-3.5" />
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Keuangan Page ───────────────────────────────────────────────────────

const EMPTY_SUMMARY = {
  pemasukan: 0, pengeluaran: 0, penjualan: 0, hpp: 0, laba_kotor: 0, biaya_operasional: 0,
  laba_usaha: 0, kas_masuk: 0, kas_keluar: 0, masuk_penjualan: 0, masuk_lainnya: 0,
  bayar_pemasok: 0, prive: 0, arus_kas_bersih: 0, saldo_awal: 0, saldo_akhir: 0, piutang: 0, jumlah_transaksi: 0,
};

const signedRupiah = (n) => `${n < 0 ? "− " : "+ "}${formatRupiah(Math.abs(n))}`;

export default function KeuanganPage() {
  const [tab, setTab] = useState("harian");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [catatOpen, setCatatOpen] = useState(false);
  const [unduhOpen, setUnduhOpen] = useState(false);
  const [customerQ, setCustomerQ] = useState("");
  const [incomeRefresh, setIncomeRefresh] = useState(0);

  const { report, loading, error, reload } = useFinanceReport(tab, isoDate(currentDate));

  async function handleSave(data) {
    await createFinanceEntry(data);
    reload();
    setIncomeRefresh((k) => k + 1);
  }

  // ── date ranges ─────────────────────────────────────────────────────────

  const { startDate, endDate } = useMemo(() => {
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
  }, [tab, currentDate]);

  // ── stats (dihitung backend: FinanceService) ─────────────────────────────

  const s = report?.summary ?? EMPTY_SUMMARY;
  const stats = {
    pemasukan: s.pemasukan, pengeluaran: s.pengeluaran, penjualan: s.penjualan, hppTerjual: s.hpp,
    labaKotor: s.laba_kotor, biayaOperasional: s.biaya_operasional, prive: s.prive, labaUsaha: s.laba_usaha,
    masukPenjualan: s.masuk_penjualan, masukLainnya: s.masuk_lainnya, bayarPemasok: s.bayar_pemasok,
    arusKasBersih: s.arus_kas_bersih, saldoAwal: s.saldo_awal, saldoAkhir: s.saldo_akhir, piutang: s.piutang,
  };

  // ── pemasukan + cari pelanggan ───────────────────────────────────────────

  const { entries: incomeEntries, loading: incomeLoading, error: incomeError } = useFinanceEntries(
    { start: startDate, end: endDate, type: "masuk", search: customerQ },
    incomeRefresh,
  );
  const totalIncome = incomeEntries.reduce((sum, e) => sum + e.amount, 0);

  // ── date navigation ──────────────────────────────────────────────────────

  function navigate(dir) {
    if (tab === "harian") setCurrentDate((d) => addDays(d, dir));
    else if (tab === "mingguan") setCurrentDate((d) => addDays(d, dir * 7));
    else setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
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
        label: tab === "bulanan"
          ? `${b.label} · ${formatShortDate(toDate(b.start)).replace(/\s\d{4}$/, "")} - ${formatShortDate(toDate(b.end))}`
          : formatShortDate(toDate(b.start)),
        penjualan: b.penjualan,
        kasMasuk: b.kas_masuk,
        kasKeluar: b.kas_keluar,
        labaUsaha: b.laba_usaha,
        hasData: b.has_data,
      })),
    [report, tab]
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
          {/* Date nav */}
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1.5">
            <button type="button" onClick={() => navigate(-1)} className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="flex items-center gap-1.5 px-2 text-xs font-semibold text-neutral-700">
              <Calendar className="h-3 w-3 text-neutral-400" />
              {dateLabel}
            </button>
            <button type="button" onClick={() => navigate(1)} className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100">
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
            Catat masuk / keluar
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mt-4 flex gap-0 rounded-lg bg-neutral-100 p-1 w-fit">
        {["harian", "mingguan", "bulanan"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-semibold capitalize transition-colors",
              tab === t ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
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
        <Card className="p-4 bg-brand-700 text-white border-brand-700">
          <p className="text-[11px] text-brand-300">Laba usaha</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatRupiah(stats.labaUsaha)}</p>
          <p className="mt-1 text-[11px] text-brand-300">Setelah biaya operasional</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-neutral-500">Arus kas bersih</p>
          <p className={cn("mt-1 text-xl font-bold tabular-nums", stats.arusKasBersih >= 0 ? "text-green-600" : "text-red-600")}>
            {signedRupiah(stats.arusKasBersih)}
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">Perubahan saldo kas vs pengeluaran</p>
        </Card>
      </div>

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
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Prive pemilik</span>
              <span className="tabular-nums text-neutral-500">− {formatRupiah(stats.prive)}</span>
            </div>
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
          <h2 className="text-sm font-bold text-neutral-900">Rincian {tab === "mingguan" ? "harian" : tab === "harian" ? "harian" : "per periode"}</h2>
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
          * {tab === "bulanan" ? "Minggu" : "Hari"} tanpa transaksi tidak ditampilkan.
        </p>
      </Card>

      {/* Biaya operasional */}
      <Card className="mt-4 p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-neutral-900">Biaya operasional</h2>
          <button type="button" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
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
                <tr key={e.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-500">
                    {toDate(e.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{e.description || e.category}</td>
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
                <tr key={e.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-500">
                    {toDate(e.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{e.customer_name ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-700">
                    {e.description || e.category}
                    {e.description && e.description !== e.category && (
                      <span className="ml-1.5 text-[11px] text-neutral-400">{e.category}</span>
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
      </Card>

      {/* Modals */}
      <CatatModal open={catatOpen} onClose={() => setCatatOpen(false)} onSave={handleSave} />
      <UnduhModal open={unduhOpen} onClose={() => setUnduhOpen(false)} dateLabel={dateLabel} />
    </DashboardLayout>
  );
}
