<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function __construct(private ActivityLogger $logger) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Customer::orderByDesc('id')->get()->map->toApi(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $customer = Customer::create($this->validated($request));

        $this->logger->record($request, 'pelanggan', 'tambah', "Menambah pelanggan {$customer->name}", $customer);

        return response()->json(['data' => $customer->toApi()], 201);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $customer->update($this->validated($request));

        $this->logger->record($request, 'pelanggan', 'ubah', "Mengubah data pelanggan {$customer->name}", $customer);

        return response()->json(['data' => $customer->toApi()]);
    }

    public function destroy(Request $request, Customer $customer): JsonResponse
    {
        $customer->delete();

        $this->logger->record($request, 'pelanggan', 'hapus', "Menghapus pelanggan {$customer->name}", $customer);

        return response()->json(['message' => 'Pelanggan dihapus']);
    }

    /** Aturan sama dengan customerSchema di frontend; note dipetakan ke kolom notes. */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'regex:/^(\+62|62|0)8[0-9\s-]{7,13}$/'],
            'address' => ['nullable', 'string', 'max:200'],
            'note' => ['nullable', 'string', 'max:300'],
        ], [
            'phone.regex' => 'Format nomor tidak valid, contoh: 0812 3456 7890',
        ]);

        return [
            'name' => trim($data['name']),
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'notes' => $data['note'] ?? null,
        ];
    }
}
