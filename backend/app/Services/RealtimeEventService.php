<?php

namespace App\Services;

use App\Models\RealtimeEvent;
use Illuminate\Support\Facades\Schema;

/**
 * Records domain change events so connected SPA clients receive real-time updates
 * via SSE or incremental event sync.
 */
class RealtimeEventService
{
    public static function publish(string $tableName, string $eventType, int|string|null $recordId = null, array $payload = [], ?int $actorUserId = null): void
    {
        if (! Schema::hasTable('realtime_events')) {
            return;
        }

        RealtimeEvent::create([
            'table_name' => $tableName,
            'event_type' => strtoupper($eventType),
            'record_id' => $recordId !== null ? (string) $recordId : null,
            'actor_user_id' => $actorUserId,
            'payload' => $payload,
            'created_at' => now(),
        ]);
    }
}
