<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Satu kedatangan barang (penerimaan bisa bertahap). Stok bertambah saat penerimaan dibuat. */
#[Fillable(['purchase_id', 'receipt_no', 'received_at', 'received_by', 'delivery_note', 'notes', 'created_at'])]
class PurchaseReceipt extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseReceiptItem::class, 'receipt_id')->orderBy('id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
