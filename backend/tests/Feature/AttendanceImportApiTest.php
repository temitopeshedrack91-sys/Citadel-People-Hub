<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Entity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AttendanceImportApiTest extends TestCase
{
    use RefreshDatabase;

    private Entity $entity;

    private Department $department;

    private Employee $employee;

    private User $hrUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->entity = Entity::create(['id' => 'entity-cgcc', 'name' => 'Citadel', 'short_code' => 'CIT']);
        $this->department = Department::create([
            'entity_id' => $this->entity->id,
            'name' => 'People & Culture',
            'code' => 'PPL',
        ]);
        $this->employee = Employee::create([
            'staff_id' => 'CGCC/014',
            'biometric_device_id' => 'BIO-14',
            'full_name' => 'Test Employee',
            'first_name' => 'Test',
            'last_name' => 'Employee',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Officer',
            'status' => 'Active',
        ]);
        $this->hrUser = User::create([
            'name' => 'HR User',
            'email' => 'hr@example.test',
            'password' => Hash::make('long-password'),
            'role' => 'PCCM_SUPER_ADMIN',
            'is_active' => true,
        ]);
    }

    public function test_biometric_import_requires_authentication_and_an_authorized_role(): void
    {
        $this->getJson('/api/v1/attendance/biometric-punches')->assertUnauthorized();
        $this->postJson('/api/v1/attendance/biometric-imports', [])->assertUnauthorized();

        $employeeUser = User::create([
            'name' => 'Employee User',
            'email' => 'employee@example.test',
            'password' => Hash::make('long-password'),
            'role' => 'EMPLOYEE',
            'staff_id' => $this->employee->staff_id,
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);

        $this->actingAs($employeeUser)
            ->getJson('/api/v1/attendance/biometric-punches')
            ->assertForbidden();
        $this->actingAs($employeeUser)
            ->postJson('/api/v1/attendance/biometric-imports', ['fileName' => 'export.csv', 'punches' => []])
            ->assertForbidden();
    }

    public function test_import_persists_raw_punches_with_server_side_matching_and_idempotency(): void
    {
        $payload = [
            'fileName' => 'device-export.csv',
            'punches' => [
                ['deviceId' => 'BIO-14', 'timestamp' => '2026-10-29T08:01:02', 'direction' => 'in', 'rawDirection' => 'Check In', 'sourceLine' => 2],
                ['deviceId' => '9999', 'timestamp' => '2026-10-29T08:04:10', 'direction' => 'unknown', 'sourceLine' => 3],
            ],
        ];

        $this->actingAs($this->hrUser)
            ->postJson('/api/v1/attendance/biometric-imports', $payload)
            ->assertCreated()
            ->assertJsonPath('data.totalRecords', 2)
            ->assertJsonPath('data.matchedRecords', 1)
            ->assertJsonPath('data.unmatchedRecords', 1)
            ->assertJsonPath('data.duplicateRecords', 0)
            ->assertJsonPath('data.storedPunchCount', 2);

        $this->assertDatabaseHas('biometric_attendance_punches', [
            'employee_id' => $this->employee->id,
            'employee_staff_id' => $this->employee->staff_id,
            'device_id' => 'BIO-14',
            'local_timestamp' => '2026-10-29T08:01:02',
            'punch_date' => '2026-10-29',
            'punch_time' => '08:01:02',
        ]);
        $this->assertDatabaseHas('biometric_attendance_punches', [
            'employee_id' => null,
            'device_id' => '9999',
        ]);

        $this->actingAs($this->hrUser)
            ->postJson('/api/v1/attendance/biometric-imports', $payload)
            ->assertCreated()
            ->assertJsonPath('data.duplicateRecords', 2)
            ->assertJsonPath('data.insertedInBatch', 0)
            ->assertJsonPath('data.storedPunchCount', 2);
    }

    public function test_import_rejects_unrecognized_timestamps_without_persisting_records(): void
    {
        $this->actingAs($this->hrUser)
            ->postJson('/api/v1/attendance/biometric-imports', [
                'fileName' => 'broken.csv',
                'punches' => [['deviceId' => '0014', 'timestamp' => '29/10/2026 08:01', 'direction' => 'in']],
            ])
            ->assertUnprocessable();

        $this->assertDatabaseCount('biometric_attendance_punches', 0);
    }

    public function test_attendance_reads_follow_canonical_employee_department_and_admin_scopes(): void
    {
        $colleague = Employee::create([
            'staff_id' => 'CGCC/015', 'full_name' => 'Department Colleague', 'first_name' => 'Department',
            'last_name' => 'Colleague', 'entity_id' => $this->entity->id, 'department_id' => $this->department->id,
            'job_title' => 'Officer', 'status' => 'Active',
        ]);
        $otherEntity = Entity::create(['id' => 'entity-other', 'name' => 'Other Entity', 'short_code' => 'OTH']);
        $otherDepartment = Department::create(['entity_id' => $otherEntity->id, 'name' => 'Other Department', 'code' => 'OTH']);
        $otherEmployee = Employee::create([
            'staff_id' => 'OTH/001', 'full_name' => 'Other Employee', 'first_name' => 'Other',
            'last_name' => 'Employee', 'entity_id' => $otherEntity->id, 'department_id' => $otherDepartment->id,
            'job_title' => 'Officer', 'status' => 'Active',
        ]);

        foreach ([$this->employee, $colleague, $otherEmployee] as $index => $employee) {
            AttendanceRecord::create([
                'employee_id' => $employee->id,
                'employee_staff_id' => $employee->staff_id,
                'employee_name' => $employee->full_name,
                'entity_name' => $employee->entity_id,
                'department_name' => (string) $employee->department_id,
                'date' => today(),
                'clock_in_time' => now()->subHours(3 - $index),
                'status' => 'Present',
                'verification_source' => 'Biometric_ZKTeco',
            ]);
        }

        $employeeUser = User::create([
            'name' => 'Employee User', 'email' => 'own-department@example.test', 'password' => Hash::make('long-password'),
            'role' => 'EMPLOYEE', 'staff_id' => $this->employee->staff_id, 'entity_id' => $this->entity->id,
            'department_id' => $this->department->id, 'is_active' => true,
        ]);
        $admin = User::create([
            'name' => 'System Admin', 'email' => 'admin@example.test', 'password' => Hash::make('long-password'),
            'role' => 'SYSTEM_ADMIN', 'is_active' => true,
        ]);
        $viewer = User::create([
            'name' => 'Viewer', 'email' => 'viewer@example.test', 'password' => Hash::make('long-password'),
            'role' => 'VIEWER', 'is_active' => true,
        ]);

        $this->actingAs($employeeUser)->getJson('/api/v1/attendance')->assertOk()->assertJsonCount(2, 'data');
        $this->actingAs($admin)->getJson('/api/v1/attendance')->assertOk()->assertJsonCount(3, 'data');
        $this->actingAs($viewer)->getJson('/api/v1/attendance')->assertForbidden();
    }
}
