<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Services\ActivityLogger;
use App\Services\SaleService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Kasir (simpan transaksi) dan Riwayat Transaksi (daftar, detail, edit barang, pelunasan, pembatalan).
 * Admin & kasir punya akses yang sama, termasuk pembatalan (keputusan tim 9 Nov 2026).
 */
class SaleController extends Controller
{
    private const MAX_MONEY = 1_000_000_000_000;

    private const MAX_QTY = 1_000_000;

    /** Label frontend -> nilai database. */
    private const METHODS = ['Tunai' => 'tunai', 'TF' => 'transfer'];

    private const STATUSES = ['Lunas' => 'lunas', 'Belum Lunas' => 'belum_lunas', 'Dibatalkan' => 'batal'];

    public function __construct(private SaleService $sales, private ActivityLogger $logger) {}

    /**
     * Daftar transaksi + filter. `q` mencari nomor transaksi ATAU nama / no. HP pelanggan.
     * `category_id` = transaksi yang berisi minimal satu barang dari jenis/kategori tersebut.
     * Tanggal: `date` (satu hari) atau rentang `date_from` / `date_to` (boleh salah satu saja), tanggal lokal WIB.
     * `cashier_id` = kasir yang melayani.
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            ...$this->filterRules(),
            'status' => ['nullable', Rule::in(array_keys(self::STATUSES))],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ], $this->filterMessages());

        $page = $this->filtered($data)
            ->with('user:id,name')
            ->withSum('items as units', 'qty')
            ->when($data['status'] ?? null, fn (Builder $b, $s) => $b->where('payment_status', self::STATUSES[$s]))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($data['per_page'] ?? 6);

        return response()->json([
            'data' => collect($page->items())->map->toListApi(),
            'meta' => [
                'total' => $page->total(),
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'page_count' => max(1, $page->lastPage()),
            ],
        ]);
    }

    /**
     * Tiga kartu statistik di atas Riwayat Transaksi, mengikuti filter daftar (tanggal/rentang, kasir,
     * metode, jenis barang, pencarian) kecuali status. Tanpa tanggal sama sekali = hari ini (WIB);
     * `all=1` = semua tanggal. Transaksi batal tidak dihitung.
     */
    public function summary(Request $request): JsonResponse
    {
        $data = $request->validate([
            ...$this->filterRules(),
            'all' => ['nullable', 'boolean'],
        ], $this->filterMessages());

        if (empty($data['all']) && empty($data['date']) && empty($data['date_from']) && empty($data['date_to'])) {
            $data['date'] = CarbonImmutable::now(Sale::TIMEZONE)->toDateString();
        }

        $row = $this->filtered($data)
            ->where('payment_status', '<>', 'batal')
            ->selectRaw("
                coalesce(sum(total), 0) as net,
                coalesce(sum(total) filter (where payment_status = 'lunas'), 0) as lunas,
                count(*) filter (where payment_status = 'lunas') as lunas_count,
                coalesce(sum(total - paid_amount) filter (where payment_status = 'belum_lunas'), 0) as unpaid,
                count(*) filter (where payment_status = 'belum_lunas') as unpaid_count
            ")
            ->toBase()
            ->first();

        return response()->json(['data' => [
            'date' => $data['date'] ?? null,
            'date_from' => $data['date_from'] ?? null,
            'date_to' => $data['date_to'] ?? null,
            'net' => (int) $row->net,
            'lunas' => (int) $row->lunas,
            'lunas_count' => (int) $row->lunas_count,
            'unpaid' => (int) $row->unpaid,
            'unpaid_count' => (int) $row->unpaid_count,
        ]]);
    }

    /** Perkiraan nomor transaksi berikutnya (ditampilkan di keranjang Kasir sebelum disimpan). */
    public function nextNumber(): JsonResponse
    {
        return response()->json(['data' => ['no' => $this->sales->nextInvoiceNo()]]);
    }

    public function show(Sale $sale): JsonResponse
    {
        return response()->json(['data' => $sale->toDetailApi()]);
    }

    /** Simpan transaksi dari halaman Kasir. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'method' => ['required', Rule::in(array_keys(self::METHODS))],
            'cash' => ['required', 'integer', 'min:0', 'max:'.self::MAX_MONEY],
            'print_doc' => ['nullable', Rule::in(['receipt', 'invoice', 'none'])],
            ...$this->itemRules(),
        ], [
            'customer_id.exists' => 'Pelanggan tidak ditemukan',
            'method.*' => 'Pilih metode pembayaran',
            'cash.*' => 'Nominal uang diterima tidak valid',
            ...$this->itemMessages(),
        ]);

        $sale = $this->sales->create([...$data, 'method' => self::METHODS[$data['method']]], $request->user());

        $this->logger->record($request, 'kasir', 'tambah', "Membuat transaksi #{$sale->invoice_no} (".$this->rupiah($sale->total).')', $sale);

        return response()->json(['data' => $sale->toDetailApi()], 201);
    }

    /** Edit Transaksi: ganti daftar barang + alasan. */
    public function updateItems(Request $request, Sale $sale): JsonResponse
    {
        $data = $request->validate([
            ...$this->itemRules(),
            'reason' => ['required', 'string', 'min:5', 'max:300'],
        ], [
            ...$this->itemMessages(),
            'reason.required' => 'Alasan perubahan wajib diisi (min. 5 karakter).',
            'reason.min' => 'Alasan perubahan wajib diisi (min. 5 karakter).',
            'reason.max' => 'Maksimal 300 karakter.',
        ]);

        $sale = $this->sales->editItems($sale, $data['items'], trim($data['reason']), $request->user());

        $this->logger->record($request, 'transaksi', 'ubah', "Mengubah barang transaksi #{$sale->invoice_no}: ".trim($data['reason']), $sale);

        return response()->json(['data' => $sale->toDetailApi()]);
    }

    /** Edit pembayaran: catat pelunasan / cicilan. */
    public function addPayment(Request $request, Sale $sale): JsonResponse
    {
        $today = CarbonImmutable::now(Sale::TIMEZONE)->toDateString();

        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.$today],
            'method' => ['required', Rule::in(array_keys(self::METHODS))],
            'amount' => ['required', 'integer', 'min:1', 'max:'.self::MAX_MONEY],
            'note' => ['nullable', 'string', 'max:200'],
        ], [
            'date.required' => 'Tanggal pelunasan wajib diisi',
            'date.date_format' => 'Tanggal pelunasan tidak valid',
            'date.before_or_equal' => 'Tanggal pelunasan tidak boleh melewati hari ini',
            'method.*' => 'Pilih metode pelunasan',
            'amount.required' => 'Nominal wajib diisi',
            'amount.integer' => 'Nominal harus bilangan bulat',
            'amount.min' => 'Nominal minimal Rp1',
            'amount.max' => 'Nominal terlalu besar',
            'note.max' => 'Maksimal 200 karakter',
        ]);

        $sale = $this->sales->addPayment($sale, $data['date'], self::METHODS[$data['method']], (int) $data['amount'], $data['note'] ?? null, $request->user());

        $this->logger->record($request, 'transaksi', 'ubah', 'Mencatat pelunasan '.$this->rupiah((int) $data['amount'])." transaksi #{$sale->invoice_no}", $sale);

        return response()->json(['data' => $sale->toDetailApi()]);
    }

    /** Batalkan transaksi (admin & kasir). */
    public function cancel(Request $request, Sale $sale): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:300'],
        ], [
            'reason.required' => 'Alasan pembatalan wajib diisi (min. 5 karakter).',
            'reason.min' => 'Alasan pembatalan wajib diisi (min. 5 karakter).',
            'reason.max' => 'Maksimal 300 karakter.',
        ]);

        $sale = $this->sales->cancel($sale, trim($data['reason']), $request->user());

        $this->logger->record($request, 'transaksi', 'hapus', "Membatalkan transaksi #{$sale->invoice_no}: ".trim($data['reason']), $sale);

        return response()->json(['data' => $sale->toDetailApi()]);
    }

    // ── bantuan ─────────────────────────────────────────────────────────────

    /** Filter yang dipakai bersama oleh daftar transaksi dan kartu ringkasan. */
    private function filterRules(): array
    {
        return [
            'date' => ['nullable', 'date_format:Y-m-d'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'method' => ['nullable', Rule::in(array_keys(self::METHODS))],
            'q' => ['nullable', 'string', 'max:100'],
            'category_id' => ['nullable', 'integer'],
            'cashier_id' => ['nullable', 'integer'],
        ];
    }

    private function filterMessages(): array
    {
        return ['date_to.after_or_equal' => 'Tanggal akhir tidak boleh sebelum tanggal awal.'];
    }

    private function filtered(array $data): Builder
    {
        $q = trim((string) ($data['q'] ?? ''));
        $localDate = Sale::localDateSql('sales.created_at');

        return Sale::query()
            ->when($data['date'] ?? null, fn (Builder $b, $d) => $b->onLocalDate($d))
            ->when($data['date_from'] ?? null, fn (Builder $b, $d) => $b->whereRaw("{$localDate} >= ?", [$d]))
            ->when($data['date_to'] ?? null, fn (Builder $b, $d) => $b->whereRaw("{$localDate} <= ?", [$d]))
            ->when($data['cashier_id'] ?? null, fn (Builder $b, $c) => $b->where('user_id', $c))
            ->when($data['method'] ?? null, fn (Builder $b, $m) => $b->where('payment_method', self::METHODS[$m]))
            ->when($data['category_id'] ?? null, fn (Builder $b, $c) => $b->whereExists(fn ($e) => $e
                ->select(DB::raw(1))
                ->from('sale_items as si')
                ->join('products as p', 'p.id', '=', 'si.product_id')
                ->whereColumn('si.sale_id', 'sales.id')
                ->where('p.category_id', $c)))
            ->when($q !== '', fn (Builder $b) => $this->applySearch($b, $q));
    }

    /** Nomor transaksi, nama pelanggan (snapshot atau data terbaru), atau no. HP (angka saja, min. 3 digit). */
    private function applySearch(Builder $query, string $search): void
    {
        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search).'%';
        $digits = preg_replace('/\D/', '', $search);

        $query->where(function (Builder $w) use ($like, $digits) {
            $w->where('invoice_no', 'ilike', $like)
                ->orWhere('customer_name', 'ilike', $like)
                ->orWhereHas('customer', function (Builder $c) use ($like, $digits) {
                    $c->where('name', 'ilike', $like);
                    if (strlen($digits) >= 3) {
                        $c->orWhereRaw("regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') like ?", ['%'.$digits.'%']);
                    }
                });
        });
    }

    private function itemRules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.product_id' => ['required', 'integer', 'distinct'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:'.self::MAX_QTY],
        ];
    }

    private function itemMessages(): array
    {
        return [
            'items.required' => 'Minimal satu barang harus ada di transaksi.',
            'items.min' => 'Minimal satu barang harus ada di transaksi.',
            'items.max' => 'Maksimal 200 jenis barang per transaksi.',
            'items.*.product_id.distinct' => 'Barang yang sama tercantum lebih dari sekali.',
            'items.*.product_id.*' => 'Barang tidak valid.',
            'items.*.qty.*' => 'Jumlah harus bilangan bulat minimal 1.',
        ];
    }

    private function rupiah(int $n): string
    {
        return 'Rp'.number_format($n, 0, ',', '.');
    }
}
