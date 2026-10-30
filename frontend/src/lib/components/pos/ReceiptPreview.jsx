import { formatRupiah, formatTanggal, getStoreProfile } from "../../utils/pos";
import { remainingOf, statusOf, unitsOf } from "../../utils/transaction";

const Row = ({ l, r, bold, red }) => (
  <div className={`flex justify-between gap-2 ${bold ? "font-bold text-neutral-900" : "text-neutral-600"}`}>
    <span>{l}</span>
    <span className={`font-mono ${red ? "text-red-600" : ""}`}>{r}</span>
  </div>
);
const Hr = () => <hr className="border-neutral-200" />;

/** Struk. Dipakai di preview layar, detail Riwayat, dan area cetak. */
export default function ReceiptPreview({ tx }) {
  const STORE = getStoreProfile();
  const remaining = remainingOf(tx);
  return (
    <div className="mx-auto w-full max-w-[420px] space-y-3 border border-neutral-200 bg-[#fbfaf7] p-5 text-xs">
      <div className="text-center">
        <h3 className="text-lg font-bold text-neutral-900">{STORE.name}</h3>
        <p className="text-neutral-500">{STORE.addressShort}</p>
        <p className="text-neutral-500">{STORE.phone}</p>
      </div>
      <Hr />
      <div className="space-y-1">
        <p className="font-mono font-bold text-neutral-900">#{tx.no}</p>
        <Row l="Tanggal" r={formatTanggal(tx.date)} />
        <Row l="Pelanggan" r={tx.customer.name} />
        <Row l="Pembayaran" r={`${tx.method} · ${statusOf(tx)}`} />
      </div>
      <Hr />
      <div className="space-y-2">
        {tx.items.map((i) => (
          <div key={i.id}>
            <p className="font-semibold text-neutral-900">{i.name}</p>
            <Row l={`${i.qty} × ${formatRupiah(i.price)}`} r={formatRupiah(i.qty * i.price)} />
          </div>
        ))}
      </div>
      <Hr />
      <Row l={`Subtotal · ${unitsOf(tx)} unit`} r={formatRupiah(tx.total)} />
      <Row l="TOTAL" r={formatRupiah(tx.total)} bold />
      <Row l="Sudah dibayar" r={formatRupiah(tx.paid)} />
      <Row l="Sisa tagihan" r={formatRupiah(remaining)} red={remaining > 0} />
      {tx.cash != null && (
        <>
          <Hr />
          <Row l="Uang diterima" r={formatRupiah(tx.cash)} />
          <Row l="Kembalian" r={formatRupiah(tx.change ?? 0)} bold />
        </>
      )}
      <Hr />
      <p className="text-center text-neutral-500">Terima kasih sudah berbelanja. Sampai jumpa kembali!</p>
    </div>
  );
}
