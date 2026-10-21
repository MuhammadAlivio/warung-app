import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Timer } from "lucide-react";
import { Button, OtpInput } from "../ui";
import { formatCountdown, useTotpCountdown } from "../../hooks/useTotpCountdown";
import { otpSchema } from "../../schemas/auth";

// TODO: ganti dengan panggilan API. Kode "000000" ditolak untuk demo state error.
const fakeActivate2fa = ({ otp }) =>
  new Promise((resolve, reject) => setTimeout(() => (otp === "000000" ? reject(new Error("invalid")) : resolve()), 800));

export default function StepVerifyCode({ onBack, onSuccess }) {
  const secondsLeft = useTotpCountdown(30);
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } });

  const onSubmit = async (values) => {
    try {
      await fakeActivate2fa(values);
      onSuccess();
    } catch {
      setError("otp", { message: "Kode salah atau kedaluwarsa. Coba lagi." });
      setValue("otp", "");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2 className="text-lg font-bold text-neutral-900">Konfirmasi authenticator</h2>
      <p className="mb-5 mt-1 text-xs leading-relaxed text-neutral-500">
        Masukkan kode dari akun Warung yang baru ditambahkan di aplikasi.
      </p>

      <Controller
        name="otp"
        control={control}
        render={({ field }) => (
          <OtpInput
            label="Kode autentikasi 6 digit"
            value={field.value}
            onChange={field.onChange}
            error={errors.otp?.message}
            disabled={isSubmitting}
          />
        )}
      />

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-neutral-500">
        <Timer className="h-3 w-3" aria-hidden />
        Kode berganti dalam {formatCountdown(secondsLeft)}
      </p>

      <p className="mt-3 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-[11px] leading-relaxed text-brand-700">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Setelah kode terverifikasi, simpan kode pemulihan sebelum masuk ke dashboard.
      </p>

      <div className="mt-4 space-y-2">
        <Button type="submit" loading={isSubmitting}>
          Aktifkan 2FA
        </Button>
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Kembali ke scan QR
        </Button>
      </div>
    </form>
  );
}
