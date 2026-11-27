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
            ->assertJsonPath('data.hrOverview.totalEmployees', 6)
            ->assertJsonStructure([
                'data' => [
                    'hrOverview' => [
                        'totalEmployees',
                        'activeEmployees',
                        'recentHiresCount',
                        'entityBreakdown',
                        'onLeaveToday',
                        'activeTasks',
                        'attendanceToday',
                        'attendanceTrend',
                        'upcomingMilestones',
                    ],
                ],
            ]);

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
        $content = $sse->streamedContent();
        $this->assertStringContainsString("id: {$initialLatest}\nevent: connected", $content);
        $this->assertStringContainsString('event: ping', $content);

        $latestId = (int) $eventsRes->json('data.latestId');
        $resumed = $this->actingAs($this->managerUser)
            ->withHeader('Last-Event-ID', (string) $latestId)
            ->get('/api/v1/realtime/stream?once=1');
        $resumed->assertOk();
        $resumedContent = $resumed->streamedContent();
        $this->assertStringContainsString("id: {$latestId}\nevent: connected", $resumedContent);
        $this->assertStringNotContainsString('event: change', $resumedContent);
    }

    public function test_clearing_supervisor_escalates_open_stage_one_leave_to_hr(): void
    {
        $leaveId = $this->actingAs($this->icUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->icEmp->id,
            'employeeStaffId' => $this->icEmp->staff_id,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-26',
            'endDate' => '2026-12-27',
            'totalDays' => 2,
            'reason' => 'Escalation on manager clear',
        ])->assertCreated()
            ->assertJsonPath('data.approvalStage', 'MANAGER')
            ->assertJsonPath('data.status', 'Submitted')
            ->json('data.id');

        // HR clears Jonathan's direct supervisor while Stage 1 request is open
        $this->actingAs($this->hrUser)->patchJson("/api/v1/employees/{$this->icEmp->id}", [
            'managerId' => null,
        ])->assertOk()->assertJsonPath('data.managerId', null);

        // Open Stage 1 request must now be escalated to HR and approvable by HR
        $approved = $this->actingAs($this->hrUser)
            ->patchJson("/api/v1/leave-requests/{$leaveId}/status", [
                'status' => 'Approved',
                'comments' => 'Approved directly by HR after supervisor clearance.',
            ])
            ->assertOk()
            ->assertJsonPath('data.approvalStage', 'COMPLETE')
            ->assertJsonPath('data.status', 'Approved');

        $this->assertSame('Sussan Afuwape', $approved->json('data.hrActorName'));

        $balance = EmployeeLeaveBalance::where('employee_id', $this->icEmp->id)->firstOrFail();
        $this->assertEquals(2.0, (float) $balance->used_days);
        $this->assertEquals(0.0, (float) $balance->pending_days);
        $this->assertEquals(18.0, (float) $balance->remaining_days);
    }

    public function test_organization_repository_rejects_mismatched_entity_department_and_supports_snake_case_filters(): void
    {
        $repo = app(\App\Repositories\OrganizationRepository::class);
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        try {
            $repo->assertDepartmentBelongsToEntity($this->deptOpsB->id, $this->entityA->id);
        } finally {
            $depts = $this->actingAs($this->hrUser)
                ->getJson("/api/v1/departments?entity_id={$this->entityB->id}")
                ->assertOk();
            $this->assertSame(['CSOG Operations'], collect($depts->json('data'))->pluck('name')->all());

            $emps = $this->actingAs($this->hrUser)
                ->getJson("/api/v1/employees?entity_id={$this->entityB->id}&department_id={$this->deptOpsB->id}")
                ->assertOk();
            $this->assertSame(['Adaobi Nwosu'], collect($emps->json('data'))->pluck('fullName')->all());
        }
    }

    public function test_requires_correction_releases_pending_balance_and_dates_and_explicit_missing_employee_returns_422(): void
    {
        // Explicit nonexistent numeric employeeId must return 422 rather than silently falling back
        $this->actingAs($this->icUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => 999999,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-01',
            'endDate' => '2026-12-02',
            'totalDays' => 2,
            'reason' => 'Invalid employee id',
        ])->assertStatus(422)
            ->assertJsonPath('error', 'Validation Error')
            ->assertJsonValidationErrors(['employeeId']);

        $leaveId = $this->actingAs($this->icUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->icEmp->id,
            'employeeStaffId' => $this->icEmp->staff_id,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-01',
            'endDate' => '2026-12-03',
            'totalDays' => 3,
            'reason' => 'Needs handover details',
        ])->assertCreated()->json('data.id');

        $this->actingAs($this->leadUser)
            ->patchJson("/api/v1/leave-requests/{$leaveId}/status", [
                'status' => 'Requires Correction',
                'comments' => 'Add relieving staff name.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Requires Correction')
            ->assertJsonPath('data.stoppedAtStage', 'MANAGER');

        $balance = EmployeeLeaveBalance::where('employee_id', $this->icEmp->id)->firstOrFail();
        $this->assertEquals(0.0, (float) $balance->pending_days);
        $this->assertEquals(20.0, (float) $balance->remaining_days);

        // Employee can immediately resubmit on the exact same dates without overlap conflict
        $this->actingAs($this->icUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->icEmp->id,
            'employeeStaffId' => $this->icEmp->staff_id,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-01',
            'endDate' => '2026-12-03',
            'totalDays' => 3,
            'reason' => 'Resubmitted with relieving staff',
        ])->assertCreated();
    }

    public function test_dashboard_pending_approvals_excludes_skip_level_and_errors_follow_consistent_json(): void
    {
        $this->actingAs($this->icUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->icEmp->id,
            'employeeStaffId' => $this->icEmp->staff_id,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-08',
            'endDate' => '2026-12-09',
            'totalDays' => 2,
            'reason' => 'Direct report pending check',
        ])->assertCreated();

        // Direct supervisor Nadia sees Jonathan's request in pendingApprovals
        $this->actingAs($this->leadUser)->getJson('/api/v1/dashboard/summary')
            ->assertOk()
            ->assertJsonCount(1, 'data.team.pendingApprovals');

        // Skip-level manager Femi does NOT see Jonathan's request in pendingApprovals
        $this->actingAs($this->managerUser)->getJson('/api/v1/dashboard/summary')
            ->assertOk()
            ->assertJsonCount(0, 'data.team.pendingApprovals');

        // 401 consistent JSON
        $this->getJson('/api/v1/employees')
            ->assertUnauthorized()
            ->assertJsonPath('error', 'Unauthorized');

        // 403 consistent JSON (not 'Http Error') on HR-only endpoints including recruitment candidates
        $this->actingAs($this->managerUser)->getJson('/api/v1/recruitment/candidates')
            ->assertForbidden()
            ->assertJsonPath('error', 'Forbidden');

        $this->actingAs($this->icUser)->getJson('/api/v1/recruitment/candidates')
            ->assertForbidden()
            ->assertJsonPath('error', 'Forbidden');

        $this->actingAs($this->managerUser)->getJson('/api/v1/payroll/templates')
            ->assertForbidden()
            ->assertJsonPath('error', 'Forbidden');

        // Department head cannot bypass DocumentController RBAC to upload institutional documents or view cross-dept docs
        $deptHeadUser = User::factory()->create([
            'name' => 'Dept Head ICT',
            'role' => 'DEPARTMENT_HEAD',
            'entity_id' => $this->entityA->id,
            'department_id' => $this->deptEng->id,
        ]);
        $this->actingAs($deptHeadUser)->postJson('/api/v1/documents', [])
            ->assertForbidden()
            ->assertJsonPath('error', 'Forbidden');
        $this->actingAs($deptHeadUser)->getJson("/api/v1/employees/{$this->otherTeamEmp->id}/documents")
            ->assertForbidden()
            ->assertJsonPath('error', 'Forbidden');
    }

    public function test_navigation_read_bursts_do_not_throttle_reads_leave_approvals_or_payroll(): void
    {
        for ($i = 0; $i < 70; $i++) {
            $this->actingAs($this->hrUser)->getJson('/api/v1/employees')->assertOk();
            $this->actingAs($this->hrUser)->getJson('/api/v1/tasks')->assertOk();
        }

        $leaveRes = $this->actingAs($this->icUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->icEmp->id,
            'employeeStaffId' => $this->icEmp->staff_id,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-28',
            'endDate' => '2026-12-29',
            'totalDays' => 2,
            'reason' => 'Burst resilience check',
        ])->assertCreated();

        $leaveId = $leaveRes->json('data.id');

        $this->actingAs($this->leadUser)
            ->patchJson("/api/v1/leave-requests/{$leaveId}/status", ['status' => 'Approved'])
            ->assertOk()
            ->assertJsonPath('data.approvalStage', 'HR');

        $this->actingAs($this->hrUser)
            ->patchJson("/api/v1/leave-requests/{$leaveId}/status", ['status' => 'Approved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'Approved');

        $payrollRes = $this->actingAs($this->hrUser)->postJson('/api/v1/payroll/runs', [
            'title' => 'Burst Verification Run',
            'period_start' => '2026-11-01',
            'period_end' => '2026-11-30',
            'pay_date' => '2026-11-28',
        ]);
        $this->assertNotEquals(429, $payrollRes->getStatusCode());
    }

    public function test_exam_and_compassionate_leave_route_directly_to_hr_per_workbook_sheet_7(): void
    {
        $examCat = LeaveCategory::create(['name' => 'Exam Leave', 'code' => 'EL', 'is_paid' => true, 'is_active' => true]);
        EmployeeLeaveBalance::create([
            'employee_id' => $this->icEmp->id,
            'leave_category_id' => $examCat->id,
            'year' => 2026,
            'total_days' => 21,
            'used_days' => 0,
            'pending_days' => 0,
            'remaining_days' => 21,
        ]);

        // Even though Jonathan has a direct supervisor (Nadia), Exam Leave must bypass Stage 1 and route straight to HR
        $examRes = $this->actingAs($this->icUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->icEmp->id,
            'employeeStaffId' => $this->icEmp->staff_id,
            'leaveType' => 'Exam Leave',
            'startDate' => '2026-12-14',
            'endDate' => '2026-12-16',
            'totalDays' => 3,
            'reason' => 'ICAN Professional Examination',
        ])->assertCreated()
            ->assertJsonPath('data.approvalStage', 'HR')
            ->assertJsonPath('data.status', 'Pending Review');

        // Direct supervisor cannot approve a Direct-HR Exam Leave request
        $this->actingAs($this->leadUser)
            ->patchJson('/api/v1/leave-requests/'.$examRes->json('data.id').'/status', ['status' => 'Approved'])
            ->assertForbidden();

        // HR approves directly to COMPLETE
        $this->actingAs($this->hrUser)
            ->patchJson('/api/v1/leave-requests/'.$examRes->json('data.id').'/status', ['status' => 'Approved'])
            ->assertOk()
            ->assertJsonPath('data.approvalStage', 'COMPLETE')
            ->assertJsonPath('data.status', 'Approved');
    }

    public function test_profile_change_requests_enforce_sheet_5_hr_approval_and_field_restrictions(): void
    {
        // Employee cannot request a change to an HR-only field (salary/jobTitle)
        $this->actingAs($this->icUser)->postJson('/api/v1/governance/profile-change-requests', [
            'employeeId' => $this->icEmp->id,
            'changes' => [
                ['fieldKey' => 'jobTitle', 'fieldLabel' => 'Job Title', 'oldValue' => 'Engineer', 'newValue' => 'CTO'],
            ],
            'reason' => 'Unauthorized self-promotion attempt',
        ])->assertForbidden();

        // Employee submits an allowed phone update -> staged as PENDING_HR_APPROVAL
        $created = $this->actingAs($this->icUser)->postJson('/api/v1/governance/profile-change-requests', [
            'employeeId' => $this->icEmp->id,
            'changes' => [
                ['fieldKey' => 'phone', 'fieldLabel' => 'Phone Number', 'oldValue' => '', 'newValue' => '+234 803 555 0199'],
            ],
            'reason' => 'Updated mobile number',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'PENDING_HR_APPROVAL');

        $reqId = $created->json('data.id');

        // Non-HR manager cannot approve profile change requests
        $this->actingAs($this->managerUser)
            ->patchJson("/api/v1/governance/profile-change-requests/{$reqId}/review", ['decision' => 'APPROVED'])
            ->assertForbidden();

        // HR approves -> applies phone change to employee record
        $this->actingAs($this->hrUser)
            ->patchJson("/api/v1/governance/profile-change-requests/{$reqId}/review", [
                'decision' => 'APPROVED',
                'comments' => 'Verified with employee.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'APPROVED');

        $this->icEmp->refresh();
        $this->assertSame('+234 803 555 0199', $this->icEmp->phone);
    }

    public function test_employee_self_view_returns_sensitive_master_data_while_manager_sees_masked_fields(): void
    {
        $this->icEmp->update([
            'date_of_birth' => '1994-06-15',
            'address' => '12 Allen Avenue, Ikeja, Lagos',
            'emergency_contact' => ['name' => 'Grace Tan', 'relationship' => 'Spouse', 'phone' => '+234 802 111 2222'],
            'next_of_kin' => ['name' => 'Samuel Tan', 'relationship' => 'Brother', 'phone' => '+234 802 333 4444'],
            'bank_payroll' => ['bankName' => 'GTBank', 'accountNumber' => '0123456789', 'accountName' => 'Jonathan Tan', 'salaryGrade' => 'Grade 4', 'currency' => 'NGN'],
            'pension_hmo' => ['pfaName' => 'Stanbic IBTC', 'rsaPin' => 'PEN100012345678', 'hmoProvider' => 'Hygeia', 'hmoPlan' => 'Gold'],
        ]);

        // Employee viewing own record receives sensitive master data
        $this->actingAs($this->icUser)
            ->getJson("/api/v1/employees/{$this->icEmp->id}")
            ->assertOk()
            ->assertJsonPath('data.dateOfBirth', '1994-06-15')
            ->assertJsonPath('data.address', '12 Allen Avenue, Ikeja, Lagos')
            ->assertJsonPath('data.bankPayroll.bankName', 'GTBank')
            ->assertJsonPath('data.pensionHmo.pfaName', 'Stanbic IBTC');

        // Line manager viewing subordinate receives masked payroll/personal data
        $this->actingAs($this->managerUser)
            ->getJson("/api/v1/employees/{$this->icEmp->id}")
            ->assertOk()
            ->assertJsonPath('data.bankPayroll.bankName', '')
            ->assertJsonMissingPath('data.dateOfBirth');
    }

    public function test_organization_endpoints_expose_counts_governance_metadata_and_hr_management(): void
    {
        $this->actingAs($this->hrUser)
            ->postJson('/api/v1/departments', [
                'entityId' => 'entity-cgcc',
                'name' => 'Media & Broadcast',
                'code' => 'CGCC-MED',
                'headOfDepartmentName' => 'Media Lead',
                'businessHeadName' => 'Pastor Segun Bakare',
                'headEmail' => 'media@thecitadelglobal.org',
                'reportsTo' => 'Pastor Segun Bakare',
                'isGecSharedService' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.entityId', 'CGCC')
            ->assertJsonPath('data.businessHeadName', 'Pastor Segun Bakare')
            ->assertJsonPath('data.isGecSharedService', true);

        $this->actingAs($this->hrUser)
            ->getJson('/api/v1/departments?entityId=entity-cgcc')
            ->assertOk()
            ->assertJsonFragment(['code' => 'CGCC-MED', 'reportsTo' => 'Pastor Segun Bakare']);
    }

    public function test_governance_profile_change_and_confirmation_lifecycle_persist_to_employee_schema(): void
    {
        $created = $this->actingAs($this->icUser)->postJson('/api/v1/governance/profile-change-requests', [
            'employeeId' => $this->icEmp->id,
            'changes' => [
                ['fieldKey' => 'emergencyContactName', 'fieldLabel' => 'Emergency Contact', 'oldValue' => '', 'newValue' => 'Grace Tan'],
                ['fieldKey' => 'nextOfKinName', 'fieldLabel' => 'Next of Kin', 'oldValue' => '', 'newValue' => 'Samuel Tan'],
                ['fieldKey' => 'bankName', 'fieldLabel' => 'Bank Name', 'oldValue' => '', 'newValue' => 'Access Bank'],
            ],
            'reason' => 'Annual personal bio-data update',
        ])->assertCreated();

        $this->actingAs($this->hrUser)
            ->patchJson('/api/v1/governance/profile-change-requests/'.$created->json('data.id').'/review', [
                'decision' => 'APPROVED',
                'comments' => 'Documents verified by PCCM',
            ])
            ->assertOk();

        $this->icEmp->refresh();
        $this->assertSame('Grace Tan', $this->icEmp->emergency_contact['name'] ?? null);
        $this->assertSame('Samuel Tan', $this->icEmp->next_of_kin['name'] ?? null);
        $this->assertSame('Access Bank', $this->icEmp->bank_payroll['bankName'] ?? null);

        $event = $this->actingAs($this->hrUser)->postJson('/api/v1/governance/lifecycle-events', [
            'employeeId' => $this->icEmp->id,
            'eventType' => 'CONFIRMATION',
            'triggerReason' => 'Completed 6-month probation satisfactorily',
            'details' => ['confirmationDate' => '2026-10-01'],
        ])->assertCreated();

        $this->actingAs($this->hrUser)
            ->patchJson('/api/v1/governance/lifecycle-events/'.$event->json('data.id').'/approve')
            ->assertOk();

        $this->icEmp->refresh();
        $this->assertSame('Confirmed', $this->icEmp->status);
        $this->assertSame('Permanent', $this->icEmp->contract_status);
        $this->assertSame('2026-10-01', $this->icEmp->confirmation_date);
    }
}
