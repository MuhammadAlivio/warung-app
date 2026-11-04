<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\TwoFactorController;
use App\Http\Middleware\EnsureActive;
use App\Http\Middleware\LogActivity;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

// 2FA admin: berjalan setelah password benar (sesi "pending"), sebelum login penuh
Route::post('/2fa/setup', [TwoFactorController::class, 'setup']);
Route::post('/2fa/confirm', [TwoFactorController::class, 'confirm']);
Route::post('/2fa/verify', [TwoFactorController::class, 'verify']);

// Harus login. Semua aksi yang mengubah data otomatis masuk log aktivitas (LogActivity).
Route::middleware(['auth:sanctum', EnsureActive::class, LogActivity::class])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Admin & kasir (daftar karyawan: kasir hanya melihat, datanya dibatasi di controller)
    Route::apiResource('customers', CustomerController::class)->except('show');
    Route::get('/employees', [EmployeeController::class, 'index']);

    // Stok Barang: admin & kasir aksesnya sama (keputusan tim 4 Nov 2026)
    Route::apiResource('categories', CategoryController::class)->except('show');
    Route::apiResource('products', ProductController::class)->except('show');
    Route::get('/products/{product}/movements', [ProductController::class, 'movements']);
    Route::get('/products/{product}/image', [ProductController::class, 'showImage']);
    Route::post('/products/{product}/image', [ProductController::class, 'uploadImage']);
    Route::delete('/products/{product}/image', [ProductController::class, 'deleteImage']);

    // Khusus admin
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('employees', EmployeeController::class)->only(['store', 'update']);
        Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    });
});
