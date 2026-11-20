import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info, PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import AdminShell from "../lib/components/layout/AdminShell";
import { Button, Card, Checkbox, Input, Select, Textarea } from "../lib/components/ui";
import StockFormModal, { toFormProblem } from "../lib/components/stock/StockFormModal";
import SupplierFormModal from "../lib/components/purchase/SupplierFormModal";
import { LOCATIONS, PAYMENT_METHODS, PILL_CLASS, formatDateShort, qtyText, unitOf } from "../lib/utils/purchase";
import { formatRupiah } from "../lib/utils/format";
import { cn } from "../lib/utils/cn";
import { usePurchase } from "../lib/stores/PurchaseContext";
import { useStock } from "../lib/stores/StockContext";

const TH = "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500";

/** Tanggal lokal "YYYY-MM-DD", digeser `days` hari dari hari ini. */
const localDate = (days = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const MONO = "font-mono tabular-nums";

// Nama field backend -> label untuk pesan error di bawah form
const FIELD_LABEL = {
  supplier_id: "Pemasok", purchase_no: "Nomor faktur", purchase_date: "Tanggal pembelian", due_date: "Jatuh tempo",
  location: "Lokasi", items: "Barang", initial_payment: "Pembayaran awal", payment_method: "Metode pembayaran",
};

export default function BuatPembelian() {
  const navigate = useNavigate();
  const { addPurchase, suppliers, addSupplier } = usePurchase();
  const { products, addProduct } = useStock();
  const supplierOptions = suppliers.map((s) => ({ value: String(s.id), label: s.name }));
  const today = localDate();
  const [modal, setModal] = useState(null); // "supplier" | "product" | null
  const [receiveAll, setReceiveAll] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(today);
  const [location, setLocation] = useState("gudang_utama");
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // Payment
  const [initialPayment, setInitialPayment] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("transfer_bank");
  const [dueDate, setDueDate] = useState(() => localDate(7));

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
      { productId: product.id, productName: product.name, sku: product.sku || "", unit: product.unit || "pcs", qty: 1, buyPrice: product.buyPrice },
    ]);
    setProductSearch("");
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, i) => sum + i.qty * i.buyPrice, 0);
  const additionalCost = 0;
  const total = subtotal + additionalCost;
  const payment = Math.min(total, Number(initialPayment) || 0);
  const sisaUtang = total - payment;

  const canSave = supplierId && invoiceNo.trim() && date && dueDate && items.length > 0 && items.every((i) => i.qty > 0 && i.buyPrice > 0);

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const unit = unitOf(items);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const p = await addPurchase({
        supplier_id: Number(supplierId),
        purchase_no: invoiceNo.trim(),
        purchase_date: date,
        due_date: dueDate,
        location,
        notes,
        initial_payment: payment,
        payment_method: paymentMethod,
        receive_all: receiveAll,
        items: items.map((i) => ({ product_id: i.productId, qty: Number(i.qty), unit_price: Number(i.buyPrice) })),
      });
      navigate(`/pembelian/${p.id}`);
    } catch (e) {
      const [field, messages] = Object.entries(e.data?.errors ?? {})[0] ?? [];
      const label = field && (FIELD_LABEL[field] ?? (field.startsWith("items.") ? "Barang" : null));
      setError(messages ? `${label ? `${label}: ` : ""}${messages[0]}` : e.message);
      setSaving(false);
    }
  };

  // "Tambah data barang": barang baru langsung tersimpan di Stok Barang (stok 0) lalu masuk ke daftar pembelian
  const saveNewProduct = async (values) => {
    try {
      const p = await addProduct({ ...values, stock: 0 });
      addItem(p);
      setModal(null);
    } catch (e) {
      return toFormProblem(e);
    }
  };

  const saveSupplier = async (values) => {
    const s = await addSupplier(values);
    setSupplierId(String(s.id));
    setModal(null);
  };

  return (
    <AdminShell
      breadcrumb={[{ label: "Ruang kerja" }, { label: "Pembelian & Barang Masuk", href: "/pembelian" }]}
    >
      <div className="mx-auto max-w-6xl pb-16">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate("/pembelian")}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Pembelian & Barang Masuk
            </button>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-neutral-900">Buat pembelian</h1>
            <p className="mt-1 text-xs text-neutral-500">
              Catat pembelian ke pemasok. Stok bertambah otomatis saat barang diterima.
            </p>
          </div>
          <span className={PILL_CLASS.gray}>Draf pembelian</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
          {/* Left column: form */}
          <div className="space-y-4 lg:col-span-3">
            {/* Informasi pembelian */}
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-neutral-900">Informasi pembelian</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Select
                    label="Pemasok *"
                    placeholder={suppliers.length ? "Pilih pemasok" : "Belum ada pemasok"}
                    options={supplierOptions}
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setModal("supplier")}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"
                  >
                    <Plus className="h-3 w-3" aria-hidden /> Pemasok baru
                  </button>
                </div>
                <Input
                  label="Nomor faktur pemasok *"
                  placeholder="INV-SJ-1016"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                />
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-neutral-900">
                    Tanggal pembelian *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                    />
                  </div>
                </div>
                <Select
                  label="Lokasi penerimaan *"
                  options={LOCATIONS}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <p className="mt-3 text-[11px] text-neutral-400">
                Nomor faktur digunakan untuk mencocokkan pembelian dengan tagihan pemasok.
              </p>
            </Card>

            {/* Barang pembelian */}
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900">Barang pembelian</h2>
                {items.length > 0 && (
                  <span className="text-[11px] text-neutral-400">
                    {items.length} jenis barang · {qtyText(totalQty, unit)}
                  </span>
                )}
              </div>

              {/* Search + barang baru */}
              <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
                  aria-hidden
                />
                <input
                  type="search"
                  aria-label="Cari barang"
                  placeholder="Cari nama barang untuk ditambahkan..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                />
                {productSearch && availableProducts.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-500 shadow-lg">
                    Barang tidak ditemukan.{" "}
                    <button type="button" onClick={() => setModal("product")} className="font-semibold text-brand-700 hover:underline">
                      Tambah sebagai barang baru
                    </button>
                  </div>
                )}
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
                          <span className="text-neutral-500">
                            {formatRupiah(p.buyPrice)} / {p.unit}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
                <Button variant="outline" size="sm" fullWidth={false} className="h-10 shrink-0" onClick={() => setModal("product")}>
                  <PackagePlus className="h-4 w-4" aria-hidden />
                  Barang baru
                </Button>
              </div>

              {/* Items table */}
              {items.length > 0 ? (
                <>
                  <div className="overflow-x-auto rounded-lg border border-neutral-200">
                    <table className="w-full min-w-[540px] text-left text-xs">
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-200">
                          <th scope="col" className={TH}>Barang</th>
                          <th scope="col" className={TH}>Jumlah</th>
                          <th scope="col" className={TH}>Harga Modal</th>
                          <th scope="col" className={TH}>Subtotal</th>
                          <th scope="col" className={cn(TH, "w-10")}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={item.productId} className="border-b border-neutral-100 last:border-0">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-neutral-900">{item.productName}</p>
                              <p className="text-[11px] text-neutral-400">{item.sku} · {item.unit}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex h-8 w-24 items-center rounded-md border border-neutral-200 bg-white px-2 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15">
                                <input
                                  type="number"
                                  min={1}
                                  aria-label={`Jumlah ${item.productName}`}
                                  value={item.qty}
                                  onChange={(e) => updateItem(idx, "qty", Math.max(1, Number(e.target.value)))}
                                  className="w-full min-w-0 bg-transparent text-xs tabular-nums text-neutral-900 focus:outline-none"
                                />
                                <span className="text-[11px] text-neutral-500">{item.unit}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex h-8 w-28 items-center rounded-md border border-neutral-200 bg-white px-2 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15">
                                <span className="text-[11px] text-neutral-500">Rp</span>
                                <input
                                  type="number"
                                  min={0}
                                  aria-label={`Harga modal ${item.productName}`}
                                  value={item.buyPrice}
                                  onChange={(e) => updateItem(idx, "buyPrice", Math.max(0, Number(e.target.value)))}
                                  className={`w-full min-w-0 bg-transparent pl-1 text-xs text-neutral-900 focus:outline-none ${MONO}`}
                                />
                              </div>
                            </td>
                            <td className={`px-4 py-3 text-neutral-700 ${MONO}`}>
                              {formatRupiah(item.qty * item.buyPrice)}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                aria-label={`Hapus ${item.productName}`}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[11px] text-neutral-400">
                    Harga modal per satuan barang. Jumlah barang dapat diterima secara bertahap.
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-200 py-8 text-center">
                  <Search className="h-5 w-5 text-neutral-300" aria-hidden />
                  <p className="text-xs text-neutral-400">
                    Cari dan tambahkan barang ke pembelian
                  </p>
                </div>
              )}
            </Card>

            {/* Pembayaran awal */}
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900">Pembayaran awal</h2>
                {total > 0 && (
                  <span className={sisaUtang > 0 ? PILL_CLASS.amber : PILL_CLASS.green}>
                    {payment <= 0 ? "Belum dibayar" : sisaUtang > 0 ? "Bayar sebagian" : "Lunas"}
                  </span>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-neutral-900">
                    Jumlah dibayar
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={total}
                      value={initialPayment}
                      onChange={(e) => setInitialPayment(Math.max(0, Math.min(total, Number(e.target.value))))}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-xs tabular-nums text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                    />
                  </div>
                </div>
                <Select
                  label="Metode pembayaran"
                  options={PAYMENT_METHODS}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
              </div>
              <div className="mt-4 grid items-start gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-neutral-900">
                    Jatuh tempo sisa pembayaran *
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-500 sm:pt-6">
                  Tempo 7 hari sejak tanggal pembelian. Sisa utang dicatat ke pemasok.
                </p>
              </div>
            </Card>
          </div>

          {/* Right column: summary */}
          <div className="space-y-4 lg:col-span-2">
            {/* Ringkasan */}
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-neutral-900">Ringkasan pembelian</h2>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">
                    Subtotal · {qtyText(totalQty, unit)}
                  </span>
                  <span className={cn(MONO, "text-neutral-700")}>{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Biaya tambahan</span>
                  <span className={cn(MONO, "text-neutral-700")}>{formatRupiah(additionalCost)}</span>
                </div>
                <div className="border-t border-neutral-100 pt-2.5">
                  <div className="flex items-center justify-between text-sm font-bold text-neutral-900">
                    <span>Total pembelian</span>
                    <span className={MONO}>{formatRupiah(total)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Pembayaran awal</span>
                  <span className={cn(MONO, "text-neutral-700")}>{formatRupiah(payment)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-neutral-900">Sisa utang</span>
                  <span className={cn(MONO, sisaUtang > 0 ? "text-amber-700" : "text-brand-700")}>
                    {formatRupiah(sisaUtang > 0 ? sisaUtang : 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Jatuh tempo</span>
                  <span className={cn(MONO, "text-neutral-700")}>{formatDateShort(dueDate)}</span>
                </div>
              </div>

              <Checkbox
                className="mt-4"
                checked={receiveAll}
                onChange={(e) => setReceiveAll(e.target.checked)}
                label={
                  <>
                    <span className="font-semibold text-neutral-900">Barang sudah diterima semua</span>
                    <span className="block text-[11px] text-neutral-500">
                      Centang jika barang datang bersama faktur. Stok langsung bertambah saat disimpan.
                    </span>
                  </>
                }
              />

              <div className="mt-3 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  {receiveAll
                    ? `Stok bertambah +${qtyText(totalQty, unit)} ke ${LOCATIONS.find((l) => l.value === location)?.label ?? location} saat pembelian disimpan.`
                    : "Stok belum bertambah saat pembelian disimpan. Stok bertambah otomatis saat barang diterima."}
                </span>
              </div>
            </Card>

            {/* Catatan */}
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">Catatan pembelian</h2>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                Catatan untuk toko (opsional)
              </label>
              <Textarea
                placeholder="Pengiriman bertahap. Konfirmasi jumlah barang saat tiba di gudang."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <p className="mt-3 text-[11px] text-neutral-400 leading-relaxed">
                Kolom bertanda * wajib diisi. Setelah disimpan, pembelian berstatus Belum Diterima (atau Diterima Lengkap jika barang sudah diterima semua).
              </p>
            </Card>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700">
            {error}
          </p>
        )}

        {/* Footer actions */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Siap mencatat pembelian?</p>
            <p className="text-[11px] text-neutral-400">
              {receiveAll
                ? "Pembelian dan penerimaan barang dicatat sekaligus."
                : "Penerimaan barang dapat dicatat setelah pembelian tersimpan."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" fullWidth={false} onClick={() => navigate("/pembelian")}>
              Batal
            </Button>
            <Button
              fullWidth={false}
              disabled={!canSave}
              loading={saving}
              onClick={handleSave}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Simpan pembelian
            </Button>
          </div>
        </div>
      </div>

      <SupplierFormModal open={modal === "supplier"} onSave={saveSupplier} onClose={() => setModal(null)} />
      <StockFormModal open={modal === "product"} lockStock onSave={saveNewProduct} onClose={() => setModal(null)} />
    </AdminShell>
  );
}
