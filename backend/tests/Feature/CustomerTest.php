<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Customer;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\WarungUsers;
use Tests\TestCase;

/**
 * Daftar Pelanggan (admin dan kasir aksesnya sama).
 *
 *   DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test --filter=CustomerTest
 */
class CustomerTest extends TestCase
{
    use DatabaseTransactions;
    use WarungUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->requirePostgres();
    }

    private function payload(array $override = []): array
    {
        return [
            'name' => 'Pelanggan Uji '.uniqid(),
            'phone' => '0812 3456 7890',
            'address' => 'Jl. Uji No. 1',
            'note' => 'Langganan lama',
            ...$override,
        ];
    }

    public function test_guest_cannot_access(): void
    {
        $this->getJson('/api/customers')->assertUnauthorized();
        $this->postJson('/api/customers', $this->payload())->assertUnauthorized();
        $this->putJson('/api/customers/1', $this->payload())->assertUnauthorized();
        $this->deleteJson('/api/customers/1')->assertUnauthorized();
    }

    public function test_kasir_and_admin_can_list_customers(): void
    {
        $customer = Customer::create(['name' => 'Pelanggan Daftar '.uniqid(), 'notes' => 'catatan']);

        foreach (['kasir', 'admin'] as $role) {
            $res = $this->actingAs($this->makeUser($role))->getJson('/api/customers')->assertOk();

            $row = collect($res->json('data'))->firstWhere('id', $customer->id);
            $this->assertSame(['id', 'name', 'phone', 'address', 'note'], array_keys($row));
            $this->assertSame('catatan', $row['note']);
        }
    }

    public function test_create_maps_note_to_notes_and_is_logged(): void
    {
        $kasir = $this->makeUser('kasir');
        $payload = $this->payload();

        $id = $this->actingAs($kasir)->postJson('/api/customers', $payload)
            ->assertCreated()
            ->assertJsonPath('data.name', $payload['name'])
            ->assertJsonPath('data.note', 'Langganan lama')
            ->json('data.id');

        $this->assertSame('Langganan lama', DB::table('customers')->where('id', $id)->value('notes'));

        $log = ActivityLog::where('user_id', $kasir->id)->where('module', 'pelanggan')->where('action', 'tambah')->first();
        $this->assertNotNull($log);
        $this->assertStringContainsString($payload['name'], $log->description);
    }

    public function test_optional_fields_can_be_empty(): void
    {
        $this->actingAs($this->makeUser('kasir'))
            ->postJson('/api/customers', ['name' => 'Hanya Nama '.uniqid(), 'phone' => '', 'address' => '', 'note' => ''])
            ->assertCreated()
            ->assertJsonPath('data.phone', null);
    }

    public function test_validation_rejects_bad_input(): void
    {
        $kasir = $this->makeUser('kasir');

        $this->actingAs($kasir)->postJson('/api/customers', $this->payload(['name' => '']))
            ->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->actingAs($kasir)->postJson('/api/customers', $this->payload(['name' => str_repeat('a', 81)]))
            ->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->actingAs($kasir)->postJson('/api/customers', $this->payload(['phone' => '123']))
            ->assertUnprocessable()
            ->assertJsonPath('errors.phone.0', 'Format nomor tidak valid, contoh: 0812 3456 7890');

        $this->actingAs($kasir)->postJson('/api/customers', $this->payload(['address' => str_repeat('a', 201)]))
            ->assertUnprocessable()->assertJsonValidationErrors('address');

        $this->actingAs($kasir)->postJson('/api/customers', $this->payload(['note' => str_repeat('a', 301)]))
            ->assertUnprocessable()->assertJsonValidationErrors('note');
    }

    public function test_update_changes_the_customer_and_is_logged(): void
    {
        $kasir = $this->makeUser('kasir');
        $customer = Customer::create(['name' => 'Nama Lama '.uniqid()]);

        $this->actingAs($kasir)->putJson("/api/customers/{$customer->id}", $this->payload(['name' => 'Nama Baru Uji']))
            ->assertOk()
            ->assertJsonPath('data.name', 'Nama Baru Uji');

        $this->assertSame('Nama Baru Uji', $customer->fresh()->name);
        $this->assertTrue(ActivityLog::where('user_id', $kasir->id)->where('module', 'pelanggan')->where('action', 'ubah')->exists());
    }

    public function test_customer_without_transactions_can_be_deleted(): void
    {
        $kasir = $this->makeUser('kasir');
        $customer = Customer::create(['name' => 'Akan Dihapus '.uniqid()]);

        $this->actingAs($kasir)->deleteJson("/api/customers/{$customer->id}")->assertOk();

        $this->assertNull(Customer::find($customer->id));
        $this->assertTrue(ActivityLog::where('user_id', $kasir->id)->where('module', 'pelanggan')->where('action', 'hapus')->exists());
    }

    public function test_customer_with_transactions_cannot_be_deleted(): void
    {
        $kasir = $this->makeUser('kasir');
        $customer = Customer::create(['name' => 'Punya Transaksi '.uniqid()]);

        $categoryId = Category::create(['name' => 'Uji Pelanggan '.uniqid()])->id;
        $productId = DB::table('products')->insertGetId([
            'name' => 'Barang Uji '.uniqid(), 'category_id' => $categoryId, 'buy_price' => 5000, 'sell_price' => 10000,
            'stock' => 10, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs($kasir)->postJson('/api/sales', [
            'customer_id' => $customer->id, 'method' => 'Tunai', 'cash' => 10000, 'items' => [['product_id' => $productId, 'qty' => 1]],
        ])->assertCreated();

        $this->actingAs($kasir)->deleteJson("/api/customers/{$customer->id}")
            ->assertStatus(409)
            ->assertJsonPath('message', "Pelanggan {$customer->name} punya 1 transaksi, jadi tidak bisa dihapus.");

        $this->assertNotNull(Customer::find($customer->id));
        $this->assertFalse(ActivityLog::where('user_id', $kasir->id)->where('action', 'hapus')->exists());
    }

    public function test_unknown_customer_returns_404(): void
    {
        $this->actingAs($this->makeUser('kasir'))->deleteJson('/api/customers/999999999')->assertNotFound();
    }
}
