import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, Eye, PackageSearch, Plus, Search, SlidersHorizontal, Truck } from "lucide-react";
import DashboardLayout from "../lib/components/layout/DashboardLayout";
import { Badge, Button, Card, Pagination } from "../lib/components/ui";
import FilterSelect from "../lib/components/stock/FilterSelect";
import { formatRupiah } from "../lib/utils/format";
import { cn } from "../lib/utils/cn";
import { usePurchase } from "../lib/stores/PurchaseContext";
import { SUPPLIERS, getPurchaseStatus } from "../lib/data/purchaseMockData";

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { value: "belum_diterima", label: "Belum diterima" },
  { value: "diterima_sebagian", label: "Diterima sebagian" },
  { value: "diterima", label: "Diterima" },
];

const TH = "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500";

const formatDate = (d) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const supplierName = (id) => SUPPLIERS.find((s) => s.id === id)?.name ?? "-";

const STAT_CARDS = [
  {
    icon: Truck,
    bg: "bg-brand-100 text-brand-600",
    label: "Total Pembelian",
    count: (p) => p.length,
    caption: "Semua pembelian",
  },
  {
    icon: Clock,
    bg: "bg-amber-100 text-amber-600",
    label: "Menunggu Diterima",
    count: (p) => p.filter((x) => x.status === "belum_diterima" || x.status === "diterima_sebagian").length,
    caption: "Perlu ditindak",
  },
  {
    icon: CheckCircle2,
    bg: "bg-green-100 text-green-600",
    label: "Sudah Diterima",
    count: (p) => p.filter((x) => x.status === "diterima").length,
    caption: "Selesai",
  },
];

export default function PembelianBarangMasuk() {
  const navigate = useNavigate();
  const { purchases } = usePurchase();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);

  const withReset = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return purchases.filter((p) => {
      if (q && !p.purchaseNo.toLowerCase().includes(q) && !supplierName(p.supplierId).toLowerCase().includes(q)) return false;
      if (status && p.status !== status) return false;
      if (dateFilter && p.date !== dateFilter) return false;
      return true;
    });
  }, [purchases, query, status, dateFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <DashboardLayout breadcrumb="Pembelian & Barang Masuk">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pembelian &amp; Barang Masuk</h1>
            <p className="mt-1 text-xs text-neutral-500">Kelola pembelian dan penerimaan barang dari supplier.</p>
          </div>
          <Button size="sm" fullWidth={false} className="h-10" onClick={() => navigate("/admin/pembelian/buat")}>
            <Plus className="h-4 w-4" aria-hidden />
            Buat pembelian
          </Button>
        </div>

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STAT_CARDS.map((s) => (
            <Card key={s.label} className="flex items-start gap-3 p-4">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", s.bg)}>
                <s.icon className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-xs text-neutral-500">{s.label}</p>
                <p className="mt-1 text-[28px] font-bold leading-none tracking-tight text-neutral-900">
                  {s.count(purchases)}
                </p>
                <p className="mt-2 text-[11px] text-neutral-500">{s.caption}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Table card */}
        <Card className="min-w-0 p-0">
          <div className="p-4 pb-3">
            <h2 className="mb-3 text-sm font-semibold">Daftar pembelian</h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
                  aria-hidden
                />
                <input
                  type="search"
                  aria-label="Cari pembelian"
                  placeholder="Cari no. PB atau supplier..."
                  value={query}
                  onChange={withReset(setQuery)}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                />
              </div>
              <FilterSelect
                icon={SlidersHorizontal}
                label="Filter status"
                placeholder="Semua status"
                options={STATUS_OPTIONS}
                value={status}
                onChange={withReset(setStatus)}
              />
              <div className="relative">
                <input
                  type="date"
                  aria-label="Filter tanggal"
                  value={dateFilter}
                  onChange={withReset(setDateFilter)}
                  className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 transition-colors hover:bg-neutral-50 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto px-4">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="bg-neutral-100">
                  <th scope="col" className={cn(TH, "rounded-l-md")}>No. PB</th>
                  <th scope="col" className={TH}>Tanggal</th>
                  <th scope="col" className={TH}>Supplier</th>
                  <th scope="col" className={TH}>Jumlah Item</th>
                  <th scope="col" className={cn(TH, "text-right")}>Total</th>
                  <th scope="col" className={TH}>Status</th>
                  <th scope="col" className={cn(TH, "rounded-r-md")}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const s = getPurchaseStatus(p.status);
                  const total = p.items.reduce((sum, i) => sum + i.qty * i.buyPrice, 0);
                  return (
                    <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-3 font-semibold text-neutral-900">{p.purchaseNo}</td>
                      <td className="px-4 py-3 text-neutral-700">{formatDate(p.date)}</td>
                      <td className="px-4 py-3 text-neutral-700">{supplierName(p.supplierId)}</td>
                      <td className="px-4 py-3 text-neutral-700">{p.items.length} item</td>
                      <td className="px-4 py-3 tabular-nums text-right text-neutral-700">{formatRupiah(total)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/pembelian/${p.id}`)}
                          aria-label={`Lihat detail ${p.purchaseNo}`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <PackageSearch className="h-8 w-8 text-neutral-400" aria-hidden />
                <p className="text-sm font-semibold text-neutral-700">Pembelian tidak ditemukan</p>
                <p className="text-xs text-neutral-500">Coba ubah kata kunci atau filter pencarian.</p>
              </div>
            )}
          </div>

          <Pagination
            className="px-4 py-3"
            page={currentPage}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            itemLabel="pembelian"
            onChange={setPage}
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
