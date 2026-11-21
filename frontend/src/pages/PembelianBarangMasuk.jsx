import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, PackageCheck, Plus, Search, Info } from "lucide-react";
import AdminShell from "../lib/components/layout/AdminShell";
import { Button, Card } from "../lib/components/ui";
import PaymentModal from "../lib/components/purchase/PaymentModal";
import PeriodFilter, { currentMonth, defaultPeriod, inPeriod } from "../lib/components/purchase/PeriodFilter";
import { cn } from "../lib/utils/cn";
import { formatRupiah } from "../lib/utils/format";
import {
  PILL_CLASS,
  RECEIPT_STATUS_OPTIONS,
  formatDateLong,
  formatDateShort,
  lastPaymentDate,
  paymentPill,
  purchaseDebt,
  purchasePaid,
  purchaseQty,
  purchaseReceived,
  purchaseSummary,
  purchaseTotal,
  qtyText,
  receiptPill,
  unitOf,
} from "../lib/utils/purchase";
import { usePurchase } from "../lib/stores/PurchaseContext";

const TH = "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500";
const MONO = "font-mono tabular-nums";
const PREVIEW_COUNT = 5;

function SummaryCard({ label, value, hint }) {
  return (
    <Card className="p-5">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={cn(MONO, "mt-2 text-2xl font-bold text-neutral-900")}>{value}</p>
      <p className="mt-1.5 text-[11px] text-neutral-500">{hint}</p>
    </Card>
  );
}

