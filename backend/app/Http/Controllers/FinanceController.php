<?php

namespace App\Http\Controllers;

use App\Models\CashEntry;
use App\Services\ActivityLogger;
use App\Services\FinanceService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Halaman Keuangan. Semua endpoint khusus admin (route middleware role:admin, PRD BR-05). */
class FinanceController extends Controller
{
    /** Batas rentang untuk daftar buku kas, supaya query tetap ringan. */
    private const MAX_RANGE_DAYS = 366;

    public function __construct(private FinanceService $finance, private ActivityLogger $logger) {}

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

    /** GET /api/finance/entries?start=&end=&type=masuk|keluar&search= (search = nama / no. HP pelanggan) */
    public function entries(Request $request): JsonResponse
    {
        $data = $request->validate([
            'start' => ['required', 'date_format:Y-m-d'],
            'end' => ['required', 'date_format:Y-m-d', 'after_or_equal:start'],
            'type' => ['nullable', Rule::in(['masuk', 'keluar'])],
            'search' => ['nullable', 'string', 'max:80'],
        ]);

        $start = CarbonImmutable::parse($data['start']);
        $end = CarbonImmutable::parse($data['end']);

        if ($start->diffInDays($end) > self::MAX_RANGE_DAYS) {
            return response()->json([
                'message' => 'Rentang tanggal maksimal '.self::MAX_RANGE_DAYS.' hari.',
                'errors' => ['end' => ['Rentang tanggal maksimal '.self::MAX_RANGE_DAYS.' hari.']],
            ], 422);
        }

        return response()->json([
            'data' => $this->finance->entries($start, $end, $data['type'] ?? null, $data['search'] ?? null),
        ]);
    }

    /** POST /api/finance/entries — catat kas masuk / keluar manual. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
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

        $entry = CashEntry::create([
            'type' => $data['type'],
            'category' => $data['category'],
            'amount' => $data['amount'],
            'entry_date' => $data['date'],
            'method' => $data['method'],
            'description' => filled($data['description'] ?? null) ? trim($data['description']) : null,
            'user_id' => $request->user()->id,
        ]);

        $arah = $data['type'] === 'masuk' ? 'masuk' : 'keluar';
        $this->logger->record(
            $request, 'keuangan', 'tambah',
            "Mencatat kas {$arah} {$data['category']} Rp".number_format($data['amount'], 0, ',', '.'),
            $entry,
        );

        $row = DB::table('cash_entries')->where('id', $entry->id)->first();
        $row->created_by = $request->user()->name;
        $result = $this->finance->cashEntryRow($row);
        unset($result['sort_key']);

        return response()->json(['data' => $result], 201);
    }
}
