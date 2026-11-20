<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\Concerns\WarungUsers;
use Tests\TestCase;

/**
 * Login, 2FA admin, batas percobaan, logout, dan pendaftaran mandiri.
 *
 *   DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test --filter=AuthTest
 */
class AuthTest extends TestCase
{
    use DatabaseTransactions;
    use WarungUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->requirePostgres();

        // Frontend (Vite) memanggil API sebagai request "stateful" (cookie sesi)
        config(['sanctum.stateful' => ['localhost:5173']]);
        $this->withHeaders(['Origin' => 'http://localhost:5173', 'Referer' => 'http://localhost:5173/']);
    }

    private function adminWith2fa(): array
    {
        $secret = (new Google2FA)->generateSecretKey();
        $admin = $this->makeUser('admin', [
            'two_factor_secret' => Crypt::encryptString($secret),
            'two_factor_confirmed_at' => now(),
        ]);

        return [$admin, $secret];
    }

    private function otp(string $secret): string
    {
        return (new Google2FA)->getCurrentOtp($secret);
    }

    // ---------- Login karyawan (kasir) ----------

    public function test_kasir_logs_in_without_2fa(): void
    {
        $kasir = $this->makeUser('kasir');

        $this->postJson('/api/login', ['email' => $kasir->email, 'password' => 'PasswordUji12345'])
            ->assertOk()
            ->assertJsonPath('needs_2fa', false)
            ->assertJsonPath('user.role', 'kasir')
            ->assertJsonMissingPath('user.password');

        $this->assertAuthenticatedAs($kasir, 'web');
        $this->assertNotNull($kasir->fresh()->last_login_at);
        $this->assertTrue(ActivityLog::where('user_id', $kasir->id)->where('module', 'auth')->where('action', 'login')->exists());
        $this->assertTrue(DB::table('login_logs')->where('user_id', $kasir->id)->where('status', 'berhasil')->exists());
    }

    public function test_wrong_password_is_rejected_and_counted(): void
    {
        $kasir = $this->makeUser('kasir');

        $this->postJson('/api/login', ['email' => $kasir->email, 'password' => 'salah'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Email atau password salah');

        $this->assertGuest('web');
        $this->assertSame(1, $kasir->fresh()->failed_login_attempts);
        $this->assertTrue(DB::table('login_logs')->where('user_id', $kasir->id)->where('status', 'gagal')->where('alasan', 'password_salah')->exists());
    }

    public function test_unknown_email_gets_same_message_as_wrong_password(): void
    {
        $this->postJson('/api/login', ['email' => 'tidak.ada.'.uniqid().'@example.com', 'password' => 'apa saja'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Email atau password salah');
    }

    public function test_account_locks_after_five_failed_attempts(): void
    {
        $kasir = $this->makeUser('kasir');

        foreach (range(1, 5) as $_) {
            $this->postJson('/api/login', ['email' => $kasir->email, 'password' => 'salah'])->assertUnprocessable();
        }

        // Walau password benar, akun yang terkunci ditolak
        $this->postJson('/api/login', ['email' => $kasir->email, 'password' => 'PasswordUji12345'])
            ->assertStatus(423);

        $this->assertNotNull($kasir->fresh()->locked_until);
        $this->assertGuest('web');
    }

    public function test_successful_login_resets_failed_attempts(): void
    {
        $kasir = $this->makeUser('kasir', ['failed_login_attempts' => 3]);

        $this->postJson('/api/login', ['email' => $kasir->email, 'password' => 'PasswordUji12345'])->assertOk();

        $this->assertSame(0, $kasir->fresh()->failed_login_attempts);
    }

    public function test_deactivated_account_cannot_login(): void
    {
        $kasir = $this->makeUser('kasir', ['is_active' => false]);

        $this->postJson('/api/login', ['email' => $kasir->email, 'password' => 'PasswordUji12345'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Akun dinonaktifkan. Hubungi administrator.');
    }

    public function test_pending_account_gets_waiting_message(): void
    {
        $kasir = $this->makeUser('kasir', ['is_active' => false, 'pending_approval' => true]);

        $this->postJson('/api/login', ['email' => $kasir->email, 'password' => 'PasswordUji12345'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Akun Anda masih menunggu persetujuan administrator.');

        $this->assertTrue(DB::table('login_logs')->where('email_dicoba', $kasir->email)->where('alasan', 'menunggu_persetujuan')->exists());
    }

    public function test_login_validates_input(): void
    {
        $this->postJson('/api/login', ['email' => 'bukan-email', 'password' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    }

    // ---------- Login admin dan 2FA ----------

    public function test_admin_login_page_rejects_kasir(): void
    {
        $kasir = $this->makeUser('kasir');

        $this->postJson('/api/login', ['email' => $kasir->email, 'password' => 'PasswordUji12345', 'admin_only' => true])
            ->assertForbidden();

        $this->assertGuest('web');
    }

    public function test_admin_must_pass_2fa_before_being_logged_in(): void
    {
        [$admin] = $this->adminWith2fa();

        $this->postJson('/api/login', ['email' => $admin->email, 'password' => 'PasswordUji12345', 'admin_only' => true])
            ->assertOk()
            ->assertJsonPath('needs_2fa', true)
            ->assertJsonPath('needs_setup', false)
            ->assertSessionHas('2fa.user_id', $admin->id);

        // Password benar saja belum cukup: belum login penuh
        $this->assertGuest('web');
    }

    public function test_admin_without_2fa_is_sent_to_setup(): void
    {
        $admin = $this->makeUser('admin');

        $this->postJson('/api/login', ['email' => $admin->email, 'password' => 'PasswordUji12345'])
            ->assertOk()
            ->assertJsonPath('needs_2fa', true)
            ->assertJsonPath('needs_setup', true);

        $this->assertGuest('web');
    }

    public function test_2fa_setup_and_confirm_activates_it_and_returns_recovery_codes(): void
    {
        $admin = $this->makeUser('admin');

        $uri = $this->withSession(['2fa.user_id' => $admin->id])
            ->postJson('/api/2fa/setup')->assertOk()->json('otpauth_uri');

        $this->assertStringStartsWith('otpauth://totp/Warung:', $uri);
        $secret = Crypt::decryptString($admin->fresh()->two_factor_secret);

        $this->withSession(['2fa.user_id' => $admin->id])
            ->postJson('/api/2fa/confirm', ['otp' => '000000'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Kode salah atau kedaluwarsa. Coba lagi.');
        $this->assertGuest('web');

        $codes = $this->withSession(['2fa.user_id' => $admin->id])
            ->postJson('/api/2fa/confirm', ['otp' => $this->otp($secret)])
            ->assertOk()
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonCount(8, 'recovery_codes')
            ->json('recovery_codes');

        $this->assertAuthenticatedAs($admin, 'web');
        $this->assertNotNull($admin->fresh()->two_factor_confirmed_at);

        // Kode pemulihan disimpan sebagai hash, bukan teks asli
        $stored = $admin->fresh()->two_factor_recovery_codes;
        $this->assertStringNotContainsString($codes[0], $stored);
    }

    public function test_2fa_setup_is_refused_when_already_active(): void
    {
        [$admin] = $this->adminWith2fa();

        $this->withSession(['2fa.user_id' => $admin->id])->postJson('/api/2fa/setup')->assertStatus(409);
    }

    public function test_2fa_verify_accepts_correct_code_and_rejects_wrong_one(): void
    {
        [$admin, $secret] = $this->adminWith2fa();

        $this->withSession(['2fa.user_id' => $admin->id])
            ->postJson('/api/2fa/verify', ['otp' => '111111'])
            ->assertUnprocessable();
        $this->assertGuest('web');
        $this->assertSame(1, $admin->fresh()->failed_login_attempts);

        $this->withSession(['2fa.user_id' => $admin->id])
            ->postJson('/api/2fa/verify', ['otp' => $this->otp($secret)])
            ->assertOk()
            ->assertJsonPath('user.id', $admin->id);

        $this->assertAuthenticatedAs($admin, 'web');
    }

    public function test_2fa_endpoints_need_a_pending_login(): void
    {
        $this->postJson('/api/2fa/verify', ['otp' => '123456'])->assertUnauthorized();
        $this->postJson('/api/2fa/setup')->assertUnauthorized();
        $this->postJson('/api/2fa/confirm', ['otp' => '123456'])->assertUnauthorized();
    }

    public function test_recovery_code_works_only_once(): void
    {
        [$admin] = $this->adminWith2fa();
        $code = 'abcde-fghij';
        $admin->forceFill(['two_factor_recovery_codes' => json_encode([Hash::make($code), Hash::make('klmno-pqrst')])])->save();

        $this->withSession(['2fa.user_id' => $admin->id])
            ->postJson('/api/2fa/verify', ['recovery_code' => $code])
            ->assertOk();
        $this->assertAuthenticatedAs($admin, 'web');

        $this->assertCount(1, json_decode($admin->fresh()->two_factor_recovery_codes, true));

        $this->withSession(['2fa.user_id' => $admin->id])
            ->postJson('/api/2fa/verify', ['recovery_code' => $code])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Kode pemulihan tidak valid.');
    }

    public function test_locked_admin_cannot_verify_2fa(): void
    {
        [$admin, $secret] = $this->adminWith2fa();
        $admin->forceFill(['locked_until' => now()->addMinutes(10)])->save();

        $this->withSession(['2fa.user_id' => $admin->id])
            ->postJson('/api/2fa/verify', ['otp' => $this->otp($secret)])
            ->assertStatus(423);
    }

    // ---------- Sesi: me, logout, akun dinonaktifkan ----------

    public function test_me_requires_login_and_returns_the_user(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();

        $kasir = $this->makeUser('kasir');
        $this->actingAs($kasir)->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.email', $kasir->email)
            ->assertJsonPath('user.role', 'kasir');
    }

    public function test_logout_ends_the_session_and_is_logged(): void
    {
        $kasir = $this->makeUser('kasir');

        $this->actingAs($kasir)->postJson('/api/logout')->assertOk();

        $this->assertGuest('web');
        $this->assertTrue(ActivityLog::where('user_id', $kasir->id)->where('action', 'logout')->exists());
    }

    public function test_deactivated_user_with_active_session_is_cut_off(): void
    {
        $kasir = $this->makeUser('kasir', ['is_active' => false]);

        $this->actingAs($kasir)->getJson('/api/me')->assertForbidden();
    }

    // ---------- Pendaftaran mandiri ----------

    private function registerPayload(array $override = []): array
    {
        return [
            'name' => 'Karyawan Baru',
            'email' => 'baru.'.uniqid().'@example.com',
            'password' => 'PasswordKuat123',
            'password_confirmation' => 'PasswordKuat123',
            'terms' => true,
            ...$override,
        ];
    }

    public function test_register_creates_inactive_pending_kasir(): void
    {
        $payload = $this->registerPayload();

        $this->postJson('/api/register', $payload)->assertCreated();

        $user = User::where('email', $payload['email'])->firstOrFail();
        $this->assertSame('kasir', $user->role);
        $this->assertFalse($user->is_active);
        $this->assertTrue($user->pending_approval);
        $this->assertTrue(Hash::check('PasswordKuat123', $user->password));
        $this->assertTrue(ActivityLog::where('user_id', $user->id)->where('action', 'daftar')->exists());

        // Belum disetujui admin: tidak bisa login
        $this->postJson('/api/login', ['email' => $payload['email'], 'password' => 'PasswordKuat123'])->assertForbidden();
    }

    public function test_register_can_never_create_an_admin(): void
    {
        $payload = $this->registerPayload(['role' => 'admin', 'is_active' => true]);

        $this->postJson('/api/register', $payload)->assertCreated();

        $user = User::where('email', $payload['email'])->firstOrFail();
        $this->assertSame('kasir', $user->role);
        $this->assertFalse($user->is_active);
    }

    public function test_register_validates_input(): void
    {
        $existing = $this->makeUser('kasir');

        $this->postJson('/api/register', $this->registerPayload(['email' => $existing->email]))
            ->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->postJson('/api/register', $this->registerPayload(['password' => 'pendek1', 'password_confirmation' => 'pendek1']))
            ->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->postJson('/api/register', $this->registerPayload(['password_confirmation' => 'PasswordBeda123']))
            ->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->postJson('/api/register', $this->registerPayload(['password' => 'HurufSajaPanjang', 'password_confirmation' => 'HurufSajaPanjang']))
            ->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->postJson('/api/register', $this->registerPayload(['terms' => false]))
            ->assertUnprocessable()->assertJsonValidationErrors('terms');
    }
}
