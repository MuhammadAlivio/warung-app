import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "../ui/Modal";
import { Button } from "../ui";
import { cn } from "../../utils/cn";
import { formatRupiah } from "../../utils/format";
import { purchaseDebt, purchasePaid, purchaseTotal } from "../../utils/purchase";
import { PAYMENT_METHODS } from "../../data/purchaseMockData";

const FIELD =
  "h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15";

/** Catat pembayaran utang pemasok: bisa dilunasi sekaligus atau dicicil. */
export default function PaymentModal({ open, purchase, onClose, onSave }) {
  const debt = purchaseDebt(purchase);
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("transfer_bank");
  const [saving, setSaving] = useState(false);

  // Isi ulang tiap modal dibuka: default melunasi seluruh sisa utang.
  useEffect(() => {
    if (open) {
      setAmount(purchaseDebt(purchase));
      setDate(new Date().toISOString().slice(0, 10));
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const value = Math.max(0, Math.min(debt, Number(amount) || 0));
  const remaining = debt - value;
  const valid = value > 0;

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    onSave({ amount: value, date, method });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Catat pembayaran"
      description={`Faktur ${purchase.purchaseNo}. Bayar sebagian untuk mencicil, atau lunasi seluruh sisa utang.`}
    >
      <ModalBody className="space-y-4">
        <div className="space-y-2 rounded-lg bg-neutral-50 px-4 py-3 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-500">Total faktur</span>
            <span className="font-mono tabular-nums text-neutral-700">{formatRupiah(purchaseTotal(purchase))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Sudah dibayar</span>
            <span className="font-mono tabular-nums text-neutral-700">{formatRupiah(purchasePaid(purchase))}</span>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-2 font-bold">
            <span className="text-neutral-900">Sisa utang</span>
            <span className="font-mono tabular-nums text-amber-700">{formatRupiah(debt)}</span>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="jumlah-bayar" className="text-xs font-semibold text-neutral-900">
              Jumlah dibayar sekarang
            </label>
            <button
              type="button"
              onClick={() => setAmount(debt)}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Lunasi sisa
            </button>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
              Rp
            </span>
            <input
              id="jumlah-bayar"
              type="number"
              min={1}
              max={debt}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn(FIELD, "pl-8 font-mono tabular-nums")}
            />
          </div>
          {Number(amount) > debt && (
            <p className="mt-1 text-[11px] text-red-600">Jumlah melebihi sisa utang; akan dibatasi {formatRupiah(debt)}.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tgl-bayar" className="mb-1.5 block text-xs font-semibold text-neutral-900">
              Tanggal bayar
            </label>
            <input id="tgl-bayar" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
          </div>
          <div>
            <label htmlFor="metode-bayar" className="mb-1.5 block text-xs font-semibold text-neutral-900">
              Metode pembayaran
            </label>
            <select id="metode-bayar" value={method} onChange={(e) => setMethod(e.target.value)} className={FIELD}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {remaining === 0
              ? "Faktur ini akan berstatus Lunas."
              : `Sisa utang setelah ini ${formatRupiah(remaining)}. Kamu bisa mencicil lagi nanti.`}
          </span>
        </div>
      </ModalBody>
      <ModalFooter className="justify-end">
        <Button variant="outline" fullWidth={false} onClick={onClose}>
          Batal
        </Button>
        <Button fullWidth={false} disabled={!valid} loading={saving} onClick={handleSave}>
          Simpan pembayaran
        </Button>
      </ModalFooter>
    </Modal>
  );
}
