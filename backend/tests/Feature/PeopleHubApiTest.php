<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Entity;
use App\Models\HubDocument;
use App\Models\LeaveCategory;
use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PeopleHubApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_is_public_and_reports_the_service(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok');
    }

    public function test_api_requires_authentication_for_business_data(): void
    {
        $this->getJson('/api/v1/employees')->assertUnauthorized();
    }

    public function test_domain_migration_stops_when_existing_schema_tables_are_present(): void
    {
        $migration = require database_path('migrations/2026_10_23_172144_create_people_hub_domain_tables.php');

        try {
            $migration->up();
            $this->fail('The migration should stop before modifying an existing domain schema.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('Existing People Hub tables were found', $exception->getMessage());
        }
    }

    public function test_initial_migration_stops_before_creating_laravel_tables_on_existing_domain_schema(): void
    {
        $migration = require database_path('migrations/0001_01_01_000000_create_users_table.php');

        try {
            $migration->up();
            $this->fail('The initial migration should stop before creating Laravel tables.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('no Laravel tables were changed', $exception->getMessage());
        }
    }

    public function test_user_can_login_and_receive_a_sanctum_token(): void
    {
        User::factory()->create([
            'email' => 'hr@example.test',
            'password' => Hash::make('a-long-and-strong-password'),
            'role' => 'PCCM_SUPER_ADMIN',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'hr@example.test',
            'password' => 'a-long-and-strong-password',
        ])->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'email', 'role']]);
    }

    public function test_login_rejects_inactive_users(): void
    {
        User::factory()->create([
            'email' => 'disabled@example.test',
            'password' => Hash::make('a-long-and-strong-password'),
            'is_active' => false,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'disabled@example.test',
            'password' => 'a-long-and-strong-password',
        ])->assertUnprocessable();
    }

    public function test_employee_role_cannot_read_other_employees(): void
    {
        $entity = Entity::create(['name' => 'Citadel', 'short_code' => 'CIT']);
        $department = Department::create(['entity_id' => $entity->id, 'name' => 'People', 'code' => 'PPL']);
        $user = User::factory()->create([
            'role' => 'EMPLOYEE',
            'staff_id' => 'STAFF-1',
            'entity_id' => $entity->id,
            'department_id' => $department->id,
        ]);

        $this->actingAs($user)->getJson('/api/v1/employees')->assertOk()->assertJsonPath('data', []);
    }

    public function test_unlinked_system_admin_cannot_read_scoped_documents(): void
    {
        $entity = Entity::create(['name' => 'Citadel', 'short_code' => 'CIT']);
        $department = Department::create(['entity_id' => $entity->id, 'name' => 'People', 'code' => 'PPL']);
        $user = User::factory()->create([
            'role' => 'SYSTEM_ADMIN',
            'entity_id' => null,
            'department_id' => null,
        ]);
        HubDocument::create([
            'title' => 'Entity policy',
            'file_name' => 'entity-policy.pdf',
            'file_size' => 100,
            'file_type' => 'application/pdf',
            'category' => 'Company Policy',
            'access_level' => 'Public',
            'entity_scope' => $entity->name,
            'uploaded_by' => $user->id,
            'storage_path' => 'entity-policy.pdf',
        ]);
        HubDocument::create([
            'title' => 'Department policy',
            'file_name' => 'department-policy.pdf',
            'file_size' => 100,
            'file_type' => 'application/pdf',
            'category' => 'Company Policy',
            'access_level' => 'Departmental',
            'entity_scope' => $entity->name,
            'department_scope' => $department->name,
            'uploaded_by' => $user->id,
            'storage_path' => 'department-policy.pdf',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/documents')
            ->assertOk()
            ->assertJsonPath('data', []);

        $scopedAdmin = User::factory()->create([
            'role' => 'SYSTEM_ADMIN',
            'entity_id' => $entity->id,
            'department_id' => $department->id,
        ]);

        $this->actingAs($scopedAdmin)
            ->getJson('/api/v1/documents')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_authenticated_users_cannot_forge_compliance_audit_records(): void
    {
        $user = User::factory()->create(['role' => 'PCCM_SUPER_ADMIN']);

        $this->actingAs($user)
            ->postJson('/api/v1/audit-logs', [
                'module' => 'Payroll',
                'action' => 'Forged critical action',
                'severity' => 'Critical',
            ])
            ->assertStatus(405);

        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_department_head_cannot_create_employee_records(): void
    {
        $user = User::factory()->create(['role' => 'DEPARTMENT_HEAD']);

        $this->actingAs($user)->postJson('/api/v1/employees', [])->assertForbidden();
    }

    public function test_sensitive_employee_fields_are_hidden_from_non_pccm_accounts(): void
    {
        $this->app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $entity = Entity::create(['name' => 'Citadel', 'short_code' => 'CIT']);
        $department = Department::create(['entity_id' => $entity->id, 'name' => 'People', 'code' => 'PPL']);
        $employee = Employee::create([
            'staff_id' => 'STAFF-2',
            'full_name' => 'Example Employee',
            'first_name' => 'Example',
            'last_name' => 'Employee',
            'date_of_birth' => '1990-01-02',
            'address' => 'Private home address',
            'emergency_contact' => ['name' => 'Contact Name', 'phone' => '555-0101'],
            'next_of_kin' => ['name' => 'Private Relative', 'phone' => '555-0102'],
            'bank_payroll' => ['accountNumber' => '1234567890', 'basicSalary' => 900000],
            'pension_hmo' => ['rsaPin' => 'PRIVATE-RSA'],
            'entity_id' => $entity->id,
            'department_id' => $department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);
        $employeeUser = User::factory()->create([
            'role' => 'EMPLOYEE',
            'staff_id' => $employee->staff_id,
            'entity_id' => $entity->id,
            'department_id' => $department->id,
        ]);

        $this->actingAs($employeeUser)
            ->getJson("/api/v1/employees/{$employee->id}")
            ->assertOk()
            ->assertJsonPath('data.bankPayroll.accountNumber', '')
            ->assertJsonPath('data.nextOfKin.name', '')
            ->assertJsonMissing(['Private home address']);

        $hrUser = User::factory()->create(['role' => 'PCCM_SUPER_ADMIN']);
        $this->actingAs($hrUser)
            ->getJson("/api/v1/employees/{$employee->id}")
            ->assertOk()
            ->assertJsonPath('data.bankPayroll.accountNumber', '1234567890')
            ->assertJsonPath('data.nextOfKin.name', 'Private Relative')
            ->assertJsonPath('data.address', 'Private home address');
    }

    public function test_leave_approval_moves_through_department_business_and_hr_stages(): void
    {
        $entity = Entity::create(['name' => 'Citadel', 'short_code' => 'CIT']);
        $department = Department::create(['entity_id' => $entity->id, 'name' => 'People', 'code' => 'PPL']);
        $employee = Employee::create([
            'staff_id' => 'STAFF-3',
            'full_name' => 'Example Employee',
            'first_name' => 'Example',
            'last_name' => 'Employee',
            'entity_id' => $entity->id,
            'department_id' => $department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);
        $leave = LeaveRequest::create([
            'employee_id' => $employee->id,
            'employee_staff_id' => $employee->staff_id,
            'employee_name' => $employee->full_name,
            'entity_name' => $entity->name,
            'department_name' => $department->name,
            'leave_type' => 'Annual Leave',
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(3)->toDateString(),
            'total_days' => 3,
            'reason' => 'Annual leave request',
            'status' => 'Submitted',
            'approval_stage' => 'DEPARTMENT_HEAD',
            'applied_date' => now(),
            'approval_history' => [],
        ]);
        $departmentHead = User::factory()->create(['role' => 'DEPARTMENT_HEAD', 'department_id' => $department->id]);
        $businessHead = User::factory()->create(['role' => 'BUSINESS_HEAD', 'entity_id' => $entity->id]);
        $hr = User::factory()->create(['role' => 'PCCM_SUPER_ADMIN']);

        $this->actingAs($businessHead)
            ->patchJson("/api/v1/leave-requests/{$leave->id}/status", ['status' => 'Approved'])
            ->assertForbidden();

        $this->actingAs($departmentHead)
            ->patchJson("/api/v1/leave-requests/{$leave->id}/status", ['status' => 'Approved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'Pending Review')
            ->assertJsonPath('data.approvalStage', 'BUSINESS_HEAD');

        $this->actingAs($businessHead)
            ->patchJson("/api/v1/leave-requests/{$leave->id}/status", ['status' => 'Approved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'Pending Review')
            ->assertJsonPath('data.approvalStage', 'HR');

        $this->actingAs($hr)
            ->patchJson("/api/v1/leave-requests/{$leave->id}/status", ['status' => 'Approved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'Approved')
            ->assertJsonPath('data.approvalStage', 'COMPLETE');
    }

    public function test_employee_can_record_multiple_closed_attendance_sessions_per_day(): void
    {
        $entity = Entity::create(['name' => 'Citadel', 'short_code' => 'CIT']);
        $department = Department::create(['entity_id' => $entity->id, 'name' => 'People', 'code' => 'PPL']);
        $employee = Employee::create([
            'staff_id' => 'STAFF-4',
            'full_name' => 'Example Employee',
            'first_name' => 'Example',
            'last_name' => 'Employee',
            'entity_id' => $entity->id,
            'department_id' => $department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);
        $user = User::factory()->create([
            'role' => 'EMPLOYEE',
            'staff_id' => $employee->staff_id,
            'entity_id' => $entity->id,
            'department_id' => $department->id,
        ]);
        $payload = [
            'employeeId' => $employee->id,
            'employeeName' => $employee->full_name,
            'staffId' => $employee->staff_id,
            'entity' => $entity->name,
            'department' => $department->name,
        ];

        $first = $this->actingAs($user)->postJson('/api/v1/attendance/clock-in', $payload)
            ->assertCreated()->json('data.id');
        $this->postJson('/api/v1/attendance/clock-in', $payload)->assertConflict();
        $this->postJson("/api/v1/attendance/{$first}/clock-out")->assertOk();
        $this->postJson("/api/v1/attendance/{$first}/clock-out")->assertConflict();
        $this->postJson('/api/v1/attendance/clock-in', $payload)->assertCreated();
    }

    public function test_terminated_employee_accounts_are_disabled_and_tokens_revoked(): void
    {
        $entity = Entity::create(['name' => 'Citadel', 'short_code' => 'CIT']);
        $department = Department::create(['entity_id' => $entity->id, 'name' => 'People', 'code' => 'PPL']);
        $employee = Employee::create([
            'staff_id' => 'STAFF-5',
            'full_name' => 'Example Employee',
            'first_name' => 'Example',
            'last_name' => 'Employee',
            'entity_id' => $entity->id,
            'department_id' => $department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);
        $account = User::factory()->create([
            'role' => 'EMPLOYEE',
            'staff_id' => $employee->staff_id,
            'entity_id' => $entity->id,
            'department_id' => $department->id,
        ]);
        $account->createToken('test-session');
        $hr = User::factory()->create(['role' => 'PCCM_SUPER_ADMIN']);

        $this->actingAs($hr)
            ->patchJson("/api/v1/employees/{$employee->id}", ['status' => 'Terminated'])
            ->assertOk();

        $this->assertFalse($account->fresh()->is_active);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_user_can_view_leave_categories_and_balances(): void
    {
        $category = LeaveCategory::create([
            'name' => 'Annual Leave',
            'code' => 'ANNUAL',
            'is_paid' => true,
            'is_active' => true,
        ]);

        $category->policies()->create([
            'name' => 'Standard Annual 2026',
            'days_allowed' => 25,
            'effective_year' => 2026,
            'is_active' => true,
        ]);

        $user = User::factory()->create(['role' => 'EMPLOYEE']);

        $this->actingAs($user)
            ->getJson('/api/v1/leave/categories')
            ->assertOk()
            ->assertJsonPath('data.0.code', 'ANNUAL');
    }
}
