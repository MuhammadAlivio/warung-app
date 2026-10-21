import { QRCodeSVG } from "qrcode.react";
import { Button } from "../../../components/ui";

export default function StepScanQr({ otpauthUri, onNext, onBack }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-neutral-900">Hubungkan authenticator</h2>
      <p className="mt-1 text-xs text-neutral-500">Pilih tambah akun di aplikasi, lalu pindai QR.</p>

      <div className="my-5 flex justify-center">
        <div className="rounded-lg border border-neutral-100 bg-white p-2">
          <QRCodeSVG value={otpauthUri} size={152} fgColor="#1f3a2d" level="M" aria-label="QR code untuk authenticator" />
        </div>
      </div>

      <div className="space-y-2">
        <Button onClick={onNext}>Lanjutkan ke verifikasi</Button>
        <Button variant="outline" onClick={onBack}>
          Kembali
        </Button>
      </div>
    </div>
  );
}
