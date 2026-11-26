<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RealtimeEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Exposes incremental domain change events and Server-Sent Events (SSE)
 * for real-time frontend synchronization.
 */
class RealtimeController extends Controller
{
    /**
     * Fetch events recorded after a given sequence ID.
     *
     * GET /api/v1/realtime/events?since={id}
     */
    public function events(Request $request): JsonResponse
    {
        $latestId = (int) (RealtimeEvent::query()->max('id') ?? 0);

        if (! $request->has('since')) {
            return response()->json([
                'data' => [
                    'latestId' => $latestId,
                    'events' => [],
                ],
            ]);
        }

        $since = max(0, (int) $request->input('since', 0));

        $events = RealtimeEvent::query()
            ->where('id', '>', $since)
            ->orderBy('id')
            ->limit(100)
            ->get()
            ->map(fn (RealtimeEvent $ev) => [
                'id' => (int) $ev->id,
                'table' => $ev->table_name,
                'eventType' => $ev->event_type,
                'recordId' => $ev->record_id,
                'payload' => $ev->payload ?? [],
                'createdAt' => $ev->created_at?->toISOString(),
            ]);

        return response()->json([
            'data' => [
                'latestId' => $latestId,
                'events' => $events,
            ],
        ]);
    }

    /**
     * Server-Sent Events stream for real-time updates.
     *
     * GET /api/v1/realtime/stream?since={id}
     */
    public function stream(Request $request): StreamedResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (! $user) {
            $token = $request->bearerToken() ?: (string) $request->query('token', '');
            $accessToken = $token !== '' ? PersonalAccessToken::findToken($token) : null;
            if ($accessToken && (! $accessToken->expires_at || $accessToken->expires_at->isFuture())) {
                $user = $accessToken->tokenable;
            }
        }
        abort_unless($user !== null, 401, 'Unauthenticated.');

        $lastEventHeader = $request->header('Last-Event-ID');
        $defaultLatest = (int) (RealtimeEvent::query()->max('id') ?? 0);
        $since = $lastEventHeader !== null && is_numeric($lastEventHeader)
            ? max(0, (int) $lastEventHeader)
            : max(0, (int) $request->input('since', $defaultLatest));

        // Never block a single-worker PHP built-in server; stream continuously when multi-worker or FPM/Apache.
        $cliWorkers = (int) (getenv('PHP_CLI_SERVER_WORKERS') ?: env('PHP_CLI_SERVER_WORKERS', 1));
        $isSingleWorkerCliServer = PHP_SAPI === 'cli-server' && $cliWorkers < 2;
        $maxSeconds = ($request->boolean('once') || $isSingleWorkerCliServer) ? 0 : 12;

        return response()->stream(function () use ($since, $maxSeconds) {
            $cursor = $since;
            $started = time();

            echo "retry: 1200\n\n";
            echo "id: {$cursor}\nevent: connected\ndata: {\"latestId\":{$cursor}}\n\n";
            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();

            while (true) {
                if (connection_aborted()) {
                    break;
                }

                $events = RealtimeEvent::query()
                    ->where('id', '>', $cursor)
                    ->orderBy('id')
                    ->limit(50)
                    ->get();

                foreach ($events as $ev) {
                    $cursor = (int) $ev->id;
                    $payload = json_encode([
                        'id' => $cursor,
                        'table' => $ev->table_name,
                        'eventType' => $ev->event_type,
                        'recordId' => $ev->record_id,
                        'payload' => $ev->payload ?? [],
                        'createdAt' => $ev->created_at?->toISOString(),
                    ]);
                    echo "id: {$cursor}\nevent: change\ndata: {$payload}\n\n";
                }

                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();

                if ($maxSeconds === 0 || (time() - $started) >= $maxSeconds) {
                    echo "id: {$cursor}\nevent: ping\ndata: {\"latestId\":{$cursor}}\n\n";
                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
                    flush();
                    break;
                }

                usleep(350000);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
