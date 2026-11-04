import { z } from "zod";

/** Angka bulat >= 0 dari input teks, hasilnya dikonversi ke number. */
const wholeNumber = (label) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi`)
    .regex(/^\d+$/, `${label} harus berupa angka bulat, minimal 0`)
    .transform(Number);

/** Foto opsional: File (baru dipilih), string URL (sudah tersimpan), atau null (tanpa foto). */
const productImage = z.union([z.instanceof(File), z.string(), z.null()]).optional();

/** Aturan sama dengan ProductController::validated() di backend. */
export const productSchema = z.object({
  image: productImage,
  name: z.string().trim().min(2, "Nama barang minimal 2 karakter").max(120, "Nama barang maksimal 120 karakter"),
  description: z.string().trim().max(300, "Maksimal 300 karakter"),
  // Nilai <select> berupa id kategori (string); daftar kategori diambil dari API
  categoryId: z.string().min(1, "Pilih kategori"),
  buyPrice: wholeNumber("Harga beli"),
  sellPrice: wholeNumber("Harga jual"),
  stock: wholeNumber("Stok"),
  minStock: wholeNumber("Minimal stok"),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi").max(50, "Nama kategori maksimal 50 karakter"),
});
