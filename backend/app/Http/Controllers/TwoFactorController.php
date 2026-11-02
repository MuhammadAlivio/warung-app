<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\LoginGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    private const ISSUER = 'Warung';

    public function __construct(private LoginGuard $guard, private Google2FA $google2fa) {}

    /** Buat secret baru dan kirim URI untuk QR (hanya jika 2FA belum aktif). */
    public function setup(Request $request): JsonResponse
    {
        $user = $this->pendingUser($request);

        if (! $user) {
            return $this->noSession();
        }

        if ($user->two_factor_confirmed_at) {
            return response()->json(['message' => '2FA sudah aktif untuk akun ini.'], 409);
        }

        $secret = $this->google2fa->generateSecretKey();
        $user->forceFill(['two_factor_secret' => Crypt::encryptString($secret)])->save();

        return response()->json([
            'otpauth_uri' => $this->google2fa->getQRCodeUrl(self::ISSUER, $user->email, $secret),
        ]);
    }

    /** Konfirmasi setup pertama: kode benar -> 2FA aktif, kirim kode pemulihan, login penuh. */
    public function confirm(Request $request): JsonResponse
    {
        $user = $this->pendingUser($request);

        if (! $user) {
            return $this->noSession();
        }

        if ($user->two_factor_confirmed_at || ! $user->two_factor_secret) {
            return response()->json(['message' => 'Setup 2FA belum dimulai atau sudah selesai.'], 409);
        }

        $request->validate(['otp' => ['required', 'digits:6']]);

        if ($response = $this->rejectIfInvalid($user, $request)) {
            return $response;
        }

        $codes = collect(range(1, 8))->map(fn () => Str::lower(Str::random(5).'-'.Str::random(5)))->all();

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => json_encode(array_map(fn ($c) => Hash::make($c), $codes)),
        ])->save();

        $this->completeLogin($user, $request);

        return response()->json([
            'user' => AuthController::payload($user),
            'recovery_codes' => $codes,
        ]);
    }

    /** Login admin berikutnya: kode TOTP atau satu kode pemulihan. */
    public function verify(Request $request): JsonResponse
    {
        $user = $this->pendingUser($request);

        if (! $user) {
            return $this->noSession();
        }

        if (! $user->two_factor_confirmed_at) {
            return response()->json(['message' => 'Setup 2FA belum selesai.'], 409);
        }

        $data = $request->validate([
            'otp' => ['required_without:recovery_code', 'digits:6'],
            'recovery_code' => ['required_without:otp', 'string'],
        ]);

        if (isset($data['recovery_code'])) {
            if (! $this->useRecoveryCode($user, $data['recovery_code'])) {
                $this->guard->fail($user, $user->email, 'kode_pemulihan_salah', $request);

                return response()->json(['message' => 'Kode pemulihan tidak valid.'], 422);
            }
        } elseif ($response = $this->rejectIfInvalid($user, $request)) {
            return $response;
        }

        $this->completeLogin($user, $request);

        return response()->json(['user' => AuthController::payload($user)]);
    }

    private function pendingUser(Request $request): ?User
    {
        $id = $request->session()->get('2fa.user_id');

        return $id ? User::find($id) : null;
    }

    private function noSession(): JsonResponse
    {
        return response()->json(['message' => 'Sesi login berakhir. Silakan login ulang.'], 401);
    }

    /** Null jika kode benar; selain itu response error (dengan pembatasan percobaan). */
    private function rejectIfInvalid(User $user, Request $request): ?JsonResponse
    {
        if (($minutes = $this->guard->lockedMinutes($user)) > 0) {
            return response()->json([
                'message' => "Terlalu banyak percobaan. Akun dikunci, coba lagi dalam {$minutes} menit.",
            ], 423);
        }

        $secret = Crypt::decryptString($user->two_factor_secret);

        if (! $this->google2fa->verifyKey($secret, $request->input('otp'), 1)) {
            $this->guard->fail($user, $user->email, 'otp_salah', $request);

            return response()->json(['message' => 'Kode salah atau kedaluwarsa. Coba lagi.'], 422);
        }

        return null;
    }

    private function useRecoveryCode(User $user, string $code): bool
    {
        $hashes = json_decode($user->two_factor_recovery_codes ?? '[]', true) ?: [];

        foreach ($hashes as $i => $hash) {
            if (Hash::check(Str::lower(trim($code)), $hash)) {
                unset($hashes[$i]);
                $user->forceFill(['two_factor_recovery_codes' => json_encode(array_values($hashes))])->save();

                return true;
            }
        }

        return false;
    }

    private function completeLogin(User $user, Request $request): void
    {
        $remember = (bool) $request->session()->pull('2fa.remember', false);
        $request->session()->forget('2fa.user_id');
        $request->session()->regenerate();

        Auth::guard('web')->login($user, $remember);
        $this->guard->success($user, $request);
    }
}
