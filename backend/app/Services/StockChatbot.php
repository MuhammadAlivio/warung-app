<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Chatbot stok: mengenali pertanyaan (tanpa AI) dan menjawab dari tabel products.
 * Hanya membaca, dan tidak ada data yang keluar dari server. Status sama dengan halaman Stok:
 * Habis (stok <= 0), Menipis (stok <= min_stock), selain itu Aman.
 *
 * reply() mengembalikan null kalau pertanyaannya bukan soal stok atau harga barang.
 */
class StockChatbot
{
    private const LIST_LIMIT = 15;

    private const MATCH_LIMIT = 8;

    /** Kata yang bukan bagian dari nama barang saat mencari. */
    private const STOPWORDS = [
        'stok', 'stock', 'sisa', 'sisanya', 'tinggal', 'persediaan', 'berapa', 'ada', 'masih', 'apa', 'apakah', 'kah', 'nya',
        'yang', 'di', 'ke', 'dari', 'untuk', 'tolong', 'cek', 'cari', 'lihat', 'info', 'harga', 'harganya', 'sih', 'dong',
        'ya', 'barang', 'produk', 'tersedia', 'ready', 'berapa', 'jual', 'dijual', 'saat', 'ini', 'sekarang', 'toko', 'dan',
    ];

    public function reply(string $message): ?string
    {
        $text = $this->normalize($message);

        if (preg_match('/\b(bantuan|bantu|help|bisa apa|fitur)\b/', $text)) {
            return $this->help();
        }

        if (preg_match('/(menipis|mau habis|hampir habis|akan habis|segera habis|sisa sedikit|stok rendah|stok kritis|restok|perlu (di)?beli)/', $text)) {
            return $this->lowStock();
        }

        if (preg_match('/\b(habis|kosong)\b/', $text)) {
            return $this->outOfStock();
        }

        if (preg_match('/(berapa|jumlah|total|ada berapa).*\b(jenis|macam|item|barang|produk)\b/', $text)
            && ! preg_match('/\b(stok|stock|sisa|harga)\b/', $text)) {
            return $this->summary();
        }

        // Pertanyaan stok atau harga satu barang. Tanpa kata pemicu, bukan urusan chatbot ini.
        if (preg_match('/\b(stok|stock|sisa|sisanya|tinggal|persediaan|tersedia|ready|masih ada|harga|harganya)\b/', $text)) {
            return $this->lookup($text, (bool) preg_match('/\bharga/', $text));
        }

        return null;
    }

    private function normalize(string $message): string
    {
        return preg_replace('/\s+/', ' ', trim(Str::lower(preg_replace('/[^\p{L}\p{N}\s.]/u', ' ', $message))));
    }

    private function help(): string
    {
        return "Saya bisa menjawab dari data toko:\n"
            ."- Stok satu barang, contoh: “stok beras berapa?”\n"
            ."- Harga jual, contoh: “harga minyak goreng”\n"
            ."- “Barang apa yang mau habis?”\n"
            ."- “Barang apa saja yang habis?”\n"
            ."- “Ada berapa jenis barang?”\n"
            .'Saya juga bisa soal tagihan pelanggan dan penjualan hari ini.';
    }

    private function active(): \Illuminate\Database\Eloquent\Builder
    {
        return Product::query()->active();
    }

    private function lowStock(): string
    {
        $low = $this->active()->where('stock', '>', 0)->whereColumn('stock', '<=', 'min_stock')
            ->orderBy('stock')->orderBy('name')->get();
        $out = $this->active()->where('stock', '<=', 0)->count();

        if ($low->isEmpty()) {
            $note = $out > 0 ? " Tapi ada {$out} barang yang sudah habis, tanyakan “barang apa saja yang habis?”." : '';

            return 'Tidak ada barang yang stoknya menipis saat ini. 👍'.$note;
        }

        $reply = "Ada {$low->count()} barang yang stoknya menipis:\n".$this->lines($low, fn (Product $p) => "{$p->name}: sisa {$p->stock} {$p->unit} (batas minimum {$p->min_stock})");

        return $out > 0 ? $reply."\nDi luar itu, {$out} barang sudah habis." : $reply;
    }

