import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, ImageUpload, Input, Modal, ModalBody, ModalFooter, Select, Textarea } from "../ui";
import { useStock } from "../../stores/StockContext";
import { productSchema } from "../../schemas/stock";

const EMPTY = { image: null, name: "", description: "", categoryId: "", buyPrice: "", sellPrice: "", stock: "", minStock: "" };

const toFormValues = (p) => ({
  image: p.image ?? null,
  name: p.name,
  description: p.description ?? "",
  categoryId: String(p.categoryId),
  buyPrice: String(p.buyPrice),
  sellPrice: String(p.sellPrice),
  stock: String(p.stock),
  minStock: String(p.minStock),
});

function StockFormBody({ product, onSave, onClose }) {
  const { categories } = useStock();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: product ? toFormValues(product) : EMPTY,
  });

  const submit = async (values) => {
    // onSave boleh mengembalikan [{ field, message }] untuk error per field, atau { form } untuk error umum
    const problem = await onSave(values);
    if (!problem) return;
    if (problem.form) setError("root", { message: problem.form });
    (problem.fields ?? []).forEach((p) => setError(p.field, { message: p.message }));
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex min-h-0 flex-1 flex-col">
      <ModalBody className="space-y-4">
        {errors.root && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {errors.root.message}
          </p>
        )}
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
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
          error={errors.categoryId?.message}
          {...register("categoryId")}
        />
        <Controller
          name="image"
          control={control}
          render={({ field }) => (
            <ImageUpload label="Foto Barang" value={field.value} onChange={field.onChange} error={errors.image?.message} />
          )}
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
          label={product ? "Stok Saat Ini" : "Stok Awal"}
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
