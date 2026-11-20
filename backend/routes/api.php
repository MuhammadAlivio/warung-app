<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\StoreProfileController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\TwoFactorController;
use App\Http\Middleware\EnsureActive;
use App\Http\Middleware\LogActivity;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');

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

    // Chatbot: menjawab dari data stok (hanya membaca), admin & kasir
    Route::post('/chatbot', [ChatbotController::class, 'ask'])->middleware('throttle:30,1');

    // Stok Barang: admin & kasir aksesnya sama (keputusan tim 4 Nov 2026)
    Route::apiResource('categories', CategoryController::class)->except('show');
    Route::apiResource('products', ProductController::class)->except('show');
    Route::get('/products/{product}/movements', [ProductController::class, 'movements']);
    Route::get('/products/{product}/image', [ProductController::class, 'showImage']);
    Route::post('/products/{product}/image', [ProductController::class, 'uploadImage']);
    Route::delete('/products/{product}/image', [ProductController::class, 'deleteImage']);

    // Kasir & Riwayat Transaksi: admin & kasir aksesnya sama, termasuk pembatalan (keputusan tim 9 Nov 2026)
    Route::get('/sales', [SaleController::class, 'index']);
    Route::get('/sales/summary', [SaleController::class, 'summary']);
    Route::get('/sales/next-number', [SaleController::class, 'nextNumber']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::get('/sales/{sale}', [SaleController::class, 'show'])->whereNumber('sale');
    Route::put('/sales/{sale}/items', [SaleController::class, 'updateItems'])->whereNumber('sale');
    Route::post('/sales/{sale}/payments', [SaleController::class, 'addPayment'])->whereNumber('sale');
    Route::post('/sales/{sale}/cancel', [SaleController::class, 'cancel'])->whereNumber('sale');

    // Profil toko: dibaca admin & kasir untuk struk dan faktur
    Route::get('/store-profile', [StoreProfileController::class, 'show']);
    Route::get('/store-profile/logo', [StoreProfileController::class, 'logo']);

    // Khusus admin
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('employees', EmployeeController::class)->only(['store', 'update']);
        Route::get('/activity-logs', [ActivityLogController::class, 'index']);

        // Pembelian & Barang Masuk: kasir tidak punya akses sama sekali (keputusan tim 4 Nov 2026)
        Route::apiResource('suppliers', SupplierController::class)->only(['index', 'store', 'update']);
        Route::get('/purchases', [PurchaseController::class, 'index']);
        Route::post('/purchases', [PurchaseController::class, 'store']);
        Route::get('/purchases/{purchase}', [PurchaseController::class, 'show'])->whereNumber('purchase');
        Route::post('/purchases/{purchase}/payments', [PurchaseController::class, 'addPayment'])->whereNumber('purchase');
        Route::post('/purchases/{purchase}/receipts', [PurchaseController::class, 'receive'])->whereNumber('purchase');

        // Keuangan: laporan harian/mingguan/bulanan + catatan kas manual
        Route::get('/finance/report', [FinanceController::class, 'report']);
        Route::get('/finance/entries', [FinanceController::class, 'entries']);
        Route::post('/finance/entries', [FinanceController::class, 'store']);
        Route::put('/finance/entries/{entry}', [FinanceController::class, 'update'])->whereNumber('entry');
        Route::delete('/finance/entries/{entry}', [FinanceController::class, 'destroy'])->whereNumber('entry');
        Route::get('/finance/export', [FinanceController::class, 'export']);
        Route::get('/finance/types', [FinanceController::class, 'types']);
        Route::post('/finance/types', [FinanceController::class, 'storeType']);
        Route::get('/finance/categories', [FinanceController::class, 'categories']);
        Route::post('/finance/categories', [FinanceController::class, 'storeCategory']);

        // Pengaturan Profil Toko
        Route::post('/store-profile', [StoreProfileController::class, 'update']);
    });
});
