<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/** Daftar karyawan (khusus admin). Karyawan = user; akun baru bisa berperan kasir atau administrator (admin baru wajib setup 2FA saat login pertama). */
class EmployeeController extends Controller
{
    public function __construct(private ActivityLogger $logger) {}

    public function index(Request $request): JsonResponse
    {
        $isAdmin = $request->user()->role === 'admin';

        return response()->json([
            'data' => User::orderByRaw("role = 'admin' desc")->orderBy('name')->get()
                // Kasir hanya melihat nama, peran, dan status; email & login terakhir khusus admin
                ->map(fn (User $u) => $isAdmin ? $this->payload($u) : $u->only(['id', 'name', 'role', 'is_active'])),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role' => ['sometimes', 'in:kasir,admin'],
            // Administrator memegang akses penuh, jadi password-nya harus lebih panjang
            'password' => ['required', Password::min($request->input('role') === 'admin' ? 12 : 8)->letters()->numbers()],
        ]);

        $role = $data['role'] ?? 'kasir';
        $user = User::create([...$data, 'role' => $role, 'is_active' => true]);

        $label = $role === 'admin' ? 'administrator' : 'karyawan';
        $this->logger->record($request, 'karyawan', 'tambah', "Menambah {$label} {$user->name} ({$user->email})", $user);

        return response()->json(['data' => $this->payload($user)], 201);
    }

    public function update(Request $request, User $employee): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($employee->id)],
            'role' => ['required', 'in:kasir,admin'],
            'is_active' => ['required', 'boolean'],
            // Administrator memegang akses penuh, jadi password-nya harus lebih panjang
            'password' => ['nullable', Password::min($request->input('role') === 'admin' ? 12 : 8)->letters()->numbers()],
        ]);

        // Pengaman: admin tidak bisa menurunkan peran atau menonaktifkan akunnya sendiri,
        // jadi selalu ada minimal satu admin aktif yang tersisa.
        if ($employee->id === $request->user()->id && ($data['role'] !== $employee->role || ! $data['is_active'])) {
            return response()->json(['message' => 'Anda tidak bisa mengubah peran atau menonaktifkan akun Anda sendiri.'], 422);
        }

        $changes = [];
        if ($data['name'] !== $employee->name) {
            $changes[] = "nama menjadi {$data['name']}";
        }
        if ($data['email'] !== $employee->email) {
            $changes[] = "email menjadi {$data['email']}";
        }
        if ($data['role'] !== $employee->role) {
            $changes[] = 'peran menjadi '.($data['role'] === 'admin' ? 'administrator' : 'kasir');
        }
        if ($data['is_active'] !== $employee->is_active) {
            $changes[] = $data['is_active'] ? 'mengaktifkan akun' : 'menonaktifkan akun';
        }

        $employee->fill([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'is_active' => $data['is_active'],
        ]);

        // Diturunkan dari admin ke kasir: 2FA dihapus. Kalau nanti dijadikan admin lagi, setup dari awal.
        if ($employee->isDirty('role') && $data['role'] === 'kasir') {
            $employee->forceFill([
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
            ]);
        }

        // Reset password oleh admin sekaligus membuka kunci akun
        if (! empty($data['password'])) {
            $employee->password = $data['password'];
            $employee->failed_login_attempts = 0;
            $employee->locked_until = null;
            $changes[] = 'reset password';
        }

        $employee->save();

        $this->logger->record(
            $request,
            'karyawan',
            'ubah',
            "Mengubah akun {$employee->name}".($changes ? ': '.implode(', ', $changes) : ''),
            $employee,
        );

        return response()->json(['data' => $this->payload($employee)]);
    }

    private function payload(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'is_active' => $u->is_active,
            'two_factor' => $u->two_factor_confirmed_at !== null,
            'last_login_at' => $u->last_login_at,
            'created_at' => $u->created_at,
        ];
    }
}