export default function PembelianBarangMasuk() {
  const navigate = useNavigate();
  const { purchases, addPayment, loading, loaded, error, reload } = usePurchase();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState(defaultPeriod);
  const [selectedId, setSelectedId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return purchases.filter((p) => {
      if (q && !p.purchaseNo.toLowerCase().includes(q) && !p.supplierName.toLowerCase().includes(q)) {
        return false;
      }
      if (status && p.status !== status) return false;
      if (!inPeriod(p.date, period)) return false;
      return true;
    });
  }, [purchases, query, status, period]);

  // Daftar awal hanya 5 faktur terbaru (data sudah urut terbaru dari backend); "Lihat semua" menampilkan seluruhnya
  const visible = showAll ? filtered : filtered.slice(0, PREVIEW_COUNT);
  const hiddenCount = filtered.length - visible.length;
  const selected = filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;
  const S = useMemo(() => purchaseSummary(purchases, currentMonth()), [purchases]);

  return (
    <AdminShell
      breadcrumb={[{ label: "Ruang kerja" }, { label: "Pembelian & Barang Masuk" }]}
    >
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-neutral-900">
              Pembelian & Barang Masuk
            </h1>
            <p className="mt-1 text-xs text-neutral-500">Catat faktur, terima barang, dan pantau jatuh tempo.</p>
          </div>
          <Button size="sm" fullWidth={false} className="h-10" onClick={() => navigate("/pembelian/buat")}>
            <Plus className="h-4 w-4" aria-hidden />
            Buat pembelian
          </Button>
        </div>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700">
            <p>Gagal memuat data pembelian: {error}</p>
            <button type="button" onClick={reload} className="font-semibold underline">
              Coba lagi
            </button>
          </div>
        )}

        {/* Ringkasan */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Pembelian bulan ini"
            value={formatRupiah(S.monthTotal)}
            hint={`${S.monthCount} faktur pembelian`}
          />
          <SummaryCard
            label="Belum selesai diterima"
            value={`${S.unfinishedCount} faktur`}
            hint="Stok menunggu penerimaan"
          />
          <SummaryCard
            label="Utang pemasok"
            value={formatRupiah(S.debtTotal)}
            hint={`${S.debtCount} faktur belum lunas`}
          />
          <SummaryCard
            label="Jatuh tempo ≤ 7 hari"
            value={formatRupiah(S.dueSoonTotal)}
            hint={`${S.dueSoonCount} faktur perlu dibayar`}
          />
        </div>

        {/* Faktur pembelian */}
        <Card className="min-w-0 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">Faktur pembelian</h2>
            <span className="text-[11px] text-neutral-500">
              {filtered.length > PREVIEW_COUNT && !showAll
                ? `${PREVIEW_COUNT} terbaru dari ${filtered.length} faktur`
                : `${filtered.length} faktur`}
            </span>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
                aria-hidden
              />
              <input
                type="search"
                aria-label="Cari faktur pembelian"
                placeholder="Cari nomor faktur atau pemasok..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
              />
            </div>
            <PeriodFilter value={period} onChange={setPeriod} />
            <div className="relative">
              <select
                aria-label="Filter status penerimaan"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 appearance-none rounded-lg border border-neutral-200 bg-white pl-3 pr-9 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
              >
                <option value="">Semua status</option>
                {RECEIPT_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
                aria-hidden
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="bg-neutral-100">
                  <th scope="col" className={TH}>Faktur / Tanggal</th>
                  <th scope="col" className={TH}>Pemasok</th>
                  <th scope="col" className={TH}>Total</th>
                  <th scope="col" className={TH}>Penerimaan</th>
                  <th scope="col" className={TH}>Sisa utang</th>
                  <th scope="col" className={TH}>Jatuh tempo</th>
                  <th scope="col" className={TH}>Pembayaran</th>
                </tr>
              </thead>
              <tbody>
                {loading && !loaded ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-xs text-neutral-500">
                      Memuat faktur pembelian…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center">
                      {purchases.length === 0 ? (
                        <>
                          <p className="text-sm font-semibold text-neutral-700">Belum ada pembelian</p>
                          <p className="mt-1 text-xs text-neutral-500">Klik "Buat pembelian" untuk mencatat faktur pemasok.</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-neutral-700">Faktur tidak ditemukan</p>
                          <p className="mt-1 text-xs text-neutral-500">Coba ubah kata kunci atau filter pencarian.</p>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  visible.map((p) => {
                    const receipt = receiptPill(p, { short: true });
                    const pay = paymentPill(p);
                    const active = selected?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedId(p.id)}
                        className={cn(
                          "cursor-pointer border-t border-neutral-100 transition-colors",
                          active ? "bg-brand-50" : "hover:bg-neutral-50",
                        )}
                      >
                        <td className="px-3 py-3.5">
                          <button
                            type="button"
                            aria-pressed={active}
                            onClick={() => setSelectedId(p.id)}
                            className="block text-left font-mono text-xs font-bold text-neutral-900"
                          >
                            {p.purchaseNo}
                          </button>
                          <p className="mt-0.5 text-[10px] text-neutral-500">{formatDateShort(p.date)}</p>
                        </td>
                        <td className="px-3 py-3.5 text-neutral-700">{p.supplierName}</td>
                        <td className={cn(MONO, "px-3 py-3.5 text-neutral-700")}>{formatRupiah(purchaseTotal(p))}</td>
                        <td className="px-3 py-3.5">
                          <span className={PILL_CLASS[receipt.tone]}>{receipt.label}</span>
                        </td>
                        <td className={cn(MONO, "px-3 py-3.5 text-neutral-700")}>{formatRupiah(purchaseDebt(p))}</td>
                        <td className="px-3 py-3.5 text-neutral-700">{formatDateShort(p.dueDate)}</td>
                        <td className="px-3 py-3.5">
                          <span className={PILL_CLASS[pay.tone]}>{pay.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {(hiddenCount > 0 || (showAll && filtered.length > PREVIEW_COUNT)) && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="mt-3 w-full rounded-lg border border-neutral-200 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              {showAll ? "Tampilkan lebih sedikit" : `Lihat semua faktur (${filtered.length}) →`}
            </button>
          )}
        </Card>

        {/* Detail faktur terpilih */}
        {selected && <SelectedInvoice purchase={selected} navigate={navigate} addPayment={addPayment} />}
      </div>
    </AdminShell>
  );
}

function SelectedInvoice({ purchase: p, navigate, addPayment }) {
  const [payOpen, setPayOpen] = useState(false);
  const receipt = receiptPill(p);
  const total = purchaseTotal(p);
  const qty = purchaseQty(p);
  const received = purchaseReceived(p);
  const remaining = qty - received;
  const debt = purchaseDebt(p);
  const lastReception = (p.receptions || []).at(-1);
  const allReceived = p.status === "diterima";
  const unit = unitOf(p.items);
  const lastPaid = lastPaymentDate(p);

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Card className="p-5 lg:col-span-3">
        <div className="flex items-center justify-between">
          <Link
            to={`/pembelian/${p.id}`}
            className="text-sm font-bold text-neutral-900 hover:underline"
            aria-label={`Lihat detail ${p.purchaseNo}`}
          >
            {p.purchaseNo}
          </Link>
          <span className="text-xs font-semibold text-brand-700">{p.supplierName}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={PILL_CLASS[receipt.tone]}>{receipt.label}</span>
          <span className="text-[11px] text-neutral-500">
            {p.locationName} · Dipesan {formatDateLong(p.date)}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full min-w-[420px] text-left text-xs">
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
              {p.items.map((item) => {
                const got = item.qtyReceived || 0;
                return (
                  <tr key={item.id} className="border-t border-neutral-100">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-neutral-900">{item.productName}</p>
                      <p className="text-[10px] text-neutral-500">
                        {item.sku} · {item.unit}
                      </p>
                    </td>
                    <td className={cn(MONO, "px-3 py-3 text-neutral-700")}>{formatRupiah(item.buyPrice)}</td>
                    <td className="px-3 py-3 text-neutral-700">{qtyText(item.qty, item.unit)}</td>
                    <td className={cn("px-3 py-3", got > 0 ? "font-semibold text-brand-700" : "text-neutral-500")}>
                      {qtyText(got, item.unit)}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">{qtyText(item.qty - got, item.unit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!allReceived && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {received === 0
                ? `Belum ada barang masuk. Seluruh ${qtyText(qty, unit)} masih menunggu penerimaan dan belum menambah stok.`
                : `Stok bertambah +${qtyText(received, unit)} yang sudah diterima, bukan ${qtyText(qty, unit)} yang dipesan.`}
            </span>
          </div>
        )}

        {!allReceived && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              {lastReception ? (
                <>
                  <p className="text-xs font-semibold text-neutral-900">
                    Penerimaan #{lastReception.receptionNo} · +
                    {qtyText(lastReception.items.reduce((s, i) => s + i.qty, 0), unitOf(lastReception.items))}
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    {formatDateShort(lastReception.date).replace(/ \d{4}$/, "")}, {lastReception.time.replace(":", ".")} ·
                    Diterima oleh {lastReception.receivedBy}
                  </p>
                </>
              ) : (
                <p className="text-xs font-semibold text-neutral-900">Masih menunggu {qtyText(remaining, unit)}</p>
              )}
            </div>
            <Button size="sm" fullWidth={false} onClick={() => navigate(`/pembelian/${p.id}/terima`)}>
              <PackageCheck className="h-4 w-4" aria-hidden />
              {received > 0 ? "Terima sisa barang" : "Terima barang"}
            </Button>
          </div>
        )}

        {p.estimatedNextDelivery && !allReceived && (
          <p className="mt-3 text-[11px] text-neutral-500">
            Catatan: sisa {qtyText(remaining, unit)} dikirim pada {formatDateLong(p.estimatedNextDelivery)}.
          </p>
        )}
      </Card>

      <Card className="self-start p-5 lg:col-span-2">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900">Pembayaran & tempo</h3>
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Total faktur</span>
            <span className={cn(MONO, "text-neutral-700")}>{formatRupiah(total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">
              Sudah dibayar{lastPaid && ` · ${formatDateShort(lastPaid).replace(/ \d{4}$/, "")}`}
            </span>
            <span className={cn(MONO, "text-neutral-700")}>{formatRupiah(purchasePaid(p))}</span>
          </div>
          <div className="border-t border-neutral-100 pt-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-neutral-900">Sisa utang</span>
              <span className={cn(MONO, debt > 0 ? "text-amber-700" : "text-brand-700")}>{formatRupiah(debt)}</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-neutral-500">Jatuh tempo</span>
              <span className={cn(MONO, "text-neutral-900")}>{formatDateShort(p.dueDate)}</span>
            </div>
          </div>
        </div>
        {debt > 0 && (
          <button
            type="button"
            onClick={() => setPayOpen(true)}
            className="mt-4 flex h-9 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Catat pembayaran
          </button>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-neutral-500">
          Pembelian ini dicatat sebagai persediaan. Bukan biaya operasional; HPP diakui saat barang terjual.
        </p>
      </Card>

      <PaymentModal
        open={payOpen}
        purchase={p}
        onClose={() => setPayOpen(false)}
        onSave={async (data) => {
          await addPayment(p.id, data);
          setPayOpen(false);
        }}
      />
    </div>
  );
}
