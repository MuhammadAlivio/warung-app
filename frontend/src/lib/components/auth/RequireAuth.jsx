import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../stores/AuthContext";
import { homeFor } from "../../utils/auth";

// Penjaga halaman: belum login -> /login; peran tidak diizinkan -> halaman utama perannya.
export default function RequireAuth({ roles }) {
  const { user, loading } = useAuth();

  if (loading) return <p className="p-8 text-sm text-neutral-500">Memuat…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;

  return <Outlet />;
}
