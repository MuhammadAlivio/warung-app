<?php

namespace App\Http\Middleware;

use App\Services\ActivityLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Jaring pengaman log: setiap aksi yang mengubah data (POST/PUT/PATCH/DELETE) dan berhasil, tapi
 * belum dicatat controller, dicatat di sini. Jadi endpoint baru otomatis ikut masuk log.
 */
class LogActivity
{
    private const ACTIONS = ['POST' => 'tambah', 'PUT' => 'ubah', 'PATCH' => 'ubah', 'DELETE' => 'hapus'];

    public function __construct(private ActivityLogger $logger) {}

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (
            isset(self::ACTIONS[$request->method()])
            && $request->user()
            && ! $request->attributes->get('activity_logged')
            && $response->isSuccessful()
        ) {
            $path = $request->path();
            $module = explode('/', $path)[1] ?? 'lainnya';

            $this->logger->record($request, $module, self::ACTIONS[$request->method()], $request->method().' /'.$path);
        }

        return $response;
    }
}
