import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, ModalBody, ModalFooter, Select, Badge } from "../ui";
import { formatRupiah, toInputDate } from "../../utils/pos";
import { makePaymentSchema } from "../../schemas/transaction";
import { remainingOf } from "../../utils/transaction";

const Row = ({ l, r, red }) => (
  <div className="flex justify-between py-1 text-xs"><span className="text-neutral-500">{l}</span><span className={`font-mono ${red ? "text-red-600" : "text-neutral-900"}`}>{r}</span></div>
);
const METHOD_OPTIONS = [{ value: "Tunai", label: "Tunai" }, { value: "TF", label: "TF" }];

export default function EditPaymentModal({ open, tx, onClose, onSubmit }) {
  const remaining = tx ? remainingOf(tx) : 0;
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(makePaymentSchema(remaining || 1)),
    defaultValues: { date: toInputDate(), method: "Tunai", amount: remaining, note: "" },
  });

  useEffect(() => {
    if (open && tx) reset({ date: toInputDate(), method: "Tunai", amount: remaining, note: "" });
  }, [open, tx, remaining, reset]);

  if (!tx) return null;
  const amount = Number(watch("amount")) || 0;
  const valid = amount > 0 && amount <= remaining;
  const totalPaid = tx.paid + (valid ? amount : 0);
  const lunas = totalPaid >= tx.total;

  const submit = async (v) => {
    await onSubmit({ date: new Date(v.date), method: v.method, amount: v.amount, note: v.note?.trim() || `Pelunasan ${v.method}` });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit pembayaran" description={`Perbarui status pembayaran transaksi #${tx.no} agar sesuai dengan pelunasan yang dilakukan pelanggan.`}>
      <form onSubmit={handleSubmit(submit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-4">
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            <Row l="Transaksi" r={tx.no} /><Row l="Pelanggan" r={tx.customer.name} />
            <Row l="Total tagihan" r={formatRupiah(tx.total)} /><Row l="Sudah dibayar" r={formatRupiah(tx.paid)} />
            <Row l="Sisa tagihan" r={formatRupiah(remaining)} red />
          </div>
          <Input label="Tanggal pelunasan" type="date" error={errors.date?.message} {...register("date")} />
          <Select label="Metode pelunasan" options={METHOD_OPTIONS} error={errors.method?.message} {...register("method")} />
          <Input label="Nominal pelunasan" type="number" inputMode="numeric" min={1} max={remaining} error={errors.amount?.message} {...register("amount")} />
          <Input label="Catatan pelunasan" placeholder="Contoh: Lunas, transfer BCA" error={errors.note?.message} {...register("note")} />
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            <p className="mb-1 text-xs font-bold text-neutral-900">Ringkasan perubahan</p>
            <Row l="Total tagihan" r={formatRupiah(tx.total)} /><Row l="Sudah dibayar" r={formatRupiah(tx.paid)} />
            <Row l="Pelunasan tambahan" r={`+ ${formatRupiah(valid ? amount : 0)}`} />
            <div className="flex justify-between py-1 text-xs font-bold"><span>Total dibayar</span><span className="font-mono">{formatRupiah(totalPaid)}</span></div>
            <div className="flex items-center justify-between py-1 text-xs font-bold"><span>Status baru</span><Badge variant={lunas ? "brand" : "danger"}>{lunas ? "Lunas" : "Belum Lunas"}</Badge></div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" fullWidth={false} onClick={onClose}>Batal</Button>
          <Button type="submit" fullWidth={false} loading={isSubmitting}>Simpan perubahan</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
