-- =====================================================================
-- Skema Pengaturan Profil Toko (khusus admin mengubah; admin & kasir membaca untuk struk)
-- Jalankan sekali setelah 002_keuangan.sql.
--
-- Hanya satu baris (id = 1) karena tokonya satu. Nilai awal sama dengan profil bawaan
-- di frontend (lib/utils/pos.js), jadi struk tidak berubah sebelum admin menyimpan.
--
-- Logo disimpan di database (base64) dan bukan di folder server: backend dijalankan di
-- beberapa laptop dengan satu database bersama, jadi file di satu laptop tidak terlihat di laptop lain.
-- Konvensi sama dengan 001: waktu TIMESTAMP tanpa zona (UTC, zona app.timezone).
-- =====================================================================

BEGIN;

CREATE TABLE store_profiles (
    id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name        VARCHAR(100) NOT NULL,
    phone       VARCHAR(30),
    address     VARCHAR(300),
    logo        TEXT,                                  -- isi file logo (base64), maks. 2 MB sebelum di-encode
    logo_mime   VARCHAR(20) CHECK (logo_mime IN ('image/png', 'image/jpeg')),
    updated_by  BIGINT REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);

INSERT INTO store_profiles (id, name, phone, address, created_at, updated_at)
VALUES (
    1,
    'U. D. Lestari',
    '022-7301234',
    'Jl. KH. Mas Mansyur No.40, RT.002/RW.010,',
    now() AT TIME ZONE 'UTC',
    now() AT TIME ZONE 'UTC'
);

COMMIT;
