export const CATEGORIES = ["Sembako", "Makanan", "Minuman", "Kebutuhan Rumah", "Perawatan"];

/** Status stok dihitung dari stok vs batas minimum per barang. */
export function getStockStatus({ stock, minStock }) {
  if (stock <= 0) return { key: "out", label: "Habis", variant: "danger" };
  if (stock <= minStock) return { key: "low", label: "Menipis", variant: "warning" };
  return { key: "ok", label: "Aman", variant: "brand" };
}

const item = (id, name, note, category, buyPrice, sellPrice, stock, minStock) => ({
  id,
  name,
  note,
  description: "",
  category,
  buyPrice,
  sellPrice,
  stock,
  minStock,
});

export const INITIAL_PRODUCTS = [
  item("p1", "Beras Pandan Wangi", "5 kg / karung", "Sembako", 68000, 75000, 24, 10),
  item("p2", "Minyak Goreng Sania", "Per pcs", "Sembako", 17500, 20000, 36, 12),
  item("p3", "Indomie Goreng", "Per pcs", "Makanan", 2800, 3500, 112, 24),
  item("p4", "Gula Pasir Gulaku", "Per pcs", "Sembako", 14500, 17000, 8, 12),
  item("p5", "Telur Ayam Negeri", "Per kilogram", "Sembako", 24000, 28000, 18, 10),
  item("p6", "Teh Celup SariWangi", "Per pcs", "Minuman", 5200, 6500, 42, 12),
  item("p7", "Teh Tjap Alivio GOAT", "Per pcs", "Minuman", 5200, 6500, 0, 12),
  item("p8", "Floridina", "Per pcs", "Minuman", 5200, 6500, 42, 12),
  item("p9", "Kopi Kapal Api Sachet", "Per pcs", "Minuman", 1200, 1500, 9, 24),
  item("p10", "Sabun Cuci Piring Sunlight", "Per pcs", "Kebutuhan Rumah", 14000, 16500, 18, 10),
  item("p11", "Deterjen Rinso 800 g", "Per pcs", "Kebutuhan Rumah", 21000, 24000, 6, 10),
  item("p12", "Sabun Mandi Lifebuoy", "Per pcs", "Perawatan", 3800, 4500, 75, 20),
  item("p13", "Sampo Pantene Sachet", "Per pcs", "Perawatan", 1200, 1500, 0, 30),
  item("p14", "Pasta Gigi Pepsodent 120 g", "Per pcs", "Perawatan", 11000, 13500, 22, 10),
  item("p15", "Kecap Manis Bango 220 ml", "Per pcs", "Sembako", 11000, 13000, 5, 10),
  item("p16", "Tepung Terigu Segitiga 1 kg", "Per pcs", "Sembako", 11500, 13500, 31, 10),
];