    private function outOfStock(): string
    {
        $out = $this->active()->where('stock', '<=', 0)->orderBy('name')->get();

        if ($out->isEmpty()) {
            return 'Tidak ada barang yang habis saat ini. 👍';
        }

        return "Ada {$out->count()} barang yang stoknya habis:\n".$this->lines($out, fn (Product $p) => "{$p->name} (satuan {$p->unit})");
    }

    private function summary(): string
    {
        $all = $this->active()->count();
        $out = $this->active()->where('stock', '<=', 0)->count();
        $low = $this->active()->where('stock', '>', 0)->whereColumn('stock', '<=', 'min_stock')->count();

        return "Ada {$all} jenis barang aktif: ".($all - $out - $low)." aman, {$low} menipis, dan {$out} habis.";
    }

    private function lookup(string $text, bool $price): string
    {
        $tokens = collect(preg_split('/\s+/', $text))
            ->reject(fn ($t) => $t === '' || in_array($t, self::STOPWORDS, true) || mb_strlen($t) < 2)
            ->values();

        if ($tokens->isEmpty()) {
            return 'Barang apa yang mau dicek? Contoh: “stok beras berapa?”';
        }

        // Semua kata harus ada di nama barang; kalau tidak ada yang cocok, longgarkan jadi salah satu kata
        $matches = $this->search($tokens, all: true);
        $loose = false;
        if ($matches->isEmpty()) {
            $matches = $this->search($tokens, all: false);
            $loose = true;
        }

        if ($matches->isEmpty()) {
            return "Barang “{$tokens->implode(' ')}” tidak ditemukan. Cek ejaannya, atau lihat daftar lengkap di menu Stok Barang.";
        }

        $shown = $matches->take(self::MATCH_LIMIT);
        $line = fn (Product $p) => $price
            ? "{$p->name}: Rp".number_format($p->sell_price, 0, ',', '.')." per {$p->unit}"
            : "{$p->name}: {$this->stockText($p)}";

        if ($matches->count() === 1 && ! $loose) {
            return $line($shown->first()).'.';
        }

        $intro = $loose ? 'Saya tidak menemukan yang persis sama. Mungkin maksud Anda:' : "Ada {$matches->count()} barang yang cocok:";
        $more = $matches->count() > $shown->count() ? "\n…dan ".($matches->count() - $shown->count()).' lainnya. Sebut nama lebih lengkap untuk mempersempit.' : '';

        return $intro."\n".$this->lines($shown, $line).$more;
    }

    private function search(Collection $tokens, bool $all): Collection
    {
        return $this->active()
            ->where(function ($q) use ($tokens, $all) {
                foreach ($tokens as $token) {
                    $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $token).'%';
                    $all ? $q->where('name', 'ilike', $like) : $q->orWhere('name', 'ilike', $like);
                }
            })
            ->orderBy('name')
            ->get();
    }

    private function stockText(Product $p): string
    {
        $status = match (true) {
            $p->stock <= 0 => 'habis',
            $p->stock <= $p->min_stock => "menipis, batas minimum {$p->min_stock}",
            default => 'aman',
        };

        return $p->stock <= 0 ? "stok habis (0 {$p->unit})" : "sisa {$p->stock} {$p->unit}, {$status}";
    }

    /** Daftar berbutir, dipotong supaya jawaban tidak kepanjangan. */
    private function lines(Collection $items, callable $format): string
    {
        $shown = $items->take(self::LIST_LIMIT)->map(fn ($p) => '- '.$format($p))->implode("\n");
        $rest = $items->count() - self::LIST_LIMIT;

        return $rest > 0 ? $shown."\n…dan {$rest} lainnya. Lihat selengkapnya di menu Stok Barang." : $shown;
    }
}
