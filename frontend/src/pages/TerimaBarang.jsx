import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Info, PackageCheck } from "lucide-react";
import AdminShell from "../lib/components/layout/AdminShell";
import { Button, Card } from "../lib/components/ui";
import { cn } from "../lib/utils/cn";
import { formatRupiah } from "../lib/utils/format";
import {
  PILL_CLASS,
  formatDateShort,
  purchaseDebt,
  purchasePaid,
  purchaseQty,
  purchaseReceived,
  purchaseTotal,
  qtyText,
  receiptPill,
  unitOf,
} from "../lib/utils/purchase";
import { usePurchase } from "../lib/stores/PurchaseContext";
import { useAuth } from "../lib/stores/AuthContext";

const TH = "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500";
const MONO = "font-mono tabular-nums";
const FIELD =
  "h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15";

/** Tanggal hari ini (waktu lokal), format "YYYY-MM-DD". */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function TerimaBarang() {
  const { id } = useParams();
  const { getPurchase, loaded } = usePurchase();
  const purchase = getPurchase(id);

  if (!loaded) {
    return (
      <AdminShell breadcrumb={[{ label: "Ruang kerja" }, { label: "Pembelian & Barang Masuk", href: "/pembelian" }]}>
        <p className="py-14 text-center text-xs text-neutral-500">Memuat faktur pembelian…</p>
      </AdminShell>
    );
  }
  if (!purchase) return <Navigate to="/pembelian" replace />;
  if (purchase.status === "diterima") return <Navigate to={`/pembelian/${id}`} replace />;
  return <TerimaForm purchase={purchase} />;
}

