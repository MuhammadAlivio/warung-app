import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";
import { Button, Card, Checkbox, Input, PasswordInput } from "../../components/ui";
import { loginSchema } from "./schemas";

// TODO: ganti dengan panggilan API sungguhan
const fakeLogin = (values) => new Promise((resolve) => setTimeout(() => resolve(values), 800));

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const onSubmit = async (values) => {
    try {
      await fakeLogin(values);
      navigate("/"); // TODO: arahkan ke dashboard
    } catch {
      setError("root", { message: "Email atau password salah" });
    }
  };

  return (
    <AuthLayout
      breadcrumb="Login user"
      headline={"Usaha tertata,\nhari lebih tenang."}
      description="Satu ruang untuk kasir, stok barang, transaksi, dan pelanggan toko Anda."
    >
      <Card className="w-full max-w-[420px] p-5">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">Selamat datang kembali</h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            error={errors.email?.message}
            {...register("email")}
          />

          <div>
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              error={errors.password?.message}
              {...register("password")}
            />
            <Checkbox label="Ingat saya" className="mt-3" {...register("remember")} />
          </div>

          <Link to="/lupa-password" className="block text-xs font-semibold text-brand-700 hover:underline">
            Lupa password?
          </Link>

          {errors.root && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" loading={isSubmitting}>
            Masuk
          </Button>
        </form>

        <p className="mt-3 text-[11px] text-neutral-500">Masuk untuk melanjutkan aktivitas toko Anda.</p>
        <Link to="/register" className="mt-3 inline-block text-xs font-semibold text-brand-700 hover:underline">
          Belum punya akun? Daftar
        </Link>
      </Card>
    </AuthLayout>
  );
}
