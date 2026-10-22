# design.md — Panduan Desain U.D. Lestari

Satu acuan untuk UI/UX dan Front-end. Kalau ada yang belum diatur di sini, tanyakan dulu ke UI/UX, jangan bikin gaya sendiri. Kalau aturan berubah, update file ini dulu baru kodenya.

Stack: **React + Tailwind CSS**. Ikon: **lucide-react**. Font: **Inter** (Google Fonts).

---

## 1. Prinsip

1. **Cepat dipakai kasir.** Layar kasir harus bisa dioperasikan hampir tanpa mouse. Target tap/klik besar, sedikit langkah, keyboard-friendly.
2. **Angka harus gampang dibaca.** Uang selalu rata kanan, tabular, format Rupiah yang konsisten.
3. **Status jelas sekilas.** Lunas, Belum Lunas, Habis, Menipis selalu pakai badge dengan warna + teks (jangan warna saja).
4. **Tenang dan rapi.** Latar terang netral, satu warna utama, aksen seperlunya. Tidak ada gradien ramai atau bayangan tebal.
5. **Konsisten.** Komponen yang sama dipakai di semua halaman. Jangan bikin tombol/tabel versi baru per halaman.

---

## 2. Warna

Warna utama hijau (nuansa "Lestari", cocok untuk toko pakan). Semua warna dipakai lewat token, **jangan hardcode hex di komponen**.

### Token

| Token | Hex | Pemakaian |
|---|---|---|
| `primary-50` | `#ECFDF5` | Latar item aktif sidebar, highlight halus |
| `primary-100` | `#D1FAE5` | Hover baris terpilih |
| `primary-500` | `#10B981` | Ikon aksen, progress |
| `primary-600` | `#059669` | **Tombol utama**, link, fokus |
| `primary-700` | `#047857` | Hover tombol utama |
| `primary-800` | `#065F46` | Pressed / teks di atas primary-50 |
| `neutral-0` | `#FFFFFF` | Kartu, panel, input |
| `neutral-50` | `#F8FAFC` | **Latar halaman** |
| `neutral-100` | `#F1F5F9` | Header tabel, latar sekunder |
| `neutral-200` | `#E2E8F0` | Border default |
| `neutral-300` | `#CBD5E1` | Border input |
| `neutral-400` | `#94A3B8` | Placeholder, ikon nonaktif |
| `neutral-500` | `#64748B` | Teks sekunder / label |
| `neutral-700` | `#334155` | Teks body |
| `neutral-900` | `#0F172A` | Judul, angka penting |
| `success-50` / `success-600` | `#F0FDF4` / `#16A34A` | Lunas, Tersedia, sukses |
| `warning-50` / `warning-600` | `#FFFBEB` / `#D97706` | Belum Lunas, Menipis |
| `danger-50` / `danger-600` | `#FEF2F2` / `#DC2626` | Habis, error, hapus, Batal |
| `info-50` / `info-600` | `#EFF6FF` / `#2563EB` | Info, chatbot |

### Aturan
- Satu tombol primary per area/aksi utama. Sisanya secondary atau ghost.
- Merah hanya untuk error dan aksi destruktif.
- Kontras teks minimal 4.5:1. Jangan pakai `neutral-400` untuk teks yang harus dibaca.
- Dark mode: **tidak** di versi 1. Token tetap dipakai supaya bisa ditambahkan nanti.

---

## 3. Tipografi

Font: `Inter`, fallback `system-ui, sans-serif`. Angka pakai `font-variant-numeric: tabular-nums` (`tabular-nums` di Tailwind) di tabel, total, dan struk.

| Gaya | Ukuran / line-height | Weight | Pemakaian |
|---|---|---|---|
| `display` | 30 / 36 | 700 | Total belanja di kasir, angka KPI dashboard |
| `h1` | 24 / 32 | 600 | Judul halaman |
| `h2` | 18 / 28 | 600 | Judul kartu/section |
| `h3` | 16 / 24 | 600 | Sub-section, judul modal |
| `body` | 14 / 20 | 400 | Teks umum, isi tabel |
| `body-strong` | 14 / 20 | 500 | Label penting, nama item |
| `small` | 12 / 16 | 400–500 | Caption, helper text, badge |

