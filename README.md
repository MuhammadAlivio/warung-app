# Warung (UI)

React + Vite + Tailwind CSS v3, dengan react-hook-form + zod dan lucide-react.

## Menjalankan

```bash
cd frontend
npm install
npm run dev
```

Backend belum ada isinya; lihat `backend/README.md`.

## Halaman (rute)

| Rute | File (di `frontend/src/`) |
| --- | --- |
| `/login` | `pages/Login.jsx` |
| `/register` | `pages/Register.jsx` |
| `/lupa-password` | `pages/LupaPassword.jsx` |
| `/admin/login` | `pages/LoginAdmin.jsx` |
| `/admin/2fa` | `pages/Verifikasi2FA.jsx` (OTP 6 digit; kode `000000` ditolak untuk demo error) |
| `/admin/2fa/setup` | `pages/Setup2FA.jsx` (wizard 3 langkah) |
| `/admin/stok` | `pages/Stok.jsx` (tambah, edit, hapus lewat modal) |

## Struktur

```
warung-app/
├── frontend/          React + Vite + Tailwind
│   └── src/
│       ├── App.jsx    daftar rute
│       ├── pages/     satu file = satu halaman
│       └── lib/
│           ├── components/  ui/, layout/, auth/, stock/
│           ├── stores/      StockContext
│           ├── schemas/     validasi zod (auth, stock)
│           ├── data/        mock data
│           ├── config/      authCopy
│           ├── hooks/       useTotpCountdown
│           └── utils/       cn, format
└── backend/           kerangka kosong
```

## Catatan

- Semua login, 2FA, dan data stok masih **mock** (data stok in-memory, hilang saat refresh). Bagian yang perlu diganti dengan API ditandai `TODO`.
- Rute `/admin/*` belum dilindungi route guard.
- Warna brand (`brand-*`) ada di `tailwind.config.js`; nilainya estimasi dari desain, sesuaikan dengan token Figma.
