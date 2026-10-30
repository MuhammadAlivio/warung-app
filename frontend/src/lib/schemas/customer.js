import { z } from "zod";

const phoneRegex = /^(\+62|62|0)8[0-9\s-]{7,13}$/;

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Nama pelanggan wajib diisi").max(80, "Maksimal 80 karakter"),
  phone: z.string().trim().optional().refine((v) => !v || phoneRegex.test(v), "Format nomor tidak valid, contoh: 0812 3456 7890"),
  address: z.string().trim().max(200, "Maksimal 200 karakter").optional(),
  note: z.string().trim().max(300, "Maksimal 300 karakter").optional(),
});
