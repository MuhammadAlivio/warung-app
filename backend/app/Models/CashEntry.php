<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Catatan kas manual di halaman Keuangan (tabel cash_entries, lihat database/sql/002_keuangan.sql).
 * category = jenis (efek ke laporan), subcategory = kategori dari tabel cash_categories.
 * Hapus lunak: deleted_at / deleted_by / delete_reason (002_keuangan.sql); baris terhapus tidak dihitung di laporan.
 */
#[Fillable(['type', 'category', 'subcategory', 'amount', 'entry_date', 'method', 'description', 'user_id'])]
class CashEntry extends Model
{
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'entry_date' => 'date:Y-m-d',
            'deleted_at' => 'datetime',
        ];
    }
}
