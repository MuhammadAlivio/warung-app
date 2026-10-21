import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout";
import { Button, Card, Input } from "../../components/ui";
import { forgotPasswordSchema } from "./schemas";

// TODO: ganti dengan panggilan API sungguhan
const fakeSendResetLink = (values) => new Promise((resolve) => setTimeout(() => resolve(values), 800));

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async ({ email }) => {
    try {
      await fakeSendResetLink({ email });
      setSentTo(email);
    } catch {
      setError("root", { message: "Gagal mengirim tautan. Coba lagi." });
    }
  };

  return (
    <AuthLayout
      breadcrumb="Lupa password"
      headline={"Usaha tertata,\nhari lebih tenang."}
      description="Satu ruang untuk kasir, stok barang, transaksi, dan pelanggan toko Anda."
    >
      <Card className="w-full max-w-[420px] p-5 shadow-md">
        {sentTo ? (
          <div className="py-2 text-center">
            <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <MailCheck className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-xl font-bold text-neutral-900">Cek email Anda</h2>
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">
              Jika <span className="font-semibold text-neutral-700">{sentTo}</span> terdaftar, tautan untuk mengatur
              ulang password sudah kami kirim.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-block text-xs font-semibold text-brand-700 hover:underline"
            >
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-neutral-900">Lupa Password</h2>
            <p className="mb-5 mt-1 text-xs leading-relaxed text-neutral-500">
              Masukkan email terdaftar Anda. Kami akan mengirimkan tautan untuk mengatur ulang password.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <Input
                label="Email terdaftar"
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                error={errors.email?.message}
                {...register("email")}
              />

              {errors.root && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {errors.root.message}
                </p>
              )}

              <Button type="submit" loading={isSubmitting}>
                Kirim Tautan Reset
              </Button>
            </form>

            <Link to="/login" className="mt-5 block text-center text-xs font-semibold text-brand-700 hover:underline">
              Kembali ke Login
            </Link>
          </>
        )}
      </Card>
    </AuthLayout>
  );
}
