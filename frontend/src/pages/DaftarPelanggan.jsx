import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronRight, Plus, Search } from "lucide-react";
import { Badge, Button, Card, ErrorDialog, Modal, ModalBody, ModalFooter, Pagination, Select } from "../lib/components/ui";
import AdminShell from "../lib/components/layout/AdminShell";
import CustomerFormModal from "../lib/components/pelanggan/CustomerFormModal";
import { cn } from "../lib/utils/cn";
import { formatRupiah, formatTanggal } from "../lib/utils/pos";
import { remainingOf } from "../lib/utils/transaction";
import { fetchSales } from "../lib/utils/sales";
import { customerApiId, useCustomerSummary, useCustomers } from "../lib/stores/CustomerContext";

const PAGE_SIZE = 8;
const FILTER_OPTIONS = [
  { value: "all", label: "Semua pelanggan" },
  { value: "unpaid", label: "Belum Lunas" },
  { value: "paid", label: "Lunas" },
];

const StatusBadge = ({ unpaid }) => <Badge variant={unpaid ? "danger" : "brand"}>{unpaid ? "Belum Lunas" : "Lunas"}</Badge>;

const Stat = ({ title, value, sub }) => (
  <Card className="p-5">
    <p className="text-xs text-neutral-500">{title}</p>
    <p className="mt-2 text-3xl font-bold text-brand-900">{value}</p>
    <p className="mt-2 text-xs text-neutral-500">{sub}</p>
  </Card>
);

const UNPAID_PREVIEW = 5;

/**
 * Isi baris dropdown: ringkasan tagihan pelanggan dari database.
 * Status "Belum Lunas" dihitung dari AKUMULASI sisa semua transaksi belum lunas, jadi di sini ditampilkan
 * totalnya, jumlah transaksinya, dan daftar transaksi yang membentuknya.
 */
