<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Satu-satunya pintu untuk mengubah stok barang (Stok, Kasir, Pembelian).
 * Baris barang dikunci (SELECT ... FOR UPDATE) supaya dua transaksi bersamaan
 * tidak saling menimpa, stok tidak pernah minus (BR-06), dan setiap perubahan
 * tercatat di stock_movements.
 *
 * Panggil di dalam DB::transaction() milik pemanggil bila perubahan stok harus
 * satu paket dengan data lain (mis. simpan transaksi kasir + potong stok).
 */
class StockService
{
    public const TYPES = ['initial', 'adjustment', 'sale', 'sale_edit', 'sale_cancel', 'purchase'];

    /**
     * @param  int  $delta  positif = stok bertambah, negatif = berkurang
     *
     * @throws ValidationException jika stok akan menjadi minus
     */
    public function adjust(
        Product|int $product,
        int $delta,
        string $type,
        ?User $user = null,
        ?string $note = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
    ): ?StockMovement {
        if ($delta === 0) {
            return null;
        }

        return DB::transaction(function () use ($product, $delta, $type, $user, $note, $referenceType, $referenceId) {
            $locked = Product::whereKey($product instanceof Product ? $product->getKey() : $product)
                ->lockForUpdate()
                ->firstOrFail();

            $after = $locked->stock + $delta;

            if ($after < 0) {
                throw ValidationException::withMessages([
                    'stock' => "Stok {$locked->name} tidak cukup. Tersedia {$locked->stock} {$locked->unit}.",
                ]);
            }

            $locked->forceFill(['stock' => $after])->save();

            if ($product instanceof Product) {
                $product->setRawAttributes($locked->getAttributes(), true);
            }

            return StockMovement::create([
                'product_id' => $locked->id,
                'type' => $type,
                'qty_change' => $delta,
                'stock_after' => $after,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'note' => $note,
                'user_id' => $user?->id,
                'created_at' => now(),
            ]);
        });
    }

    /** Ubah stok ke angka tertentu (koreksi manual di halaman Stok). */
    public function setTo(Product $product, int $target, ?User $user = null, ?string $note = null): ?StockMovement
    {
        return DB::transaction(function () use ($product, $target, $user, $note) {
            $current = Product::whereKey($product->getKey())->lockForUpdate()->value('stock');

            return $this->adjust($product, $target - $current, 'adjustment', $user, $note);
        });
    }
}
