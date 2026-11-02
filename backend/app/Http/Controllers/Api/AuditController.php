<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(RoleAuthorization::canonical($request->user()->role) === 'ADMIN', 403);
        $filters = $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:200'],
            'module' => ['sometimes', 'string', 'max:100'],
            'userId' => ['sometimes', 'integer', 'min:1'],
        ]);
        $logs = AuditLog::query()
            ->when(isset($filters['module']) && $filters['module'] !== 'All', fn ($query) => $query->where('module', $filters['module']))
            ->when(isset($filters['userId']), fn ($query) => $query->where('user_id', $filters['userId']))
            ->latest()
            ->limit($filters['limit'] ?? 50)
            ->get();

        return response()->json(['data' => $logs->map(fn (AuditLog $log) => $this->present($log))]);
    }

    private function present(AuditLog $log): array
    {
        return [
            'id' => $log->id,
            'timestamp' => $log->created_at?->toISOString(),
            'userId' => (string) $log->user_id,
            'userName' => $log->user_name,
            'userRole' => $log->user_role,
            'module' => $log->module,
            'action' => $log->action,
            'recordAffectedId' => $log->record_affected_id,
            'recordAffectedTitle' => $log->record_affected_title,
            'previousValue' => $log->previous_value,
            'newValue' => $log->new_value,
            'ipAddress' => $log->ip_address,
            'userAgent' => $log->user_agent,
            'severity' => $log->severity,
        ];
    }
}