Aturan: maksimal 3 ukuran teks dalam satu kartu. Judul halaman pakai sentence case ("Riwayat transaksi", bukan "RIWAYAT TRANSAKSI").

---

## 4. Spacing, Radius, Bayangan

**Skala spasi 4px:** 4, 8, 12, 16, 20, 24, 32, 40, 48. Jangan pakai nilai di luar skala (misal 13px, 18px).

| Pemakaian | Nilai |
|---|---|
| Padding dalam kartu | 20–24px (`p-5`/`p-6`) |
| Jarak antar kartu / section | 24px (`gap-6`) |
| Jarak label → input | 6–8px |
| Jarak antar field form | 16px |
| Padding halaman | 24px desktop, 16px tablet |

**Radius:**
| Token | Nilai | Pemakaian |
|---|---|---|
| `rounded-md` | 6px | Badge, checkbox |
| `rounded-lg` | 8px | Tombol, input, select |
| `rounded-xl` | 12px | Kartu, modal, panel chatbot |
| `rounded-full` | — | Avatar, badge pill opsional |

**Bayangan:** kartu cukup `border border-neutral-200` tanpa bayangan. `shadow-sm` untuk dropdown/popover, `shadow-lg` hanya untuk modal dan panel chatbot.

---

## 5. Layout

### Struktur aplikasi
```
┌───────────────────────────────────────────────────────────┐
│ Sidebar (240px)  │ Topbar (64px): judul halaman · user ▾  │
│                  ├────────────────────────────────────────┤
│ Logo             │                                        │
│ Kasir            │  Konten halaman                        │
│ Riwayat          │  max-width 1280px, padding 24px        │
│ Barang & Stok    │                                        │
│ Pembelian*       │                                        │
│ Pelanggan        │                                        │
│ Supplier*        │                                        │
│ Keuangan*        │                                        │
│ Pengguna*        │                                  [💬]  │
└───────────────────────────────────────────────────────────┘
* hanya tampil untuk Admin
```
- Sidebar putih, border kanan `neutral-200`. Item aktif: latar `primary-50`, teks & ikon `primary-700`, garis kiri 3px `primary-600`.
- Sidebar bisa di-collapse jadi 72px (ikon saja) — default collapse di layar < 1280px.
- Menu yang tidak boleh diakses peran tertentu **disembunyikan**, bukan di-disable.
- Tombol chatbot melayang di kanan bawah, semua halaman.

### Layout halaman kasir (khusus)
```
┌──────────────────────────────────┬──────────────────────────┐
│ [🔍 Cari barang / scan kode...]  │ Pelanggan: [Pilih ▾] [+] │
│                                  ├──────────────────────────┤
│ Grid/daftar barang               │ Keranjang                │
│ (nama, harga, sisa stok)         │  item · qty [-][+] · Rp  │
│                                  │  ...                     │
│                                  ├──────────────────────────┤
│                                  │ Subtotal        Rp x     │
│                                  │ Diskon          Rp x     │
│                                  │ TOTAL      Rp 1.250.000  │
│                                  │ [ Bayar (F9) ]           │
└──────────────────────────────────┴──────────────────────────┘
          kiri ~60%                         kanan ~40%
```
- Sidebar otomatis collapse di halaman kasir supaya area kerja lega.
- Search bar auto-focus saat halaman dibuka.
- Total pakai gaya `display`, warna `neutral-900`.

### Grid & breakpoint
| Breakpoint | Lebar | Perilaku |
|---|---|---|
| `md` | ≥ 768px | Tablet: sidebar jadi drawer, kasir jadi 2 tab (Barang / Keranjang) |
| `lg` | ≥ 1024px | Sidebar collapse (ikon) |
| `xl` | ≥ 1280px | Layout penuh |

Target utama desktop 1366×768 (laptop kasir umum).

---

## 6. Komponen

Simpan di `src/components/ui/`. Semua halaman wajib pakai komponen ini.

