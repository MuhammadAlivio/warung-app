<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Data pemasok (khusus admin). */
class SupplierController extends Controller
{
    public function __construct(private ActivityLogger $logger) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => Supplier::orderBy('name')->get()->map->toApi()]);
    }

    public function store(Request $request): JsonResponse
    {
        $supplier = Supplier::create($this->validated($request));

        $this->logger->record($request, 'pembelian', 'tambah', "Menambah pemasok {$supplier->name}", $supplier);

        return response()->json(['data' => $supplier->toApi()], 201);
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $supplier->update($this->validated($request, $supplier));

        $this->logger->record($request, 'pembelian', 'ubah', "Mengubah data pemasok {$supplier->name}", $supplier);

        return response()->json(['data' => $supplier->toApi()]);
    }

    private function validated(Request $request, ?Supplier $ignore = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'phone' => ['nullable', 'string', 'regex:/^(\+62|62|0)[0-9\s-]{8,15}$/'],
            'address' => ['nullable', 'string', 'max:200'],
        ], [
            'name.required' => 'Nama pemasok wajib diisi',
            'name.min' => 'Nama pemasok minimal 2 karakter',
            'name.max' => 'Nama pemasok maksimal 120 karakter',
            'phone.regex' => 'Format nomor tidak valid, contoh: 0812 3456 7890',
            'address.max' => 'Alamat maksimal 200 karakter',
        ]);

        $name = preg_replace('/\s+/', ' ', trim($data['name']));

        $taken = Supplier::whereRaw('lower(name) = ?', [mb_strtolower($name)])
            ->when($ignore, fn ($q) => $q->whereKeyNot($ignore->getKey()))
            ->exists();
        if ($taken) {
            abort(response()->json(['message' => 'Pemasok sudah ada', 'errors' => ['name' => ['Pemasok sudah ada']]], 422));
        }

        $clean = fn (?string $v) => $v !== null && trim($v) !== '' ? trim($v) : null;

        return ['name' => $name, 'phone' => $clean($data['phone'] ?? null), 'address' => $clean($data['address'] ?? null)];
    }
}
