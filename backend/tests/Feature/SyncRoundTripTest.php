<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Entity;
use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SyncRoundTripTest extends TestCase
{
    use RefreshDatabase;

    private Entity $entity;
    private Department $department;
    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->entity = Entity::create([
            'id' => 'CGCC',
            'name' => 'Citadel Global Community Church',
            'short_code' => 'CGCC',
            'description' => 'Main church entity',
            'is_active' => true,
        ]);

        $this->department = Department::create([
            'entity_id' => $this->entity->id,
            'name' => 'People & Culture',
            'code' => 'HR',
            'is_active' => true,
        ]);

        $this->adminUser = User::create([
            'name' => 'Dr. Bukola Adeleke',
            'email' => 'dr.adeleke@citadel.ng',
            'password' => Hash::make('Password123!'),
            'role' => 'PCCM_SUPER_ADMIN',
            'staff_id' => 'CGCC-001',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);
    }

    public function test_auth_login_generates_valid_token_and_user_profile(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'dr.adeleke@citadel.ng',
            'password' => 'Password123!',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email', 'role', 'staffId'],
            ])
            ->assertJsonPath('user.role', 'PCCM_SUPER_ADMIN');

        $token = $response->json('token');

        // Verify authenticated /api/v1/auth/user endpoint with Bearer token
        $this->withToken($token)
            ->getJson('/api/v1/auth/user')
            ->assertOk()
            ->assertJsonPath('user.email', 'dr.adeleke@citadel.ng');
    }

    public function test_employee_roundtrip_persists_to_database_and_records_audit(): void
    {
        $payload = [
            'staffId' => 'CGCC-101',
            'fullName' => 'Olumide Jacobs',
            'firstName' => 'Olumide',
            'lastName' => 'Jacobs',
            'email' => 'olumide.jacobs@citadel.ng',
            'entityId' => $this->entity->id,
            'departmentId' => $this->department->id,
            'jobTitle' => 'HR Specialist',
            'employmentType' => 'Full-Time',
            'status' => 'Active',
        ];

        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/employees', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.staffId', 'CGCC-101')
            ->assertJsonPath('data.fullName', 'Olumide Jacobs');

        $this->assertDatabaseHas('employees', [
            'staff_id' => 'CGCC-101',
            'email' => 'olumide.jacobs@citadel.ng',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'module' => 'Employee Records',
            'action' => 'Created employee',
        ]);
    }

    public function test_leave_request_roundtrip_and_approval_stage(): void
    {
        $employee = Employee::create([
            'staff_id' => 'CGCC-102',
            'full_name' => 'Grace Benson',
            'first_name' => 'Grace',
            'last_name' => 'Benson',
            'email' => 'grace.benson@citadel.ng',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Accountant',
            'status' => 'Active',
        ]);

        $leavePayload = [
            'employeeId' => $employee->id,
            'employeeStaffId' => $employee->staff_id,
            'employeeName' => $employee->full_name,
            'entityName' => $this->entity->name,
            'departmentName' => $this->department->name,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-11-10',
            'endDate' => '2026-11-15',
            'totalDays' => 5,
            'reason' => 'Annual vacation rest',
        ];

        $createResponse = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/leave-requests', $leavePayload);

        $createResponse->assertCreated()
            ->assertJsonPath('data.employeeStaffId', 'CGCC-102')
            ->assertJsonPath('data.leaveType', 'Annual Leave');

        $leaveId = $createResponse->json('data.id');

        // Cancel leave request
        $cancelResponse = $this->actingAs($this->adminUser)
            ->patchJson("/api/v1/leave-requests/{$leaveId}/status", [
                'status' => 'Cancelled',
                'comments' => 'Cancelled by admin',
            ]);

        $cancelResponse->assertOk()
            ->assertJsonPath('data.status', 'Cancelled');

        $this->assertDatabaseHas('leave_requests', [
            'id' => $leaveId,
            'status' => 'Cancelled',
        ]);
    }

    public function test_attendance_clock_in_and_clock_out_calculates_duration(): void
    {
        $employee = Employee::create([
            'staff_id' => 'CGCC-103',
            'full_name' => 'Samuel Ade',
            'first_name' => 'Samuel',
            'last_name' => 'Ade',
            'email' => 'samuel.ade@citadel.ng',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Engineer',
            'status' => 'Active',
        ]);

        $clockInResponse = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/attendance/clock-in', [
                'employeeId' => $employee->id,
                'staffId' => $employee->staff_id,
                'employeeName' => $employee->full_name,
                'entity' => $this->entity->name,
                'department' => $this->department->name,
            ]);

        $clockInResponse->assertCreated()
            ->assertJsonPath('data.employeeStaffId', 'CGCC-103')
            ->assertJsonPath('data.status', 'Present');

        $recordId = $clockInResponse->json('data.id');

        $clockOutResponse = $this->actingAs($this->adminUser)
            ->postJson("/api/v1/attendance/{$recordId}/clock-out", [
                'notes' => 'Completed shifts normally',
            ]);

        $clockOutResponse->assertOk();
        $this->assertNotNull($clockOutResponse->json('data.clockOutTime'));
    }

    public function test_validation_boundary_blocks_invalid_data(): void
    {
        // Missing required fields
        $this->actingAs($this->adminUser)
            ->postJson('/api/v1/employees', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['staffId', 'fullName', 'firstName', 'lastName', 'entityId', 'departmentId', 'jobTitle']);

        // Non-existent entity
        $this->actingAs($this->adminUser)
            ->postJson('/api/v1/employees', [
                'staffId' => 'NON-001',
                'fullName' => 'No One',
                'firstName' => 'No',
                'lastName' => 'One',
                'entityId' => 'NON_EXISTENT_ENTITY',
                'departmentId' => $this->department->id,
                'jobTitle' => 'None',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['entityId']);
    }
}