### Button
| Varian | Gaya | Pemakaian |
|---|---|---|
| `primary` | bg `primary-600`, teks putih, hover `primary-700` | Aksi utama: Simpan, Bayar, Masuk |
| `secondary` | bg putih, border `neutral-300`, teks `neutral-700`, hover `neutral-50` | Batal, Kembali, Ekspor |
| `ghost` | tanpa border, teks `neutral-600`, hover `neutral-100` | Aksi di tabel, ikon |
| `danger` | bg `danger-600`, teks putih | Hapus, Void |

Ukuran: `sm` 32px, `md` 40px (default), `lg` 48px (tombol Bayar & aksi kasir).
State: `disabled` opacity 50% + `cursor-not-allowed`; `loading` tampilkan spinner dan disable klik (cegah transaksi dobel).
Label pakai kata kerja: "Simpan barang", bukan "OK".

### Input, Select, Textarea
- Tinggi 40px, border `neutral-300`, radius 8px, padding x 12px.
- Fokus: border `primary-600` + ring 3px `primary-100`.
- Error: border `danger-600`, pesan di bawah warna `danger-600` ukuran `small`.
- Label selalu di atas field (bukan placeholder sebagai label). Field wajib diberi tanda `*`.
- Input uang: prefix "Rp", rata kanan, otomatis titik ribuan saat mengetik.

### Badge status
Bentuk: pill, `small` weight 500, padding 2px 8px, latar warna-50 + teks warna-600/700 + titik bulat 6px di kiri.

| Status | Warna |
|---|---|
| Lunas | success |
| Belum Lunas | warning |
| Batal | neutral (`neutral-100` / `neutral-600`) |
| Tersedia | success |
| Menipis | warning |
| Habis | danger |
| Admin | primary |
| Kasir | info |

### Card
Putih, border `neutral-200`, radius 12px, padding 24px. Header kartu: judul `h2` di kiri, aksi (tombol sm) di kanan.

**Stat card (dashboard/laporan):** label `small` `neutral-500` → angka `display` → perubahan vs periode lalu (`small`, hijau naik / merah turun dengan ikon panah).

### Table
- Header: latar `neutral-100`, teks `small` weight 600 `neutral-600`, tinggi 44px.
- Baris: tinggi 52px, border bawah `neutral-200`, hover `neutral-50`.
- Kolom angka & uang rata kanan + `tabular-nums`. Kolom aksi paling kanan, pakai ghost button ikon + tooltip.
- Di atas tabel: search, filter, tombol utama (kanan).
- Pagination di bawah: "Menampilkan 1–20 dari 134" + navigasi halaman. Default 20 baris.
- **Empty state:** ikon `neutral-400`, kalimat singkat, dan tombol aksi bila relevan ("Belum ada barang. [Tambah barang]").
- **Loading:** skeleton baris, bukan spinner di tengah halaman.

### Modal / Dialog
Lebar 480px (form kecil) atau 640px (form besar). Radius 12px, overlay hitam 40%. Struktur: judul `h3` + tombol tutup → isi → footer (secondary kiri, primary kanan). Tutup dengan `Esc`.
Konfirmasi destruktif wajib menyebut objeknya: "Hapus barang *Pakan Ayam BR1 50kg*?"

### Toast / Notifikasi
Pojok kanan atas, hilang otomatis 4 detik (error tetap sampai ditutup). Varian success / error / warning / info dengan ikon. Contoh: "Transaksi TRX-20261022-0001 tersimpan".

### Tabs & Segmented control
Filter periode laporan pakai segmented control: **Harian | Mingguan | Bulanan | Kustom**. Item aktif bg putih + shadow-sm di atas track `neutral-100`.

---

## 7. Format Data

| Data | Format | Contoh |
|---|---|---|
| Uang | `Rp` + spasi + titik ribuan, tanpa desimal | `Rp 1.250.000` |
| Uang negatif | tanda minus di depan Rp, warna danger | `-Rp 50.000` |
| Tanggal | `DD MMM YYYY` | `22 Okt 2026` |
| Tanggal + jam | `DD MMM YYYY, HH:mm` (24 jam) | `22 Okt 2026, 18:41` |
| Angka stok | titik ribuan + satuan | `1.200 kg`, `35 sak` |
| No. transaksi | `TRX-YYYYMMDD-NNNN` | `TRX-20261022-0001` |
| No. pembelian | `PB-YYYYMMDD-NNNN` | `PB-20261022-0003` |

