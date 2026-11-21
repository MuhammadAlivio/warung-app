<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function __construct(private ActivityLogger $logger) {}

    public function index(): JsonResponse
    {
        $summaries = $this->summaries();

        return response()->json([
            'data' => Customer::orderByDesc('id')->get()->map(fn (Customer $c) => $this->present($c, $summaries)),
        ]);
    }

    /**
     * Ringkasan tagihan per pelanggan dari tabel sales (transaksi batal tidak dihitung):
     * outstanding = jumlah sisa tagihan semua transaksi belum lunas (akumulasi, bukan satu transaksi),
     * unpaid_count = jumlah transaksi belum lunas, transaction_count = semua transaksi.
     */
    private function summaries(?int $customerId = null): array
    {
        return DB::table('sales')
            ->where('payment_status', '<>', 'batal')
            ->whereNotNull('customer_id')
            ->when($customerId, fn ($q) => $q->where('customer_id', $customerId))
            ->selectRaw("
                customer_id,
                count(*) as transaction_count,
                count(*) filter (where payment_status = 'belum_lunas') as unpaid_count,
                coalesce(sum(total - paid_amount) filter (where payment_status = 'belum_lunas'), 0) as outstanding
            ")
            ->groupBy('customer_id')
            ->get()
            ->keyBy('customer_id')
            ->all();
    }

    private function present(Customer $customer, array $summaries): array
    {
        $s = $summaries[$customer->id] ?? null;

        return [
            ...$customer->toApi(),
            'outstanding' => (int) ($s->outstanding ?? 0),
            'unpaid_count' => (int) ($s->unpaid_count ?? 0),
            'transaction_count' => (int) ($s->transaction_count ?? 0),
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $customer = Customer::create($this->validated($request));

        $this->logger->record($request, 'pelanggan', 'tambah', "Menambah pelanggan {$customer->name}", $customer);

        return response()->json(['data' => $this->present($customer, [])], 201);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $customer->update($this->validated($request));

        $this->logger->record($request, 'pelanggan', 'ubah', "Mengubah data pelanggan {$customer->name}", $customer);

        return response()->json(['data' => $this->present($customer, $this->summaries($customer->id))]);
    }

    public function destroy(Request $request, Customer $customer): JsonResponse
    {
        // Transaksi belum lunas wajib punya pelanggan (aturan di tabel sales), dan riwayat transaksi
        // tidak boleh kehilangan pelanggannya. Jadi pelanggan yang sudah punya transaksi tidak dihapus.
        $sales = DB::table('sales')->where('customer_id', $customer->id)->count();

        if ($sales > 0) {
            return response()->json([
                'message' => "Pelanggan {$customer->name} punya {$sales} transaksi, jadi tidak bisa dihapus.",
            ], 409);
        }

        $customer->delete();

        $this->logger->record($request, 'pelanggan', 'hapus', "Menghapus pelanggan {$customer->name}", $customer);

        return response()->json(['message' => 'Pelanggan dihapus']);
    }

    /** Aturan sama dengan customerSchema di frontend; note dipetakan ke kolom notes. */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'regex:/^(\+62|62|0)8[0-9\s-]{7,13}$/'],
            'address' => ['nullable', 'string', 'max:200'],
            'note' => ['nullable', 'string', 'max:300'],
        ], [
            'phone.regex' => 'Format nomor tidak valid, contoh: 0812 3456 7890',
        ]);

        return [
            'name' => trim($data['name']),
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'notes' => $data['note'] ?? null,
        ];
    }
}
