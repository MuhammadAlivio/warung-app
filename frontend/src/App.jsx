import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import KeuanganPage from "./pages/Keuangan";
import PengaturanProfilToko from "./pages/PengaturanProfilToko";

export default function App() {
  return (
    <BrowserRouter>
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

                  {/* Stok Barang */}
                  <Route path="/admin/stok" element={<StockPage />} />

                  {/* Kasir */}
                  <Route path="/admin/kasir" element={<Kasir />} />

                  {/* Riwayat Transaksi */}
                  <Route path="/admin/riwayat-transaksi" element={<RiwayatTransaksi />} />
                  <Route path="/admin/riwayat-transaksi/:id/edit" element={<EditTransaksi />} />

                  {/* Daftar Pelanggan */}
                  <Route path="/admin/pelanggan" element={<DaftarPelanggan />} />

                  {/* Pembelian & Barang Masuk */}
                  <Route path="/admin/pembelian" element={<PembelianBarangMasuk />} />
                  <Route path="/admin/pembelian/buat" element={<BuatPembelian />} />
                  <Route path="/admin/pembelian/:id" element={<DetailPembelian />} />

                  {/* Keuangan */}
                  <Route path="/admin/keuangan" element={<KeuanganPage />} />

                  {/* Pengaturan */}
                  <Route path="/admin/pengaturan/profil-toko" element={<PengaturanProfilToko />} />

                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </CustomerProvider>
            </TransactionProvider>
          </FinanceProvider>
        </PurchaseProvider>
      </StockProvider>
    </BrowserRouter>
  );
}
