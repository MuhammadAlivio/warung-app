<?php

namespace App\Http\Controllers;

use App\Models\CashEntry;
use App\Services\ActivityLogger;
use App\Services\FinanceExporter;
use App\Services\FinanceService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/** Halaman Keuangan. Semua endpoint khusus admin (route middleware role:admin, PRD BR-05). */
class FinanceController extends Controller
{
    /** Batas rentang untuk daftar buku kas & unduh laporan, supaya query tetap ringan. */
    private const MAX_RANGE_DAYS = 366;

    private const MAX_PER_PAGE = 100;

    public function __construct(
        private FinanceService $finance,
        private FinanceExporter $exporter,
        private ActivityLogger $logger,
    ) {}

    /**
     * GET /api/finance/report?period=harian|mingguan|bulanan&date=YYYY-MM-DD
     * GET /api/finance/report?period=rentang&start=YYYY-MM-DD&end=YYYY-MM-DD   (maks. MAX_RANGE_DAYS hari)
     */
    public function report(Request $request): JsonResponse
    {
        $data = $request->validate([
            'period' => ['required', Rule::in([...FinanceService::PERIODS, 'rentang'])],
            'date' => ['required_unless:period,rentang', 'nullable', 'date_format:Y-m-d'],
            'start' => ['required_if:period,rentang', 'nullable', 'date_format:Y-m-d'],
            'end' => ['required_if:period,rentang', 'nullable', 'date_format:Y-m-d', 'after_or_equal:start'],
        ], [
            'start.required_if' => 'Pilih tanggal awal.',
            'end.required_if' => 'Pilih tanggal akhir.',
            'end.after_or_equal' => 'Tanggal akhir tidak boleh sebelum tanggal awal.',
        ]);

        if ($data['period'] === 'rentang') {
            [$start, $end] = $this->validRange($data['start'], $data['end']);

            return response()->json(['data' => $this->finance->rangeReport($start, $end)]);
        }

        return response()->json([
            'data' => $this->finance->report($data['period'], CarbonImmutable::parse($data['date'])),
        ]);
    }

