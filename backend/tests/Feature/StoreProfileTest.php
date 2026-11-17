<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Pengaturan Profil Toko. Skema dari SQL (database/sql), jadi dijalankan ke Postgres dan di-rollback per tes:
 *
 *   DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test --filter=StoreProfileTest
 */
class StoreProfileTest extends TestCase
{
    use DatabaseTransactions;

    private User $admin;

    private User $kasir;

    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'pgsql') {
            $this->markTestSkipped('Butuh Postgres: DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test');
        }

        // Jika 003_profil_toko.sql belum dijalankan, buat tabelnya di dalam transaksi tes (ikut di-rollback)
        if (! Schema::hasTable('store_profiles')) {
            $sql = file_get_contents(database_path('sql/003_profil_toko.sql'));
            DB::unprepared(preg_replace('/^\s*(BEGIN|COMMIT);\s*$/m', '', $sql));
        }

        $this->admin = User::where('role', 'admin')->where('is_active', true)->firstOrFail();
        $this->kasir = User::where('role', 'kasir')->where('is_active', true)->firstOrFail();
    }

    private function save(User $user, array $fields): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($user)->post('/api/store-profile', $fields, ['Accept' => 'application/json']);
    }

    public function test_kasir_can_read_profile_but_cannot_change_it(): void
    {
        $this->actingAs($this->kasir)->getJson('/api/store-profile')
            ->assertOk()
            ->assertJsonStructure(['data' => ['name', 'phone', 'address', 'logo_url', 'updated_at']]);

        $this->save($this->kasir, ['name' => 'Toko Kasir'])->assertForbidden();
        $this->assertNotSame('Toko Kasir', DB::table('store_profiles')->where('id', 1)->value('name'));
    }

    public function test_admin_saves_profile_and_it_is_logged(): void
    {
        $this->save($this->admin, [
            'name' => '  Toko   Uji Profil ',
            'phone' => '(022) 123-4567',
            'address' => 'Jl. Uji No. 1, Bandung',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Toko Uji Profil')
            ->assertJsonPath('data.phone', '(022) 123-4567')
            ->assertJsonPath('data.address', 'Jl. Uji No. 1, Bandung');

        // Kasir langsung membaca profil yang sama (dipakai di struk)
        $this->actingAs($this->kasir)->getJson('/api/store-profile')->assertJsonPath('data.name', 'Toko Uji Profil');

        $this->assertDatabaseHas('store_profiles', ['id' => 1, 'updated_by' => $this->admin->id]);
        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $this->admin->id, 'module' => 'pengaturan', 'action' => 'ubah', 'description' => 'Mengubah profil toko',
        ]);
    }

    public function test_validation_messages(): void
    {
        $this->save($this->admin, ['name' => '   '])->assertStatus(422)->assertJsonValidationErrors(['name' => 'Nama toko wajib diisi']);
        $this->save($this->admin, ['name' => 'Toko', 'phone' => '0812-abc'])->assertStatus(422)->assertJsonValidationErrors('phone');
        $this->save($this->admin, ['name' => str_repeat('a', 101)])->assertStatus(422)->assertJsonValidationErrors('name');
        $this->save($this->admin, ['name' => 'Toko', 'address' => str_repeat('a', 301)])->assertStatus(422)->assertJsonValidationErrors('address');
    }

    public function test_logo_upload_is_served_and_kept_when_not_resent(): void
    {
        $png = UploadedFile::fake()->image('logo.png', 400, 400);

        $res = $this->save($this->admin, ['name' => 'Toko Logo', 'logo' => $png])->assertOk();
        $logoUrl = $res->json('data.logo_url');
        $this->assertStringStartsWith('/api/store-profile/logo?v=', $logoUrl);

        $logo = $this->actingAs($this->kasir)->get('/api/store-profile/logo')->assertOk();
        $this->assertSame('image/png', $logo->headers->get('Content-Type'));
        $this->assertSame(file_get_contents($png->getRealPath()), $logo->getContent());
        $this->assertDatabaseHas('activity_logs', ['module' => 'pengaturan', 'description' => 'Mengubah profil toko dan logo']);

        // Simpan tanpa field logo: logo lama tetap ada
        $this->save($this->admin, ['name' => 'Toko Logo 2'])->assertOk();
        $this->assertNotNull($this->actingAs($this->admin)->getJson('/api/store-profile')->json('data.logo_url'));
        $this->actingAs($this->admin)->get('/api/store-profile/logo')->assertOk();
    }

    public function test_admin_can_remove_logo(): void
    {
        $this->save($this->admin, ['name' => 'Toko Logo', 'logo' => UploadedFile::fake()->image('logo.png')])->assertOk();

        $this->save($this->admin, ['name' => 'Toko Logo', 'remove_logo' => '1'])
            ->assertOk()
            ->assertJsonPath('data.logo_url', null);

        $this->actingAs($this->kasir)->get('/api/store-profile/logo')->assertNotFound();
        $this->assertDatabaseHas('store_profiles', ['id' => 1, 'logo' => null, 'logo_mime' => null]);
        $this->assertDatabaseHas('activity_logs', ['module' => 'pengaturan', 'description' => 'Mengubah profil toko dan menghapus logo']);

        // Logo baru + remove_logo sekaligus: logo baru yang dipakai
        $this->save($this->admin, ['name' => 'Toko Logo', 'remove_logo' => '1', 'logo' => UploadedFile::fake()->image('baru.jpg')])
            ->assertOk();
        $this->actingAs($this->admin)->get('/api/store-profile/logo')->assertOk()->assertHeader('Content-Type', 'image/jpeg');

        // Kasir tetap tidak bisa menghapus logo
        $this->save($this->kasir, ['name' => 'Toko Logo', 'remove_logo' => '1'])->assertForbidden();
        $this->actingAs($this->admin)->get('/api/store-profile/logo')->assertOk();
    }

    public function test_logo_must_be_png_or_jpg_and_at_most_2mb(): void
    {
        $this->save($this->admin, ['name' => 'Toko', 'logo' => UploadedFile::fake()->image('logo.gif')])
            ->assertStatus(422)->assertJsonValidationErrors(['logo' => 'Format logo harus PNG atau JPG.']);

        $this->save($this->admin, ['name' => 'Toko', 'logo' => UploadedFile::fake()->create('logo.pdf', 10, 'application/pdf')])
            ->assertStatus(422)->assertJsonValidationErrors('logo');

        $this->save($this->admin, ['name' => 'Toko', 'logo' => UploadedFile::fake()->image('besar.jpg')->size(2049)])
            ->assertStatus(422)->assertJsonValidationErrors(['logo' => 'Ukuran logo maksimal 2 MB.']);
    }

    public function test_logo_endpoint_returns_404_without_logo(): void
    {
        DB::table('store_profiles')->where('id', 1)->update(['logo' => null, 'logo_mime' => null]);

        $this->actingAs($this->kasir)->get('/api/store-profile/logo')->assertNotFound();
        $this->actingAs($this->kasir)->getJson('/api/store-profile')->assertJsonPath('data.logo_url', null);
    }
}
