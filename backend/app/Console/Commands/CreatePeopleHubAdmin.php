<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreatePeopleHubAdmin extends Command
{
    protected $signature = 'people-hub:create-admin';

    protected $description = 'Create a PCCM administrator account without exposing registration publicly';

    public function handle(): int
    {
        $name = trim((string) $this->ask('Administrator name'));
        $email = strtolower(trim((string) $this->ask('Administrator email')));
        if ($name === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('A valid name and email address are required.');

            return self::FAILURE;
        }
        if (User::query()->where('email', $email)->exists()) {
            $this->error('An account with this email already exists.');

            return self::FAILURE;
        }

        $password = (string) $this->secret('Password (minimum 14 characters)');
        $confirmation = (string) $this->secret('Confirm password');
        if (strlen($password) < 14 || ! hash_equals($password, $confirmation)) {
            $this->error('The password must contain at least 14 characters and both entries must match.');

            return self::FAILURE;
        }

        $user = new User;
        $user->forceFill([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'PCCM_SUPER_ADMIN',
            'is_active' => true,
            'email_verified_at' => now(),
        ])->save();

        $this->info("PCCM administrator created: {$user->email}");

        return self::SUCCESS;
    }
}
