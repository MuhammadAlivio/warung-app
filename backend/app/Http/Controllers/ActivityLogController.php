<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Log Karyawan (khusus admin): semua aktivitas pengguna, terbaru di atas. */
class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => ['nullable', 'integer'],
            'module' => ['nullable', 'string', 'max:50'],
            'q' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $logs = ActivityLog::query()
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->integer('user_id')))
            ->when($request->filled('module'), fn ($q) => $q->where('module', $request->string('module')))
            ->when($request->filled('q'), fn ($q) => $q->where('description', 'ilike', '%'.$request->string('q').'%'))
            ->when($request->filled('from'), fn ($q) => $q->where('created_at', '>=', $request->date('from')->startOfDay()))
            ->when($request->filled('to'), fn ($q) => $q->where('created_at', '<=', $request->date('to')->endOfDay()))
            ->orderByDesc('id')
            ->paginate(15);

        return response()->json([
            'data' => $logs->getCollection()->map(fn (ActivityLog $l) => [
                'id' => $l->id,
                'user_id' => $l->user_id,
                'user_name' => $l->user_name,
                'user_role' => $l->user_role,
                'module' => $l->module,
                'action' => $l->action,
                'description' => $l->description,
                'ip_address' => $l->ip_address,
                'created_at' => $l->created_at,
            ]),
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'total' => $logs->total(),
        ]);
    }
}
