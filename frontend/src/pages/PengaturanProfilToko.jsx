
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Info,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import DashboardLayout from "../lib/components/layout/DashboardLayout";
import { Button, Input, Textarea } from "../lib/components/ui";
import { cn } from "../lib/utils/cn";

const STORAGE_KEY = "warung.storeProfile";

const DEFAULT_PROFILE = {
  name: "U. D. Lestari",
  phone: "022-7301234",
  address: "Jl. KH. Mas Mansyur No.40, RT.002/RW.010,",
  logo: "",
};

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { ...DEFAULT_PROFILE };
    }

    return {
      ...DEFAULT_PROFILE,
      ...JSON.parse(raw),
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export default function PengaturanProfilToko() {
  const [profile, setProfile] = useState(loadProfile);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoError, setLogoError] = useState("");
  const fileRef = useRef(null);

  // Hilangkan notifikasi sukses setelah beberapa detik.
  useEffect(() => {
    if (!saved) return undefined;

    const timer = setTimeout(() => {
      setSaved(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [saved]);

  const setField = (key) => (event) => {
    setProfile((current) => ({
      ...current,
      [key]: event.target.value,
    }));

    setSaved(false);
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];

    // Izinkan memilih file yang sama kembali.
    event.target.value = "";

    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setLogoError("Format logo harus PNG atau JPG.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Ukuran logo maksimal 2 MB.");
      return;
    }

    setLogoError("");

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") return;

      setProfile((current) => ({
        ...current,
        logo: reader.result,
      }));

      setSaved(false);
    };

    reader.onerror = () => {
      setLogoError("Logo gagal dibaca. Silakan pilih file lain.");
    };

    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setProfile(loadProfile());
    setLogoError("");
    setSaved(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(profile)
      );

      setSaved(true);
    } catch {
      setLogoError(
        "Profil gagal disimpan. Coba gunakan logo dengan ukuran lebih kecil."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      breadcrumb="Pengaturan Profil Toko"
      topbarActions={
        <>
          <button
            type="button"
            aria-label="Notifikasi"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label="Pengaturan"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          >
            <SlidersHorizontal
              className="h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </>
      }
    >
      <div className="mx-auto w-full max-w-5xl">
        {/* Judul halaman */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Pengaturan Profil Toko
          </h1>

          <p className="mt-1 text-sm leading-relaxed text-neutral-500">
            Kelola identitas dan informasi toko yang ditampilkan
            pada struk pelanggan.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
        >
          {/* Header kartu */}
          <div className="border-b border-neutral-100 px-5 py-5 sm:px-6">
            <h2 className="text-base font-semibold text-neutral-900">
              Profil toko
            </h2>

            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              Pastikan informasi toko sudah benar agar pelanggan
              mudah mengenali dan menghubungi Anda.
            </p>
          </div>

          {/* Logo toko */}
          <div className="grid gap-5 border-b border-neutral-100 px-5 py-6 sm:grid-cols-[200px_minmax(0,1fr)] sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Logo Toko
              </h3>

              <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-neutral-500">
                Gunakan logo untuk memperkuat identitas toko Anda.
              </p>
            </div>

            <div className="flex min-w-0 flex-wrap items-start gap-4">
              {profile.logo ? (
                <img
                  src={profile.logo}
                  alt="Logo toko"
                  className="h-20 w-20 shrink-0 rounded-lg border border-neutral-200 bg-neutral-50 object-cover"
                />
              ) : (
                <div
                  aria-label="Logo toko saat ini"
                  className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 leading-none"
                >
                  <span className="text-xl font-bold text-brand-700">
                    UD
                  </span>

                  <span className="mt-1 text-[9px] font-semibold tracking-[0.15em] text-brand-600">
                    LESTARI
                  </span>
                </div>
              )}

              <div className="min-w-0">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Pilih file logo toko"
                  onChange={handleLogoChange}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  Ganti Logo
                </Button>

                <p className="mt-2 max-w-[320px] text-[11px] leading-relaxed text-neutral-500">
                  PNG atau JPG, maksimal 2 MB. Disarankan ukuran
                  400 × 400 piksel.
                </p>
              </div>
            </div>
          </div>

          {/* Informasi toko */}
          <div className="grid gap-5 px-5 py-6 sm:grid-cols-[200px_minmax(0,1fr)] sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Informasi toko
              </h3>

              <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-neutral-500">
                Nama, nomor telepon, dan alamat ini akan tercantum
                pada struk transaksi.
              </p>
            </div>

            <div className="min-w-0 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Nama Toko"
                  value={profile.name}
                  onChange={setField("name")}
                  placeholder="Nama toko"
                  autoComplete="organization"
                />

                <Input
                  label="Nomor Telepon"
                  value={profile.phone}
                  onChange={setField("phone")}
                  placeholder="Nomor telepon toko"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>

              <div>
                <Textarea
                  label="Alamat Lengkap"
                  rows={4}
                  value={profile.address}
                  onChange={setField("address")}
                  placeholder="Nama jalan, nomor bangunan, RT/RW, kota"
                />

                <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">
                  Cantumkan nama jalan, nomor bangunan, serta RT/RW
                  agar alamat mudah ditemukan.
                </p>
              </div>

              <p className="flex items-start gap-1.5 text-xs leading-relaxed text-neutral-500">
                <Info
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                Perubahan akan digunakan pada struk transaksi
                berikutnya.
              </p>
            </div>
          </div>

          {/* Footer aksi */}
          <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div aria-live="polite" className="min-h-5">
              {saved && (
                <p className="text-xs font-medium text-brand-700">
                  Perubahan profil toko berhasil disimpan.
                </p>
              )}

              {logoError && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {logoError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                fullWidth={false}
                className="h-10 px-5"
                onClick={handleReset}
                disabled={saving}
              >
                Batal
              </Button>

              <Button
                type="submit"
                size="sm"
                fullWidth={false}
                className={cn("h-10 px-5")}
                loading={saving}
                disabled={saving}
              >
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