Pakai helper bersama di `src/lib/format.js` (`formatRupiah`, `formatDate`, `formatDateTime`) — dibangun di atas `Intl.NumberFormat('id-ID')` dan zona waktu `Asia/Jakarta`. Jangan format manual di tiap komponen.

---

## 8. Pola Halaman Khusus

### Login & 2FA
- Kartu tengah layar, lebar 400px, latar halaman `neutral-50`, logo di atas kartu.
- Langkah 1: username + password + tombol "Masuk".
- Langkah 2 (admin): judul "Verifikasi dua langkah", teks penjelas, **6 kotak input digit** (auto-pindah fokus, bisa paste 6 digit sekaligus), tombol "Verifikasi", link "Pakai kode cadangan".
- Setup pertama: QR code + kode manual (monospace) + daftar recovery code dengan tombol "Salin" dan "Unduh".
- Pesan error tidak membocorkan detail: "Username atau password salah", bukan "Password salah".

### Struk (thermal)
- Lebar konten 58mm (≈ 48 karakter) atau 80mm (≈ 64 karakter) via `@media print`; elemen UI lain disembunyikan saat print.
- Font monospace (`'Courier New', monospace`), 11–12px, hitam saja, tanpa warna/latar.
- Urutan: nama toko (tebal, tengah) → alamat & telp → garis `----` → no. transaksi, tanggal, kasir, pelanggan (jika ada) → item (nama di baris 1; `qty x harga` kiri, subtotal kanan di baris 2) → garis → total, bayar, kembali → status (LUNAS / BELUM LUNAS, tebal) → footer "Terima kasih".
- Struk digital di layar memakai layout yang sama di dalam kartu putih.

### Chatbot AI
- Tombol bulat 56px kanan bawah, bg `primary-600`, ikon `MessageCircle` putih.
- Panel 380×560px, radius 12px, `shadow-lg`. Header: "Asisten AI" + label kecil "Tidak terhubung ke data toko" + tombol percakapan baru & tutup.
- Bubble pengguna: kanan, bg `primary-600`, teks putih. Bubble AI: kiri, bg `neutral-100`, teks `neutral-900`. Radius 12px, maks lebar 80%.
- Indikator mengetik: tiga titik animasi. Jawaban AI mendukung markdown sederhana (list, tebal).
- State kosong: sapaan + 3 chip contoh pertanyaan ("Resep sup ayam sederhana", "Cara merawat kucing kampung", "Tips menyimpan pakan agar awet").
- Input: textarea auto-grow maks 4 baris, `Enter` kirim, `Shift+Enter` baris baru.
- Di tablet: panel jadi full-screen sheet.

### Dashboard & laporan
- Baris atas: 4 stat card (Pemasukan, Pengeluaran, Selisih, Piutang Belum Lunas).
- Lalu grafik tren (line/bar) pemasukan vs pengeluaran, lalu tabel detail.
- Warna grafik: pemasukan `primary-600`, pengeluaran `danger-600`, piutang `warning-600`. Gridline `neutral-200`, tanpa efek 3D.
- Library grafik: Recharts.

---

## 9. Ikon

- Library: **lucide-react**, stroke 2px. Ukuran 16px (dalam tombol/tabel), 20px (sidebar), 24px (empty state kecil).
- Ikon menu: Kasir `ShoppingCart`, Riwayat `ReceiptText`, Barang & Stok `Package`, Pembelian `Truck`, Pelanggan `Users`, Supplier `Building2`, Keuangan `Wallet`, Pengguna `UserCog`, Chatbot `MessageCircle`.
- Tombol ikon-saja wajib punya `aria-label` dan tooltip.

---

## 10. Interaksi & Keyboard

