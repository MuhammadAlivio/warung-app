export const SUPPLIERS = [
  { id: "s1", name: "CV Sinar Jaya", phone: "081234567890", address: "Jl. Industri No. 5, Surabaya" },
  { id: "s2", name: "UD Berkah Makmur", phone: "087654321098", address: "Jl. Raya Malang No. 12" },
  { id: "s3", name: "PT Sentosa Pangan", phone: "089876543210", address: "Jl. Pasar Baru No. 8, Sidoarjo" },
];

export const LOCATIONS = [
  { value: "gudang_utama", label: "Gudang utama" },
  { value: "toko", label: "Toko" },
  { value: "gudang_b", label: "Gudang B" },
];

export const PAYMENT_METHODS = [
  { value: "transfer_bank", label: "Transfer bank" },
  { value: "tunai", label: "Tunai" },
  { value: "cek", label: "Cek / Giro" },
];

export function getPurchaseStatus(status) {
  const map = {
    belum_diterima: { key: "belum_diterima", label: "Belum diterima", variant: "warning" },
    diterima_sebagian: { key: "diterima_sebagian", label: "Diterima sebagian", variant: "info" },
    diterima: { key: "diterima", label: "Diterima semua", variant: "success" },
  };
  return map[status] || map.belum_diterima;
}

export function getPaymentStatus(saldo) {
  if (saldo <= 0) return { label: "Lunas", variant: "success" };
  return { label: "Sebagian", variant: "warning" };
}

export const INITIAL_PURCHASES = [
  {
    id: "pb1",
    purchaseNo: "INV-SJ-1016",
    supplierId: "s1",
    date: "2026-10-16",
    dueDate: "2026-10-23",
    location: "gudang_utama",
    status: "diterima_sebagian",
    paymentStatus: "sebagian",
    initialPayment: 300000,
    initialPaymentDate: "2026-10-16",
    paymentMethod: "transfer_bank",
    additionalCost: 0,
    items: [
      {
        id: "pi1",
        productId: "p5",
        productName: "Minyak Goreng Sania 1 L",
        sku: "BRG-002",
        unit: "pcs",
        qty: 48,
        qtyReceived: 24,
        buyPrice: 17500,
      },
    ],
    receptions: [
      {
        id: "rec1",
        receptionNo: "BM-018",
        date: "2026-10-16",
        time: "09:15",
        receivedBy: "Dina",
        items: [{ productId: "p5", productName: "Minyak Goreng Sania 1 L", qty: 24 }],
        notes: "Barang diterima dalam kondisi baik. Sisa 24 pcs dikirim pada 19 Oktober 2026.",
      },
    ],
    estimatedNextDelivery: "2026-10-19",
    notes: "Pengiriman bertahap. Konfirmasi jumlah barang saat tiba di gudang.",
    createdBy: "Dina Anggraini",
    createdAt: "2026-10-16 08:45",
  },
  {
    id: "pb2",
    purchaseNo: "INV-BM-1015",
    supplierId: "s2",
    date: "2026-10-15",
    dueDate: "2026-10-22",
    location: "gudang_utama",
    status: "diterima",
    paymentStatus: "lunas",
    initialPayment: 3400000,
    initialPaymentDate: "2026-10-15",
    paymentMethod: "transfer_bank",
    additionalCost: 0,
    items: [
      {
        id: "pi3",
        productId: "p2",
        productName: "Beras Medium 5 Kg",
        sku: "BRG-005",
        unit: "karung",
        qty: 50,
        qtyReceived: 50,
        buyPrice: 68000,
      },
    ],
    receptions: [
      {
        id: "rec2",
        receptionNo: "BM-017",
        date: "2026-10-15",
        time: "10:00",
        receivedBy: "Dina",
        items: [{ productId: "p2", productName: "Beras Medium 5 Kg", qty: 50 }],
        notes: "Semua barang diterima lengkap.",
      },
    ],
    notes: "Sudah lengkap",
    createdBy: "Dina Anggraini",
    createdAt: "2026-10-15 09:00",
  },
  {
    id: "pb3",
    purchaseNo: "INV-SP-1014",
    supplierId: "s3",
    date: "2026-10-14",
    dueDate: "2026-10-21",
    location: "toko",
    status: "belum_diterima",
    paymentStatus: "sebagian",
    initialPayment: 120000,
    initialPaymentDate: "2026-10-14",
    paymentMethod: "tunai",
    additionalCost: 0,
    items: [
      {
        id: "pi5",
        productId: "p4",
        productName: "Mie Goreng Instan",
        sku: "BRG-008",
        unit: "karton",
        qty: 30,
        qtyReceived: 0,
        buyPrice: 37600,
      },
    ],
    receptions: [],
    notes: "",
    createdBy: "Dina Anggraini",
    createdAt: "2026-10-14 08:00",
  },
];
