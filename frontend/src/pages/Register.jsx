import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../lib/components/layout/AuthLayout";
import { Button, Card, Checkbox, Input, PasswordInput } from "../lib/components/ui";
import PasswordStrength from "../lib/components/auth/PasswordStrength";
import { registerSchema } from "../lib/schemas/auth";

// TODO: ganti dengan panggilan API sungguhan
const fakeRegister = (values) => new Promise((resolve) => setTimeout(() => resolve(values), 1000));

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "", terms: false },
  });

  const password = watch("password");

  const onSubmit = async (values) => {
    try {
      await fakeRegister(values);
      navigate("/login");
    } catch {
      setError("root", { message: "Pendaftaran gagal. Coba lagi." });
    }
  };

  return (
    <AuthLayout
      breadcrumb="Register user"
      headline={"Usaha tertata,\nhari lebih tenang."}
      description="Satu ruang untuk kasir, stok barang, transaksi, dan pelanggan toko Anda."
    >
      <Card className="w-full max-w-[440px] p-5 shadow-md">
        <h2 className="text-xl font-bold text-neutral-900">Mulai bersama Warung</h2>
        <p className="mb-5 mt-1 text-xs text-neutral-500">Buat akun untuk ruang kerja toko Anda.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input
            label="Nama lengkap"
            autoComplete="name"
            placeholder="Masukkan nama lengkap"
            error={errors.fullName?.message}
            {...register("fullName")}
          />
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
              autoComplete="new-password"
              placeholder="••••••••••••"
              error={errors.password?.message}
              {...register("password")}
            />
            <PasswordStrength password={password} />
          </div>

          <PasswordInput
            label="Konfirmasi password"
            autoComplete="new-password"
            placeholder="Ulangi password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <Checkbox
            label="Saya setuju dengan Syarat & Ketentuan dan Kebijakan Privasi Warung."
            error={errors.terms?.message}
            {...register("terms")}
          />

          {errors.root && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" loading={isSubmitting}>
            Daftar
          </Button>
        </form>

        <Link to="/login" className="mt-5 block text-center text-xs font-semibold text-brand-700 hover:underline">
          Sudah punya akun? Masuk
        </Link>
      </Card>
    </AuthLayout>
  );
}
