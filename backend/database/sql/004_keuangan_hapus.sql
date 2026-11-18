-- =====================================================================
-- Hapus lunak catatan kas manual (halaman Keuangan, khusus admin)
-- Jalankan sekali setelah 003_profil_toko.sql.
--
-- Catatan yang dihapus tidak dibuang: ditandai deleted_at + siapa + alasan,
-- tidak lagi dihitung di laporan, tetapi jejaknya tetap ada (sama seperti transaksi kasir yang dibatalkan).
-- =====================================================================

BEGIN;

ALTER TABLE cash_entries
    ADD COLUMN deleted_at     TIMESTAMP,
    ADD COLUMN deleted_by     BIGINT REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN delete_reason  VARCHAR(300);

COMMIT;
