<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Lokasi penerimaan barang. purchases.location menyimpan `code` (tetap), bukan nama,
 * sehingga mengganti nama lokasi tidak mengubah faktur lama.
 */
#[Fillable(['code', 'name', 'sort_order', 'user_id'])]
class PurchaseLocation extends Model
{
    public function usageCount(): int
    {
        return Purchase::where('location', $this->code)->count();
    }

    /** Kode unik dari nama: "Gudang Belakang" -> "gudang_belakang" (ditambah _2, _3 bila sudah ada). */
    public static function codeFor(string $name): string
    {
        $base = Str::limit(Str::slug($name, '_'), 25, '') ?: 'lokasi';
        $code = $base;
        for ($i = 2; static::where('code', $code)->exists(); $i++) {
            $code = "{$base}_{$i}";
        }

        return $code;
    }

    public function toApi(?int $usage = null): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'purchase_count' => $usage,
        ];
    }
}
