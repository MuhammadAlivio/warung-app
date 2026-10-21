import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLoginPage from "./pages/LoginAdmin";
import ForgotPasswordPage from "./pages/LupaPassword";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import TwoFactorVerifyPage from "./pages/Verifikasi2FA";
import TwoFactorSetupWizard from "./pages/Setup2FA";
import { StockProvider } from "./lib/stores/StockContext";
import StockPage from "./pages/Stok";

export default function App() {
  return (
    <BrowserRouter>
      <StockProvider>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/lupa-password" element={<ForgotPasswordPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/2fa" element={<TwoFactorVerifyPage />} />
          <Route path="/admin/2fa/setup" element={<TwoFactorSetupWizard />} />

          {/* Stok Barang: tambah/edit/hapus berupa modal di halaman ini (TODO: bungkus dengan route guard auth) */}
          <Route path="/admin/stok" element={<StockPage />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </StockProvider>
    </BrowserRouter>
  );
}
