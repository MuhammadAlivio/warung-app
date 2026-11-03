<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/** Daftar karyawan (khusus admin). Karyawan = user; akun yang dibuat di sini selalu berperan kasir. */
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
            'password' => ['required', Password::min(8)->letters()->numbers()],
        ]);

        $user = User::create([...$data, 'role' => 'kasir', 'is_active' => true]);

        $this->logger->record($request, 'karyawan', 'tambah', "Menambah karyawan {$user->name} ({$user->email})", $user);

        return response()->json(['data' => $this->payload($user)], 201);
    }

    public function update(Request $request, User $employee): JsonResponse
    {
        if ($employee->role !== 'kasir') {
            return response()->json(['message' => 'Akun administrator tidak bisa diubah dari sini.'], 403);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($employee->id)],
            'is_active' => ['required', 'boolean'],
            'password' => ['nullable', Password::min(8)->letters()->numbers()],
        ]);

        $changes = [];
        if ($data['name'] !== $employee->name) {
            $changes[] = "nama menjadi {$data['name']}";
        }
        if ($data['email'] !== $employee->email) {
            $changes[] = "email menjadi {$data['email']}";
        }
        if ($data['is_active'] !== $employee->is_active) {
            $changes[] = $data['is_active'] ? 'mengaktifkan akun' : 'menonaktifkan akun';
        }

        $employee->fill(['name' => $data['name'], 'email' => $data['email'], 'is_active' => $data['is_active']]);

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
            "Mengubah karyawan {$employee->name}".($changes ? ': '.implode(', ', $changes) : ''),
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