function CustomerInspection({ customer, summary, onOpenHistory }) {
  const [unpaid, setUnpaid] = useState(null); // null = memuat, "error", atau { rows, total }

  useEffect(() => {
    if (summary.unpaidCount === 0) return setUnpaid({ rows: [], total: 0 });
    let cancelled = false;
    setUnpaid(null);
    fetchSales({ status: "Belum Lunas", customerId: customerApiId(customer.id), perPage: UNPAID_PREVIEW })
      .then(({ rows, meta }) => !cancelled && setUnpaid({ rows, total: meta.total }))
      .catch(() => !cancelled && setUnpaid("error"));
    return () => {
      cancelled = true;
    };
  }, [customer.id, summary.unpaidCount, summary.outstanding]);

  const hasUnpaid = summary.outstanding > 0;
  const firstUnpaidId = unpaid && unpaid !== "error" ? unpaid.rows[0]?.id : undefined;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">Ringkasan tagihan pelanggan</h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            Status dihitung dari jumlah sisa semua transaksi belum lunas {customer.name}.
          </p>
        </div>
        {summary.transactionCount > 0 && (
          <Button fullWidth={false} size="sm" onClick={() => onOpenHistory(firstUnpaidId)}>
            {hasUnpaid ? "Lihat transaksi belum lunas" : "Lihat riwayat transaksi"}
          </Button>
        )}
      </div>

      {summary.transactionCount === 0 ? (
        <p className="mt-4 rounded-lg bg-neutral-50 p-4 text-xs text-neutral-500">Pelanggan ini belum memiliki transaksi.</p>
      ) : (
        <>
          <dl className="mt-4 space-y-2.5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-xs">
            <div className="flex justify-between gap-4"><dt className="text-neutral-500">Total transaksi</dt><dd className="font-mono">{summary.transactionCount}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-neutral-500">Transaksi belum lunas</dt><dd className="font-mono">{summary.unpaidCount}</dd></div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Akumulasi sisa tagihan</dt>
              <dd className={cn("font-mono font-semibold", hasUnpaid && "text-red-600")}>{formatRupiah(summary.outstanding)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-neutral-500">Status pelanggan</dt>
              <dd><StatusBadge unpaid={hasUnpaid} /></dd>
            </div>
          </dl>

          {hasUnpaid && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold text-neutral-900">Transaksi belum lunas</h4>
              {unpaid === null && <p className="text-xs text-neutral-500">Memuat…</p>}
              {unpaid === "error" && <p className="text-xs text-red-600">Daftar transaksi gagal dimuat. Coba tutup dan buka lagi.</p>}
              {unpaid && unpaid !== "error" && (
                <>
                  <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 text-xs">
                    {unpaid.rows.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="font-mono">#{t.no}</p>
                          <p className="text-neutral-500">{formatTanggal(t.date)} · total {formatRupiah(t.total)}, dibayar {formatRupiah(t.paid)}</p>
                        </div>
                        <span className="shrink-0 font-mono font-semibold text-red-600">{formatRupiah(remainingOf(t))}</span>
                      </li>
                    ))}
                  </ul>
                  {unpaid.total > unpaid.rows.length && (
                    <p className="mt-2 text-xs text-neutral-500">…dan {unpaid.total - unpaid.rows.length} transaksi lainnya. Klik "Lihat transaksi belum lunas" untuk semuanya.</p>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DaftarPelangganContent() {
  const navigate = useNavigate();
  const { customers, addCustomer, updateCustomer, removeCustomer, refresh } = useCustomers();
  const summary = useCustomerSummary();

  // Tagihan dari transaksi baru (Kasir, pelunasan) harus ikut terlihat setiap halaman ini dibuka
  useEffect(() => {
    refresh();
  }, [refresh]);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null); // satu baris terbuka pada satu waktu
  const [form, setForm] = useState({ open: false, customer: undefined });
  const [toDelete, setToDelete] = useState(null);
  const [failure, setFailure] = useState(null);

  const unpaidCount = useMemo(() => customers.filter((c) => summary(c.id).outstanding > 0).length, [customers, summary]);
  const totalOutstanding = useMemo(() => customers.reduce((s, c) => s + summary(c.id).outstanding, 0), [customers, summary]);

  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        const unpaid = summary(c.id).outstanding > 0;
        return c.name.toLowerCase().includes(q.trim().toLowerCase()) && (filter === "all" || (filter === "unpaid" ? unpaid : !unpaid));
      }),
    [customers, summary, q, filter]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggle = (id) => setExpandedId((cur) => (cur === id ? null : id));
  const changePage = (n) => { setPage(n); setExpandedId(null); };

  return (
    <div>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Pelanggan</h1>
          <p className="mt-1 text-xs text-neutral-500">Pantau profil pelanggan, alamat, nomor telepon, dan status transaksi terbaru.</p>
        </div>
        <Button fullWidth={false} onClick={() => setForm({ open: true, customer: undefined })}>
          <Plus className="h-4 w-4" aria-hidden /> Tambah pelanggan
        </Button>
      </header>

      {unpaidCount > 0 && (
        <div role="status" className="mb-5 flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {unpaidCount} pelanggan memiliki transaksi Belum Lunas. Pilih status pelanggan untuk melihat ringkasan transaksinya.
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-5">
          <h2 className="mb-4 text-base font-bold">Daftar pelanggan</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden />
              <input
                value={q} onChange={(e) => { setQ(e.target.value); changePage(1); }} placeholder="Cari pelanggan..." aria-label="Cari pelanggan"
                className="h-11 w-full rounded-lg border border-neutral-200 pl-10 pr-3 text-sm placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
              />
            </div>
            <div className="w-48">
              <Select aria-label="Filter status" options={FILTER_OPTIONS} value={filter} onChange={(e) => { setFilter(e.target.value); changePage(1); }} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-neutral-100">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-neutral-100 text-[11px] uppercase text-neutral-500">
                <tr>
                  {["Nama pelanggan", "Alamat", "No. telepon", "Status transaksi", "Aksi"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((c) => {
                  const s = summary(c.id);
                  const open = expandedId === c.id;
                  const panelId = `inspeksi-${c.id}`;
                  return (
                    <Fragment key={c.id}>
                      <tr onClick={() => toggle(c.id)} className={cn("cursor-pointer transition-colors", open ? "bg-brand-50" : "hover:bg-neutral-50")}>
                        <td className="px-4 py-3.5">
                          {/* Tombol sungguhan agar bisa dioperasikan dengan keyboard; klik ditangani oleh baris */}
                          <button
                            type="button" aria-expanded={open} aria-controls={panelId}
                            className="flex items-center gap-2 text-left text-sm font-semibold focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20"
                          >
                            <ChevronRight className={cn("h-4 w-4 shrink-0 text-neutral-500 transition-transform", open && "rotate-90 text-brand-700")} aria-hidden />
                            {c.name}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-neutral-600">{c.address || "-"}</td>
                        <td className="px-4 py-3.5 font-mono text-xs">{c.phone || "-"}</td>
                        <td className="px-4 py-3.5"><StatusBadge unpaid={s.outstanding > 0} /></td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                          <button type="button" className="mr-3 font-medium text-brand-600 hover:underline" onClick={(e) => { e.stopPropagation(); setForm({ open: true, customer: c }); }}>Edit</button>
                          <button type="button" className="font-medium text-red-600 hover:underline" onClick={(e) => { e.stopPropagation(); setToDelete(c); }}>Hapus</button>
                        </td>
                      </tr>

                      {open && (
                        <tr id={panelId} className="!border-t-0 bg-brand-50">
                          <td colSpan={5} className="px-4 pb-4 pt-0">
                            <CustomerInspection
                              customer={c}
                              summary={s}
                              onOpenHistory={(selectedId) =>
                                navigate("/riwayat-transaksi", { state: { search: c.name, status: s.outstanding > 0 ? "Belum Lunas" : "", selectedId } })
                              }
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-neutral-500">Pelanggan tidak ditemukan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination className="mt-4" page={page} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onChange={changePage} itemLabel="pelanggan" />
        </Card>

        <aside className="space-y-4">
          <Stat title="Total pelanggan aktif" value={customers.length} sub="Pelanggan terdaftar" />
          <Stat title="Pelanggan Belum Lunas" value={unpaidCount} sub="Perlu tindak lanjut" />
          <Stat title="Sisa tagihan total" value={formatRupiah(totalOutstanding)} sub={`${unpaidCount} pelanggan`} />
        </aside>
      </div>

      <CustomerFormModal
        open={form.open} customer={form.customer} onClose={() => setForm({ open: false, customer: undefined })}
        onSubmit={(v) => (form.customer ? updateCustomer(form.customer.id, v) : addCustomer(v))}
      />

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Hapus pelanggan?" description={toDelete ? `${toDelete.name} akan dihapus dari daftar pelanggan.` : ""}>
        {toDelete && summary(toDelete.id).outstanding > 0 && (
          <ModalBody>
            <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              Pelanggan ini masih memiliki sisa tagihan {formatRupiah(summary(toDelete.id).outstanding)}. Pastikan tagihan sudah diselesaikan.
            </p>
          </ModalBody>
        )}
        <ModalFooter className="justify-end">
          <Button variant="outline" fullWidth={false} onClick={() => setToDelete(null)}>Batal</Button>
          <Button
            variant="danger" fullWidth={false}
            onClick={async () => {
              try {
                await removeCustomer(toDelete.id);
                setExpandedId((cur) => (cur === toDelete.id ? null : cur));
              } catch (err) {
                setFailure({ title: "Pelanggan tidak bisa dihapus", message: err.message });
              }
              setToDelete(null);
            }}
          >
            Hapus
          </Button>
        </ModalFooter>
      </Modal>
      <ErrorDialog error={failure} onClose={() => setFailure(null)} />
    </div>
  );
}

export default function DaftarPelanggan() {
  return (
    <AdminShell breadcrumb="Daftar Pelanggan">
      <DaftarPelangganContent />
    </AdminShell>
  );
}