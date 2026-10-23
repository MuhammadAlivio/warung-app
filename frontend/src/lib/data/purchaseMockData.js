export const SUPPLIERS = [
  { id: "s1", name: "PT Pakan Sejahtera", phone: "081234567890", address: "Jl. Industri No. 5, Surabaya" },
  { id: "s2", name: "CV Nutrisi Hewan", phone: "087654321098", address: "Jl. Raya Malang No. 12" },
  { id: "s3", name: "UD Makmur Jaya", phone: "089876543210", address: "Jl. Pasar Baru No. 8, Sidoarjo" },
];

export function getPurchaseStatus(status) {
  const map = {
    belum_diterima: { key: "belum_diterima", label: "Belum diterima", variant: "warning" },
    diterima_sebagian: { key: "diterima_sebagian", label: "Diterima sebagian", variant: "brand" },
    diterima: { key: "diterima", label: "Diterima", variant: "brand" },
  };
  return map[status] || map.belum_diterima;
}

export const INITIAL_PURCHASES = [
  {
    id: "pb1",
    purchaseNo: "PB-20261020-0001",
    supplierId: "s1",
    date: "2026-10-20",
    status: "belum_diterima",
    items: [
      { id: "pi1", productId: "p1", productName: "Beras Premium 5kg", qty: 50, qtyReceived: 0, buyPrice: 62000, subtotal: 3100000 },
      { id: "pi2", productId: "p3", productName: "Gula Pasir 1kg", qty: 100, qtyReceived: 0, buyPrice: 14000, subtotal: 1400000 },
    ],
    total: 4500000,
    notes: "Pengiriman estimasi 3 hari",
  },
  {
    id: "pb2",
    purchaseNo: "PB-20261018-0002",
    supplierId: "s2",
    date: "2026-10-18",
    status: "diterima_sebagian",
    items: [
      { id: "pi3", productId: "p5", productName: "Minyak Goreng 2L", qty: 40, qtyReceived: 25, buyPrice: 32000, subtotal: 1280000 },
      { id: "pi4", productId: "p8", productName: "Tepung Terigu 1kg", qty: 60, qtyReceived: 60, buyPrice: 12000, subtotal: 720000 },
    ],
    total: 2000000,
    notes: "",
  },
  {
    id: "pb3",
    purchaseNo: "PB-20261015-0003",
    supplierId: "s3",
    date: "2026-10-15",
    status: "diterima",
    items: [
      { id: "pi5", productId: "p2", productName: "Mie Instan Goreng", qty: 200, qtyReceived: 200, buyPrice: 2800, subtotal: 560000 },
      { id: "pi6", productId: "p4", productName: "Kopi Sachet", qty: 150, qtyReceived: 150, buyPrice: 1500, subtotal: 225000 },
    ],
    total: 785000,
    notes: "Sudah lengkap",
  },
  {
    id: "pb4",
    purchaseNo: "PB-20261022-0004",
    supplierId: "s1",
    date: "2026-10-22",
    status: "belum_diterima",
    items: [
      { id: "pi7", productId: "p10", productName: "Sabun Cuci 800ml", qty: 30, qtyReceived: 0, buyPrice: 8500, subtotal: 255000 },
    ],
    total: 255000,
    notes: "",
  },
];
