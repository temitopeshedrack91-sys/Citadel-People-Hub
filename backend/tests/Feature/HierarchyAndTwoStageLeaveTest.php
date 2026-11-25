<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeLeaveBalance;
use App\Models\Entity;
use App\Models\LeaveCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HierarchyAndTwoStageLeaveTest extends TestCase
{
    use RefreshDatabase;

    private Entity $entityA;

    private Entity $entityB;

    private Department $deptEng;

    private Department $deptHr;

    private Department $deptOpsB;

    private Employee $directorEmp;

    private Employee $managerEmp;

    private Employee $leadEmp;

    private Employee $icEmp;

    private Employee $otherTeamEmp;

    private Employee $hrEmp;

    private User $hrUser;

    private User $managerUser;

    private User $leadUser;

    private User $icUser;

    private User $otherTeamUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->entityA = Entity::create(['id' => 'CGCC', 'name' => 'Citadel Church', 'short_code' => 'CGCC', 'is_active' => true]);
        $this->entityB = Entity::create(['id' => 'CSOG', 'name' => 'Citadel School', 'short_code' => 'CSOG', 'is_active' => true]);

        $this->deptEng = Department::create(['entity_id' => $this->entityA->id, 'name' => 'ICT', 'code' => 'CGCC-ICT', 'is_active' => true]);
        $this->deptHr = Department::create(['entity_id' => $this->entityA->id, 'name' => 'People & Culture', 'code' => 'CGCC-PCCM', 'is_active' => true]);
        $this->deptOpsB = Department::create(['entity_id' => $this->entityB->id, 'name' => 'CSOG Operations', 'code' => 'CSOG-OPS', 'is_active' => true]);

        $this->directorEmp = Employee::create([
            'staff_id' => 'DIR-001', 'first_name' => 'Director', 'last_name' => 'One', 'full_name' => 'Director One',
            'entity_id' => $this->entityA->id, 'department_id' => $this->deptEng->id, 'job_title' => 'Director', 'status' => 'Active',
        ]);

        $this->managerEmp = Employee::create([
            'staff_id' => 'MGR-001', 'first_name' => 'Femi', 'last_name' => 'Olatunji', 'full_name' => 'Engr. Femi Olatunji',
            'entity_id' => $this->entityA->id, 'department_id' => $this->deptEng->id, 'job_title' => 'Head of ICT',
            'manager_id' => (string) $this->directorEmp->id, 'manager_name' => $this->directorEmp->full_name, 'status' => 'Active',
        ]);

        $this->leadEmp = Employee::create([
            'staff_id' => 'LEAD-001', 'first_name' => 'Nadia', 'last_name' => 'Safitri', 'full_name' => 'Nadia Safitri',
            'entity_id' => $this->entityA->id, 'department_id' => $this->deptEng->id, 'job_title' => 'Design Lead',
            'manager_id' => (string) $this->managerEmp->id, 'manager_name' => $this->managerEmp->full_name, 'status' => 'Active',
        ]);

        $this->icEmp = Employee::create([
            'staff_id' => 'EMP-001', 'first_name' => 'Jonathan', 'last_name' => 'Tan', 'full_name' => 'Jonathan Tan',
            'entity_id' => $this->entityA->id, 'department_id' => $this->deptEng->id, 'job_title' => 'Engineer',
            'manager_id' => (string) $this->leadEmp->id, 'manager_name' => $this->leadEmp->full_name, 'status' => 'Active',
        ]);

        $this->otherTeamEmp = Employee::create([
            'staff_id' => 'CSOG-001', 'first_name' => 'Adaobi', 'last_name' => 'Nwosu', 'full_name' => 'Adaobi Nwosu',
            'entity_id' => $this->entityB->id, 'department_id' => $this->deptOpsB->id, 'job_title' => 'Coordinator', 'status' => 'Active',
        ]);

        $this->hrEmp = Employee::create([
            'staff_id' => 'HR-001', 'first_name' => 'Sussan', 'last_name' => 'Afuwape', 'full_name' => 'Sussan Afuwape',
            'entity_id' => $this->entityA->id, 'department_id' => $this->deptHr->id, 'job_title' => 'HR Manager', 'status' => 'Active',
        ]);

        $this->hrUser = User::factory()->create([
            'name' => $this->hrEmp->full_name, 'role' => 'HR_STAFF', 'staff_id' => $this->hrEmp->staff_id,
            'entity_id' => $this->entityA->id, 'department_id' => $this->deptHr->id,
        ]);

        $this->managerUser = User::factory()->create([
            'name' => $this->managerEmp->full_name, 'role' => 'MANAGER', 'staff_id' => $this->managerEmp->staff_id,
            'entity_id' => $this->entityA->id, 'department_id' => $this->deptEng->id,
        ]);

        // Nadia has EMPLOYEE role, yet acts as Manager in Phase 2 because Jonathan reports to her in Phase 1
        $this->leadUser = User::factory()->create([
            'name' => $this->leadEmp->full_name, 'role' => 'EMPLOYEE', 'staff_id' => $this->leadEmp->staff_id,
            'entity_id' => $this->entityA->id, 'department_id' => $this->deptEng->id,
        ]);

        $this->icUser = User::factory()->create([
            'name' => $this->icEmp->full_name, 'role' => 'EMPLOYEE', 'staff_id' => $this->icEmp->staff_id,
            'entity_id' => $this->entityA->id, 'department_id' => $this->deptEng->id,
        ]);

        $this->otherTeamUser = User::factory()->create([
            'name' => $this->otherTeamEmp->full_name, 'role' => 'EMPLOYEE', 'staff_id' => $this->otherTeamEmp->staff_id,
            'entity_id' => $this->entityB->id, 'department_id' => $this->deptOpsB->id,
        ]);

        $annual = LeaveCategory::create(['name' => 'Annual Leave', 'code' => 'AL', 'is_paid' => true, 'is_active' => true]);
        foreach ([$this->icEmp, $this->leadEmp, $this->otherTeamEmp] as $emp) {
            EmployeeLeaveBalance::create([
                'employee_id' => $emp->id,
                'leave_category_id' => $annual->id,
                'year' => 2026,
                'total_days' => 20,
                'used_days' => 0,
                'pending_days' => 0,
                'remaining_days' => 20,
            ]);
        }
    }

    public function test_blocks_self_and_circular_reporting_hierarchy_lines(): void
    {
        // Self-reporting: director -> director
        $this->actingAs($this->hrUser)
            ->patchJson("/api/v1/employees/{$this->directorEmp->id}", ['managerId' => $this->directorEmp->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['managerId']);

        // Multi-hop cycle: director -> ic (when chain is director -> manager -> lead -> ic)
        $this->actingAs($this->hrUser)
            ->patchJson("/api/v1/employees/{$this->directorEmp->id}", ['managerId' => $this->icEmp->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['managerId']);

        // Direct 2-node cycle: manager -> lead (when lead -> manager)
        $this->actingAs($this->hrUser)
            ->patchJson("/api/v1/employees/{$this->managerEmp->id}", ['managerId' => $this->leadEmp->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['managerId']);
    }

    public function test_exposes_upward_supervisor_chain_and_downward_direct_reports(): void
    {
        // Upward chain from Jonathan (icEmp) -> Nadia -> Femi -> Director One
        $res = $this->actingAs($this->icUser)
            ->getJson("/api/v1/employees/{$this->icEmp->id}/hierarchy")
            ->assertOk();

        $chainNames = collect($res->json('data.supervisorChain'))->pluck('fullName')->all();
        $this->assertSame(['Nadia Safitri', 'Engr. Femi Olatunji', 'Director One'], $chainNames);
        $this->assertCount(0, $res->json('data.directReports'));

        // Downward direct reports for Femi (managerEmp) -> Nadia Safitri
        $mgrRes = $this->actingAs($this->managerUser)
            ->getJson("/api/v1/employees/{$this->managerEmp->id}/hierarchy")
            ->assertOk();

        $reportNames = collect($mgrRes->json('data.directReports'))->pluck('fullName')->all();
        $this->assertSame(['Nadia Safitri'], $reportNames);
        $this->assertSame(['Director One'], collect($mgrRes->json('data.supervisorChain'))->pluck('fullName')->all());
    }

    public function test_rejects_mismatched_entity_and_department_combinations(): void
    {
        $this->actingAs($this->hrUser)
            ->postJson('/api/v1/employees', [
                'staffId' => 'MISMATCH-001',
                'fullName' => 'Mismatch User',
                'firstName' => 'Mismatch',
                'lastName' => 'User',
                'entityId' => $this->entityA->id,
                'departmentId' => $this->deptOpsB->id, // belongs to CSOG, not CGCC
                'jobTitle' => 'Analyst',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['departmentId']);

        // Updating department without switching entity is also rejected
        $this->actingAs($this->hrUser)
            ->patchJson("/api/v1/employees/{$this->icEmp->id}", [
                'departmentId' => $this->deptOpsB->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['departmentId']);
    }

    public function test_two_stage_approval_and_rejection_at_manager_and_hr_stages(): void
    {
        // 1. Validation checks: totalDays exceeding date range & insufficient balance
        $this->actingAs($this->icUser)
            ->postJson('/api/v1/leave-requests', [
                'employeeId' => $this->icEmp->id,
                'employeeStaffId' => $this->icEmp->staff_id,
                'leaveType' => 'Annual Leave',
                'startDate' => '2026-12-01',
                'endDate' => '2026-12-02',
                'totalDays' => 5, // exceeds 2 calendar days
                'reason' => 'Invalid days count',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['totalDays']);

        // 2. Submit valid leave request -> routed to Phase 1 direct supervisor (Nadia)
        $created = $this->actingAs($this->icUser)
            ->postJson('/api/v1/leave-requests', [
                'employeeId' => $this->icEmp->id,
                'employeeStaffId' => $this->icEmp->staff_id,
                'leaveType' => 'Annual Leave',
                'startDate' => '2026-12-01',
                'endDate' => '2026-12-05',
                'totalDays' => 5,
                'reason' => 'Family travel',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'Submitted')
            ->assertJsonPath('data.approvalStage', 'MANAGER')
            ->assertJsonPath('data.managerName', 'Nadia Safitri');

        $leaveId = $created->json('data.id');

        // HR cannot skip Stage 1 Manager approval
        $this->actingAs($this->hrUser)
            ->patchJson("/api/v1/leave-requests/{$leaveId}/status", ['status' => 'Approved'])
            ->assertForbidden();

        // Skip-level manager (Femi, who is Nadia's manager, not Jonathan's direct supervisor) cannot approve Stage 1
        $this->actingAs($this->managerUser)
            ->patchJson("/api/v1/leave-requests/{$leaveId}/status", ['status' => 'Approved'])
            ->assertForbidden();

        // Direct supervisor (Nadia) rejects at Stage 1 -> stops at MANAGER and releases balance
        $rejectedByManager = $this->actingAs($this->leadUser)
            ->patchJson("/api/v1/leave-requests/{$leaveId}/status", [
                'status' => 'Rejected',
                'comments' => 'Sprint deadline conflict.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Rejected')
            ->assertJsonPath('data.approvalStage', 'MANAGER')
            ->assertJsonPath('data.stoppedAtStage', 'MANAGER')
            ->assertJsonPath('data.managerActorName', 'Nadia Safitri');

        $this->assertNotNull($rejectedByManager->json('data.managerActedAt'));

        // Balance must be restored to 20
        $balance = EmployeeLeaveBalance::where('employee_id', $this->icEmp->id)->firstOrFail();
        $this->assertEquals(20.0, (float) $balance->remaining_days);
        $this->assertEquals(0.0, (float) $balance->pending_days);

        // Cannot transition a closed rejected request
        $this->actingAs($this->hrUser)
            ->patchJson("/api/v1/leave-requests/{$leaveId}/status", ['status' => 'Approved'])
            ->assertStatus(409);

        // 3. Resubmit new request -> Manager approves -> HR rejects at Stage 2
        $secondId = $this->actingAs($this->icUser)
            ->postJson('/api/v1/leave-requests', [
                'employeeId' => $this->icEmp->id,
                'employeeStaffId' => $this->icEmp->staff_id,
                'leaveType' => 'Annual Leave',
                'startDate' => '2026-12-10',
                'endDate' => '2026-12-12',
                'totalDays' => 3,
                'reason' => 'Rescheduled leave',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($this->leadUser)
            ->patchJson("/api/v1/leave-requests/{$secondId}/status", [
                'status' => 'Approved',
                'comments' => 'Approved by direct supervisor.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Pending Review')
            ->assertJsonPath('data.approvalStage', 'HR');

        // Direct supervisor cannot act at HR stage
        $this->actingAs($this->leadUser)
            ->patchJson("/api/v1/leave-requests/{$secondId}/status", ['status' => 'Approved'])
            ->assertForbidden();

        // HR rejects at Stage 2 -> stops at HR stage with both actors recorded
        $rejectedByHr = $this->actingAs($this->hrUser)
            ->patchJson("/api/v1/leave-requests/{$secondId}/status", [
                'status' => 'Rejected',
                'comments' => 'Year-end freeze policy.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Rejected')
            ->assertJsonPath('data.approvalStage', 'HR')
            ->assertJsonPath('data.stoppedAtStage', 'HR')
            ->assertJsonPath('data.managerActorName', 'Nadia Safitri')
            ->assertJsonPath('data.hrActorName', 'Sussan Afuwape');

        $this->assertNotNull($rejectedByHr->json('data.hrActedAt'));
        $this->assertCount(3, $rejectedByHr->json('data.approvalHistory'));

        $balance->refresh();
        $this->assertEquals(20.0, (float) $balance->remaining_days);
        $this->assertEquals(0.0, (float) $balance->pending_days);
    }

    public function test_role_scoped_endpoints_prevent_employees_and_managers_from_pulling_hr_data(): void
    {
        // Create leaves for Jonathan (under Nadia/Femi) and Adaobi (under CSOG, outside ICT team)
        $this->actingAs($this->icUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->icEmp->id,
            'employeeStaffId' => $this->icEmp->staff_id,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-01',
            'endDate' => '2026-12-02',
            'totalDays' => 2,
            'reason' => 'IC leave',
        ])->assertCreated();

        $this->actingAs($this->otherTeamUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->otherTeamEmp->id,
            'employeeStaffId' => $this->otherTeamEmp->staff_id,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-03',
            'endDate' => '2026-12-04',
            'totalDays' => 2,
            'reason' => 'Other team leave',
        ])->assertCreated();

        // 1. Regular IC Employee scope: sees ONLY own leave & balances; blocked from reports & team calendar
        $this->actingAs($this->icUser)->getJson('/api/v1/leave-requests')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($this->icUser)->getJson('/api/v1/leave/balances')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($this->icUser)->getJson("/api/v1/employees/{$this->otherTeamEmp->id}/leave-requests")->assertForbidden();
        $this->actingAs($this->icUser)->getJson('/api/v1/leave/team-calendar')->assertForbidden();
        $this->actingAs($this->icUser)->getJson('/api/v1/reports/workforce')->assertForbidden();
        $this->actingAs($this->icUser)->getJson('/api/v1/reports/leave-utilization')->assertForbidden();

        // 2. Manager scope (Femi - MANAGER role): sees team requests & team calendar, NOT CSOG or HR reports
        $mgrLeaves = $this->actingAs($this->managerUser)->getJson('/api/v1/leave-requests')->assertOk();
        $this->assertCount(1, $mgrLeaves->json('data'));
        $this->assertSame('Jonathan Tan', $mgrLeaves->json('data.0.employeeName'));

        $this->actingAs($this->managerUser)->getJson('/api/v1/leave/team-calendar')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($this->managerUser)->getJson("/api/v1/employees/{$this->otherTeamEmp->id}/leave-requests")->assertForbidden();
        $this->actingAs($this->managerUser)->getJson("/api/v1/employees/{$this->otherTeamEmp->id}/leave-balances")->assertForbidden();
        $this->actingAs($this->managerUser)->getJson('/api/v1/reports/workforce')->assertForbidden();
        $this->actingAs($this->managerUser)->getJson('/api/v1/reports/leave-utilization')->assertForbidden();
        $this->actingAs($this->managerUser)->getJson('/api/v1/reports/attendance-summary')->assertForbidden();
        $this->actingAs($this->managerUser)->getJson('/api/v1/reports/recruitment-summary')->assertForbidden();

        // Manager cannot create or modify HR employee master records
        $this->actingAs($this->managerUser)->postJson('/api/v1/employees', [
            'staffId' => 'UNAUTH-1', 'fullName' => 'X', 'firstName' => 'X', 'lastName' => 'Y',
            'entityId' => $this->entityA->id, 'departmentId' => $this->deptEng->id, 'jobTitle' => 'Dev',
        ])->assertForbidden();

        // Manager does NOT see Adaobi in directory and gets masked sensitive fields
        $mgrDir = $this->actingAs($this->managerUser)->getJson('/api/v1/employees')->assertOk();
        $this->assertNotContains('Adaobi Nwosu', collect($mgrDir->json('data'))->pluck('fullName')->all());
        $this->assertSame('', $mgrDir->json('data.0.bankPayroll.accountNumber'));

        // 3. Supervisor with EMPLOYEE role (Nadia): inherits Manager calendar & team leave scope from Phase 1 hierarchy
        $this->actingAs($this->leadUser)->getJson('/api/v1/leave/team-calendar')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($this->leadUser)->getJson('/api/v1/reports/workforce')->assertForbidden();

        // 4. HR scope: sees ALL employees, ALL leave requests across teams/stages, and ALL reporting endpoints
        $this->actingAs($this->hrUser)->getJson('/api/v1/employees')->assertOk()->assertJsonCount(6, 'data');
        $this->actingAs($this->hrUser)->getJson('/api/v1/leave-requests')->assertOk()->assertJsonCount(2, 'data');
        $this->actingAs($this->hrUser)->getJson('/api/v1/leave/team-calendar')->assertOk()->assertJsonCount(2, 'data');
        $this->actingAs($this->hrUser)->getJson('/api/v1/reports/workforce')->assertOk()->assertJsonPath('data.totalEmployees', 6);
        $this->actingAs($this->hrUser)->getJson('/api/v1/reports/leave-utilization')->assertOk();

        // 5. Role-scoped dashboard summary enforces same boundary on server
        $this->actingAs($this->icUser)->getJson('/api/v1/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('data.effectiveRole', 'EMPLOYEE')
            ->assertJsonMissingPath('data.team')
            ->assertJsonMissingPath('data.hrOverview');

        $this->actingAs($this->managerUser)->getJson('/api/v1/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('data.effectiveRole', 'MANAGER')
            ->assertJsonMissingPath('data.hrOverview');

        $this->actingAs($this->hrUser)->getJson('/api/v1/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('data.effectiveRole', 'HR')
            ->assertJsonPath('data.hrOverview.totalEmployees', 6);

        // Manager cannot call HR-only payroll, audit, entitlement, or cross-team attendance endpoints
        $this->actingAs($this->managerUser)->getJson('/api/v1/payroll/templates')->assertForbidden();
        $this->actingAs($this->managerUser)->getJson('/api/v1/audit-logs')->assertForbidden();
        $this->actingAs($this->managerUser)->postJson('/api/v1/leave/entitlements', [])->assertForbidden();
        $this->actingAs($this->otherTeamUser)->postJson('/api/v1/attendance/clock-in', [
            'employeeId' => $this->otherTeamEmp->id,
            'employeeName' => $this->otherTeamEmp->full_name,
            'staffId' => $this->otherTeamEmp->staff_id,
            'entity' => $this->entityB->name,
            'department' => $this->deptOpsB->name,
        ])->assertCreated();
        $mgrAttendance = $this->actingAs($this->managerUser)->getJson('/api/v1/attendance')->assertOk();
        $this->assertCount(0, $mgrAttendance->json('data'));

        // Consistent JSON error formats for 404 and 422
        $this->actingAs($this->hrUser)->getJson('/api/v1/employees/999999')
            ->assertNotFound()
            ->assertJsonPath('error', 'Not Found');
    }

    public function test_reassigning_or_clearing_supervisor_in_phase_1_updates_phase_2_leave_routing(): void
    {
        $leaveId = $this->actingAs($this->icUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->icEmp->id,
            'employeeStaffId' => $this->icEmp->staff_id,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-20',
            'endDate' => '2026-12-21',
            'totalDays' => 2,
            'reason' => 'Reassignment check',
        ])->assertCreated()->json('data.id');

        // Reassign Jonathan from Nadia to Engr. Femi
        $this->actingAs($this->hrUser)->patchJson("/api/v1/employees/{$this->icEmp->id}", [
            'managerId' => $this->managerEmp->id,
        ])->assertOk()->assertJsonPath('data.managerId', (string) $this->managerEmp->id);

        // Previous supervisor Nadia can no longer approve Stage 1; new supervisor Femi can
        $this->actingAs($this->leadUser)
            ->patchJson("/api/v1/leave-requests/{$leaveId}/status", ['status' => 'Approved'])
            ->assertForbidden();

        $this->actingAs($this->managerUser)
            ->patchJson("/api/v1/leave-requests/{$leaveId}/status", ['status' => 'Approved'])
            ->assertOk()
            ->assertJsonPath('data.approvalStage', 'HR')
            ->assertJsonPath('data.managerActorName', 'Engr. Femi Olatunji');

        // Clearing supervisor (null) routes future requests directly to HR
        $this->actingAs($this->hrUser)->patchJson("/api/v1/employees/{$this->icEmp->id}", [
            'managerId' => null,
        ])->assertOk()->assertJsonPath('data.managerId', null);

        $directHrRes = $this->actingAs($this->icUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->icEmp->id,
            'employeeStaffId' => $this->icEmp->staff_id,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-24',
            'endDate' => '2026-12-25',
            'totalDays' => 2,
            'reason' => 'Direct to HR check',
        ])->assertCreated();

        $directHrRes->assertJsonPath('data.approvalStage', 'HR')
            ->assertJsonPath('data.status', 'Pending Review');
    }

    public function test_realtime_events_and_sse_stream_emit_mutations(): void
    {
        $initialLatest = $this->actingAs($this->hrUser)
            ->getJson('/api/v1/realtime/events')
            ->assertOk()
            ->json('data.latestId');

        $this->actingAs($this->icUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->icEmp->id,
            'employeeStaffId' => $this->icEmp->staff_id,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-15',
            'endDate' => '2026-12-16',
            'totalDays' => 2,
            'reason' => 'Realtime check',
        ])->assertCreated();

        $eventsRes = $this->actingAs($this->managerUser)
            ->getJson("/api/v1/realtime/events?since={$initialLatest}")
            ->assertOk();

        $tables = collect($eventsRes->json('data.events'))->pluck('table')->all();
        $this->assertContains('leave_requests', $tables);
        $this->assertContains('leave_balances', $tables);

        $sse = $this->actingAs($this->managerUser)
            ->get("/api/v1/realtime/stream?since={$initialLatest}&once=1");
        $sse->assertOk();
        $this->assertStringContainsString('text/event-stream', (string) $sse->headers->get('Content-Type'));
    }
}
