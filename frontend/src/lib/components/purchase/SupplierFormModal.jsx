import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Modal, ModalBody, ModalFooter, Textarea } from "../ui";

/** Aturan sama dengan SupplierController::validated() di backend. */
const supplierSchema = z.object({
  name: z.string().trim().min(2, "Nama pemasok minimal 2 karakter").max(120, "Nama pemasok maksimal 120 karakter"),
  phone: z
    .string()
    .trim()
    .refine((v) => !v || /^(\+62|62|0)[0-9\s-]{8,15}$/.test(v), "Format nomor tidak valid, contoh: 0812 3456 7890"),
  address: z.string().trim().max(200, "Alamat maksimal 200 karakter"),
});

function SupplierFormBody({ onSave, onClose }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(supplierSchema), defaultValues: { name: "", phone: "", address: "" } });

  const submit = async (values) => {
    try {
      await onSave(values);
    } catch (e) {
      const fieldErrors = Object.entries(e.data?.errors ?? {});
      if (fieldErrors.length) fieldErrors.forEach(([k, v]) => setError(k, { message: v[0] }));
      else setError("root", { message: e.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex min-h-0 flex-1 flex-col">
      <ModalBody className="space-y-4">
        {errors.root && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {errors.root.message}
          </p>
        )}
        <Input label="Nama pemasok *" placeholder="CV Pakan Makmur" error={errors.name?.message} {...register("name")} />
        <Input label="Nomor telepon" placeholder="0812 3456 7890" error={errors.phone?.message} {...register("phone")} />
        <Textarea label="Alamat" placeholder="Jl. Raya No. 1, Bandung" rows={2} error={errors.address?.message} {...register("address")} />
      </ModalBody>
      <ModalFooter className="justify-end">
        <Button variant="outline" size="sm" fullWidth={false} onClick={onClose} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" size="sm" fullWidth={false} loading={isSubmitting}>
          Simpan pemasok
        </Button>
      </ModalFooter>
    </form>
  );
}

/** Tambah pemasok baru langsung dari form Buat Pembelian. onSave async; error validasi tampil per field. */
export default function SupplierFormModal({ open, onSave, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Pemasok baru" description="Tambahkan pemasok untuk dicatat di faktur pembelian.">
      {open && <SupplierFormBody onSave={onSave} onClose={onClose} />}
    </Modal>
  );
}
