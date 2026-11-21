<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Category;
use App\Services\StockChatbot;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\WarungUsers;
use Tests\TestCase;

/**
 * Chatbot stok: menjawab dari tabel products, hanya membaca.
 *
 *   DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test --filter=ChatbotTest
 */
class ChatbotTest extends TestCase
{
    use DatabaseTransactions;
    use WarungUsers;

    private int $categoryId;

    private string $tag;

    protected function setUp(): void
    {
        parent::setUp();

        $this->requirePostgres();

        // Tes ini untuk jawaban aturan kata kunci; Groq dimatikan dan tidak boleh ada request keluar
        config(['services.groq.key' => null]);
        Http::preventStrayRequests();

        $this->categoryId = Category::create(['name' => 'Uji Chatbot '.uniqid()])->id;
        // Kata unik tanpa spasi agar pencarian hanya cocok dengan barang uji ini
        $this->tag = 'zq'.substr(md5(uniqid()), 0, 8);
    }

    /** Awalan "000" membuat barang uji muncul paling awal pada daftar yang diurutkan. */
    private function product(string $name, int $stock, int $min = 10, int $price = 15000, string $unit = 'pcs', bool $active = true): int
    {
        return DB::table('products')->insertGetId([
            'name' => $name, 'category_id' => $this->categoryId, 'unit' => $unit, 'buy_price' => 1000, 'sell_price' => $price,
            'stock' => $stock, 'min_stock' => $min, 'is_active' => $active, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function ask(string $message): ?string
    {
        return $this->actingAs($this->makeUser('kasir'))->postJson('/api/chatbot', ['message' => $message])->assertOk()->json('reply');
    }

    // ---------- Akses ----------

    public function test_guest_cannot_use_the_chatbot(): void
    {
        $this->postJson('/api/chatbot', ['message' => 'stok beras'])->assertUnauthorized();
    }

    public function test_kasir_and_admin_can_ask(): void
    {
        foreach (['kasir', 'admin'] as $role) {
            $this->actingAs($this->makeUser($role))->postJson('/api/chatbot', ['message' => 'bantuan'])->assertOk();
        }
    }

    public function test_message_is_required_and_limited_to_300_characters(): void
    {
        $kasir = $this->makeUser('kasir');

        $this->actingAs($kasir)->postJson('/api/chatbot', [])->assertUnprocessable()->assertJsonValidationErrors('message');
        $this->actingAs($kasir)->postJson('/api/chatbot', ['message' => str_repeat('a', 301)])->assertUnprocessable();
    }

    public function test_asking_is_not_written_to_the_activity_log(): void
    {
        $kasir = $this->makeUser('kasir');

        $this->actingAs($kasir)->postJson('/api/chatbot', ['message' => 'stok beras'])->assertOk();

        $this->assertSame(0, ActivityLog::where('user_id', $kasir->id)->count());
    }

    // ---------- Stok satu barang ----------

    public function test_answers_stock_of_one_product_from_the_database(): void
    {
        $this->product("000 Beras {$this->tag}", 42, 10, 15000, 'karung');

        $this->assertSame("000 Beras {$this->tag}: sisa 42 karung, aman.", $this->ask("stok beras {$this->tag} berapa?"));
        $this->assertSame("000 Beras {$this->tag}: sisa 42 karung, aman.", $this->ask("Berapa SISA {$this->tag}"));
    }

    public function test_reports_low_and_out_of_stock_status_like_the_stock_page(): void
    {
        // Nama barang sengaja tidak memuat kata pemicu ("menipis", "habis", dll)
        $this->product("000 Susu {$this->tag}", 8, 10);
        $this->product("000 Roti {$this->tag}", 10, 10);
        $this->product("000 Teh {$this->tag}", 11, 10);
        $this->product("000 Kopi {$this->tag}", 0, 10);

        $this->assertStringContainsString('sisa 8 pcs, menipis, batas minimum 10', $this->ask("stok susu {$this->tag}"));
        // Tepat di batas minimum sudah dianggap menipis, sama seperti halaman Stok
        $this->assertStringContainsString('sisa 10 pcs, menipis', $this->ask("stok roti {$this->tag}"));
        $this->assertStringContainsString('sisa 11 pcs, aman', $this->ask("stok teh {$this->tag}"));
        $this->assertStringContainsString('stok habis (0 pcs)', $this->ask("stok kopi {$this->tag}"));
    }

    public function test_answers_price(): void
    {
        $this->product("000 Gula {$this->tag}", 5, 10, 18500, 'kg');

        $this->assertSame("000 Gula {$this->tag}: Rp18.500 per kg.", $this->ask("harga gula {$this->tag}"));
    }

    public function test_several_matches_are_listed(): void
    {
        $this->product("000 Sabun A {$this->tag}", 3);
        $this->product("000 Sabun B {$this->tag}", 30);

        $reply = $this->ask("stok sabun {$this->tag}");

        $this->assertStringContainsString('Ada 2 barang yang cocok', $reply);
        $this->assertStringContainsString("Sabun A {$this->tag}: sisa 3 pcs", $reply);
        $this->assertStringContainsString("Sabun B {$this->tag}: sisa 30 pcs", $reply);
    }

    public function test_unknown_product_is_reported_clearly(): void
    {
        $reply = $this->ask('stok barang yang tidak mungkin ada qwertyzx');

        $this->assertStringContainsString('tidak ditemukan', $reply);
    }

    public function test_asks_which_product_when_none_is_named(): void
    {
        $this->assertStringContainsString('Barang apa yang mau dicek?', $this->ask('stok'));
    }

    public function test_inactive_products_are_never_mentioned(): void
    {
        $this->product("000 Nonaktif {$this->tag}", 99, 10, 15000, 'pcs', active: false);

        $this->assertStringContainsString('tidak ditemukan', $this->ask("stok nonaktif {$this->tag}"));
    }

    // ---------- Daftar menipis, habis, ringkasan ----------

    public function test_lists_products_that_are_running_low(): void
    {
        $this->product("000 Garam {$this->tag}", 2, 10);
        $this->product("000 Cuka {$this->tag}", 0, 10);

        $reply = $this->ask('barang apa yang mau habis?');

        $this->assertStringContainsString('stoknya menipis', $reply);
        $this->assertStringContainsString("000 Garam {$this->tag}: sisa 2 pcs (batas minimum 10)", $reply);
        // Barang yang sudah habis dilaporkan terpisah, bukan di daftar menipis
        $this->assertStringNotContainsString("000 Cuka {$this->tag}:", $reply);
        $this->assertStringContainsString('sudah habis', $reply);
    }

    public function test_lists_products_that_are_out_of_stock(): void
    {
        $this->product("000 Mentega {$this->tag}", 0, 10);
        $this->product("000 Margarin {$this->tag}", 50, 10);

        $reply = $this->ask('barang apa saja yang habis?');

        $this->assertStringContainsString("000 Mentega {$this->tag}", $reply);
        $this->assertStringNotContainsString("000 Margarin {$this->tag}", $reply);
    }

    public function test_summary_counts_by_status(): void
    {
        $before = $this->ask('ada berapa jenis barang?');
        preg_match('/Ada (\d+) jenis barang aktif: (\d+) aman, (\d+) menipis, dan (\d+) habis\./', $before, $b);

        $this->product("000 Lada {$this->tag}", 100);
        $this->product("000 Kunyit {$this->tag}", 3);
        $this->product("000 Jahe {$this->tag}", 0);

        $this->assertSame(
            sprintf('Ada %d jenis barang aktif: %d aman, %d menipis, dan %d habis.', $b[1] + 3, $b[2] + 1, $b[3] + 1, $b[4] + 1),
            $this->ask('ada berapa jenis barang?'),
        );
    }

    public function test_long_lists_are_truncated(): void
    {
        foreach (range(1, 17) as $i) {
            $this->product(sprintf('000 Banyak %02d %s', $i, $this->tag), 1, 10);
        }

        $reply = $this->ask('barang apa yang mau habis?');

        // Maksimal 15 butir ditampilkan, sisanya diringkas
        $this->assertSame(15, preg_match_all('/^- /m', $reply));
        $this->assertStringContainsString('lainnya', $reply);
    }

    // ---------- Tagihan, penjualan, pelanggan (dari database, tanpa LLM) ----------

    private function sell(int $customerId, int $productId, int $qty, int $cash): void
    {
        $this->actingAs($this->makeUser('kasir'))->postJson('/api/sales', [
            'customer_id' => $customerId, 'method' => 'Tunai', 'cash' => $cash, 'items' => [['product_id' => $productId, 'qty' => $qty]],
        ])->assertCreated();
    }

    public function test_unpaid_customers_are_answered_from_the_database(): void
    {
        $customer = \App\Models\Customer::create(['name' => "Pelanggan {$this->tag}"]);
        $productId = $this->product("000 Barang {$this->tag}", 100, 10, 10000);

        $this->sell($customer->id, $productId, 5, 20000); // sisa 30.000
        $this->sell($customer->id, $productId, 3, 10000); // sisa 20.000

        $reply = $this->ask('Siapa saja pelanggan yang belum membayar lunas?');

        // Diakumulasi per pelanggan: Rp50.000 dari 2 transaksi, bukan dua baris terpisah
        $this->assertStringContainsString("- Pelanggan {$this->tag} (Rp50.000, 2 transaksi)", $reply);
        $this->assertStringContainsString('belum membayar lunas', $reply);
    }

    public function test_paid_and_cancelled_sales_are_not_listed_as_unpaid(): void
    {
        $customer = \App\Models\Customer::create(['name' => "Lunas {$this->tag}"]);
        $productId = $this->product("000 Barang {$this->tag}", 100, 10, 10000);
        $this->sell($customer->id, $productId, 2, 20000); // lunas

        $this->assertStringNotContainsString("Lunas {$this->tag}", $this->ask('tagihan belum lunas'));
    }

    public function test_sales_today_is_answered_from_the_database(): void
    {
        preg_match('/Rp([\d.]+) dari (\d+) transaksi/', $this->ask('berapa penjualan hari ini?'), $before);

        $customer = \App\Models\Customer::create(['name' => "Beli {$this->tag}"]);
        $productId = $this->product("000 Barang {$this->tag}", 100, 10, 10000);
        $this->sell($customer->id, $productId, 4, 40000); // Rp40.000

        preg_match('/Rp([\d.]+) dari (\d+) transaksi/', $this->ask('Berapa penjualan hari ini?'), $after);

        $toInt = fn ($rupiah) => (int) str_replace('.', '', $rupiah);
        $this->assertSame($toInt($before[1]) + 40000, $toInt($after[1]));
        $this->assertSame((int) $before[2] + 1, (int) $after[2]);
        $this->assertStringContainsString('Penjualan bersih hari ini', $this->ask('omzet'));
        $this->assertStringContainsString('bulan ini', $this->ask('penjualan bulan ini'));
        $this->assertStringContainsString('kemarin', $this->ask('pendapatan kemarin'));
    }

    public function test_customer_count_is_answered_from_the_database(): void
    {
        $count = \App\Models\Customer::count();

        $this->assertSame("Saat ini ada {$count} pelanggan terdaftar.", $this->ask('berapa jumlah pelanggan?'));
    }

    // ---------- Bukan urusan chatbot stok ----------

    public function test_unrecognised_questions_return_null(): void
    {
        $this->assertNull($this->ask('resep nasi goreng'));
        $this->assertNull($this->ask('pelanggan terbaik'));
    }

    public function test_help_lists_what_the_bot_can_do(): void
    {
        $reply = app(StockChatbot::class)->reply('bantuan');

        $this->assertStringContainsString('stok beras', $reply);
        $this->assertStringContainsString('harga', $reply);
    }

    public function test_input_cannot_inject_sql_or_wildcards(): void
    {
        // Tanda baca dibuang sebelum mencari, jadi % tidak pernah menjadi pola pencarian
        $this->assertStringContainsString('Barang apa yang mau dicek?', $this->ask('stok %%%'));
        $this->assertStringContainsString('tidak ditemukan', $this->ask('stok qwxz%vkjy_pmlt'));
        $this->assertStringContainsString('tidak ditemukan', $this->ask("stok '; DROP TABLE products; --"));
        $this->assertGreaterThan(0, DB::table('products')->count());
    }
}
