<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Kategori barang (admin & kasir). Kategori yang masih dipakai barang tidak bisa dihapus. */
class CategoryController extends Controller
{
    public function __construct(private ActivityLogger $logger) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Category::withCount(['products' => fn ($q) => $q->where('is_active', true)])
                ->orderBy('name')
                ->get()
                ->map->toApi(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $category = Category::create(['name' => $this->validatedName($request)]);

        $this->logger->record($request, 'stok', 'tambah', "Menambah kategori {$category->name}", $category);

        return response()->json(['data' => $category->toApi()], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $old = $category->name;
        $category->update(['name' => $this->validatedName($request, $category)]);

        $this->logger->record($request, 'stok', 'ubah', "Mengubah kategori {$old} menjadi {$category->name}", $category);

        return response()->json(['data' => $category->toApi()]);
    }

    public function destroy(Request $request, Category $category): JsonResponse
    {
        // Termasuk barang nonaktif: FK products.category_id bersifat RESTRICT
        $used = $category->products()->count();

        if ($used > 0) {
            return response()->json([
                'message' => "Kategori {$category->name} masih dipakai {$used} barang. Pindahkan barangnya ke kategori lain dulu.",
            ], 409);
        }

        $category->delete();

        $this->logger->record($request, 'stok', 'hapus', "Menghapus kategori {$category->name}", $category);

        return response()->json(['message' => 'Kategori dihapus']);
    }

    /** Nama wajib, maks. 50 karakter, unik tanpa membedakan huruf besar/kecil. */
    private function validatedName(Request $request, ?Category $ignore = null): string
    {
        $data = $request->validate(
            ['name' => ['required', 'string', 'max:50']],
            ['name.required' => 'Nama kategori wajib diisi', 'name.max' => 'Nama kategori maksimal 50 karakter'],
        );

        $name = preg_replace('/\s+/', ' ', trim($data['name']));

        $exists = Category::whereRaw('lower(name) = ?', [mb_strtolower($name)])
            ->when($ignore, fn ($q) => $q->whereKeyNot($ignore->getKey()))
            ->exists();

        if ($exists) {
            abort(response()->json([
                'message' => 'Kategori sudah ada',
                'errors' => ['name' => ['Kategori sudah ada']],
            ], 422));
        }

        return $name;
    }
}
