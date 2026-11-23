<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Laporan keuangan harian / mingguan / bulanan.
 *
 * Sumber kas (buku kas gabungan):
 *   - sale_payments      -> masuk "Penjualan" (pembayaran pertama) / "Pelunasan piutang" (berikutnya)
 *   - purchase_payments  -> keluar "Pembelian barang"
 *   - cash_entries       -> catatan manual admin
 * Transaksi kasir berstatus batal tidak dihitung.
 *
 * Laba rugi memakai basis akrual: penjualan = total nota yang dibuat di periode itu (lunas maupun belum),
 * HPP = qty terjual x harga beli barang. Arus kas memakai uang yang benar-benar masuk/keluar.
 *
 * Aturan PRD 6.6: minggu Senin-Minggu, zona waktu Asia/Jakarta, uang integer rupiah.
 */
class FinanceService
{
    public const TIMEZONE = 'Asia/Jakarta';

    public const PERIODS = ['harian', 'mingguan', 'bulanan'];

    /**
     * Efek jenis kas ke laporan (kolom cash_types.effect):
     *   keluar: biaya (kas & laba usaha berkurang), bukan_biaya (hanya kas berkurang)
     *   masuk : pemasukan (kas bertambah, bukan penjualan), modal (uang dari pemilik)
     */
    public const EFFECTS = ['keluar' => ['biaya', 'bukan_biaya'], 'masuk' => ['pemasukan', 'modal']];

    /** Jenis yang wajib punya kategori (tabel cash_categories, bisa ditambah admin). */
    public const WITH_SUBCATEGORY = ['Biaya operasional', 'Pemasukan lain'];

    /**
     * Nama jenis milik sistem, tidak bisa dipilih atau dibuat lewat modal Catat:
     * penjualan & pelunasan otomatis dari Kasir (mencegah terhitung dua kali), prive pemilik sudah dihapus
     * (catatan lamanya tetap dihitung dengan benar).
     */
    public const RESERVED_TYPES = ['Penjualan', 'Pelunasan piutang', 'Prive pemilik'];

    public const METHODS = ['tunai', 'transfer', 'qris'];

    private const SALE_CATEGORIES = ['Penjualan', 'Pelunasan piutang'];

