<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\IdentityLink;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class IdentityCrosswalk
{
    public function link(
        ?Request $request,
        User $actor,
        User $user,
        string $providerUserId,
        Employee $employee,
        string $verificationMethod,
        ?string $verificationEvidence = null,
        ?string $evidenceReference = null
    ): IdentityLink {
        abort_unless(RoleAuthorization::canonical($actor->role) === 'ADMIN', 403, 'Only administrators can link identities.');
        abort_unless($user->is_active, 422, 'The target user account must be active.');
        abort_unless(Str::isUuid($providerUserId), 422, 'The provider user ID must be a valid UUID.');

        $staffId = $user->staff_id;
        abort_unless($staffId !== null, 422, 'The user account is not linked to an employee record. Verify staff ID before linking.');
        abort_unless($employee->staff_id === $staffId, 422, 'Staff ID mismatch: cannot link this employee to the user account.');

        $link = DB::transaction(function () use ($user, $employee, $providerUserId, $verificationMethod, $verificationEvidence, $evidenceReference, $actor, $request): IdentityLink {
            $existingVerifiedProvider = IdentityLink::query()
                ->where('provider', 'supabase')
                ->where('provider_user_id', $providerUserId)
                ->where('status', IdentityLink::STATUS_VERIFIED)
                ->first();
            if ($existingVerifiedProvider) {
                abort(422, 'This identity is already linked to another user account.');
            }

            $existingVerifiedUser = IdentityLink::query()
                ->where('user_id', $user->id)
                ->where('provider', 'supabase')
                ->where('status', IdentityLink::STATUS_VERIFIED)
                ->first();
            $existingVerifiedEmployee = $employee->id !== null
                ? IdentityLink::query()
                    ->where('employee_id', $employee->id)
                    ->where('provider', 'supabase')
                    ->where('status', IdentityLink::STATUS_VERIFIED)
                    ->first()
                : null;

            if ($existingVerifiedUser || $existingVerifiedEmployee) {
                abort(422, 'This employee or user already has a verified identity link.');
            }

            $metadata = ['linked_via' => 'admin_console', 'evidence_ref' => $evidenceReference];
            $agent = $request ? $request->userAgent() : null;

            $link = IdentityLink::create([
                'user_id' => $user->id,
                'employee_id' => $employee->id,
                'provider' => 'supabase',
                'provider_user_id' => $providerUserId,
                'status' => IdentityLink::STATUS_VERIFIED,
                'verification_method' => $verificationMethod,
                'verification_evidence' => $verificationEvidence,
                'verified_by_user_id' => $actor->id,
                'verified_at' => now(),
                'last_verified_at' => now(),
                'metadata' => $metadata,
            ]);

            AuditLog::create([
                'user_id' => $actor->id,
                'user_name' => $actor->name,
                'user_role' => $actor->role,
                'module' => 'Identity Management',
                'action' => 'Linked Supabase identity',
                'record_affected_id' => (string) $link->id,
                'record_affected_title' => "User {$user->email} → {$employee->staff_id}",
                'previous_value' => null,
                'new_value' => "Provider user: {$providerUserId}, Method: {$verificationMethod}",
                'ip_address' => $request ? $request->ip() : 'CLI',
                'user_agent' => $agent ? substr($agent, 0, 2000) : null,
                'severity' => 'Info',
            ]);

            return $link;
        });

        return $link;
    }

    public function revoke(
        ?Request $request,
        User $actor,
        IdentityLink $link,
        ?string $reason = null
    ): IdentityLink {
        abort_unless(RoleAuthorization::canonical($actor->role) === 'ADMIN', 403, 'Only administrators can revoke identity links.');
        abort_unless($link->status !== IdentityLink::STATUS_REVOKED, 409, 'Identity link is already revoked.');

        return DB::transaction(function () use ($request, $actor, $link, $reason): IdentityLink {
            $link->update([
                'status' => IdentityLink::STATUS_REVOKED,
                'revoked_by_user_id' => $actor->id,
                'revoked_at' => now(),
                'revocation_reason' => $reason,
            ]);

            AuditLog::create([
                'user_id' => $actor->id,
                'user_name' => $actor->name,
                'user_role' => $actor->role,
                'module' => 'Identity Management',
                'action' => 'Revoked identity link',
                'record_affected_id' => (string) $link->id,
                'record_affected_title' => "User {$link->user_id} ↔ {$link->provider_user_id}",
                'previous_value' => null,
                'new_value' => $reason,
                'ip_address' => $request ? $request->ip() : 'CLI',
                'user_agent' => $request ? substr($request->userAgent(), 0, 2000) : null,
                'severity' => 'Warning',
            ]);

            return $link;
        });
    }

    public function verifiedLinkForUser(User $user): ?IdentityLink
    {
        return IdentityLink::query()
            ->where('user_id', $user->id)
            ->where('provider', 'supabase')
            ->where('status', IdentityLink::STATUS_VERIFIED)
            ->whereNull('revoked_at')
            ->first();
    }

    public function verifiedLinkByProviderUserId(string $providerUserId): ?IdentityLink
    {
        return IdentityLink::query()
            ->where('provider', 'supabase')
            ->where('provider_user_id', $providerUserId)
            ->where('status', IdentityLink::STATUS_VERIFIED)
            ->whereNull('revoked_at')
            ->first();
    }

    public function resolveUserByProvider(string $provider, string $providerUserId): ?User
    {
        $link = $this->verifiedLinkByProviderUserId($providerUserId);

        return $link?->user;
    }

    public function scopeEmployeesByVerifiedIdentity(Builder $query): Builder
    {
        return $query->whereHas('identityLinks', function (Builder $q) {
            $q->where('provider', 'supabase')
                ->where('status', IdentityLink::STATUS_VERIFIED)
                ->whereNull('revoked_at');
        });
    }
}
