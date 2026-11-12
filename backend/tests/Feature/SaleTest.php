<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Kasir + Riwayat Transaksi. Skema dari SQL (database/sql), jadi dijalankan ke Postgres dan di-rollback per tes:
 *
 *   DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test --filter=SaleTest
 */
class SaleTest extends TestCase
{
    use DatabaseTransactions;

    private User $kasir;

    private int $customerId;

    private int $categoryId;

    private int $beras;

    private int $minyak;

    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'pgsql') {
            $this->markTestSkipped('Butuh Postgres: DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test');
        }

        $this->kasir = User::where('role', 'kasir')->where('is_active', true)->firstOrFail();

        $this->categoryId = Category::create(['name' => 'Uji Riwayat '.uniqid()])->id;
        $other = Category::create(['name' => 'Uji Riwayat Lain '.uniqid()])->id;

        $this->beras = $this->product('Beras Uji '.uniqid(), $this->categoryId, 10000, 50);
        $this->minyak = $this->product('Minyak Uji '.uniqid(), $other, 20000, 5);

        $this->customerId = DB::table('customers')->insertGetId([
            'name' => 'Siti Uji Riwayat', 'phone' => '0813-9999-1234', 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function product(string $name, int $categoryId, int $price, int $stock): int
    {
        return DB::table('products')->insertGetId([
            'name' => $name, 'category_id' => $categoryId, 'buy_price' => $price / 2, 'sell_price' => $price,
            'stock' => $stock, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function stock(int $productId): int
    {
        return (int) DB::table('products')->where('id', $productId)->value('stock');
    }

    private function checkout(array $items, int $cash, ?int $customerId = null): array
    {
        return $this->actingAs($this->kasir)->postJson('/api/sales', [
            'customer_id' => $customerId, 'method' => 'Tunai', 'cash' => $cash, 'items' => $items,
        ])->assertCreated()->json('data');
    }

    public function test_kasir_saves_sale_cuts_stock_and_records_payment(): void
    {
        $tx = $this->checkout([['product_id' => $this->beras, 'qty' => 3], ['product_id' => $this->minyak, 'qty' => 1]], 60000);

        $this->assertSame(50000, $tx['total']);
        $this->assertSame(50000, $tx['paid']);
        $this->assertSame(10000, $tx['change']);
        $this->assertSame('Lunas', $tx['status']);
        $this->assertMatchesRegularExpression('/^TRX-\d{6}-\d{3,}$/', $tx['no']);
        $this->assertSame(47, $this->stock($this->beras));
        $this->assertSame(4, $this->stock($this->minyak));
        $this->assertSame(1, DB::table('sale_payments')->where('sale_id', $tx['id'])->count());
    }

    public function test_price_comes_from_database_not_client(): void
    {
        $tx = $this->checkout([['product_id' => $this->beras, 'qty' => 1, 'price' => 1]], 10000);

        $this->assertSame(10000, $tx['total']);
    }

    public function test_unpaid_sale_requires_customer(): void
    {
        $this->actingAs($this->kasir)->postJson('/api/sales', [
            'method' => 'Tunai', 'cash' => 0, 'items' => [['product_id' => $this->beras, 'qty' => 1]],
        ])->assertUnprocessable()->assertJsonValidationErrors('customer_id');
    }

    public function test_stock_cannot_go_negative(): void
    {
        $this->actingAs($this->kasir)->postJson('/api/sales', [
            'method' => 'Tunai', 'cash' => 999999, 'items' => [['product_id' => $this->minyak, 'qty' => 6]],
        ])->assertUnprocessable()->assertJsonValidationErrors('stock');

        $this->assertSame(5, $this->stock($this->minyak));
    }

    public function test_list_filters_by_search_and_category(): void
    {
        $withCustomer = $this->checkout([['product_id' => $this->beras, 'qty' => 1]], 0, $this->customerId);
        $other = $this->checkout([['product_id' => $this->minyak, 'qty' => 1]], 20000);

        $ids = fn (string $query) => collect($this->actingAs($this->kasir)->getJson('/api/sales?per_page=100&'.$query)
            ->assertOk()->json('data'))->pluck('id')->all();

        // Cari nama pelanggan, no. HP, dan nomor transaksi lewat kotak cari yang sama
        $this->assertContains($withCustomer['id'], $ids('q=siti uji'));
        $this->assertNotContains($other['id'], $ids('q=siti uji'));
        $this->assertContains($withCustomer['id'], $ids('q=99991234'));
        $this->assertContains($other['id'], $ids('q='.$other['no']));

        // Jenis barang
        $this->assertContains($withCustomer['id'], $ids('category_id='.$this->categoryId));
        $this->assertNotContains($other['id'], $ids('category_id='.$this->categoryId));

        // Status
        $this->assertContains($withCustomer['id'], $ids('status=Belum Lunas'));
        $this->assertNotContains($other['id'], $ids('status=Belum Lunas'));
    }

    public function test_edit_items_adjusts_stock_and_logs_history(): void
    {
        $tx = $this->checkout([['product_id' => $this->beras, 'qty' => 5]], 0, $this->customerId);

        $res = $this->actingAs($this->kasir)->putJson("/api/sales/{$tx['id']}/items", [
            'items' => [['product_id' => $this->beras, 'qty' => 2], ['product_id' => $this->minyak, 'qty' => 1]],
            'reason' => 'Pelanggan mengurangi beras',
        ])->assertOk()->json('data');

        $this->assertSame(40000, $res['total']);
        $this->assertSame(48, $this->stock($this->beras));
        $this->assertSame(4, $this->stock($this->minyak));
        $this->assertSame('edit', $res['history'][0]['type']);
    }

    public function test_edit_rejects_total_below_paid(): void
    {
        $tx = $this->checkout([['product_id' => $this->beras, 'qty' => 3]], 30000);

        $this->actingAs($this->kasir)->putJson("/api/sales/{$tx['id']}/items", [
            'items' => [['product_id' => $this->beras, 'qty' => 1]], 'reason' => 'Kurangi barang',
        ])->assertUnprocessable()->assertJsonValidationErrors('items');

        $this->assertSame(47, $this->stock($this->beras));
    }

    public function test_payment_settles_sale(): void
    {
        $tx = $this->checkout([['product_id' => $this->beras, 'qty' => 2]], 5000, $this->customerId);

        $this->actingAs($this->kasir)->postJson("/api/sales/{$tx['id']}/payments", [
            'date' => now('Asia/Jakarta')->toDateString(), 'method' => 'TF', 'amount' => 20000,
        ])->assertUnprocessable()->assertJsonValidationErrors('amount');

        $res = $this->actingAs($this->kasir)->postJson("/api/sales/{$tx['id']}/payments", [
            'date' => now('Asia/Jakarta')->toDateString(), 'method' => 'TF', 'amount' => 15000, 'note' => 'Transfer BCA',
        ])->assertOk()->json('data');

        $this->assertSame('Lunas', $res['status']);
        $this->assertSame(20000, $res['paid']);
        $this->assertCount(2, $res['payments']);
        $this->assertSame('payment', $res['history'][0]['type']);
    }

    public function test_kasir_can_cancel_and_stock_returns(): void
    {
        $tx = $this->checkout([['product_id' => $this->beras, 'qty' => 4]], 40000);

        $res = $this->actingAs($this->kasir)->postJson("/api/sales/{$tx['id']}/cancel", ['reason' => 'Pelanggan batal beli'])
            ->assertOk()->json('data');

        $this->assertTrue($res['cancelled']);
        $this->assertSame('Dibatalkan', $res['status']);
        $this->assertSame(50, $this->stock($this->beras));

        // Transaksi batal tidak bisa diubah lagi
        $this->actingAs($this->kasir)->postJson("/api/sales/{$tx['id']}/cancel", ['reason' => 'Batal lagi dong'])
            ->assertUnprocessable();
    }

    public function test_summary_excludes_cancelled(): void
    {
        $before = $this->actingAs($this->kasir)->getJson('/api/sales/summary')->assertOk()->json('data');

        $this->checkout([['product_id' => $this->beras, 'qty' => 1]], 10000);
        $this->checkout([['product_id' => $this->beras, 'qty' => 2]], 5000, $this->customerId);
        $batal = $this->checkout([['product_id' => $this->beras, 'qty' => 3]], 30000);
        $this->actingAs($this->kasir)->postJson("/api/sales/{$batal['id']}/cancel", ['reason' => 'Salah input'])->assertOk();

        $after = $this->actingAs($this->kasir)->getJson('/api/sales/summary')->assertOk()->json('data');

        $this->assertSame(30000, $after['net'] - $before['net']);
        $this->assertSame(10000, $after['lunas'] - $before['lunas']);
        $this->assertSame(15000, $after['unpaid'] - $before['unpaid']);
        $this->assertSame(1, $after['unpaid_count'] - $before['unpaid_count']);
    }
}
