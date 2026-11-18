<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\StoreProfile;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Schema;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * File "Unduh laporan" di halaman Keuangan. Isi sesuai keterangan di modal Unduh:
 *   PDF   : ringkasan 1-2 halaman (laba rugi, arus kas, rincian, biaya operasional)
 *   Excel : 4 sheet (Ringkasan, Penjualan, Arus Kas, Transaksi kas)
 * Data dari FinanceService::exportData, jadi angkanya sama dengan laporan di layar.
 */
class FinanceExporter
{
    private const RUPIAH = '"Rp"#,##0;-"Rp"#,##0';

    private const METHOD_LABELS = ['tunai' => 'Tunai', 'transfer' => 'Transfer', 'qris' => 'QRIS', 'cek' => 'Cek'];

    /** @return array{content: string, mime: string, name: string} */
    public function pdf(array $report): array
    {
        $html = view('reports.finance', [
            'r' => $report,
            'store' => $this->store(),
            'periodLabel' => $this->periodLabel($report),
            'operational' => $report['entries']->where('effect', 'biaya')->sortBy('date')->values(),
            'fmtDate' => fn (string $d) => $this->date($d),
            'rp' => fn (int $n) => $this->rupiah($n),
            'printedAt' => CarbonImmutable::now(FinanceService::TIMEZONE)->locale('id')->translatedFormat('j F Y H.i'),
        ])->render();

        return [
            // Font subsetting: hanya huruf yang dipakai yang disematkan, file jauh lebih kecil
            'content' => Pdf::loadHTML($html)->setPaper('a4')->setOption('isFontSubsettingEnabled', true)->output(),
            'mime' => 'application/pdf',
            'name' => $this->fileName($report, 'pdf'),
        ];
    }

    /** @return array{content: string, mime: string, name: string} */
    public function xlsx(array $report): array
    {
        $book = new Spreadsheet;
        $book->getProperties()->setTitle('Laporan Keuangan')->setCreator($this->store()['name']);

        $this->summarySheet($book->getActiveSheet(), $report);
        $this->salesSheet($book->createSheet(), $report);
        $this->cashflowSheet($book->createSheet(), $report);
        $this->entriesSheet($book->createSheet(), $report);
        $book->setActiveSheetIndex(0);

        ob_start();
        (new Xlsx($book))->save('php://output');
        $content = ob_get_clean();
        $book->disconnectWorksheets();

        return [
            'content' => $content,
            'mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'name' => $this->fileName($report, 'xlsx'),
        ];
    }

    // ── sheet Excel ─────────────────────────────────────────────────────────

    private function summarySheet(Worksheet $sheet, array $r): void
    {
        $s = $r['summary'];
        $store = $this->store();
        $sheet->setTitle('Ringkasan');

        $rows = [
            [$store['name']],
            [trim(implode(' · ', array_filter([$store['address'], $store['phone']])))],
            ['Laporan keuangan '.$this->periodLabel($r)],
            [],
            ['Laba rugi'],
            ['Penjualan', $s['penjualan']],
            ['HPP barang terjual', -$s['hpp']],
            ['Laba kotor', $s['laba_kotor']],
            ['Biaya operasional', -$s['biaya_operasional']],
            ['Laba usaha', $s['laba_usaha']],
            [],
            ['Arus kas'],
            ['Saldo awal', $s['saldo_awal']],
            ['Penjualan dibayar', $s['masuk_penjualan']],
            ['Modal pemilik', $s['masuk_modal']],
            ['Pemasukan lain', $s['masuk_lainnya']],
            ['Bayar pemasok', -$s['bayar_pemasok']],
            ['Operasional', -$s['biaya_operasional']],
            ['Pengeluaran lain (bukan biaya)', -$s['keluar_lainnya']],
            ['Prive pemilik', -$s['prive']],
            ['Arus kas bersih', $s['arus_kas_bersih']],
            ['Saldo akhir', $s['saldo_akhir']],
            [],
            ['Indikator'],
            ['Jumlah transaksi', $s['jumlah_transaksi']],
            ['Piutang (belum lunas)', $s['piutang']],
        ];
        $sheet->fromArray($rows, null, 'A1', true);

        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        foreach ([5, 12, 24] as $row) {
            $sheet->getStyle("A{$row}")->getFont()->setBold(true);
        }
        foreach ([10, 22] as $row) {
            $sheet->getStyle("A{$row}:B{$row}")->getFont()->setBold(true);
        }
        $sheet->getStyle('B6:B23')->getNumberFormat()->setFormatCode(self::RUPIAH);
        $sheet->getStyle('B26')->getNumberFormat()->setFormatCode(self::RUPIAH);
        $sheet->getColumnDimension('A')->setWidth(28);
        $sheet->getColumnDimension('B')->setWidth(20);
    }

