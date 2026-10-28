<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogger
{
    public static function record(
        Request $request,
        string $module,
        string $action,
        ?string $recordId = null,
        ?string $recordTitle = null,
        ?string $previousValue = null,
        ?string $newValue = null,
        string $severity = 'Info',
    ): void {
        $user = $request->user();

        AuditLog::create([
            'user_id' => $user?->id,
            'user_name' => $user?->name ?? 'System',
            'user_role' => $user?->role ?? 'SYSTEM',
            'module' => $module,
            'action' => $action,
            'record_affected_id' => $recordId,
            'record_affected_title' => $recordTitle,
            'previous_value' => $previousValue,
            'new_value' => $newValue,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 2000),
            'severity' => $severity,
        ]);
    }
}
