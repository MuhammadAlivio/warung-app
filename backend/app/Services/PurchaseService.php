<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchasePayment;
use App\Models\PurchaseReceipt;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Pembelian dari pemasok: buat faktur, catat pembayaran, dan terima barang (khusus admin).
 *
 * Setiap operasi berjalan dalam satu database transaction dengan baris `purchases` dikunci (NFR-04).
 * Stok HANYA bertambah saat barang diterima, lewat StockService (tercatat di stock_movements
 * dengan type "purchase"). Pengeluaran kas TIDAK dicatat ke cash_entries: FinanceService sudah
 * membaca purchase_payments sebagai pengeluaran "Pembelian barang".
 */
class PurchaseService
{
    public function __construct(private StockService $stock) {}

    /**
     * @param  array{supplier_id:int, purchase_no:string, purchase_date:string, due_date:?string, location:string,
     *               notes:?string, items:array<array{product_id:int, qty:int, unit_price:int}>,
     *               initial_payment:int, payment_method:?string, receive_all:bool}  $data
     */
    public function create(array $data, User $user): Purchase
    {
        return DB::transaction(function () use ($data, $user) {
            $products = Product::active()->whereIn('id', collect($data['items'])->pluck('product_id'))->get()->keyBy('id');

            $lines = collect($data['items'])->values()->map(function (array $row, int $idx) use ($products) {
                $product = $products[$row['product_id']] ?? null;
                if (! $product) {
                    throw ValidationException::withMessages(["items.{$idx}.product_id" => 'Barang tidak ditemukan atau sudah dihapus.']);
                }

                return [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'unit' => $product->unit,
                    'qty' => (int) $row['qty'],
                    'qty_received' => 0,
                    'unit_price' => (int) $row['unit_price'],
                    'subtotal' => (int) $row['qty'] * (int) $row['unit_price'],
                ];
            });

            $subtotal = (int) $lines->sum('subtotal');
            $total = $subtotal; // biaya tambahan belum dipakai di form
            $initial = (int) ($data['initial_payment'] ?? 0);

            if ($initial > $total) {
                throw ValidationException::withMessages(['initial_payment' => 'Pembayaran awal tidak boleh melebihi total pembelian.']);
            }

            $purchase = Purchase::create([
                'purchase_no' => ($data['purchase_no'] ?? null) ?: $this->nextPurchaseNo($data['purchase_date']),
                'supplier_id' => $data['supplier_id'],
                'user_id' => $user->id,
                'purchase_date' => $data['purchase_date'],
                'due_date' => $data['due_date'] ?? null,
                'location' => $data['location'],
                'status' => 'belum_diterima',
                'subtotal' => $subtotal,
                'additional_cost' => 0,
                'total' => $total,
                'notes' => $data['notes'] ?? null,
            ]);

            $purchase->items()->createMany($lines->all());

            if ($initial > 0) {
                $this->insertPayment($purchase, $data['purchase_date'], $data['payment_method'], $initial, 'Pembayaran awal', $user);
            }

            // "Barang sudah diterima semua": langsung terima seluruh pesanan, stok langsung bertambah
            if ($data['receive_all'] ?? false) {
                $purchase->load('items');
                $this->insertReceipt(
                    $purchase,
                    $purchase->items->mapWithKeys(fn (PurchaseItem $i) => [$i->id => $i->qty])->all(),
                    $data['purchase_date'],
                    null,
                    'Diterima lengkap saat pembelian dicatat.',
                    $user,
                );
            }

            return $purchase->fresh(Purchase::API_WITH);
        });
    }

    public function addPayment(Purchase $purchase, string $date, string $method, int $amount, ?string $note, User $user): Purchase
    {
        return DB::transaction(function () use ($purchase, $date, $method, $amount, $note, $user) {
            $locked = $this->lock($purchase)->load('payments');
            $debt = $locked->debt();

            if ($debt <= 0) {
                throw ValidationException::withMessages(['amount' => 'Faktur ini sudah lunas.']);
            }
            if ($amount > $debt) {
                throw ValidationException::withMessages(['amount' => 'Jumlah melebihi sisa utang ('.$this->rupiah($debt).').']);
            }
            if ($date < $locked->purchase_date->toDateString()) {
                throw ValidationException::withMessages(['paid_at' => 'Tanggal bayar tidak boleh sebelum tanggal pembelian.']);
            }

            $this->insertPayment($locked, $date, $method, $amount, $note ?: 'Cicilan', $user);

            return $locked->fresh(Purchase::API_WITH);
        });
    }

    /**
     * Catat barang yang tiba. Stok setiap barang bertambah sejumlah yang diterima.
     *
     * @param  array<int, int>  $quantities  [purchase_item_id => qty diterima sekarang]
     */
    public function receive(Purchase $purchase, array $quantities, string $date, ?string $deliveryNote, ?string $notes, User $user): Purchase
    {
        return DB::transaction(function () use ($purchase, $quantities, $date, $deliveryNote, $notes, $user) {
            $locked = $this->lock($purchase)->load('items');

            if ($locked->status === 'diterima') {
                throw ValidationException::withMessages(['items' => 'Seluruh barang pada faktur ini sudah diterima.']);
            }
            if ($date < $locked->purchase_date->toDateString()) {
                throw ValidationException::withMessages(['received_at' => 'Tanggal penerimaan tidak boleh sebelum tanggal pembelian.']);
            }

            $this->insertReceipt($locked, $quantities, $date, $deliveryNote, $notes, $user);

            return $locked->fresh(Purchase::API_WITH);
        });
    }

