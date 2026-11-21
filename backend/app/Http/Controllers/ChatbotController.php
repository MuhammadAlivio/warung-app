<?php

namespace App\Http\Controllers;

use App\Services\GroqChat;
use App\Services\SalesChatbot;
use App\Services\StockChatbot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Chatbot toko. Alur: pertanyaan -> LLM (Groq) memanggil alat -> Laravel membaca database -> LLM menyusun jawaban.
 * Kalau Groq belum diatur atau gagal, jawaban stok tetap datang dari aturan kata kunci (StockChatbot).
 * Tagihan, penjualan, dan pelanggan dijawab SalesChatbot dari database tanpa LLM. reply null = tidak dikenali.
 */
class ChatbotController extends Controller
{
    /** Topik ini dijawab aturan kata kunci dari database, jadi data pelanggan dan uang tidak pernah dikirim ke LLM. */
    private const LOCAL_ONLY = '/\b(tagihan|utang|hutang|tunggak\w*|penjualan|omzet|pendapatan|pelanggan|lunas|transaksi|keuangan|laba|untung)\b/u';

    public function ask(Request $request, StockChatbot $rules, SalesChatbot $sales, GroqChat $llm): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:300'],
            'history' => ['sometimes', 'array', 'max:10'],
            'history.*.role' => ['required', 'in:user,assistant'],
            'history.*.text' => ['required', 'string', 'max:600'],
        ]);

        // Hanya membaca, jadi tidak dimasukkan ke Log Karyawan (setiap pesan akan memenuhi log)
        $request->attributes->set('activity_logged', true);

        if (preg_match(self::LOCAL_ONLY, mb_strtolower($data['message']))) {
            return response()->json(['reply' => $sales->reply($data['message']), 'source' => 'rules']);
        }

        if ($llm->configured()) {
            $history = collect($data['history'] ?? [])->map(fn ($m) => ['role' => $m['role'], 'content' => $m['text']])->all();

            if (($answer = $llm->reply($data['message'], $history)) !== null) {
                return response()->json(['reply' => $answer, 'source' => 'llm']);
            }
        }

        return response()->json(['reply' => $rules->reply($data['message']), 'source' => 'rules']);
    }
}
