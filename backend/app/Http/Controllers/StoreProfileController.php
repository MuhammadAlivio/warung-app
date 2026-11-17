<?php

namespace App\Http\Controllers;

use App\Models\StoreProfile;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Pengaturan Profil Toko. Membaca: admin & kasir (struk dicetak kasir). Mengubah: admin saja.
 * Batas logo sama dengan halaman Pengaturan Profil Toko: PNG/JPG, maks. 2 MB.
 */
class StoreProfileController extends Controller
{
    public function __construct(private ActivityLogger $logger) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => StoreProfile::current()->toApi()]);
    }

    public function logo(): Response
    {
        $profile = StoreProfile::current();
        abort_unless($profile->hasLogo(), 404);

        return response(base64_decode($profile->logo), 200, [
            'Content-Type' => $profile->logo_mime,
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    /**
     * Simpan perubahan (multipart). Field "logo" opsional: bila tidak dikirim, logo lama dipertahankan.
     * "remove_logo" = 1 menghapus logo (diabaikan bila sekaligus mengirim logo baru).
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+\-\s()]*$/'],
            'address' => ['nullable', 'string', 'max:300'],
            'logo' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'mimetypes:image/png,image/jpeg', 'max:2048'],
            'remove_logo' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'Nama toko wajib diisi',
            'name.max' => 'Nama toko maksimal 100 karakter',
            'phone.max' => 'Nomor telepon maksimal 30 karakter',
            'phone.regex' => 'Nomor telepon hanya boleh berisi angka, spasi, +, -, dan tanda kurung',
            'address.max' => 'Alamat maksimal 300 karakter',
            'logo.mimes' => 'Format logo harus PNG atau JPG.',
            'logo.mimetypes' => 'Format logo harus PNG atau JPG.',
            'logo.max' => 'Ukuran logo maksimal 2 MB.',
            'logo.file' => 'Logo gagal diunggah.',
            'logo.uploaded' => 'Logo gagal diunggah.',
        ]);

        $clean = fn (?string $v) => $v !== null && trim($v) !== '' ? trim(preg_replace('/[ \t]+/', ' ', $v)) : null;

        $profile = StoreProfile::current();
        $profile->fill([
            'name' => $clean($data['name']),
            'phone' => $clean($data['phone'] ?? null),
            'address' => $clean($data['address'] ?? null),
        ]);

        $description = 'Mengubah profil toko';
        if ($file = $request->file('logo')) {
            $profile->logo = base64_encode($file->getContent());
            $profile->logo_mime = $file->getMimeType() === 'image/png' ? 'image/png' : 'image/jpeg';
            $description = 'Mengubah profil toko dan logo';
        } elseif ($request->boolean('remove_logo') && $profile->hasLogo()) {
            $profile->logo = null;
            $profile->logo_mime = null;
            $description = 'Mengubah profil toko dan menghapus logo';
        }

        $profile->updated_by = $request->user()->id;
        $profile->save();

        $this->logger->record($request, 'pengaturan', 'ubah', $description, $profile);

        return response()->json(['data' => $profile->toApi()]);
    }
}
