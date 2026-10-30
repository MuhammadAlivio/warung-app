import { formatRupiah, isSameDay } from "./pos";
import { remainingOf } from "./transaction";

/** Penjawab sederhana berbasis data transaksi. Ganti dengan panggilan API LLM/backend bila sudah ada. */
export function getBotReply(text, { transactions, customers }) {
  const t = text.toLowerCase();
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);

  if (/(belum|utang|hutang|tagihan|tunggak)/.test(t)) {
    const scope = t.includes("kemarin") ? yesterday : t.includes("hari ini") ? now : null;
    const by = new Map();
    transactions.filter((x) => !x.cancelled && remainingOf(x) > 0 && (!scope || isSameDay(x.date, scope)))
      .forEach((x) => by.set(x.customer.name, (by.get(x.customer.name) ?? 0) + remainingOf(x)));
    if (by.size === 0) return "Tidak ada pelanggan yang memiliki tagihan belum lunas. 🎉";
    const label = scope ? (scope === yesterday ? " kemarin" : " hari ini") : "";
    return `Total ada ${by.size} pelanggan yang belum membayar lunas${label}. Daftarnya:\n` +
      [...by].map(([n, v]) => `- ${n} (${formatRupiah(v)})`).join("\n");
  }
  if (/(penjualan|omzet|pendapatan)/.test(t)) {
    const live = transactions.filter((x) => !x.cancelled && isSameDay(x.date, now));
    return `Penjualan bersih hari ini ${formatRupiah(live.reduce((s, x) => s + x.total, 0))} dari ${live.length} transaksi.`;
  }
  if (/(berapa|jumlah|total).*pelanggan|pelanggan.*(berapa|jumlah)/.test(t)) return `Saat ini ada ${customers.length} pelanggan terdaftar.`;
  return "Maaf, saya belum mengerti. Coba tanya: “Siapa saja pelanggan yang belum membayar lunas?” atau “Berapa penjualan hari ini?”";
}
export const QUICK_PROMPTS = ["Siapa saja pelanggan yang belum membayar lunas?", "Berapa penjualan hari ini?"];
