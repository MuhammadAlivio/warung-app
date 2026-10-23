import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import DashboardLayout from "../lib/components/layout/DashboardLayout";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  Pagination,
  Select,
  Textarea,
} from "../lib/components/ui";
import { formatRupiah } from "../lib/utils/format";
import { cn } from "../lib/utils/cn";
import { useFinance } from "../lib/stores/FinanceContext";
import {
  FINANCE_CATEGORIES_IN,
  FINANCE_CATEGORIES_OUT,
} from "../lib/data/financeMockData";

const TH = "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500";
const PAGE_SIZE = 8;

// ── helpers ──────────────────────────────────────────────────────────────────

function toDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDateID(d) {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getMonday(d) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// ── CatatModal ───────────────────────────────────────────────────────────────

function CatatModal({ open, onClose, onSave }) {
  const [jenis, setJenis] = useState("masuk");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [description, setDescription] = useState("");

  const categories = jenis === "masuk" ? FINANCE_CATEGORIES_IN : FINANCE_CATEGORIES_OUT;

  function handleJenis(v) {
    setJenis(v);
    setCategory("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!category || !amount) return;
    onSave({
      type: jenis,
      category,
      amount: Number(amount),
      date,
      description,
      createdBy: "Admin",
    });
    setJenis("masuk");
    setCategory("");
    setAmount("");
    setDate(isoDate(new Date()));
    setDescription("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Catat masuk / keluar">
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          {/* Jenis toggle */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-900">Jenis</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleJenis("masuk")}
                className={cn(
                  "h-11 flex-1 rounded-lg border text-sm font-semibold transition-colors",
                  jenis === "masuk"
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
                )}
              >
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => handleJenis("keluar")}
                className={cn(
                  "h-11 flex-1 rounded-lg border text-sm font-semibold transition-colors",
                  jenis === "keluar"
                    ? "border-red-600 bg-red-50 text-red-700"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
                )}
              >
                Pengeluaran
              </button>
            </div>
          </div>

          <Select
            label="Kategori"
            placeholder="Pilih kategori"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={categories.map((c) => ({ value: c, label: c }))}
          />

          <Input
            label="Jumlah (Rp)"
            type="number"
            min="0"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <Input
            label="Tanggal"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Textarea
            label="Keterangan"
            placeholder="Catatan opsional..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" fullWidth={false} className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" fullWidth={false} className="flex-1">
            Simpan
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ── UnduhModal ───────────────────────────────────────────────────────────────

const PERIODE_OPTIONS = [
  { value: "today", label: "Hari ini" },
  { value: "week", label: "Minggu ini" },
  { value: "month", label: "Bulan ini" },
  { value: "custom", label: "Kustom" },
];

const FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
];

function UnduhModal({ open, onClose }) {
  const [periode, setPeriode] = useState("today");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [format, setFormat] = useState("pdf");

  function handleUnduh() {
    alert("Fitur unduh laporan belum tersedia. (TODO)");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Unduh laporan">
      <ModalBody className="space-y-4">
        <Select
          label="Periode"
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
          options={PERIODE_OPTIONS}
        />

        {periode === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Dari" type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
            <Input label="Sampai" type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
          </div>
        )}

        <Select
          label="Format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          options={FORMAT_OPTIONS}
        />
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" fullWidth={false} className="flex-1" onClick={onClose}>
          Batal
        </Button>
        <Button fullWidth={false} className="flex-1" onClick={handleUnduh}>
          <Download className="h-4 w-4" />
          Unduh
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconClassName, label, value, valueClassName }) {
  return (
    <Card className="flex items-center gap-3">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconClassName)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-neutral-500">{label}</p>
        <p className={cn("text-sm font-bold tabular-nums", valueClassName)}>{value}</p>
      </div>
    </Card>
  );
}

// ── KeuanganPage ─────────────────────────────────────────────────────────────

export default function KeuanganPage() {
  const { entries, addEntry } = useFinance();

  const [tab, setTab] = useState("harian");
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 22)); // 22 Okt 2026
  const [page, setPage] = useState(1);
  const [catatOpen, setCatatOpen] = useState(false);
  const [unduhOpen, setUnduhOpen] = useState(false);

  // ── filtered entries ───────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (tab === "harian") {
      const iso = isoDate(currentDate);
      return entries.filter((e) => e.date === iso);
    }
    const monday = getMonday(currentDate);
    const sunday = addDays(monday, 6);
    const monISO = isoDate(monday);
    const sunISO = isoDate(sunday);
    return entries.filter((e) => e.date >= monISO && e.date <= sunISO);
  }, [entries, tab, currentDate]);

  // ── calculations ───────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const masukEntries = filtered.filter((e) => e.type === "masuk");
    const keluarEntries = filtered.filter((e) => e.type === "keluar");

    const pemasukan = masukEntries.reduce((s, e) => s + e.amount, 0);
    const pengeluaran = keluarEntries.reduce((s, e) => s + e.amount, 0);
    const labaKotor = pemasukan - pengeluaran;

    const biayaOperasional = keluarEntries
      .filter((e) => e.category !== "Pembelian barang")
      .reduce((s, e) => s + e.amount, 0);
    const labaUsaha = pemasukan - biayaOperasional;

    const arusKasBersih = pemasukan - pengeluaran;

    return {
      pemasukan,
      pengeluaran,
      labaKotor,
      jumlahTransaksi: filtered.length,
      pemasukanKotor: pemasukan,
      biayaOperasional,
      labaUsaha,
      kasMasuk: pemasukan,
      kasKeluar: pengeluaran,
      arusKasBersih,
    };
  }, [filtered]);

  // ── pagination ─────────────────────────────────────────────────────────────

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── date nav ───────────────────────────────────────────────────────────────

  function navigateDate(dir) {
    setPage(1);
    if (tab === "harian") {
      setCurrentDate((d) => addDays(d, dir));
    } else {
      setCurrentDate((d) => addDays(d, dir * 7));
    }
  }

  const dateLabel = useMemo(() => {
    if (tab === "harian") return formatDateID(currentDate);
    const monday = getMonday(currentDate);
    const sunday = addDays(monday, 6);
    return `${formatDateID(monday)} - ${formatDateID(sunday)}`;
  }, [tab, currentDate]);

  function handleTabChange(t) {
    setTab(t);
    setPage(1);
  }

  return (
    <DashboardLayout breadcrumb="Keuangan">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-neutral-900">Keuangan</h1>
          <p className="text-xs text-neutral-500">Catat dan pantau arus kas warung.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" fullWidth={false} onClick={() => setCatatOpen(true)}>
            <Plus className="h-4 w-4" />
            Catat masuk/keluar
          </Button>
          <Button size="sm" variant="outline" fullWidth={false} onClick={() => setUnduhOpen(true)}>
            <Download className="h-4 w-4" />
            Unduh laporan
          </Button>
        </div>
      </div>

      {/* Segmented + Date nav */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg bg-neutral-100 p-1">
          {["harian", "mingguan"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTabChange(t)}
              className={cn(
                "rounded-md px-4 py-1.5 text-xs font-semibold capitalize transition-colors",
                tab === t ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateDate(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center text-xs font-semibold text-neutral-700">
            {dateLabel}
          </span>
          <button
            type="button"
            onClick={() => navigateDate(1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={ArrowUp}
          iconClassName="bg-green-50 text-green-600"
          label="Pemasukan"
          value={formatRupiah(stats.pemasukan)}
          valueClassName="text-green-600"
        />
        <StatCard
          icon={ArrowDown}
          iconClassName="bg-red-50 text-red-600"
          label="Pengeluaran"
          value={formatRupiah(stats.pengeluaran)}
          valueClassName="text-red-600"
        />
        <StatCard
          icon={TrendingUp}
          iconClassName="bg-brand-50 text-brand-600"
          label="Laba Kotor"
          value={formatRupiah(stats.labaKotor)}
          valueClassName={stats.labaKotor >= 0 ? "text-green-600" : "text-red-600"}
        />
        <StatCard
          icon={ReceiptText}
          iconClassName="bg-neutral-100 text-neutral-600"
          label="Jumlah Transaksi"
          value={stats.jumlahTransaksi}
          valueClassName="text-neutral-900"
        />
      </div>

      {/* Two-column layout */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Left — Table */}
        <Card className="p-0 lg:col-span-3">
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="text-sm font-bold text-neutral-900">Daftar transaksi</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className={TH}>Waktu</th>
                  <th className={TH}>Keterangan</th>
                  <th className={TH}>Kategori</th>
                  <th className={TH}>Jenis</th>
                  <th className={cn(TH, "text-right")}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-neutral-400">
                      Belum ada transaksi.
                    </td>
                  </tr>
                ) : (
                  paged.map((e) => (
                    <tr key={e.id} className="border-b border-neutral-50 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-neutral-700">{e.date}</td>
                      <td className="px-4 py-2.5 text-xs text-neutral-700">{e.description}</td>
                      <td className="px-4 py-2.5 text-xs text-neutral-500">{e.category}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={e.type === "masuk" ? "brand" : "danger"}>
                          {e.type === "masuk" ? "Masuk" : "Keluar"}
                        </Badge>
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap px-4 py-2.5 text-right text-xs font-semibold tabular-nums",
                          e.type === "masuk" ? "text-green-600" : "text-red-600",
                        )}
                      >
                        {e.type === "masuk" ? "+" : "-"}
                        {formatRupiah(e.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="border-t border-neutral-100 px-5 py-3">
              <Pagination
                page={safePage}
                pageCount={pageCount}
                total={filtered.length}
                pageSize={PAGE_SIZE}
                onChange={setPage}
                itemLabel="transaksi"
              />
            </div>
          )}
        </Card>

        {/* Right — Summary cards */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Ringkasan Laba Rugi */}
          <Card>
            <h3 className="mb-3 text-sm font-bold text-neutral-900">Ringkasan Laba Rugi</h3>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-neutral-600">Pemasukan kotor</span>
              <span className="text-xs font-semibold tabular-nums text-green-600">
                {formatRupiah(stats.pemasukanKotor)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-neutral-600">Biaya operasional</span>
              <span className="text-xs font-semibold tabular-nums text-red-600">
                -{formatRupiah(stats.biayaOperasional)}
              </span>
            </div>
            <div className="border-t border-neutral-100" />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-bold text-neutral-900">Laba usaha</span>
              <span
                className={cn(
                  "text-sm font-bold tabular-nums",
                  stats.labaUsaha >= 0 ? "text-green-600" : "text-red-600",
                )}
              >
                {formatRupiah(stats.labaUsaha)}
              </span>
            </div>
          </Card>

          {/* Arus Kas */}
          <Card>
            <h3 className="mb-3 text-sm font-bold text-neutral-900">Arus Kas</h3>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-neutral-600">Kas masuk</span>
              <span className="text-xs font-semibold tabular-nums text-green-600">
                {formatRupiah(stats.kasMasuk)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-neutral-600">Kas keluar</span>
              <span className="text-xs font-semibold tabular-nums text-red-600">
                -{formatRupiah(stats.kasKeluar)}
              </span>
            </div>
            <div className="border-t border-neutral-100" />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-bold text-neutral-900">Arus kas bersih</span>
              <span
                className={cn(
                  "text-sm font-bold tabular-nums",
                  stats.arusKasBersih >= 0 ? "text-green-600" : "text-red-600",
                )}
              >
                {formatRupiah(stats.arusKasBersih)}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <CatatModal open={catatOpen} onClose={() => setCatatOpen(false)} onSave={addEntry} />
      <UnduhModal open={unduhOpen} onClose={() => setUnduhOpen(false)} />
    </DashboardLayout>
  );
}
