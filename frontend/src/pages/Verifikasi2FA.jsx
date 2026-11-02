import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Timer } from "lucide-react";
import AuthLayout from "../lib/components/layout/AuthLayout";
import { Button, Card, Input, OtpInput } from "../lib/components/ui";
import { formatCountdown, useTotpCountdown } from "../lib/hooks/useTotpCountdown";
import { ADMIN_AUTH_COPY } from "../lib/config/authCopy";
import { otpSchema } from "../lib/schemas/auth";
import { api } from "../lib/api";
import { homeFor } from "../lib/utils/auth";
import { useAuth } from "../lib/stores/AuthContext";

export default function TwoFactorVerifyPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const secondsLeft = useTotpCountdown(30);
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryError, setRecoveryError] = useState(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

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
      const res = await api("/api/2fa/verify", { method: "POST", body: values });
      setUser(res.user);
      navigate(homeFor(res.user));
    } catch (err) {
      setError("otp", { message: err.message });
      setValue("otp", "");
    }
  };

  const onSubmitRecovery = async (e) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoveryLoading(true);
    try {
      const res = await api("/api/2fa/verify", { method: "POST", body: { recovery_code: recoveryCode } });
      setUser(res.user);
      navigate(homeFor(res.user));
    } catch (err) {
      setRecoveryError(err.message);
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <AuthLayout breadcrumb="Verifikasi dua langkah" adminBadge {...ADMIN_AUTH_COPY}>
      <Card className="w-full max-w-[440px] p-5 shadow-md">
        <h2 className="text-xl font-bold text-neutral-900">Verifikasi dua langkah</h2>
        <p className="mb-5 mt-1 text-xs leading-relaxed text-neutral-500">
          Buka Google Authenticator atau aplikasi TOTP Anda, lalu masukkan kode untuk Warung.
        </p>

        {useRecovery ? (
          <form onSubmit={onSubmitRecovery} noValidate className="space-y-4">
            <Input
              label="Kode pemulihan"
              placeholder="xxxxx-xxxxx"
              autoComplete="off"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              error={recoveryError ?? undefined}
            />
            <Button type="submit" loading={recoveryLoading}>
              Verifikasi
            </Button>
          </form>
        ) : (
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
        )}

        <button
          type="button"
          onClick={() => setUseRecovery((v) => !v)}
          className="mt-4 block w-full text-center text-xs font-semibold text-brand-700 hover:underline"
        >
          {useRecovery ? "Pakai kode dari aplikasi authenticator" : "Pakai kode pemulihan"}
        </button>

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
