<?php

namespace Tests\Feature;

use App\Http\Middleware\LogActivity;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Tests\Concerns\WarungUsers;
use Tests\TestCase;

/**
 * Log Karyawan: hanya admin yang boleh melihat, dengan filter, dan semua aksi tercatat.
 *
 *   DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test --filter=ActivityLogTest
 */
class ActivityLogTest extends TestCase
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

    private function log(User $user, string $module, string $action, string $description, ?string $at = null): ActivityLog
    {
        return ActivityLog::create([
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_role' => $user->role,
            'module' => $module,
            'action' => $action,
            'description' => $description,
            'created_at' => $at ?? now(),
        ]);
    }

    private function logs(array $query = []): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($this->admin)->getJson('/api/activity-logs?'.http_build_query($query));
    }

    // ---------- Hak akses ----------

    public function test_only_admin_can_read_logs(): void
    {
        $this->getJson('/api/activity-logs')->assertUnauthorized();
        $this->actingAs($this->makeUser('kasir'))->getJson('/api/activity-logs')->assertForbidden();
        $this->actingAs($this->admin)->getJson('/api/activity-logs')->assertOk();
    }

    // ---------- Isi dan filter ----------

    public function test_list_has_expected_fields_and_newest_first(): void
    {
        $user = $this->makeUser('kasir');
        $first = $this->log($user, 'uji', 'tambah', 'Pertama');
        $second = $this->log($user, 'uji', 'ubah', 'Kedua');

        $res = $this->logs(['user_id' => $user->id])->assertOk();

        $this->assertSame([$second->id, $first->id], collect($res->json('data'))->pluck('id')->all());
        foreach (['id', 'user_id', 'user_name', 'user_role', 'module', 'action', 'description', 'ip_address', 'created_at'] as $key) {
            $this->assertArrayHasKey($key, $res->json('data.0'));
        }
        $res->assertJsonPath('total', 2)->assertJsonPath('current_page', 1)->assertJsonPath('last_page', 1);
    }

    public function test_filter_by_user_and_module(): void
    {
        $a = $this->makeUser('kasir');
        $b = $this->makeUser('kasir');
        $this->log($a, 'uji_a', 'tambah', 'milik A');
        $this->log($b, 'uji_b', 'tambah', 'milik B');

        $this->logs(['user_id' => $a->id])->assertJsonPath('total', 1)->assertJsonPath('data.0.description', 'milik A');
        $this->logs(['module' => 'uji_b'])->assertJsonPath('total', 1)->assertJsonPath('data.0.description', 'milik B');
        $this->logs(['user_id' => $a->id, 'module' => 'uji_b'])->assertJsonPath('total', 0);
    }

    public function test_search_ignores_case(): void
    {
        $user = $this->makeUser('kasir');
        $this->log($user, 'uji', 'tambah', 'Membuat Transaksi Spesial');
        $this->log($user, 'uji', 'tambah', 'Hal lain');

        $this->logs(['user_id' => $user->id, 'q' => 'transaksi SPESIAL'])->assertJsonPath('total', 1);
    }

    public function test_filter_by_date_range(): void
    {
        $user = $this->makeUser('kasir');
        $this->log($user, 'uji', 'tambah', 'lama', '2020-01-15 10:00:00');
        $this->log($user, 'uji', 'tambah', 'baru', '2020-03-15 10:00:00');

        $this->logs(['user_id' => $user->id, 'from' => '2020-01-01', 'to' => '2020-01-31'])
            ->assertJsonPath('total', 1)->assertJsonPath('data.0.description', 'lama');
        $this->logs(['user_id' => $user->id, 'from' => '2020-02-01'])
            ->assertJsonPath('total', 1)->assertJsonPath('data.0.description', 'baru');
        // Tanggal akhir ikut dihitung sampai akhir harinya
        $this->logs(['user_id' => $user->id, 'to' => '2020-01-15'])->assertJsonPath('total', 1);
    }

    public function test_pagination_is_15_per_page(): void
    {
        $user = $this->makeUser('kasir');
        foreach (range(1, 16) as $i) {
            $this->log($user, 'uji', 'tambah', "baris {$i}");
        }

        $this->logs(['user_id' => $user->id])
            ->assertJsonPath('total', 16)->assertJsonPath('last_page', 2)->assertJsonCount(15, 'data');
        $this->logs(['user_id' => $user->id, 'page' => 2])->assertJsonCount(1, 'data');
    }

    public function test_module_list_includes_every_recorded_module_regardless_of_filter(): void
    {
        $user = $this->makeUser('kasir');
        $this->log($user, 'uji_modul_baru', 'tambah', 'x');

        $modules = $this->logs(['module' => 'tidak_ada'])->json('modules');

        $this->assertContains('uji_modul_baru', $modules);
        $this->assertSame($modules, collect($modules)->unique()->sort()->values()->all());
    }

    public function test_invalid_filters_are_rejected(): void
    {
        $this->logs(['from' => 'bukan-tanggal'])->assertUnprocessable()->assertJsonValidationErrors('from');
    }

    // ---------- Pencatatan otomatis ----------

    public function test_real_actions_end_up_in_the_log(): void
    {
        $kasir = $this->makeUser('kasir');

        $this->actingAs($kasir)->postJson('/api/customers', ['name' => 'Tercatat '.uniqid()])->assertCreated();

        $res = $this->logs(['user_id' => $kasir->id, 'module' => 'pelanggan'])->assertOk();
        $this->assertSame('tambah', $res->json('data.0.action'));
        $this->assertSame($kasir->name, $res->json('data.0.user_name'));
        $this->assertSame('kasir', $res->json('data.0.user_role'));
    }

    public function test_safety_net_logs_mutating_requests_nobody_logged_explicitly(): void
    {
        $user = $this->makeUser('kasir');
        $middleware = app(LogActivity::class);

        $request = Request::create('/api/contoh-baru', 'POST');
        $request->setUserResolver(fn () => $user);
        $middleware->handle($request, fn () => response()->json([], 201));

        $log = ActivityLog::where('user_id', $user->id)->firstOrFail();
        $this->assertSame('contoh-baru', $log->module);
        $this->assertSame('tambah', $log->action);
        $this->assertSame('POST /api/contoh-baru', $log->description);
    }

    public function test_safety_net_skips_reads_failures_guests_and_already_logged_requests(): void
    {
        $user = $this->makeUser('kasir');
        $middleware = app(LogActivity::class);
        $ok = fn () => response()->json([], 200);

        // GET tidak dicatat
        $get = Request::create('/api/x', 'GET');
        $get->setUserResolver(fn () => $user);
        $middleware->handle($get, $ok);

        // Gagal (4xx) tidak dicatat
        $failed = Request::create('/api/x', 'POST');
        $failed->setUserResolver(fn () => $user);
        $middleware->handle($failed, fn () => response()->json([], 422));

        // Tanpa pengguna tidak dicatat
        $guest = Request::create('/api/x', 'POST');
        $guest->setUserResolver(fn () => null);
        $middleware->handle($guest, $ok);

        // Sudah dicatat controller: tidak digandakan
        $logged = Request::create('/api/x', 'POST');
        $logged->setUserResolver(fn () => $user);
        $logged->attributes->set('activity_logged', true);
        $middleware->handle($logged, $ok);

        $this->assertSame(0, ActivityLog::where('user_id', $user->id)->count());
    }
}
