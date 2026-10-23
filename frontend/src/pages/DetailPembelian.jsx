import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, PackageCheck, PackageSearch } from "lucide-react";
import DashboardLayout from "../lib/components/layout/DashboardLayout";
import { Badge, Button, Card, Modal, ModalBody, ModalFooter } from "../lib/components/ui";
import { formatRupiah } from "../lib/utils/format";
import { cn } from "../lib/utils/cn";
import { usePurchase } from "../lib/stores/PurchaseContext";
import { useStock } from "../lib/stores/StockContext";
import { SUPPLIERS, getPurchaseStatus } from "../lib/data/purchaseMockData";

const TH = "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500";

const formatDate = (d) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const supplierById = (id) => SUPPLIERS.find((s) => s.id === id);

export default function DetailPembelian() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { purchases, receiveItems } = usePurchase();
  const { updateProduct, products } = useStock();

  const purchase = purchases.find((p) => p.id === id);

  const [showReceive, setShowReceive] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState([]);
  const [confirming, setConfirming] = useState(false);

  if (!purchase) {
    return (
      <DashboardLayout
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Pembelian", href: "/admin/pembelian" },
          { label: "Detail" },
        ]}
      >
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

  const totalQty = purchase.items.reduce((sum, i) => sum + i.qty, 0);
  const totalReceived = purchase.items.reduce((sum, i) => sum + (i.qtyReceived || 0), 0);
  const progressPct = totalQty > 0 ? Math.round((totalReceived / totalQty) * 100) : 0;
  const progressColor = allReceived ? "bg-brand-600" : totalReceived > 0 ? "bg-amber-500" : "bg-neutral-200";

  const openReceiveModal = () => {
    setReceiveQtys(
      purchase.items.map((item) => {
        const remaining = item.qty - (item.qtyReceived || 0);
        return { productId: item.productId, productName: item.productName, qty: item.qty, qtyReceived: item.qtyReceived || 0, receiveNow: remaining };
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

  const handleConfirmReceive = async () => {
    setConfirming(true);
    await new Promise((r) => setTimeout(r, 400));

    const receivedMap = {};
    for (const r of receiveQtys) {
      const item = purchase.items.find((i) => i.productId === r.productId);
      if (item) {
        receivedMap[item.id] = (item.qtyReceived || 0) + r.receiveNow;
      }
    }
    receiveItems(purchase.id, receivedMap);

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

  return (
    <DashboardLayout
      breadcrumb={[
        { label: "Dashboard", href: "/admin" },
        { label: "Pembelian", href: "/admin/pembelian" },
        { label: `Detail ${purchase.purchaseNo}` },
      ]}
    >
      <div className="mx-auto max-w-4xl space-y-5">
        {/* --- Kembali --- */}
        <button
          type="button"
          onClick={() => navigate("/admin/pembelian")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        {/* --- Header --- */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Detail Pembelian</h1>
          {!allReceived && (
            <Button size="sm" fullWidth={false} className="h-10" onClick={openReceiveModal}>
              <PackageCheck className="h-4 w-4" aria-hidden />
              {isPartial ? "Terima sisa barang" : "Terima barang"}
            </Button>
          )}
        </div>

        {/* --- Info card --- */}
        <Card className="p-5">
          {/* Row 1: No. PB, Tanggal, Supplier */}
          <div className="grid gap-4 text-xs sm:grid-cols-3">
            <div>
              <p className="mb-1 font-semibold text-neutral-500">No. PB</p>
              <p className="font-bold text-neutral-900">{purchase.purchaseNo}</p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-neutral-500">Tanggal</p>
              <p className="text-neutral-900">{formatDate(purchase.date)}</p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-neutral-500">Supplier</p>
              <p className="text-neutral-900">{supplier?.name ?? "-"}</p>
              {supplier?.phone && <p className="mt-0.5 text-[10px] text-neutral-500">{supplier.phone}</p>}
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-neutral-100" />

          {/* Row 2: Status, Catatan */}
          <div className="grid gap-4 text-xs sm:grid-cols-3">
            <div>
              <p className="mb-1 font-semibold text-neutral-500">Status</p>
              <Badge variant={s.variant}>{s.label}</Badge>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1 font-semibold text-neutral-500">Catatan</p>
              <p className="text-neutral-700">{purchase.notes || "-"}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <p className="mb-2 text-xs font-semibold text-neutral-500">Penerimaan barang</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
              <div className={cn("h-full rounded-full transition-all", progressColor)} style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-neutral-500">
              {totalReceived} dari {totalQty} item diterima
            </p>
          </div>
        </Card>

        {/* --- Items table --- */}
        <Card className="min-w-0 p-0">
          <div className="p-4 pb-2">
            <h2 className="text-sm font-semibold">Daftar barang</h2>
          </div>
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead>
                <tr className="bg-neutral-100">
                  <th scope="col" className={cn(TH, "rounded-l-md w-10")}>No</th>
                  <th scope="col" className={TH}>Nama Barang</th>
                  <th scope="col" className={cn(TH, "text-right")}>Qty Dipesan</th>
                  <th scope="col" className={cn(TH, "text-right")}>Qty Diterima</th>
                  <th scope="col" className={cn(TH, "text-right")}>Sisa</th>
                  <th scope="col" className={cn(TH, "text-right")}>Harga Beli</th>
                  <th scope="col" className={cn(TH, "text-right rounded-r-md")}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item, idx) => {
                  const received = item.qtyReceived || 0;
                  const sisa = item.qty - received;
                  const fullyReceived = received >= item.qty;
                  return (
                    <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-3 text-neutral-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-neutral-900">{item.productName}</td>
                      <td className="px-4 py-3 tabular-nums text-right text-neutral-700">{item.qty}</td>
                      <td
                        className={cn(
                          "px-4 py-3 tabular-nums text-right",
                          fullyReceived ? "text-brand-700 font-semibold" : received === 0 ? "text-neutral-400" : "text-amber-600"
                        )}
                      >
                        {received}
                        {fullyReceived && <Check className="ml-1 inline h-3 w-3" />}
                      </td>
                      <td className={cn("px-4 py-3 tabular-nums text-right", sisa > 0 ? "text-red-600 font-semibold" : "text-neutral-400")}>
                        {sisa}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-right text-neutral-700">
                        {formatRupiah(item.buyPrice)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-right text-neutral-700">
                        {formatRupiah(item.qty * item.buyPrice)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-50">
                  <td colSpan={6} className="px-4 py-3 text-right text-xs font-bold text-neutral-900">
                    Total
                  </td>
                  <td className="px-4 py-3 tabular-nums text-right text-sm font-bold text-neutral-900">
                    {formatRupiah(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>

      {/* --- Receive modal --- */}
      <Modal
        open={showReceive}
        onClose={() => setShowReceive(false)}
        title={isPartial ? "Terima sisa barang" : "Terima barang"}
        description="Masukkan jumlah barang yang diterima saat ini."
        className="max-w-[560px]"
      >
        <ModalBody>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-100">
                  <th scope="col" className={cn(TH, "rounded-l-md")}>Nama Barang</th>
                  <th scope="col" className={cn(TH, "text-right")}>Qty Dipesan</th>
                  <th scope="col" className={cn(TH, "text-right")}>Sudah Diterima</th>
                  <th scope="col" className={cn(TH, "text-right")}>Sisa</th>
                  <th scope="col" className={cn(TH, "text-right rounded-r-md")}>Diterima Sekarang</th>
                </tr>
              </thead>
              <tbody>
                {receiveQtys.map((r, idx) => {
                  const remaining = r.qty - r.qtyReceived;
                  return (
                    <tr key={r.productId} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-2.5 font-semibold text-neutral-900">{r.productName}</td>
                      <td className="px-4 py-2.5 tabular-nums text-right text-neutral-700">{r.qty}</td>
                      <td className="px-4 py-2.5 tabular-nums text-right text-neutral-700">{r.qtyReceived}</td>
                      <td className={cn("px-4 py-2.5 tabular-nums text-right", remaining > 0 ? "text-red-600 font-semibold" : "text-neutral-400")}>
                        {remaining}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {remaining > 0 ? (
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            value={r.receiveNow}
                            onChange={(e) => updateReceiveQty(idx, e.target.value)}
                            className="ml-auto h-8 w-16 rounded-md border border-neutral-200 px-2 text-right text-xs tabular-nums text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                          />
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
        </ModalBody>
        <ModalFooter className="justify-end">
          <Button variant="outline" fullWidth={false} onClick={() => setShowReceive(false)}>
            Batal
          </Button>
          <Button fullWidth={false} disabled={!canConfirm} loading={confirming} onClick={handleConfirmReceive}>
            Konfirmasi penerimaan
          </Button>
        </ModalFooter>
      </Modal>
    </DashboardLayout>
  );
}
