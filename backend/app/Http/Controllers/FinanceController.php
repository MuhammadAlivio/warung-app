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

    /** GET /api/finance/report?period=harian|mingguan|bulanan&date=YYYY-MM-DD */
    public function report(Request $request): JsonResponse
    {
        $data = $request->validate([
            'period' => ['required', Rule::in(FinanceService::PERIODS)],
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

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
            $rows = $rows->where('category', $data['category'])->values();
        }
        if (filled($q = trim($data['q'] ?? ''))) {
            $rows = $rows->filter(fn ($r) => collect([$r['description'], $r['category'], $r['customer_name'], $r['reference']])
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
            "Mencatat kas {$data['type']} {$data['category']} {$this->rupiah($data['amount'])}",
            $entry,
        );

        return response()->json(['data' => $this->row($entry)], 201);
    }

    /** PUT /api/finance/entries/{entry} — ubah catatan manual (pembayaran penjualan/pembelian diubah dari halamannya sendiri). */
    public function update(Request $request, CashEntry $entry): JsonResponse
    {
        abort_if($entry->deleted_at !== null, 404);

        $data = $this->validatedEntry($request);
        $old = "{$entry->category} {$this->rupiah($entry->amount)}";

        $entry->update($this->entryFields($data));

        $this->logger->record(
            $request, 'keuangan', 'ubah',
            "Mengubah catatan kas {$old} menjadi {$data['type']} {$data['category']} {$this->rupiah($data['amount'])}",
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
            "Menghapus catatan kas {$entry->type} {$entry->category} {$this->rupiah($entry->amount)}. Alasan: ".trim($data['reason']),
            $entry,
        );

        return response()->json(['message' => 'Catatan kas dihapus']);
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

    private function validatedEntry(Request $request): array
    {
        return $request->validate([
            'type' => ['required', Rule::in(['masuk', 'keluar'])],
            'category' => [
                'required', 'string',
                Rule::in($request->input('type') === 'masuk' ? FinanceService::CATEGORIES_IN : FinanceService::CATEGORIES_OUT),
            ],
            'amount' => ['required', 'integer', 'min:1', 'max:999999999999'],
            'date' => ['required', 'date_format:Y-m-d'],
            'method' => ['required', Rule::in(FinanceService::METHODS)],
            'description' => ['nullable', 'string', 'max:300'],
        ], [
            'category.in' => 'Jenis tidak sesuai dengan arah transaksi.',
            'amount.min' => 'Jumlah harus lebih dari 0.',
        ]);
    }

    private function entryFields(array $data): array
    {
        return [
            'type' => $data['type'],
            'category' => $data['category'],
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

        $result = $this->finance->cashEntryRow($row);
        unset($result['sort_key']);

        return $result;
    }

    private function rupiah(int $n): string
    {
        return 'Rp'.number_format($n, 0, ',', '.');
    }
}
