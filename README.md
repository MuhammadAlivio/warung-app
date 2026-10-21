# Warung (UI)

React + Vite + Tailwind CSS v3, dengan react-hook-form + zod dan lucide-react.

## Menjalankan

```bash
npm install
npm run dev
```

## Halaman (rute)

| Rute | Halaman |
| --- | --- |
| `/login` | Login User |
| `/register` | Register User |
| `/lupa-password` | Lupa Password |
| `/admin/login` | Login Admin |
| `/admin/2fa` | Verifikasi 2FA (OTP 6 digit; kode `000000` ditolak untuk demo error) |
| `/admin/2fa/setup` | Setup 2FA Wizard (3 langkah) |
| `/admin/stok` | Stok Barang (tambah, edit, hapus lewat modal) |

## Struktur

```
src/
├── components/
│   ├── ui/        Button, Input, PasswordInput, Checkbox, Select, Textarea,
│   │              Card, Badge, Modal, Stepper, Pagination, OtpInput
│   └── layout/    AuthLayout, DashboardLayout
├── features/
│   ├── auth/      halaman auth, skema zod, wizard 2FA
│   └── stock/     halaman stok, modal form/hapus, context, mock data
├── hooks/         useTotpCountdown
└── lib/           cn, format
```

## Catatan

- Semua login, 2FA, dan data stok masih **mock** (data stok in-memory, hilang saat refresh). Bagian yang perlu diganti dengan API ditandai `TODO`.
- Rute `/admin/*` belum dilindungi route guard.
- Warna brand (`brand-*`) ada di `tailwind.config.js`; nilainya estimasi dari desain, sesuaikan dengan token Figma.
