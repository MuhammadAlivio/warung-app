-- =====================================================================
-- Pembatalan faktur pembelian (modul Pembelian & Barang Masuk, khusus admin)
--
-- AMAN DIJALANKAN BERULANG KALI (idempotent): kolom yang sudah ada dilewati.
--
-- Faktur yang tidak jadi TIDAK dihapus (PRD BR-07): ditandai cancelled_at + siapa + alasan.
-- Aturan (dicek di backend, PurchaseService::cancel):
--   * Hanya faktur yang barangnya belum diterima sama sekali (stok tidak pernah berubah).
--   * Pembayaran yang sudah ada dianggap dikembalikan pemasok: tidak dihitung lagi sebagai
--     pengeluaran di laporan Keuangan (FinanceService mengabaikan faktur yang dibatalkan).
--   * Faktur yang dibatalkan tidak bisa diterima barangnya atau dibayar lagi.
-- Kolom status (status penerimaan) tidak diubah; faktur batal tetap "belum_diterima".
-- =====================================================================

BEGIN;

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMP;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS cancelled_by  BIGINT REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(300);

COMMIT;
