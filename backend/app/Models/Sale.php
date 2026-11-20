<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Transaksi kasir (nota penjualan). Jangan ubah item/pembayaran/status langsung:
 * pakai SaleService supaya stok, total, status bayar, dan riwayat perubahan tetap konsisten.
 */
#[Fillable([
    'invoice_no', 'user_id', 'customer_id', 'customer_name', 'total', 'paid_amount', 'cash_received',
    'change_amount', 'payment_method', 'payment_status', 'print_doc', 'print_size',
    'cancelled_at', 'cancelled_by', 'cancel_reason',
])]
class Sale extends Model
{
    public const TIMEZONE = 'Asia/Jakarta';

    /** Nilai database -> label yang dipakai frontend (Tunai / TF, Lunas / Belum Lunas / Dibatalkan). */
    public const METHOD_LABELS = ['tunai' => 'Tunai', 'transfer' => 'TF'];

    public const STATUS_LABELS = ['lunas' => 'Lunas', 'belum_lunas' => 'Belum Lunas', 'batal' => 'Dibatalkan'];

    public const GENERAL_CUSTOMER = 'Pelanggan umum';

    /** Ukuran kertas faktur yang bisa dipilih di Kasir (kolom print_size). */
    public const INVOICE_SIZES = ['A4', 'A5'];

    protected function casts(): array
    {
        return [
            'total' => 'integer',
            'paid_amount' => 'integer',
            'cash_received' => 'integer',
            'change_amount' => 'integer',
            'cancelled_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class)->orderBy('id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class)->orderBy('paid_at')->orderBy('id');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(SaleHistory::class)->orderBy('created_at')->orderBy('id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** Kasir yang melayani. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isCancelled(): bool
    {
        return $this->payment_status === 'batal';
    }

    public function remaining(): int
    {
        return $this->isCancelled() ? 0 : max($this->total - $this->paid_amount, 0);
    }

    /** Status bayar dari total & jumlah dibayar (untuk transaksi yang tidak batal). */
    public static function statusFor(int $total, int $paid): string
    {
        return $paid >= $total ? 'lunas' : 'belum_lunas';
    }

    /** Transaksi yang dibuat pada tanggal lokal (Asia/Jakarta) tertentu, format Y-m-d. */
    public function scopeOnLocalDate(Builder $query, string $date): void
    {
        $query->whereRaw(self::localDateSql($query->qualifyColumn('created_at')).' = ?', [$date]);
    }

    /** Kolom TIMESTAMP (disimpan dalam zona app.timezone) -> tanggal lokal Asia/Jakarta (Postgres). */
    public static function localDateSql(string $column): string
    {
        $storeTz = config('app.timezone');
        if (! in_array($storeTz, timezone_identifiers_list(), true)) {
            $storeTz = 'UTC';
        }

        return "(({$column} at time zone '{$storeTz}') at time zone '".self::TIMEZONE."')::date";
    }

    /** Baris tabel Riwayat Transaksi (tanpa rincian item). Butuh kolom `units` dari withSum. */
    public function toListApi(): array
    {
        return [
            'id' => $this->id,
            'no' => $this->invoice_no,
            'date' => $this->created_at?->toIso8601String(),
            'customer' => [
                'id' => $this->customer_id,
                'name' => $this->customer_name ?: self::GENERAL_CUSTOMER,
            ],
            'method' => self::METHOD_LABELS[$this->payment_method] ?? $this->payment_method,
            'status' => self::STATUS_LABELS[$this->payment_status] ?? $this->payment_status,
            'cancelled' => $this->isCancelled(),
            'total' => $this->total,
            'paid' => $this->paid_amount,
            'remaining' => $this->remaining(),
            'units' => (int) ($this->units ?? $this->items->sum('qty')),
            'cashier' => $this->user?->name,
        ];
    }

    /** Detail lengkap untuk panel detail, struk, faktur, dan halaman Edit Transaksi. */
    public function toDetailApi(): array
    {
        $this->loadMissing(['items', 'payments.user:id,name', 'histories.user:id,name', 'customer', 'user:id,name']);

        return [
            ...$this->toListApi(),
            'units' => (int) $this->items->sum('qty'),
            'customer' => [
                'id' => $this->customer_id,
                'name' => $this->customer_name ?: self::GENERAL_CUSTOMER,
                'phone' => $this->customer?->phone,
                'address' => $this->customer?->address,
            ],
            'cashier' => $this->user?->name,
            'cash' => $this->cash_received,
            'change' => $this->change_amount,
            'print_doc' => $this->print_doc,
            'print_size' => $this->print_size ?? 'A4',
            'cancel_reason' => $this->cancel_reason,
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'items' => $this->items->map(fn (SaleItem $i) => [
                'id' => $i->id,
                'product_id' => $i->product_id,
                'name' => $i->product_name,
                'unit' => $i->unit,
                'price' => $i->unit_price,
                'qty' => $i->qty,
                'subtotal' => $i->subtotal,
            ])->values(),
            'payments' => $this->payments->map(fn (SalePayment $p) => [
                'id' => $p->id,
                'date' => $p->paid_at?->toIso8601String(),
                'method' => self::METHOD_LABELS[$p->method] ?? $p->method,
                'amount' => $p->amount,
                'note' => $p->note,
                'by' => $p->user?->name,
            ])->values(),
            'history' => $this->histories->map(fn (SaleHistory $h) => [
                'id' => $h->id,
                'at' => $h->created_at?->toIso8601String(),
                'type' => $h->type,
                'reason' => $h->reason,
                'by' => $h->user?->name,
            ])->values(),
        ];
    }
}
