import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Calendar, FileText, Search, Trash2 } from "lucide-react";
import DashboardLayout from "../lib/components/layout/DashboardLayout";
import { Button, Card, Input, Select, Textarea } from "../lib/components/ui";
import { formatRupiah } from "../lib/utils/format";
import { cn } from "../lib/utils/cn";
import { usePurchase } from "../lib/stores/PurchaseContext";
import { useStock } from "../lib/stores/StockContext";
import { SUPPLIERS, LOCATIONS, PAYMENT_METHODS } from "../lib/data/purchaseMockData";

const TH = "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500";

const supplierOptions = SUPPLIERS.map((s) => ({ value: s.id, label: s.name }));
const today = new Date().toISOString().slice(0, 10);
const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

export default function BuatPembelian() {
  const navigate = useNavigate();
  const { addPurchase } = usePurchase();
  const { products } = useStock();

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
  const [payAll, setPayAll] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("transfer_bank");
  const [dueDate, setDueDate] = useState(sevenDaysLater);

  const [saving, setSaving] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

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
  const payment = payAll ? total : Number(initialPayment) || 0;
  const sisaUtang = total - payment;

  const canSave = supplierId && date && items.length > 0 && items.every((i) => i.qty > 0 && i.buyPrice > 0);

  const handleSave = async (draft = false) => {
    if (!canSave) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    addPurchase({
      supplierId,
      purchaseNo: invoiceNo,
      date,
      dueDate,
      location,
      notes,
      initialPayment: payment,
      initialPaymentDate: date,
      paymentMethod,
      additionalCost,
      status: "belum_diterima",
      paymentStatus: payment >= total ? "lunas" : payment > 0 ? "sebagian" : "belum_bayar",
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        unit: i.unit,
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
        { label: "Ruang kerja", href: "/admin" },
        { label: "Pembelian & Barang Masuk", href: "/admin/pembelian" },
      ]}
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate("/admin/pembelian")}
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Pembelian & Barang Masuk
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Buat pembelian</h1>
            <p className="mt-1 text-xs text-neutral-500">
              Catat pembelian ke pemasok. Penerimaan barang dicatat secara terpisah.
            </p>
          </div>
          <button
            type="button"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Draf pembelian
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
          {/* Left column: form */}
          <div className="space-y-4 lg:col-span-3">
            {/* Informasi pembelian */}
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-neutral-900">Informasi pembelian</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Pemasok *"
                  placeholder="Pilih pemasok"
                  options={supplierOptions}
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                />
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
                    {items.length} jenis barang · {items.reduce((s, i) => s + i.qty, 0)} pcs
                  </span>
                )}
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
                  aria-hidden
                />
                <input
                  type="search"
                  aria-label="Cari barang"
                  placeholder="Cari nama atau kode barang untuk ditambahkan..."
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
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  value={item.qty}
                                  onChange={(e) => updateItem(idx, "qty", Math.max(1, Number(e.target.value)))}
                                  className="h-8 w-16 rounded-md border border-neutral-200 px-2 text-xs tabular-nums text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                                />
                                <span className="text-neutral-400">pcs</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <span className="text-neutral-400">Rp</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={item.buyPrice}
                                  onChange={(e) => updateItem(idx, "buyPrice", Math.max(0, Number(e.target.value)))}
                                  className="h-8 w-24 rounded-md border border-neutral-200 px-2 text-xs tabular-nums text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 tabular-nums text-neutral-700">
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
                    Harga modal per pcs. Jumlah barang dapat diterima secara bertahap.
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
                <button
                  type="button"
                  onClick={() => setPayAll((v) => !v)}
                  className={cn(
                    "text-xs font-semibold transition-colors",
                    payAll ? "text-neutral-500" : "text-brand-600 hover:text-brand-700"
                  )}
                >
                  {payAll ? "Bayar sebagian" : "Bayar sebagian"}
                </button>
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
                      value={payAll ? total : initialPayment}
                      disabled={payAll}
                      onChange={(e) => setInitialPayment(Math.max(0, Math.min(total, Number(e.target.value))))}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-xs tabular-nums text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15 disabled:bg-neutral-50 disabled:text-neutral-400"
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
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold text-neutral-900">
                  Jatuh tempo sisa pembayaran *
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-400">
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
                    Subtotal · {items.reduce((s, i) => s + i.qty, 0)} pcs
                  </span>
                  <span className="tabular-nums text-neutral-700">{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Biaya tambahan</span>
                  <span className="tabular-nums text-neutral-400">{formatRupiah(additionalCost)}</span>
                </div>
                <div className="border-t border-neutral-100 pt-2.5">
                  <div className="flex items-center justify-between text-sm font-bold text-neutral-900">
                    <span>Total pembelian</span>
                    <span className="tabular-nums">{formatRupiah(total)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Pembayaran awal</span>
                  <span className="tabular-nums text-neutral-700">{formatRupiah(payment)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-neutral-900">Sisa utang</span>
                  <span className={cn("tabular-nums", sisaUtang > 0 ? "text-red-600" : "text-brand-600")}>
                    {formatRupiah(sisaUtang > 0 ? sisaUtang : 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Jatuh tempo</span>
                  <span className="text-neutral-600">{formatDate(dueDate)}</span>
                </div>
              </div>

              {items.length === 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Belum ada barang diterima. Stok tidak bertambah saat pembelian disimpan.
                  </span>
                </div>
              )}
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
                Kolom bertanda * wajib diisi. Setelah disimpan, pembelian akan berstatus Belum diterima.
              </p>
            </Card>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Siap mencatat pembelian?</p>
            <p className="text-[11px] text-neutral-400">
              Penerimaan barang dapat dicatat setelah pembelian tersimpan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" fullWidth={false} onClick={() => navigate("/admin/pembelian")}>
              Batal
            </Button>
            <Button
              fullWidth={false}
              disabled={!canSave}
              loading={saving}
              onClick={() => handleSave(false)}
              className="gap-1.5"
            >
              + Simpan pembelian
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
