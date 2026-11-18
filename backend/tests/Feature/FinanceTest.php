<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Modul Keuangan. Skema dari SQL (database/sql), jadi dijalankan ke Postgres dan di-rollback per tes:
 *
 *   DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test --filter=FinanceTest
 *
 * Data uji memakai minggu 3-9 Maret 2031 supaya tidak tercampur data asli.
 */
class FinanceTest extends TestCase
{
    use DatabaseTransactions;

    private User $admin;

    private User $kasir;

    private int $customerId;

    private int $productId;

    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'pgsql') {
            $this->markTestSkipped('Butuh Postgres: DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test');
        }

        // Jika 002_keuangan.sql belum dijalankan, buat tabelnya di dalam transaksi tes (ikut di-rollback)
        if (! Schema::hasTable('cash_entries')) {
            $sql = file_get_contents(database_path('sql/002_keuangan.sql'));
            DB::unprepared(preg_replace('/^\s*(BEGIN|COMMIT);\s*$/m', '', $sql));
        }
        // Sama untuk kolom hapus lunak dari 004_keuangan_hapus.sql
        if (! Schema::hasColumn('cash_entries', 'deleted_at')) {
            $sql = file_get_contents(database_path('sql/004_keuangan_hapus.sql'));
            DB::unprepared(preg_replace('/^\s*(BEGIN|COMMIT);\s*$/m', '', $sql));
        }

        $this->admin = User::where('role', 'admin')->where('is_active', true)->firstOrFail();
        $this->kasir = User::where('role', 'kasir')->where('is_active', true)->firstOrFail();

        $category = Category::create(['name' => 'Uji Keuangan '.uniqid()]);
        $this->productId = DB::table('products')->insertGetId([
            'name' => 'Pakan Uji', 'category_id' => $category->id, 'buy_price' => 6000, 'sell_price' => 10000,
            'stock' => 100, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->customerId = DB::table('customers')->insertGetId([
            'name' => 'Budi Uji Keuangan', 'phone' => '0812-3456-7890', 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    /** Nota kasir + item + pembayaran. $at dalam UTC (zona penyimpanan app). */
    private function sale(string $at, int $qty, string $status, array $payments, bool $withCustomer = true): int
    {
        $total = $qty * 10000;
        $paid = array_sum($payments);
        $id = DB::table('sales')->insertGetId([
            'invoice_no' => 'TRX-UJI-'.uniqid(), 'user_id' => $this->kasir->id,
            'customer_id' => $withCustomer ? $this->customerId : null,
            'customer_name' => $withCustomer ? 'Budi Uji Keuangan' : null,
            'total' => $total, 'paid_amount' => min($paid, $total), 'payment_method' => 'tunai', 'payment_status' => $status,
            'cancelled_at' => $status === 'batal' ? $at : null,
            'created_at' => $at, 'updated_at' => $at,
        ]);
        DB::table('sale_items')->insert([
            'sale_id' => $id, 'product_id' => $this->productId, 'product_name' => 'Pakan Uji',
            'unit_price' => 10000, 'qty' => $qty, 'subtotal' => $total,
        ]);
        foreach ($payments as $amount) {
            DB::table('sale_payments')->insert([
                'sale_id' => $id, 'paid_at' => $at, 'method' => 'tunai', 'amount' => $amount, 'user_id' => $this->kasir->id,
            ]);
        }

        return $id;
    }

    private function seedWeek(): void
    {
        // 3 Mar 03:00 UTC = 3 Mar WIB. Lunas 50.000, HPP 5 x 6.000
        $this->sale('2031-03-03 03:00:00', 5, 'lunas', [50000]);
        // 3 Mar 20:00 UTC = 4 Mar 03:00 WIB. Belum lunas: total 20.000, DP 5.000, HPP 2 x 6.000
        $this->sale('2031-03-03 20:00:00', 2, 'belum_lunas', [5000]);
        // Batal: tidak dihitung sama sekali
        $this->sale('2031-03-05 03:00:00', 9, 'batal', [90000]);

        $supplierId = DB::table('suppliers')->insertGetId(['name' => 'Supplier Uji', 'created_at' => now(), 'updated_at' => now()]);
        $purchaseId = DB::table('purchases')->insertGetId([
            'purchase_no' => 'INV-UJI-'.uniqid(), 'supplier_id' => $supplierId, 'user_id' => $this->admin->id,
            'purchase_date' => '2031-03-05', 'subtotal' => 40000, 'total' => 40000, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('purchase_payments')->insert([
            'purchase_id' => $purchaseId, 'paid_at' => '2031-03-05', 'method' => 'transfer_bank', 'amount' => 40000,
        ]);

        foreach ([
            ['type' => 'keluar', 'category' => 'Gaji', 'amount' => 25000, 'date' => '2031-03-06'],
            ['type' => 'keluar', 'category' => 'Prive pemilik', 'amount' => 10000, 'date' => '2031-03-06'],
            ['type' => 'masuk', 'category' => 'Lainnya', 'amount' => 7000, 'date' => '2031-03-07'],
        ] as $entry) {
            $this->actingAs($this->admin)->postJson('/api/finance/entries', [...$entry, 'method' => 'tunai'])->assertCreated();
        }
    }

    private function report(string $period, string $date): array
    {
        return $this->actingAs($this->admin)
            ->getJson("/api/finance/report?period={$period}&date={$date}")
            ->assertOk()
            ->json('data');
    }

    public function test_only_admin_can_access(): void
    {
        $this->getJson('/api/finance/report?period=harian&date=2031-03-03')->assertUnauthorized();

        $this->actingAs($this->kasir)->getJson('/api/finance/report?period=harian&date=2031-03-03')->assertForbidden();
        $this->actingAs($this->kasir)->getJson('/api/finance/entries?start=2031-03-01&end=2031-03-31')->assertForbidden();
        $this->actingAs($this->kasir)->postJson('/api/finance/entries', [
            'type' => 'keluar', 'category' => 'Gaji', 'amount' => 1000, 'date' => '2031-03-03', 'method' => 'tunai',
        ])->assertForbidden();
    }

    public function test_weekly_report_matches_manual_calculation(): void
    {
        $piutangSebelum = $this->report('mingguan', '2031-03-05')['summary']['piutang'];
        $this->seedWeek();

        $data = $this->report('mingguan', '2031-03-05');
        $s = $data['summary'];

        $this->assertSame(['type' => 'mingguan', 'start' => '2031-03-03', 'end' => '2031-03-09'], $data['period']);
        $this->assertSame(62000, $s['kas_masuk']);          // 50.000 + 5.000 + 7.000
        $this->assertSame(75000, $s['kas_keluar']);         // 40.000 + 25.000 + 10.000
        $this->assertSame(-13000, $s['arus_kas_bersih']);
        $this->assertSame(70000, $s['penjualan']);          // akrual: 50.000 + 20.000 (lunas & belum)
        $this->assertSame(42000, $s['hpp']);                // 7 x 6.000
        $this->assertSame(28000, $s['laba_kotor']);
        $this->assertSame(25000, $s['biaya_operasional']);  // Gaji saja; prive & pembelian bukan biaya operasional
        $this->assertSame(3000, $s['laba_usaha']);
        $this->assertSame(55000, $s['masuk_penjualan']);
        $this->assertSame(7000, $s['masuk_lainnya']);
        $this->assertSame(40000, $s['bayar_pemasok']);
        $this->assertSame(10000, $s['prive']);
        $this->assertSame(2, $s['jumlah_transaksi']);
        $this->assertSame($piutangSebelum + 15000, $s['piutang']);
        $this->assertSame($s['saldo_awal'] - 13000, $s['saldo_akhir']);

        $this->assertCount(7, $data['breakdown']);
        $this->assertSame(50000, $data['breakdown'][0]['penjualan']);  // 3 Mar
        $this->assertSame(20000, $data['breakdown'][1]['penjualan']);  // 4 Mar (20:00 UTC = 03:00 WIB)
        $this->assertSame(['Gaji'], array_column($data['operational_costs'], 'category'));
    }

    public function test_daily_and_monthly_periods(): void
    {
        $this->seedWeek();

        $harian = $this->report('harian', '2031-03-04');
        $this->assertSame('2031-03-04', $harian['period']['end']);
        $this->assertSame(20000, $harian['summary']['penjualan']);
        $this->assertSame(5000, $harian['summary']['kas_masuk']);
        $this->assertCount(1, $harian['breakdown']);

        // Maret 2031 dimulai hari Sabtu: Minggu 1 = 1-2 Mar, Minggu 6 = 31 Mar
        $bulanan = $this->report('bulanan', '2031-03-20');
        $this->assertSame(['type' => 'bulanan', 'start' => '2031-03-01', 'end' => '2031-03-31'], $bulanan['period']);
        $this->assertCount(6, $bulanan['breakdown']);
        $this->assertSame(['start' => '2031-03-01', 'end' => '2031-03-02', 'label' => 'Minggu 1'], array_intersect_key($bulanan['breakdown'][0], array_flip(['start', 'end', 'label'])));
        $this->assertSame(70000, $bulanan['breakdown'][1]['penjualan']);
        $this->assertSame(3000, $bulanan['summary']['laba_usaha']);
    }

    public function test_opening_balance_continues_from_previous_period(): void
    {
        $this->seedWeek();

        $minggu1 = $this->report('mingguan', '2031-03-05')['summary'];
        $minggu2 = $this->report('mingguan', '2031-03-12')['summary'];

        $this->assertSame($minggu1['saldo_akhir'], $minggu2['saldo_awal']);
    }

    public function test_entries_can_be_searched_by_customer_name_or_phone(): void
    {
        $this->seedWeek();
        $url = '/api/finance/entries?start=2031-03-03&end=2031-03-09&type=masuk';

        $all = $this->actingAs($this->admin)->getJson($url)->assertOk()->json('data');
        $this->assertCount(3, $all);

        $byName = $this->actingAs($this->admin)->getJson($url.'&search=budi uji')->assertOk()->json('data');
        $this->assertCount(2, $byName);
        $this->assertEqualsCanonicalizing(['Penjualan', 'Penjualan'], array_column($byName, 'category'));
        $this->assertSame('Budi Uji Keuangan', $byName[0]['customer_name']);

        $this->assertCount(2, $this->actingAs($this->admin)->getJson($url.'&search=3456 7890')->json('data'));
        $this->assertCount(0, $this->actingAs($this->admin)->getJson($url.'&search=tidak-ada')->json('data'));
        $this->assertCount(0, $this->actingAs($this->admin)->getJson($url.'&search=%25')->json('data'));
    }

    public function test_store_validates_and_logs_activity(): void
    {
        $this->actingAs($this->admin)->postJson('/api/finance/entries', [
            'type' => 'masuk', 'category' => 'Gaji', 'amount' => 0, 'date' => '2031-03-03', 'method' => 'cek',
        ])->assertUnprocessable()->assertJsonValidationErrors(['category', 'amount', 'method']);

        $this->actingAs($this->admin)->postJson('/api/finance/entries', [
            'type' => 'keluar', 'category' => 'Transportasi', 'amount' => 150000, 'date' => '2031-03-03',
            'method' => 'tunai', 'description' => 'Ongkos kirim',
        ])->assertCreated()
            ->assertJsonPath('data.source', 'manual')
            ->assertJsonPath('data.amount', 150000)
            ->assertJsonPath('data.date', '2031-03-03')
            ->assertJsonPath('data.created_by', $this->admin->name);

        $this->assertDatabaseHas('activity_logs', ['user_id' => $this->admin->id, 'module' => 'keuangan', 'action' => 'tambah']);
    }

    private function entryId(string $category): int
    {
        $rows = $this->actingAs($this->admin)->getJson('/api/finance/entries?start=2031-03-03&end=2031-03-09')->json('data');

        return collect($rows)->firstWhere('category', $category)['entry_id'];
    }

    public function test_manual_entry_can_be_edited_and_soft_deleted(): void
    {
        $this->seedWeek();
        $id = $this->entryId('Gaji');

        // Kasir tidak boleh mengubah / menghapus
        $this->actingAs($this->kasir)->putJson("/api/finance/entries/{$id}", [])->assertForbidden();
        $this->actingAs($this->kasir)->deleteJson("/api/finance/entries/{$id}", ['reason' => 'Salah input'])->assertForbidden();

        // Ubah: Gaji 25.000 -> 30.000, laba usaha 3.000 -> -2.000
        $this->actingAs($this->admin)->putJson("/api/finance/entries/{$id}", [
            'type' => 'keluar', 'category' => 'Gaji', 'amount' => 30000, 'date' => '2031-03-06', 'method' => 'transfer', 'description' => 'Gaji harian',
        ])->assertOk()->assertJsonPath('data.amount', 30000)->assertJsonPath('data.entry_id', $id)->assertJsonPath('data.method', 'transfer');
        $this->assertSame(-2000, $this->report('mingguan', '2031-03-05')['summary']['laba_usaha']);

        // Validasi tetap berlaku saat mengubah
        $this->actingAs($this->admin)->putJson("/api/finance/entries/{$id}", [
            'type' => 'keluar', 'category' => 'Penjualan', 'amount' => 0, 'date' => '2031-03-06', 'method' => 'tunai',
        ])->assertUnprocessable()->assertJsonValidationErrors(['category', 'amount']);

        // Hapus wajib dengan alasan
        $this->actingAs($this->admin)->deleteJson("/api/finance/entries/{$id}", ['reason' => 'ab'])
            ->assertUnprocessable()->assertJsonValidationErrors('reason');
        $saldoSebelum = $this->report('mingguan', '2031-03-12')['summary']['saldo_awal'];
        $this->actingAs($this->admin)->deleteJson("/api/finance/entries/{$id}", ['reason' => 'Salah input gaji'])->assertOk();

        // Tidak lagi dihitung: laporan, daftar kas, dan saldo awal periode berikutnya
        $s = $this->report('mingguan', '2031-03-05')['summary'];
        $this->assertSame(0, $s['biaya_operasional']);
        $this->assertSame(28000, $s['laba_usaha']);
        $this->assertNull(collect($this->actingAs($this->admin)->getJson('/api/finance/entries?start=2031-03-03&end=2031-03-09')->json('data'))->firstWhere('entry_id', $id));
        $this->assertSame($saldoSebelum + 30000, $this->report('mingguan', '2031-03-12')['summary']['saldo_awal']);

        // Jejaknya tetap ada
        $this->assertDatabaseHas('cash_entries', ['id' => $id, 'deleted_by' => $this->admin->id, 'delete_reason' => 'Salah input gaji']);
        $this->assertDatabaseHas('activity_logs', ['module' => 'keuangan', 'action' => 'ubah', 'subject_id' => $id]);
        $this->assertDatabaseHas('activity_logs', ['module' => 'keuangan', 'action' => 'hapus', 'subject_id' => $id]);

        // Catatan yang sudah dihapus tidak bisa diubah / dihapus lagi
        $this->actingAs($this->admin)->deleteJson("/api/finance/entries/{$id}", ['reason' => 'Hapus lagi'])->assertNotFound();
        $this->actingAs($this->admin)->putJson("/api/finance/entries/{$id}", [
            'type' => 'keluar', 'category' => 'Gaji', 'amount' => 1000, 'date' => '2031-03-06', 'method' => 'tunai',
        ])->assertNotFound();
    }

    public function test_entries_filter_and_pagination(): void
    {
        $this->seedWeek();
        $url = '/api/finance/entries?start=2031-03-03&end=2031-03-09&type=keluar';

        $all = $this->actingAs($this->admin)->getJson($url)->assertOk();
        $this->assertCount(3, $all->json('data'));                 // pembelian 40.000, gaji 25.000, prive 10.000
        $this->assertSame(['total' => 3, 'total_amount' => 75000], $all->json('meta'));

        $this->assertCount(1, $this->actingAs($this->admin)->getJson($url.'&category=Gaji')->json('data'));
        $this->assertSame('pembelian', $this->actingAs($this->admin)->getJson($url.'&q=supplier uji')->json('data.0.source'));

        $page1 = $this->actingAs($this->admin)->getJson($url.'&page=1&per_page=2')->assertOk();
        $this->assertCount(2, $page1->json('data'));
        $this->assertSame(['total' => 3, 'total_amount' => 75000, 'page' => 1, 'per_page' => 2, 'page_count' => 2], $page1->json('meta'));
        $this->assertCount(1, $this->actingAs($this->admin)->getJson($url.'&page=2&per_page=2')->json('data'));
        // Halaman di luar jangkauan diarahkan ke halaman terakhir
        $this->assertSame(2, $this->actingAs($this->admin)->getJson($url.'&page=9&per_page=2')->json('meta.page'));
    }

    public function test_report_includes_chart_data(): void
    {
        $this->seedWeek();

        // Harian: 7 hari terakhir s.d. tanggal terpilih, saldo berjalan berakhir di saldo akhir hari itu
        $harian = $this->report('harian', '2031-03-07');
        $cashflow = $harian['charts']['cashflow'];
        $this->assertCount(7, $cashflow);
        $this->assertSame('2031-03-01', $cashflow[0]['start']);
        $this->assertSame('2031-03-07', $cashflow[6]['start']);
        $this->assertSame($harian['summary']['saldo_akhir'], $cashflow[6]['saldo_akhir']);
        $this->assertSame(55000, $cashflow[2]['kas_masuk'] + $cashflow[3]['kas_masuk']); // 3 & 4 Mar

        // Mingguan: sama dengan rincian
        $mingguan = $this->report('mingguan', '2031-03-05');
        $this->assertCount(7, $mingguan['charts']['cashflow']);
        $this->assertSame($mingguan['summary']['saldo_akhir'], end($mingguan['charts']['cashflow'])['saldo_akhir']);

        $this->assertSame([
            ['category' => 'Pembelian barang', 'amount' => 40000],
            ['category' => 'Gaji', 'amount' => 25000],
            ['category' => 'Prive pemilik', 'amount' => 10000],
        ], $mingguan['charts']['expense_by_category']);

        // Nota batal (9 pcs) tidak ikut dihitung
        $this->assertSame([['product_id' => $this->productId, 'name' => 'Pakan Uji', 'qty' => 7, 'omzet' => 70000]], $mingguan['charts']['top_products']);
    }

    public function test_export_pdf_and_excel(): void
    {
        $this->seedWeek();
        $url = '/api/finance/export?start=2031-03-03&end=2031-03-09';

        $this->actingAs($this->kasir)->get($url.'&format=pdf')->assertForbidden();

        $pdf = $this->actingAs($this->admin)->get($url.'&format=pdf')->assertOk();
        $this->assertSame('application/pdf', $pdf->headers->get('Content-Type'));
        $this->assertStringContainsString('laporan-keuangan_2031-03-03_2031-03-09.pdf', $pdf->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('%PDF', $pdf->getContent());

        $xlsx = $this->actingAs($this->admin)->get($url.'&format=xlsx')->assertOk();
        $this->assertStringStartsWith('PK', $xlsx->getContent());
        $path = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($path, $xlsx->getContent());
        $book = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
        unlink($path);

        $this->assertSame(['Ringkasan', 'Penjualan', 'Arus Kas', 'Transaksi kas'], $book->getSheetNames());
        $this->assertSame(3000, $book->getSheetByName('Ringkasan')->getCell('B10')->getValue());       // laba usaha
        $this->assertSame(3, $book->getSheetByName('Penjualan')->getHighestDataRow() - 1);              // 3 nota termasuk batal
        $this->assertSame(7, $book->getSheetByName('Arus Kas')->getHighestDataRow() - 1);               // 7 hari
        $this->assertSame(6, $book->getSheetByName('Transaksi kas')->getHighestDataRow() - 1);          // 2 penjualan + 1 pembelian + 3 manual

        $this->assertDatabaseHas('activity_logs', ['module' => 'keuangan', 'action' => 'unduh']);

        // Validasi rentang & format
        $this->actingAs($this->admin)->getJson('/api/finance/export?start=2031-03-09&end=2031-03-03&format=pdf')->assertUnprocessable();
        $this->actingAs($this->admin)->getJson('/api/finance/export?start=2030-01-01&end=2031-03-03&format=pdf')->assertUnprocessable();
        $this->actingAs($this->admin)->getJson($url.'&format=csv')->assertUnprocessable();
    }
}