    private function salesSheet(Worksheet $sheet, array $r): void
    {
        $sheet->setTitle('Penjualan');
        $rows = $r['sales']->map(fn ($x) => [
            $x['invoice_no'], $this->date($x['date']), $x['customer_name'], $x['cashier'],
            Sale::METHOD_LABELS[$x['method']] ?? $x['method'], Sale::STATUS_LABELS[$x['status']] ?? $x['status'],
            $x['total'], $x['paid'], $x['total'] - $x['paid'],
        ])->all();

        $this->table($sheet, ['No. transaksi', 'Tanggal', 'Pelanggan', 'Kasir', 'Metode', 'Status', 'Total', 'Dibayar', 'Sisa'], $rows, [7, 8, 9]);
    }

    private function cashflowSheet(Worksheet $sheet, array $r): void
    {
        $sheet->setTitle('Arus Kas');
        $rows = $r['daily']->map(fn ($d) => [
            $this->date($d['start']), $d['penjualan'], $d['kas_masuk'], $d['kas_keluar'],
            $d['kas_masuk'] - $d['kas_keluar'], $d['saldo_akhir'], $d['laba_usaha'],
        ])->all();

        $this->table($sheet, ['Tanggal', 'Penjualan', 'Kas masuk', 'Kas keluar', 'Arus bersih', 'Saldo akhir', 'Laba usaha'], $rows, [2, 3, 4, 5, 6, 7]);
    }

    private function entriesSheet(Worksheet $sheet, array $r): void
    {
        $sheet->setTitle('Transaksi kas');
        $rows = $r['entries']->sortBy('date')->map(fn ($e) => [
            $this->date($e['date']), $e['type'] === 'masuk' ? 'Masuk' : 'Keluar', $e['category'], $e['subcategory'] ?? '',
            $e['description'], $e['customer_name'], self::METHOD_LABELS[$e['method']] ?? $e['method'], $e['created_by'],
            $e['type'] === 'masuk' ? $e['amount'] : -$e['amount'],
        ])->values()->all();

        $this->table($sheet, ['Tanggal', 'Arah', 'Jenis', 'Kategori', 'Keterangan', 'Pelanggan', 'Metode', 'Dicatat oleh', 'Jumlah'], $rows, [9]);
    }

    /** Header tebal berlatar, data mulai baris 2, kolom uang ($moneyCols, 1-based) diformat Rupiah. */
    private function table(Worksheet $sheet, array $header, array $rows, array $moneyCols): void
    {
        $sheet->fromArray([$header, ...$rows], null, 'A1', true);

        $last = $sheet->getHighestColumn();
        $sheet->getStyle("A1:{$last}1")->getFont()->setBold(true);
        $sheet->getStyle("A1:{$last}1")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('EAF3EE');
        $sheet->freezePane('A2');

        $lastRow = max(2, count($rows) + 1);
        foreach ($moneyCols as $col) {
            $letter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col);
            $sheet->getStyle("{$letter}2:{$letter}{$lastRow}")->getNumberFormat()->setFormatCode(self::RUPIAH);
        }
        foreach (range(1, count($header)) as $col) {
            $sheet->getColumnDimensionByColumn($col)->setAutoSize(true);
        }
    }

    // ── bantuan ─────────────────────────────────────────────────────────────

    /** @return array{name: string, address: ?string, phone: ?string} */
    private function store(): array
    {
        $p = Schema::hasTable('store_profiles') ? StoreProfile::current() : null;

        return [
            'name' => $p?->name ?? StoreProfile::DEFAULTS['name'],
            'address' => $p ? $p->address : StoreProfile::DEFAULTS['address'],
            'phone' => ($phone = $p ? $p->phone : StoreProfile::DEFAULTS['phone']) ? "Telp. {$phone}" : null,
        ];
    }

    private function periodLabel(array $r): string
    {
        return $r['start'] === $r['end'] ? $this->date($r['start']) : $this->date($r['start']).' – '.$this->date($r['end']);
    }

    private function date(string $ymd): string
    {
        return CarbonImmutable::parse($ymd)->locale('id')->translatedFormat('j M Y');
    }

    private function rupiah(int $n): string
    {
        return ($n < 0 ? '-' : '').'Rp'.number_format(abs($n), 0, ',', '.');
    }

    private function fileName(array $r, string $ext): string
    {
        return "laporan-keuangan_{$r['start']}_{$r['end']}.{$ext}";
    }
}
