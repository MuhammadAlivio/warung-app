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
  X,
} from "lucide-react";
import DashboardLayout from "../lib/components/layout/DashboardLayout";
import { Button, Card } from "../lib/components/ui";
import { formatRupiah } from "../lib/utils/format";
import { cn } from "../lib/utils/cn";
import { useFinance } from "../lib/stores/FinanceContext";
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

// Group entries by day for daily table
function groupByDate(entries) {
  const map = {};
  for (const e of entries) {
    if (!map[e.date]) map[e.date] = [];
    map[e.date].push(e);
  }
  return map;
}

// Get all days in a week
function getDaysInRange(start, end) {
  const days = [];
  let cur = new Date(start);
  while (cur <= end) {
    days.push(isoDate(cur));
    cur = addDays(cur, 1);
  }
  return days;
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
  const [date, setDate] = useState(isoDate(new Date(2026, 9, 17))); // 17 Oct 2026
  const [method, setMethod] = useState("tunai");
  const [description, setDescription] = useState("");

  const OUT_TYPES = [
    { value: "biaya_operasional", label: "Biaya operasional" },
    { value: "prive_pemilik", label: "Prive pemilik" },
  ];
  const IN_TYPES = [
    { value: "penjualan", label: "Penjualan" },
    { value: "pelunasan", label: "Pelunasan piutang" },
  ];
  const categoryOptions = jenis === "masuk" ? FINANCE_CATEGORIES_IN : FINANCE_CATEGORIES_OUT;

  function handleSubmit(e) {
    e.preventDefault();
    if (!category || !amount) return;
    onSave({ type: jenis, category, amount: Number(amount), date, description, method, createdBy: "Admin" });
    setAmount(""); setDescription(""); setCategory(""); setJenisTipe("");
    onClose();
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
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              Simpan
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

export default function KeuanganPage() {
  const { entries, addEntry } = useFinance();

  const REF_DATE = new Date(2026, 9, 17); // 17 Oct 2026

  const [tab, setTab] = useState("harian");
  const [currentDate, setCurrentDate] = useState(REF_DATE);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(1); // week index in monthly view
  const [catatOpen, setCatatOpen] = useState(false);
  const [unduhOpen, setUnduhOpen] = useState(false);

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

  // ── filtered entries ─────────────────────────────────────────────────────

  const filtered = useMemo(
    () => entries.filter((e) => e.date >= startDate && e.date <= endDate),
    [entries, startDate, endDate]
  );

  // ── stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const penjualan = filtered
      .filter((e) => e.type === "masuk" && e.category === "Penjualan")
      .reduce((s, e) => s + e.amount, 0);
    const pemasukan = filtered.filter((e) => e.type === "masuk").reduce((s, e) => s + e.amount, 0);
    const pengeluaran = filtered.filter((e) => e.type === "keluar").reduce((s, e) => s + e.amount, 0);
    const hppTerjual = filtered
      .filter((e) => e.type === "keluar" && e.category === "Pembelian barang")
      .reduce((s, e) => s + e.amount, 0);
    const labaKotor = penjualan - hppTerjual;
    const biayaOperasional = filtered
      .filter((e) => e.type === "keluar" && e.category !== "Pembelian barang" && e.category !== "Prive pemilik")
      .reduce((s, e) => s + e.amount, 0);
    const prive = filtered
      .filter((e) => e.type === "keluar" && e.category === "Prive pemilik")
      .reduce((s, e) => s + e.amount, 0);
    const labaUsaha = labaKotor - biayaOperasional;
    const kasMasuk = pemasukan;
    const kasKeluar = pengeluaran;
    const arusKasBersih = kasMasuk - kasKeluar;
    // Saldo awal mock: Rp5.000.000
    const saldoAwal = 5000000;
    const saldoAkhir = saldoAwal + arusKasBersih;

    return {
      pemasukan, pengeluaran, penjualan, hppTerjual, labaKotor,
      biayaOperasional, prive, labaUsaha, kasMasuk, kasKeluar,
      arusKasBersih, saldoAwal, saldoAkhir,
    };
  }, [filtered]);

  // ── date navigation ──────────────────────────────────────────────────────

  function navigate(dir) {
    if (tab === "harian") setCurrentDate((d) => addDays(d, dir));
    else if (tab === "mingguan") setCurrentDate((d) => addDays(d, dir * 7));
    else setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
  }

  const dateLabel = useMemo(() => {
    if (tab === "harian") {
      return `${formatShortDate(currentDate)} - ${formatShortDate(addDays(currentDate, 6))}`;
    }
    if (tab === "mingguan") return getWeekLabel(currentDate);
    return formatShortMonth(currentDate);
  }, [tab, currentDate]);

  // ── daily breakdown table ────────────────────────────────────────────────

  const days = useMemo(() => getDaysInRange(toDate(startDate), toDate(endDate)), [startDate, endDate]);

  const dailyRows = useMemo(() => {
    return days.map((iso) => {
      const dayEntries = entries.filter((e) => e.date === iso);
      const penjualan = dayEntries.filter((e) => e.type === "masuk" && e.category === "Penjualan").reduce((s, e) => s + e.amount, 0);
      const kasMasuk = dayEntries.filter((e) => e.type === "masuk").reduce((s, e) => s + e.amount, 0);
      const kasKeluar = dayEntries.filter((e) => e.type === "keluar").reduce((s, e) => s + e.amount, 0);
      const hpp = dayEntries.filter((e) => e.type === "keluar" && e.category === "Pembelian barang").reduce((s, e) => s + e.amount, 0);
      const biayaOps = dayEntries.filter((e) => e.type === "keluar" && e.category !== "Pembelian barang" && e.category !== "Prive pemilik").reduce((s, e) => s + e.amount, 0);
      const labaKotor = penjualan - hpp;
      const labaUsaha = labaKotor - biayaOps;
      return { iso, penjualan, kasMasuk, kasKeluar, labaUsaha, hasData: dayEntries.length > 0 };
    });
  }, [days, entries]);

  // ── operational costs for current period ─────────────────────────────────

  const opCosts = useMemo(() => {
    return filtered
      .filter((e) => e.type === "keluar" && e.category !== "Pembelian barang" && e.category !== "Prive pemilik")
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered]);

  const totalOpCost = opCosts.reduce((s, e) => s + e.amount, 0);

  // ── weekly tabs (for monthly view) ──────────────────────────────────────
  const weeksInMonth = useMemo(() => getWeeksInMonth(currentDate), [currentDate]);

  // ── warning: pending sales ────────────────────────────────────────────────
  const pendingSalesWarning = stats.penjualan > 0;

  // ── the "week" range label ────────────────────────────────────────────────
  const rangeLabel = useMemo(() => {
    if (tab === "harian") return `${formatShortDate(toDate(startDate))} - ${formatShortDate(addDays(toDate(endDate), 6))} · ${days.length} hari`;
    if (tab === "mingguan") return `Minggu 2 · ${formatShortDate(toDate(startDate))} - ${formatShortDate(toDate(endDate))}`;
    return `${formatShortMonth(currentDate)} · ${weeksInMonth.length} minggu`;
  }, [tab, startDate, endDate, days, currentDate, weeksInMonth]);

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
              {tab === "harian" ? `${formatShortDate(toDate(startDate))} - ${formatShortDate(addDays(toDate(startDate), 6))}` : tab === "mingguan" ? getWeekLabel(currentDate) : formatShortMonth(currentDate)}
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
          {[0, 1, 2].map((i) => {
            const mon = addDays(getMonday(new Date(2026, 9, 1)), i * 7);
            const sun = addDays(mon, 6);
            const isSelected = i === selectedWeekIdx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => { setSelectedWeekIdx(i); setCurrentDate(mon); }}
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

      {/* Stat cards */}
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
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
            {formatRupiah(Math.abs(stats.arusKasBersih))}
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
            <span className="text-[11px] text-neutral-400">Data contoh</span>
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
              <span className="tabular-nums font-semibold text-green-600">+ {formatRupiah(stats.penjualan)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Bayar pemasok</span>
              <span className="tabular-nums text-red-600">− {formatRupiah(stats.hppTerjual)}</span>
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
                  + {formatRupiah(Math.abs(stats.arusKasBersih))}
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
            Saldo awal mengikuti saldo akhir dari Minggu 1. Arus kas bersih bisa berbeda dari laba usaha.
          </p>
        </Card>
      </div>

      {/* Warning: unpaid sales */}
      {pendingSalesWarning && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Rp5.000.000 penjualan belum lunas, belum masuk kas.
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
                  <td className="px-4 py-3 text-neutral-700">{formatShortDate(toDate(row.iso))}</td>
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
          * Total terhitung · Klik untuk melihat transaksi berikutnya · 1 Okt tidak ada transaksi
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
                    {new Date(e.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
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

      {/* Modals */}
      <CatatModal open={catatOpen} onClose={() => setCatatOpen(false)} onSave={addEntry} />
      <UnduhModal open={unduhOpen} onClose={() => setUnduhOpen(false)} dateLabel={dateLabel} />
    </DashboardLayout>
  );
}
