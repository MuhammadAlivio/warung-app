import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronDown, PackageSearch, Plus, Search, SlidersHorizontal } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Button, Card, Pagination } from "../../components/ui";
import { formatRupiah } from "../../lib/format";
import { cn } from "../../lib/cn";
import DeleteStockModal from "./DeleteStockModal";
import FilterSelect from "./FilterSelect";
import StatCard from "./StatCard";
import StockFormModal from "./StockFormModal";
import { useStock } from "./StockContext";
import { CATEGORIES, getStockStatus } from "./mockData";

const PAGE_SIZE = 6;

const STATUS_OPTIONS = [
  { value: "ok", label: "Aman" },
  { value: "low", label: "Menipis" },
  { value: "out", label: "Habis" },
];

const TH = "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500";

/** "Per pcs" -> "pcs"; catatan lain (mis. "5 kg / karung") dianggap pcs. */
const unitOf = (note = "") => (note.startsWith("Per ") ? note.slice(4) : "pcs");

export default function StockPage() {
  const navigate = useNavigate();
  const { products, addProduct, updateProduct, deleteProduct } = useStock();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  // Satu state untuk ketiga modal: { type: "add" } | { type: "edit"|"delete", product }
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const stats = useMemo(() => {
    const low = products.filter((p) => getStockStatus(p).key === "low");
    const out = products.filter((p) => getStockStatus(p).key === "out");
    return { low, out, categories: new Set(products.map((p) => p.category)).size };
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q)) &&
        (!category || p.category === category) &&
        (!status || getStockStatus(p).key === status)
    );
  }, [products, query, category, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Setiap filter berubah, kembali ke halaman 1
  const withReset = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const closeModal = () => setModal(null);

  const saveProduct = async (values) => {
    const editingId = modal?.type === "edit" ? modal.product.id : null;
    const duplicate = products.some((p) => p.id !== editingId && p.name.toLowerCase() === values.name.toLowerCase());
    if (duplicate) return { field: "name", message: "Nama barang sudah ada" };

    await new Promise((r) => setTimeout(r, 500)); // TODO: panggilan API
    if (editingId) updateProduct(editingId, values);
    else addProduct(values);
    closeModal();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 500)); // TODO: panggilan API
    deleteProduct(modal.product.id);
    setDeleting(false);
    closeModal();
  };

  const firstLow = stats.low[0];

  return (
    <DashboardLayout
      breadcrumb="Stok Barang"
      badges={{ stok: stats.low.length }}
      onLogout={() => navigate("/admin/login")}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Stok Barang</h1>
            <p className="mt-1 text-xs text-neutral-500">Pantau persediaan, jaga barang tetap tersedia.</p>
          </div>
          <Button size="sm" fullWidth={false} className="h-10" onClick={() => setModal({ type: "add" })}>
            <Plus className="h-4 w-4" aria-hidden />
            Tambah barang
          </Button>
        </div>

        {firstLow && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-800"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>
              {stats.low.length} barang perlu diisi ulang. {firstLow.name} tersisa {firstLow.stock} {unitOf(firstLow.note)}{" "}
              dari batas minimum {firstLow.minStock} {unitOf(firstLow.note)}.
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_210px]">
          <Card className="min-w-0 p-0">
            <div className="p-4 pb-3">
              <h2 className="mb-3 text-sm font-semibold">Daftar barang</h2>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[200px] flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
                    aria-hidden
                  />
                  <input
                    type="search"
                    aria-label="Cari barang"
                    placeholder="Cari barang..."
                    value={query}
                    onChange={withReset(setQuery)}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                  />
                </div>
                <FilterSelect
                  icon={ChevronDown}
                  label="Filter kategori"
                  placeholder="Semua kategori"
                  options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  value={category}
                  onChange={withReset(setCategory)}
                />
                <FilterSelect
                  icon={SlidersHorizontal}
                  label="Filter status stok"
                  placeholder="Status stok"
                  options={STATUS_OPTIONS}
                  value={status}
                  onChange={withReset(setStatus)}
                />
              </div>
            </div>

            <div className="overflow-x-auto px-4">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="bg-neutral-100">
                    <th scope="col" className={cn(TH, "rounded-l-md")}>Nama barang</th>
                    <th scope="col" className={TH}>Kategori</th>
                    <th scope="col" className={TH}>Harga beli</th>
                    <th scope="col" className={TH}>Harga jual</th>
                    <th scope="col" className={TH}>Stok / Min.</th>
                    <th scope="col" className={TH}>Status</th>
                    <th scope="col" className={cn(TH, "rounded-r-md")}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const s = getStockStatus(p);
                    return (
                      <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-neutral-900">{p.name}</p>
                          <p className="mt-0.5 text-[10px] text-neutral-500">{p.note}</p>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{p.category}</td>
                        <td className="px-4 py-3 tabular-nums text-neutral-700">{formatRupiah(p.buyPrice)}</td>
                        <td className="px-4 py-3 tabular-nums text-neutral-700">{formatRupiah(p.sellPrice)}</td>
                        <td
                          className={cn(
                            "px-4 py-3 tabular-nums",
                            s.key === "out" && "text-red-600",
                            s.key === "low" && "text-amber-600",
                            s.key === "ok" && "text-neutral-700"
                          )}
                        >
                          {p.stock} / {p.minStock}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setModal({ type: "edit", product: p })}
                            aria-label={`Edit ${p.name}`}
                            className="mr-3 font-semibold text-brand-700 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setModal({ type: "delete", product: p })}
                            aria-label={`Hapus ${p.name}`}
                            className="font-semibold text-red-600 hover:underline"
                          >
                            Hapus
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
                  <p className="text-sm font-semibold text-neutral-700">Barang tidak ditemukan</p>
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
              itemLabel="barang"
              onChange={setPage}
            />
          </Card>

          <div className="grid content-start gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <StatCard
              label="Total barang aktif"
              value={products.length}
              caption={`${stats.categories} kategori barang`}
            />
            <StatCard label="Stok menipis" value={`${stats.low.length} barang`} caption="Di bawah batas minimum" />
            <StatCard label="Stok habis" value={`${stats.out.length} barang`} caption="Perlu segera dipesan" />
          </div>
        </div>
      </div>

      <StockFormModal
        open={modal?.type === "add" || modal?.type === "edit"}
        product={modal?.type === "edit" ? modal.product : null}
        onSave={saveProduct}
        onClose={closeModal}
      />
      <DeleteStockModal
        product={modal?.type === "delete" ? modal.product : null}
        loading={deleting}
        onCancel={closeModal}
        onConfirm={confirmDelete}
      />
    </DashboardLayout>
  );
}
