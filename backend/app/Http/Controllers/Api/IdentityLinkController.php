<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\IdentityLink;
use App\Models\User;
use App\Support\IdentityCrosswalk;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class IdentityLinkController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(
            in_array(RoleAuthorization::canonical($request->user()->role), ['ADMIN'], true),
            403,
            'Only administrators can view identity links.'
        );

        $links = IdentityLink::query()
            ->with(['user:id,name,email', 'employee:id,staff_id,full_name', 'verifiedBy:id,name'])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        return response()->json(['data' => $links->map(fn (IdentityLink $link) => $this->present($link))]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless(RoleAuthorization::canonical($request->user()->role) === 'ADMIN', 403, 'Only administrators can link identities.');

        $data = $request->validate([
            'userId' => ['required', 'exists:users,id'],
            'employeeId' => ['required', 'exists:employees,id'],
            'providerUserId' => ['required', 'string', 'max:128', function ($attribute, $value, $fail) {
                if (! Str::isUuid($value)) {
                    $fail('The provider user ID must be a valid UUID.');
                }
            }],
            'verificationMethod' => ['required', 'string', 'max:60'],
            'verificationEvidence' => ['nullable', 'string', 'max:1000'],
            'evidenceReference' => ['nullable', 'string', 'max:100'],
        ]);

        $user = User::query()->findOrFail($data['userId']);
        $employee = Employee::query()->findOrFail($data['employeeId']);

        $crosswalk = app(IdentityCrosswalk::class);
        $link = $crosswalk->link($request, $request->user(), $user, $data['providerUserId'], $employee, $data['verificationMethod'], $data['verificationEvidence'] ?? null, $data['evidenceReference'] ?? null);

        return response()->json(['data' => $this->present($link)], 201);
    }

    public function revoke(Request $request, IdentityLink $identityLink): JsonResponse
    {
        abort_unless(RoleAuthorization::canonical($request->user()->role) === 'ADMIN', 403, 'Only administrators can revoke identity links.');

        $revoked = app(IdentityCrosswalk::class)->revoke($request, $request->user(), $identityLink, $request->input('reason'));

        return response()->json(['message' => 'Identity link revoked.', 'data' => $this->present($revoked)]);
    }

    public function show(Request $request, IdentityLink $identityLink): JsonResponse
    {
        abort_unless(RoleAuthorization::canonical($request->user()->role) === 'ADMIN', 403, 'Only administrators can view identity links.');

        $identityLink->loadMissing(['user:id,name,email', 'employee:id,staff_id,full_name', 'verifiedBy:id,name']);

        return response()->json(['data' => $this->present($identityLink)]);
    }

    public function me(Request $request): JsonResponse
    {
        $links = IdentityLink::query()
            ->where('user_id', $request->user()->id)
            ->where('provider', 'supabase')
            ->where('status', IdentityLink::STATUS_VERIFIED)
            ->whereNull('revoked_at')
            ->first();

        return response()->json([
            'data' => $links
                ? [
                    'provider' => $links->provider,
                    'providerUserId' => $links->provider_user_id,
                    'verifiedAt' => $links->verified_at?->toISOString(),
                ]
                : null,
        ]);
    }

    private function present(IdentityLink $link): array
    {
        return [
            'id' => $link->id,
            'provider' => $link->provider,
            'providerUserId' => $link->provider_user_id,
            'status' => $link->status,
            'user' => $link->user ? [
                'id' => $link->user->id,
                'name' => $link->user->name,
                'email' => $link->user->email,
            ] : null,
            'employee' => $link->employee ? [
                'id' => $link->employee->id,
                'staffId' => $link->employee->staff_id,
                'fullName' => $link->employee->full_name,
            ] : null,
            'verifiedBy' => $link->verifiedBy ? ['id' => $link->verifiedBy->id, 'name' => $link->verifiedBy->name] : null,
            'verificationMethod' => $link->verification_method,
            'verifiedAt' => $link->verified_at?->toISOString(),
            'revokedAt' => $link->revoked_at?->toISOString(),
            'revocationReason' => $link->revocation_reason,
            'metadata' => $link->metadata,
        ];
    }
}
