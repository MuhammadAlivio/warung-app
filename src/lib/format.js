const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** Format ringkas sesuai desain: "Rp68.000" (tanpa spasi). */
export const formatRupiah = (value) => rupiah.format(Number(value) || 0).replace(/\s/g, "");
