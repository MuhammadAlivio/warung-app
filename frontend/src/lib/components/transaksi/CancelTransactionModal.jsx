import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, Modal, ModalBody, ModalFooter, Textarea } from "../ui";
import { formatRupiah } from "../../utils/pos";
import { cancelSchema } from "../../schemas/transaction";
import { statusOf, STATUS_VARIANT } from "../../utils/transaction";

const Row = ({ l, r }) => (
  <div className="flex items-center justify-between py-1 text-xs"><span className="text-neutral-500">{l}</span><span className="font-mono text-neutral-900">{r}</span></div>
);

export default function CancelTransactionModal({ open, tx, onClose, onConfirm }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(cancelSchema), defaultValues: { reason: "" } });
  useEffect(() => { if (open) reset({ reason: "" }); }, [open, reset]);
  if (!tx) return null;
  const status = statusOf(tx);

  return (
    <Modal
      open={open} onClose={onClose} title="Batalkan transaksi?"
      description={`Pastikan transaksi #${tx.no} benar-benar perlu dibatalkan. Setelah dibatalkan, status transaksi akan berubah menjadi Dibatalkan dan tidak dapat diubah kembali ke Lunas.`}
    >
      <form onSubmit={handleSubmit(async (v) => { await onConfirm(v.reason); onClose(); })} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-4">
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            <Row l="Transaksi" r={tx.no} /><Row l="Pelanggan" r={tx.customer.name} />
            <Row l="Total tagihan" r={formatRupiah(tx.total)} /><Row l="Sudah dibayar" r={formatRupiah(tx.paid)} />
            <div className="flex items-center justify-between py-1 text-xs"><span className="text-neutral-500">Status saat ini</span><Badge variant={STATUS_VARIANT[status]}>{status}</Badge></div>
          </div>
          <Textarea label="Alasan pembatalan" placeholder="Contoh: Pelanggan membatalkan pesanan" error={errors.reason?.message} {...register("reason")} />
          <div role="note" className="rounded-lg border border-red-300 bg-red-50 p-3">
            <p className="text-xs font-bold text-red-600">Perhatian</p>
            <p className="mt-1 text-xs leading-relaxed text-red-700">
              Pembatalan akan mengubah status transaksi menjadi Dibatalkan. Jika pelanggan sudah membayar sebagian, pastikan uang tersebut dikembalikan atau dipindahkan ke transaksi lain sebelum melakukan pembatalan.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" fullWidth={false} onClick={onClose}>Batal</Button>
          <Button type="submit" variant="danger" fullWidth={false} loading={isSubmitting}>Batalkan transaksi</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
