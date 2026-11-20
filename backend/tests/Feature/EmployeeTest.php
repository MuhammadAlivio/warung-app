<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Tests\Concerns\WarungUsers;
use Tests\TestCase;

/**
 * Daftar Karyawan: admin mengelola akun, kasir hanya melihat.
 *
 *   DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test --filter=EmployeeTest
 */
class EmployeeTest extends TestCase
{
    use DatabaseTransactions;
    use WarungUsers;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->requirePostgres();

        $this->admin = $this->makeUser('admin');
    }

    private function body(User $u, array $override = []): array
    {
        return [
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'is_active' => $u->is_active,
            ...$override,
        ];
    }

    // ---------- Hak akses ----------

    public function test_guest_cannot_access(): void
    {
        $this->getJson('/api/employees')->assertUnauthorized();
        $this->postJson('/api/employees', [])->assertUnauthorized();
    }

    public function test_kasir_sees_a_limited_list(): void
    {
        $kasir = $this->makeUser('kasir');

        $res = $this->actingAs($kasir)->getJson('/api/employees')->assertOk();

        $row = collect($res->json('data'))->firstWhere('id', $this->admin->id);
        $this->assertSame(['id', 'name', 'role', 'is_active'], array_keys($row));
    }

    public function test_kasir_cannot_create_or_edit_anyone(): void
    {
        $kasir = $this->makeUser('kasir');
        $other = $this->makeUser('kasir');

        $this->actingAs($kasir)->postJson('/api/employees', [
            'name' => 'X', 'email' => 'x.'.uniqid().'@example.com', 'password' => 'PanjangSekali12', 'role' => 'admin',
        ])->assertForbidden();

        $this->actingAs($kasir)->putJson("/api/employees/{$other->id}", $this->body($other, ['role' => 'admin']))->assertForbidden();
        $this->actingAs($kasir)->putJson("/api/employees/{$kasir->id}", $this->body($kasir, ['role' => 'admin']))->assertForbidden();

        $this->assertSame('kasir', $kasir->fresh()->role);
    }

    public function test_admin_sees_full_details(): void
    {
        $row = collect($this->actingAs($this->admin)->getJson('/api/employees')->assertOk()->json('data'))
            ->firstWhere('id', $this->admin->id);

        foreach (['id', 'name', 'email', 'role', 'is_active', 'pending_approval', 'two_factor', 'last_login_at'] as $key) {
            $this->assertArrayHasKey($key, $row);
        }
        $this->assertArrayNotHasKey('password', $row);
        $this->assertArrayNotHasKey('two_factor_secret', $row);
    }

    // ---------- Menambah karyawan ----------

    public function test_admin_creates_kasir_by_default(): void
    {
        $email = 'karyawan.'.uniqid().'@example.com';

        $this->actingAs($this->admin)->postJson('/api/employees', [
            'name' => 'Karyawan Baru', 'email' => $email, 'password' => 'Abcd12345',
        ])->assertCreated()->assertJsonPath('data.role', 'kasir')->assertJsonPath('data.is_active', true);

        $user = User::where('email', $email)->firstOrFail();
        $this->assertTrue(Hash::check('Abcd12345', $user->password));
        $this->assertFalse($user->pending_approval);
        $this->assertTrue(ActivityLog::where('user_id', $this->admin->id)->where('action', 'tambah')->where('description', 'like', "%{$email}%")->exists());
    }

    public function test_admin_password_must_be_at_least_12_characters(): void
    {
        $email = 'admin.baru.'.uniqid().'@example.com';

        $this->actingAs($this->admin)->postJson('/api/employees', [
            'name' => 'Admin Baru', 'email' => $email, 'password' => 'Pendek12345', 'role' => 'admin',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->actingAs($this->admin)->postJson('/api/employees', [
            'name' => 'Admin Baru', 'email' => $email, 'password' => 'PanjangSekali12', 'role' => 'admin',
        ])->assertCreated()->assertJsonPath('data.role', 'admin');

        $this->assertSame('admin', User::where('email', $email)->value('role'));
    }

    public function test_create_validates_input(): void
    {
        $existing = $this->makeUser('kasir');

        $this->actingAs($this->admin)->postJson('/api/employees', ['name' => 'X', 'email' => $existing->email, 'password' => 'Abcd12345'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->actingAs($this->admin)->postJson('/api/employees', ['name' => 'X', 'email' => 'a.'.uniqid().'@example.com', 'password' => 'abc'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->actingAs($this->admin)->postJson('/api/employees', ['name' => 'X', 'email' => 'b.'.uniqid().'@example.com', 'password' => 'Abcd12345', 'role' => 'owner'])
            ->assertUnprocessable()->assertJsonValidationErrors('role');
    }

    // ---------- Mengubah karyawan ----------

    public function test_admin_edits_name_and_email(): void
    {
        $kasir = $this->makeUser('kasir');

        $this->actingAs($this->admin)->putJson("/api/employees/{$kasir->id}", $this->body($kasir, ['name' => 'Nama Diubah']))
            ->assertOk()->assertJsonPath('data.name', 'Nama Diubah');

        $this->assertSame('Nama Diubah', $kasir->fresh()->name);
    }

    public function test_update_requires_role(): void
    {
        $kasir = $this->makeUser('kasir');
        $body = $this->body($kasir);
        unset($body['role']);

        $this->actingAs($this->admin)->putJson("/api/employees/{$kasir->id}", $body)
            ->assertUnprocessable()->assertJsonValidationErrors('role');
    }

    public function test_password_reset_unlocks_the_account(): void
    {
        $kasir = $this->makeUser('kasir', ['failed_login_attempts' => 3, 'locked_until' => now()->addMinutes(10)]);

        $this->actingAs($this->admin)->putJson("/api/employees/{$kasir->id}", $this->body($kasir, ['password' => 'PasswordBaru123']))->assertOk();

        $fresh = $kasir->fresh();
        $this->assertTrue(Hash::check('PasswordBaru123', $fresh->password));
        $this->assertNull($fresh->locked_until);
        $this->assertSame(0, $fresh->failed_login_attempts);
        $this->assertTrue(ActivityLog::where('user_id', $this->admin->id)->where('description', 'like', '%reset password%')->exists());
    }

    public function test_deactivating_and_reactivating_a_kasir(): void
    {
        $kasir = $this->makeUser('kasir');

        $this->actingAs($this->admin)->putJson("/api/employees/{$kasir->id}", $this->body($kasir, ['is_active' => false]))->assertOk();
        $this->assertFalse($kasir->fresh()->is_active);

        $this->actingAs($this->admin)->putJson("/api/employees/{$kasir->id}", $this->body($kasir, ['is_active' => true]))->assertOk();
        $this->assertTrue($kasir->fresh()->is_active);
    }

    // ---------- Mengubah peran ----------

    public function test_kasir_can_be_promoted_to_admin(): void
    {
        $kasir = $this->makeUser('kasir');

        $this->actingAs($this->admin)->putJson("/api/employees/{$kasir->id}", $this->body($kasir, ['role' => 'admin']))
            ->assertOk()->assertJsonPath('data.role', 'admin');

        $this->assertSame('admin', $kasir->fresh()->role);
        $this->assertTrue(ActivityLog::where('user_id', $this->admin->id)->where('description', 'like', '%peran menjadi administrator%')->exists());
    }

    public function test_promotion_needs_a_long_password_if_one_is_set(): void
    {
        $kasir = $this->makeUser('kasir');

        $this->actingAs($this->admin)->putJson("/api/employees/{$kasir->id}", $this->body($kasir, ['role' => 'admin', 'password' => 'Abcd1234']))
            ->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->assertSame('kasir', $kasir->fresh()->role);
    }

    public function test_demoting_an_admin_removes_their_2fa(): void
    {
        $other = $this->makeUser('admin', [
            'two_factor_secret' => 'rahasia',
            'two_factor_recovery_codes' => '["x"]',
            'two_factor_confirmed_at' => now(),
        ]);

        $this->actingAs($this->admin)->putJson("/api/employees/{$other->id}", $this->body($other, ['role' => 'kasir']))->assertOk();

        $fresh = $other->fresh();
        $this->assertSame('kasir', $fresh->role);
        $this->assertNull($fresh->two_factor_secret);
        $this->assertNull($fresh->two_factor_recovery_codes);
        $this->assertNull($fresh->two_factor_confirmed_at);
    }

    public function test_admin_cannot_demote_or_deactivate_themselves(): void
    {
        $this->actingAs($this->admin)->putJson("/api/employees/{$this->admin->id}", $this->body($this->admin, ['role' => 'kasir']))
            ->assertUnprocessable();
        $this->actingAs($this->admin)->putJson("/api/employees/{$this->admin->id}", $this->body($this->admin, ['is_active' => false]))
            ->assertUnprocessable();

        $fresh = $this->admin->fresh();
        $this->assertSame('admin', $fresh->role);
        $this->assertTrue($fresh->is_active);
    }

    public function test_admin_can_still_rename_themselves(): void
    {
        $this->actingAs($this->admin)->putJson("/api/employees/{$this->admin->id}", $this->body($this->admin, ['name' => 'Nama Baru Saya']))
            ->assertOk();

        $this->assertSame('Nama Baru Saya', $this->admin->fresh()->name);
    }

    // ---------- Pendaftaran menunggu persetujuan ----------

    public function test_approving_a_pending_registration(): void
    {
        $pending = $this->makeUser('kasir', ['is_active' => false, 'pending_approval' => true]);

        $this->actingAs($this->admin)->getJson('/api/employees')
            ->assertJsonPath('data.'.$this->indexOf($pending).'.pending_approval', true);

        $this->actingAs($this->admin)->putJson("/api/employees/{$pending->id}", $this->body($pending, ['is_active' => true]))
            ->assertOk()
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.pending_approval', false);

        $this->assertTrue(ActivityLog::where('user_id', $this->admin->id)->where('description', 'like', '%menyetujui pendaftaran%')->exists());
    }

    public function test_pending_flag_clears_when_admin_rejects_by_deactivating(): void
    {
        $pending = $this->makeUser('kasir', ['is_active' => false, 'pending_approval' => true]);

        // Admin menyimpan tanpa mengubah status: tetap menunggu
        $this->actingAs($this->admin)->putJson("/api/employees/{$pending->id}", $this->body($pending, ['name' => 'Ganti Nama']))->assertOk();
        $this->assertTrue($pending->fresh()->pending_approval);

        // Disetujui lalu dinonaktifkan: tampil sebagai Nonaktif biasa, bukan menunggu
        $this->actingAs($this->admin)->putJson("/api/employees/{$pending->id}", $this->body($pending, ['is_active' => true]))->assertOk();
        $this->actingAs($this->admin)->putJson("/api/employees/{$pending->id}", $this->body($pending, ['is_active' => false]))->assertOk();
        $this->assertFalse($pending->fresh()->pending_approval);
    }

    private function indexOf(User $user): int
    {
        $ids = collect($this->actingAs($this->admin)->getJson('/api/employees')->json('data'))->pluck('id')->values();

        return $ids->search($user->id);
    }
}
