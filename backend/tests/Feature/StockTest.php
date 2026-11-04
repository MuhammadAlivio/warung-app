<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\StockService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Modul Stok Barang. Skema dibuat lewat SQL (database/sql), bukan migration, jadi tes ini
 * dijalankan ke Postgres. Setiap tes di-rollback (DatabaseTransactions):
 *
 *   DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test --filter=StockTest
 */
class StockTest extends TestCase
{
    use DatabaseTransactions;

    private User $kasir;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'pgsql') {
            $this->markTestSkipped('Butuh Postgres: DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test');
        }

        // Akun seed (kasir@gmail.com). Kasir dipakai untuk memastikan aksesnya sama dengan admin.
        $this->kasir = User::where('role', 'kasir')->where('is_active', true)->firstOrFail();
        $this->category = Category::create(['name' => 'Uji Kategori '.uniqid()]);
    }

    private function productPayload(array $override = []): array
    {
        return [
            'name' => 'Barang Uji '.uniqid(),
            'description' => 'Deskripsi',
            'category_id' => $this->category->id,
            'buy_price' => 10000,
            'sell_price' => 12500,
            'stock' => 20,
            'min_stock' => 5,
            ...$override,
        ];
    }

    public function test_guest_cannot_access(): void
    {
        $this->getJson('/api/products')->assertUnauthorized();
        $this->getJson('/api/categories')->assertUnauthorized();
    }

    public function test_kasir_can_create_product_and_initial_stock_is_recorded(): void
    {
        $res = $this->actingAs($this->kasir)->postJson('/api/products', $this->productPayload(['name' => 'Pakan Kucing Uji']))
            ->assertCreated()
            ->assertJsonPath('data.name', 'Pakan Kucing Uji')
            ->assertJsonPath('data.stock', 20)
            ->assertJsonPath('data.unit', 'pcs')
            ->assertJsonPath('data.category', $this->category->name);

        $id = $res->json('data.id');

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $id, 'type' => 'initial', 'qty_change' => 20, 'stock_after' => 20, 'user_id' => $this->kasir->id,
        ]);
        $this->assertDatabaseHas('activity_logs', ['module' => 'stok', 'action' => 'tambah', 'subject_id' => $id]);
    }

    public function test_initial_stock_zero_creates_no_movement(): void
    {
        $id = $this->actingAs($this->kasir)->postJson('/api/products', $this->productPayload(['stock' => 0]))
            ->assertCreated()
            ->assertJsonPath('data.stock', 0)
            ->json('data.id');

        $this->assertDatabaseMissing('stock_movements', ['product_id' => $id]);
    }

    public function test_validation_messages_are_indonesian(): void
    {
        $this->actingAs($this->kasir)->postJson('/api/products', ['name' => 'A', 'buy_price' => -1, 'stock' => 'abc'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.name.0', 'Nama barang minimal 2 karakter')
            ->assertJsonPath('errors.category_id.0', 'Pilih kategori')
            ->assertJsonPath('errors.buy_price.0', 'Harus berupa angka bulat, minimal 0')
            ->assertJsonPath('errors.stock.0', 'Harus berupa angka bulat, minimal 0');
    }

    public function test_duplicate_name_is_rejected_case_insensitive(): void
    {
        $this->actingAs($this->kasir)->postJson('/api/products', $this->productPayload(['name' => 'Pelet Ikan Uji']))->assertCreated();

        $this->postJson('/api/products', $this->productPayload(['name' => '  pelet   ikan UJI ']))
            ->assertUnprocessable()
            ->assertJsonPath('errors.name.0', 'Nama barang sudah ada');
    }

    public function test_update_stock_records_adjustment(): void
    {
        $id = $this->actingAs($this->kasir)->postJson('/api/products', $this->productPayload())->json('data.id');

        $this->putJson("/api/products/{$id}", $this->productPayload(['name' => 'Nama Baru Uji', 'stock' => 12, 'sell_price' => 15000]))
            ->assertOk()
            ->assertJsonPath('data.stock', 12)
            ->assertJsonPath('data.sell_price', 15000);

        $this->assertDatabaseHas('stock_movements', ['product_id' => $id, 'type' => 'adjustment', 'qty_change' => -8, 'stock_after' => 12]);
    }

    public function test_update_without_stock_leaves_stock_untouched(): void
    {
        $id = $this->actingAs($this->kasir)->postJson('/api/products', $this->productPayload())->json('data.id');
        $payload = $this->productPayload(['min_stock' => 9]);
        unset($payload['stock']);

        $this->putJson("/api/products/{$id}", $payload)->assertOk()->assertJsonPath('data.stock', 20)->assertJsonPath('data.min_stock', 9);
        $this->assertDatabaseMissing('stock_movements', ['product_id' => $id, 'type' => 'adjustment']);
    }

    public function test_delete_deactivates_and_hides_product(): void
    {
        $id = $this->actingAs($this->kasir)->postJson('/api/products', $this->productPayload(['name' => 'Hapus Uji']))->json('data.id');

        $this->deleteJson("/api/products/{$id}")->assertOk();

        $this->assertDatabaseHas('products', ['id' => $id, 'is_active' => false]);
        $this->assertNotContains($id, collect($this->getJson('/api/products')->json('data'))->pluck('id'));
        $this->putJson("/api/products/{$id}", $this->productPayload())->assertNotFound();

        // Nama yang sudah dihapus boleh dipakai lagi
        $this->postJson('/api/products', $this->productPayload(['name' => 'Hapus Uji']))->assertCreated();
    }

    public function test_index_returns_all_active_products_without_pagination(): void
    {
        $this->actingAs($this->kasir);
        foreach (range(1, 8) as $i) {
            $this->postJson('/api/products', $this->productPayload(['name' => "Show All {$i} ".uniqid()]))->assertCreated();
        }

        $data = $this->getJson('/api/products?category_id='.$this->category->id)->assertOk()->json('data');

        $this->assertCount(8, $data);
        $this->assertArrayNotHasKey('last_page', $this->getJson('/api/products')->json());
    }

    public function test_stock_service_never_goes_negative(): void
    {
        // `stock` tidak fillable, jadi barang dibuat dengan stok default 0
        $product = Product::create($this->productPayload())->refresh();
        $service = app(StockService::class);
        $service->adjust($product, 3, 'adjustment', $this->kasir);

        try {
            $service->adjust($product, -4, 'sale', $this->kasir);
            $this->fail('Seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertStringContainsString('tidak cukup', $e->errors()['stock'][0]);
        }

        $this->assertSame(3, $product->fresh()->stock);
        $service->adjust($product, -3, 'sale', $this->kasir, null, 'sale', 99);
        $this->assertSame(0, $product->fresh()->stock);
        $this->assertDatabaseHas('stock_movements', ['product_id' => $product->id, 'type' => 'sale', 'reference_id' => 99, 'stock_after' => 0]);
    }

    public function test_category_crud_and_delete_guard(): void
    {
        $this->actingAs($this->kasir);

        $id = $this->postJson('/api/categories', ['name' => '  Pakan   Burung Uji '])
            ->assertCreated()->assertJsonPath('data.name', 'Pakan Burung Uji')->json('data.id');

        $this->postJson('/api/categories', ['name' => 'pakan burung uji'])
            ->assertUnprocessable()->assertJsonPath('errors.name.0', 'Kategori sudah ada');

        $this->putJson("/api/categories/{$id}", ['name' => 'Pakan Unggas Uji'])->assertOk()->assertJsonPath('data.name', 'Pakan Unggas Uji');

        $this->postJson('/api/products', $this->productPayload(['category_id' => $id]))->assertCreated();
        $this->deleteJson("/api/categories/{$id}")->assertStatus(409);

        $list = collect($this->getJson('/api/categories')->json('data'))->firstWhere('id', $id);
        $this->assertSame(1, $list['product_count']);

        $empty = $this->postJson('/api/categories', ['name' => 'Kosong Uji '.uniqid()])->json('data.id');
        $this->deleteJson("/api/categories/{$empty}")->assertOk();
        $this->assertDatabaseMissing('categories', ['id' => $empty]);
    }

    public function test_image_upload_show_and_delete(): void
    {
        Storage::fake('local');
        $id = $this->actingAs($this->kasir)->postJson('/api/products', $this->productPayload())->json('data.id');

        $this->post("/api/products/{$id}/image", ['image' => UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertUnprocessable()->assertJsonPath('errors.image.0', 'Format harus JPG, PNG, atau WebP');

        // PNG 1x1 asli (tanpa butuh ekstensi GD seperti UploadedFile::fake()->image())
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        $url = $this->post("/api/products/{$id}/image", ['image' => UploadedFile::fake()->createWithContent('foto.png', $png)], ['Accept' => 'application/json'])
            ->assertOk()->json('data.image_url');

        $this->assertStringStartsWith("/api/products/{$id}/image", $url);
        $path = Product::find($id)->image_path;
        Storage::disk('local')->assertExists($path);
        $this->get($url)->assertOk();

        $this->deleteJson("/api/products/{$id}/image")->assertOk()->assertJsonPath('data.image_url', null);
        Storage::disk('local')->assertMissing($path);
    }

    public function test_movements_endpoint(): void
    {
        $id = $this->actingAs($this->kasir)->postJson('/api/products', $this->productPayload())->json('data.id');
        $this->putJson("/api/products/{$id}", $this->productPayload(['stock' => 25]));

        $this->getJson("/api/products/{$id}/movements")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.type', 'adjustment')
            ->assertJsonPath('data.0.qty_change', 5)
            ->assertJsonPath('data.1.type', 'initial')
            ->assertJsonPath('data.1.user_name', $this->kasir->name);
    }
}
