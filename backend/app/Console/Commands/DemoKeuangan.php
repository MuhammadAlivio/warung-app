<?php

namespace App\Console\Commands;

use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Data contoh untuk mencoba grafik halaman Keuangan.
 *
 *   php artisan demo:keuangan          -> isi data contoh 60 hari terakhir
 *   php artisan demo:keuangan --hapus  -> hapus SEMUA data contoh, data asli tidak tersentuh
 *
 * Semua data contoh diberi penanda supaya bisa dihapus bersih:
 *   kategori "[DEMO] Contoh", barang SKU "DEMO-*", transaksi "DEMO-*", catatan kas berawalan "[DEMO]".
 */
class DemoKeuangan extends Command
{
    protected $signature = 'demo:keuangan {--hapus : Hapus semua data contoh} {--hari=60 : Jumlah hari ke belakang}';

    protected $description = 'Isi / hapus data contoh untuk grafik halaman Keuangan';

    private const TZ = 'Asia/Jakarta';

    private const CATEGORY = '[DEMO] Contoh';

    /** [sku, nama, satuan, harga beli, harga jual, bobot laku] */
    private const PRODUCTS = [
        ['DEMO-01', 'Beras Premium 5 kg', 'karung', 62000, 76000, 6],
        ['DEMO-02', 'Minyak Goreng 2 L', 'pcs', 30000, 38000, 8],
        ['DEMO-03', 'Gula Pasir 1 kg', 'pcs', 14000, 18000, 7],
        ['DEMO-04', 'Telur Ayam 1 kg', 'kg', 24000, 30000, 9],
        ['DEMO-05', 'Mie Instan Goreng', 'pcs', 2800, 3500, 10],
        ['DEMO-06', 'Kopi Sachet', 'renceng', 10000, 13500, 6],
        ['DEMO-07', 'Air Mineral 600 ml', 'pcs', 2500, 4000, 8],
        ['DEMO-08', 'Sabun Cuci Piring', 'pcs', 8500, 11500, 4],
        ['DEMO-09', 'Tepung Terigu 1 kg', 'pcs', 10000, 13500, 4],
        ['DEMO-10', 'Gas LPG 3 kg', 'tabung', 17000, 22000, 5],
    ];

    public function handle(): int
    {
        return $this->option('hapus') ? $this->remove() : $this->fill();
    }

    private function remove(): int
    {
        DB::transaction(function () {
            // item, pembayaran, dan riwayat transaksi ikut terhapus (ON DELETE CASCADE)
            $sales = DB::table('sales')->where('invoice_no', 'like', 'DEMO-%')->delete();
            $cash = DB::table('cash_entries')->where('description', 'like', '[DEMO]%')->delete();
            $productIds = DB::table('products')->where('sku', 'like', 'DEMO-%')->pluck('id');
            DB::table('stock_movements')->whereIn('product_id', $productIds)->delete();
            $products = DB::table('products')->whereIn('id', $productIds)->delete();
            DB::table('categories')->where('name', self::CATEGORY)->delete();

            $this->info("Data contoh dihapus: {$sales} transaksi, {$cash} catatan kas, {$products} barang.");
        });

        return self::SUCCESS;
    }

    private function fill(): int
    {
        if (DB::table('products')->where('sku', 'like', 'DEMO-%')->exists()) {
            $this->error('Data contoh sudah ada. Jalankan dulu: php artisan demo:keuangan --hapus');

            return self::FAILURE;
        }

        $adminId = DB::table('users')->where('role', 'admin')->orderBy('id')->value('id');
        $cashierId = DB::table('users')->where('role', 'kasir')->orderBy('id')->value('id') ?? $adminId;
        $customers = DB::table('customers')->orderBy('id')->limit(6)->get(['id', 'name']);
        $days = max(7, (int) $this->option('hari'));

        mt_srand(2026); // hasil selalu sama setiap kali diisi ulang

        DB::transaction(function () use ($adminId, $cashierId, $customers, $days) {
            $now = now();
            $categoryId = DB::table('categories')->insertGetId(['name' => self::CATEGORY, 'created_at' => $now, 'updated_at' => $now]);

            $products = [];
            foreach (self::PRODUCTS as [$sku, $name, $unit, $buy, $sell, $weight]) {
                $id = DB::table('products')->insertGetId([
                    'sku' => $sku, 'name' => $name, 'category_id' => $categoryId, 'unit' => $unit,
                    'buy_price' => $buy, 'sell_price' => $sell, 'stock' => 200, 'min_stock' => 10,
                    'description' => 'Barang contoh (demo)', 'created_at' => $now, 'updated_at' => $now,
                ]);
                $products[] = compact('id', 'name', 'unit', 'sell', 'weight');
            }

            $nowWib = CarbonImmutable::now(self::TZ);
            $today = $nowWib->startOfDay();
            $first = $today->subDays($days - 1);
            $saleCount = 0;
            $entryCount = 0;

            // Modal awal supaya saldo tidak minus
            $entryCount += $this->entry('masuk', 'Prive masuk', 10_000_000, $first, 'transfer', 'Modal awal', $adminId);

            for ($day = $first; $day <= $today; $day = $day->addDay()) {
                // ── penjualan ──
                $n = mt_rand(10, 16) + ($day->isWeekend() ? 5 : 0);
                for ($i = 0; $i < $n; $i++) {
                    $at = $day->setTime(mt_rand(7, 20), mt_rand(0, 59), mt_rand(0, 59));
                    if ($at->greaterThan($nowWib)) {
                        continue;
                    }
                    $saleCount++;
                    $this->sale($at, $saleCount, $products, $customers, $cashierId);
                }

                // ── kas manual ──
                $d = $day->day;
                if ($d === 1) {
                    $entryCount += $this->entry('keluar', 'Biaya operasional|Sewa toko', 1_500_000, $day, 'transfer', 'Sewa toko bulan '.$day->locale('id')->translatedFormat('F'), $adminId);
                }
                if ($d === 5) {
                    $entryCount += $this->entry('keluar', 'Biaya operasional|Listrik & air', mt_rand(38, 52) * 10_000, $day, 'transfer', 'Tagihan PLN & PDAM', $adminId);
                }
                if ($day->isSaturday()) {
                    $entryCount += $this->entry('keluar', 'Biaya operasional|Gaji', 600_000, $day, 'tunai', 'Gaji mingguan karyawan', $adminId);
                }
                if (mt_rand(1, 3) === 1) {
                    $entryCount += $this->entry('keluar', 'Biaya operasional|Transportasi', mt_rand(3, 12) * 10_000, $day, 'tunai', 'Bensin antar barang', $adminId);
                }
                if ($day->dayOfYear % 4 === 0) {
                    $entryCount += $this->entry('keluar', 'Pembelian barang', mt_rand(35, 55) * 100_000, $day, 'transfer', 'Belanja stok ke grosir', $adminId);
                }
                if (mt_rand(1, 8) === 1) {
                    $entryCount += $this->entry('keluar', 'Biaya operasional|Lainnya', mt_rand(2, 15) * 5_000, $day, 'tunai', 'Plastik & kantong belanja', $adminId);
                }
                if (mt_rand(1, 12) === 1) {
                    $entryCount += $this->entry('masuk', 'Pemasukan lain|Jual barang bekas', mt_rand(5, 20) * 10_000, $day, 'tunai', 'Jual kardus bekas', $adminId);
                }
            }

            $this->info("Data contoh dibuat: {$saleCount} transaksi, {$entryCount} catatan kas, ".count($products).' barang ('.$first->toDateString().' s.d. '.$today->toDateString().').');
            $this->line('Hapus kapan saja dengan: php artisan demo:keuangan --hapus');
        });

        return self::SUCCESS;
    }

