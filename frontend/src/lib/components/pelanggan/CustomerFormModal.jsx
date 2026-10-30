import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { Button, Input, Modal, ModalBody, ModalFooter, Textarea } from "../ui";
import { customerSchema } from "../../schemas/customer";

const empty = { name: "", phone: "", address: "", note: "" };

/** Tambah (customer kosong) & Edit (customer terisi). */
export default function CustomerFormModal({ open, onClose, onSubmit, customer }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    if (open) reset(customer ? { ...empty, ...customer } : empty);
  }, [open, customer, reset]);

  const submit = async (values) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? "Edit pelanggan" : "Tambah pelanggan"}
      description="Simpan data pelanggan agar transaksi toko lebih mudah dicatat."
    >
      <form onSubmit={handleSubmit(submit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-4">
          <Input label="Nama pelanggan (wajib)" placeholder="Masukkan nama pelanggan" error={errors.name?.message} {...register("name")} />
          <Input
            label="Nomor telepon / WhatsApp (opsional)"
            placeholder="Contoh: 0812 3456 7890"
            inputMode="tel"
            error={errors.phone?.message}
            hint={<p className="mt-1.5 text-xs text-neutral-500">Gunakan nomor aktif agar pelanggan mudah dihubungi.</p>}
            {...register("phone")}
          />
          <Textarea label="Alamat (opsional)" placeholder="Nama jalan, nomor rumah, dan kota" error={errors.address?.message} {...register("address")} />
          <Textarea label="Catatan (opsional)" placeholder="Tambahkan informasi lain tentang pelanggan" error={errors.note?.message} {...register("note")} />
          <div className="flex items-start gap-2 rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-xs text-neutral-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            Tagihan pelanggan akan tercatat otomatis dari transaksi. Tidak perlu memasukkan saldo awal.
          </div>
        </ModalBody>
        <ModalFooter className="justify-end">
          <Button type="button" variant="outline" fullWidth={false} onClick={onClose}>Batal</Button>
          <Button type="submit" fullWidth={false} loading={isSubmitting}>Simpan pelanggan</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
