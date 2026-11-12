<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Pembayaran awal & pelunasan. Sumber kas masuk di laporan keuangan (FinanceService). */
#[Fillable(['sale_id', 'paid_at', 'method', 'amount', 'note', 'user_id', 'created_at'])]
class SalePayment extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'paid_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