    private function lock(Purchase $purchase): Purchase
    {
        return Purchase::whereKey($purchase->getKey())->lockForUpdate()->firstOrFail();
    }

    private function insertPayment(Purchase $purchase, string $date, string $method, int $amount, ?string $note, User $user): void
    {
        PurchasePayment::create([
            'purchase_id' => $purchase->id,
            'paid_at' => $date,
            'method' => $method,
            'amount' => $amount,
            'note' => $note,
            'user_id' => $user->id,
            'created_at' => now(),
        ]);
    }

    /** @param  array<int, int>  $quantities  [purchase_item_id => qty] (item dengan qty 0 dilewati) */
    private function insertReceipt(Purchase $purchase, array $quantities, string $date, ?string $deliveryNote, ?string $notes, User $user): PurchaseReceipt
    {
        $items = $purchase->items->keyBy('id');
        $rows = [];

        foreach ($quantities as $itemId => $qty) {
            $qty = (int) $qty;
            if ($qty <= 0) {
                continue;
            }

            $item = $items[$itemId] ?? null;
            if (! $item) {
                throw ValidationException::withMessages(['items' => 'Barang tidak ada di faktur ini.']);
            }
            if ($qty > $item->remaining()) {
                throw ValidationException::withMessages([
                    'items' => "Jumlah {$item->product_name} melebihi sisa pesanan ({$item->remaining()} {$item->unit}).",
                ]);
            }

            $rows[] = [$item, $qty];
        }

        if (! $rows) {
            throw ValidationException::withMessages(['items' => 'Isi jumlah barang yang diterima, minimal satu barang.']);
        }

        // Jam penerimaan = jam sekarang (WIB) pada tanggal yang dipilih, disimpan dalam UTC
        $receivedAt = CarbonImmutable::parse($date.' '.CarbonImmutable::now(Purchase::TIMEZONE)->format('H:i:s'), Purchase::TIMEZONE)
            ->setTimezone(config('app.timezone'));

        $receipt = PurchaseReceipt::create([
            'purchase_id' => $purchase->id,
            'receipt_no' => $this->nextReceiptNo(),
            'received_at' => $receivedAt,
            'received_by' => $user->id,
            'delivery_note' => $deliveryNote ?: null,
            'notes' => $notes ?: null,
            'created_at' => now(),
        ]);

        foreach ($rows as [$item, $qty]) {
            $receipt->items()->create(['purchase_item_id' => $item->id, 'qty' => $qty]);
            $item->forceFill(['qty_received' => $item->qty_received + $qty])->save();

            $this->stock->adjust(
                $item->product_id, $qty, 'purchase', $user,
                "Barang masuk #{$receipt->receipt_no} (faktur {$purchase->purchase_no})",
                'purchase_receipt', $receipt->id,
            );
        }

        $purchase->forceFill(['status' => Purchase::statusFor($purchase->items)])->save();

        return $receipt;
    }

    /**
     * Nomor faktur otomatis jika admin tidak mengisi nomor pemasok: PB-YYMMDD-NNN per tanggal pembelian
     * (mis. PB-211126-001). Dikunci per transaksi agar dua pembelian bersamaan tidak dapat nomor sama.
     */
    public function nextPurchaseNo(string $purchaseDate): string
    {
        DB::select('select pg_advisory_xact_lock(hashtext(?))', ['purchases.purchase_no']);

        $prefix = 'PB-'.CarbonImmutable::parse($purchaseDate)->format('dmy').'-';
        $last = DB::table('purchases')
            ->where('purchase_no', 'like', $prefix.'%')
            ->whereRaw("purchase_no ~ '^PB-[0-9]{6}-[0-9]+$'")
            ->selectRaw('max(cast(substring(purchase_no from 11) as integer)) as n')
            ->value('n');

        return $prefix.str_pad((string) (((int) $last) + 1), 3, '0', STR_PAD_LEFT);
    }

    /** BM-0001, BM-0002, ... Dikunci per transaksi agar dua penerimaan bersamaan tidak dapat nomor sama. */
    private function nextReceiptNo(): string
    {
        DB::select('select pg_advisory_xact_lock(hashtext(?))', ['purchase_receipts.receipt_no']);

        $last = DB::table('purchase_receipts')
            ->where('receipt_no', 'like', 'BM-%')
            ->selectRaw("max(cast(substring(receipt_no from 4) as integer)) as n")
            ->whereRaw("receipt_no ~ '^BM-[0-9]+$'")
            ->value('n');

        return 'BM-'.str_pad((string) (((int) $last) + 1), 4, '0', STR_PAD_LEFT);
    }

    private function rupiah(int $n): string
    {
        return 'Rp'.number_format($n, 0, ',', '.');
    }
}
