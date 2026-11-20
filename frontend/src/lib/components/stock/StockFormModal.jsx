import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, ImageUpload, Input, Modal, ModalBody, ModalFooter, Select, Textarea } from "../ui";
import { useStock } from "../../stores/StockContext";
import { productSchema } from "../../schemas/stock";

const EMPTY = { image: null, name: "", description: "", categoryId: "", unit: "pcs", buyPrice: "", sellPrice: "", stock: "", minStock: "" };

const toFormValues = (p) => ({
  image: p.image ?? null,
  name: p.name,
  description: p.description ?? "",
  categoryId: String(p.categoryId),
  unit: p.unit ?? "pcs",
  buyPrice: String(p.buyPrice),
  sellPrice: String(p.sellPrice),
  stock: String(p.stock),
  minStock: String(p.minStock),
});

// Nama field dari backend (snake_case) -> nama field form
const FIELD_MAP = {
  name: "name", description: "description", category_id: "categoryId", unit: "unit", buy_price: "buyPrice",
  sell_price: "sellPrice", stock: "stock", min_stock: "minStock", image: "image",
};

/** ApiError dari simpan barang -> { form, fields } untuk dikembalikan oleh onSave. */
export const toFormProblem = (e) => {
  const fields = Object.entries(e.data?.errors ?? {})
    .filter(([k]) => FIELD_MAP[k])
    .map(([k, v]) => ({ field: FIELD_MAP[k], message: v[0] }));
  return fields.length ? { fields } : { form: e.message };
};

function StockFormBody({ product, onSave, onClose, lockStock }) {
  const { categories } = useStock();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    // lockStock: barang baru dari form pembelian, stok awal 0 (bertambah saat barang diterima)
    defaultValues: product ? toFormValues(product) : { ...EMPTY, stock: lockStock ? "0" : "" },
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
        <Input
          label="Satuan"
          placeholder="pcs, karung, kg, sak"
          hint="Satuan yang dipakai saat menjual dan membeli barang ini."
          error={errors.unit?.message}
          {...register("unit")}
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
        {lockStock ? (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
            Stok awal 0. Stok bertambah otomatis saat barang dari pembelian ini diterima.
          </p>
        ) : (
          <Input
            label={product ? "Stok Saat Ini" : "Stok Awal"}
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            error={errors.stock?.message}
            {...register("stock")}
          />
        )}
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
export default function StockFormModal({ open, product, onSave, onClose, lockStock = false }) {
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
      <StockFormBody key={product?.id ?? "new"} product={product} onSave={onSave} onClose={onClose} lockStock={lockStock} />
    </Modal>
  );
}
