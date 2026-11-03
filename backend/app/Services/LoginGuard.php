<?php

namespace App\Services;

use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Pembatasan percobaan login (maks. 5 gagal, kunci 15 menit) dan pencatatan log login.
 */
class LoginGuard
{
    public const MAX_ATTEMPTS = 5;

    public const LOCK_MINUTES = 15;

    public function lockedMinutes(User $user): int
    {
        if (! $user->locked_until || $user->locked_until->isPast()) {
            return 0;
        }

        return (int) ceil(now()->diffInSeconds($user->locked_until, true) / 60);
    }

    public function fail(?User $user, string $email, string $reason, Request $request): void
    {
        if ($user) {
            $attempts = $user->failed_login_attempts + 1;

            if ($attempts >= self::MAX_ATTEMPTS) {
                $user->forceFill([
                    'failed_login_attempts' => 0,
                    'locked_until' => now()->addMinutes(self::LOCK_MINUTES),
                ])->save();
            } else {
                $user->forceFill(['failed_login_attempts' => $attempts])->save();
            }
        }

        $this->log($user, $email, 'gagal', $reason, $request);
    }

    public function success(User $user, Request $request): void
    {
        $user->forceFill(['failed_login_attempts' => 0, 'locked_until' => null, 'last_login_at' => now()])->save();

        $this->log($user, $user->email, 'berhasil', null, $request);
        app(ActivityLogger::class)->record($request, 'auth', 'login', "{$user->name} masuk ke aplikasi", null, $user);
    }

    private function log(?User $user, string $email, string $status, ?string $reason, Request $request): void
    {
        LoginLog::create([
            'user_id' => $user?->id,
            'email_dicoba' => $email,
            'status' => $status,
            'alasan' => $reason,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
