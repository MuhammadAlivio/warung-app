<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\TwoFactorController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

// 2FA admin: berjalan setelah password benar (sesi "pending"), sebelum login penuh
Route::post('/2fa/setup', [TwoFactorController::class, 'setup']);
Route::post('/2fa/confirm', [TwoFactorController::class, 'confirm']);
Route::post('/2fa/verify', [TwoFactorController::class, 'verify']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
});
