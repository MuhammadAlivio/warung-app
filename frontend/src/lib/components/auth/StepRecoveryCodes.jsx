import { Info } from "lucide-react";
import { Button } from "../ui";

export default function StepRecoveryCodes({ codes, onDone }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-neutral-900">Simpan kode pemulihan</h2>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
        Pakai salah satu kode ini jika HP Anda hilang. Tiap kode hanya berlaku sekali.
      </p>

      <ul className="my-5 grid grid-cols-2 gap-2 rounded-lg border border-neutral-100 bg-neutral-50 p-3 font-mono text-sm text-neutral-900">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>

      <p className="mb-4 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-[11px] leading-relaxed text-brand-700">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Kode ini tidak akan ditampilkan lagi. Salin atau catat sekarang.
      </p>

      <Button onClick={onDone}>Saya sudah menyimpan, lanjut</Button>
    </div>
  );
}
