<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemNotification;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $items = SystemNotification::query()
            ->where(fn ($query) => $query->whereNull('target_user_id')->orWhere('target_user_id', $user->id))
            ->where(fn ($query) => $query->whereNull('target_user_role')->orWhere('target_user_role', $user->role))
            ->latest()->limit(200)->get();

        return response()->json(['data' => $items->map(fn (SystemNotification $item) => $this->present($item))]);
    }

    public function markRead(Request $request, SystemNotification $notification): JsonResponse
    {
        DB::transaction(function () use ($request, $notification): void {
            $lockedNotification = SystemNotification::query()->lockForUpdate()->findOrFail($notification->id);
            $this->authorizeNotification($request, $lockedNotification);
            $lockedNotification->update(['read_at' => now()]);
            AuditLogger::record($request, 'Notifications', 'Marked notification as read', $lockedNotification->id, $lockedNotification->title);
        });

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        SystemNotification::query()
            ->where(fn ($query) => $query->whereNull('target_user_id')->orWhere('target_user_id', $request->user()->id))
            ->where(fn ($query) => $query->whereNull('target_user_role')->orWhere('target_user_role', $request->user()->role))
            ->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['message' => 'Notifications marked as read.']);
    }

    private function authorizeNotification(Request $request, SystemNotification $notification): void
    {
        abort_unless(
            (! $notification->target_user_id || $notification->target_user_id === $request->user()->id)
            && (! $notification->target_user_role || $notification->target_user_role === $request->user()->role),
            404
        );
    }

    private function present(SystemNotification $item): array
    {
        return [
            'id' => $item->id,
            'type' => $item->type,
            'category' => $item->category,
            'title' => $item->title,
            'message' => $item->message,
            'timestamp' => $item->created_at?->toISOString(),
            'isRead' => $item->read_at !== null,
            'targetUserRole' => $item->target_user_role,
            'targetUserId' => $item->target_user_id ? (string) $item->target_user_id : null,
            'actionUrl' => $item->action_url,
        ];
    }
}
