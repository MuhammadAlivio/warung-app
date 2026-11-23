<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use App\Services\ActivityLogger;
use App\Services\PurchaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Pembelian & Barang Masuk (khusus admin; kasir tidak punya akses sama sekali, keputusan tim 4 Nov 2026).
 * Daftar dikirim semua sekaligus; filter periode/status/cari dilakukan di frontend.
 */
class PurchaseController extends Controller
{
    private const MAX_PRICE = 1_000_000_000_000;

    private const MAX_QTY = 1_000_000;

    public function __construct(private PurchaseService $purchases, private ActivityLogger $logger) {}

    public function index(): JsonResponse
    {
        $rows = Purchase::with(Purchase::API_WITH)->orderByDesc('purchase_date')->orderByDesc('id')->get();

        return response()->json(['data' => $rows->map->toApi()]);
    }

    public function show(Purchase $purchase): JsonResponse
    {
        return response()->json(['data' => $purchase->load(Purchase::API_WITH)->toApi()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            // Opsional: nomor dari kertas faktur pemasok; kosong = dibuat otomatis PB-YYMMDD-NNN
            'purchase_no' => ['nullable', 'string', 'max:40'],
            'purchase_date' => ['required', 'date_format:Y-m-d'],
            'due_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:purchase_date'],
            'location' => ['required', 'string', 'exists:purchase_locations,code'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.product_id' => ['required', 'integer', 'distinct'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:'.self::MAX_QTY],
            'items.*.unit_price' => ['required', 'integer', 'min:0', 'max:'.self::MAX_PRICE],
            'initial_payment' => ['nullable', 'integer', 'min:0', 'max:'.self::MAX_PRICE],
            'payment_method' => ['required_with:initial_payment', Rule::in(Purchase::PAYMENT_METHODS)],
            'receive_all' => ['sometimes', 'boolean'],
        ], [
            'supplier_id.required' => 'Pilih pemasok',
            'supplier_id.exists' => 'Pemasok tidak ditemukan',
            'purchase_no.max' => 'Nomor faktur maksimal 40 karakter',
            'purchase_date.required' => 'Tanggal pembelian wajib diisi',
            'due_date.after_or_equal' => 'Jatuh tempo tidak boleh sebelum tanggal pembelian',
            'location.required' => 'Pilih lokasi penerimaan',
            'location.exists' => 'Lokasi penerimaan tidak ditemukan',
            'items.required' => 'Tambahkan minimal satu barang',
            'items.min' => 'Tambahkan minimal satu barang',
            'items.*.product_id.distinct' => 'Barang yang sama tidak boleh ditambahkan dua kali',
            'items.*.qty.min' => 'Jumlah minimal 1',
            'items.*.qty.integer' => 'Jumlah harus angka bulat',
            'items.*.unit_price.integer' => 'Harga modal harus angka bulat',
            'items.*.unit_price.min' => 'Harga modal minimal 0',
            'initial_payment.min' => 'Pembayaran awal minimal 0',
            'payment_method.in' => 'Pilih metode pembayaran',
        ]);

        $data['purchase_no'] = trim($data['purchase_no'] ?? '') ?: null;
        if ($data['purchase_no'] && Purchase::whereRaw('lower(purchase_no) = ?', [mb_strtolower($data['purchase_no'])])->exists()) {
            return response()->json([
                'message' => 'Nomor faktur sudah dipakai',
                'errors' => ['purchase_no' => ['Nomor faktur sudah dipakai']],
            ], 422);
        }

        $data['initial_payment'] = (int) ($data['initial_payment'] ?? 0);
        $data['payment_method'] ??= 'transfer_bank';
        $data['receive_all'] = (bool) ($data['receive_all'] ?? false);

        $purchase = $this->purchases->create($data, $request->user());

        $this->logger->record(
            $request, 'pembelian', 'tambah',
            "Mencatat pembelian {$purchase->purchase_no} dari {$purchase->supplier->name}"
                .($data['receive_all'] ? ' (barang langsung diterima)' : ''),
            $purchase,
        );

        return response()->json(['data' => $purchase->toApi()], 201);
    }

    public function addPayment(Request $request, Purchase $purchase): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:'.self::MAX_PRICE],
            'paid_at' => ['required', 'date_format:Y-m-d'],
            'method' => ['required', Rule::in(Purchase::PAYMENT_METHODS)],
            'note' => ['nullable', 'string', 'max:200'],
        ], [
            'amount.required' => 'Jumlah dibayar wajib diisi',
            'amount.min' => 'Jumlah minimal Rp1',
            'amount.integer' => 'Jumlah harus angka bulat',
            'paid_at.required' => 'Tanggal bayar wajib diisi',
            'method.in' => 'Pilih metode pembayaran',
        ]);

        $purchase = $this->purchases->addPayment($purchase, $data['paid_at'], $data['method'], $data['amount'], $data['note'] ?? null, $request->user());

        $this->logger->record(
            $request, 'pembelian', 'ubah',
            "Mencatat pembayaran Rp".number_format($data['amount'], 0, ',', '.')." untuk faktur {$purchase->purchase_no}",
            $purchase,
        );

        return response()->json(['data' => $purchase->toApi()]);
    }

    /** Batalkan faktur yang tidak jadi (hanya jika belum ada barang diterima). */
    public function cancel(Request $request, Purchase $purchase): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:300'],
        ], [
            'reason.required' => 'Alasan pembatalan wajib diisi',
            'reason.min' => 'Alasan pembatalan minimal 5 karakter',
            'reason.max' => 'Alasan pembatalan maksimal 300 karakter',
        ]);

        $purchase = $this->purchases->cancel($purchase, trim($data['reason']), $request->user());

        $paid = $purchase->paid();
        $this->logger->record(
            $request, 'pembelian', 'ubah',
            "Membatalkan pembelian {$purchase->purchase_no}: {$purchase->cancel_reason}"
                .($paid > 0 ? ' (pembayaran Rp'.number_format($paid, 0, ',', '.').' dianggap dikembalikan pemasok)' : ''),
            $purchase,
        );

        return response()->json(['data' => $purchase->toApi()]);
    }

    public function receive(Request $request, Purchase $purchase): JsonResponse
    {
        $data = $request->validate([
            'received_at' => ['required', 'date_format:Y-m-d'],
            'delivery_note' => ['nullable', 'string', 'max:60'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.purchase_item_id' => ['required', 'integer', 'distinct'],
            'items.*.qty' => ['required', 'integer', 'min:0', 'max:'.self::MAX_QTY],
        ], [
            'received_at.required' => 'Tanggal penerimaan wajib diisi',
            'delivery_note.max' => 'Nomor surat jalan maksimal 60 karakter',
            'items.required' => 'Isi jumlah barang yang diterima',
            'items.*.qty.min' => 'Jumlah tidak boleh minus',
            'items.*.qty.integer' => 'Jumlah harus angka bulat',
        ]);

        $quantities = collect($data['items'])->mapWithKeys(fn ($r) => [(int) $r['purchase_item_id'] => (int) $r['qty']])->all();
        $purchase = $this->purchases->receive($purchase, $quantities, $data['received_at'], $data['delivery_note'] ?? null, $data['notes'] ?? null, $request->user());

        $receipt = $purchase->receipts->last();
        $units = $receipt?->items->sum('qty') ?? 0;
        $this->logger->record(
            $request, 'pembelian', 'tambah',
            "Menerima barang #{$receipt?->receipt_no} ({$units} unit) untuk faktur {$purchase->purchase_no}",
            $purchase,
        );

        return response()->json(['data' => $purchase->toApi()], 201);
    }
}
