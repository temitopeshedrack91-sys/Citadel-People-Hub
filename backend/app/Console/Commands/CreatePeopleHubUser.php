<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreatePeopleHubUser extends Command
{
    protected $signature = 'people-hub:create-user';

    protected $description = 'Provision a role-scoped application account from the trusted command line';

    private const ROLES = ['PCCM_SUPER_ADMIN', 'BUSINESS_HEAD', 'DEPARTMENT_HEAD', 'EMPLOYEE', 'SYSTEM_ADMIN'];

    public function handle(): int
    {
        $name = trim((string) $this->ask('User name'));
        $email = strtolower(trim((string) $this->ask('Work email')));
        $role = strtoupper(trim((string) $this->choice('Role', self::ROLES)));
        $staffId = trim((string) $this->ask('Staff ID (leave blank only for an unlinked admin account)'));

        if ($name === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('A valid name and email address are required.');

            return self::FAILURE;
        }
        if (User::query()->where('email', $email)->exists()) {
            $this->error('An account with this email already exists.');

            return self::FAILURE;
        }

        $employee = $staffId !== '' ? Employee::query()->where('staff_id', $staffId)->first() : null;
        if ($staffId !== '' && ! $employee) {
            $this->error('No employee record matches that staff ID. Create the employee record first.');

            return self::FAILURE;
        }
        if ($employee && ! in_array($employee->status, ['Active', 'Probation', 'Confirmed', 'On Leave'], true)) {
            $this->error('An account cannot be provisioned for an inactive or offboarded employee.');

            return self::FAILURE;
        }
        if (in_array($role, ['BUSINESS_HEAD', 'DEPARTMENT_HEAD', 'EMPLOYEE'], true) && ! $employee) {
            $this->error('This role must be linked to an existing employee record.');

            return self::FAILURE;
        }

        $password = (string) $this->secret('Temporary password (minimum 14 characters)');
        $confirmation = (string) $this->secret('Confirm temporary password');
        if (strlen($password) < 14 || ! hash_equals($password, $confirmation)) {
            $this->error('The password must contain at least 14 characters and both entries must match.');

            return self::FAILURE;
        }

        $user = new User;
        $user->forceFill([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => $role,
            'staff_id' => $employee?->staff_id,
            'entity_id' => $employee?->entity_id,
            'department_id' => $employee?->department_id,
            'job_title' => $employee?->job_title,
            'is_active' => true,
            'email_verified_at' => now(),
        ])->save();

        $this->info("Account provisioned for {$user->email} with role {$user->role}. Provide its initial password via an approved secure channel.");

        return self::SUCCESS;
    }
}
