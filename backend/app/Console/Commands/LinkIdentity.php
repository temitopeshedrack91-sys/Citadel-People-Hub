<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\IdentityLink;
use App\Models\User;
use App\Support\IdentityCrosswalk;
use Illuminate\Console\Command;

class LinkIdentity extends Command
{
    protected $signature = 'identity:link
        {user : User email address or ID}
        {provider_user_id : The provider user ID (UUID for Supabase)}
        {--verification_method= : Verification method (e.g., staff_id_manual, hr_review)}
        {--evidence= : Optional evidence reference}
        {--staff_id= : Required staff ID for verification}';

    protected $description = 'Link a user account to a provider identity (requires ADMIN role)';

    public function handle(IdentityCrosswalk $crosswalk): int
    {
        $userIdentifier = $this->argument('user');
        $providerUserId = $this->argument('provider_user_id');
        $method = $this->option('verification_method') ?: 'staff_id_manual';
        $evidence = $this->option('evidence');
        $staffId = $this->option('staff_id');

        $user = User::query()
            ->where('email', $userIdentifier)
            ->orWhere('id', $userIdentifier)
            ->first();

        if (! $user) {
            $this->error("User not found: {$userIdentifier}");

            return self::FAILURE;
        }

        if (! $user->is_active) {
            $this->error('Cannot link identity to an inactive user account.');

            return self::FAILURE;
        }

        if (! str()->isUuid($providerUserId)) {
            $this->error('Provider user ID must be a valid UUID.');

            return self::FAILURE;
        }

        if ($staffId === null) {
            $this->error('Staff ID is required. Use --staff-id option.');

            return self::FAILURE;
        }

        $employee = Employee::query()->where('staff_id', $staffId)->first();
        if (! $employee) {
            $this->error("Employee not found for staff ID: {$staffId}");

            return self::FAILURE;
        }

        if ($user->staff_id && $user->staff_id !== $employee->staff_id) {
            $this->error("User's current staff ID ({$user->staff_id}) does not match specified staff ID ({$employee->staff_id}).");

            return self::FAILURE;
        }

        $existingVerified = IdentityLink::query()
            ->where('provider', 'supabase')
            ->where('provider_user_id', $providerUserId)
            ->where('status', IdentityLink::STATUS_VERIFIED)
            ->first();

        if ($existingVerified) {
            if ($existingVerified->user_id === $user->id) {
                $this->info('User already has an active identity link.');

                return self::SUCCESS;
            }

            $this->error('Provider identity is already linked to another user.');

            return self::FAILURE;
        }

        $link = $crosswalk->link(request(), $user, $user, $providerUserId, $employee, $method, $evidence);

        $this->info("Successfully linked {$user->email} to provider identity {$providerUserId}");
        $this->line("Employee ID: {$employee->id} ({$employee->staff_id})");
        $this->line("Link ID: {$link->id}");

        return self::SUCCESS;
    }
}
