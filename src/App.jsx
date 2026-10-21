import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLoginPage from "./features/auth/AdminLoginPage";
import ForgotPasswordPage from "./features/auth/ForgotPasswordPage";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import TwoFactorVerifyPage from "./features/auth/TwoFactorVerifyPage";
import TwoFactorSetupWizard from "./features/auth/two-factor-setup/TwoFactorSetupWizard";
import { StockProvider } from "./features/stock/StockContext";
import StockPage from "./features/stock/StockPage";

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
