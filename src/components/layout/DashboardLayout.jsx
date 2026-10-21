import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  ChevronDown,
  LogOut,
  Package,
  PackagePlus,
  Receipt,
  ShoppingBasket,
  Sprout,
  User,
} from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * `to` kosong = menu belum punya halaman (ditampilkan tapi belum bisa diklik).
 * `badge` diisi lewat prop `badges` berdasarkan `id`.
 */
const NAV = [
  { id: "kasir", label: "Kasir / POS", icon: ShoppingBasket },
  { id: "stok", label: "Stok Barang", icon: Package, to: "/admin/stok" },
  { id: "pembelian", label: "Pembelian & Barang Masuk", icon: PackagePlus },
  { id: "keuangan", label: "Keuangan", icon: BarChart3 },
  { id: "riwayat", label: "Riwayat Transaksi", icon: Receipt },
  { id: "pelanggan", label: "Daftar Pelanggan", icon: User },
];

const itemBase = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors";

function NavBadge({ children }) {
  return (
    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded bg-brand-100 px-1 text-[10px] font-semibold text-brand-700">
      {children}
    </span>
  );
}

/**
 * Layout halaman setelah login: sidebar "Ruang kerja", topbar breadcrumb, dan konten.
 * Props: breadcrumb (nama halaman aktif), badges ({ stok: 8 }), user ({ name, role, onLogout }).
 */
export default function DashboardLayout({
  breadcrumb,
  badges = {},
  user = { name: "Dina Anggraini", role: "Pemilik toko" },
  onLogout,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900">
      <aside className="hidden w-[210px] shrink-0 flex-col border-r border-neutral-100 bg-white px-3 py-5 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sprout className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-xl font-semibold tracking-tight">warung</span>
        </div>

        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Ruang kerja</p>
        <nav aria-label="Menu utama" className="flex-1 space-y-1">
          {NAV.map(({ id, label, icon: Icon, to }) =>
            to ? (
              <NavLink
                key={id}
                to={to}
                className={({ isActive }) =>
                  cn(itemBase, isActive ? "bg-brand-50 text-brand-700" : "text-neutral-600 hover:bg-neutral-50")
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
                {badges[id] > 0 && <NavBadge>{badges[id]}</NavBadge>}
              </NavLink>
            ) : (
              <button
                key={id}
                type="button"
                disabled
                title="Segera hadir"
                className={cn(itemBase, "cursor-not-allowed text-neutral-500")}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </button>
            )
          )}
        </nav>

        <div className="relative border-t border-neutral-100 pt-3">
          {menuOpen && (
            <div className="absolute inset-x-0 bottom-full mb-2 rounded-lg border border-neutral-100 bg-white p-1 shadow-md">
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                Keluar
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{user.name}</span>
              <span className="block truncate text-[10px] text-neutral-500">{user.role}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-neutral-100 bg-white px-6 sm:px-8">
          <nav aria-label="Breadcrumb" className="text-xs text-neutral-500">
            Ruang kerja <span className="mx-1.5">/</span>
            <span className="font-semibold text-neutral-900">{breadcrumb}</span>
          </nav>
        </header>

        <main className="flex-1 p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
