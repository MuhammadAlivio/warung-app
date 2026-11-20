<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['receipt_id', 'purchase_item_id', 'qty'])]
class PurchaseReceiptItem extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return ['qty' => 'integer'];
    }

    public function purchaseItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseItem::class);
    }
}
