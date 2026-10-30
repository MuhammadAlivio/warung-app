import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Plus, Search } from "lucide-react";
import { Badge, Button, Card, Modal, ModalBody, ModalFooter, Pagination, Select } from "../lib/components/ui";
import { cn } from "../lib/utils/cn";
import { formatRupiah } from "../lib/utils/pos";
import { useCustomerSummary, useCustomers } from "../lib/stores/CustomerContext";
import { remainingOf, statusOf } from "../lib/utils/transaction";
import CustomerFormModal from "../lib/components/pelanggan/CustomerFormModal";
import AdminShell from "../lib/components/layout/AdminShell";

const PAGE_SIZE = 8;
const FILTER_OPTIONS = [{ value: "all", label: "Semua pelanggan" }, { value: "unpaid", label: "Belum Lunas" }, { value: "paid", label: "Lunas" }];

const StatusBadge = ({ unpaid }) => <Badge variant={unpaid ? "danger" : "brand"}>{unpaid ? "Belum Lunas" : "Lunas"}</Badge>;
const Stat = ({ title, value, sub }) => (
  <Card className="p-5"><p className="text-xs text-neutral-500">{title}</p><p className="mt-2 text-3xl font-bold text-brand-900">{value}</p><p className="mt-2 text-xs text-neutral-500">{sub}</p></Card>
);

function DaftarPelangganContent() {
  const navigate = useNavigate();
  const { customers, addCustomer, updateCustomer, removeCustomer } = useCustomers();
  const summary = useCustomerSummary();

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({ open: false, customer: undefined });
  const [toDelete, setToDelete] = useState(null);

  const unpaidCount = useMemo(() => customers.filter((c) => summary(c.id).outstanding > 0).length, [customers, summary]);
  const totalOutstanding = useMemo(() => customers.reduce((s, c) => s + summary(c.id).outstanding, 0), [customers, summary]);

  const filtered = useMemo(() => customers.filter((c) => {
    const unpaid = summary(c.id).outstanding > 0;
    return c.name.toLowerCase().includes(q.trim().toLowerCase()) && (filter === "all" || (filter === "unpaid" ? unpaid : !unpaid));
  }), [customers, summary, q, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = customers.find((c) => c.id === selectedId) ?? rows[0];
  const sel = selected ? summary(selected.id) : null;
  const inspectTx = sel?.lastUnpaid ?? sel?.last;

  return (
    <div>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Pelanggan</h1>
          <p className="mt-1 text-xs text-neutral-500">Pantau profil pelanggan, alamat, nomor telepon, dan status transaksi terbaru.</p>
        </div>
        <Button fullWidth={false} onClick={() => setForm({ open: true, customer: undefined })}><Plus className="h-4 w-4" aria-hidden /> Tambah pelanggan</Button>
      </header>

      {unpaidCount > 0 && (
        <div role="status" className="mb-5 flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {unpaidCount} pelanggan memiliki transaksi Belum Lunas. Pilih status pelanggan untuk melihat ringkasan transaksinya.
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-4 text-base font-bold">Daftar pelanggan</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden />
                <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Cari pelanggan..." aria-label="Cari pelanggan"
                  className="h-11 w-full rounded-lg border border-neutral-200 pl-10 pr-3 text-sm placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15" />
              </div>
              <div className="w-48"><Select aria-label="Filter status" options={FILTER_OPTIONS} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} /></div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-neutral-100">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-neutral-100 text-[11px] uppercase text-neutral-500">
                  <tr>{["Nama pelanggan", "Alamat", "No. telepon", "Status transaksi", "Aksi"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((c) => (
                    <tr key={c.id} onClick={() => setSelectedId(c.id)} className={cn("cursor-pointer hover:bg-neutral-50", c.id === selected?.id && "bg-brand-50 hover:bg-brand-50")}>
                      <td className="px-4 py-3.5 text-sm font-semibold">{c.name}</td>
                      <td className="px-4 py-3.5 text-xs text-neutral-600">{c.address || "-"}</td>
                      <td className="px-4 py-3.5 font-mono text-xs">{c.phone || "-"}</td>
                      <td className="px-4 py-3.5"><StatusBadge unpaid={summary(c.id).outstanding > 0} /></td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <button type="button" className="mr-3 font-medium text-brand-600 hover:underline" onClick={(e) => { e.stopPropagation(); setForm({ open: true, customer: c }); }}>Edit</button>
                        <button type="button" className="font-medium text-red-600 hover:underline" onClick={(e) => { e.stopPropagation(); setToDelete(c); }}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-neutral-500">Pelanggan tidak ditemukan.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination className="mt-4" page={page} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} itemLabel="pelanggan" />
          </Card>

          {selected && (
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Inspeksi transaksi pelanggan</h2>
                  <p className="text-xs text-neutral-500">Ringkasan singkat transaksi terakhir {selected.name}.</p>
                </div>
                <Button fullWidth={false} size="sm" onClick={() => navigate("/admin/riwayat-transaksi", { state: { search: selected.name, selectedId: inspectTx?.id, } })}>Lihat riwayat transaksi</Button>
              </div>
              {inspectTx ? (
                <dl className="mt-4 space-y-2.5 rounded-lg border border-neutral-100 bg-neutral-50 p-4 text-xs">
                  {[["Transaksi", `#${inspectTx.no}`], ["Total tagihan", formatRupiah(inspectTx.total)], ["Sudah dibayar", formatRupiah(inspectTx.paid)]].map(([l, r]) => (
                    <div key={l} className="flex justify-between"><dt className="text-neutral-500">{l}</dt><dd className="font-mono">{r}</dd></div>
                  ))}
                  <div className="flex justify-between"><dt className="text-neutral-500">Sisa tagihan</dt><dd className={cn("font-mono", remainingOf(inspectTx) > 0 && "text-red-600")}>{formatRupiah(remainingOf(inspectTx))}</dd></div>
                  <div className="flex items-center justify-between"><dt className="text-neutral-500">Status transaksi</dt><dd><StatusBadge unpaid={statusOf(inspectTx) === "Belum Lunas"} /></dd></div>
                </dl>
              ) : <p className="mt-4 rounded-lg bg-neutral-50 p-4 text-xs text-neutral-500">Pelanggan ini belum memiliki transaksi.</p>}
            </Card>
          )}
        </div>

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
          <ModalBody><p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">Pelanggan ini masih memiliki sisa tagihan {formatRupiah(summary(toDelete.id).outstanding)}. Pastikan tagihan sudah diselesaikan.</p></ModalBody>
        )}
        <ModalFooter className="justify-end">
          <Button variant="outline" fullWidth={false} onClick={() => setToDelete(null)}>Batal</Button>
          <Button variant="danger" fullWidth={false} onClick={() => { removeCustomer(toDelete.id); setToDelete(null); }}>Hapus</Button>
        </ModalFooter>
      </Modal>
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
