import { z } from "zod";
import { CATEGORIES } from "./mockData";

/** Angka bulat >= 0 dari input teks, hasilnya dikonversi ke number. */
const wholeNumber = (label) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi`)
    .regex(/^\d+$/, `${label} harus berupa angka bulat, minimal 0`)
    .transform(Number);

export const productSchema = z.object({
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
