import { formatRupiah, formatTanggal, terbilang, getStoreProfile } from "../../utils/pos";
import { remainingOf, statusOf, unitsOf } from "../../utils/transaction";

const Row = ({ l, r, strong, danger }) => (
  <div className={`flex items-center justify-between py-1.5 text-[13px] ${strong ? "font-bold text-neutral-900" : "text-neutral-700"}`}>
    <span>{l}</span>
    <span className={`font-mono ${danger ? "font-bold text-red-600" : ""}`}>{r}</span>
  </div>
);
const Label = ({ children }) => <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{children}</p>;

/** Faktur penjualan A4: tersembunyi di layar, tampil saat printDoc("invoice"). */
export default function InvoiceDocument({ tx }) {
  const STORE = getStoreProfile();
  const status = statusOf(tx);
  const remaining = remainingOf(tx);
  const lunas = status === "Lunas";
  const invNo = tx.no.replace("TRX", "INV");

  return (
    <div className="print-invoice hidden bg-white text-[13px] leading-relaxed text-neutral-800">
      {/* Kop */}
      <div className="flex items-start justify-between gap-6">
        <div>
          {STORE.logo && <img src={STORE.logo} alt="" className="mb-2 h-12 w-auto object-contain" />}
          <h1 className="text-[26px] font-bold leading-tight text-brand-900">{STORE.name}</h1>
          <p className="mt-1 text-neutral-600">{STORE.address}</p>
          <p className="text-neutral-600">{STORE.phone}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold tracking-wide text-neutral-900">FAKTUR PENJUALAN</h2>
          <p className="mt-1 font-mono text-sm font-bold">{invNo}</p>
          <span className={`mt-2 inline-block rounded border px-3 py-0.5 text-xs font-bold ${lunas ? "border-brand-600 text-brand-700" : status === "Dibatalkan" ? "border-neutral-400 text-neutral-500" : "border-red-600 text-red-600"}`}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="mt-4 h-1 bg-brand-700" />

      {/* Info pelanggan & transaksi */}
      <div className="mt-5 grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-neutral-200 p-4">
          <Label>Ditagihkan kepada</Label>
          <p className="mt-1 text-base font-bold text-neutral-900">{tx.customer.name}</p>
          <p className="text-neutral-600">Metode pembayaran: {tx.method}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4">
          <div className="flex justify-between py-0.5"><span className="text-neutral-500">Tanggal</span><span className="font-mono">{formatTanggal(tx.date, true)}</span></div>
          <div className="flex justify-between py-0.5"><span className="text-neutral-500">No. transaksi</span><span className="font-mono">#{tx.no}</span></div>
          <div className="flex justify-between py-0.5"><span className="text-neutral-500">No. faktur</span><span className="font-mono">{invNo}</span></div>
        </div>
      </div>

      {/* Rincian barang */}
      <table className="mt-5 w-full border-collapse">
        <thead>
          <tr className="bg-brand-50 text-left text-[11px] font-bold uppercase tracking-wide text-brand-900">
            <th className="w-10 border-y border-brand-100 px-3 py-2.5">No</th>
            <th className="border-y border-brand-100 px-3 py-2.5">Nama barang</th>
            <th className="w-20 border-y border-brand-100 px-3 py-2.5 text-center">Qty</th>
            <th className="w-36 border-y border-brand-100 px-3 py-2.5 text-right">Harga satuan</th>
            <th className="w-36 border-y border-brand-100 px-3 py-2.5 text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {tx.items.map((i, n) => (
            <tr key={i.id} className="border-b border-neutral-200">
              <td className="px-3 py-3 text-neutral-500">{n + 1}</td>
              <td className="px-3 py-3 font-medium text-neutral-900">{i.name}</td>
              <td className="px-3 py-3 text-center">{i.qty}</td>
              <td className="px-3 py-3 text-right font-mono">{formatRupiah(i.price)}</td>
              <td className="px-3 py-3 text-right font-mono font-semibold">{formatRupiah(i.price * i.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Terbilang + total */}
      <div className="mt-5 grid grid-cols-[1fr_300px] gap-8">
        <div>
          <Label>Terbilang</Label>
          <p className="mt-1 rounded-lg bg-neutral-50 px-4 py-3 font-medium italic text-neutral-800">{terbilang(tx.total)}</p>
          <p className="mt-2 text-xs text-neutral-500">{tx.items.length} jenis barang · {unitsOf(tx)} unit</p>
          <div className="mt-4">
            <Label>Catatan</Label>
            <p className="mt-1 text-neutral-600">Terima kasih sudah berbelanja di {STORE.name}.</p>
            <p className="text-neutral-600">Simpan faktur ini sebagai bukti pembelian.</p>
          </div>
        </div>
        <div>
          <Row l="Subtotal" r={formatRupiah(tx.total)} />
          <div className="my-1 flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2.5 text-base font-bold text-brand-900">
            <span>TOTAL</span><span className="font-mono">{formatRupiah(tx.total)}</span>
          </div>
          <Row l="Sudah dibayar" r={formatRupiah(tx.paid)} />
          <Row l="Sisa tagihan" r={formatRupiah(remaining)} strong danger={remaining > 0} />
          {tx.cash != null && (
            <div className="mt-1 border-t border-neutral-200 pt-1">
              <Row l="Uang diterima" r={formatRupiah(tx.cash)} />
              <Row l="Kembalian" r={formatRupiah(tx.change ?? 0)} />
            </div>
          )}
        </div>
      </div>

      {/* Ringkasan pembayaran */}
      <div className="mt-5">
        <Label>Ringkasan pembayaran</Label>
        <table className="mt-1.5 w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-neutral-500">
              <th className="py-1.5 font-semibold">Tanggal</th><th className="py-1.5 font-semibold">Metode</th>
              <th className="py-1.5 font-semibold">Keterangan</th><th className="py-1.5 text-right font-semibold">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {(tx.payments ?? []).length === 0 && (
              <tr><td colSpan={4} className="py-2 text-neutral-500">Belum ada pembayaran. Seluruh tagihan masih terutang.</td></tr>
            )}
            {(tx.payments ?? []).map((p, i) => (
              <tr key={i} className="border-b border-neutral-100">
                <td className="py-1.5">{formatTanggal(p.date)}</td><td className="py-1.5">{p.method}</td>
                <td className="py-1.5">{p.note}</td><td className="py-1.5 text-right font-mono">{formatRupiah(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tanda tangan */}
      <div className="mt-10 grid grid-cols-2 gap-10 text-center">
        {[["Hormat kami,", "Kasir"], ["Penerima,", "Penerima"]].map(([top, role]) => (
          <div key={role}>
            <p>{top}</p>
            <div className="mt-20 border-t border-neutral-400 pt-1.5 text-xs text-neutral-600">{role} — nama &amp; tanda tangan</div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-between border-t border-neutral-200 pt-2 text-[11px] text-neutral-500">
        <span>{STORE.name} · {invNo}</span><span>Halaman 1 dari 1</span>
      </div>
    </div>
  );
}
