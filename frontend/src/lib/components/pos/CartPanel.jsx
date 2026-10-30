import { Check, Minus, Plus, User, X } from "lucide-react";
import { Button, Card } from "../ui";
import { cn } from "../../utils/cn";
import { formatRupiah } from "../../utils/pos";

const METHODS = ["Tunai", "TF"];
const QUICK_CASH = [10000, 20000, 50000, 100000];

function Toggle({ active, onClick, children }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={active}
      className={cn("flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20",
        active ? "border-transparent bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50")}
    >
      {active && <Check className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </button>
  );
}

export default function CartPanel({
  trxNo, cart, customer, onPickCustomer, method, setMethod, cash, setCash,
  printReceipt, setPrintReceipt, printInvoice, setPrintInvoice,
  change, remaining, error, onPay, onSave,
}) {
  const empty = cart.items.length === 0;
  const short = remaining > 0 && cash > 0;
  return (
    <Card className="flex h-fit flex-col p-5 lg:sticky lg:top-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-neutral-900">Keranjang belanja</h2>
        <span className="font-mono text-xs font-semibold text-brand-600">#{trxNo}</span>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-neutral-200 py-1 pl-3 pr-1">
        <span className="flex items-center gap-2 text-sm text-neutral-800">
          <User className="h-4 w-4 text-neutral-500" aria-hidden /> {customer.name}
        </span>
        <Button variant="ghost" size="sm" fullWidth={false} onClick={onPickCustomer}>+ Pilih pelanggan</Button>
      </div>

      <div className="mt-4 max-h-[260px] divide-y divide-neutral-100 overflow-y-auto border-t border-neutral-100">
        {empty && <p className="py-8 text-center text-sm text-neutral-500">Keranjang masih kosong. Pilih barang di sebelah kiri.</p>}
        {cart.items.map((i) => (
          <div key={i.id} className="py-3">
            <div className="flex items-start justify-between">
              <span className="text-sm font-semibold text-neutral-900">{i.name}</span>
              <button type="button" onClick={() => cart.remove(i.id)} aria-label={`Hapus ${i.name}`} className="text-neutral-500 hover:text-red-600">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center rounded-lg border border-neutral-200">
                <button type="button" onClick={() => cart.setQty(i.id, i.qty - 1)} aria-label="Kurangi" className="px-2.5 py-1.5 hover:bg-neutral-50"><Minus className="h-3.5 w-3.5" aria-hidden /></button>
                <span className="w-7 text-center text-sm font-medium">{i.qty}</span>
                <button type="button" onClick={() => cart.setQty(i.id, i.qty + 1)} disabled={i.qty >= i.stock} aria-label="Tambah" className="px-2.5 py-1.5 hover:bg-neutral-50 disabled:opacity-40"><Plus className="h-3.5 w-3.5" aria-hidden /></button>
              </div>
              <span className="text-xs text-neutral-500">× {formatRupiah(i.price)}</span>
              <span className="font-mono text-sm font-bold text-neutral-900">{formatRupiah(i.price * i.qty)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-neutral-100 py-3 text-sm text-neutral-500">
        <span>Subtotal · {cart.units} item</span>
        <span className="font-mono text-neutral-800">{formatRupiah(cart.total)}</span>
      </div>
      <div className="flex items-end justify-between border-b border-neutral-100 pb-4">
        <span className="text-sm font-semibold text-neutral-900">Total belanja</span>
        <span className="font-mono text-3xl font-bold text-brand-700">{formatRupiah(cart.total)}</span>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-neutral-900">Metode pembayaran</h3>
      <div className="mt-2 flex gap-2">
        {METHODS.map((m) => <Toggle key={m} active={method === m} onClick={() => setMethod(m)}>{m}</Toggle>)}
      </div>

      <label htmlFor="cash" className="mt-4 text-xs text-neutral-500">Uang diterima</label>
      <input
        id="cash" inputMode="numeric" value={cash ? formatRupiah(cash) : ""} placeholder="Rp0" aria-invalid={!!error}
        onChange={(e) => setCash(Number(e.target.value.replace(/\D/g, "")) || 0)}
        className={cn("mt-1.5 h-12 w-full rounded-lg border bg-white px-3 font-mono text-lg font-semibold focus:outline-none focus:ring-4",
          error ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : "border-brand-600 focus:ring-brand-600/15")}
      />
      {error && <p role="alert" className="mt-1.5 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" disabled={cart.total === 0} onClick={() => setCash(cart.total)} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-200 disabled:opacity-40">Uang pas</button>
        {QUICK_CASH.map((n) => (
          <button key={n} type="button" onClick={() => setCash(n)} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-200">{formatRupiah(n)}</button>
        ))}
      </div>

      <div className={cn("mt-3 flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold", short ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700")}>
        <span>{short ? "Sisa tagihan" : "Kembalian"}</span>
        <span className="font-mono">{formatRupiah(short ? remaining : change)}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Toggle active={printReceipt} onClick={() => setPrintReceipt(!printReceipt)}>Cetak struk</Toggle>
        <Toggle active={printInvoice} onClick={() => setPrintInvoice(!printInvoice)}>Cetak faktur</Toggle>
      </div>

      <Button className="mt-3" onClick={onPay} disabled={empty}><Check className="h-4 w-4" aria-hidden /> Bayar</Button>
      <button type="button" onClick={onSave} disabled={empty} className="mt-3 self-start text-xs font-semibold text-brand-600 hover:underline disabled:opacity-40">
        Simpan transaksi
      </button>
    </Card>
  );
}
