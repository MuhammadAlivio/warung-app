<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockMovement;
use App\Services\ActivityLogger;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * Stok Barang (admin & kasir punya akses yang sama, keputusan tim 4 Nov 2026).
 * Daftar barang dikirim semua sekaligus (tanpa pagination) sesuai catatan "show all barang".
 */
class ProductController extends Controller
{
    private const IMAGE_DISK = 'local';

    private const MAX_PRICE = 1_000_000_000_000; // Rp 1 triliun

    private const MAX_QTY = 1_000_000_000;

    public function __construct(private ActivityLogger $logger, private StockService $stock) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category_id' => ['nullable', 'integer'],
        ]);

        $products = Product::active()
            ->with('category')
            ->when($request->filled('q'), fn ($q) => $q->where('name', 'ilike', '%'.$request->string('q').'%'))
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->integer('category_id')))
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $products->map->toApi()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request, creating: true);

        $product = DB::transaction(function () use ($data, $request) {
            $product = Product::create($data['fields']);
            $this->stock->adjust($product, $data['stock'], 'initial', $request->user(), 'Stok awal');

            // Ambil ulang kolom default dari database (stock, is_active)
            return $product->refresh();
        });

        $this->logger->record(
            $request, 'stok', 'tambah',
            "Menambah barang {$product->name} (stok awal {$product->stock} {$product->unit})",
            $product,
        );

        return response()->json(['data' => $product->load('category')->toApi()], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        abort_unless($product->is_active, 404);

        $data = $this->validated($request, ignore: $product);
        $before = $product->stock;

        DB::transaction(function () use ($product, $data, $request) {
            $product->update($data['fields']);

            if (array_key_exists('stock', $data)) {
                $this->stock->setTo($product, $data['stock'], $request->user(), $data['stock_note'] ?? 'Koreksi stok manual');
            }
        });

        $changes = $before !== $product->stock ? " (stok {$before} → {$product->stock})" : '';
        $this->logger->record($request, 'stok', 'ubah', "Mengubah barang {$product->name}{$changes}", $product);

        return response()->json(['data' => $product->load('category')->toApi()]);
    }

    /**
     * "Hapus" = nonaktifkan. Barang tetap ada di database karena dirujuk oleh riwayat
     * penjualan, pembelian, dan mutasi stok (BR-07), tapi hilang dari daftar & kasir.
     */
    public function destroy(Request $request, Product $product): JsonResponse
    {
        abort_unless($product->is_active, 404);

        $product->forceFill(['is_active' => false])->save();

        $this->logger->record($request, 'stok', 'hapus', "Menghapus barang {$product->name}", $product);

        return response()->json(['message' => 'Barang dihapus']);
    }

    /** Riwayat mutasi stok satu barang (terbaru di atas). */
    public function movements(Product $product): JsonResponse
    {
        $rows = $product->movements()->with('user:id,name')->orderByDesc('id')->limit(200)->get();

        return response()->json([
            'data' => $rows->map(fn (StockMovement $m) => [
                'id' => $m->id,
                'type' => $m->type,
                'qty_change' => $m->qty_change,
                'stock_after' => $m->stock_after,
                'reference_type' => $m->reference_type,
                'reference_id' => $m->reference_id,
                'note' => $m->note,
                'user_name' => $m->user?->name,
                'created_at' => $m->created_at,
            ]),
        ]);
    }

    public function showImage(Product $product): Response
    {
        abort_unless($product->image_path && Storage::disk(self::IMAGE_DISK)->exists($product->image_path), 404);

        return Storage::disk(self::IMAGE_DISK)->response($product->image_path, null, [
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    /** Unggah/ganti foto (multipart, field "image"). Batas sama dengan komponen ImageUpload: JPG/PNG/WebP, 2 MB. */
    public function uploadImage(Request $request, Product $product): JsonResponse
    {
        abort_unless($product->is_active, 404);

        $request->validate(
            ['image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048']],
            [
                'image.required' => 'Pilih foto barang',
                'image.mimes' => 'Format harus JPG, PNG, atau WebP',
                'image.max' => 'Ukuran foto maksimal 2 MB',
                'image.file' => 'Foto gagal diunggah',
                'image.uploaded' => 'Foto gagal diunggah',
            ],
        );

        $old = $product->image_path;
        $path = $request->file('image')->store('products', self::IMAGE_DISK);

        $product->forceFill(['image_path' => $path])->save();

        if ($old) {
            Storage::disk(self::IMAGE_DISK)->delete($old);
        }

        $this->logger->record($request, 'stok', 'ubah', "Mengganti foto barang {$product->name}", $product);

        return response()->json(['data' => $product->load('category')->toApi()]);
    }

    public function deleteImage(Request $request, Product $product): JsonResponse
    {
        abort_unless($product->is_active, 404);

        if ($product->image_path) {
            Storage::disk(self::IMAGE_DISK)->delete($product->image_path);
            $product->forceFill(['image_path' => null])->save();

            $this->logger->record($request, 'stok', 'ubah', "Menghapus foto barang {$product->name}", $product);
        }

        return response()->json(['data' => $product->load('category')->toApi()]);
    }

    /**
     * Aturan sama dengan productSchema di frontend.
     *
     * @return array{fields: array, stock?: int, stock_note?: string}
     */
    private function validated(Request $request, bool $creating = false, ?Product $ignore = null): array
    {
        $int = fn (int $max) => ['integer', 'min:0', "max:{$max}"];

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'sku' => ['nullable', 'string', 'max:30'],
            'description' => ['nullable', 'string', 'max:300'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'unit' => ['nullable', 'string', 'max:30'],
            'buy_price' => ['required', ...$int(self::MAX_PRICE)],
            'sell_price' => ['required', ...$int(self::MAX_PRICE)],
            'stock' => [$creating ? 'required' : 'sometimes', ...$int(self::MAX_QTY)],
            'min_stock' => ['required', ...$int(self::MAX_QTY)],
            'stock_note' => ['nullable', 'string', 'max:300'],
        ], [
            'name.required' => 'Nama barang wajib diisi',
            'name.min' => 'Nama barang minimal 2 karakter',
            'name.max' => 'Nama barang maksimal 120 karakter',
            'sku.max' => 'SKU maksimal 30 karakter',
            'description.max' => 'Maksimal 300 karakter',
            'category_id.required' => 'Pilih kategori',
            'category_id.exists' => 'Kategori tidak ditemukan',
            'unit.max' => 'Satuan maksimal 30 karakter',
            'buy_price.required' => 'Harga beli wajib diisi',
            'sell_price.required' => 'Harga jual wajib diisi',
            'stock.required' => 'Stok awal wajib diisi',
            'min_stock.required' => 'Minimal stok wajib diisi',
            '*.integer' => 'Harus berupa angka bulat, minimal 0',
            '*.min' => 'Harus berupa angka bulat, minimal 0',
            '*.max' => 'Angka terlalu besar',
        ]);

        $name = preg_replace('/\s+/', ' ', trim($data['name']));
        $sku = isset($data['sku']) && trim($data['sku']) !== '' ? trim($data['sku']) : null;

        $errors = [];

        // Nama unik di antara barang aktif (barang yang sudah dihapus boleh dibuat ulang)
        $nameTaken = Product::active()
            ->whereRaw('lower(name) = ?', [mb_strtolower($name)])
            ->when($ignore, fn ($q) => $q->whereKeyNot($ignore->getKey()))
            ->exists();
        if ($nameTaken) {
            $errors['name'] = ['Nama barang sudah ada'];
        }

        // SKU unik di seluruh tabel (constraint database)
        if ($sku && Product::where('sku', $sku)->when($ignore, fn ($q) => $q->whereKeyNot($ignore->getKey()))->exists()) {
            $errors['sku'] = ['SKU sudah dipakai barang lain'];
        }

        if ($errors) {
            abort(response()->json(['message' => reset($errors)[0], 'errors' => $errors], 422));
        }

        $result = ['fields' => [
            'name' => $name,
            'sku' => $sku,
            'description' => isset($data['description']) && trim($data['description']) !== '' ? trim($data['description']) : null,
            'category_id' => $data['category_id'],
            'unit' => isset($data['unit']) && trim($data['unit']) !== '' ? trim($data['unit']) : ($ignore?->unit ?? 'pcs'),
            'buy_price' => $data['buy_price'],
            'sell_price' => $data['sell_price'],
            'min_stock' => $data['min_stock'],
        ]];

        if (array_key_exists('stock', $data)) {
            $result['stock'] = (int) $data['stock'];
        }
        if (! empty($data['stock_note'])) {
            $result['stock_note'] = $data['stock_note'];
        }

        return $result;
    }
}
