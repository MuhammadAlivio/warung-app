import { useEffect, useRef, useState } from "react";
import { formatRupiah, formatTanggal, getStoreProfile } from "../../utils/pos";
import { remainingOf, statusOf } from "../../utils/transaction";

const A4_PX = { w: 794, h: 1123, pad: 46 }; // A4 @96dpi, margin ±12 mm

const STATUS_CLS = {
  Lunas: "border-brand-800 text-brand-800",
  "Belum Lunas": "border-red-600 text-red-600",
  Dibatalkan: "border-neutral-400 text-neutral-500",
};

function TotalRow({ label, value, strong, tone }) {
  return (
    <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2.5">
      <span className={strong ? "font-bold text-brand-900" : "text-neutral-500"}>{label}</span>
      <span className={`font-mono ${strong ? "font-bold text-brand-900" : ""} ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

/**
 * Isi faktur penjualan (tanpa halaman). Dipakai oleh pratinjau layar dan area cetak A4.
 * Tata letak mengikuti desain: kop, kotak pelanggan, tabel hijau, SUB TOTAL, catatan + tanda tangan, kotak TOTAL.
 */
export function InvoiceSheet({ tx }) {
  const store = getStoreProfile();
  const status = statusOf(tx);
  const remaining = remainingOf(tx);
  const invNo = tx.no.replace("TRX", "INV");
  const subtotal = tx.items.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="w-full bg-white text-brand-900">
      {/* Kop */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          {store.logo && <img src={store.logo} alt="" className="mb-2 h-12 w-auto object-contain" />}
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">{store.name}</h1>
          <p className="mt-1.5 text-[13px] text-neutral-500">{store.address}</p>
          <p className="mt-1 text-[13px] text-neutral-500">{store.phone}</p>
        </div>
        <div className="shrink-0 text-right">
          <h2 className="text-[24px] font-bold leading-tight tracking-tight">FAKTUR PENJUALAN</h2>
          <p className="mt-2 font-mono text-[14px] font-bold">{invNo}</p>
          <span className={`mt-2 inline-block rounded-md border-[1.5px] px-3 py-1 text-[13px] font-semibold ${STATUS_CLS[status]}`}>{status}</span>
        </div>
      </div>
      <div className="mt-3 h-[3px] bg-brand-800" />

      {/* Kepada & informasi */}
      <div className="grid grid-cols-[1.1fr_1fr] gap-6 bg-neutral-100 px-5 py-4">
        <div>
          <p className="text-[11px] text-neutral-500">Kepada</p>
          <p className="mt-1 text-[18px] font-bold leading-tight">{tx.customer.name}</p>
          <p className="mt-1.5 text-[13px] text-neutral-500">Metode pembayaran: {tx.method}</p>
        </div>
        <div className="space-y-2 pt-0.5 text-[13px]">
          <div className="flex justify-between gap-3"><span className="text-neutral-500">Tanggal</span><span className="font-mono">{formatTanggal(tx.date, true)}</span></div>
          <div className="flex justify-between gap-3"><span className="text-neutral-500">No. transaksi</span><span className="font-mono">#{tx.no}</span></div>
        </div>
      </div>

      {/* Tabel barang */}
      <table className="mt-[3px] w-full border-collapse text-[14px]">
        <thead>
          <tr className="bg-brand-800 text-white">
            <th className="px-3 py-3 text-left font-semibold">Nama barang</th>
            <th className="w-24 px-3 py-3 text-center font-semibold">Kuantitas</th>
            <th className="w-36 px-3 py-3 text-right font-semibold">Harga satuan</th>
            <th className="w-36 px-3 py-3 text-right font-semibold">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {tx.items.map((i) => (
            <tr key={i.id} className="border-b border-neutral-300">
              <td className="px-3 py-2.5">{i.name}</td>
              <td className="px-3 py-2.5 text-center">{i.qty}</td>
              <td className="px-3 py-2.5 text-right font-mono text-[13px]">{formatRupiah(i.price)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-[13px]">{formatRupiah(i.price * i.qty)}</td>
            </tr>
          ))}
          <tr className="bg-brand-800 font-bold text-white">
            <td colSpan={3} className="px-3.5 py-2.5">SUB TOTAL</td>
            <td className="px-3 py-2.5 text-right font-mono">{formatRupiah(subtotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Catatan, tanda tangan, ringkasan total */}
      <div className="invoice-keep mt-4 grid grid-cols-[1fr_300px] gap-8">
        <div>
          <h3 className="text-[14px] font-bold">Catatan</h3>
          <p className="mt-1.5 text-[13px] text-neutral-500">Simpan faktur ini sebagai bukti pembelian.</p>
          <div className="mt-5 grid grid-cols-2 gap-10 text-center text-[14px]">
            {["Kasir", "Penerima"].map((r) => (
              <div key={r}>
                <p>{r}</p>
                <div className="mt-20 border-t border-neutral-300 pt-2 text-[11px] text-neutral-500">Nama &amp; tanda tangan</div>
              </div>
            ))}
          </div>
        </div>
        <div className="self-start overflow-hidden rounded-lg bg-neutral-100 text-[14px]">
          <div className="flex items-center justify-between bg-brand-800 px-4 py-3 font-bold text-white">
            <span>TOTAL</span><span className="font-mono">{formatRupiah(tx.total)}</span>
          </div>
          <TotalRow label="Sudah dibayar" value={formatRupiah(tx.paid)} />
          <TotalRow label="Sisa tagihan" value={formatRupiah(remaining)} strong tone={remaining > 0 ? "!text-red-600" : ""} />
          {tx.cash != null && <TotalRow label="Kembalian" value={formatRupiah(tx.change ?? 0)} tone="text-brand-800" />}
        </div>
      </div>
    </div>
  );
}

/** Pratinjau faktur di layar: halaman A4 diskalakan agar muat lebar kontainer. */
export function InvoicePreview({ tx }) {
  const wrapRef = useRef(null);
  const pageRef = useRef(null);
  const [scale, setScale] = useState(0.4);
  const [height, setHeight] = useState(A4_PX.h * 0.4);

  useEffect(() => {
    const wrap = wrapRef.current;
    const page = pageRef.current;
    if (!wrap || !page) return undefined;
    const measure = () => {
      const s = wrap.clientWidth / A4_PX.w;
      setScale(s);
      setHeight(page.offsetHeight * s);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    ro.observe(page);
    return () => ro.disconnect();
  }, [tx]);

  return (
    <div ref={wrapRef} className="w-full overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-neutral-200" style={{ height }}>
      <div
        ref={pageRef}
        style={{ width: A4_PX.w, minHeight: A4_PX.h, padding: A4_PX.pad, transform: `scale(${scale})`, transformOrigin: "top left" }}
        className="bg-white"
      >
        <InvoiceSheet tx={tx} />
      </div>
    </div>
  );
}

/** Area cetak A4 (tersembunyi di layar, tampil saat printDoc("invoice")). */
export default function InvoiceDocument({ tx }) {
  return (
    <div className="print-invoice hidden">
      <InvoiceSheet tx={tx} />
    </div>
  );
}
