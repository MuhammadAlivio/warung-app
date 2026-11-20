<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleHistory;
use App\Models\SalePayment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Transaksi kasir: simpan dari Kasir, edit barang, pelunasan, dan pembatalan (Riwayat Transaksi).
 *
 * Setiap operasi berjalan dalam satu database transaction dengan baris `sales` dikunci (NFR-04),
 * stok diubah lewat StockService (tidak pernah minus, tercatat di stock_movements), dan setiap
 * perubahan setelah transaksi dibuat dicatat di sale_histories.
 *
 * Pemasukan kas TIDAK dicatat ke cash_entries: FinanceService sudah membaca sale_payments.
 */
class SaleService
{
    public function __construct(private StockService $stock) {}

    /**
     * Simpan transaksi dari halaman Kasir.
     *
     * @param  array{customer_id: ?int, method: string, cash: int, print_doc: ?string, items: array<array{product_id:int, qty:int}>}  $data
     */
    public function create(array $data, User $user): Sale
    {
        return DB::transaction(function () use ($data, $user) {
            $lines = $this->priceLines(collect($data['items']), collect());
            $total = (int) $lines->sum('subtotal');
            $cash = (int) $data['cash'];
            $paid = min($cash, $total);
            $status = Sale::statusFor($total, $paid);

            $customerId = $data['customer_id'] ?? null;
            $customer = $customerId ? Customer::find($customerId) : null;
            if ($status === 'belum_lunas' && ! $customer) {
                throw ValidationException::withMessages([
                    'customer_id' => 'Pilih pelanggan untuk mencatat transaksi yang belum lunas.',
                ]);
            }

            $sale = Sale::create([
                'invoice_no' => $this->nextInvoiceNo(lock: true),
                'user_id' => $user->id,
                'customer_id' => $customer?->id,
                'customer_name' => $customer?->name,
                'total' => $total,
                'paid_amount' => $paid,
                'cash_received' => $cash,
                'change_amount' => max($cash - $total, 0),
                'payment_method' => $data['method'],
                'payment_status' => $status,
                'print_doc' => $data['print_doc'] ?? 'receipt',
                'print_size' => $data['print_size'] ?? 'A4',
            ]);

            $sale->items()->createMany($lines->all());

            foreach ($lines as $line) {
                $this->stock->adjust($line['product_id'], -$line['qty'], 'sale', $user, "Penjualan #{$sale->invoice_no}", 'sale', $sale->id);
            }

            if ($paid > 0) {
                SalePayment::create([
                    'sale_id' => $sale->id,
                    'paid_at' => $sale->created_at,
                    'method' => $data['method'],
                    'amount' => $paid,
                    'note' => 'Pembayaran awal',
                    'user_id' => $user->id,
                    'created_at' => now(),
                ]);
            }

            return $sale->fresh();
        });
    }

    /**
     * Ganti daftar barang (Edit Transaksi). Pembayaran yang sudah diterima tidak berubah.
     *
     * @param  array<array{product_id:int, qty:int}>  $items
     */
    public function editItems(Sale $sale, array $items, string $reason, User $user): Sale
    {
        return DB::transaction(function () use ($sale, $items, $reason, $user) {
            $sale = $this->lock($sale);

            $old = $sale->items()->get();
            $lines = $this->priceLines(collect($items), $old);
            $total = (int) $lines->sum('subtotal');

            if ($total < $sale->paid_amount) {
                throw ValidationException::withMessages([
                    'items' => 'Total baru ('.$this->rupiah($total).') tidak boleh lebih kecil dari pembayaran yang sudah diterima ('.$this->rupiah($sale->paid_amount).').',
                ]);
            }

            // Selisih stok per barang: qty lama dikembalikan, qty baru dipotong
            $delta = [];
            foreach ($old as $i) {
                $delta[$i->product_id] = ($delta[$i->product_id] ?? 0) + $i->qty;
            }
            foreach ($lines as $l) {
                $delta[$l['product_id']] = ($delta[$l['product_id']] ?? 0) - $l['qty'];
            }
            // Pengembalian stok dulu, baru pemotongan
            asort($delta);
            foreach (array_reverse($delta, true) as $productId => $change) {
                $this->stock->adjust($productId, $change, 'sale_edit', $user, "Edit transaksi #{$sale->invoice_no}", 'sale', $sale->id);
            }

            $sale->items()->delete();
            $sale->items()->createMany($lines->all());

            $sale->forceFill([
                'total' => $total,
                'payment_status' => Sale::statusFor($total, $sale->paid_amount),
            ])->save();

            $this->history($sale, 'edit', $reason, $user);

            return $sale->fresh();
        });
    }

