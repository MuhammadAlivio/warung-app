const p2 = (x) => String(x).padStart(2, "0");

export const formatAngka = (n = 0) => new Intl.NumberFormat("id-ID").format(Math.round(n));
// Format Rupiah memakai util milik proyek (lib/utils/format.js): "Rp68.000", negatif "-Rp68.000".
export { formatRupiah } from "./format";

/** Profil toko dari Pengaturan Profil Toko (localStorage "warung.storeProfile"); dipakai di struk & faktur. */
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

export const makeTrxNo = (seq = 42, d = new Date()) =>
  `TRX-${p2(d.getDate())}${p2(d.getMonth() + 1)}${String(d.getFullYear()).slice(2)}-${String(seq).padStart(3, "0")}`;

/** Cetak area `.print-receipt` (struk) atau `.print-invoice` (faktur A4). Tanpa pilihan ukuran kertas. */
export const printDoc = (type) => {
  document.body.dataset.print = type;
  const clear = () => {
    delete document.body.dataset.print;
    window.removeEventListener("afterprint", clear);
  };
  window.addEventListener("afterprint", clear);
  window.print();
};
