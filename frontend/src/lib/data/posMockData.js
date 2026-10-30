// Transaksi contoh memakai id produk p1–p16 dari lib/data/stockMockData.js.
import { INITIAL_PRODUCTS } from "./stockMockData";
import { makeTrxNo } from "../utils/pos";

export const GENERAL_CUSTOMER = { id: "general", name: "Pelanggan umum" };

export const CUSTOMERS = [
  { id: "c1", name: "Rusdi Cengkareng", address: "Jl. Cengkareng Raya No. 12, Jakarta Barat", phone: "0812-3456-7890" },
  { id: "c2", name: "Bambang Wahyudi Bintaro", address: "Jl. Bintaro Utama No. 5, Tangerang Selatan", phone: "0821-1122-3344" },
  { id: "c3", name: "Mamat Kunciran", address: "Jl. Kunciran Indah No. 3, Tangerang", phone: "0822-2233-4455" },
  { id: "c4", name: "Bee Petshop Gria", address: "Jl. Gria Asri No. 21, Bandung", phone: "0857-3344-5566" },
  { id: "c5", name: "Didit Cipondoh", address: "Jl. Cipondoh Makmur No. 8, Tangerang", phone: "0813-4455-6677" },
  { id: "c6", name: "Amba Kunciran", address: "Jl. Kunciran Raya No. 18, Tangerang", phone: "0813-4567-8901" },
  { id: "c7", name: "Wahyu BSD", address: "Jl. BSD City No. 9, Tangerang Selatan", phone: "0814-5678-9012" },
  { id: "c8", name: "Rizki Suki CBD", address: "Jl. CBD No. 7, Bandung", phone: "0815-6789-0123" },
  { id: "c9", name: "Tedy Samsat", address: "Jl. Samsat No. 4, Bandung", phone: "0816-7890-1234" },
  { id: "c10", name: "Prabowo Tangcit", address: "Jl. Tangcit No. 11, Bandung", phone: "0817-8901-2345" },
  { id: "c11", name: "Andi Saputra", address: "Jl. Saputra No. 6, Bandung", phone: "0818-9012-3456" },
  { id: "c12", name: "Lestari Putri", address: "Jl. Putri No. 3, Bandung", phone: "0819-0123-4567" },
];

/** Transaksi awal (tanggal = hari ini) agar Riwayat, Pelanggan & Chatbot punya data nyata. */
export function makeSeedTransactions() {
  const day = new Date();
  const P = (id, qty) => {
    const x = INITIAL_PRODUCTS.find((p) => p.id === id);
    return { id: x.id, name: x.name, price: x.sellPrice, qty };
  };
  const mk = (seq, [h, m], cid, method, items, paid, cancelled = false) => {
    const date = new Date(day);
    date.setHours(h, m, 0, 0);
    const c = CUSTOMERS.find((x) => x.id === cid);
    return {
      id: `t${seq}`, seq, no: makeTrxNo(seq, date), date,
      customer: { id: c.id, name: c.name }, method, items,
      total: items.reduce((s, i) => s + i.qty * i.price, 0), paid, cancelled,
      payments: paid > 0 ? [{ date, method, amount: paid, note: "Pembayaran awal" }] : [],
      history: [],
    };
  };
  return [
    mk(41, [10, 42], "c1", "Tunai", [P("p1", 5), P("p2", 10), P("p4", 4)], 400000),
    mk(40, [10, 36], "c6", "TF", [P("p3", 15)], 52500),
    mk(39, [10, 28], "c7", "TF", [P("p5", 6), P("p6", 2)], 181000),
    mk(38, [10, 15], "c8", "Tunai", [P("p9", 10), P("p12", 4)], 33000),
    mk(37, [10, 2], "c9", "Tunai", [P("p10", 2)], 33000, true),
    mk(36, [9, 54], "c10", "Tunai", [P("p14", 3), P("p15", 2)], 66500),
    mk(35, [9, 30], "c11", "Tunai", [P("p16", 20), P("p11", 5)], 100000),
    mk(34, [9, 10], "c2", "Tunai", [P("p1", 10)], 300000),
  ];
}
