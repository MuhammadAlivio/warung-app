import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  PackageCheck,
  PackageSearch,
  Printer,
} from "lucide-react";
import DashboardLayout from "../lib/components/layout/DashboardLayout";
import { Badge, Button, Card } from "../lib/components/ui";
import { formatRupiah } from "../lib/utils/format";
import { cn } from "../lib/utils/cn";
import { usePurchase } from "../lib/stores/PurchaseContext";
import { useStock } from "../lib/stores/StockContext";
import { SUPPLIERS, LOCATIONS, PAYMENT_METHODS, getPurchaseStatus } from "../lib/data/purchaseMockData";

const TH = "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

const supplierById = (id) => SUPPLIERS.find((s) => s.id === id);
const locationLabel = (loc) => LOCATIONS.find((l) => l.value === loc)?.label ?? loc;

export default function DetailPembelian() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { purchases, receiveItems } = usePurchase();
  const { updateProduct, products } = useStock();

  const purchase = purchases.find((p) => p.id === id);

  const [showReceive, setShowReceive] = useState(false);
  const [receiveDate, setReceiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receivedBy, setReceivedBy] = useState("Dina Anggraini");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveQtys, setReceiveQtys] = useState([]);
  const [confirming, setConfirming] = useState(false);

  if (!purchase) {
    navigate("/admin/pembelian");
    return (
      <DashboardLayout breadcrumb="Pembelian & Barang Masuk">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 py-20 text-center">
          <PackageSearch className="h-8 w-8 text-neutral-400" aria-hidden />
          <p className="text-sm font-semibold text-neutral-700">Pembelian tidak ditemukan</p>
          <Button variant="outline" fullWidth={false} onClick={() => navigate("/admin/pembelian")}>
            Kembali
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const s = getPurchaseStatus(purchase.status);
  const supplier = supplierById(purchase.supplierId);
  const total = purchase.items.reduce((sum, i) => sum + i.qty * i.buyPrice, 0);
  const allReceived = purchase.status === "diterima";
  const isPartial = purchase.status === "diterima_sebagian";
  const sisa = total - (purchase.initialPayment || 0);

  const totalQty = purchase.items.reduce((sum, i) => sum + i.qty, 0);
  const totalReceived = purchase.items.reduce((sum, i) => sum + (i.qtyReceived || 0), 0);
  const totalSisa = totalQty - totalReceived;

  const openReceiveModal = () => {
    setReceiveQtys(
      purchase.items.map((item) => {
        const remaining = item.qty - (item.qtyReceived || 0);
        return {
          productId: item.productId,
          productName: item.productName,
          sku: item.sku || "",
          unit: item.unit || "pcs",
          qty: item.qty,
          qtyReceived: item.qtyReceived || 0,
          receiveNow: remaining,
        };
      })
    );
    setShowReceive(true);
  };

  const updateReceiveQty = (idx, val) => {
    setReceiveQtys((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const max = r.qty - r.qtyReceived;
        return { ...r, receiveNow: Math.max(0, Math.min(max, Number(val))) };
      })
    );
  };

  const fillAll = () => {
    setReceiveQtys((prev) =>
      prev.map((r) => ({ ...r, receiveNow: r.qty - r.qtyReceived }))
    );
  };

  const handleConfirmReceive = async () => {
    setConfirming(true);
    await new Promise((r) => setTimeout(r, 400));

    const itemsReceived = receiveQtys
      .filter((r) => r.receiveNow > 0)
      .map((r) => ({ productId: r.productId, productName: r.productName, qty: r.receiveNow }));

    receiveItems(purchase.id, {
      date: receiveDate,
      receivedBy,
      deliveryNote,
      notes: receiveNotes,
      itemsReceived,
    });

    for (const r of receiveQtys) {
      if (r.receiveNow <= 0) continue;
      const product = products.find((p) => p.id === r.productId);
      if (product) {
        updateProduct(r.productId, { stock: product.stock + r.receiveNow });
      }
    }

    setConfirming(false);
    setShowReceive(false);
  };

  const canConfirm = receiveQtys.some((r) => r.receiveNow > 0);
  const totalReceiveNow = receiveQtys.reduce((s, r) => s + (r.receiveNow || 0), 0);

  // Progress after receive
  const afterReceived = totalReceived + totalReceiveNow;
  const afterStatus = afterReceived >= totalQty
    ? "diterima"
    : afterReceived > 0
      ? "diterima_sebagian"
      : purchase.status;

  return (
    <DashboardLayout
      breadcrumb={[
        { label: "Ruang kerja", href: "/admin" },
        { label: "Pembelian & Barang Masuk", href: "/admin/pembelian" },
      ]}
    >
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Back + Header */}
        <div>
          <button
            type="button"
            onClick={() => navigate("/admin/pembelian")}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Pembelian & Barang Masuk
          </button>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Detail pembelian</h1>
              <p className="mt-1 text-xs text-neutral-500">
                Pantau penerimaan barang dan pembayaran faktur {purchase.purchaseNo}.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak faktur
              </button>
              {!allReceived && (
                <Button size="sm" fullWidth={false} onClick={openReceiveModal}>
                  <PackageCheck className="h-4 w-4" aria-hidden />
                  {isPartial ? "Terima sisa barang" : "Terima barang"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
          {/* Left: main content */}
          <div className="space-y-4 lg:col-span-3">
            {/* Invoice info card */}
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-neutral-900">{purchase.purchaseNo}</span>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </div>
                <span className="text-[11px] text-neutral-400">
                  Dicatat oleh {purchase.createdBy} · {formatDate(purchase.date)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                <div>
                  <p className="text-neutral-400">Pemasok</p>
                  <p className="mt-1 font-semibold text-neutral-900">{supplier?.name ?? "-"}</p>
                </div>
                <div>
                  <p className="text-neutral-400">Tanggal pembelian</p>
                  <p className="mt-1 font-semibold text-neutral-900">{formatDate(purchase.date)}</p>
                </div>
                <div>
                  <p className="text-neutral-400">Lokasi penerimaan</p>
                  <p className="mt-1 font-semibold text-neutral-900">{locationLabel(purchase.location)}</p>
                </div>
                <div>
                  <p className="text-neutral-400">Perkiraan kirim sisa</p>
                  <p className="mt-1 font-semibold text-neutral-900">
                    {formatDate(purchase.estimatedNextDelivery || purchase.dueDate)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Progress cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <p className="text-[11px] text-neutral-500">Jumlah dipesan</p>
                <p className="mt-1.5 text-2xl font-bold text-neutral-900">{totalQty} pcs</p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  {purchase.items.length} jenis barang
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-[11px] text-neutral-500">Sudah diterima</p>
                <p className={cn(
                  "mt-1.5 text-2xl font-bold",
                  totalReceived > 0 ? "text-amber-600" : "text-neutral-400"
                )}>
                  {totalReceived} pcs
                </p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  {totalReceived === 0
                    ? "Belum ada stok bertambah"
                    : `${Math.round((totalReceived / totalQty) * 100)}% dari jumlah dipesan`}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-[11px] text-neutral-500">Sisa penerimaan</p>
                <p className={cn(
                  "mt-1.5 text-2xl font-bold",
                  totalSisa > 0 ? "text-neutral-900" : "text-brand-600"
                )}>
                  {totalSisa} pcs
                </p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  {totalSisa === 0 ? "Seluruh barang diterima" : "Menunggu pengiriman berikutnya"}
                </p>
              </Card>
            </div>

            {/* Items table */}
            <Card className="p-0">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <h2 className="text-sm font-semibold">Barang dipesan</h2>
                <span className="text-[11px] text-neutral-400">{purchase.items.length} jenis barang</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-100">
                      <th scope="col" className={TH}>Barang</th>
                      <th scope="col" className={TH}>Harga Modal</th>
                      <th scope="col" className={TH}>Dipesan</th>
                      <th scope="col" className={cn(TH, "text-amber-600")}>Diterima</th>
                      <th scope="col" className={TH}>Sisa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.items.map((item) => {
                      const received = item.qtyReceived || 0;
                      const remaining = item.qty - received;
                      const pct = item.qty > 0 ? Math.round((received / item.qty) * 100) : 0;

                      return (
                        <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-neutral-900">{item.productName}</p>
                            <p className="text-[11px] text-neutral-400">{item.sku} · {item.unit}</p>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-neutral-700">
                            {formatRupiah(item.buyPrice)}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-neutral-700">{item.qty} pcs</td>
                          <td className={cn(
                            "px-4 py-3 tabular-nums font-semibold",
                            received >= item.qty
                              ? "text-brand-700"
                              : received > 0
                                ? "text-amber-600"
                                : "text-neutral-400"
                          )}>
                            {received} pcs
                          </td>
                          <td className={cn(
                            "px-4 py-3 tabular-nums",
                            remaining > 0 ? "text-neutral-700" : "text-neutral-400"
                          )}>
                            {remaining} pcs
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Progress bar (partial) */}
              {isPartial && (
                <div className="px-5 py-3 border-t border-neutral-100">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1.5">
                    <span>{totalReceived} dari {totalQty} pcs diterima</span>
                    <span>{Math.round((totalReceived / totalQty) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all"
                      style={{ width: `${Math.round((totalReceived / totalQty) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Info alert */}
              {!allReceived && (
                <div className="mx-4 mb-4 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {totalReceived === 0
                      ? "Belum ada barang masuk. Seluruh 48 pcs masih menunggu penerimaan dan belum menambah stok."
                      : `Stok bertambah +${totalReceived} pcs yang sudah diterima, bukan ${totalQty} pcs yang dipesan.`}
                  </span>
                </div>
              )}
            </Card>

            {/* Riwayat penerimaan */}
            <Card className="p-0">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <h2 className="text-sm font-semibold">Riwayat penerimaan</h2>
                <span className="text-[11px] text-neutral-400">
                  {(purchase.receptions || []).length} penerimaan
                </span>
              </div>

              {(purchase.receptions || []).length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                    <PackageSearch className="h-5 w-5 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-700">Belum ada barang diterima</p>
                    <p className="mt-1 text-xs text-neutral-400 max-w-xs mx-auto">
                      Saat barang tiba, catat jumlah yang benar-benar diterima. Anda dapat menerima
                      sebagian dari pesanan ini.
                    </p>
                  </div>
                  {!allReceived && (
                    <Button size="sm" fullWidth={false} onClick={openReceiveModal}>
                      <PackageCheck className="h-4 w-4" />
                      Terima barang
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {(purchase.receptions || []).map((rec) => {
                    const recTotal = rec.items.reduce((s, i) => s + i.qty, 0);
                    return (
                      <div key={rec.id} className="px-5 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50">
                              <PackageCheck className="h-3.5 w-3.5 text-brand-600" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-neutral-900">
                                Penerimaan #{rec.receptionNo}
                              </p>
                              <p className="text-[11px] text-neutral-400">
                                {formatDate(rec.date)}, {rec.time} · Diterima oleh {rec.receivedBy}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                            +{recTotal} pcs
                          </span>
                        </div>
                        {rec.items.map((ri) => (
                          <p key={ri.productId} className="mt-2 text-[11px] text-neutral-500 ml-10">
                            {ri.productName} · {ri.qty} pcs
                          </p>
                        ))}
                        {rec.notes && (
                          <p className="mt-1.5 text-[11px] text-neutral-400 ml-10 italic">
                            {rec.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {!allReceived && (
                    <div className="px-5 py-3 flex items-center justify-between">
                      <p className="text-xs text-neutral-500">
                        Masih menunggu {totalSisa} pcs
                      </p>
                      <Button size="sm" fullWidth={false} onClick={openReceiveModal}>
                        <PackageCheck className="h-3.5 w-3.5" />
                        Terima sisa barang
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Right: payment + notes */}
          <div className="space-y-4 lg:col-span-2">
            {/* Pembayaran & tempo */}
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-neutral-900">Pembayaran & tempo</h3>
                {sisa > 0 && (
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                    Sebagian
                  </span>
                )}
                {sisa <= 0 && (
                  <span className="rounded-md bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700">
                    Lunas
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Total faktur</span>
                  <span className="tabular-nums text-neutral-700">{formatRupiah(total)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">
                    Sudah dibayar · {formatDate(purchase.initialPaymentDate || purchase.date)}
                  </span>
                  <span className="tabular-nums text-neutral-700">
                    {formatRupiah(purchase.initialPayment || 0)}
                  </span>
                </div>
                <div className="border-t border-neutral-100 pt-2.5">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-neutral-900">Sisa utang</span>
                    <span className={sisa > 0 ? "text-red-600" : "text-brand-600"}>
                      {formatRupiah(sisa > 0 ? sisa : 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1.5">
                    <span className="text-neutral-400">Jatuh tempo</span>
                    <span className="text-neutral-700">{formatDate(purchase.dueDate)}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Catat pembayaran
              </button>
              <p className="mt-3 text-[11px] text-neutral-400 leading-relaxed">
                Pembayaran tidak mengubah jumlah barang diterima. Stok hanya bertambah saat penerimaan dicatat.
              </p>
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Pembelian ini dicatat sebagai persediaan. Bukan biaya operasional; HPP dihitung saat barang terjual.
                </p>
              </div>
            </Card>

            {/* Catatan pembelian */}
            {purchase.notes && (
              <Card className="p-5">
                <h3 className="mb-3 font-semibold text-sm text-neutral-900">Catatan pembelian</h3>
                <p className="text-xs text-neutral-700 leading-relaxed">{purchase.notes}</p>
                <p className="mt-3 text-[11px] text-neutral-400">
                  Dicatat {formatDate(purchase.date)} · {purchase.createdAt?.slice(11) || "08:45"}
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Terima barang overlay / page-style */}
      {showReceive && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8">
          <div className="w-full max-w-6xl rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="border-b border-neutral-100 px-6 py-5">
              <button
                type="button"
                onClick={() => navigate("/admin/pembelian")}
                className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Pembelian & Barang Masuk
              </button>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Terima sisa barang</h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    Catat jumlah yang tiba sekarang. Sisa lainnya tetap bisa diterima nanti.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReceive(false)}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Kembali ke detail
                </button>
              </div>
            </div>

            <div className="p-6 grid gap-5 lg:grid-cols-5">
              {/* Left: form */}
              <div className="space-y-4 lg:col-span-3">
                {/* Invoice info bar */}
                <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-neutral-900">{purchase.purchaseNo}</span>
                    <span className="text-xs font-medium text-brand-700">{supplier?.name}</span>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-neutral-400">Sisa yang bisa diterima</p>
                    <p className="text-lg font-bold text-neutral-900">{totalSisa} pcs</p>
                  </div>
                </div>

                <p className="text-xs text-neutral-500">
                  Dipesan {formatDate(purchase.date)} · {locationLabel(purchase.location)} · Penerimaan terakhir{" "}
                  {(purchase.receptions || []).length > 0
                    ? `#${purchase.receptions[purchase.receptions.length - 1].receptionNo}`
                    : "—"}
                </p>

                {/* Items */}
                <Card className="p-0">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                    <h3 className="text-sm font-semibold">Barang diterima sekarang</h3>
                    <button
                      type="button"
                      onClick={fillAll}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      Isi semua sisa
                    </button>
                  </div>
                  <p className="px-5 pt-3 text-[11px] text-neutral-400">
                    Masukkan jumlah aktual yang diterima, maksimal sebanyak sisa pesanan.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-100">
                          <th className={TH}>Barang</th>
                          <th className={TH}>Dipesan</th>
                          <th className={TH}>Diterima</th>
                          <th className={TH}>Sisa</th>
                          <th className={TH}>Diterima Sekarang</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiveQtys.map((r, idx) => {
                          const remaining = r.qty - r.qtyReceived;
                          return (
                            <tr key={r.productId} className="border-b border-neutral-100 last:border-0">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-neutral-900">{r.productName}</p>
                                <p className="text-[11px] text-neutral-400">{r.sku} · {r.unit}</p>
                              </td>
                              <td className="px-4 py-3 tabular-nums text-neutral-700">{r.qty} pcs</td>
                              <td className="px-4 py-3 tabular-nums text-neutral-700">{r.qtyReceived} pcs</td>
                              <td className={cn(
                                "px-4 py-3 tabular-nums",
                                remaining > 0 ? "text-neutral-700" : "text-neutral-400"
                              )}>
                                {remaining} pcs
                              </td>
                              <td className="px-4 py-3">
                                {remaining > 0 ? (
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        min={0}
                                        max={remaining}
                                        value={r.receiveNow}
                                        onChange={(e) => updateReceiveQty(idx, e.target.value)}
                                        className="h-9 w-20 rounded-lg border border-neutral-200 px-3 text-xs tabular-nums text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                                      />
                                      <span className="text-neutral-400">pcs</span>
                                    </div>
                                    <p className="mt-1 text-[10px] text-neutral-400">
                                      Maks. {remaining} pcs · Sisa nanti {remaining - (r.receiveNow || 0)} pcs
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-brand-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span className="text-xs font-semibold">Lengkap</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {totalReceiveNow > 0 && (
                    <div className="mx-4 mb-4 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        Boleh menerima sebagian lagi. Isi 0 untuk barang yang belum tiba; jumlah tidak boleh melebihi sisa pesanan.
                      </span>
                    </div>
                  )}
                </Card>

                {/* Informasi penerimaan */}
                <Card className="p-5">
                  <h3 className="mb-4 text-sm font-semibold">Informasi penerimaan</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-neutral-900">
                        Tanggal penerimaan *
                      </label>
                      <input
                        type="date"
                        value={receiveDate}
                        onChange={(e) => setReceiveDate(e.target.value)}
                        className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-neutral-900">
                        Diterima oleh *
                      </label>
                      <select
                        value={receivedBy}
                        onChange={(e) => setReceivedBy(e.target.value)}
                        className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                      >
                        <option>Dina Anggraini</option>
                        <option>Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-semibold text-neutral-900">
                      Nomor surat jalan (opsional)
                    </label>
                    <input
                      type="text"
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="SJ-1019-02"
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs placeholder:text-neutral-400 text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-semibold text-neutral-900">
                      Catatan penerimaan (opsional)
                    </label>
                    <textarea
                      value={receiveNotes}
                      onChange={(e) => setReceiveNotes(e.target.value)}
                      rows={3}
                      placeholder="Barang diterima dalam kondisi baik..."
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs placeholder:text-neutral-400 text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15 resize-none"
                    />
                  </div>
                </Card>
              </div>

              {/* Right: summary */}
              <div className="space-y-4 lg:col-span-2">
                <Card className="p-5">
                  <h3 className="mb-4 font-semibold text-sm text-neutral-900">Ringkasan penerimaan</h3>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Jumlah dipesan</span>
                      <span className="tabular-nums text-neutral-700">{totalQty} pcs</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Sudah diterima sebelumnya</span>
                      <span className="tabular-nums text-neutral-700">{totalReceived} pcs</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Diterima sekarang</span>
                      <span className={cn(
                        "tabular-nums font-semibold",
                        totalReceiveNow > 0 ? "text-brand-600" : "text-neutral-400"
                      )}>
                        +{totalReceiveNow} pcs
                      </span>
                    </div>
                    <div className="border-t border-neutral-100 pt-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-neutral-900">Total setelah disimpan</span>
                        <span className="tabular-nums text-neutral-900">
                          {afterReceived} / {totalQty} pcs
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1.5">
                        <span className="text-neutral-400">Sisa setelah penerimaan</span>
                        <span className={cn(
                          "tabular-nums font-semibold",
                          totalQty - afterReceived > 0 ? "text-amber-600" : "text-brand-600"
                        )}>
                          {totalQty - afterReceived} pcs
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1.5">
                        <span className="text-neutral-400">Status setelah disimpan</span>
                        <Badge variant={getPurchaseStatus(afterStatus).variant}>
                          {getPurchaseStatus(afterStatus).label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {totalReceiveNow > 0 && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        Stok {locationLabel(purchase.location)} bertambah +{totalReceiveNow} pcs.
                        Sisa {totalQty - afterReceived} pcs tetap menunggu penerimaan berikutnya.
                      </span>
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <h3 className="mb-3 font-semibold text-sm text-neutral-900">Pembayaran tidak berubah</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Total faktur</span>
                      <span className="tabular-nums text-neutral-700">{formatRupiah(total)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Sudah dibayar</span>
                      <span className="tabular-nums text-neutral-700">
                        {formatRupiah(purchase.initialPayment || 0)}
                      </span>
                    </div>
                    <div className="border-t border-neutral-100 pt-2">
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span className="text-neutral-900">Sisa utang</span>
                        <span className={sisa > 0 ? "text-red-600" : "text-brand-600"}>
                          {formatRupiah(sisa > 0 ? sisa : 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-neutral-400 leading-relaxed">
                    Jatuh tempo {formatDate(purchase.dueDate)}. Penerimaan ini hanya mencatat barang masuk, bukan pembayaran.
                  </p>
                </Card>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50">
                  <PackageCheck className="h-3.5 w-3.5 text-brand-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-900">
                    Terima {totalReceiveNow} pcs ke {locationLabel(purchase.location)}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Sisa {totalQty - afterReceived} pcs belum diterima. Periksa jumlah sebelum menyimpan.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReceive(false)}
                  className="flex h-9 items-center rounded-lg border border-neutral-200 px-4 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Batal
                </button>
                <Button
                  fullWidth={false}
                  disabled={!canConfirm}
                  loading={confirming}
                  onClick={handleConfirmReceive}
                >
                  <PackageCheck className="h-4 w-4" />
                  Simpan penerimaan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="mt-5 text-center text-[11px] text-neutral-400">
        Status penerimaan dan pembayaran terpisah. Pembayaran lunas tidak otomatis berarti barang sudah diterima.
      </p>
    </DashboardLayout>
  );
}
