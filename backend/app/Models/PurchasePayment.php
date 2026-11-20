<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Pembayaran ke pemasok. Dibaca FinanceService sebagai pengeluaran "Pembelian barang". */
#[Fillable(['purchase_id', 'paid_at', 'method', 'amount', 'note', 'user_id', 'created_at'])]
class PurchasePayment extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'paid_at' => 'date',
            'amount' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
