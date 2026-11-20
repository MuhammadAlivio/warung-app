<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Pembelian & Barang Masuk. Skema dari SQL (database/sql), jadi dijalankan ke Postgres dan di-rollback per tes:
 *
 *   DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test --filter=PurchaseTest
 */
class PurchaseTest extends TestCase
{
    use DatabaseTransactions;

    private User $admin;

    private User $kasir;

    private int $supplierId;

    private Product $pakan;

    private Product $pasir;

    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'pgsql') {
            $this->markTestSkipped('Butuh Postgres: DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test');
        }

        $this->admin = User::where('role', 'admin')->where('is_active', true)->firstOrFail();
        $this->kasir = User::where('role', 'kasir')->where('is_active', true)->firstOrFail();
        $this->supplierId = Supplier::create(['name' => 'Pemasok Uji '.uniqid()])->id;

        $categoryId = Category::create(['name' => 'Uji Pembelian '.uniqid()])->id;
        $make = fn (string $name, string $unit) => Product::create([
            'name' => $name.' '.uniqid(), 'category_id' => $categoryId, 'unit' => $unit,
            'buy_price' => 50000, 'sell_price' => 60000, 'min_stock' => 2,
        ])->refresh();
        $this->pakan = $make('Pakan Kucing', 'karung');
        $this->pasir = $make('Pasir Kucing', 'pcs');
    }

    private function payload(array $override = []): array
    {
        return [
            'supplier_id' => $this->supplierId,
            'purchase_no' => 'INV-UJI-'.uniqid(),
            'purchase_date' => '2026-11-10',
            'due_date' => '2026-11-17',
            'location' => 'gudang_utama',
            'items' => [
                ['product_id' => $this->pakan->id, 'qty' => 10, 'unit_price' => 45000],
                ['product_id' => $this->pasir->id, 'qty' => 4, 'unit_price' => 25000],
            ],
            'initial_payment' => 200000,
            'payment_method' => 'transfer_bank',
            ...$override,
        ];
    }

    public function test_kasir_has_no_access(): void
    {
        $this->actingAs($this->kasir);
        $this->getJson('/api/purchases')->assertForbidden();
        $this->postJson('/api/purchases', $this->payload())->assertForbidden();
        $this->getJson('/api/suppliers')->assertForbidden();
    }

    public function test_create_does_not_change_stock_and_records_initial_payment(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/purchases', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.status', 'belum_diterima')
            ->assertJsonPath('data.payment_status', 'sebagian')
            ->assertJsonPath('data.total', 550000)
            ->assertJsonPath('data.paid', 200000)
            ->assertJsonPath('data.debt', 350000)
            ->assertJsonPath('data.items.0.unit', 'karung')
            ->assertJsonPath('data.payments.0.note', 'Pembayaran awal');

        $this->assertSame(0, $this->pakan->fresh()->stock);
        $this->assertDatabaseHas('purchase_payments', ['purchase_id' => $res->json('data.id'), 'amount' => 200000, 'paid_at' => '2026-11-10']);
        $this->assertDatabaseHas('activity_logs', ['module' => 'pembelian', 'subject_id' => $res->json('data.id')]);
    }

    public function test_unpaid_purchase_status_is_belum_bayar(): void
    {
        $this->actingAs($this->admin)->postJson('/api/purchases', $this->payload(['initial_payment' => 0]))
            ->assertCreated()
            ->assertJsonPath('data.payment_status', 'belum_bayar')
            ->assertJsonCount(0, 'data.payments');
    }

    public function test_partial_then_full_receipt_adds_stock(): void
    {
        $this->actingAs($this->admin);
        $p = $this->postJson('/api/purchases', $this->payload())->json('data');
        [$pakanItem, $pasirItem] = [$p['items'][0]['id'], $p['items'][1]['id']];

        $first = $this->postJson("/api/purchases/{$p['id']}/receipts", [
            'received_at' => '2026-11-11',
            'delivery_note' => 'SJ-01',
            'items' => [['purchase_item_id' => $pakanItem, 'qty' => 6], ['purchase_item_id' => $pasirItem, 'qty' => 0]],
        ])->assertCreated()
            ->assertJsonPath('data.status', 'diterima_sebagian')
            ->assertJsonPath('data.items.0.qty_received', 6)
            ->assertJsonPath('data.receipts.0.date', '2026-11-11')
            ->assertJsonPath('data.receipts.0.received_by', $this->admin->name)
            ->assertJsonCount(1, 'data.receipts.0.items')
            ->json('data');

        $this->assertMatchesRegularExpression('/^BM-\d{4}$/', $first['receipts'][0]['receipt_no']);
        $this->assertSame(6, $this->pakan->fresh()->stock);
        $this->assertDatabaseHas('stock_movements', ['product_id' => $this->pakan->id, 'type' => 'purchase', 'qty_change' => 6, 'reference_type' => 'purchase_receipt']);

        // Melebihi sisa pesanan ditolak, stok tidak berubah
        $this->postJson("/api/purchases/{$p['id']}/receipts", [
            'received_at' => '2026-11-12', 'items' => [['purchase_item_id' => $pakanItem, 'qty' => 5]],
        ])->assertUnprocessable();
        $this->assertSame(6, $this->pakan->fresh()->stock);

        $second = $this->postJson("/api/purchases/{$p['id']}/receipts", [
            'received_at' => '2026-11-12',
            'items' => [['purchase_item_id' => $pakanItem, 'qty' => 4], ['purchase_item_id' => $pasirItem, 'qty' => 4]],
        ])->assertCreated()->assertJsonPath('data.status', 'diterima')->json('data');

        $no = fn ($r) => (int) substr($r, 3);
        $this->assertSame($no($first['receipts'][0]['receipt_no']) + 1, $no($second['receipts'][1]['receipt_no']));
        $this->assertSame(10, $this->pakan->fresh()->stock);
        $this->assertSame(4, $this->pasir->fresh()->stock);

        // Sudah lengkap: tidak bisa diterima lagi
        $this->postJson("/api/purchases/{$p['id']}/receipts", [
            'received_at' => '2026-11-13', 'items' => [['purchase_item_id' => $pakanItem, 'qty' => 1]],
        ])->assertUnprocessable();
    }

    public function test_receive_all_on_create_adds_stock_immediately(): void
    {
        $this->actingAs($this->admin)->postJson('/api/purchases', $this->payload(['receive_all' => true]))
            ->assertCreated()
            ->assertJsonPath('data.status', 'diterima')
            ->assertJsonCount(1, 'data.receipts')
            ->assertJsonPath('data.receipts.0.date', '2026-11-10');

        $this->assertSame(10, $this->pakan->fresh()->stock);
        $this->assertSame(4, $this->pasir->fresh()->stock);
    }

    public function test_receipt_with_nothing_received_is_rejected(): void
    {
        $this->actingAs($this->admin);
        $p = $this->postJson('/api/purchases', $this->payload())->json('data');

        $this->postJson("/api/purchases/{$p['id']}/receipts", [
            'received_at' => '2026-11-11', 'items' => [['purchase_item_id' => $p['items'][0]['id'], 'qty' => 0]],
        ])->assertUnprocessable()->assertJsonPath('errors.items.0', 'Isi jumlah barang yang diterima, minimal satu barang.');

        $this->postJson("/api/purchases/{$p['id']}/receipts", [
            'received_at' => '2026-11-01', 'items' => [['purchase_item_id' => $p['items'][0]['id'], 'qty' => 1]],
        ])->assertUnprocessable()->assertJsonValidationErrors('received_at');
    }

    public function test_payments_until_paid_off(): void
    {
        $this->actingAs($this->admin);
        $id = $this->postJson('/api/purchases', $this->payload())->json('data.id');

        $this->postJson("/api/purchases/{$id}/payments", ['amount' => 400000, 'paid_at' => '2026-11-12', 'method' => 'tunai'])
            ->assertUnprocessable()->assertJsonValidationErrors('amount');

        $this->postJson("/api/purchases/{$id}/payments", ['amount' => 150000, 'paid_at' => '2026-11-12', 'method' => 'tunai'])
            ->assertOk()->assertJsonPath('data.debt', 200000)->assertJsonPath('data.payments.1.note', 'Cicilan');

        $this->postJson("/api/purchases/{$id}/payments", ['amount' => 200000, 'paid_at' => '2026-11-13', 'method' => 'cek'])
            ->assertOk()->assertJsonPath('data.payment_status', 'lunas')->assertJsonPath('data.debt', 0);

        $this->postJson("/api/purchases/{$id}/payments", ['amount' => 1, 'paid_at' => '2026-11-13', 'method' => 'tunai'])
            ->assertUnprocessable();
    }

    public function test_validation_rules(): void
    {
        $this->actingAs($this->admin);
        $p = $this->payload();
        $this->postJson('/api/purchases', $p)->assertCreated();

        $this->postJson('/api/purchases', $this->payload(['purchase_no' => strtolower($p['purchase_no'])]))
            ->assertUnprocessable()->assertJsonPath('errors.purchase_no.0', 'Nomor faktur sudah dipakai');

        $this->postJson('/api/purchases', $this->payload(['items' => []]))
            ->assertUnprocessable()->assertJsonPath('errors.items.0', 'Tambahkan minimal satu barang');

        $this->postJson('/api/purchases', $this->payload(['initial_payment' => 999999999]))
            ->assertUnprocessable()->assertJsonValidationErrors('initial_payment');

        $this->postJson('/api/purchases', $this->payload(['due_date' => '2026-11-01']))
            ->assertUnprocessable()->assertJsonPath('errors.due_date.0', 'Jatuh tempo tidak boleh sebelum tanggal pembelian');
    }

    public function test_supplier_crud(): void
    {
        $this->actingAs($this->admin);
        $name = 'CV Pakan Makmur '.uniqid();

        $id = $this->postJson('/api/suppliers', ['name' => "  {$name} ", 'phone' => '0812 3456 7890', 'address' => 'Bandung'])
            ->assertCreated()->assertJsonPath('data.name', $name)->json('data.id');

        $this->postJson('/api/suppliers', ['name' => strtoupper($name)])
            ->assertUnprocessable()->assertJsonPath('errors.name.0', 'Pemasok sudah ada');

        $this->putJson("/api/suppliers/{$id}", ['name' => $name, 'phone' => 'abc'])
            ->assertUnprocessable()->assertJsonValidationErrors('phone');

        $this->putJson("/api/suppliers/{$id}", ['name' => $name, 'address' => 'Jakarta'])
            ->assertOk()->assertJsonPath('data.address', 'Jakarta');

        $this->assertContains($id, collect($this->getJson('/api/suppliers')->json('data'))->pluck('id'));
    }

    public function test_index_lists_purchases(): void
    {
        $this->actingAs($this->admin);
        $id = $this->postJson('/api/purchases', $this->payload())->json('data.id');

        $row = collect($this->getJson('/api/purchases')->assertOk()->json('data'))->firstWhere('id', $id);
        $this->assertNotNull($row);
        $this->assertSame($this->supplierId, $row['supplier']['id']);
        $this->getJson("/api/purchases/{$id}")->assertOk()->assertJsonPath('data.created_by', $this->admin->name);
    }
}
