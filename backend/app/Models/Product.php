<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Barang. Kolom `stock` JANGAN diubah langsung: pakai StockService::adjust() supaya
 * setiap perubahan tercatat di stock_movements dan stok tidak pernah minus.
 */
#[Fillable(['sku', 'name', 'description', 'category_id', 'unit', 'buy_price', 'sell_price', 'min_stock'])]
class Product extends Model
{
    protected function casts(): array
    {
        return [
            'buy_price' => 'integer',
            'sell_price' => 'integer',
            'stock' => 'integer',
            'min_stock' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /** Bentuk yang dipakai frontend. Foto disajikan lewat endpoint API (tanpa storage:link). */
    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'description' => $this->description ?? '',
            'category_id' => $this->category_id,
            'category' => $this->category?->name,
            'unit' => $this->unit,
            'buy_price' => $this->buy_price,
            'sell_price' => $this->sell_price,
            'stock' => $this->stock,
            'min_stock' => $this->min_stock,
            'image_url' => $this->image_path
                ? "/api/products/{$this->id}/image?v=".$this->updated_at?->timestamp
                : null,
        ];
    }
}