    private function sale(CarbonImmutable $at, int $no, array $products, $customers, ?int $cashierId): void
    {
        // 1-4 baris barang, dipilih berbobot (barang laris lebih sering)
        $lines = [];
        foreach (range(1, mt_rand(1, 4)) as $_) {
            $p = $this->pick($products);
            $lines[$p['id']] ??= ['p' => $p, 'qty' => 0];
            $lines[$p['id']]['qty'] += mt_rand(1, 3);
        }
        $total = array_sum(array_map(fn ($l) => $l['p']['sell'] * $l['qty'], $lines));

        // 85% lunas, 10% belum lunas (wajib pelanggan terdaftar), 5% batal
        $roll = mt_rand(1, 100);
        $status = $roll <= 85 || $customers->isEmpty() ? 'lunas' : ($roll <= 95 ? 'belum_lunas' : 'batal');
        $customer = $status === 'belum_lunas' || mt_rand(1, 4) === 1 ? $customers->random() : null;
        $method = mt_rand(1, 10) <= 7 ? 'tunai' : 'transfer';
        $paid = $status === 'belum_lunas' ? (int) (round($total * mt_rand(0, 5) / 10 / 1000) * 1000) : $total;
        $utc = $at->utc()->toDateTimeString();

        $saleId = DB::table('sales')->insertGetId([
            'invoice_no' => sprintf('DEMO-%s-%03d', $at->format('dmy'), $no),
            'user_id' => $cashierId,
            'customer_id' => $customer?->id,
            'customer_name' => $customer?->name,
            'total' => $total,
            'paid_amount' => $paid,
            'cash_received' => $method === 'tunai' ? $paid : 0,
            'payment_method' => $method,
            'payment_status' => $status,
            'cancelled_at' => $status === 'batal' ? $utc : null,
            'cancelled_by' => $status === 'batal' ? $cashierId : null,
            'cancel_reason' => $status === 'batal' ? '[DEMO] Salah input' : null,
            'created_at' => $utc,
            'updated_at' => $utc,
        ]);

        DB::table('sale_items')->insert(array_map(fn ($l) => [
            'sale_id' => $saleId, 'product_id' => $l['p']['id'], 'product_name' => $l['p']['name'],
            'unit' => $l['p']['unit'], 'unit_price' => $l['p']['sell'], 'qty' => $l['qty'],
            'subtotal' => $l['p']['sell'] * $l['qty'],
        ], array_values($lines)));

        if ($paid > 0) {
            DB::table('sale_payments')->insert([
                'sale_id' => $saleId, 'paid_at' => $utc, 'method' => $method, 'amount' => $paid,
                'user_id' => $cashierId, 'created_at' => $utc,
            ]);
        }
    }

    /** $category = "Jenis" atau "Jenis|Kategori", mis. "Biaya operasional|Gaji". */
    private function entry(string $type, string $category, int $amount, CarbonImmutable $day, string $method, string $note, ?int $userId): int
    {
        $created = $day->setTime(mt_rand(8, 18), mt_rand(0, 59))->utc()->toDateTimeString();
        DB::table('cash_entries')->insert([
            'type' => $type, 'category' => explode('|', $category)[0], 'subcategory' => explode('|', $category)[1] ?? null,
            'amount' => $amount, 'entry_date' => $day->toDateString(),
            'method' => $method, 'description' => "[DEMO] {$note}", 'user_id' => $userId,
            'created_at' => $created, 'updated_at' => $created,
        ]);

        return 1;
    }

    private function pick(array $products): array
    {
        $r = mt_rand(1, array_sum(array_column($products, 'weight')));
        foreach ($products as $p) {
            if (($r -= $p['weight']) <= 0) {
                return $p;
            }
        }

        return $products[0];
    }
}
