import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Timer } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout";
import { Button, Card, OtpInput } from "../../components/ui";
import { formatCountdown, useTotpCountdown } from "../../hooks/useTotpCountdown";
import { ADMIN_AUTH_COPY } from "./constants";
import { otpSchema } from "./schemas";

// TODO: ganti dengan panggilan API sungguhan. Di sini kode "000000" ditolak untuk demo state error.
const fakeVerifyOtp = ({ otp }) =>
  new Promise((resolve, reject) => setTimeout(() => (otp === "000000" ? reject(new Error("invalid")) : resolve()), 800));

export default function TwoFactorVerifyPage() {
  const navigate = useNavigate();
  const secondsLeft = useTotpCountdown(30);

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const onSubmit = async (values) => {
    try {
      await fakeVerifyOtp(values);
      navigate("/admin"); // TODO: dashboard admin
    } catch {
      setError("otp", { message: "Kode salah atau kedaluwarsa. Coba lagi." });
      setValue("otp", "");
    }
  };

  return (
    <AuthLayout breadcrumb="Verifikasi dua langkah" adminBadge {...ADMIN_AUTH_COPY}>
      <Card className="w-full max-w-[440px] p-5 shadow-md">
        <h2 className="text-xl font-bold text-neutral-900">Verifikasi dua langkah</h2>
        <p className="mb-5 mt-1 text-xs leading-relaxed text-neutral-500">
          Buka Google Authenticator atau aplikasi TOTP Anda, lalu masukkan kode untuk Warung.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Controller
            name="otp"
            control={control}
            render={({ field }) => (
              <OtpInput
                label="Kode autentikasi 6 digit"
                value={field.value}
                onChange={field.onChange}
                onComplete={() => handleSubmit(onSubmit)()}
                error={errors.otp?.message}
                disabled={isSubmitting}
              />
            )}
          />

          <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
            <Timer className="h-3 w-3" aria-hidden />
            Kode berganti dalam {formatCountdown(secondsLeft)}
          </p>

          <Button type="submit" loading={isSubmitting}>
            Verifikasi
          </Button>
        </form>

        <Link
          to="/admin/login"
          className="mt-5 block text-center text-xs font-semibold text-brand-700 hover:underline"
        >
          Kembali ke login admin
        </Link>
      </Card>
    </AuthLayout>
  );
}
