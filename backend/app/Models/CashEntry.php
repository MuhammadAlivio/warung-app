<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/** Catatan kas manual di halaman Keuangan (tabel cash_entries, lihat database/sql/002_keuangan.sql). */
#[Fillable(['type', 'category', 'amount', 'entry_date', 'method', 'description', 'user_id'])]
class CashEntry extends Model
{
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'entry_date' => 'date:Y-m-d',
        ];
    }
}
