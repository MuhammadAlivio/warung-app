import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, FileText, Pencil, Printer, Search, Wallet, XCircle } from "lucide-react";
import { Badge, Button, Card, Input, Pagination, Select } from "../lib/components/ui";
import { cn } from "../lib/utils/cn";
import { formatAngka, formatJam, formatRupiah, formatTanggal, printDoc, toInputDate } from "../lib/utils/pos";
import { useTransactions } from "../lib/stores/TransactionContext";
import { useStockAdjust } from "../lib/hooks/useCatalog";
import { useStock } from "../lib/stores/StockContext";
import AdminShell from "../lib/components/layout/AdminShell";
import { remainingOf, statusOf, STATUS_VARIANT } from "../lib/utils/transaction";
import { addSalePayment, cancelSale, fetchSale, fetchSales, fetchSalesSummary } from "../lib/utils/sales";
import ReceiptPreview from "../lib/components/pos/ReceiptPreview";
import InvoiceDocument from "../lib/components/pos/InvoiceDocument";
import EditPaymentModal from "../lib/components/transaksi/EditPaymentModal";
import CancelTransactionModal from "../lib/components/transaksi/CancelTransactionModal";

const PAGE_SIZE = 6;
const METHOD_OPTIONS = [{ value: "", label: "Semua metode" }, { value: "Tunai", label: "Tunai" }, { value: "TF", label: "TF" }];
const STATUS_OPTIONS = [{ value: "", label: "Semua status" }, { value: "Lunas", label: "Lunas" }, { value: "Belum Lunas", label: "Belum Lunas" }, { value: "Dibatalkan", label: "Dibatalkan" }];

function Stat({ title, value, sub }) {
  return (
    <Card className="p-5">
      <p className="text-xs text-neutral-500">{title}</p>
      <p className="mt-2 font-mono text-3xl font-bold text-brand-900">{value}</p>
      <p className="mt-2 text-xs text-neutral-500">{sub}</p>
    </Card>
  );
}

