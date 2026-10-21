import { ShieldCheck, Sprout } from "lucide-react";

/**
 * Layout 2 kolom untuk semua halaman auth.
 * Dipakai ulang oleh Login, Register, Lupa Password, Login Admin, 2FA, dll.
 *
 * Props:
 * - breadcrumb : string halaman aktif, mis. "Login user"
 * - headline   : string / node (boleh pakai <br />)
 * - description: teks di bawah headline
 * - adminBadge : tampilkan badge "Admin Panel" di topbar
 */
export default function AuthLayout({ breadcrumb, headline, description, adminBadge = false, children }) {
  return (
    <div className="flex min-h-screen bg-white text-neutral-900">
      {/* Panel kiri (branding) */}
      <aside className="hidden w-[34%] min-w-[340px] max-w-[440px] flex-col border-r border-neutral-100 bg-white px-10 py-9 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sprout className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-xl font-semibold tracking-tight">warung</span>
        </div>

        <div className="my-auto">
          <h1 className="whitespace-pre-line text-[32px] font-bold leading-tight tracking-tight text-brand-900">
            {headline}
          </h1>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-neutral-500">{description}</p>
        </div>

        <p className="text-xs text-neutral-500">warung · Ruang kerja untuk usaha Anda</p>
      </aside>

      {/* Panel kanan */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-neutral-100 bg-white px-6 sm:px-8">
          <nav aria-label="Breadcrumb" className="text-xs text-neutral-500">
            Warung <span className="mx-1.5">/</span>
            <span>{breadcrumb}</span>
          </nav>
          {adminBadge && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Admin Panel
            </span>
          )}
        </header>

        <main className="flex flex-1 items-center justify-center bg-neutral-100 px-4 py-10">
          {children}
        </main>

        <footer className="border-t border-neutral-100 bg-white py-4 text-center text-[11px] text-neutral-500">
          © {new Date().getFullYear()} Warung · Privasi &amp; ketentuan
        </footer>
      </div>
    </div>
  );
}
