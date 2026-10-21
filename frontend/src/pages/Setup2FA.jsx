import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../lib/components/layout/AuthLayout";
import { Card, Stepper } from "../lib/components/ui";
import { ADMIN_AUTH_COPY } from "../lib/config/authCopy";
import StepDownloadApp from "../lib/components/auth/StepDownloadApp";
import StepScanQr from "../lib/components/auth/StepScanQr";
import StepVerifyCode from "../lib/components/auth/StepVerifyCode";

const STEPS = ["Aplikasi", "Scan QR", "Verifikasi"];

// TODO: secret & otpauth URI seharusnya dibuat server (mis. POST /2fa/setup)
const MOCK_OTPAUTH = "otpauth://totp/Warung:admin@contoh.id?secret=JBSWY3DPEHPK3PXP&issuer=Warung";

export default function TwoFactorSetupWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  return (
    <AuthLayout breadcrumb="Setup keamanan" adminBadge {...ADMIN_AUTH_COPY}>
      <Card className="w-full max-w-[440px] p-5 shadow-md">
        <Stepper steps={STEPS} current={step} className="mb-5" />

        {step === 1 && <StepDownloadApp onNext={() => setStep(2)} />}
        {step === 2 && (
          <StepScanQr otpauthUri={MOCK_OTPAUTH} onNext={() => setStep(3)} onBack={() => setStep(1)} />
        )}
        {step === 3 && (
          <StepVerifyCode onBack={() => setStep(2)} onSuccess={() => navigate("/admin/stok")} />
        )}
      </Card>
    </AuthLayout>
  );
}
