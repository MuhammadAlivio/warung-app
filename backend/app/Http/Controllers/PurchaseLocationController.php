<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use App\Models\PurchaseLocation;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Kelola daftar lokasi penerimaan barang (khusus admin). Lokasi yang dipakai faktur tidak bisa dihapus. */
class PurchaseLocationController extends Controller
{
    public function __construct(private ActivityLogger $logger) {}

    public function index(): JsonResponse
    {
        $usage = Purchase::selectRaw('location, count(*) as n')->groupBy('location')->pluck('n', 'location');

        return response()->json([
            'data' => PurchaseLocation::orderBy('sort_order')->orderBy('name')->get()
                ->map(fn (PurchaseLocation $l) => $l->toApi((int) ($usage[$l->code] ?? 0))),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $name = $this->validatedName($request);
        $location = PurchaseLocation::create([
            'code' => PurchaseLocation::codeFor($name),
            'name' => $name,
            'user_id' => $request->user()->id,
        ]);

        $this->logger->record($request, 'pembelian', 'tambah', "Menambah lokasi penerimaan {$location->name}", $location);

        return response()->json(['data' => $location->toApi(0)], 201);
    }

    public function update(Request $request, PurchaseLocation $location): JsonResponse
    {
        $old = $location->name;
        $location->update(['name' => $this->validatedName($request, $location)]);

        $this->logger->record($request, 'pembelian', 'ubah', "Mengubah lokasi penerimaan {$old} menjadi {$location->name}", $location);

        return response()->json(['data' => $location->toApi($location->usageCount())]);
    }

    public function destroy(Request $request, PurchaseLocation $location): JsonResponse
    {
        $used = $location->usageCount();
        if ($used > 0) {
            return response()->json([
                'message' => "Lokasi {$location->name} masih dipakai {$used} faktur pembelian, jadi tidak bisa dihapus.",
            ], 409);
        }
        if (PurchaseLocation::count() <= 1) {
            return response()->json(['message' => 'Minimal harus ada satu lokasi penerimaan.'], 409);
        }

        $location->delete();

        $this->logger->record($request, 'pembelian', 'hapus', "Menghapus lokasi penerimaan {$location->name}", $location);

        return response()->json(['message' => 'Lokasi dihapus']);
    }

    private function validatedName(Request $request, ?PurchaseLocation $ignore = null): string
    {
        $data = $request->validate(
            ['name' => ['required', 'string', 'max:50']],
            ['name.required' => 'Nama lokasi wajib diisi', 'name.max' => 'Nama lokasi maksimal 50 karakter'],
        );

        $name = preg_replace('/\s+/', ' ', trim($data['name']));

        $taken = PurchaseLocation::whereRaw('lower(name) = ?', [mb_strtolower($name)])
            ->when($ignore, fn ($q) => $q->whereKeyNot($ignore->getKey()))
            ->exists();
        if ($taken) {
            abort(response()->json(['message' => 'Lokasi sudah ada', 'errors' => ['name' => ['Lokasi sudah ada']]], 422));
        }

        return $name;
    }
}
