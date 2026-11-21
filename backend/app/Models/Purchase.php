<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Pembelian dari pemasok (faktur). Jangan ubah item/penerimaan/pembayaran langsung:
 * pakai PurchaseService supaya stok, status penerimaan, dan sisa utang tetap konsisten.
 */
#[Fillable([
    'purchase_no', 'supplier_id', 'user_id', 'purchase_date', 'due_date', 'location', 'status',
    'subtotal', 'additional_cost', 'total', 'estimated_next_delivery', 'notes',
])]
class Purchase extends Model
{
    public const TIMEZONE = 'Asia/Jakarta';

    public const PAYMENT_METHODS = ['transfer_bank', 'tunai', 'cek'];

    protected function casts(): array
    {
        return [
            'purchase_date' => 'date',
            'due_date' => 'date',
            'estimated_next_delivery' => 'date',
            'subtotal' => 'integer',
            'additional_cost' => 'integer',
            'total' => 'integer',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Lokasi penerimaan (purchases.location = purchase_locations.code). */
    public function locationRef(): BelongsTo
    {
        return $this->belongsTo(PurchaseLocation::class, 'location', 'code');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class)->orderBy('id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PurchasePayment::class)->orderBy('paid_at')->orderBy('id');
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(PurchaseReceipt::class)->orderBy('received_at')->orderBy('id');
    }

    public function paid(): int
    {
        return (int) $this->payments->sum('amount');
    }

    public function debt(): int
    {
        return max($this->total - $this->paid(), 0);
    }

    /** belum_bayar | sebagian | lunas */
    public function paymentStatus(): string
    {
        $paid = $this->paid();

        return match (true) {
            $paid <= 0 => 'belum_bayar',
            $paid < $this->total => 'sebagian',
            default => 'lunas',
        };
    }

    /** Status penerimaan dari jumlah diterima per item. */
    public static function statusFor(iterable $items): string
    {
        $qty = 0;
        $received = 0;
        foreach ($items as $item) {
            $qty += $item->qty;
            $received += $item->qty_received;
        }

        return match (true) {
            $received <= 0 => 'belum_diterima',
            $received < $qty => 'diterima_sebagian',
            default => 'diterima',
        };
    }

    /** Relasi yang dibutuhkan toApi(). */
    public const API_WITH = ['supplier', 'locationRef', 'user:id,name', 'items.product:id,sku', 'payments.user:id,name', 'receipts.items', 'receipts.receiver:id,name'];

    public function toApi(): array
    {
        $local = fn ($dt) => $dt?->copy()->setTimezone(self::TIMEZONE);
        $itemsById = $this->items->keyBy('id');

        return [
            'id' => $this->id,
            'purchase_no' => $this->purchase_no,
            'supplier' => $this->supplier?->toApi(),
            'purchase_date' => $this->purchase_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'location' => $this->location,
            'location_name' => $this->locationRef?->name ?? $this->location,
            'status' => $this->status,
            'payment_status' => $this->paymentStatus(),
            'subtotal' => $this->subtotal,
            'additional_cost' => $this->additional_cost,
            'total' => $this->total,
            'paid' => $this->paid(),
            'debt' => $this->debt(),
            'estimated_next_delivery' => $this->estimated_next_delivery?->toDateString(),
            'notes' => $this->notes ?? '',
            'created_by' => $this->user?->name,
            'created_at' => $local($this->created_at)?->format('Y-m-d H:i'),
            'items' => $this->items->map(fn (PurchaseItem $i) => [
                'id' => $i->id,
                'product_id' => $i->product_id,
                'product_name' => $i->product_name,
                'sku' => $i->product?->sku ?? '',
                'unit' => $i->unit ?? 'pcs',
                'qty' => $i->qty,
                'qty_received' => $i->qty_received,
                'unit_price' => $i->unit_price,
                'subtotal' => $i->subtotal,
            ])->values(),
            'payments' => $this->payments->map(fn (PurchasePayment $p) => [
                'id' => $p->id,
                'paid_at' => $p->paid_at?->toDateString(),
                'method' => $p->method,
                'amount' => $p->amount,
                'note' => $p->note ?? '',
                'user_name' => $p->user?->name,
            ])->values(),
            'receipts' => $this->receipts->map(fn (PurchaseReceipt $r) => [
                'id' => $r->id,
                'receipt_no' => $r->receipt_no,
                'date' => $local($r->received_at)?->toDateString(),
                'time' => $local($r->received_at)?->format('H:i'),
                'received_by' => $r->receiver?->name ?? '-',
                'delivery_note' => $r->delivery_note ?? '',
                'notes' => $r->notes ?? '',
                'items' => $r->items->map(fn (PurchaseReceiptItem $ri) => [
                    'purchase_item_id' => $ri->purchase_item_id,
                    'product_id' => $itemsById[$ri->purchase_item_id]?->product_id,
                    'product_name' => $itemsById[$ri->purchase_item_id]?->product_name,
                    'unit' => $itemsById[$ri->purchase_item_id]?->unit ?? 'pcs',
                    'qty' => $ri->qty,
                ])->values(),
            ])->values(),
        ];
    }
}