    /** Pelunasan / cicilan dari tombol "Edit pembayaran". $date = tanggal lokal Y-m-d. */
    public function addPayment(Sale $sale, string $date, string $method, int $amount, ?string $note, User $user): Sale
    {
        return DB::transaction(function () use ($sale, $date, $method, $amount, $note, $user) {
            $sale = $this->lock($sale);

            $remaining = $sale->remaining();
            if ($remaining <= 0) {
                throw ValidationException::withMessages(['amount' => 'Transaksi ini sudah lunas.']);
            }
            if ($amount > $remaining) {
                throw ValidationException::withMessages([
                    'amount' => 'Nominal tidak boleh melebihi sisa tagihan ('.$this->rupiah($remaining).').',
                ]);
            }

            // Tanggal pilihan pengguna + jam sekarang (WIB), disimpan dalam zona aplikasi
            $now = CarbonImmutable::now(Sale::TIMEZONE);
            $paidAt = CarbonImmutable::parse($date.' '.$now->format('H:i:s'), Sale::TIMEZONE)->setTimezone(config('app.timezone'));

            $note = $note !== null && trim($note) !== '' ? trim($note) : 'Pelunasan '.(Sale::METHOD_LABELS[$method] ?? $method);

            SalePayment::create([
                'sale_id' => $sale->id,
                'paid_at' => $paidAt,
                'method' => $method,
                'amount' => $amount,
                'note' => $note,
                'user_id' => $user->id,
                'created_at' => now(),
            ]);

            $paid = $sale->paid_amount + $amount;
            $sale->forceFill([
                'paid_amount' => $paid,
                'payment_status' => Sale::statusFor($sale->total, $paid),
            ])->save();

            $this->history($sale, 'payment', $note, $user);

            return $sale->fresh();
        });
    }

    /** Batalkan transaksi: stok kembali, status Dibatalkan, data tetap tersimpan (BR-07). */
    public function cancel(Sale $sale, string $reason, User $user): Sale
    {
        return DB::transaction(function () use ($sale, $reason, $user) {
            $sale = $this->lock($sale);

            foreach ($sale->items()->get() as $item) {
                $this->stock->adjust($item->product_id, $item->qty, 'sale_cancel', $user, "Batal transaksi #{$sale->invoice_no}", 'sale', $sale->id);
            }

            $sale->forceFill([
                'payment_status' => 'batal',
                'cancelled_at' => now(),
                'cancelled_by' => $user->id,
                'cancel_reason' => $reason,
            ])->save();

            $this->history($sale, 'cancel', $reason, $user);

            return $sale->fresh();
        });
    }

    /**
     * Nomor transaksi TRX-DDMMYY-NNN (tanggal WIB, urut per hari).
     * $lock = true mengunci penomoran sampai transaksi database selesai supaya tidak ada nomor kembar.
     */
    public function nextInvoiceNo(bool $lock = false): string
    {
        if ($lock) {
            DB::select("select pg_advisory_xact_lock(hashtext('sales_invoice_no'))");
        }

        $prefix = 'TRX-'.CarbonImmutable::now(Sale::TIMEZONE)->format('dmy').'-';

        $last = DB::table('sales')
            ->where('invoice_no', 'like', $prefix.'%')
            ->whereRaw("invoice_no ~ '^TRX-[0-9]{6}-[0-9]+$'")
            ->selectRaw("max(cast(split_part(invoice_no, '-', 3) as integer)) as seq")
            ->value('seq');

        return $prefix.str_pad((string) ((int) $last + 1), 3, '0', STR_PAD_LEFT);
    }

    // ── bantuan ─────────────────────────────────────────────────────────────

    private function lock(Sale $sale): Sale
    {
        $locked = Sale::whereKey($sale->getKey())->lockForUpdate()->firstOrFail();

        if ($locked->isCancelled()) {
            throw ValidationException::withMessages(['sale' => 'Transaksi yang dibatalkan tidak dapat diubah.']);
        }

        return $locked;
    }

    /**
     * Baris item siap simpan. Harga TIDAK diambil dari klien:
     * barang yang sudah ada di nota memakai snapshot lama, barang baru memakai harga jual saat ini.
     *
     * @param  Collection<int, array{product_id:int, qty:int}>  $items
     * @param  Collection<int, \App\Models\SaleItem>  $existing
     */
    private function priceLines(Collection $items, Collection $existing): Collection
    {
        $snapshot = $existing->keyBy('product_id');
        $products = Product::whereIn('id', $items->pluck('product_id'))->get()->keyBy('id');

        return $items->values()->map(function (array $row, int $idx) use ($snapshot, $products) {
            $productId = (int) $row['product_id'];
            $qty = (int) $row['qty'];
            $old = $snapshot->get($productId);
            $product = $products->get($productId);

            if (! $old && (! $product || ! $product->is_active)) {
                throw ValidationException::withMessages(["items.{$idx}.product_id" => 'Barang tidak ditemukan atau sudah dihapus.']);
            }

            $price = $old ? $old->unit_price : $product->sell_price;

            return [
                'product_id' => $productId,
                'product_name' => $old ? $old->product_name : $product->name,
                'unit' => $old ? $old->unit : $product->unit,
                'unit_price' => $price,
                'qty' => $qty,
                'subtotal' => $price * $qty,
            ];
        });
    }

    private function history(Sale $sale, string $type, ?string $reason, User $user): void
    {
        SaleHistory::create([
            'sale_id' => $sale->id,
            'type' => $type,
            'reason' => $reason,
            'user_id' => $user->id,
            'created_at' => now(),
        ]);
    }

    private function rupiah(int $n): string
    {
        return 'Rp'.number_format($n, 0, ',', '.');
    }
}
