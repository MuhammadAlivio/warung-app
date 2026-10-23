import { z } from "zod";
import { CATEGORIES } from "../data/stockMockData";

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

export const productSchema = z.object({
  image: productImage,
  name: z.string().trim().min(2, "Nama barang minimal 2 karakter"),
  description: z.string().trim().max(300, "Maksimal 300 karakter"),
  category: z
    .string()
    .min(1, "Pilih kategori")
    .refine((v) => CATEGORIES.includes(v), "Pilih kategori"),
  buyPrice: wholeNumber("Harga beli"),
  sellPrice: wholeNumber("Harga jual"),
  stock: wholeNumber("Stok awal"),
  minStock: wholeNumber("Minimal stok"),
});
