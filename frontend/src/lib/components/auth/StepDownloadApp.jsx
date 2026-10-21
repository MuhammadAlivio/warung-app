import { Smartphone } from "lucide-react";
import { Button } from "../ui";

const STORE_LINKS = {
  appStore: "https://apps.apple.com/app/google-authenticator/id388497605",
  googlePlay: "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2",
};

export default function StepDownloadApp({ onNext }) {
  return (
    <div>
      <h2 className="text-base font-bold text-neutral-900">Unduh aplikasi authenticator</h2>
      <p className="mt-0.5 text-[11px] text-neutral-500">Langkah 1 dari 3</p>

      <div className="mt-4 flex items-center gap-3 rounded-lg bg-neutral-50 px-4 py-3">
        <Smartphone className="h-6 w-6 text-brand-700" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-neutral-900">Google Authenticator</p>
          <p className="text-[11px] text-neutral-500">Atau aplikasi TOTP lain</p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-neutral-500">
        Unduh aplikasi di ponsel Anda. Setelah terpasang, lanjutkan untuk menghubungkannya dengan akun Warung.
      </p>

      <div className="mt-4 space-y-2">
        <a
          href={STORE_LINKS.appStore}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 w-full items-center justify-center rounded-lg border border-neutral-200 bg-white text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-50"
        >
          Buka App Store
        </a>
        <a
          href={STORE_LINKS.googlePlay}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 w-full items-center justify-center rounded-lg border border-neutral-200 bg-white text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-50"
        >
          Buka Google Play
        </a>
      </div>

      <Button className="mt-4" onClick={onNext}>
        Aplikasi sudah terpasang
      </Button>
      <p className="mt-3 text-[11px] text-neutral-500">2FA wajib untuk admin. Langkah ini tidak dapat dilewati.</p>
    </div>
  );
}
