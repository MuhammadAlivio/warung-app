<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Sale;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Chatbot tagihan dan penjualan: menjawab dari tabel sales dan customers dengan aturan kata kunci.
 * Sengaja tanpa LLM, supaya nama pelanggan dan nominal uang tidak pernah dikirim ke luar server.
 * Transaksi batal tidak dihitung. Tanggal mengikuti waktu toko (WIB).
 *
 * reply() mengembalikan null kalau pertanyaannya tidak dikenali.
 */
class SalesChatbot
{
    private const LIST_LIMIT = 15;

    public function reply(string $message): ?string
    {
        $text = Str::lower(trim(preg_replace('/\s+/', ' ', preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $message))));

        if (preg_match('/(belum|utang|hutang|tagihan|tunggak)/', $text)) {
            return $this->unpaid($text);
        }

        if (preg_match('/(penjualan|omzet|pendapatan)/', $text)) {
            return $this->sales($text);
        }

        if (preg_match('/(berapa|jumlah|total).*pelanggan|pelanggan.*(berapa|jumlah)/', $text)) {
            return 'Saat ini ada '.Customer::count().' pelanggan terdaftar.';
        }

        return null;
    }

    private function today(): CarbonImmutable
    {
        return CarbonImmutable::now(Sale::TIMEZONE);
    }

    private function unpaid(string $text): string
    {
        $date = match (true) {
            str_contains($text, 'kemarin') => $this->today()->subDay(),
            str_contains($text, 'hari ini') => $this->today(),
            default => null,
        };
        $label = $date ? (str_contains($text, 'kemarin') ? ' kemarin' : ' hari ini') : '';

        $rows = DB::table('sales')
            ->join('customers', 'customers.id', '=', 'sales.customer_id')
            ->where('sales.payment_status', 'belum_lunas')
            ->when($date, fn ($q) => $q->whereRaw(Sale::localDateSql('sales.created_at').' = ?', [$date->toDateString()]))
            ->groupBy('customers.id', 'customers.name')
            ->selectRaw('customers.name, count(*) as transaksi, sum(sales.total - sales.paid_amount) as sisa')
            ->orderByDesc('sisa')
            ->orderBy('customers.name')
            ->get();

        if ($rows->isEmpty()) {
            return 'Tidak ada pelanggan yang memiliki tagihan belum lunas'.$label.'. 🎉';
        }

        $lines = $rows->take(self::LIST_LIMIT)->map(
            fn ($r) => "- {$r->name} ({$this->rupiah($r->sisa)}, {$r->transaksi} transaksi)"
        )->implode("\n");
        $rest = $rows->count() - self::LIST_LIMIT;

        return "Ada {$rows->count()} pelanggan yang belum membayar lunas{$label}, total sisa tagihan {$this->rupiah($rows->sum('sisa'))}. Daftarnya:\n"
            .$lines
            .($rest > 0 ? "\n…dan {$rest} lainnya. Lihat selengkapnya di menu Daftar Pelanggan." : '');
    }

    private function sales(string $text): string
    {
        [$from, $to, $label] = match (true) {
            str_contains($text, 'kemarin') => [$this->today()->subDay(), $this->today()->subDay(), 'kemarin'],
            str_contains($text, 'bulan') => [$this->today()->startOfMonth(), $this->today(), 'bulan ini'],
            default => [$this->today(), $this->today(), 'hari ini'],
        };

        $localDate = Sale::localDateSql('sales.created_at');
        $row = DB::table('sales')
            ->where('payment_status', '<>', 'batal')
            ->whereRaw("{$localDate} >= ?", [$from->toDateString()])
            ->whereRaw("{$localDate} <= ?", [$to->toDateString()])
            ->selectRaw('coalesce(sum(total), 0) as total, count(*) as jumlah')
            ->first();

        return "Penjualan bersih {$label} {$this->rupiah($row->total)} dari {$row->jumlah} transaksi.";
    }

    private function rupiah(int|string|float $n): string
    {
        return 'Rp'.number_format((int) $n, 0, ',', '.');
    }
}