| Shortcut | Aksi (halaman kasir) |
|---|---|
| `/` atau `F2` | Fokus ke pencarian barang |
| `Enter` | Tambah barang pertama hasil pencarian ke keranjang |
| `F9` | Buka dialog bayar |
| `Esc` | Tutup modal / batalkan pencarian |
| `Ctrl+P` | Cetak struk (setelah transaksi tersimpan) |

- Animasi singkat saja: 150ms untuk hover/fokus, 200ms untuk modal & panel. Hormati `prefers-reduced-motion`.
- Setiap aksi simpan memberi feedback (toast atau perubahan state). Tidak ada aksi "diam".

---

## 11. Aksesibilitas

- Semua elemen interaktif bisa diakses keyboard dengan focus ring yang terlihat (`ring-2 ring-primary-600 ring-offset-2`).
- Target klik minimal 40×40px (44px di tablet).
- Status tidak hanya dibedakan warna — selalu ada teks.
- Form: `label` terhubung ke input (`htmlFor`), pesan error dihubungkan via `aria-describedby`.

---

## 12. Bahasa & Microcopy

- Bahasa Indonesia baku tapi santai dan singkat. Sapaan "Anda" tidak perlu; tulis langsung ("Pilih pelanggan").
- Istilah tetap (jangan diganti-ganti): **Barang** (bukan produk/item), **Pelanggan**, **Supplier**, **Pembelian**, **Transaksi**, **Lunas / Belum Lunas**, **Pemasukan / Pengeluaran**, **Stok**.
- Pesan error menjelaskan apa yang harus dilakukan: "Stok Pakan Ayam BR1 tinggal 3 sak. Kurangi jumlahnya." — bukan "Error 422".

---

## 13. Konfigurasi Tailwind

```js
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Courier New"', 'monospace'],
      },
      colors: {
        primary: {
          50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981',
          600: '#059669', 700: '#047857', 800: '#065F46',
        },
        neutral: {
          0: '#FFFFFF', 50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0',
          300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B', 600: '#475569',
          700: '#334155', 900: '#0F172A',
        },
        success: { 50: '#F0FDF4', 600: '#16A34A', 700: '#15803D' },
        warning: { 50: '#FFFBEB', 600: '#D97706', 700: '#B45309' },
        danger:  { 50: '#FEF2F2', 600: '#DC2626', 700: '#B91C1C' },
        info:    { 50: '#EFF6FF', 600: '#2563EB', 700: '#1D4ED8' },
      },
      fontSize: {
        small:   ['12px', { lineHeight: '16px' }],
        body:    ['14px', { lineHeight: '20px' }],
        h3:      ['16px', { lineHeight: '24px', fontWeight: '600' }],
        h2:      ['18px', { lineHeight: '28px', fontWeight: '600' }],
        h1:      ['24px', { lineHeight: '32px', fontWeight: '600' }],
        display: ['30px', { lineHeight: '36px', fontWeight: '700' }],
      },
      borderRadius: { md: '6px', lg: '8px', xl: '12px' },
    },
  },
  plugins: [],
};
```

---

## 14. Struktur Folder Frontend (saran)

```
src/
  components/
    ui/          Button, Input, Select, Badge, Card, Table, Modal, Toast, Tabs, Skeleton
    layout/      Sidebar, Topbar, AppLayout, AuthLayout
    chatbot/     ChatLauncher, ChatPanel, ChatBubble
    receipt/     Receipt (dipakai untuk print & tampilan digital)
  pages/         Login, TwoFactor, Pos, History, Products, Purchases, Customers, Suppliers, Finance, Users
  lib/           format.js, api.js, constants.js (label & warna status)
  hooks/
```

Mapping status → label & warna badge taruh di `lib/constants.js` supaya satu sumber.

---

## 15. Checklist sebelum PR

- [ ] Tidak ada hex/warna hardcode, semua pakai token
- [ ] Pakai komponen dari `components/ui`, bukan bikin ulang
- [ ] Uang & tanggal lewat helper `format.js`
- [ ] Ada state loading, empty, dan error
- [ ] Tombol simpan di-disable saat loading
- [ ] Bisa dipakai pakai keyboard, fokus terlihat
- [ ] Dicek di 1366×768 dan tablet 768px
- [ ] Menu/aksi admin tidak muncul di akun kasir
