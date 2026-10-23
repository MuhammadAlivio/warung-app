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
import StockPage from "./pages/Stok";
import Kasir from "./pages/Kasir";
import PembelianBarangMasuk from "./pages/PembelianBarangMasuk";
import BuatPembelian from "./pages/BuatPembelian";
import DetailPembelian from "./pages/DetailPembelian";
import KeuanganPage from "./pages/Keuangan";

export default function App() {
  return (
    <BrowserRouter>
      <StockProvider>
        <PurchaseProvider>
          <FinanceProvider>
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

              {/* Pembelian & Barang Masuk */}
              <Route path="/admin/pembelian" element={<PembelianBarangMasuk />} />
              <Route path="/admin/pembelian/buat" element={<BuatPembelian />} />
              <Route path="/admin/pembelian/:id" element={<DetailPembelian />} />

              {/* Keuangan */}
              <Route path="/admin/keuangan" element={<KeuanganPage />} />

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </FinanceProvider>
        </PurchaseProvider>
      </StockProvider>
    </BrowserRouter>
  );
}