function TerimaForm({ purchase }) {
  const navigate = useNavigate();
  const { receiveItems } = usePurchase();
  const { user } = useAuth();

  const [receiveDate, setReceiveDate] = useState(todayLocal);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState(() =>
    purchase.items.map((item) => ({
      purchaseItemId: item.id,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku || "",
      unit: item.unit || "pcs",
      qty: item.qty,
      qtyReceived: item.qtyReceived || 0,
      receiveNow: item.qty - (item.qtyReceived || 0),
    })),
  );

  const unit = unitOf(purchase.items);
  const receipt = receiptPill(purchase);
  const detailPath = `/pembelian/${purchase.id}`;
  const total = purchaseTotal(purchase);
  const debt = purchaseDebt(purchase);
  const totalQty = purchaseQty(purchase);
  const totalReceived = purchaseReceived(purchase);
  const totalSisa = totalQty - totalReceived;
  const lastReception = (purchase.receptions || []).at(-1);
  const isFollowUp = totalReceived > 0;

  const totalNow = rows.reduce((s, r) => s + (r.receiveNow || 0), 0);
  const afterReceived = totalReceived + totalNow;
  const afterRemaining = totalQty - afterReceived;
  const afterStatus = afterRemaining <= 0 ? "diterima" : afterReceived > 0 ? "diterima_sebagian" : purchase.status;
  const afterPill = receiptPill({ ...purchase, status: afterStatus });

  const setQty = (idx, val) =>
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const max = r.qty - r.qtyReceived;
        return { ...r, receiveNow: Math.max(0, Math.min(max, Number(val) || 0)) };
      }),
    );

  const fillAll = () => setRows((prev) => prev.map((r) => ({ ...r, receiveNow: r.qty - r.qtyReceived })));

  // Stok bertambah otomatis di backend saat penerimaan disimpan (StockService, tercatat di mutasi stok)
  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await receiveItems(purchase.id, {
        date: receiveDate,
        deliveryNote,
        notes,
        items: rows.filter((r) => r.receiveNow > 0).map((r) => ({ purchaseItemId: r.purchaseItemId, qty: r.receiveNow })),
      });
      navigate(detailPath);
    } catch (e) {
      setError(Object.values(e.data?.errors ?? {})[0]?.[0] ?? e.message);
      setSaving(false);
    }
  };

  return (
    <AdminShell
      breadcrumb={[{ label: "Ruang kerja" }, { label: "Pembelian & Barang Masuk", href: "/pembelian" }]}
    >
      <div className="mx-auto max-w-6xl space-y-5 pb-16">
        <div>
          <button
            type="button"
            onClick={() => navigate("/pembelian")}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Pembelian & Barang Masuk
          </button>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-neutral-900">
                {isFollowUp ? "Terima sisa barang" : "Terima barang"}
              </h1>
              <p className="mt-1 text-xs text-neutral-500">
                Catat jumlah yang tiba sekarang. Sisa lainnya tetap bisa diterima nanti.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(detailPath)}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Kembali ke detail
            </button>
          </div>
        </div>

        {/* Info faktur */}
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-neutral-900">{purchase.purchaseNo}</span>
              <span className="text-xs font-semibold text-brand-700">{purchase.supplierName}</span>
              <span className={PILL_CLASS[receipt.tone]}>{receipt.label}</span>
            </div>
            <p className="mt-2 text-[11px] text-neutral-500">
              Dipesan {formatDateShort(purchase.date)} · {purchase.locationName}
              {lastReception && ` · Penerimaan terakhir #${lastReception.receptionNo}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-neutral-500">Sisa yang bisa diterima</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{qtyText(totalSisa, unit)}</p>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-5">
          {/* Kiri */}
          <div className="space-y-5 lg:col-span-3">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900">Barang diterima sekarang</h2>
                <button type="button" onClick={fillAll} className="text-xs font-semibold text-brand-700 hover:underline">
                  Isi semua sisa
                </button>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                Masukkan jumlah aktual yang diterima, maksimal sebanyak sisa pesanan.
              </p>

              <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full min-w-[0] text-left text-xs">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th scope="col" className={TH}>Barang</th>
                      <th scope="col" className={TH}>Dipesan</th>
                      <th scope="col" className={TH}>Diterima</th>
                      <th scope="col" className={TH}>Sisa</th>
                      <th scope="col" className={TH}>Diterima sekarang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const remaining = r.qty - r.qtyReceived;
                      return (
                        <tr key={r.purchaseItemId} className="border-t border-neutral-100">
                          <td className="px-3 py-3.5">
                            <p className="font-semibold text-neutral-900">{r.productName}</p>
                            <p className="text-[10px] text-neutral-500">
                              {r.sku ? `${r.sku} · ${r.unit}` : r.unit}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-neutral-700">{qtyText(r.qty, r.unit)}</td>
                          <td className={cn("whitespace-nowrap px-3 py-3.5", r.qtyReceived > 0 ? "text-brand-700" : "text-neutral-700")}>
                            {qtyText(r.qtyReceived, r.unit)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 font-bold text-neutral-900">{qtyText(remaining, r.unit)}</td>
                          <td className="px-3 py-3.5">
                            {remaining > 0 ? (
                              <>
                                <div className="flex h-10 w-32 items-center rounded-lg border border-brand-600 bg-white px-3 focus-within:ring-4 focus-within:ring-brand-600/15">
                                  <input
                                    type="number"
                                    min={0}
                                    max={remaining}
                                    value={r.receiveNow}
                                    onChange={(e) => setQty(idx, e.target.value)}
                                    aria-label={`Jumlah ${r.productName} diterima sekarang`}
                                    className="w-full min-w-0 bg-transparent text-xs tabular-nums text-neutral-900 focus:outline-none"
                                  />
                                  <span className="text-xs text-neutral-500">{r.unit}</span>
                                </div>
                                <p className="mt-1 text-[10px] text-neutral-500">
                                  Maks. {qtyText(remaining, r.unit)} · Sisa nanti {qtyText(remaining - (r.receiveNow || 0), r.unit)}
                                </p>
                              </>
                            ) : (
                              <span className="text-xs font-semibold text-brand-700">Lengkap</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  Boleh menerima sebagian lagi. Isi 0 untuk barang yang belum tiba; jumlah tidak boleh melebihi sisa
                  pesanan.
                </span>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-neutral-900">Informasi penerimaan</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="tgl-terima" className="mb-1.5 block text-xs font-semibold text-neutral-900">
                    Tanggal penerimaan *
                  </label>
                  <div className="relative">
                    <input
                      id="tgl-terima"
                      type="date"
                      value={receiveDate}
                      onChange={(e) => setReceiveDate(e.target.value)}
                      className={cn(FIELD, "pr-9")}
                    />
                    <CalendarDays
                      className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 bg-white text-neutral-500"
                      aria-hidden
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="diterima-oleh" className="mb-1.5 block text-xs font-semibold text-neutral-900">
                    Diterima oleh
                  </label>
                  {/* Dicatat atas nama akun yang sedang login */}
                  <input id="diterima-oleh" type="text" value={user?.name ?? ""} readOnly className={cn(FIELD, "bg-neutral-50 text-neutral-600")} />
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="surat-jalan" className="mb-1.5 block text-xs font-semibold text-neutral-900">
                  Nomor surat jalan (opsional)
                </label>
                <input
                  id="surat-jalan"
                  type="text"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="SJ-1019-02"
                  className={FIELD}
                />
              </div>
              <div className="mt-4">
                <label htmlFor="catatan-terima" className="mb-1.5 block text-xs font-semibold text-neutral-900">
                  Catatan penerimaan (opsional)
                </label>
                <textarea
                  id="catatan-terima"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Barang diterima dalam kondisi baik..."
                  className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                />
              </div>
            </Card>
          </div>

          {/* Kanan */}
          <div className="space-y-5 self-start lg:col-span-2">
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-neutral-900">Ringkasan penerimaan</h2>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Jumlah dipesan</span>
                  <span className={cn(MONO, "text-neutral-700")}>{qtyText(totalQty, unit)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Sudah diterima sebelumnya</span>
                  <span className={cn(MONO, "text-neutral-700")}>{qtyText(totalReceived, unit)}</span>
                </div>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-neutral-900">Diterima sekarang</span>
                  <span className={cn(MONO, "text-neutral-900")}>+{qtyText(totalNow, unit)}</span>
                </div>
                <div className="space-y-2.5 border-t border-neutral-100 pt-2.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-neutral-900">Total setelah disimpan</span>
                    <span className={cn(MONO, "text-neutral-900")}>
                      {afterReceived} / {qtyText(totalQty, unit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-neutral-900">Sisa setelah penerimaan</span>
                    <span className={cn(MONO, afterRemaining > 0 ? "text-amber-700" : "text-brand-700")}>
                      {qtyText(afterRemaining, unit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Status setelah disimpan</span>
                    <span className={PILL_CLASS[afterPill.tone]}>{afterPill.label}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  Stok {purchase.locationName} bertambah +{qtyText(totalNow, unit)}.
                  {afterRemaining > 0 && ` Sisa ${qtyText(afterRemaining, unit)} tetap menunggu penerimaan berikutnya.`}
                </span>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-neutral-900">Pembayaran tidak berubah</h2>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Total faktur</span>
                  <span className={cn(MONO, "text-neutral-700")}>{formatRupiah(total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Sudah dibayar</span>
                  <span className={cn(MONO, "text-neutral-700")}>{formatRupiah(purchasePaid(purchase))}</span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5 font-bold">
                  <span className="text-neutral-900">Sisa utang</span>
                  <span className={cn(MONO, debt > 0 ? "text-amber-700" : "text-brand-700")}>{formatRupiah(debt)}</span>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
                Jatuh tempo {formatDateShort(purchase.dueDate)}. Penerimaan ini hanya mencatat barang masuk, bukan
                pembayaran.
              </p>
            </Card>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700">
            {error}
          </p>
        )}

        {/* Footer aksi */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <PackageCheck className="h-4 w-4 text-brand-700" aria-hidden />
            <div>
              <p className="text-xs font-semibold text-neutral-900">
                Terima {qtyText(totalNow, unit)} ke {purchase.locationName}
              </p>
              <p className="text-[11px] text-neutral-500">
                Sisa {qtyText(afterRemaining, unit)} belum diterima. Periksa jumlah sebelum menyimpan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(detailPath)}
              className="flex h-10 items-center rounded-lg border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Batal
            </button>
            <Button fullWidth={false} className="h-10" disabled={totalNow <= 0} loading={saving} onClick={handleSave}>
              <PackageCheck className="h-4 w-4" aria-hidden />
              Simpan penerimaan
            </Button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
