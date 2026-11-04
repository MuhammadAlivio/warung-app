import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronDown, ImageIcon, PackageSearch, Plus, Search, SlidersHorizontal, Tags } from "lucide-react";
import DashboardLayout from "../lib/components/layout/DashboardLayout";
import { Badge, Button, Card } from "../lib/components/ui";
import { formatRupiah } from "../lib/utils/format";
import { cn } from "../lib/utils/cn";
import CategoryManagerModal from "../lib/components/stock/CategoryManagerModal";
import DeleteStockModal from "../lib/components/stock/DeleteStockModal";
import FilterSelect from "../lib/components/stock/FilterSelect";
import StatCard from "../lib/components/stock/StatCard";
import StockFormModal from "../lib/components/stock/StockFormModal";
import { useStock } from "../lib/stores/StockContext";
import { getStockStatus } from "../lib/data/stockMockData";

// Nama field dari backend (snake_case) -> nama field form
const FIELD_MAP = {
  name: "name", description: "description", category_id: "categoryId", buy_price: "buyPrice",
  sell_price: "sellPrice", stock: "stock", min_stock: "minStock", image: "image",
};

/** ApiError -> { form, fields } untuk ditampilkan di StockFormModal. */
const toFormProblem = (e) => {
  const fields = Object.entries(e.data?.errors ?? {})
    .filter(([k]) => FIELD_MAP[k])
    .map(([k, v]) => ({ field: FIELD_MAP[k], message: v[0] }));
  return fields.length ? { fields } : { form: e.message };
};

const STATUS_OPTIONS = [
  { value: "ok", label: "Aman" },
  { value: "low", label: "Menipis" },
  { value: "out", label: "Habis" },
];

const TH = "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500";

export default function StockPage() {
  const navigate = useNavigate();
  const { products, categories, loading, error, reload, addProduct, updateProduct, deleteProduct } = useStock();

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");

  // Satu state untuk semua modal: { type: "add" | "categories" } | { type: "edit"|"delete", product }
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const stats = useMemo(() => {
    const low = products.filter((p) => getStockStatus(p).key === "low");
    const out = products.filter((p) => getStockStatus(p).key === "out");
    return { low, out };
  }, [products]);

  // Semua barang tampil sekaligus (tanpa pagination), hanya disaring filter
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q)) &&
        (!categoryId || String(p.categoryId) === categoryId) &&
        (!status || getStockStatus(p).key === status)
    );
  }, [products, query, categoryId, status]);

  const closeModal = () => {
    setModal(null);
    setDeleteError("");
  };

  const saveProduct = async (values) => {
    try {
      if (modal?.type === "edit") await updateProduct(modal.product.id, values);
      else await addProduct(values);
      closeModal();
    } catch (e) {
      return toFormProblem(e);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteProduct(modal.product.id);
      closeModal();
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setDeleting(false);
    }
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" fullWidth={false} className="h-10" onClick={() => setModal({ type: "categories" })}>
              <Tags className="h-4 w-4" aria-hidden />
              Kelola kategori
            </Button>
            <Button size="sm" fullWidth={false} className="h-10" onClick={() => setModal({ type: "add" })} disabled={loading}>
              <Plus className="h-4 w-4" aria-hidden />
              Tambah barang
            </Button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700">
            <p>Gagal memuat data stok: {error}</p>
            <button type="button" onClick={reload} className="font-semibold underline">
              Coba lagi
            </button>
          </div>
        )}

        {firstLow && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-800"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>
              {stats.low.length} barang perlu diisi ulang. {firstLow.name} tersisa {firstLow.stock} {firstLow.unit}{" "}
              dari batas minimum {firstLow.minStock} {firstLow.unit}.
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
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                  />
                </div>
                <FilterSelect
                  icon={ChevronDown}
                  label="Filter kategori"
                  placeholder="Semua kategori"
                  options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                />
                <FilterSelect
                  icon={SlidersHorizontal}
                  label="Filter status stok"
                  placeholder="Status stok"
                  options={STATUS_OPTIONS}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
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
                          <div className="flex items-center gap-3">
                            {p.image ? (
                              <img src={p.image} alt={`Foto ${p.name}`} className="h-10 w-10 shrink-0 rounded-md object-cover" />
                            ) : (
                              <div
                                aria-hidden
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-400"
                              >
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-neutral-900">{p.name}</p>
                              <p className="mt-0.5 text-[10px] text-neutral-500">{p.note}</p>
                            </div>
                          </div>
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

              {loading && products.length === 0 && (
                <p className="py-14 text-center text-xs text-neutral-500">Memuat data barang…</p>
              )}

              {!loading && rows.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-14 text-center">
                  <PackageSearch className="h-8 w-8 text-neutral-400" aria-hidden />
                  {products.length === 0 ? (
                    <>
                      <p className="text-sm font-semibold text-neutral-700">Belum ada barang</p>
                      <p className="text-xs text-neutral-500">Klik "Tambah barang" untuk mulai mencatat stok.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-neutral-700">Barang tidak ditemukan</p>
                      <p className="text-xs text-neutral-500">Coba ubah kata kunci atau filter pencarian.</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <p className="px-4 py-3 text-xs text-neutral-500">
              Menampilkan {rows.length} dari {products.length} barang
            </p>
          </Card>

          <div className="grid content-start gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <StatCard
              label="Total barang aktif"
              value={products.length}
              caption={`${categories.length} kategori barang`}
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
        error={deleteError}
        onCancel={closeModal}
        onConfirm={confirmDelete}
      />
      <CategoryManagerModal open={modal?.type === "categories"} onClose={closeModal} />
    </DashboardLayout>
  );
}
