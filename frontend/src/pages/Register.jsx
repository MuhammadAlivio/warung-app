import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import AuthLayout from "../lib/components/layout/AuthLayout";
import { Button, Card, Checkbox, Input, PasswordInput } from "../lib/components/ui";
import PasswordStrength from "../lib/components/auth/PasswordStrength";
import { registerSchema } from "../lib/schemas/auth";
import { api } from "../lib/api";

export default function RegisterPage() {
  const [done, setDone] = useState(false);
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
      await api("/api/register", {
        method: "POST",
        body: {
          name: values.fullName,
          email: values.email,
          password: values.password,
          password_confirmation: values.confirmPassword,
          terms: values.terms,
        },
      });
      setDone(true);
    } catch (err) {
      // Pesan validasi dari server (mis. email sudah terdaftar) tampil di bawah kolomnya
      const fieldMap = { name: "fullName", password_confirmation: "confirmPassword" };
      const fields = err.data?.errors;
      if (fields) {
        Object.entries(fields).forEach(([f, msgs]) => setError(fieldMap[f] ?? f, { message: msgs[0] }));
      } else {
        setError("root", { message: err.message });
      }
    }
  };

  return (
    <AuthLayout
      breadcrumb="Register user"
      headline={"Usaha tertata,\nhari lebih tenang."}
      description="Satu ruang untuk kasir, stok barang, transaksi, dan pelanggan toko Anda."
    >
      <Card className="w-full max-w-[440px] p-5 shadow-md">
        {done ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-brand-600" aria-hidden />
            <h2 className="mt-3 text-xl font-bold text-neutral-900">Pendaftaran berhasil</h2>
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">
              Akun Anda aktif setelah disetujui administrator. Hubungi pemilik toko, lalu masuk setelah akun diaktifkan.
            </p>
            <Link to="/login" className="mt-5 inline-block text-xs font-semibold text-brand-700 hover:underline">
              Kembali ke halaman masuk
            </Link>
          </div>
        ) : (
        <>
        <h2 className="text-xl font-bold text-neutral-900">Mulai bersama Warung</h2>
        <p className="mb-5 mt-1 text-xs text-neutral-500">Daftar sebagai karyawan toko. Akun aktif setelah disetujui admin.</p>

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
        </>
        )}
      </Card>
    </AuthLayout>
  );
}
