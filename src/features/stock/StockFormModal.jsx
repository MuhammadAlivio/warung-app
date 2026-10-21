import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, ModalBody, ModalFooter, Select, Textarea } from "../../components/ui";
import { CATEGORIES } from "./mockData";
import { productSchema } from "./schemas";

const EMPTY = { name: "", description: "", category: "", buyPrice: "", sellPrice: "", stock: "", minStock: "" };

const toFormValues = (p) => ({
  name: p.name,
  description: p.description ?? "",
  category: p.category,
  buyPrice: String(p.buyPrice),
  sellPrice: String(p.sellPrice),
  stock: String(p.stock),
  minStock: String(p.minStock),
});

function StockFormBody({ product, onSave, onClose }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: product ? toFormValues(product) : EMPTY,
  });

  const submit = async (values) => {
    // onSave boleh mengembalikan { field, message } untuk error pada satu field
    const problem = await onSave(values);
    if (problem) setError(problem.field, { message: problem.message });
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex min-h-0 flex-1 flex-col">
      <ModalBody className="space-y-4">
        <Input label="Nama Barang" placeholder="Masukkan nama barang" error={errors.name?.message} {...register("name")} />
        <Textarea
          label="Keterangan Barang"
          placeholder="Deskripsikan barang ini"
          error={errors.description?.message}
          {...register("description")}
        />
        <Select
          label="Kategori"
          placeholder="Pilih kategori"
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          error={errors.category?.message}
          {...register("category")}
        />
        <Input
          label="Harga Beli"
          type="number"
          inputMode="numeric"
          min="0"
          placeholder="Rp 0"
          error={errors.buyPrice?.message}
          {...register("buyPrice")}
        />
        <Input
          label="Harga Jual"
          type="number"
          inputMode="numeric"
          min="0"
          placeholder="Rp 0"
          error={errors.sellPrice?.message}
          {...register("sellPrice")}
        />
        <Input
          label="Stok Awal"
          type="number"
          inputMode="numeric"
          min="0"
          placeholder="0"
          error={errors.stock?.message}
          {...register("stock")}
        />
        <Input
          label="Minimal Stok"
          type="number"
          inputMode="numeric"
          min="0"
          placeholder="0"
          error={errors.minStock?.message}
          {...register("minStock")}
        />
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" size="sm" fullWidth={false} onClick={onClose} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" size="sm" fullWidth={false} loading={isSubmitting}>
          Simpan
        </Button>
      </ModalFooter>
    </form>
  );
}

/**
 * Modal Tambah / Edit barang. `product` kosong = mode tambah.
 * Form di-mount ulang setiap modal dibuka, jadi nilainya otomatis ter-reset.
 */
export default function StockFormModal({ open, product, onSave, onClose }) {
  const isEdit = !!product;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Barang" : "Tambah Barang"}
      description={
        isEdit ? "Edit data barang untuk stok dan penjualan." : "Tambahkan data barang baru untuk stok dan penjualan."
      }
    >
      <StockFormBody key={product?.id ?? "new"} product={product} onSave={onSave} onClose={onClose} />
    </Modal>
  );
}
