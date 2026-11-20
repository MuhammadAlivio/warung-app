<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['purchase_id', 'product_id', 'product_name', 'unit', 'qty', 'qty_received', 'unit_price', 'subtotal'])]
class PurchaseItem extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'qty' => 'integer',
            'qty_received' => 'integer',
            'unit_price' => 'integer',
            'subtotal' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function remaining(): int
    {
        return max($this->qty - $this->qty_received, 0);
    }
}
