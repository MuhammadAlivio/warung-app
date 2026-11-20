<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * "Alat" yang boleh dipanggil LLM chatbot. Semuanya hanya membaca tabel products dan hanya
 * mengembalikan data seperlunya: tanpa harga beli, pelanggan, transaksi, atau keuangan.
 * Status sama dengan halaman Stok: habis (stok <= 0), menipis (stok <= min_stock), aman.
 */
class StoreTools
{
    private const LIST_LIMIT = 20;

    private const MATCH_LIMIT = 8;

    public function definitions(): array
    {
        $tool = fn (string $name, string $description, array $properties = [], array $required = []) => [
            'type' => 'function',
            'function' => [
                'name' => $name,
                'description' => $description,
                'parameters' => ['type' => 'object', 'properties' => (object) $properties, 'required' => $required],
            ],
        ];

        return [
            $tool(
                'cari_barang',
                'Cari barang di toko berdasarkan nama. Mengembalikan sisa stok, satuan, stok minimum, status (aman/menipis/habis), dan harga jual.',
                ['kata_kunci' => ['type' => 'string', 'description' => 'Nama atau sebagian nama barang, mis. "beras" atau "minyak goreng"']],
                ['kata_kunci'],
            ),
            $tool('barang_menipis', 'Daftar barang yang stoknya menipis (sisa masih ada tapi sudah di batas minimum atau di bawahnya).'),
            $tool('barang_habis', 'Daftar barang yang stoknya sudah habis (0).'),
            $tool('ringkasan_stok', 'Jumlah jenis barang aktif beserta rinciannya: aman, menipis, dan habis.'),
        ];
    }

    /** Menjalankan satu alat. Hasilnya array yang dikirim balik ke LLM sebagai JSON. */
    public function run(string $name, array $arguments): array
    {
        return match ($name) {
            'cari_barang' => $this->findProducts((string) ($arguments['kata_kunci'] ?? '')),
            'barang_menipis' => $this->lowStock(),
            'barang_habis' => $this->outOfStock(),
            'ringkasan_stok' => $this->summary(),
            default => ['error' => 'Alat tidak dikenal.'],
        };
    }

    private function active(): Builder
    {
        return Product::query()->active();
    }

    private function row(Product $p): array
    {
        return [
            'nama' => $p->name,
            'stok' => $p->stock,
            'satuan' => $p->unit,
            'stok_minimum' => $p->min_stock,
            'status' => match (true) {
                $p->stock <= 0 => 'habis',
                $p->stock <= $p->min_stock => 'menipis',
                default => 'aman',
            },
            'harga_jual' => $p->sell_price,
        ];
    }

    private function findProducts(string $query): array
    {
        $tokens = collect(preg_split('/\s+/', mb_strtolower(preg_replace('/[^\p{L}\p{N}\s.]/u', ' ', mb_substr($query, 0, 80)))))
            ->filter(fn ($t) => mb_strlen($t) >= 2)
            ->values();

        if ($tokens->isEmpty()) {
            return ['error' => 'Kata kunci kosong. Minta pengguna menyebut nama barang.'];
        }

        // Semua kata harus ada di nama barang; kalau tidak ada yang cocok, longgarkan jadi salah satu kata
        $products = $this->search($tokens, all: true);
        $loose = false;
        if ($products->isEmpty()) {
            $products = $this->search($tokens, all: false);
            $loose = $products->isNotEmpty();
        }

        return [
            'jumlah_ditemukan' => $products->count(),
            'barang' => $products->take(self::MATCH_LIMIT)->map(fn (Product $p) => $this->row($p))->values()->all(),
            ...($loose ? ['catatan' => 'Tidak ada yang cocok persis; ini barang dengan nama mirip.'] : []),
        ];
    }

    private function search(Collection $tokens, bool $all): Collection
    {
        return $this->active()
            ->where(function ($q) use ($tokens, $all) {
                foreach ($tokens as $token) {
                    $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $token).'%';
                    $all ? $q->where('name', 'ilike', $like) : $q->orWhere('name', 'ilike', $like);
                }
            })
            ->orderBy('name')
            ->get();
    }

    private function lowStock(): array
    {
        $low = $this->active()->where('stock', '>', 0)->whereColumn('stock', '<=', 'min_stock')->orderBy('stock')->orderBy('name');

        return [
            'jumlah_menipis' => (clone $low)->count(),
            'jumlah_habis' => $this->active()->where('stock', '<=', 0)->count(),
            'barang' => $low->limit(self::LIST_LIMIT)->get()->map(fn (Product $p) => $this->row($p))->all(),
        ];
    }

    private function outOfStock(): array
    {
        $out = $this->active()->where('stock', '<=', 0)->orderBy('name');

        return [
            'jumlah_habis' => (clone $out)->count(),
            'barang' => $out->limit(self::LIST_LIMIT)->get()->map(fn (Product $p) => $this->row($p))->all(),
        ];
    }

    private function summary(): array
    {
        $all = $this->active()->count();
        $out = $this->active()->where('stock', '<=', 0)->count();
        $low = $this->active()->where('stock', '>', 0)->whereColumn('stock', '<=', 'min_stock')->count();

        return ['jumlah_jenis' => $all, 'aman' => $all - $out - $low, 'menipis' => $low, 'habis' => $out];
    }
}
