<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Entity;
use App\Models\IdentityLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class IdentityLinkTest extends TestCase
{
    use RefreshDatabase;

    protected Entity $entity;

    protected Department $department;

    protected Employee $employee;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->entity = Entity::create(['name' => 'Citadel', 'short_code' => 'CIT']);
        $this->department = Department::create(['entity_id' => $this->entity->id, 'name' => 'People', 'code' => 'PPL']);
        $this->employee = Employee::create([
            'staff_id' => 'ID-LINK-001',
            'full_name' => 'Identity Test Employee',
            'first_name' => 'Identity',
            'last_name' => 'Test',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);
        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'SYSADMIN',
            'staff_id' => $this->employee->staff_id,
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);
    }

    public function test_identity_links_endpoint_requires_admin(): void
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'EMPLOYEE',
            'is_active' => true,
        ]);

        $this->actingAs($user)->getJson('/api/v1/identity-links')->assertForbidden();
        $this->actingAs($user)->postJson('/api/v1/identity-links', [])->assertForbidden();
    }

    public function test_admin_can_create_identity_link(): void
    {
        $targetEmployee = Employee::create([
            'staff_id' => 'ID-LINK-TARGET',
            'full_name' => 'Target Employee',
            'first_name' => 'Target',
            'last_name' => 'Employee',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);

        $user = User::create([
            'name' => 'Target User',
            'email' => 'target@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'EMPLOYEE',
            'staff_id' => $targetEmployee->staff_id,
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/identity-links', [
            'userId' => $user->id,
            'employeeId' => $targetEmployee->id,
            'providerUserId' => '550e8400-e29b-41d4-a716-446655440000',
            'verificationMethod' => 'staff_id_manual',
            'evidenceReference' => 'ticket-12345',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'verified')
            ->assertJsonPath('data.providerUserId', '550e8400-e29b-41d4-a716-446655440000')
            ->assertJsonPath('data.user.id', $user->id);

        $this->assertDatabaseHas('identity_links', [
            'user_id' => $user->id,
            'employee_id' => $targetEmployee->id,
            'provider_user_id' => '550e8400-e29b-41d4-a716-446655440000',
            'status' => 'verified',
        ]);
    }

    public function test_identity_link_rejects_non_uuid_provider_user_id(): void
    {
        $targetEmployee = Employee::create([
            'staff_id' => 'ID-LINK-TARGET-2',
            'full_name' => 'Target Employee 2',
            'first_name' => 'Target',
            'last_name' => 'Employee',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);

        $user = User::create([
            'name' => 'Test User 2',
            'email' => 'test2@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'EMPLOYEE',
            'staff_id' => $targetEmployee->staff_id,
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/identity-links', [
            'userId' => $user->id,
            'employeeId' => $targetEmployee->id,
            'providerUserId' => 'not-a-valid-uuid',
            'verificationMethod' => 'staff_id_manual',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['providerUserId']);
    }

    public function test_identity_link_rejects_staff_id_mismatch(): void
    {
        $employee2 = Employee::create([
            'staff_id' => 'ID-LINK-002',
            'full_name' => 'Different Employee',
            'first_name' => 'Different',
            'last_name' => 'Employee',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);

        $user = User::create([
            'name' => 'Mismatch User',
            'email' => 'mismatch@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'EMPLOYEE',
            'staff_id' => $employee2->staff_id,
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/identity-links', [
            'userId' => $user->id,
            'employeeId' => $this->employee->id,
            'providerUserId' => '550e8400-e29b-41d4-a716-446655440001',
            'verificationMethod' => 'staff_id_manual',
        ]);

        $response->assertUnprocessable();
        $this->assertStringContainsString('Staff ID mismatch', $response->json('message'));
    }

    public function test_identity_link_cannot_reuse_provider_user_id(): void
    {
        $user1 = User::create([
            'name' => 'User 1',
            'email' => 'user1@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'EMPLOYEE',
            'staff_id' => $this->employee->staff_id.'-1',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);

        $employee1 = Employee::create([
            'staff_id' => $user1->staff_id,
            'full_name' => 'User 1 Employee',
            'first_name' => 'User',
            'last_name' => 'One',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);

        $user2 = User::create([
            'name' => 'User 2',
            'email' => 'user2@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'EMPLOYEE',
            'staff_id' => $this->employee->staff_id.'-2',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);

        $employee2 = Employee::create([
            'staff_id' => $user2->staff_id,
            'full_name' => 'User 2 Employee',
            'first_name' => 'User',
            'last_name' => 'Two',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);

        $this->actingAs($this->admin)->postJson('/api/v1/identity-links', [
            'userId' => $user1->id,
            'employeeId' => $employee1->id,
            'providerUserId' => '550e8400-e29b-41d4-a716-446655440002',
            'verificationMethod' => 'staff_id_manual',
        ])->assertCreated();

        $response = $this->actingAs($this->admin)->postJson('/api/v1/identity-links', [
            'userId' => $user2->id,
            'employeeId' => $employee2->id,
            'providerUserId' => '550e8400-e29b-41d4-a716-446655440002',
            'verificationMethod' => 'staff_id_manual',
        ]);

        $response->assertUnprocessable();
        $this->assertStringContainsString('already linked', $response->json('message'));
    }

    public function test_unlinked_user_auth_response_shows_identity_verified_false(): void
    {
        $user = User::create([
            'name' => 'Unlinked User',
            'email' => 'unlinked@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'EMPLOYEE',
            'staff_id' => 'ID-LINK-003',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);

        $employee = Employee::create([
            'staff_id' => $user->staff_id,
            'full_name' => 'Unlinked Employee',
            'first_name' => 'Unlinked',
            'last_name' => 'Employee',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonPath('user.identityVerified', false)
            ->assertJsonPath('user.supabaseUserId', null);
    }

    public function test_linked_user_auth_response_shows_identity_verified_true(): void
    {
        $user = User::create([
            'name' => 'Linked User',
            'email' => 'linked@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'EMPLOYEE',
            'staff_id' => 'ID-LINK-004',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);

        $employee = Employee::create([
            'staff_id' => $user->staff_id,
            'full_name' => 'Linked Employee',
            'first_name' => 'Linked',
            'last_name' => 'Employee',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);

        IdentityLink::create([
            'user_id' => $user->id,
            'employee_id' => $employee->id,
            'provider' => 'supabase',
            'provider_user_id' => '550e8400-e29b-41d4-a716-446655440003',
            'status' => 'verified',
            'verification_method' => 'hr_review',
            'verified_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonPath('user.identityVerified', true)
            ->assertJsonPath('user.supabaseUserId', '550e8400-e29b-41d4-a716-446655440003');
    }

    public function test_revoked_identity_link_is_not_valid(): void
    {
        $user = User::create([
            'name' => 'To Revoke User',
            'email' => 'revoke@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'EMPLOYEE',
            'staff_id' => 'ID-LINK-005',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);

        $employee = Employee::create([
            'staff_id' => $user->staff_id,
            'full_name' => 'To Revoke Employee',
            'first_name' => 'To',
            'last_name' => 'Revoke',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);

        $link = IdentityLink::create([
            'user_id' => $user->id,
            'employee_id' => $employee->id,
            'provider' => 'supabase',
            'provider_user_id' => '550e8400-e29b-41d4-a716-446655440004',
            'status' => 'verified',
            'verification_method' => 'hr_review',
            'verified_at' => now(),
        ]);

        $this->actingAs($this->admin)->deleteJson("/api/v1/identity-links/{$link->id}")->assertOk()
            ->assertJsonPath('data.status', 'revoked');

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonPath('user.identityVerified', false);
    }

    public function test_inactive_user_cannot_have_identity_linked(): void
    {
        $inactiveEmployee = Employee::create([
            'staff_id' => 'ID-LINK-006',
            'full_name' => 'Inactive Employee',
            'first_name' => 'Inactive',
            'last_name' => 'Employee',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);

        $inactiveUser = User::create([
            'name' => 'Inactive User',
            'email' => 'inactive@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'EMPLOYEE',
            'staff_id' => $inactiveEmployee->staff_id,
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => false,
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/identity-links', [
            'userId' => $inactiveUser->id,
            'employeeId' => $inactiveEmployee->id,
            'providerUserId' => '550e8400-e29b-41d4-a716-446655440005',
            'verificationMethod' => 'staff_id_manual',
        ]);

        $response->assertUnprocessable();
        $this->assertStringContainsString('must be active', $response->json('message'));
    }

    public function test_me_endpoint_returns_own_identity_link(): void
    {
        $user = User::create([
            'name' => 'My Identity User',
            'email' => 'myidentity@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'EMPLOYEE',
            'staff_id' => 'ID-LINK-007',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);

        $employee = Employee::create([
            'staff_id' => $user->staff_id,
            'full_name' => 'My Identity Employee',
            'first_name' => 'My',
            'last_name' => 'Identity',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);

        IdentityLink::create([
            'user_id' => $user->id,
            'employee_id' => $employee->id,
            'provider' => 'supabase',
            'provider_user_id' => '550e8400-e29b-41d4-a716-446655440006',
            'status' => 'verified',
            'verification_method' => 'hr_review',
            'verified_at' => now(),
        ]);

        $this->actingAs($user)->getJson('/api/v1/auth/identity')->assertOk()
            ->assertJsonPath('data.providerUserId', '550e8400-e29b-41d4-a716-446655440006');
    }

    public function test_identity_link_audit_log_records_linking_action(): void
    {
        $targetEmployee = Employee::create([
            'staff_id' => 'ID-LINK-008',
            'full_name' => 'Audit Log Test Employee',
            'first_name' => 'Audit',
            'last_name' => 'Test',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);

        $user = User::create([
            'name' => 'Audit Log User',
            'email' => 'audit@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'EMPLOYEE',
            'staff_id' => $targetEmployee->staff_id,
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);

        $this->actingAs($this->admin)->postJson('/api/v1/identity-links', [
            'userId' => $user->id,
            'employeeId' => $targetEmployee->id,
            'providerUserId' => '550e8400-e29b-41d4-a716-446655440007',
            'verificationMethod' => 'hr_review',
            'evidenceReference' => 'ticket-789',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'module' => 'Identity Management',
            'action' => 'Linked Supabase identity',
        ]);

        $logEntry = AuditLog::where('module', 'Identity Management')
            ->where('action', 'Linked Supabase identity')
            ->first();
        $this->assertNotNull($logEntry, 'Audit log entry should exist');
        $this->assertEquals($this->admin->id, $logEntry->user_id);
    }
}
