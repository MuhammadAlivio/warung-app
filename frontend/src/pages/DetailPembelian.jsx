import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Info, PackageCheck, PackageSearch, Printer } from "lucide-react";
import AdminShell from "../lib/components/layout/AdminShell";
import { Button, Card } from "../lib/components/ui";
import PaymentModal from "../lib/components/purchase/PaymentModal";
import { cn } from "../lib/utils/cn";
import { formatRupiah } from "../lib/utils/format";
import {
  PILL_CLASS,
  formatDateLong,
  formatDateShort,
  formatTime,
  lastPaymentDate,
  paymentPill,
  purchaseDebt,
  purchasePaid,
  purchaseQty,
  purchaseReceived,
  purchaseTotal,
  receiptPill,
} from "../lib/utils/purchase";
import { usePurchase } from "../lib/stores/PurchaseContext";
import { LOCATIONS, PAYMENT_METHODS, SUPPLIERS } from "../lib/data/purchaseMockData";

const TH = "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500";
const MONO = "font-mono tabular-nums";

const locationLabel = (loc) => LOCATIONS.find((l) => l.value === loc)?.label ?? loc;

export default function DetailPembelian() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { purchases, addPayment } = usePurchase();
  const [payOpen, setPayOpen] = useState(false);

  const purchase = purchases.find((p) => p.id === id);
  if (!purchase) return <Navigate to="/pembelian" replace />;

  const supplier = SUPPLIERS.find((s) => s.id === purchase.supplierId);
  const receipt = receiptPill(purchase);
  const pay = paymentPill(purchase);
  const total = purchaseTotal(purchase);
  const sisa = purchaseDebt(purchase);
  const totalQty = purchaseQty(purchase);
  const totalReceived = purchaseReceived(purchase);
  const totalSisa = totalQty - totalReceived;
  const allReceived = purchase.status === "diterima";
  const isPartial = purchase.status === "diterima_sebagian";
  const receptions = purchase.receptions || [];
  const lastReception = receptions.at(-1);
  const pct = totalQty > 0 ? Math.round((totalReceived / totalQty) * 100) : 0;
  const goReceive = () => navigate(`/pembelian/${purchase.id}/terima`);

  const receiveLabel = isPartial ? "Terima sisa barang" : "Terima barang";
  const [createdDate, createdTime] = (purchase.createdAt || "").split(" ");

  return (
    <AdminShell
      breadcrumb={[{ label: "Ruang kerja" }, { label: "Pembelian & Barang Masuk", href: "/pembelian" }]}
    >
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Back + header */}
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
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-neutral-900">Detail pembelian</h1>
              <p className="mt-1 text-xs text-neutral-500">
                Pantau penerimaan barang dan pembayaran faktur {purchase.purchaseNo}.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden />
                Cetak faktur
              </button>
              {!allReceived && (
                <Button size="sm" fullWidth={false} className="h-10" onClick={goReceive}>
                  <PackageCheck className="h-4 w-4" aria-hidden />
                  {receiveLabel}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Info faktur */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-neutral-900">{purchase.purchaseNo}</span>
              <span className={PILL_CLASS[receipt.tone]}>{receipt.label}</span>
            </div>
            <span className="text-[11px] text-neutral-500">
              Dicatat oleh {purchase.createdBy} · {formatDateShort(purchase.date)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 text-xs sm:grid-cols-4">
            <div>
              <p className="text-neutral-500">Pemasok</p>
              <p className="mt-1.5 font-semibold text-neutral-900">{supplier?.name ?? "-"}</p>
            </div>
            <div>
              <p className="text-neutral-500">Tanggal pembelian</p>
              <p className="mt-1.5 font-semibold text-neutral-900">{formatDateLong(purchase.date)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Lokasi penerimaan</p>
              <p className="mt-1.5 font-semibold text-neutral-900">{locationLabel(purchase.location)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Perkiraan kirim sisa</p>
              <p className="mt-1.5 font-semibold text-neutral-900">
                {formatDateLong(purchase.estimatedNextDelivery || purchase.date)}
              </p>
            </div>
          </div>
        </Card>

        {/* Kartu progres */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs text-neutral-500">Jumlah dipesan</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{totalQty} pcs</p>
            <p className="mt-1.5 text-[11px] text-neutral-500">{purchase.items.length} jenis barang</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-neutral-500">Sudah diterima</p>
            <p className={cn("mt-2 text-2xl font-bold", totalReceived > 0 ? "text-brand-700" : "text-neutral-900")}>
              {totalReceived} pcs
            </p>
            <p className="mt-1.5 text-[11px] text-neutral-500">
              {totalReceived === 0 ? "Belum ada stok bertambah" : `${pct}% dari jumlah dipesan`}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-neutral-500">Sisa penerimaan</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{totalSisa} pcs</p>
            <p className="mt-1.5 text-[11px] text-neutral-500">
              {totalSisa === 0
                ? "Seluruh barang diterima"
                : totalReceived === 0
                  ? "Seluruh barang belum diterima"
                  : "Menunggu pengiriman berikutnya"}
            </p>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
          {/* Kiri */}
          <div className="space-y-5 lg:col-span-3">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900">Barang dipesan</h2>
                <span className="text-[11px] text-neutral-500">{purchase.items.length} jenis barang</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th scope="col" className={TH}>Barang</th>
                      <th scope="col" className={TH}>Harga modal</th>
                      <th scope="col" className={TH}>Dipesan</th>
                      <th scope="col" className={TH}>Diterima</th>
                      <th scope="col" className={TH}>Sisa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.items.map((item) => {
                      const got = item.qtyReceived || 0;
                      return (
                        <tr key={item.id} className="border-t border-neutral-100">
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-neutral-900">{item.productName}</p>
                            <p className="text-[10px] text-neutral-500">
                              {item.sku} · {item.unit}
                            </p>
                          </td>
                          <td className={cn(MONO, "px-4 py-3.5 text-neutral-700")}>{formatRupiah(item.buyPrice)}</td>
                          <td className="px-4 py-3.5 text-neutral-700">{item.qty} pcs</td>
                          <td className={cn("px-4 py-3.5", got > 0 ? "font-semibold text-brand-700" : "text-neutral-700")}>
                            {got} pcs
                          </td>
                          <td className="px-4 py-3.5 text-neutral-700">{item.qty - got} pcs</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isPartial && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-brand-700">
                      {totalReceived} dari {totalQty} pcs diterima
                    </span>
                    <span className="text-neutral-500">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              {!allReceived && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    {totalReceived === 0
                      ? `Belum ada barang masuk. Seluruh ${totalQty} pcs masih menunggu penerimaan dan belum menambah stok.`
                      : `Stok bertambah +${totalReceived} pcs yang sudah diterima, bukan ${totalQty} pcs yang dipesan.`}
                  </span>
                </div>
              )}
            </Card>

            {/* Riwayat penerimaan */}
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900">Riwayat penerimaan</h2>
                <span className="text-[11px] text-neutral-500">{receptions.length} penerimaan</span>
              </div>

              {receptions.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100">
                    <PackageSearch className="h-5 w-5 text-neutral-500" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Belum ada barang diterima</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-neutral-500">
                      Saat barang tiba, catat jumlah yang benar-benar diterima. Anda dapat menerima sebagian dari
                      pesanan ini.
                    </p>
                  </div>
                  {!allReceived && (
                    <Button size="sm" fullWidth={false} onClick={goReceive}>
                      <PackageCheck className="h-4 w-4" aria-hidden />
                      Terima barang
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  {receptions.map((rec) => {
                    const recTotal = rec.items.reduce((s, i) => s + i.qty, 0);
                    return (
                      <div key={rec.id} className="flex gap-3 border-b border-neutral-100 pb-4 last:border-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                          <PackageCheck className="h-4 w-4 text-brand-700" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-neutral-900">Penerimaan #{rec.receptionNo}</p>
                            <span className={PILL_CLASS.green}>+{recTotal} pcs</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-neutral-500">
                            {formatDateShort(rec.date)}, {formatTime(rec.time)} · Diterima oleh {rec.receivedBy}
                          </p>
                          {rec.items.map((ri) => (
                            <p key={ri.productId} className="mt-1.5 text-xs text-neutral-900">
                              {ri.productName} · {ri.qty} pcs
                            </p>
                          ))}
                          {rec.notes && <p className="mt-1 text-[11px] text-neutral-500">{rec.notes}</p>}
                        </div>
                      </div>
                    );
                  })}

                  {!allReceived && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                      <div>
                        <p className="text-xs font-semibold text-neutral-900">Masih menunggu {totalSisa} pcs</p>
                        <p className="mt-0.5 text-[11px] text-neutral-500">
                          Catat penerimaan berikutnya saat barang tiba.
                        </p>
                      </div>
                      <Button size="sm" fullWidth={false} onClick={goReceive}>
                        <PackageCheck className="h-4 w-4" aria-hidden />
                        Terima sisa barang
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Kanan */}
          <div className="space-y-5 lg:col-span-2">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900">Pembayaran & tempo</h3>
                <span className={PILL_CLASS[pay.tone]}>{pay.label}</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Total faktur</span>
                  <span className={cn(MONO, "text-neutral-700")}>{formatRupiah(total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">
                    Sudah dibayar · {formatDateShort(lastPaymentDate(purchase)).replace(/ \d{4}$/, "")}
                  </span>
                  <span className={cn(MONO, "text-neutral-700")}>{formatRupiah(purchasePaid(purchase))}</span>
                </div>
                <div className="border-t border-neutral-100 pt-2.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-neutral-900">Sisa utang</span>
                    <span className={cn(MONO, sisa > 0 ? "text-amber-700" : "text-brand-700")}>
                      {formatRupiah(sisa)}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-neutral-500">Jatuh tempo</span>
                    <span className={cn(MONO, "text-neutral-900")}>{formatDateShort(purchase.dueDate)}</span>
                  </div>
                </div>
              </div>
              {(purchase.payments || []).length > 0 && (
                <ul className="mt-3 space-y-1 text-[11px] text-neutral-500">
                  {purchase.payments.map((x) => (
                    <li key={x.id} className="flex justify-between">
                      <span>
                        Cicilan · {formatDateShort(x.date).replace(/ \d{4}$/, "")} ·{" "}
                        {PAYMENT_METHODS.find((m) => m.value === x.method)?.label ?? x.method}
                      </span>
                      <span className={cn(MONO, "text-neutral-700")}>{formatRupiah(x.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {sisa > 0 && (
                <button
                  type="button"
                  onClick={() => setPayOpen(true)}
                  className="mt-4 flex h-9 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  Catat pembayaran
                </button>
              )}
              <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4 text-[11px] leading-relaxed text-neutral-500">
                <p>Pembayaran tidak mengubah jumlah barang diterima. Stok hanya bertambah saat penerimaan dicatat.</p>
                <p>Pembelian ini dicatat sebagai persediaan. Bukan biaya operasional; HPP diakui saat barang terjual.</p>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-900">Catatan pembelian</h3>
              <p className="text-xs leading-relaxed text-neutral-500">
                {lastReception && purchase.estimatedNextDelivery && isPartial
                  ? `Catatan: sisa ${totalSisa} pcs dikirim pada ${formatDateLong(purchase.estimatedNextDelivery)}.`
                  : purchase.notes || "Tidak ada catatan."}
              </p>
              <p className="mt-3 border-t border-neutral-100 pt-3 text-[11px] text-neutral-500">
                {lastReception
                  ? `Diperbarui ${formatDateShort(lastReception.date)} · ${formatTime(lastReception.time)}`
                  : `Dicatat ${formatDateShort(createdDate || purchase.date)}${createdTime ? ` · ${formatTime(createdTime)}` : ""}`}
              </p>
            </Card>
          </div>
        </div>

        <p className="text-[11px] text-neutral-500">
          Status penerimaan dan pembayaran terpisah. Pembayaran lunas tidak otomatis berarti barang sudah diterima.
        </p>
      </div>
      <PaymentModal
        open={payOpen}
        purchase={purchase}
        onClose={() => setPayOpen(false)}
        onSave={(data) => {
          addPayment(purchase.id, data);
          setPayOpen(false);
        }}
      />
    </AdminShell>
  );
}
