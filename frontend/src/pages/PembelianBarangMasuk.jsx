import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackageSearch, Plus, Search } from "lucide-react";
import DashboardLayout from "../lib/components/layout/DashboardLayout";
import { Badge, Button, Card, Pagination, Select } from "../lib/components/ui";
import { formatRupiah } from "../lib/utils/format";
import { cn } from "../lib/utils/cn";
import { usePurchase } from "../lib/stores/PurchaseContext";
import { SUPPLIERS } from "../lib/data/purchaseMockData";

export default function PembelianBarangMasuk() {
  const navigate = useNavigate();
  const { purchases } = usePurchase();

  // SAFETY: Jika data belum muat atau kosong, tampilkan pesan bukan layar putih
  if (!purchases || purchases.length === 0) {
    return (
      <DashboardLayout breadcrumb="Pembelian & Barang Masuk">
        <div className="mx-auto max-w-6xl py-20 text-center">
          <PackageSearch className="h-8 w-8 text-neutral-400" aria-hidden />
          <h2 className="text-xl font-bold text-neutral-600">Data Pembelian</h2>
          <p className="mt-2 text-neutral-500">Sedang memuat data dari mock database...</p>
          <Button size="sm" fullWidth={false} onClick={() => window.location.reload()}>
            <ArrowLeft className="mr-2" /> Refresh
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const withReset = (setter) => (e) => setter(e.target.value);

  // Sederhanain statistiknya
  const total = useMemo(
    () => purchases.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.qty * i.buyPrice, 0), 0),
    [purchases],
  );

  const belumSelesai = useMemo(
    () => purchases.filter((p) => p.status === "belum_diterima" || p.status === "diterima_sebagian").length,
    [purchases],
  );

  const filtered = useMemo(
    () => {
      const q = query.trim().toLowerCase();
      return purchases.filter((p) => {
        if (q && !p.purchaseNo.toLowerCase().includes(q)) return false;
        if (status && p.status !== status) return false;
        return true;
      });
    },
    [purchases, query, status],
  );

  return (
    <DashboardLayout breadcrumb="Pembelian & Barang Masuk">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pembelian & Barang Masuk</h1>
            <p className="mt-1 text-xs text-neutral-500">Kelola pembelian dan penerimaan barang dari supplier.</p>
          </div>
          <Button size="sm" fullWidth={false} className="h-10" onClick={() => navigate("/admin/pembelian/buat")}>
            <Plus className="h-4 w-4" aria-hidden />
            Buat pembelian
          </Button>
        </div>

        <Card className="min-w-0 p-0">
          <div className="p-4 pb-3">
            <h2 className="mb-3 text-sm font-semibold">Daftar pembelian</h2>

            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" aria-hidden />
                <input
                  type="search"
                  aria-label="Cari pembelian"
                  placeholder="Cari no. PB atau supplier..."
                  value={query}
                  onChange={withReset(setQuery)}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                />
              </div>
              <Select
                label="Filter status"
                placeholder="Semua status"
                options={[
                  { value: "belum_diterima", label: "Belum diterima" },
                  { value: "diterima_sebagian", label: "Diterima sebagian" },
                  { value: "diterima", label: "Diterima" },
                ]}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto px-4">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="bg-neutral-100">
                  <th scope="col" className={cn("px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500", "rounded-l-md")}>No. PB</th>
                  <th scope="col" className={cn("px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500")}>Tanggal</th>
                  <th scope="col" className={cn("px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500")}>Supplier</th>
                  <th scope="col" className={cn("px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-neutral-500")}>Total</th>
                  <th scope="col" className={cn("px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500")}>Status</th>
                  <th scope="col" className={cn("px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 rounded-r-md")}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="flex flex-col items-center gap-2 py-14 text-center">
                        <PackageSearch className="h-8 w-8 text-neutral-400" aria-hidden />
                        <p className="text-sm font-semibold text-neutral-700">Pembelian tidak ditemukan</p>
                        <p className="text-xs text-neutral-500">Coba ubah kata kunci atau filter pencarian.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const s = { variant: "warning", label: "Belum diterima" };
                    if (p.status === "diterima_sebagian") s.variant = "brand";
                    if (p.status === "diterima") s.variant = "brand";

                    const total = p.items.reduce((sum, i) => sum + i.qty * i.buyPrice, 0);
                    return (
                      <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                        <td className="px-4 py-3 font-semibold text-neutral-900">{p.purchaseNo}</td>
                        <td className="px-4 py-3 text-neutral-700">{new Date(p.date).toLocaleDateString("id-ID")}</td>
                        <td className="px-4 py-3 text-neutral-700">{SUPPLIERS.find((s) => s.id === p.supplierId)?.name ?? "-"}</td>
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
                            <PackageSearch className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Pagination
          className="px-4 py-3"
          page={1}
          pageCount={1}
          total={filtered.length}
          pageSize={8}
          itemLabel="pembelian"
        />
      </div>
    </DashboardLayout>
  );
}