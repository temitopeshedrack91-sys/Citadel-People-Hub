<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\IdentityLink;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Handles authentication, user profile management, and session lifecycle.
 *
 * Public endpoints authenticate users and issue Laravel Sanctum personal
 * access tokens. Authenticated endpoints provide the current user profile,
 * allow self-service contact updates, and revoke active sessions.
 */
class AuthController extends Controller
{
    /**
     * Authenticate user credentials and issue a personal access token.
     *
     * POST /api/v1/auth/login
     * Throttled to 5 attempts per minute per IP address.
     *
     * Request body:
     * - email: Valid RFC email address (required, max 254 characters).
     * - password: Raw password string (required, max 4096 characters).
     * - device_name: Optional device label for token identification (default: 'citadel-people-hub').
     *
     * Response:
     * - token: Plain-text Sanctum bearer token string.
     * - user: Canonical user payload with entity, department, and linked employee data.
     *
     * @throws ValidationException When credentials are invalid or user is inactive.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email:rfc', 'max:254'],
            'password' => ['required', 'string', 'max:4096'],
            'device_name' => ['sometimes', 'string', 'max:100'],
        ]);

        $provider = Auth::guard('web')->getProvider();
        $user = $provider->retrieveByCredentials([
            'email' => strtolower($credentials['email']),
            'is_active' => true,
        ]);

        if (! $user || ! $provider->validateCredentials($user, ['password' => $credentials['password']])) {
            throw ValidationException::withMessages(['email' => ['The provided credentials are invalid.']]);
        }

        $token = $user->createToken($credentials['device_name'] ?? 'citadel-people-hub')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->userData($user),
        ]);
    }

    /**
     * Return the authenticated user profile and organizational context.
     *
     * GET /api/v1/auth/user
     * Headers: Authorization: Bearer <token>
     *
     * Response:
     * - user: User attributes, roles, entity code, and linked employee record.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->userData($request->user())]);
    }

    /**
     * Update self-service contact information for the linked employee record.
     *
     * PATCH /api/v1/auth/profile
     *
     * Request body:
     * - phone: Optional phone string (max 40 chars, nullable).
     * - location: Optional physical address/campus string (max 2000 chars, nullable).
     * At least one of phone or location must be provided.
     *
     * Response:
     * - data: Updated phone and location strings.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'location' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);
        abort_if($data === [], 422, 'Provide a phone number or location to update.');

        $user = $request->user();
        abort_unless($user->staff_id, 404, 'No employee record is linked to this account.');
        $employee = DB::transaction(function () use ($request, $user, $data): Employee {
            $employee = Employee::query()->where('staff_id', $user->staff_id)->lockForUpdate()->firstOrFail();
            $updates = [];
            if (array_key_exists('phone', $data)) {
                $updates['phone'] = $data['phone'];
            }
            if (array_key_exists('location', $data)) {
                $updates['address'] = $data['location'];
            }
            $employee->update($updates);
            AuditLogger::record($request, 'Employee Self-Service', 'Updated own contact profile', $employee->id, $employee->full_name, null, 'Updated');

            return $employee->refresh();
        });

        return response()->json(['data' => [
            'phone' => $employee->phone,
            'location' => $employee->address,
        ]]);
    }

    /**
     * Revoke the current personal access token, terminating the active session.
     *
     * POST /api/v1/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    /**
     * Assemble serialized user data including entity, department, and verified identity crosswalk.
     */
    private function userData($user): array
    {
        $user->loadMissing(['entity', 'department']);
        $employee = $user->staff_id
            ? Employee::query()->with(['entity', 'department'])->where('staff_id', $user->staff_id)->first()
            : null;

        $identityLink = IdentityLink::query()
            ->where('user_id', $user->id)
            ->where('provider', 'supabase')
            ->where('status', IdentityLink::STATUS_VERIFIED)
            ->whereNull('revoked_at')
            ->first();

        return [
            'id' => (string) ($employee?->id ?? $user->id),
            'userId' => (string) $user->id,
            'employeeId' => $employee?->id === null ? null : (string) $employee->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $employee?->phone,
            'location' => $employee?->address,
            'role' => $user->role,
            'staffId' => $user->staff_id,
            'entityId' => $user->entity_id ?? $employee?->entity_id,
            'entityName' => $user->entity?->name ?? $employee?->entity?->name,
            'departmentId' => $user->department_id ?? $employee?->department_id,
            'departmentName' => $user->department?->name ?? $employee?->department?->name,
            'jobTitle' => $user->job_title ?? $employee?->job_title,
            'supabaseUserId' => $identityLink?->provider_user_id,
            'identityVerified' => $identityLink !== null && $employee !== null,
        ];
    }
}