    /** Efek per jenis dari cash_types, dimuat sekali per request: ["keluar|biaya operasional" => "biaya", ...] */
    private ?array $effects = null;

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} tanggal awal & akhir (inklusif) */
    public function range(string $period, CarbonImmutable $date): array
    {
        $date = $date->startOfDay();

        return match ($period) {
            'harian' => [$date, $date],
            'mingguan' => [$date->startOfWeek(CarbonInterface::MONDAY), $date->endOfWeek(CarbonInterface::SUNDAY)->startOfDay()],
            'bulanan' => [$date->startOfMonth(), $date->endOfMonth()->startOfDay()],
        };
    }

    public function report(string $period, CarbonImmutable $date): array
    {
        [$start, $end] = $this->range($period, $date);

        // Grafik arus kas: harian = 7 hari terakhir s.d. tanggal terpilih; mingguan/bulanan = rincian periode itu.
        // Harian: data 7 hari diambil SEKALI lalu disaring ke hari terpilih (database jauh, tiap query mahal).
        if ($period === 'harian') {
            $chartStart = $start->subDays(6);
            $week = $this->compute($chartStart, $end);
            $cashflow = $this->breakdown('day', $chartStart, $end, $week);
            $saldoAwal = $cashflow->count() > 1 ? $cashflow[$cashflow->count() - 2]['saldo_akhir'] : $week['summary']['saldo_awal'];
            $r = $this->narrow($week, $start, $saldoAwal);
            $breakdown = $this->breakdown('day', $start, $end, $r);
        } else {
            $r = $this->compute($start, $end);
            $breakdown = $cashflow = $this->breakdown($period === 'bulanan' ? 'week' : 'day', $start, $end, $r);
        }

        return $this->reportPayload($period, $period === 'bulanan' ? 'week' : 'day', $start, $end, $r, $breakdown, $cashflow);
    }

    /**
     * Laporan rentang bebas (tab "Rentang"): rincian & grafik per hari bila rentang <= 31 hari,
     * selain itu per minggu (sama seperti Unduh laporan).
     */
    public function rangeReport(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $start = $start->startOfDay();
        $end = $end->startOfDay();
        $mode = $start->diffInDays($end) < 31 ? 'day' : 'week';

        $r = $this->compute($start, $end);
        $breakdown = $this->breakdown($mode, $start, $end, $r);

        return $this->reportPayload('rentang', $mode, $start, $end, $r, $breakdown, $breakdown);
    }

    private function reportPayload(string $period, string $mode, CarbonImmutable $start, CarbonImmutable $end, array $r, Collection $breakdown, Collection $cashflow): array
    {
        return [
            'period' => ['type' => $period, 'start' => $start->toDateString(), 'end' => $end->toDateString(), 'breakdown' => $mode],
            'summary' => $r['summary'],
            'breakdown' => $breakdown,
            'operational_costs' => $r['entries']->where('effect', 'biaya')->values(),
            'charts' => [
                'cashflow' => $cashflow->map(fn ($b) => [
                    'start' => $b['start'], 'end' => $b['end'], 'label' => $b['label'],
                    'kas_masuk' => $b['kas_masuk'], 'kas_keluar' => $b['kas_keluar'], 'saldo_akhir' => $b['saldo_akhir'],
                ])->values(),
                'expense_by_category' => $this->expenseByCategory($r['entries']),
                'top_products' => $this->topProducts($start, $end),
            ],
        ];
    }

    /**
     * Data laporan untuk rentang bebas (Unduh laporan PDF/Excel).
     * Rincian per hari bila rentang <= 31 hari, selain itu per minggu; arus kas harian selalu disertakan.
     */
    public function exportData(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $start = $start->startOfDay();
        $end = $end->startOfDay();

        $r = $this->compute($start, $end);
        $daily = $this->breakdown('day', $start, $end, $r);
        $perDay = $start->diffInDays($end) < 31;

        return [
            'start' => $start->toDateString(),
            'end' => $end->toDateString(),
            'summary' => $r['summary'],
            'breakdown_mode' => $perDay ? 'day' : 'week',
            'breakdown' => $perDay ? $daily : $this->breakdown('week', $start, $end, $r),
            'daily' => $daily,
            'entries' => $r['entries'],
            'sales' => $this->salesList($start, $end),
            'expense_by_category' => $this->expenseByCategory($r['entries']),
        ];
    }

    /** Ringkasan satu rentang + data mentahnya (dipakai ulang untuk rincian & grafik tanpa query ulang). */
    private function compute(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $entries = $this->entries($start, $end);
        $sales = $this->salesPerDay($start, $end);
        [$saldoAwal, $piutang] = $this->balanceAndReceivables($start, $end);

        $summary = $this->summarize($entries, $sales);
        $summary['saldo_awal'] = $saldoAwal;
        $summary['saldo_akhir'] = $saldoAwal + $summary['arus_kas_bersih'];
        $summary['piutang'] = $piutang;

        return compact('entries', 'sales', 'summary');
    }

    /** Hasil compute() dipersempit ke $start s.d. akhir rentang asal, tanpa query ulang. */
    private function narrow(array $r, CarbonImmutable $start, int $saldoAwal): array
    {
        $from = $start->toDateString();
        $entries = $r['entries']->filter(fn ($e) => $e['date'] >= $from)->values();
        $sales = $r['sales']->filter(fn ($s) => $s['date'] >= $from)->values();

        $summary = $this->summarize($entries, $sales);
        $summary['saldo_awal'] = $saldoAwal;
        $summary['saldo_akhir'] = $saldoAwal + $summary['arus_kas_bersih'];
        $summary['piutang'] = $r['summary']['piutang'];

        return compact('entries', 'sales', 'summary');
    }

    /** Baris rincian per hari ('day') atau per minggu Senin-Minggu ('week'), lengkap dengan saldo akhir berjalan. */
    private function breakdown(string $mode, CarbonImmutable $start, CarbonImmutable $end, array $r): Collection
    {
        $saldo = $r['summary']['saldo_awal'];

        return $this->buckets($mode, $start, $end)->map(function (array $b) use ($r, &$saldo) {
            $inBucket = fn ($row) => $row['date'] >= $b['start'] && $row['date'] <= $b['end'];
            $s = $this->summarize($r['entries']->filter($inBucket), $r['sales']->filter($inBucket));
            $saldo += $s['arus_kas_bersih'];

            return [
                ...$b,
                'penjualan' => $s['penjualan'],
                'kas_masuk' => $s['kas_masuk'],
                'kas_keluar' => $s['kas_keluar'],
                'laba_usaha' => $s['laba_usaha'],
                'saldo_akhir' => $saldo,
                'has_data' => $s['jumlah_transaksi'] > 0 || $s['kas_masuk'] > 0 || $s['kas_keluar'] > 0,
            ];
        })->values();
    }

    /** Total kas keluar per kategori (biaya operasional dirinci: Gaji, Sewa, ...), terbesar dulu. */
    private function expenseByCategory(Collection $entries): Collection
    {
        return $entries->where('type', 'keluar')
            ->groupBy(fn ($e) => $e['subcategory'] ?? $e['category'])
            ->map(fn (Collection $rows, string $category) => ['category' => $category, 'amount' => (int) $rows->sum('amount')])
            ->sortByDesc('amount')
            ->values();
    }

    /** 5 barang terlaris (berdasarkan omzet) dari nota yang tidak batal. */
    private function topProducts(CarbonImmutable $start, CarbonImmutable $end, int $limit = 5): Collection
    {
        $date = $this->localDate('s.created_at');

        return DB::table('sale_items as si')
            ->join('sales as s', 's.id', '=', 'si.sale_id')
            ->where('s.payment_status', '<>', 'batal')
            ->whereRaw("$date between ? and ?", [$start->toDateString(), $end->toDateString()])
            ->groupBy('si.product_id')
            ->selectRaw('si.product_id, max(si.product_name) as name, sum(si.qty) as qty, sum(si.subtotal) as omzet')
            ->orderByDesc('omzet')
            ->orderByDesc('qty')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => ['product_id' => (int) $r->product_id, 'name' => $r->name, 'qty' => (int) $r->qty, 'omzet' => (int) $r->omzet]);
    }

    /** Daftar nota pada rentang (sheet "Penjualan" di Excel), termasuk yang dibatalkan beserta statusnya. */
    private function salesList(CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        $date = $this->localDate('s.created_at');

        return DB::table('sales as s')
            ->leftJoin('customers as c', 'c.id', '=', 's.customer_id')
            ->leftJoin('users as u', 'u.id', '=', 's.user_id')
            ->whereRaw("$date between ? and ?", [$start->toDateString(), $end->toDateString()])
            ->orderBy('s.created_at')
            ->selectRaw("s.invoice_no, $date as date, coalesce(c.name, s.customer_name) as customer_name, u.name as cashier,
                s.payment_method, s.payment_status, s.total, s.paid_amount")
            ->get()
            ->map(fn ($r) => [
                'invoice_no' => $r->invoice_no,
                'date' => (string) $r->date,
                'customer_name' => $r->customer_name ?? 'Pelanggan umum',
                'cashier' => $r->cashier,
                'method' => $r->payment_method,
                'status' => $r->payment_status,
                'total' => (int) $r->total,
                'paid' => (int) $r->paid_amount,
            ]);
    }

    /**
     * Buku kas gabungan pada rentang tanggal, terbaru dulu.
     * $search mencari nama / no. HP pelanggan; jika diisi, hanya pembayaran penjualan yang dikembalikan
     * (catatan manual & pembelian tidak punya pelanggan).
     */
    public function entries(CarbonImmutable $start, CarbonImmutable $end, ?string $type = null, ?string $search = null): Collection
    {
        $search = trim((string) $search);
        $range = [$start->toDateString(), $end->toDateString()];
        $this->forgetEffects(); // muat ulang efek jenis (bisa saja baru ditambah admin)

        $rows = collect();

        if ($type !== 'keluar') {
            $rows = $rows->concat($this->salePaymentRows($range, $search));
        }

        if ($search === '') {
            if ($type !== 'masuk') {
                $rows = $rows->concat($this->purchasePaymentRows($range));
            }
            $rows = $rows->concat($this->cashEntryRows($range, $type));
        }

        return $rows->sortBy([['date', 'desc'], ['sort_key', 'desc']])
            ->map(function ($r) {
                unset($r['sort_key']);

                return $r;
            })
            ->values();
    }

    /**
     * Daftar jenis per arah: bawaan sesuai urutan, tambahan admin menurut abjad.
     *
     * @return array{keluar: list<array{name: string, effect: string, has_subcategory: bool}>, masuk: list<array>}
     */
    public function types(): array
    {
        $rows = DB::table('cash_types')->orderBy('sort_order')->orderByRaw('lower(name)')->get();

        return collect(['keluar', 'masuk'])->mapWithKeys(fn (string $dir) => [$dir => $rows->where('direction', $dir)
            ->map(fn ($t) => ['name' => $t->name, 'effect' => $t->effect, 'has_subcategory' => (bool) $t->has_subcategory])
            ->values()->all()])->all();
    }

    /** Jenis tersimpan (pencarian tanpa beda huruf besar/kecil), null bila tidak ada. */
    public function findType(string $direction, string $name): ?object
    {
        return DB::table('cash_types')
            ->where('direction', $direction)
            ->whereRaw('lower(name) = lower(?)', [trim($name)])
            ->first();
    }

    /** Efek satu jenis. Jenis lama yang tidak ada di cash_types mengikuti aturan sebelumnya. */
    public function effectOf(string $direction, string $category): string
    {
        $this->effects ??= DB::table('cash_types')->get(['direction', 'name', 'effect'])
            ->mapWithKeys(fn ($t) => [$t->direction.'|'.mb_strtolower($t->name) => $t->effect])->all();

        return $this->effects[$direction.'|'.mb_strtolower($category)] ?? match (true) {
            $direction === 'keluar' => in_array($category, ['Pembelian barang', 'Prive pemilik'], true) ? 'bukan_biaya' : 'biaya',
            in_array($category, self::SALE_CATEGORIES, true) => 'penjualan',
            $category === 'Prive masuk' => 'modal',
            default => 'pemasukan',
        };
    }

    /** Lupakan efek yang sudah dimuat (setelah jenis baru ditambah). */
    public function forgetEffects(): void
    {
        $this->effects = null;
    }

    /**
     * Daftar kategori per jenis: bawaan sesuai urutan, tambahan admin menurut abjad, "Lainnya" terakhir.
     *
     * @return array<string, list<string>>
     */
    public function categories(): array
    {
        $rows = DB::table('cash_categories')->orderBy('sort_order')->orderByRaw('lower(name)')->get(['parent', 'name']);

        return collect(self::WITH_SUBCATEGORY)
            ->mapWithKeys(fn (string $parent) => [$parent => $rows->where('parent', $parent)->pluck('name')->values()->all()])
            ->all();
    }

    /** Nama kategori persis seperti tersimpan (pencarian tanpa beda huruf besar/kecil), null bila tidak ada. */
    public function findCategory(string $parent, string $name): ?string
    {
        return DB::table('cash_categories')
            ->where('parent', $parent)
            ->whereRaw('lower(name) = lower(?)', [trim($name)])
            ->value('name');
    }

    /** Bentuk baris buku kas untuk satu catatan manual (dipakai respons POST). */
    public function cashEntryRow(object $e): array
    {
        return [
            'id' => 'manual-'.$e->id,
            'entry_id' => (int) $e->id, // untuk ubah / hapus (PUT/DELETE /api/finance/entries/{entry_id})
            'source' => 'manual',
            'type' => $e->type,
            'category' => $e->category,
            'subcategory' => $e->subcategory ?? null,
            'effect' => $this->effectOf($e->type, $e->category),
            'amount' => (int) $e->amount,
            'date' => substr((string) $e->entry_date, 0, 10),
            'method' => $e->method,
            'description' => $e->description,
            'reference' => null,
            'customer_name' => null,
            'created_by' => $e->created_by ?? null,
            'sort_key' => (string) $e->created_at,
        ];
    }

    // ── sumber data ─────────────────────────────────────────────────────────

    private function salePaymentRows(array $range, string $search): Collection
    {
        $date = $this->localDate('sp.paid_at');

        $query = DB::table('sale_payments as sp')
            ->join('sales as s', 's.id', '=', 'sp.sale_id')
            ->leftJoin('customers as c', 'c.id', '=', 's.customer_id')
            ->leftJoin('users as u', 'u.id', '=', 'sp.user_id')
            ->where('s.payment_status', '<>', 'batal')
            ->whereRaw("$date between ? and ?", $range)
            ->selectRaw("sp.id, $date as date, sp.amount, sp.method, sp.paid_at, s.invoice_no,
                coalesce(c.name, s.customer_name) as customer_name, u.name as created_by,
                not exists (select 1 from sale_payments p2 where p2.sale_id = sp.sale_id and p2.id < sp.id) as is_first");

        if ($search !== '') {
            $this->applyCustomerSearch($query, $search);
        }

        return $query->get()->map(function ($r) {
            $first = (bool) $r->is_first;

            return [
                'id' => 'sale-payment-'.$r->id,
                'source' => 'penjualan',
                'type' => 'masuk',
                'category' => $first ? 'Penjualan' : 'Pelunasan piutang',
                'subcategory' => null,
                'effect' => 'penjualan',
                'amount' => (int) $r->amount,
                'date' => (string) $r->date,
                'method' => $r->method,
                'description' => ($first ? 'Penjualan #' : 'Pelunasan #').$r->invoice_no,
                'reference' => $r->invoice_no,
                'customer_name' => $r->customer_name ?? 'Pelanggan umum',
                'created_by' => $r->created_by,
                'sort_key' => (string) $r->paid_at,
            ];
        });
    }

    private function purchasePaymentRows(array $range): Collection
    {
        return DB::table('purchase_payments as pp')
            ->join('purchases as p', 'p.id', '=', 'pp.purchase_id')
            ->join('suppliers as sup', 'sup.id', '=', 'p.supplier_id')
            ->leftJoin('users as u', 'u.id', '=', 'pp.user_id')
            // Faktur dibatalkan: pembayarannya dianggap dikembalikan pemasok, tidak dihitung
            ->whereNull('p.cancelled_at')
            ->whereBetween('pp.paid_at', $range)
            ->select('pp.id', 'pp.paid_at', 'pp.amount', 'pp.method', 'pp.created_at', 'p.purchase_no', 'sup.name as supplier_name', 'u.name as created_by')
            ->get()
            ->map(fn ($r) => [
                'id' => 'purchase-payment-'.$r->id,
                'source' => 'pembelian',
                'type' => 'keluar',
                'category' => 'Pembelian barang',
                'subcategory' => null,
                'effect' => 'bukan_biaya',
                'amount' => (int) $r->amount,
                'date' => substr((string) $r->paid_at, 0, 10),
                'method' => $r->method === 'transfer_bank' ? 'transfer' : $r->method,
                'description' => "Bayar {$r->supplier_name} #{$r->purchase_no}",
                'reference' => $r->purchase_no,
                'customer_name' => null,
                'created_by' => $r->created_by,
                'sort_key' => (string) $r->created_at,
            ]);
    }

    private function cashEntryRows(array $range, ?string $type): Collection
    {
        return DB::table('cash_entries as ce')
            ->leftJoin('users as u', 'u.id', '=', 'ce.user_id')
            ->whereNull('ce.deleted_at')
            ->whereBetween('ce.entry_date', $range)
            ->when($type, fn ($q) => $q->where('ce.type', $type))
            ->select('ce.*', 'u.name as created_by')
            ->get()
            ->map(fn ($r) => $this->cashEntryRow($r));
    }

    /** Penjualan (akrual) dan HPP per tanggal lokal, dari nota yang tidak batal. */
    private function salesPerDay(CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        $date = $this->localDate('s.created_at');
        $range = [$start->toDateString(), $end->toDateString()];

        // Satu query: total & jumlah nota + HPP tiap nota (subquery lateral), dikelompokkan per tanggal
        return DB::table('sales as s')
            ->crossJoin(DB::raw('lateral (select sum(si.qty * pr.buy_price) as hpp from sale_items si
                join products pr on pr.id = si.product_id where si.sale_id = s.id) h'))
            ->where('s.payment_status', '<>', 'batal')
            ->whereRaw("$date between ? and ?", $range)
            ->groupByRaw('1')
            ->selectRaw("$date as date, sum(s.total) as total, count(*) as jumlah, coalesce(sum(h.hpp), 0) as hpp")
            ->get()
            ->map(fn ($t) => [
                'date' => (string) $t->date,
                'total' => (int) $t->total,
                'jumlah' => (int) $t->jumlah,
                'hpp' => (int) $t->hpp,
            ])->values();
    }

    /**
     * Satu query untuk dua angka:
     *   saldo awal = akumulasi kas masuk - kas keluar sebelum $start
     *   piutang    = sisa tagihan nota belum lunas yang dibuat s.d. $end (posisi pembayaran saat ini)
     *
     * @return array{0: int, 1: int}
     */
    private function balanceAndReceivables(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $before = $start->toDateString();
        $saleDate = $this->localDate('sp.paid_at');
        $createdDate = $this->localDate('s.created_at');

        $row = DB::selectOne("select
            (select coalesce(sum(sp.amount), 0) from sale_payments sp join sales s on s.id = sp.sale_id
                where s.payment_status <> 'batal' and $saleDate < ?) as sales_in,
            (select coalesce(sum(pp.amount), 0) from purchase_payments pp join purchases p on p.id = pp.purchase_id
                where p.cancelled_at is null and pp.paid_at < ?) as purchase_out,
            (select coalesce(sum(case when type = 'masuk' then amount else -amount end), 0) from cash_entries
                where deleted_at is null and entry_date < ?) as manual,
            (select coalesce(sum(s.total - s.paid_amount), 0) from sales s
                where s.payment_status = 'belum_lunas' and $createdDate <= ?) as piutang",
            [$before, $before, $before, $end->toDateString()]);

        return [(int) $row->sales_in - (int) $row->purchase_out + (int) $row->manual, (int) $row->piutang];
    }

    // ── perhitungan ─────────────────────────────────────────────────────────

    private function summarize(Collection $entries, Collection $sales): array
    {
        $sum = fn (callable $filter) => (int) $entries->filter($filter)->sum('amount');

        $kasMasuk = $sum(fn ($e) => $e['type'] === 'masuk');
        $kasKeluar = $sum(fn ($e) => $e['type'] === 'keluar');
        $masukPenjualan = $sum(fn ($e) => $e['type'] === 'masuk' && in_array($e['category'], self::SALE_CATEGORIES, true));

        // Penjualan manual (di luar kasir) ikut dihitung sebagai penjualan, tanpa HPP karena barangnya tidak diketahui
        $penjualanManual = $sum(fn ($e) => $e['source'] === 'manual' && $e['category'] === 'Penjualan');
        $penjualan = (int) $sales->sum('total') + $penjualanManual;
        $hpp = (int) $sales->sum('hpp');
        $biayaOperasional = $sum(fn ($e) => $e['type'] === 'keluar' && $e['effect'] === 'biaya');
        $bayarPemasok = $sum(fn ($e) => $e['type'] === 'keluar' && $e['category'] === 'Pembelian barang');
        $prive = $sum(fn ($e) => $e['type'] === 'keluar' && $e['category'] === 'Prive pemilik');
        $masukModal = $sum(fn ($e) => $e['type'] === 'masuk' && $e['effect'] === 'modal');
        $labaKotor = $penjualan - $hpp;

        return [
            'pemasukan' => $kasMasuk,
            'pengeluaran' => $kasKeluar,
            'penjualan' => $penjualan,
            'hpp' => $hpp,
            'laba_kotor' => $labaKotor,
            'biaya_operasional' => $biayaOperasional,
            'laba_usaha' => $labaKotor - $biayaOperasional,
            'kas_masuk' => $kasMasuk,
            'kas_keluar' => $kasKeluar,
            'masuk_penjualan' => $masukPenjualan,
            'masuk_modal' => $masukModal,
            'masuk_lainnya' => $kasMasuk - $masukPenjualan - $masukModal,
            'bayar_pemasok' => $bayarPemasok,
            'prive' => $prive,
            // Jenis "bukan biaya" buatan admin selain pembelian & prive (mis. "Cicilan pinjaman")
            'keluar_lainnya' => $kasKeluar - $bayarPemasok - $biayaOperasional - $prive,
            'arus_kas_bersih' => $kasMasuk - $kasKeluar,
            'jumlah_transaksi' => (int) $sales->sum('jumlah'),
        ];
    }

    /** Baris rincian: per hari untuk harian/mingguan, per minggu (Senin-Minggu, dipotong batas bulan) untuk bulanan. */
    private function buckets(string $mode, CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        $buckets = collect();

        if ($mode === 'day') {
            for ($d = $start; $d->lte($end); $d = $d->addDay()) {
                $buckets->push(['start' => $d->toDateString(), 'end' => $d->toDateString(), 'label' => $d->toDateString()]);
            }

            return $buckets;
        }

        $n = 1;
        for ($mon = $start->startOfWeek(CarbonInterface::MONDAY); $mon->lte($end); $mon = $mon->addWeek()) {
            $from = $mon->max($start);
            $to = $mon->addDays(6)->min($end);
            $buckets->push(['start' => $from->toDateString(), 'end' => $to->toDateString(), 'label' => 'Minggu '.$n++]);
        }

        return $buckets;
    }

    // ── util SQL ────────────────────────────────────────────────────────────

    /** Kolom TIMESTAMP (disimpan dalam zona app.timezone) -> tanggal lokal Asia/Jakarta. */
    private function localDate(string $column): string
    {
        $storeTz = config('app.timezone');
        if (! in_array($storeTz, timezone_identifiers_list(), true)) {
            $storeTz = 'UTC';
        }

        return "(({$column} at time zone '{$storeTz}') at time zone '".self::TIMEZONE."')::date";
    }

    /** Cocokkan nama pelanggan (tanpa beda huruf besar/kecil) atau no. HP (hanya angka, abaikan spasi/strip). */
    private function applyCustomerSearch(Builder $query, string $search): void
    {
        $escape = fn (string $v) => str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $v);
        $digits = preg_replace('/\D/', '', $search);

        $query->where(function (Builder $w) use ($search, $digits, $escape) {
            $w->whereRaw('lower(coalesce(c.name, s.customer_name, \'\')) like ?', ['%'.$escape(mb_strtolower($search)).'%']);

            if (strlen($digits) >= 3) {
                $w->orWhereRaw("regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') like ?", ['%'.$digits.'%']);
            }
        });
    }
}
