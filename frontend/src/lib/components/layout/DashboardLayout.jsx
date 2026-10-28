
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  BarChart3,
  ChevronDown,
  CircleUserRound,
  Info,
  LogOut,
  Package,
  PackagePlus,
  Receipt,
  ShoppingBasket,
  Sprout,
  User,
} from "lucide-react";
import { cn } from "../../utils/cn";

const NAV = [
  {
    id: "kasir",
    label: "Kasir / POS",
    icon: ShoppingBasket,
    to: "/admin/kasir",
  },
  {
    id: "stok",
    label: "Stok Barang",
    icon: Package,
    to: "/admin/stok",
  },
  {
    id: "pembelian",
    label: "Pembelian & Barang Masuk",
    icon: PackagePlus,
    to: "/admin/pembelian",
  },
  {
    id: "keuangan",
    label: "Keuangan",
    icon: BarChart3,
    to: "/admin/keuangan",
  },
  {
    id: "riwayat",
    label: "Riwayat Transaksi",
    icon: Receipt,
  },
  {
    id: "pelanggan",
    label: "Daftar Pelanggan",
    icon: User,
  },
];

const itemBase =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors";

function NavBadge({ children }) {
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
      {children}
    </span>
  );
}

export default function DashboardLayout({
  breadcrumb,
  badges = {},
  user = {
    name: "Dina Anggraini",
    role: "Pemilik toko",
  },
  onLogout,
  topbarActions,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Inisial untuk avatar pada dropdown.
  const initials = (user?.name || "Pengguna")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Nama pada tombol profil: nama depan + inisial nama belakang.
  // Contoh: Dina Anggraini -> Dina A.
  // Contoh: Muhammad Rifqi Nauval Nibroos -> Muhammad N.
  const nameParts = (user?.name || "Pengguna")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const displayName =
    nameParts.length > 1
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0].toUpperCase()}.`
      : nameParts[0] || "Pengguna";

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[210px] flex-col overflow-y-auto border-r border-neutral-200 bg-white px-3 py-5">
        {/* LOGO WARUNG */}
        <Link
          to="/admin/keuangan"
          className="mb-8 flex items-center gap-2.5 px-2"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sprout className="h-5 w-5" aria-hidden="true" />
          </span>

          <span className="text-xl font-semibold tracking-tight">
            warung
          </span>
        </Link>

        {/* MENU NAVIGASI */}
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Ruang kerja
        </p>

        <nav
          aria-label="Menu utama"
          className="flex-1 space-y-1"
        >
          {NAV.map(({ id, label, icon: Icon, to }) =>
            to ? (
              <NavLink
                key={id}
                to={to}
                className={({ isActive }) =>
                  cn(
                    itemBase,
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  )
                }
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />

                <span className="min-w-0 flex-1">
                  {label}
                </span>

                {badges[id] > 0 && (
                  <NavBadge>{badges[id]}</NavBadge>
                )}
              </NavLink>
            ) : (
              <button
                key={id}
                type="button"
                disabled
                title="Segera hadir"
                className={cn(
                  itemBase,
                  "cursor-not-allowed text-neutral-500"
                )}
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />

                <span className="min-w-0 flex-1">
                  {label}
                </span>
              </button>
            )
          )}
        </nav>
      </aside>

      {/* AREA KONTEN */}
      <div className="ml-[210px] flex min-h-screen min-w-0 flex-col">
        {/* TOPBAR */}
        <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 sm:px-6 lg:px-8">
          {/* BREADCRUMB */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-neutral-500">
              {breadcrumb || "Dashboard"}
            </p>
          </div>

          {/* AKSI DAN PROFIL DI KANAN */}
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {topbarActions && (
              <div className="flex shrink-0 items-center gap-1">
                {topbarActions}
              </div>
            )}

            {/* TOMBOL PROFIL */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setMenuOpen((value) => !value)
                }
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Menu profil pengguna"
                className={cn(
                  "flex h-[46px] items-center gap-2.5 rounded-full border px-4 sm:px-5",
                  "border-brand-600 bg-brand-600 text-white",
                  "transition-colors hover:border-brand-700 hover:bg-brand-700",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                )}
              >
                <CircleUserRound
                  className="h-6 w-6 shrink-0"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />

                {/* Nama singkat */}
                <span className="whitespace-nowrap text-sm font-semibold">
                  {displayName}
                </span>

                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    menuOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* DROPDOWN PROFIL */}
              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Tutup menu profil"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />

                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 text-neutral-900 shadow-lg"
                  >
                    {/* INFORMASI PENGGUNA */}
                    <div className="border-b border-neutral-100 px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                          {initials}
                        </span>

                        <div className="min-w-0">
                          {/* Nama lengkap tetap ditampilkan di dropdown */}
                          <p className="truncate text-sm font-semibold">
                            {user?.name || "Pengguna"}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-neutral-500">
                            {user?.role || "Pemilik toko"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* PENGATURAN PROFIL */}
                    <Link
                      to="/admin/pengaturan/profil-toko"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                    >
                      <Info
                        className="h-4 w-4"
                        aria-hidden="true"
                      />

                      Pengaturan profil toko
                    </Link>

                    {/* LOGOUT */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout?.();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut
                        className="h-4 w-4"
                        aria-hidden="true"
                      />

                      Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* KONTEN HALAMAN */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
