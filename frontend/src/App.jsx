import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./lib/components/auth/RequireAuth";
import { AuthProvider } from "./lib/stores/AuthContext";
import AdminLoginPage from "./pages/LoginAdmin";
import ForgotPasswordPage from "./pages/LupaPassword";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import TwoFactorVerifyPage from "./pages/Verifikasi2FA";
import TwoFactorSetupWizard from "./pages/Setup2FA";
import { StockProvider } from "./lib/stores/StockContext";
import { PurchaseProvider } from "./lib/stores/PurchaseContext";
import { FinanceProvider } from "./lib/stores/FinanceContext";
import { TransactionProvider } from "./lib/stores/TransactionContext";
import { CustomerProvider } from "./lib/stores/CustomerContext";
import StockPage from "./pages/Stok";
import Kasir from "./pages/Kasir";
import RiwayatTransaksi from "./pages/RiwayatTransaksi";
import EditTransaksi from "./pages/EditTransaksi";
import DaftarPelanggan from "./pages/DaftarPelanggan";
import PembelianBarangMasuk from "./pages/PembelianBarangMasuk";
import BuatPembelian from "./pages/BuatPembelian";
import DetailPembelian from "./pages/DetailPembelian";
import TerimaBarang from "./pages/TerimaBarang";
import KeuanganPage from "./pages/Keuangan";
import PengaturanProfilToko from "./pages/PengaturanProfilToko";
import DaftarKaryawan from "./pages/DaftarKaryawan";
import LogKaryawan from "./pages/LogKaryawan";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <StockProvider>
        <PurchaseProvider>
          <FinanceProvider>
            {/* Urutan penting: Transaction memakai Stock & Finance; Customer memakai Transaction */}
            <TransactionProvider>
              <CustomerProvider>
                <Routes>
                  {/* Auth */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/lupa-password" element={<ForgotPasswordPage />} />
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route path="/admin/2fa" element={<TwoFactorVerifyPage />} />
                  <Route path="/admin/2fa/setup" element={<TwoFactorSetupWizard />} />

                  {/* Admin & kasir (harus login) */}
                  <Route element={<RequireAuth />}>
                    {/* Stok Barang */}
                    <Route path="/stok" element={<StockPage />} />

                    {/* Kasir */}
                    <Route path="/kasir" element={<Kasir />} />

                    {/* Riwayat Transaksi */}
                    <Route path="/riwayat-transaksi" element={<RiwayatTransaksi />} />
                    <Route path="/riwayat-transaksi/:id/edit" element={<EditTransaksi />} />

                    {/* Daftar Pelanggan */}
                    <Route path="/pelanggan" element={<DaftarPelanggan />} />

                    {/* Daftar Karyawan: kasir hanya melihat; kelola akun khusus admin */}
                    <Route path="/karyawan" element={<DaftarKaryawan />} />
                  </Route>

                  {/* Khusus admin (matriks hak akses PRD) */}
                  <Route element={<RequireAuth roles={["admin"]} />}>
                    {/* Pembelian & Barang Masuk */}
                    <Route path="/pembelian" element={<PembelianBarangMasuk />} />
                    <Route path="/pembelian/buat" element={<BuatPembelian />} />
                    <Route path="/pembelian/:id" element={<DetailPembelian />} />
                    <Route path="/pembelian/:id/terima" element={<TerimaBarang />} />

                    {/* Keuangan */}
                    <Route path="/keuangan" element={<KeuanganPage />} />

                    {/* Log aktivitas */}
                    <Route path="/log-karyawan" element={<LogKaryawan />} />

                    {/* Pengaturan */}
                    <Route path="/pengaturan/profil-toko" element={<PengaturanProfilToko />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </CustomerProvider>
            </TransactionProvider>
          </FinanceProvider>
        </PurchaseProvider>
      </StockProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
