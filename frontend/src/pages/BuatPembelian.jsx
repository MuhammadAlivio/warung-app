import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react";
import DashboardLayout from "../lib/components/layout/DashboardLayout";
import { Button, Card, Input, Select, Textarea } from "../lib/components/ui";
import { formatRupiah } from "../lib/utils/format";
import { cn } from "../lib/utils/cn";
import { usePurchase } from "../lib/stores/PurchaseContext";
import { useStock } from "../lib/stores/StockContext";
import { SUPPLIERS } from "../lib/data/purchaseMockData";

const TH = "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500";

const supplierOptions = SUPPLIERS.map((s) => ({ value: s.id, label: s.name }));

export default function BuatPembelian() {
  const navigate = useNavigate();
  const { addPurchase } = usePurchase();
  const { products } = useStock();

  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const availableProducts = useMemo(() => {
    const addedIds = new Set(items.map((i) => i.productId));
    const q = productSearch.trim().toLowerCase();
    return products.filter(
      (p) => !addedIds.has(p.id) && (!q || p.name.toLowerCase().includes(q))
    );
  }, [products, items, productSearch]);

  const addItem = (product) => {
    setItems((prev) => [
      ...prev,
      { productId: product.id, productName: product.name, qty: 1, buyPrice: product.buyPrice },
    ]);
    setProductSearch("");
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const total = items.reduce((sum, i) => sum + i.qty * i.buyPrice, 0);

  const canSave = supplierId && date && items.length > 0 && items.every((i) => i.qty > 0 && i.buyPrice > 0);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400)); // TODO: API call
    addPurchase({
      supplierId,
      date,
      notes,
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        qty: Number(i.qty),
        buyPrice: Number(i.buyPrice),
        qtyReceived: 0,
      })),
    });
    navigate("/admin/pembelian");
  };

  return (
    <DashboardLayout
      breadcrumb={[
        { label: "Dashboard", href: "/admin" },
        { label: "Pembelian", href: "/admin/pembelian" },
        { label: "Buat pembelian" },
      ]}
    >
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate("/admin/pembelian")}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </button>
          <h1 className="text-lg font-bold tracking-tight text-neutral-900">Buat pembelian baru</h1>
          <p className="mt-1 text-sm text-neutral-500">Isi detail pembelian dari supplier</p>
        </div>

        <Card className="p-6">
          {/* --- Info pembelian --- */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <Select
              label="Supplier"
              placeholder="Pilih supplier"
              options={supplierOptions}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            />
            <Input
              label="Tanggal pembelian"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* --- Tambah barang --- */}
          <div className="mb-4">
            <h2 className="mb-2 text-sm font-semibold">Tambah barang</h2>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
                aria-hidden
              />
              <input
                type="search"
                aria-label="Cari barang"
                placeholder="Cari nama barang..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
              />
              {productSearch && availableProducts.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
                  {availableProducts.slice(0, 8).map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => addItem(p)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs hover:bg-neutral-50"
                      >
                        <span className="font-semibold text-neutral-900">{p.name}</span>
                        <span className="text-neutral-500">{formatRupiah(p.buyPrice)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* --- Tabel item --- */}
          {items.length > 0 ? (
            <div className="mb-6 overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-xs">
                <thead>
                  <tr className="bg-neutral-100">
                    <th scope="col" className={cn(TH, "rounded-l-md w-10")}>No</th>
                    <th scope="col" className={TH}>Nama Barang</th>
                    <th scope="col" className={cn(TH, "w-20")}>Qty</th>
                    <th scope="col" className={cn(TH, "w-32")}>Harga Beli (Rp)</th>
                    <th scope="col" className={cn(TH, "text-right")}>Subtotal</th>
                    <th scope="col" className={cn(TH, "rounded-r-md w-14")}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.productId} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-2.5 text-neutral-500">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-semibold text-neutral-900">{item.productName}</td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => updateItem(idx, "qty", Math.max(1, Number(e.target.value)))}
                          className="h-8 w-16 rounded-md border border-neutral-200 px-2 text-xs tabular-nums text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          min={0}
                          value={item.buyPrice}
                          onChange={(e) => updateItem(idx, "buyPrice", Math.max(0, Number(e.target.value)))}
                          className="h-8 w-28 rounded-md border border-neutral-200 px-2 text-xs tabular-nums text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                        />
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-right text-neutral-700">
                        {formatRupiah(item.qty * item.buyPrice)}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          aria-label={`Hapus ${item.productName}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mb-6 flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-200 py-10 text-center">
              <Plus className="h-6 w-6 text-neutral-400" aria-hidden />
              <p className="text-xs text-neutral-500">Cari dan tambahkan barang ke pembelian</p>
            </div>
          )}

          {/* --- Total + catatan --- */}
          <div className="mb-6 flex items-center justify-end gap-3 border-t border-neutral-100 pt-4">
            <span className="text-sm font-semibold text-neutral-700">Total</span>
            <span className="text-lg font-bold tabular-nums text-neutral-900">{formatRupiah(total)}</span>
          </div>

          <Textarea
            label="Catatan"
            placeholder="Catatan tambahan (opsional)"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mb-6"
          />

          {/* --- Aksi --- */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" fullWidth={false} onClick={() => navigate("/admin/pembelian")}>
              Batal
            </Button>
            <Button fullWidth={false} disabled={!canSave} loading={saving} onClick={handleSave}>
              Simpan pembelian
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
