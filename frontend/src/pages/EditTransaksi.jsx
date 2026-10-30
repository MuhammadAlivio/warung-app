import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Minus, Package, Plus, Repeat2, Search, Trash2, Info } from "lucide-react";
import { Badge, Button, Card, Modal, ModalBody, ModalFooter, Select, Textarea } from "../lib/components/ui";
import { cn } from "../lib/utils/cn";
import { formatRupiah, formatTglJam } from "../lib/utils/pos";
import { useCatalog, useStockAdjust } from "../lib/hooks/useCatalog";
import { useTransactions } from "../lib/stores/TransactionContext";
import { totalOf, remainingOf, statusOf, STATUS_VARIANT } from "../lib/utils/transaction";
import { makeEditTransactionSchema } from "../lib/schemas/transaction";
import AdminShell from "../lib/components/layout/AdminShell";

function Thumb() {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
      <Package className="h-5 w-5" aria-hidden />
    </div>
  );
}

function EditTransaksiContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getTransaction, editItems } = useTransactions();
  const tx = getTransaction(id);
  const catalog = useCatalog();
  const adjustStock = useStockAdjust();
  const productOf = (pid) => catalog.find((p) => p.id === pid);

  const [query, setQuery] = useState("");
  const [swapIndex, setSwapIndex] = useState(null);
  const [swapTo, setSwapTo] = useState("");

  const original = useMemo(() => Object.fromEntries((tx?.items ?? []).map((i) => [i.id, i.qty])), [tx]);
  const schema = useMemo(
    () => makeEditTransactionSchema({ paid: tx?.paid ?? 0, limitOf: (pid) => (productOf(pid)?.stock ?? 9999) + (original[pid] ?? 0) }),
    [tx, original]
  );

  const { control, register, handleSubmit, setValue, watch, formState: { errors, isDirty, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { items: tx?.items ?? [], reason: "" },
  });
  const { fields, append, remove, update } = useFieldArray({ control, name: "items" });

  if (!tx) return <div className="p-8 text-sm text-neutral-500">Transaksi tidak ditemukan.</div>;
  if (tx.cancelled) return <div className="p-8 text-sm text-neutral-500">Transaksi yang dibatalkan tidak dapat diedit.</div>;

  const items = watch("items");
  const newTotal = totalOf(items);
  const newUnits = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const oldUnits = tx.items.reduce((s, i) => s + i.qty, 0);
  const newRemaining = Math.max(newTotal - tx.paid, 0);
  const diff = newTotal - tx.total;
  const status = statusOf(tx);
  const itemsError = errors.items?.message ?? errors.items?.root?.message;

  const suggestions = query.trim()
    ? catalog.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())) : [];

  const addProduct = (p) => {
    const idx = items.findIndex((i) => i.id === p.id);
    if (idx >= 0) setValue(`items.${idx}.qty`, items[idx].qty + 1, { shouldDirty: true, shouldValidate: true });
    else append({ id: p.id, name: p.name, price: p.price, qty: 1 }, { shouldFocus: false });
    setQuery("");
  };
  const setQty = (i, q) => setValue(`items.${i}.qty`, Math.max(1, q), { shouldDirty: true, shouldValidate: true });
  const confirmSwap = () => {
    const p = productOf(swapTo);
    if (p) update(swapIndex, { id: p.id, name: p.name, price: p.price, qty: items[swapIndex].qty });
    setSwapIndex(null); setSwapTo("");
  };

  const onSubmit = (v) => {
    // stok kembali sebesar qty lama, lalu berkurang sebesar qty baru
    const delta = {};
    tx.items.forEach((i) => { delta[i.id] = (delta[i.id] ?? 0) + i.qty; });
    v.items.forEach((i) => { delta[i.id] = (delta[i.id] ?? 0) - i.qty; });
    adjustStock(delta);
    editItems(tx.id, v.items, v.reason.trim());
    navigate("/admin/riwayat-transaksi", { state: { selectedId: tx.id } });
  };

  const swapOptions = catalog.filter((p) => !items.some((i) => i.id === p.id))
    .map((p) => ({ value: p.id, label: `${p.name} — ${formatRupiah(p.price)} (stok ${p.stock})` }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <button type="button" onClick={() => navigate("/admin/riwayat-transaksi", { state: { selectedId: tx.id } })} className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Riwayat Transaksi
      </button>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit transaksi</h1>
          <p className="mt-1 text-xs text-neutral-500">Ubah daftar belanja tanpa mengubah pembayaran yang sudah diterima.</p>
        </div>
        {isDirty && <Badge variant="warning">Belum tersimpan</Badge>}
      </div>

      <Card className="mt-5 grid gap-4 p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
        <div><p className="text-xs text-neutral-500">Transaksi</p><p className="mt-1 font-mono text-sm font-bold">#{tx.no}</p></div>
        <div><p className="text-xs text-neutral-500">Pelanggan</p><p className="mt-1 text-sm font-bold">{tx.customer.name}</p></div>
        <div><p className="text-xs text-neutral-500">Tanggal transaksi</p><p className="mt-1 text-sm font-medium">{formatTglJam(tx.date)}</p></div>
        <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
      </Card>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Daftar belanja</h2>
            <span className="text-xs text-neutral-500">{items.length} jenis barang · {newUnits} unit</span>
          </div>

          <div className="relative mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama barang atau pindai barcode..." aria-label="Cari barang"
                className="h-11 w-full rounded-lg border border-neutral-200 pl-10 pr-3 text-sm placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15" />
              {suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-neutral-100 bg-white p-1 shadow-lg">
                  {suggestions.map((p) => (
                    <li key={p.id}><button type="button" onClick={() => addProduct(p)} className="flex w-full justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-brand-50">
                      <span>{p.name} <span className="text-xs text-neutral-500">· stok {p.stock}</span></span><span className="font-mono text-xs">{formatRupiah(p.price)}</span>
                    </button></li>
                  ))}
                </ul>
              )}
            </div>
            <Button variant="outline" fullWidth={false} onClick={() => suggestions[0] && addProduct(suggestions[0])} className="shrink-0"><Plus className="h-4 w-4" aria-hidden /> Tambah barang</Button>
          </div>

          <p className="mt-3 flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500"><Info className="h-4 w-4" aria-hidden /> Jika stok habis, ganti atau hapus barang.</p>

          <div className="mt-4 space-y-3">
            {fields.map((f, i) => {
              const row = items[i] ?? f;
              const before = original[row.id];
              const changed = before === undefined || before !== row.qty;
              return (
                <div key={f.id} className={cn("rounded-xl border p-4", changed ? "border-brand-600 bg-brand-50" : "border-neutral-100")}>
                  <input type="hidden" {...register(`items.${i}.id`)} />
                  <div className="flex items-start gap-3">
                    <Thumb id={row.id} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-900">{row.name}</p>
                      <p className="text-xs text-neutral-500">Harga satuan {formatRupiah(row.price)}</p>
                    </div>
                    <span className="font-mono text-sm font-bold">{formatRupiah(row.price * (Number(row.qty) || 0))}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-lg border border-neutral-200 bg-white">
                      <button type="button" aria-label="Kurangi" onClick={() => setQty(i, row.qty - 1)} className="px-3 py-2 hover:bg-neutral-50"><Minus className="h-3.5 w-3.5" aria-hidden /></button>
                      <input
                        type="number" min={1} aria-label={`Jumlah ${row.name}`}
                        className="w-12 border-0 bg-transparent text-center text-sm font-medium focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        {...register(`items.${i}.qty`, { valueAsNumber: true })}
                      />
                      <button type="button" aria-label="Tambah" onClick={() => setQty(i, row.qty + 1)} className="px-3 py-2 hover:bg-neutral-50"><Plus className="h-3.5 w-3.5" aria-hidden /></button>
                    </div>
                    {before !== undefined && before !== row.qty && <span className="text-xs font-medium text-brand-700">Sebelumnya {before} unit</span>}
                    {before === undefined && <Badge>Barang baru</Badge>}
                    <div className="ml-auto flex items-center gap-4 text-xs font-semibold">
                      <button type="button" onClick={() => { setSwapIndex(i); setSwapTo(""); }} className="flex items-center gap-1 text-brand-700 hover:underline"><Repeat2 className="h-4 w-4" aria-hidden /> Ganti barang</button>
                      <button type="button" onClick={() => remove(i)} className="flex items-center gap-1 text-red-600 hover:underline"><Trash2 className="h-4 w-4" aria-hidden /> Hapus</button>
                    </div>
                  </div>
                  {errors.items?.[i]?.qty && <p role="alert" className="mt-2 text-xs text-red-600">{errors.items[i].qty.message}</p>}
                </div>
              );
            })}
          </div>
          {itemsError && <p role="alert" className="mt-3 text-xs text-red-600">{itemsError}</p>}

          <div className="mt-5">
            <Textarea label="Alasan perubahan" placeholder="Contoh: Pelanggan mengurangi Bolt Curah dari 3 menjadi 2 unit." rows={3} error={errors.reason?.message} {...register("reason")} />
            <p className="mt-1.5 text-xs text-neutral-500">Alasan akan dicatat dalam riwayat perubahan transaksi.</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-bold">Ringkasan perubahan</h2>
          <table className="mt-4 w-full text-xs">
            <thead><tr className="text-neutral-500"><th className="pb-2 text-left font-medium">Rincian</th><th className="pb-2 text-right font-medium">Sebelum</th><th className="pb-2 text-right font-semibold text-brand-700">Sesudah</th></tr></thead>
            <tbody className="divide-y divide-neutral-100 font-mono">
              {[["Jumlah unit", `${oldUnits} unit`, `${newUnits} unit`], ["Total belanja", formatRupiah(tx.total), formatRupiah(newTotal)],
                ["Sudah dibayar", formatRupiah(tx.paid), formatRupiah(tx.paid)], ["Sisa tagihan", formatRupiah(remainingOf(tx)), formatRupiah(newRemaining)]].map(([l, a, b]) => (
                <tr key={l}><td className="py-2.5 font-sans text-neutral-500">{l}</td><td className="py-2.5 text-right">{a}</td><td className="py-2.5 text-right font-semibold text-brand-700">{b}</td></tr>
              ))}
            </tbody>
          </table>
          <div className={cn("mt-4 flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold", diff === 0 ? "bg-neutral-100 text-neutral-600" : "bg-brand-50 text-brand-700")}>
            <span>Selisih total</span><span className="font-mono">{diff > 0 ? "+" : diff < 0 ? "-" : ""}{formatRupiah(Math.abs(diff))}</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-neutral-500">Sudah dibayar tetap {formatRupiah(tx.paid)}. Tidak ada perubahan pembayaran.</p>
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <p className="text-sm font-bold">Perubahan belum disimpan</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">Stok dan tagihan akan disesuaikan saat menyimpan. Data transaksi lama tetap berlaku sampai perubahan disimpan.</p>
          </div>
        </Card>
      </div>

      <Card className="mt-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-xs text-neutral-500">Periksa kembali daftar belanja sebelum menyimpan.</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" fullWidth={false} onClick={() => navigate("/admin/riwayat-transaksi", { state: { selectedId: tx.id } })}>Batal</Button>
          <Button type="submit" fullWidth={false} loading={isSubmitting} disabled={!isDirty}>Simpan perubahan</Button>
        </div>
      </Card>

      <Modal open={swapIndex !== null} onClose={() => setSwapIndex(null)} title="Ganti barang" description={swapIndex !== null ? `Pilih barang pengganti untuk ${items[swapIndex]?.name}. Jumlah unit dipertahankan.` : ""}>
        <ModalBody><Select label="Barang pengganti" placeholder="Pilih barang" options={swapOptions} value={swapTo} onChange={(e) => setSwapTo(e.target.value)} /></ModalBody>
        <ModalFooter className="justify-end">
          <Button type="button" variant="outline" fullWidth={false} onClick={() => setSwapIndex(null)}>Batal</Button>
          <Button type="button" fullWidth={false} disabled={!swapTo} onClick={confirmSwap}>Ganti</Button>
        </ModalFooter>
      </Modal>
    </form>
  );
}

export default function EditTransaksi() {
  return (
    <AdminShell breadcrumb="Riwayat Transaksi">
      <EditTransaksiContent />
    </AdminShell>
  );
}
