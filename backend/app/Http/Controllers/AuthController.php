<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ActivityLogger;
use App\Services\LoginGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function __construct(private LoginGuard $guard, private ActivityLogger $logger) {}

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
            'admin_only' => ['sometimes', 'boolean'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if ($user && ($minutes = $this->guard->lockedMinutes($user)) > 0) {
            $this->guard->fail(null, $data['email'], 'akun_terkunci', $request);

            return response()->json([
                'message' => "Terlalu banyak percobaan. Akun dikunci, coba lagi dalam {$minutes} menit.",
            ], 423);
        }

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            $this->guard->fail($user, $data['email'], 'password_salah', $request);

            return response()->json(['message' => 'Email atau password salah'], 422);
        }

        if (! $user->is_active) {
            $this->guard->fail(null, $data['email'], 'akun_nonaktif', $request);

            return response()->json(['message' => 'Akun belum aktif atau dinonaktifkan. Hubungi administrator.'], 403);
        }

        if (($data['admin_only'] ?? false) && $user->role !== 'admin') {
            $this->guard->fail(null, $data['email'], 'bukan_admin', $request);

            return response()->json(['message' => 'Akun ini bukan administrator. Gunakan halaman login karyawan.'], 403);
        }

        $request->session()->regenerate();

        // Admin wajib 2FA: belum login penuh sampai kode benar
        if ($user->role === 'admin') {
            $request->session()->put('2fa.user_id', $user->id);
            $request->session()->put('2fa.remember', (bool) ($data['remember'] ?? false));

            return response()->json([
                'needs_2fa' => true,
                'needs_setup' => $user->two_factor_confirmed_at === null,
            ]);
        }

        Auth::guard('web')->login($user, (bool) ($data['remember'] ?? false));
        $this->guard->success($user, $request);

        return response()->json(['needs_2fa' => false, 'user' => $this->payload($user)]);
    }

    /** Pendaftaran mandiri: akun selalu berperan kasir dan baru aktif setelah disetujui admin. */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(12)->letters()->numbers()],
            'terms' => ['accepted'],
        ], [
            'terms.accepted' => 'Anda harus menyetujui Syarat & Ketentuan',
            'password.confirmed' => 'Konfirmasi password tidak cocok',
        ]);

        $user = User::create([
            'name' => trim($data['name']),
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => 'kasir',
            'is_active' => false,
        ]);

        $this->logger->record($request, 'karyawan', 'daftar', "{$user->name} ({$user->email}) mendaftar, menunggu persetujuan admin", $user, $user);

        return response()->json([
            'message' => 'Pendaftaran berhasil. Akun Anda aktif setelah disetujui administrator.',
        ], 201);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->payload($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->logger->record($request, 'auth', 'logout', "{$request->user()->name} keluar dari aplikasi");

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Berhasil keluar']);
    }

    public static function payload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }
}