    /**
     * GET /api/finance/entries?start=&end=&type=masuk|keluar&search=&category=&q=&page=&per_page=
     *   search   = nama / no. HP pelanggan (hanya pembayaran penjualan)
     *   category = jenis persis, q = kata kunci di keterangan / jenis / pelanggan / nomor nota
     *   page     = bila diisi, data dibagi per halaman; meta.total_amount selalu total seluruh hasil filter
     */
    public function entries(Request $request): JsonResponse
    {
        $data = $request->validate([
            'start' => ['required', 'date_format:Y-m-d'],
            'end' => ['required', 'date_format:Y-m-d', 'after_or_equal:start'],
            'type' => ['nullable', Rule::in(['masuk', 'keluar'])],
            'search' => ['nullable', 'string', 'max:80'],
            'category' => ['nullable', 'string', 'max:50'],
            'q' => ['nullable', 'string', 'max:80'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        [$start, $end] = $this->validRange($data['start'], $data['end']);

        $rows = $this->finance->entries($start, $end, $data['type'] ?? null, $data['search'] ?? null);

        if (filled($data['category'] ?? null)) {
            // Cocok dengan jenis ("Biaya operasional") maupun kategori ("Gaji")
            $rows = $rows->filter(fn ($r) => $r['category'] === $data['category'] || $r['subcategory'] === $data['category'])->values();
        }
        if (filled($q = trim($data['q'] ?? ''))) {
            $rows = $rows->filter(fn ($r) => collect([$r['description'], $r['category'], $r['subcategory'], $r['customer_name'], $r['reference']])
                ->contains(fn ($v) => $v !== null && mb_stripos($v, $q) !== false))->values();
        }

        $total = $rows->count();
        $meta = ['total' => $total, 'total_amount' => (int) $rows->sum('amount')];

        if (isset($data['page'])) {
            $perPage = (int) ($data['per_page'] ?? 10);
            $pageCount = max(1, (int) ceil($total / $perPage));
            $page = min((int) $data['page'], $pageCount);
            $rows = $rows->forPage($page, $perPage)->values();
            $meta += ['page' => $page, 'per_page' => $perPage, 'page_count' => $pageCount];
        }

        return response()->json(['data' => $rows, 'meta' => $meta]);
    }

    /** POST /api/finance/entries — catat kas masuk / keluar manual. */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedEntry($request);

        $entry = CashEntry::create([...$this->entryFields($data), 'user_id' => $request->user()->id]);

        $this->logger->record(
            $request, 'keuangan', 'tambah',
            "Mencatat kas {$data['type']} {$this->label($entry)} {$this->rupiah($data['amount'])}",
            $entry,
        );

        return response()->json(['data' => $this->row($entry)], 201);
    }

    /** PUT /api/finance/entries/{entry} — ubah catatan manual (pembayaran penjualan/pembelian diubah dari halamannya sendiri). */
    public function update(Request $request, CashEntry $entry): JsonResponse
    {
        abort_if($entry->deleted_at !== null, 404);

        $data = $this->validatedEntry($request, $entry);
        $old = "{$this->label($entry)} {$this->rupiah($entry->amount)}";

        $entry->update($this->entryFields($data));

        $this->logger->record(
            $request, 'keuangan', 'ubah',
            "Mengubah catatan kas {$old} menjadi {$data['type']} {$this->label($entry)} {$this->rupiah($data['amount'])}",
            $entry,
        );

        return response()->json(['data' => $this->row($entry)]);
    }

    /** DELETE /api/finance/entries/{entry} — hapus lunak dengan alasan; tidak lagi dihitung di laporan. */
    public function destroy(Request $request, CashEntry $entry): JsonResponse
    {
        abort_if($entry->deleted_at !== null, 404);

        $data = $request->validate(
            ['reason' => ['required', 'string', 'min:5', 'max:300']],
            [
                'reason.required' => 'Alasan penghapusan wajib diisi (min. 5 karakter).',
                'reason.min' => 'Alasan penghapusan wajib diisi (min. 5 karakter).',
                'reason.max' => 'Maksimal 300 karakter.',
            ],
        );

        $entry->forceFill([
            'deleted_at' => now(),
            'deleted_by' => $request->user()->id,
            'delete_reason' => trim($data['reason']),
        ])->save();

        $this->logger->record(
            $request, 'keuangan', 'hapus',
            "Menghapus catatan kas {$entry->type} {$this->label($entry)} {$this->rupiah($entry->amount)}. Alasan: ".trim($data['reason']),
            $entry,
        );

        return response()->json(['message' => 'Catatan kas dihapus']);
    }

    /** GET /api/finance/types — jenis per arah: {"keluar": [{name, effect, has_subcategory}], "masuk": [...]} */
    public function types(): JsonResponse
    {
        return response()->json(['data' => $this->finance->types()]);
    }

    /**
     * POST /api/finance/types {direction, name, effect} — tambah jenis beserta efeknya ke laporan.
     * Nama yang sudah ada dikembalikan apa adanya (efeknya tidak diubah).
     */
    public function storeType(Request $request): JsonResponse
    {
        $direction = $request->input('direction');
        $data = $request->validate([
            // Hanya jenis uang keluar: uang masuk tidak dicatat manual lagi
            'direction' => ['required', Rule::in(['keluar'])],
            'name' => [
                'required', 'string', 'min:2', 'max:50',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $name = mb_strtolower(trim(preg_replace('/\s+/', ' ', (string) $value)));
                    if (in_array($name, array_map('mb_strtolower', FinanceService::RESERVED_TYPES), true)) {
                        $fail('Nama ini dipakai sistem (penjualan & pelunasan sudah otomatis dari Kasir). Pakai nama lain.');
                    }
                },
            ],
            'effect' => ['required', Rule::in(FinanceService::EFFECTS[$direction] ?? [])],
        ], [
            'name.required' => 'Nama jenis wajib diisi.',
            'name.min' => 'Nama jenis minimal 2 karakter.',
            'name.max' => 'Nama jenis maksimal 50 karakter.',
            'effect.required' => 'Pilih cara jenis ini dihitung di laporan.',
            'effect.in' => 'Pilih cara jenis ini dihitung di laporan.',
            'direction.in' => 'Hanya jenis uang keluar yang bisa ditambah.',
        ]);

        $name = preg_replace('/\s+/', ' ', trim($data['name']));

        if ($existing = $this->finance->findType($data['direction'], $name)) {
            return response()->json(['data' => $this->typeRow($existing), 'types' => $this->finance->types()]);
        }

        DB::table('cash_types')->insert([
            'direction' => $data['direction'], 'name' => $name, 'effect' => $data['effect'],
            'user_id' => $request->user()->id, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->finance->forgetEffects();

        $effectLabel = ['biaya' => 'biaya (mengurangi laba)', 'bukan_biaya' => 'bukan biaya', 'pemasukan' => 'pemasukan lain', 'modal' => 'modal pemilik'][$data['effect']];
        $this->logger->record($request, 'keuangan', 'tambah', "Menambah jenis kas {$data['direction']}: {$name}, dihitung sebagai {$effectLabel}");

        return response()->json([
            'data' => $this->typeRow($this->finance->findType($data['direction'], $name)),
            'types' => $this->finance->types(),
        ], 201);
    }

    /** GET /api/finance/categories — kategori per jenis, mis. {"Biaya operasional": ["Gaji", ...], "Pemasukan lain": [...]} */
    public function categories(): JsonResponse
    {
        return response()->json(['data' => $this->finance->categories()]);
    }

    /** POST /api/finance/categories {parent, name} — tambah kategori; nama yang sudah ada dikembalikan apa adanya. */
    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'parent' => ['required', Rule::in(FinanceService::WITH_SUBCATEGORY)],
            'name' => ['required', 'string', 'min:2', 'max:50'],
        ], [
            'parent.in' => 'Kategori hanya untuk Biaya operasional dan Pemasukan lain.',
            'name.required' => 'Nama kategori wajib diisi.',
            'name.min' => 'Nama kategori minimal 2 karakter.',
            'name.max' => 'Nama kategori maksimal 50 karakter.',
        ]);

        $name = preg_replace('/\s+/', ' ', trim($data['name']));

        if ($existing = $this->finance->findCategory($data['parent'], $name)) {
            return response()->json(['data' => ['parent' => $data['parent'], 'name' => $existing], 'categories' => $this->finance->categories()]);
        }

        DB::table('cash_categories')->insert([
            'parent' => $data['parent'], 'name' => $name, 'user_id' => $request->user()->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->logger->record($request, 'keuangan', 'tambah', "Menambah kategori {$data['parent']}: {$name}");

        return response()->json(['data' => ['parent' => $data['parent'], 'name' => $name], 'categories' => $this->finance->categories()], 201);
    }

    /** GET /api/finance/export?start=&end=&format=pdf|xlsx — unduh laporan rentang bebas (maks. 366 hari). */
    public function export(Request $request): Response
    {
        $data = $request->validate([
            'start' => ['required', 'date_format:Y-m-d'],
            'end' => ['required', 'date_format:Y-m-d', 'after_or_equal:start'],
            'format' => ['required', Rule::in(['pdf', 'xlsx'])],
        ], [
            'end.after_or_equal' => 'Tanggal akhir tidak boleh sebelum tanggal mulai.',
            'format.in' => 'Pilih format PDF atau Excel.',
        ]);

        [$start, $end] = $this->validRange($data['start'], $data['end']);

        $report = $this->finance->exportData($start, $end);
        $file = $data['format'] === 'pdf' ? $this->exporter->pdf($report) : $this->exporter->xlsx($report);

        $this->logger->record(
            $request, 'keuangan', 'unduh',
            'Mengunduh laporan keuangan '.strtoupper($data['format'] === 'xlsx' ? 'excel' : 'pdf')." {$data['start']} s.d. {$data['end']}",
        );

        return response($file['content'], 200, [
            'Content-Type' => $file['mime'],
            'Content-Disposition' => 'attachment; filename="'.$file['name'].'"',
            'Cache-Control' => 'no-store',
        ]);
    }

    // ── bantuan ─────────────────────────────────────────────────────────────

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private function validRange(string $start, string $end): array
    {
        $start = CarbonImmutable::parse($start);
        $end = CarbonImmutable::parse($end);

        if ($start->diffInDays($end) > self::MAX_RANGE_DAYS) {
            abort(response()->json([
                'message' => 'Rentang tanggal maksimal '.self::MAX_RANGE_DAYS.' hari.',
                'errors' => ['end' => ['Rentang tanggal maksimal '.self::MAX_RANGE_DAYS.' hari.']],
            ], 422));
        }

        return [$start, $end];
    }

    /**
     * Validasi catatan manual. Saat mengubah ($existing), jenis lama yang sudah tidak bisa dipilih
     * (mis. "Prive pemilik") tetap boleh dipertahankan supaya catatan lama masih bisa diperbaiki.
     */
    private function validatedEntry(Request $request, ?CashEntry $existing = null): array
    {
        $type = (string) $request->input('type');
        $category = (string) $request->input('category');
        $keepsLegacy = $existing && $existing->type === $type && $existing->category === $category;
        $found = in_array($type, ['masuk', 'keluar'], true) && filled($category) ? $this->finance->findType($type, $category) : null;
        $needsSub = (bool) $found?->has_subcategory;

        // Uang masuk tidak dicatat manual lagi (penjualan & pelunasan otomatis dari Kasir).
        // Catatan masuk lama tetap bisa diperbaiki / dihapus, tapi tidak bisa dibuat baru.
        $types = $existing?->type === 'masuk' ? ['masuk', 'keluar'] : ['keluar'];

        $data = $request->validate([
            'type' => ['required', Rule::in($types)],
            'category' => [
                'required', 'string', 'max:50',
                function (string $attribute, mixed $value, \Closure $fail) use ($found, $keepsLegacy) {
                    if (! $found && ! $keepsLegacy) {
                        $fail('Jenis tidak sesuai dengan arah transaksi.');
                    }
                },
            ],
            'subcategory' => [
                Rule::requiredIf($needsSub), 'nullable', 'string', 'max:50',
                function (string $attribute, mixed $value, \Closure $fail) use ($request, $needsSub) {
                    if ($needsSub && filled($value) && ! $this->finance->findCategory($request->input('category'), (string) $value)) {
                        $fail('Kategori tidak ditemukan. Tambahkan dulu lewat "+ Tambah kategori".');
                    }
                },
            ],
            'amount' => ['required', 'integer', 'min:1', 'max:999999999999'],
            'date' => ['required', 'date_format:Y-m-d'],
            'method' => ['required', Rule::in(FinanceService::METHODS)],
            'description' => ['nullable', 'string', 'max:300'],
        ], [
            'type.in' => 'Uang masuk tidak dicatat manual. Penjualan & pelunasan sudah otomatis tercatat dari Kasir.',
            'subcategory.required' => 'Pilih kategori.',
            'amount.min' => 'Jumlah harus lebih dari 0.',
        ]);

        // Simpan nama jenis & kategori persis seperti di daftar; jenis tanpa kategori selalu null
        if ($found) {
            $data['category'] = $found->name;
        }
        $data['subcategory'] = $needsSub ? $this->finance->findCategory($data['category'], $data['subcategory']) : null;

        return $data;
    }

    private function entryFields(array $data): array
    {
        return [
            'type' => $data['type'],
            'category' => $data['category'],
            'subcategory' => $data['subcategory'],
            'amount' => $data['amount'],
            'entry_date' => $data['date'],
            'method' => $data['method'],
            'description' => filled($data['description'] ?? null) ? trim($data['description']) : null,
        ];
    }

    /** Baris buku kas (bentuk sama dengan GET /entries) untuk satu catatan manual. */
    private function row(CashEntry $entry): array
    {
        $row = DB::table('cash_entries as ce')
            ->leftJoin('users as u', 'u.id', '=', 'ce.user_id')
            ->where('ce.id', $entry->id)
            ->select('ce.*', 'u.name as created_by')
            ->first();

        $this->finance->forgetEffects();
        $result = $this->finance->cashEntryRow($row);
        unset($result['sort_key']);

        return $result;
    }

    /** @return array{name: string, direction: string, effect: string, has_subcategory: bool} */
    private function typeRow(object $t): array
    {
        return ['name' => $t->name, 'direction' => $t->direction, 'effect' => $t->effect, 'has_subcategory' => (bool) $t->has_subcategory];
    }

    /** "Biaya operasional / Gaji" atau "Pembelian barang" (untuk Log Karyawan). */
    private function label(CashEntry $entry): string
    {
        return $entry->subcategory ? "{$entry->category} / {$entry->subcategory}" : $entry->category;
    }

    private function rupiah(int $n): string
    {
        return 'Rp'.number_format($n, 0, ',', '.');
    }
}
