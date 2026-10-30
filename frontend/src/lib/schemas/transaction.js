import { z } from "zod";
import { formatRupiah } from "../utils/pos";
import { totalOf } from "../utils/transaction";

/** limitOf(id) → batas qty per barang (stok + qty semula). paid → pembayaran yang sudah diterima. */
export const makeEditTransactionSchema = ({ paid, limitOf }) =>
  z
    .object({
      items: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            price: z.number(),
            qty: z.number({ invalid_type_error: "Isi jumlah" }).int("Harus bilangan bulat").min(1, "Minimal 1 unit"),
          })
        )
        .min(1, "Minimal satu barang harus ada di transaksi."),
      reason: z.string().trim().min(5, "Alasan perubahan wajib diisi (min. 5 karakter).").max(300, "Maksimal 300 karakter."),
    })
    .superRefine((v, ctx) => {
      v.items.forEach((i, idx) => {
        const max = limitOf(i.id);
        if (i.qty > max) ctx.addIssue({ code: "custom", path: ["items", idx, "qty"], message: `Stok tersedia hanya ${max} unit.` });
      });
      const total = totalOf(v.items);
      if (total < paid)
        ctx.addIssue({
          code: "custom",
          path: ["items"],
          message: `Total baru (${formatRupiah(total)}) tidak boleh lebih kecil dari pembayaran yang sudah diterima (${formatRupiah(paid)}).`,
        });
    });

export const makePaymentSchema = (remaining) =>
  z.object({
    date: z.string().min(1, "Tanggal pelunasan wajib diisi"),
    method: z.enum(["Tunai", "TF"], { errorMap: () => ({ message: "Pilih metode pelunasan" }) }),
    amount: z.coerce
      .number({ invalid_type_error: "Nominal harus berupa angka" })
      .int("Nominal harus bilangan bulat")
      .min(1, "Nominal minimal Rp1")
      .max(remaining, `Nominal tidak boleh melebihi sisa tagihan (${formatRupiah(remaining)})`),
    note: z.string().trim().max(200, "Maksimal 200 karakter").optional(),
  });

export const cancelSchema = z.object({
  reason: z.string().trim().min(5, "Alasan pembatalan wajib diisi (min. 5 karakter).").max(300, "Maksimal 300 karakter."),
});
