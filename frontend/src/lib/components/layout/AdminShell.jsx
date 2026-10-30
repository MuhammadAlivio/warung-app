import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { useStock } from "../../stores/StockContext";
import { getStockStatus } from "../../data/stockMockData";

/**
 * Pembungkus halaman admin: DashboardLayout + badge "Stok Barang" (jumlah barang menipis)
 * + kontainer lebar. Dipakai halaman Kasir, Riwayat Transaksi, Edit Transaksi, dan Daftar Pelanggan.
 */
export default function AdminShell({ breadcrumb, children }) {
  const navigate = useNavigate();
  const { products } = useStock();
  const lowCount = products.filter((p) => getStockStatus(p).key === "low").length;

  return (
    <DashboardLayout breadcrumb={breadcrumb} badges={{ stok: lowCount }} onLogout={() => navigate("/admin/login")}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </DashboardLayout>
  );
}
