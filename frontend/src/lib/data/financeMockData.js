export const FINANCE_CATEGORIES_IN = ["Penjualan", "Pelunasan piutang", "Prive masuk", "Lainnya"];
export const FINANCE_CATEGORIES_OUT = [
  "Biaya operasional",
  "Pembelian barang",
  "Gaji",
  "Listrik & air",
  "Transportasi",
  "Sewa toko",
  "Biaya lainnya",
  "Prive pemilik",
];

// Richer mock data for the week of 2-17 Oct 2026
export const INITIAL_FINANCE_ENTRIES = [
  // Week 2: 6-12 Okt 2026
  { id: "f01", type: "masuk", category: "Penjualan", amount: 1300000, date: "2026-10-02", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f02", type: "keluar", category: "Pembelian barang", amount: 400000, date: "2026-10-02", description: "Pembelian Beras", createdBy: "Admin" },

  { id: "f03", type: "masuk", category: "Penjualan", amount: 1300000, date: "2026-10-03", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f04", type: "keluar", category: "Pembelian barang", amount: 600000, date: "2026-10-03", description: "Pembelian Gula", createdBy: "Admin" },

  { id: "f05", type: "masuk", category: "Penjualan", amount: 1500000, date: "2026-10-04", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f06", type: "keluar", category: "Pembelian barang", amount: 450000, date: "2026-10-04", description: "Pembelian Minyak", createdBy: "Admin" },

  { id: "f07", type: "masuk", category: "Penjualan", amount: 1400000, date: "2026-10-05", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f08", type: "keluar", category: "Pembelian barang", amount: 450000, date: "2026-10-05", description: "Pembelian Tepung", createdBy: "Admin" },

  { id: "f09", type: "masuk", category: "Penjualan", amount: 1000000, date: "2026-10-06", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f10", type: "keluar", category: "Pembelian barang", amount: 400000, date: "2026-10-06", description: "Pembelian Kopi", createdBy: "Admin" },

  { id: "f11", type: "masuk", category: "Penjualan", amount: 1000000, date: "2026-10-07", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f12", type: "keluar", category: "Pembelian barang", amount: 500000, date: "2026-10-07", description: "Pembelian Mie", createdBy: "Admin" },

  // Week 2: 6-12 Okt
  { id: "f13", type: "masuk", category: "Penjualan", amount: 1100000, date: "2026-10-08", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f14", type: "keluar", category: "Pembelian barang", amount: 700000, date: "2026-10-08", description: "Pembelian barang", createdBy: "Admin" },

  { id: "f15", type: "masuk", category: "Penjualan", amount: 900000, date: "2026-10-09", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f16", type: "keluar", category: "Pembelian barang", amount: 150000, date: "2026-10-09", description: "Pembelian barang", createdBy: "Admin" },

  { id: "f17", type: "masuk", category: "Penjualan", amount: 1000000, date: "2026-10-10", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f18", type: "keluar", category: "Pembelian barang", amount: 780000, date: "2026-10-10", description: "Pembelian barang", createdBy: "Admin" },
  { id: "f19", type: "keluar", category: "Transportasi", amount: 150000, date: "2026-10-10", description: "Ongkos pengiriman barang ke toko", createdBy: "Admin" },

  { id: "f20", type: "masuk", category: "Penjualan", amount: 1200000, date: "2026-10-11", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f21", type: "keluar", category: "Pembelian barang", amount: 1050000, date: "2026-10-11", description: "Pembelian barang", createdBy: "Admin" },

  { id: "f22", type: "masuk", category: "Penjualan", amount: 1000000, date: "2026-10-12", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f23", type: "keluar", category: "Pembelian barang", amount: 550000, date: "2026-10-12", description: "Pembelian barang", createdBy: "Admin" },
  { id: "f24", type: "keluar", category: "Sewa toko", amount: 500000, date: "2026-10-12", description: "Sewa toko", createdBy: "Admin" },

  // Week 3: 13-19 Okt
  { id: "f25", type: "masuk", category: "Penjualan", amount: 1200000, date: "2026-10-13", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f26", type: "keluar", category: "Pembelian barang", amount: 800000, date: "2026-10-13", description: "Pembelian barang", createdBy: "Admin" },
  { id: "f27", type: "keluar", category: "Biaya lainnya", amount: 430000, date: "2026-10-13", description: "Biaya lainnya", createdBy: "Admin" },

  { id: "f28", type: "masuk", category: "Penjualan", amount: 1300000, date: "2026-10-14", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f29", type: "keluar", category: "Pembelian barang", amount: 750000, date: "2026-10-14", description: "Pembelian barang", createdBy: "Admin" },

  { id: "f30", type: "masuk", category: "Penjualan", amount: 920000, date: "2026-10-15", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f31", type: "keluar", category: "Sewa toko", amount: 500000, date: "2026-10-15", description: "Sewa toko Oktober", createdBy: "Admin" },
  { id: "f32", type: "keluar", category: "Pembelian barang", amount: 785000, date: "2026-10-15", description: "PB-20261015-0003", createdBy: "Admin" },

  { id: "f33", type: "masuk", category: "Penjualan", amount: 1050000, date: "2026-10-16", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f34", type: "keluar", category: "Pembelian barang", amount: 300000, date: "2026-10-16", description: "Pembelian barang", createdBy: "Admin" },

  { id: "f35", type: "masuk", category: "Penjualan", amount: 760000, date: "2026-10-17", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f36", type: "keluar", category: "Transportasi", amount: 150000, date: "2026-10-17", description: "Ongkos pengiriman barang ke toko", createdBy: "Admin" },

  // Week 4: 20-22 Okt
  { id: "f37", type: "masuk", category: "Penjualan", amount: 1100000, date: "2026-10-18", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f38", type: "keluar", category: "Listrik & air", amount: 50000, date: "2026-10-18", description: "Tagihan listrik", createdBy: "Admin" },
  { id: "f39", type: "keluar", category: "Pembelian barang", amount: 2000000, date: "2026-10-18", description: "INV-BM-1015", createdBy: "Admin" },
  { id: "f40", type: "keluar", category: "Transportasi", amount: 50000, date: "2026-10-18", description: "Transportasi", createdBy: "Admin" },

  { id: "f41", type: "masuk", category: "Penjualan", amount: 980000, date: "2026-10-19", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f42", type: "keluar", category: "Pembelian barang", amount: 500000, date: "2026-10-19", description: "Pembelian barang", createdBy: "Admin" },

  { id: "f43", type: "masuk", category: "Pelunasan piutang", amount: 350000, date: "2026-10-20", description: "Pelunasan Pak Ahmad", createdBy: "Kasir01" },
  { id: "f44", type: "masuk", category: "Penjualan", amount: 1100000, date: "2026-10-20", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f45", type: "keluar", category: "Biaya lainnya", amount: 75000, date: "2026-10-20", description: "Beli plastik kresek", createdBy: "Admin" },

  { id: "f46", type: "masuk", category: "Penjualan", amount: 890000, date: "2026-10-21", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f47", type: "keluar", category: "Listrik & air", amount: 450000, date: "2026-10-21", description: "Tagihan listrik Oktober", createdBy: "Admin" },

  { id: "f48", type: "masuk", category: "Penjualan", amount: 1250000, date: "2026-10-22", description: "Penjualan harian", createdBy: "Kasir01" },
  { id: "f49", type: "keluar", category: "Pembelian barang", amount: 4500000, date: "2026-10-22", description: "INV-SJ-1016", createdBy: "Admin" },
  { id: "f50", type: "keluar", category: "Prive pemilik", amount: 500000, date: "2026-10-22", description: "Prive pemilik", createdBy: "Admin" },
];
