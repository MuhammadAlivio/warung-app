<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Item nota. Nama, satuan, dan harga adalah snapshot saat transaksi (PRD §9). */
#[Fillable(['sale_id', 'product_id', 'product_name', 'unit', 'unit_price', 'qty', 'subtotal'])]
class SaleItem extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'unit_price' => 'integer',
            'qty' => 'integer',
            'subtotal' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
