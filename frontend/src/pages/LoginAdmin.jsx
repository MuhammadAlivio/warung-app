import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import AuthLayout from "../lib/components/layout/AuthLayout";
import { Badge, Button, Card, Input, PasswordInput } from "../lib/components/ui";
import { ADMIN_AUTH_COPY } from "../lib/config/authCopy";
import { adminLoginSchema } from "../lib/schemas/auth";
import { api } from "../lib/api";
import { homeFor } from "../lib/utils/auth";
import { useAuth } from "../lib/stores/AuthContext";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values) => {
    try {
      const res = await api("/api/login", { method: "POST", body: { ...values, admin_only: true } });
      if (res.needs_2fa) navigate(res.needs_setup ? "/admin/2fa/setup" : "/admin/2fa"); // 2FA wajib setelah password benar
      else {
        setUser(res.user);
        navigate(homeFor(res.user));
      }
    } catch (err) {
      setError("root", { message: err.message });
    }
  };

  return (
    <AuthLayout breadcrumb="Login admin" adminBadge {...ADMIN_AUTH_COPY}>
      <Card className="w-full max-w-[420px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Masuk sebagai admin</h2>
          <Badge>
            <Check className="h-3 w-3" aria-hidden />
            Admin Panel
          </Badge>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="username"
            placeholder="admin@contoh.id"
            error={errors.email?.message}
            {...register("email")}
          />
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            placeholder="••••••••••••"
            error={errors.password?.message}
            {...register("password")}
          />

          <Link to="/lupa-password" className="block text-xs font-semibold text-brand-700 hover:underline">
            Lupa password?
          </Link>

          {errors.root && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" loading={isSubmitting}>
            Masuk sebagai admin
          </Button>
        </form>

        <p className="mt-3 text-[11px] text-neutral-500">
          Khusus administrator. Verifikasi 2FA wajib setelah password.
        </p>
        <Link to="/login" className="mt-3 inline-block text-xs font-semibold text-brand-700 hover:underline">
          Bukan admin? Masuk sebagai karyawan
        </Link>
      </Card>
    </AuthLayout>
  );
}
