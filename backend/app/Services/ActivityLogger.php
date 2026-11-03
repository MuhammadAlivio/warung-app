<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Mencatat aktivitas pengguna ke tabel activity_logs (tampil di halaman Log Karyawan).
 * Panggil dari controller untuk deskripsi yang jelas. Aksi yang lupa dicatat tetap ditangkap
 * otomatis oleh middleware LogActivity.
 */
class ActivityLogger
{
    public function record(
        Request $request,
        string $module,
        string $action,
        string $description,
        ?Model $subject = null,
        ?User $user = null,
    ): void {
        $user ??= $request->user();

        if (! $user) {
            return;
        }

        ActivityLog::create([
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_role' => $user->role,
            'module' => $module,
            'action' => $action,
            'description' => $description,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        $request->attributes->set('activity_logged', true);
    }
}
