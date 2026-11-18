{{-- Laporan keuangan PDF (Unduh laporan, halaman Keuangan). Dirender dompdf: CSS sederhana, tanpa flex/grid. --}}
@php $s = $r['summary']; @endphp
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Laporan Keuangan {{ $periodLabel }}</title>
<style>
    @page { margin: 28px 32px; }
    body { font-family: "DejaVu Sans", sans-serif; font-size: 10px; color: #171717; }
    h1 { font-size: 16px; margin: 0; }
    h2 { font-size: 11px; margin: 16px 0 6px; }
    .muted { color: #737373; }
    .header { border-bottom: 1.5px solid #2f6048; padding-bottom: 8px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 4px 6px; }
    .num { text-align: right; white-space: nowrap; }
    .neg { color: #b91c1c; }
    .pos { color: #15803d; }
    .total td { font-weight: bold; border-top: 1px solid #d4d4d4; background: #eaf3ee; }
    .cols td.col { width: 50%; vertical-align: top; padding: 0; }
    .cols td.col + td.col { padding-left: 14px; }
    .box td { border-bottom: 1px solid #f0f0f0; }
    .list th { text-align: left; font-size: 9px; text-transform: uppercase; color: #525252; background: #f5f5f5; border-bottom: 1px solid #e5e5e5; }
    .list td { border-bottom: 1px solid #f0f0f0; }
    .note { font-size: 9px; color: #737373; margin-top: 4px; }
</style>
</head>
<body>
    <div class="header">
        <h1>{{ $store['name'] }}</h1>
        <div class="muted">{{ implode(' · ', array_filter([$store['address'], $store['phone']])) }}</div>
        <div style="margin-top:6px"><strong>Laporan keuangan</strong> · {{ $periodLabel }}</div>
    </div>

    <table class="cols"><tr>
        <td class="col">
            <h2>Ringkasan laba rugi</h2>
            <table class="box">
                <tr><td>Penjualan</td><td class="num">{{ $rp($s['penjualan']) }}</td></tr>
                <tr><td>HPP barang terjual</td><td class="num neg">− {{ $rp($s['hpp']) }}</td></tr>
                <tr><td><strong>Laba kotor</strong></td><td class="num"><strong>{{ $rp($s['laba_kotor']) }}</strong></td></tr>
                <tr><td>Biaya operasional</td><td class="num neg">− {{ $rp($s['biaya_operasional']) }}</td></tr>
                <tr class="total"><td>Laba usaha</td><td class="num {{ $s['laba_usaha'] < 0 ? 'neg' : '' }}">{{ $rp($s['laba_usaha']) }}</td></tr>
            </table>
        </td>
        <td class="col">
            <h2>Arus kas</h2>
            <table class="box">
                <tr><td>Saldo awal</td><td class="num">{{ $rp($s['saldo_awal']) }}</td></tr>
                <tr><td>Penjualan dibayar</td><td class="num pos">+ {{ $rp($s['masuk_penjualan']) }}</td></tr>
                <tr><td>Pemasukan lain</td><td class="num pos">+ {{ $rp($s['masuk_lainnya']) }}</td></tr>
                <tr><td>Bayar pemasok</td><td class="num neg">− {{ $rp($s['bayar_pemasok']) }}</td></tr>
                <tr><td>Operasional</td><td class="num neg">− {{ $rp($s['biaya_operasional']) }}</td></tr>
                <tr><td>Prive pemilik</td><td class="num">− {{ $rp($s['prive']) }}</td></tr>
                <tr><td><strong>Arus kas bersih</strong></td><td class="num {{ $s['arus_kas_bersih'] < 0 ? 'neg' : 'pos' }}"><strong>{{ $s['arus_kas_bersih'] < 0 ? '−' : '+' }} {{ $rp(abs($s['arus_kas_bersih'])) }}</strong></td></tr>
                <tr class="total"><td>Saldo akhir</td><td class="num">{{ $rp($s['saldo_akhir']) }}</td></tr>
            </table>
        </td>
    </tr></table>

    <h2>Indikator</h2>
    <table class="box">
        <tr><td>Jumlah transaksi</td><td class="num">{{ number_format($s['jumlah_transaksi'], 0, ',', '.') }}</td>
            <td>Piutang (penjualan belum lunas)</td><td class="num">{{ $rp($s['piutang']) }}</td></tr>
    </table>

    <h2>Rincian {{ $r['breakdown_mode'] === 'day' ? 'harian' : 'per minggu' }}</h2>
    <table class="list">
        <thead><tr>
            <th>{{ $r['breakdown_mode'] === 'day' ? 'Tanggal' : 'Minggu' }}</th>
            <th class="num">Penjualan</th><th class="num">Kas masuk</th><th class="num">Kas keluar</th>
            <th class="num">Saldo akhir</th><th class="num">Laba usaha</th>
        </tr></thead>
        <tbody>
        @forelse ($r['breakdown']->where('has_data', true) as $b)
            <tr>
                <td>{{ $r['breakdown_mode'] === 'day' ? $fmtDate($b['start']) : $b['label'].' · '.$fmtDate($b['start']).' – '.$fmtDate($b['end']) }}</td>
                <td class="num">{{ $rp($b['penjualan']) }}</td>
                <td class="num">{{ $rp($b['kas_masuk']) }}</td>
                <td class="num">{{ $rp($b['kas_keluar']) }}</td>
                <td class="num">{{ $rp($b['saldo_akhir']) }}</td>
                <td class="num {{ $b['laba_usaha'] < 0 ? 'neg' : '' }}">{{ $rp($b['laba_usaha']) }}</td>
            </tr>
        @empty
            <tr><td colspan="6" class="muted" style="text-align:center">Tidak ada transaksi pada periode ini.</td></tr>
        @endforelse
            <tr class="total">
                <td>Total</td>
                <td class="num">{{ $rp($s['penjualan']) }}</td>
                <td class="num">{{ $rp($s['kas_masuk']) }}</td>
                <td class="num">{{ $rp($s['kas_keluar']) }}</td>
                <td class="num">{{ $rp($s['saldo_akhir']) }}</td>
                <td class="num">{{ $rp($s['laba_usaha']) }}</td>
            </tr>
        </tbody>
    </table>
    <div class="note">{{ $r['breakdown_mode'] === 'day' ? 'Hari' : 'Minggu' }} tanpa transaksi tidak ditampilkan.</div>

    <h2>Biaya operasional</h2>
    <table class="list">
        <thead><tr><th>Tanggal</th><th>Jenis</th><th>Keterangan</th><th class="num">Jumlah</th></tr></thead>
        <tbody>
        @forelse ($operational as $e)
            <tr>
                <td>{{ $fmtDate($e['date']) }}</td>
                <td>{{ $e['category'] }}</td>
                <td>{{ $e['description'] ?? '—' }}</td>
                <td class="num">{{ $rp($e['amount']) }}</td>
            </tr>
        @empty
            <tr><td colspan="4" class="muted" style="text-align:center">Tidak ada biaya operasional.</td></tr>
        @endforelse
            <tr class="total"><td colspan="3">Total biaya operasional</td><td class="num">{{ $rp($s['biaya_operasional']) }}</td></tr>
        </tbody>
    </table>

    <div class="note" style="margin-top:14px">
        Laba usaha memakai basis akrual (penjualan dihitung saat nota dibuat); arus kas memakai uang yang benar-benar masuk/keluar.
        Dicetak {{ $printedAt }} WIB.
    </div>
</body>
</html>
