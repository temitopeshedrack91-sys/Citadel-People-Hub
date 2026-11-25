<?php

namespace App\Services;

use App\Models\RealtimeEvent;
use Illuminate\Support\Facades\Schema;

/**
 * Records domain change events so connected SPA clients receive real-time updates
 * via SSE (/api/v1/realtime/stream) or incremental polling (/api/v1/realtime/events).
 */
class RealtimeEventService
{
    public static function publish(
        string $table,
        string $eventType = 'UPDATE',
        int|string|null $recordId = null,
        array $payload = [],
        ?int $actorUserId = null
    ): void {
        try {
            if (! Schema::hasTable('realtime_events')) {
                return;
            }

            RealtimeEvent::create([
                'table_name' => $table,
                'event_type' => strtoupper($eventType),
                'record_id' => $recordId !== null ? (string) $recordId : null,
                'actor_user_id' => $actorUserId,
                'payload' => $payload,
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // Do not fail business transactions if event telemetry cannot be written.
        }
    }
}
