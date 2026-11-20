import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import AuthLayout from "../lib/components/layout/AuthLayout";
import { Card } from "../lib/components/ui";

// Password tidak direset lewat email. Administrator yang mengaturnya dari Daftar Karyawan.
export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      breadcrumb="Lupa password"
      headline={"Usaha tertata,\nhari lebih tenang."}
      description="Satu ruang untuk kasir, stok barang, transaksi, dan pelanggan toko Anda."
    >
      <Card className="w-full max-w-[420px] p-5 shadow-md">
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <KeyRound className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="text-xl font-bold text-neutral-900">Lupa password?</h2>
        <p className="mt-2 text-xs leading-relaxed text-neutral-500">
          Password diatur ulang oleh administrator toko, bukan lewat email.
        </p>

        <ol className="mt-4 list-decimal space-y-2 pl-4 text-xs leading-relaxed text-neutral-700">
          <li>Hubungi administrator toko dan sebutkan email akun Anda.</li>
          <li>
            Administrator membuka menu <span className="font-semibold">Daftar Karyawan</span>, klik{" "}
            <span className="font-semibold">Edit</span> pada akun Anda, lalu mengisi password baru.
          </li>
          <li>Masuk dengan password baru. Jika akun sempat terkunci, kuncinya otomatis terbuka.</li>
        </ol>

        <p className="mt-4 rounded-lg bg-neutral-50 px-3 py-2 text-[11px] leading-relaxed text-neutral-500">
          Anda administrator? Administrator lain yang mengatur ulang password Anda dengan cara yang sama. Kode 2FA Anda
          tidak berubah, jadi tetap siapkan aplikasi authenticator.
        </p>

        <Link to="/login" className="mt-5 block text-center text-xs font-semibold text-brand-700 hover:underline">
          Kembali ke Login
        </Link>
      </Card>
    </AuthLayout>
  );
}
