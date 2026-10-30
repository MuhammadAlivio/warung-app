import { Check, FileText, History, Plus, Printer } from "lucide-react";
import { Badge, Button, Card } from "../ui";
import { formatRupiah, formatTanggal, printDoc } from "../../utils/pos";
import { remainingOf, statusOf, STATUS_VARIANT, unitsOf } from "../../utils/transaction";
import ReceiptPreview from "./ReceiptPreview";
import InvoiceDocument from "./InvoiceDocument";

const Row = ({ l, r }) => (
  <div className="flex justify-between py-1.5 text-sm"><span className="text-neutral-500">{l}</span><span className="font-mono text-neutral-900">{r}</span></div>
);

export default function PaymentSuccess({ tx, onNew, onHistory }) {
  const status = statusOf(tx);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Check className="h-5 w-5" aria-hidden /></span>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Pembayaran berhasil</h2>
              <p className="text-xs text-neutral-500">Transaksi telah tersimpan di Riwayat Transaksi.</p>
            </div>
          </div>

          <div className="mt-5 flex items-start justify-between">
            <div>
              <p className="text-xs text-neutral-500">Total pembayaran</p>
              <p className="font-mono text-4xl font-bold text-brand-700">{formatRupiah(tx.total)}</p>
            </div>
            <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
          </div>

          <div className="mt-4 divide-y divide-neutral-100 border-y border-neutral-100 py-1">
            <Row l="No. transaksi" r={`#${tx.no}`} />
            <Row l="Pelanggan" r={tx.customer.name} />
            <Row l="Tanggal" r={formatTanggal(tx.date)} />
            <Row l="Metode pembayaran" r={tx.method} />
          </div>
          <div className="py-1">
            <Row l="Uang diterima" r={formatRupiah(tx.cash ?? 0)} />
            <Row l="Pembayaran dialokasikan" r={formatRupiah(tx.paid)} />
            <Row l="Sisa tagihan" r={formatRupiah(remainingOf(tx))} />
          </div>
          <div className="flex justify-between rounded-lg bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900">
            <span>Kembalian</span><span className="font-mono">{formatRupiah(tx.change ?? 0)}</span>
          </div>

          <div className="mt-5 border-t border-neutral-100 pt-4">
            <div className="flex justify-between"><h3 className="text-sm font-semibold">Ringkasan belanja</h3><span className="text-xs text-neutral-500">{tx.items.length} jenis barang · {unitsOf(tx)} unit</span></div>
            {tx.items.map((i) => (
              <div key={i.id} className="mt-3 flex items-start justify-between text-sm">
                <div><p className="font-semibold">{i.name}</p><p className="text-xs text-neutral-500">{i.qty} × {formatRupiah(i.price)}</p></div>
                <span className="font-mono">{formatRupiah(i.qty * i.price)}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button onClick={onNew}><Plus className="h-4 w-4" aria-hidden /> Transaksi baru</Button>
          <Button variant="outline" onClick={onHistory}><History className="h-4 w-4" aria-hidden /> Lihat Riwayat</Button>
        </div>
      </div>

      <Card className="h-fit p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Pratinjau struk</h2>
          <Badge>Siap dicetak</Badge>
        </div>
        {tx.printReceipt && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-3 text-xs font-semibold text-brand-900">
            <FileText className="h-4 w-4" aria-hidden /> Cetak struk dipilih sebelum pembayaran
          </div>
        )}
        <div className="mt-4 rounded-lg border border-neutral-100 bg-neutral-50 p-5"><ReceiptPreview tx={tx} /></div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div><p className="text-sm font-semibold">Dokumen siap dicetak</p><p className="text-xs text-neutral-500">Periksa printer sebelum mencetak ulang.</p></div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" fullWidth={false} onClick={() => printDoc("invoice")}>Cetak faktur</Button>
            <Button size="sm" fullWidth={false} onClick={() => printDoc("receipt")}><Printer className="h-4 w-4" aria-hidden /> Cetak ulang struk</Button>
          </div>
        </div>
      </Card>

      <div className="print-receipt hidden"><ReceiptPreview tx={tx} /></div>
      <InvoiceDocument tx={tx} />
    </div>
  );
}
