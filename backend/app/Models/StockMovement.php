<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['product_id', 'type', 'qty_change', 'stock_after', 'reference_type', 'reference_id', 'note', 'user_id', 'created_at'])]
class StockMovement extends Model
{
    // Hanya created_at (diisi default NOW() oleh database atau oleh StockService)
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'qty_change' => 'integer',
            'stock_after' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
