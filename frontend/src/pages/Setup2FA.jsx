import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../lib/components/layout/AuthLayout";
import { Card, Stepper } from "../lib/components/ui";
import { ADMIN_AUTH_COPY } from "../lib/config/authCopy";
import StepDownloadApp from "../lib/components/auth/StepDownloadApp";
import StepScanQr from "../lib/components/auth/StepScanQr";
import StepVerifyCode from "../lib/components/auth/StepVerifyCode";
import StepRecoveryCodes from "../lib/components/auth/StepRecoveryCodes";
import { api } from "../lib/api";
import { homeFor } from "../lib/utils/auth";
import { useAuth } from "../lib/stores/AuthContext";

const STEPS = ["Aplikasi", "Scan QR", "Verifikasi"];

export default function TwoFactorSetupWizard() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [step, setStep] = useState(1);
  const [otpauthUri, setOtpauthUri] = useState(null);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null); // { user, recovery_codes } setelah 2FA aktif
  const requested = useRef(false); // secret baru dibuat tiap panggilan, jadi cukup sekali (StrictMode)

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    api("/api/2fa/setup", { method: "POST" })
      .then((res) => setOtpauthUri(res.otpauth_uri))
      .catch((err) => {
        if (err.status === 401) navigate("/admin/login"); // belum lolos password
        else if (err.status === 409) navigate("/admin/2fa"); // 2FA sudah aktif
        else setError(err.message);
      });
  }, [navigate]);

  return (
    <AuthLayout breadcrumb="Setup keamanan" adminBadge {...ADMIN_AUTH_COPY}>
      <Card className="w-full max-w-[440px] p-5 shadow-md">
        {done ? (
          <StepRecoveryCodes codes={done.recovery_codes} onDone={() => {
              setUser(done.user);
              navigate(homeFor(done.user));
            }} />
        ) : error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        ) : !otpauthUri ? (
          <p className="text-xs text-neutral-500">Menyiapkan kode QR…</p>
        ) : (
          <>
            <Stepper steps={STEPS} current={step} className="mb-5" />

            {step === 1 && <StepDownloadApp onNext={() => setStep(2)} />}
            {step === 2 && (
              <StepScanQr otpauthUri={otpauthUri} onNext={() => setStep(3)} onBack={() => setStep(1)} />
            )}
            {step === 3 && <StepVerifyCode onBack={() => setStep(2)} onSuccess={setDone} />}
          </>
        )}
      </Card>
    </AuthLayout>
  );
}
