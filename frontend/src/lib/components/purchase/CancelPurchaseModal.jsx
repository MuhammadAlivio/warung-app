import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Modal, ModalBody, ModalFooter, Textarea } from "../ui";
import { formatRupiah } from "../../utils/format";

/** Aturan sama dengan PurchaseController::cancel() di backend. */
const cancelSchema = z.object({
  reason: z.string().trim().min(5, "Alasan pembatalan minimal 5 karakter").max(300, "Alasan pembatalan maksimal 300 karakter"),
});

const Row = ({ l, r }) => (
  <div className="flex items-center justify-between py-1 text-xs">
    <span className="text-neutral-500">{l}</span>
    <span className="font-mono text-neutral-900">{r}</span>
  </div>
);

function CancelForm({ purchase, onConfirm, onClose }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(cancelSchema), defaultValues: { reason: "" } });

  const submit = async ({ reason }) => {
    try {
      await onConfirm(reason.trim());
    } catch (e) {
      setError("root", { message: Object.values(e.data?.errors ?? {})[0]?.[0] ?? e.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex min-h-0 flex-1 flex-col">
      <ModalBody className="space-y-4">
        <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
          <Row l="Faktur" r={purchase.purchaseNo} />
          <Row l="Pemasok" r={purchase.supplierName} />
          <Row l="Total faktur" r={formatRupiah(purchase.total)} />
          <Row l="Sudah dibayar" r={formatRupiah(purchase.paid)} />
        </div>

        <Textarea
          label="Alasan pembatalan *"
          placeholder="Contoh: Pemasok tidak punya stok, pesanan dibatalkan"
          rows={3}
          error={errors.reason?.message}
          {...register("reason")}
        />

        <div role="note" className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs leading-relaxed text-red-700">
          <p className="font-bold text-red-600">Perhatian</p>
          <p className="mt-1">
            Faktur akan berstatus <span className="font-semibold">Dibatalkan</span> dan tidak bisa diterima barangnya atau
            dibayar lagi. Faktur tetap tersimpan sebagai catatan.
          </p>
          {purchase.paid > 0 && (
            <p className="mt-1">
              Pembayaran {formatRupiah(purchase.paid)} dianggap <span className="font-semibold">dikembalikan pemasok</span> dan
              tidak lagi dihitung sebagai pengeluaran di laporan Keuangan. Pastikan uangnya memang sudah kembali.
            </p>
          )}
        </div>

        {errors.root && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {errors.root.message}
          </p>
        )}
      </ModalBody>
      <ModalFooter className="justify-end">
        <Button variant="outline" size="sm" fullWidth={false} onClick={onClose} disabled={isSubmitting}>
          Kembali
        </Button>
        <Button type="submit" variant="danger" size="sm" fullWidth={false} loading={isSubmitting}>
          Batalkan pembelian
        </Button>
      </ModalFooter>
    </form>
  );
}

/** Konfirmasi pembatalan faktur pembelian yang tidak jadi. onConfirm(reason) async; error tampil di modal. */
export default function CancelPurchaseModal({ open, purchase, onConfirm, onClose }) {
  return (
    <Modal
      open={open && !!purchase}
      onClose={onClose}
      title="Batalkan pembelian?"
      description="Gunakan jika transaksi pembelian tidak jadi. Hanya untuk faktur yang barangnya belum diterima."
    >
      {open && purchase && <CancelForm purchase={purchase} onConfirm={onConfirm} onClose={onClose} />}
    </Modal>
  );
}
