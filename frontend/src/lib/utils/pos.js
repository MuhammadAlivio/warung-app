import { api } from "../api";

const p2 = (x) => String(x).padStart(2, "0");

export const formatAngka = (n = 0) => new Intl.NumberFormat("id-ID").format(Math.round(n));
// Format Rupiah memakai util milik proyek (lib/utils/format.js): "Rp68.000", negatif "-Rp68.000".
export { formatRupiah } from "./format";

/**
 * Profil toko dari Pengaturan Profil Toko; dipakai di struk & faktur.
 * Sumbernya database (/api/store-profile). Salinannya disimpan di localStorage "warung.storeProfile"
 * supaya getStoreProfile() tetap sinkron saat struk dirender; salinan diperbarui setiap login dan setiap admin menyimpan.
 */
const PROFILE_KEY = "warung.storeProfile";
const DEFAULT_PROFILE = { name: "U. D. Lestari", phone: "022-7301234", address: "Jl. KH. Mas Mansyur No.40, RT.002/RW.010,", logo: "" };
export function getStoreProfile() {
  let p = DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) p = { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    /* pakai profil bawaan */
  }
  return { name: p.name, address: p.address, addressShort: p.address, phone: p.phone ? `Telp. ${p.phone}` : "", logo: p.logo };
}

/** Profil dari API -> bentuk form/salinan lokal { name, phone, address, logo }. logo = URL gambar atau "". */
export const storeProfileFromApi = (d) => ({ name: d.name ?? "", phone: d.phone ?? "", address: d.address ?? "", logo: d.logo_url ?? "" });

export function cacheStoreProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* penyimpanan browser penuh/diblokir: struk memakai salinan lama atau profil bawaan */
  }
}

/** Ambil profil dari server lalu perbarui salinan lokal. */
export async function refreshStoreProfile() {
  const res = await api("/api/store-profile");
  const profile = storeProfileFromApi(res.data);
  cacheStoreProfile(profile);
  return profile;
}

/**
 * Simpan profil (khusus admin). logoFile opsional: tanpa file, logo lama dipertahankan.
 * removeLogo = true menghapus logo (diabaikan bila ada logoFile).
 */
export async function saveStoreProfile({ name, phone, address }, logoFile, removeLogo = false) {
  const form = new FormData();
  form.append("name", name ?? "");
  form.append("phone", phone ?? "");
  form.append("address", address ?? "");
  if (logoFile) form.append("logo", logoFile);
  else if (removeLogo) form.append("remove_logo", "1");
  const res = await api("/api/store-profile", { method: "POST", body: form });
  const profile = storeProfileFromApi(res.data);
  cacheStoreProfile(profile);
  return profile;
}

export const formatTanggal = (d = new Date(), long = false) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: long ? "long" : "short", year: "numeric" }).format(d);
export const formatJam = (d) => `${p2(d.getHours())}.${p2(d.getMinutes())}`;
export const formatTglJam = (d) =>
  `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${formatJam(d)}`;
export const toInputDate = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const isSameDay = (a, b) => toInputDate(a) === toInputDate(b);

const S = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
const t = (n) => {
  if (n < 12) return S[n];
  if (n < 20) return `${t(n - 10)} belas`;
  if (n < 100) return `${t(Math.floor(n / 10))} puluh${n % 10 ? " " + t(n % 10) : ""}`;
  if (n < 200) return `seratus${n > 100 ? " " + t(n - 100) : ""}`;
  if (n < 1e3) return `${t(Math.floor(n / 100))} ratus${n % 100 ? " " + t(n % 100) : ""}`;
  if (n < 2e3) return `seribu${n > 1e3 ? " " + t(n - 1e3) : ""}`;
  if (n < 1e6) return `${t(Math.floor(n / 1e3))} ribu${n % 1e3 ? " " + t(n % 1e3) : ""}`;
  if (n < 1e9) return `${t(Math.floor(n / 1e6))} juta${n % 1e6 ? " " + t(n % 1e6) : ""}`;
  return `${t(Math.floor(n / 1e9))} miliar${n % 1e9 ? " " + t(n % 1e9) : ""}`;
};
export const terbilang = (n) => {
  const v = Math.floor(Math.abs(n));
  const s = v === 0 ? "nol" : t(v);
  return `${s.charAt(0).toUpperCase()}${s.slice(1)} rupiah.`;
};

/** Ukuran kertas faktur (struk selalu thermal 58mm). Sama dengan Sale::INVOICE_SIZES di backend. */
export const INVOICE_SIZES = ["A4", "A5"];
const SIZE_KEY = "warung.invoiceSize";

/** Ukuran faktur terakhir yang dipilih di komputer ini (default A4). */
export const getInvoiceSize = () => {
  try {
    const v = localStorage.getItem(SIZE_KEY);
    return INVOICE_SIZES.includes(v) ? v : "A4";
  } catch {
    return "A4";
  }
};
export const setInvoiceSize = (v) => {
  try {
    localStorage.setItem(SIZE_KEY, v);
  } catch {
    /* penyimpanan browser tidak tersedia: pilihan hanya berlaku di halaman ini */
  }
};

/*
 * Ukuran kertas dipasang sebagai @page TANPA nama tepat sebelum mencetak. Named page
 * (`page: receipt` di CSS) diabaikan Chrome untuk elemen position:absolute seperti area
 * cetak ini, sehingga kertas jatuh ke ukuran bawaan printer (Letter/A4).
 */
const PAGE_RULES = {
  receipt: "@page { size: 58mm auto; margin: 0; }",
  A4: "@page { size: A4; margin: 12mm; }",
  A5: "@page { size: A5; margin: 8mm; }",
};

/**
 * Cetak area `.print-receipt` (struk 58mm) atau `.print-invoice` (faktur A4/A5).
 * type "none" tidak mencetak apa pun.
 */
export const printDoc = (type, size = "A4") => {
  if (!type || type === "none") return;
  const invoiceSize = INVOICE_SIZES.includes(size) ? size : "A4";
  document.body.dataset.print = type;
  document.body.dataset.printSize = invoiceSize;

  const style = document.createElement("style");
  style.dataset.printPage = "";
  style.textContent = PAGE_RULES[type === "invoice" ? invoiceSize : "receipt"];
  document.head.appendChild(style);

  const clear = () => {
    delete document.body.dataset.print;
    delete document.body.dataset.printSize;
    style.remove();
    window.removeEventListener("afterprint", clear);
  };
  window.addEventListener("afterprint", clear);
  window.print();
};
