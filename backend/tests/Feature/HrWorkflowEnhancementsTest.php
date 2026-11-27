<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeLeaveBalance;
use App\Models\Entity;
use App\Models\Kpi;
use App\Models\LeaveCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HrWorkflowEnhancementsTest extends TestCase
{
    use RefreshDatabase;

    private Entity $entity;

    private Department $dept;

    private Employee $managerEmp;

    private Employee $altManagerEmp;

    private Employee $reportEmp;

    private Employee $otherEmp;

    private Employee $hrEmp;

    private User $managerUser;

    private User $altManagerUser;

    private User $reportUser;

    private User $hrUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->entity = Entity::create([
            'id' => 'CGCC',
            'name' => 'The Citadel Global Community Church',
            'short_code' => 'CGCC',
            'is_active' => true,
        ]);

        $this->dept = Department::create([
            'entity_id' => $this->entity->id,
            'name' => 'ICT & Systems',
            'code' => 'CGCC-ICT',
            'is_active' => true,
        ]);

        $this->managerEmp = Employee::create([
            'staff_id' => 'CGCC-MGR-01',
            'first_name' => 'Tunde',
            'last_name' => 'Bakare',
            'full_name' => 'Pastor Tunde Bakare',
            'entity_id' => $this->entity->id,
            'department_id' => $this->dept->id,
            'job_title' => 'Head of Operations',
            'status' => 'Active',
        ]);

        $this->altManagerEmp = Employee::create([
            'staff_id' => 'CGCC-MGR-02',
            'first_name' => 'Femi',
            'last_name' => 'Olatunji',
            'full_name' => 'Engr. Femi Olatunji',
            'entity_id' => $this->entity->id,
            'department_id' => $this->dept->id,
            'job_title' => 'Head of ICT',
            'status' => 'Active',
        ]);

        $this->reportEmp = Employee::create([
            'staff_id' => 'CGCC-EMP-01',
            'first_name' => 'Chinedu',
            'last_name' => 'Okafor',
            'full_name' => 'Chinedu Okafor',
            'entity_id' => $this->entity->id,
            'department_id' => $this->dept->id,
            'job_title' => 'Systems Engineer',
            'manager_id' => (string) $this->managerEmp->id,
            'manager_name' => $this->managerEmp->full_name,
            'status' => 'Active',
        ]);

        $this->otherEmp = Employee::create([
            'staff_id' => 'CGCC-EMP-02',
            'first_name' => 'Adaobi',
            'last_name' => 'Nwosu',
            'full_name' => 'Adaobi Nwosu',
            'entity_id' => $this->entity->id,
            'department_id' => $this->dept->id,
            'job_title' => 'Accountant',
            'manager_id' => (string) $this->altManagerEmp->id,
            'manager_name' => $this->altManagerEmp->full_name,
            'status' => 'Active',
        ]);

        $this->hrEmp = Employee::create([
            'staff_id' => 'CGCC-HR-01',
            'first_name' => 'Bukola',
            'last_name' => 'Adeleke',
            'full_name' => 'Dr. Bukola Adeleke',
            'entity_id' => $this->entity->id,
            'department_id' => $this->dept->id,
            'job_title' => 'HR Director',
            'status' => 'Active',
        ]);

        $this->managerUser = User::factory()->create([
            'name' => $this->managerEmp->full_name,
            'email' => 'manager.test@citadel.org',
            'role' => 'MANAGER',
            'staff_id' => $this->managerEmp->staff_id,
        ]);

        $this->altManagerUser = User::factory()->create([
            'name' => $this->altManagerEmp->full_name,
            'email' => 'alt.manager.test@citadel.org',
            'role' => 'MANAGER',
            'staff_id' => $this->altManagerEmp->staff_id,
        ]);

        $this->reportUser = User::factory()->create([
            'name' => $this->reportEmp->full_name,
            'email' => 'report.test@citadel.org',
            'role' => 'EMPLOYEE',
            'staff_id' => $this->reportEmp->staff_id,
        ]);

        $this->hrUser = User::factory()->create([
            'name' => $this->hrEmp->full_name,
            'email' => 'hr.test@citadel.org',
            'role' => 'HR_STAFF',
            'staff_id' => $this->hrEmp->staff_id,
        ]);

        $annualCategory = LeaveCategory::create([
            'name' => 'Annual Leave',
            'code' => 'ANNUAL',
            'is_paid' => true,
            'is_active' => true,
        ]);

        EmployeeLeaveBalance::create([
            'employee_id' => $this->reportEmp->id,
            'leave_category_id' => $annualCategory->id,
            'year' => 2026,
            'total_days' => 21,
            'used_days' => 0,
            'pending_days' => 0,
            'remaining_days' => 21,
        ]);
    }

    public function test_manager_can_initiate_and_evaluate_review_for_direct_report_only(): void
    {
        $kpi = Kpi::create([
            'indicator' => 'Systems Reliability',
            'description' => 'Maintain core platform availability.',
            'min_rating' => 1,
            'max_rating' => 5,
            'weight' => 100,
            'is_active' => true,
        ]);

        // Manager initiates appraisal for direct report -> 201
        $createResponse = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson('/api/v1/performance/reviews', [
                'employeeId' => $this->reportEmp->id,
                'reviewPeriodStart' => '2026-01-01',
                'reviewPeriodEnd' => '2026-12-31',
                'dueDate' => '2026-12-31',
                'kpis' => [
                    ['kpiId' => $kpi->id, 'weight' => 100],
                ],
            ]);

        $createResponse->assertStatus(201);
        $reviewId = $createResponse->json('data.id');

        // Manager evaluates direct report's appraisal with comment -> 200 & weighted score computed
        $evalResponse = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/performance/reviews/{$reviewId}/evaluate", [
                'ratings' => [
                    ['kpiId' => $kpi->id, 'rating' => 4.5, 'weight' => 100, 'comments' => 'Consistently exceeded uptime targets.'],
                ],
                'reviewerComments' => 'Excellent performance throughout the year.',
            ]);

        $evalResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'EVALUATED');
        $this->assertEquals(4.5, (float) $evalResponse->json('data.finalRating'));

        // Manager attempting to initiate review for an employee outside their subtree -> 403
        $forbiddenResponse = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson('/api/v1/performance/reviews', [
                'employeeId' => $this->otherEmp->id,
                'reviewPeriodStart' => '2026-01-01',
                'reviewPeriodEnd' => '2026-12-31',
                'dueDate' => '2026-12-31',
            ]);

        $forbiddenResponse->assertStatus(403);
    }

    public function test_employee_can_select_reviewing_manager_on_leave_and_self_selection_is_rejected(): void
    {
        // Self-selection rejected with 422
        $selfSelect = $this->actingAs($this->reportUser, 'sanctum')
            ->postJson('/api/v1/leave-requests', [
                'employeeId' => $this->reportEmp->id,
                'managerId' => $this->reportEmp->id,
                'leaveType' => 'Annual Leave',
                'startDate' => '2026-12-01',
                'endDate' => '2026-12-03',
                'totalDays' => 3,
                'reason' => 'Testing self selection block',
            ]);

        $selfSelect->assertStatus(422);

        // Selecting an alternate reviewing manager routes Stage 1 to them
        $submit = $this->actingAs($this->reportUser, 'sanctum')
            ->postJson('/api/v1/leave-requests', [
                'employeeId' => $this->reportEmp->id,
                'managerId' => $this->altManagerEmp->id,
                'leaveType' => 'Annual Leave',
                'startDate' => '2026-12-01',
                'endDate' => '2026-12-03',
                'totalDays' => 3,
                'reason' => 'Family retreat',
            ]);

        $submit->assertStatus(201)
            ->assertJsonPath('data.approvalStage', 'MANAGER')
            ->assertJsonPath('data.managerId', (string) $this->altManagerEmp->id);

        $leaveId = $submit->json('data.id');

        // Selected manager can see the leave request in their scoped index
        $list = $this->actingAs($this->altManagerUser, 'sanctum')
            ->getJson('/api/v1/leave-requests');

        $list->assertStatus(200);
        $ids = collect($list->json('data'))->pluck('id')->all();
        $this->assertContains($leaveId, $ids);

        // Selected manager approves Stage 1 -> advances to HR Stage 2
        $approve = $this->actingAs($this->altManagerUser, 'sanctum')
            ->patchJson("/api/v1/leave-requests/{$leaveId}/status", [
                'status' => 'Approved',
                'comments' => 'Approved by selected reviewing manager.',
            ]);

        $approve->assertStatus(200)
            ->assertJsonPath('data.approvalStage', 'HR');
    }

    public function test_employee_can_select_manager_on_resignation_and_manager_can_forward_to_hr(): void
    {
        // Self-selection rejected with 422
        $selfSelect = $this->actingAs($this->reportUser, 'sanctum')
            ->postJson('/api/v1/offboarding/requests', [
                'employeeId' => $this->reportEmp->id,
                'managerId' => $this->reportEmp->id,
                'resignationDate' => '2026-11-26',
                'proposedLastDay' => '2026-12-31',
                'reason' => 'Self-selection check',
            ]);

        $selfSelect->assertStatus(422);

        // Submit resignation selecting manager
        $submit = $this->actingAs($this->reportUser, 'sanctum')
            ->postJson('/api/v1/offboarding/requests', [
                'employeeId' => $this->reportEmp->id,
                'managerId' => $this->managerEmp->id,
                'resignationDate' => '2026-11-26',
                'proposedLastDay' => '2026-12-31',
                'reason' => 'Relocating for further studies.',
            ]);

        $submit->assertStatus(201)
            ->assertJsonPath('data.status', 'SUBMITTED')
            ->assertJsonPath('data.managerId', (string) $this->managerEmp->id);

        $exitId = $submit->json('data.id');

        // Manager endorses & forwards to HR
        $endorse = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/offboarding/requests/{$exitId}/manager-endorse", [
                'comments' => 'Handover documented and approved.',
            ]);

        $endorse->assertStatus(200)
            ->assertJsonPath('data.status', 'MANAGER_REVIEWED')
            ->assertJsonPath('data.managerEndorsed', true);
    }
}