function RiwayatTransaksiContent() {
  const navigate = useNavigate();
  const location = useLocation();
  // Sinkron ke data sesi (Daftar Pelanggan & Chatbot masih membaca TransactionContext)
  const { addPayment, cancelTransaction } = useTransactions();
  const adjustStock = useStockAdjust();
  const { categories } = useStock();

  const [q, setQ] = useState(location.state?.search ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(toInputDate());
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(location.state?.selectedId ?? null);
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page_count: 1 });
  const [stats, setStats] = useState({ net: 0, lunas: 0, lunas_count: 0, unpaid: 0, unpaid_count: 0 });
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState(""); // gagal simpan pelunasan / pembatalan
  const [version, setVersion] = useState(0); // naik setelah edit pembayaran / pembatalan -> muat ulang
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const categoryOptions = useMemo(
    () => [{ value: "", label: "Semua jenis barang" }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))],
    [categories]
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Kartu statistik selalu untuk hari ini (sama seperti sebelumnya)
  useEffect(() => {
    fetchSalesSummary().then(setStats).catch(() => {});
  }, [version]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchSales({ date, method, status, q: debouncedQ, categoryId, page, perPage: PAGE_SIZE })
      .then((res) => { if (active) { setRows(res.rows); setMeta(res.meta); setError(""); } })
      .catch((e) => { if (active) { setRows([]); setError(e.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date, method, status, debouncedQ, categoryId, page, version]);

  // Detail (item, pembayaran, riwayat perubahan) diambil saat baris dipilih
  const selectedKey = (Number.isInteger(selectedId) ? selectedId : null) ?? rows[0]?.id ?? null;
  useEffect(() => {
    if (selectedKey == null) return setDetail(null);
    let active = true;
    fetchSale(selectedKey)
      .then((tx) => { if (active) setDetail(tx); })
      .catch(() => { if (active) { setDetail(null); if (selectedId != null) setSelectedId(null); } });
    return () => { active = false; };
  }, [selectedKey, version]);

  const pageCount = meta.page_count;
  const selected = detail && detail.id === selectedKey ? detail : null;
  const sStatus = selected ? statusOf(selected) : null;
  const reset = (fn) => (v) => { fn(v); setPage(1); };

  const submitPayment = async (pay) => {
    try {
      await addSalePayment(selected.id, pay);
      addPayment(selected.id, pay);
      setActionError("");
    } catch (e) {
      setActionError(e.message);
    }
    reload();
  };

  const confirmCancel = async (reason) => {
    try {
      await cancelSale(selected.id, reason);
      adjustStock(Object.fromEntries(selected.items.map((i) => [i.id, i.qty])));
      cancelTransaction(selected.id, reason);
      setActionError("");
    } catch (e) {
      setActionError(e.message);
    }
    reload();
  };

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riwayat Transaksi</h1>
          <p className="mt-1 text-xs text-neutral-500">Setiap transaksi tercatat, setiap perubahan terlacak.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-44"><Input aria-label="Filter tanggal" type="date" value={date} onChange={(e) => reset(setDate)(e.target.value)} /></div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat title="Penjualan bersih hari ini" value={formatAngka(stats.net)} sub="Tidak termasuk transaksi dibatalkan" />
        <Stat title="Transaksi Lunas" value={formatAngka(stats.lunas)} sub={`${stats.lunas_count} Transaksi`} />
        <Stat title="Transaksi Belum Lunas" value={formatAngka(stats.unpaid)} sub={`${stats.unpaid_count} Transaksi`} />
      </div>
      {(actionError || error) && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-700">{actionError || error}</p>}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Daftar transaksi</h2>
            <span className="text-xs font-semibold text-brand-600">{date === toInputDate() ? "Hari ini" : date ? formatTanggal(new Date(date + "T00:00")) : "Semua tanggal"}</span>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden />
              <input value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="Cari nomor transaksi atau pelanggan..." aria-label="Cari transaksi atau pelanggan"
                className="h-11 w-full rounded-lg border border-neutral-200 pl-10 pr-3 text-sm placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15" />
            </div>
            <div className="w-44"><Select aria-label="Filter jenis barang" options={categoryOptions} value={categoryId} onChange={(e) => reset(setCategoryId)(e.target.value)} /></div>
            <div className="w-40"><Select aria-label="Filter metode" options={METHOD_OPTIONS} value={method} onChange={(e) => reset(setMethod)(e.target.value)} /></div>
            <div className="w-40"><Select aria-label="Filter status" options={STATUS_OPTIONS} value={status} onChange={(e) => reset(setStatus)(e.target.value)} /></div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-neutral-100">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-neutral-100 text-[11px] uppercase text-neutral-500">
                <tr>{["Transaksi / Jam", "Metode", "Total", "Pembayaran", "Pelanggan"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((t) => {
                  const st = statusOf(t);
                  const active = t.id === selectedKey;
                  return (
                    <tr key={t.id} onClick={() => setSelectedId(t.id)} className={cn("cursor-pointer hover:bg-neutral-50", active && "bg-brand-50 hover:bg-brand-50")}>
                      <td className="px-4 py-3">
                        <p className={cn("font-mono text-xs font-bold", st === "Belum Lunas" ? "text-red-600" : "text-neutral-900")}>#{t.no}</p>
                        <p className="text-[11px] text-neutral-500">{formatJam(t.date)} · {t.units} item</p>
                      </td>
                      <td className="px-4 py-3 text-xs">{t.method}</td>
                      <td className={cn("px-4 py-3 font-mono text-xs", st === "Belum Lunas" && "text-red-600")}>
                        {st === "Belum Lunas" ? `- ${formatRupiah(remainingOf(t))}` : formatRupiah(t.total)}
                      </td>
                      <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[st]}>{st}</Badge></td>
                      <td className="px-4 py-3 text-xs">{t.customer.name}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-neutral-500">{loading ? "Memuat transaksi..." : "Tidak ada transaksi yang cocok."}</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination className="mt-4" page={page} pageCount={pageCount} total={meta.total} pageSize={PAGE_SIZE} onChange={setPage} itemLabel="transaksi" />
        </Card>

        <Card className="p-5">
          {selected ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold">Detail transaksi</h2>
                <Badge variant={STATUS_VARIANT[sStatus]}>{sStatus}</Badge>
              </div>
              <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3"><ReceiptPreview tx={selected} /></div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button onClick={() => printDoc("receipt")}><Printer className="h-4 w-4" aria-hidden /> Cetak struk</Button>
                <Button variant="outline" onClick={() => printDoc("invoice")}><FileText className="h-4 w-4" aria-hidden /> Cetak faktur</Button>
              </div>

              {!selected.cancelled && (
                <div className="mt-4 rounded-lg border border-neutral-100 bg-neutral-50 p-4">
                  <h3 className="mb-3 text-sm font-bold">Pengelolaan transaksi</h3>
                  <div className="space-y-2">
                    <Button variant="outline" onClick={() => navigate(`/riwayat-transaksi/${selected.id}/edit`)}><Pencil className="h-4 w-4" aria-hidden /> Edit transaksi</Button>
                    {remainingOf(selected) > 0 && (
                      <Button variant="outline" onClick={() => setPayOpen(true)}><Wallet className="h-4 w-4" aria-hidden /> Edit pembayaran</Button>
                    )}
                    <Button variant="danger" onClick={() => setCancelOpen(true)}><XCircle className="h-4 w-4" aria-hidden /> Batalkan transaksi</Button>
                  </div>
                </div>
              )}
              {selected.history.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold"><CalendarDays className="h-3.5 w-3.5" aria-hidden /> Riwayat perubahan</h3>
                  <ul className="space-y-1.5 text-xs text-neutral-600">
                    {selected.history.map((h, i) => (
                      <li key={i} className="rounded-lg bg-neutral-50 px-3 py-2"><span className="font-semibold capitalize">{{ edit: "Ubah barang", payment: "Pelunasan", cancel: "Dibatalkan" }[h.type]}</span> · {formatJam(h.at)} — {h.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="print-receipt hidden"><ReceiptPreview tx={selected} /></div>
              <InvoiceDocument tx={selected} />
            </>
          ) : (
            <p className="py-16 text-center text-sm text-neutral-500">{selectedKey != null ? "Memuat detail..." : "Pilih transaksi untuk melihat detail."}</p>
          )}
        </Card>
      </div>

      <EditPaymentModal open={payOpen} tx={selected} onClose={() => setPayOpen(false)} onSubmit={submitPayment} />
      <CancelTransactionModal open={cancelOpen} tx={selected} onClose={() => setCancelOpen(false)} onConfirm={confirmCancel} />
    </div>
  );
}

export default function RiwayatTransaksi() {
  return (
    <AdminShell breadcrumb="Riwayat Transaksi">
      <RiwayatTransaksiContent />
    </AdminShell>
  );
}
