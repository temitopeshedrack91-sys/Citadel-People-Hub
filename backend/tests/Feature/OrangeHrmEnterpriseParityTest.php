<?php

namespace Tests\Feature;

use App\Models\Candidate;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeLeaveBalance;
use App\Models\Entity;
use App\Models\JobTitle;
use App\Models\JobVacancy;
use App\Models\Kpi;
use App\Models\LeaveCategory;
use App\Models\LeaveRequest;
use App\Models\PayGrade;
use App\Models\PerformanceReview;
use App\Models\Project;
use App\Models\Timesheet;
use App\Models\TrainingCourse;
use App\Models\TrainingSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrangeHrmEnterpriseParityTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;
    private User $hrUser;
    private User $deptHeadUser;
    private User $staffUser;
    private Entity $entity;
    private Department $department;
    private Employee $staffEmployee;
    private Employee $deptHeadEmployee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->entity = Entity::create([
            'id' => 'CORP',
            'name' => 'Corporate Enterprise Ltd',
            'short_code' => 'CORP',
            'is_active' => true,
        ]);

        $this->department = Department::create([
            'entity_id' => $this->entity->id,
            'name' => 'Engineering',
            'code' => 'ENG',
            'is_active' => true,
        ]);

        $this->adminUser = User::factory()->create([
            'email' => 'admin@enterprise.test',
            'role' => 'ADMIN',
            'staff_id' => 'ADM001',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
        ]);

        $this->hrUser = User::factory()->create([
            'email' => 'hr@enterprise.test',
            'role' => 'HR_MANAGER',
            'staff_id' => 'HR001',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
        ]);

        $this->deptHeadUser = User::factory()->create([
            'email' => 'depthead@enterprise.test',
            'role' => 'DEPARTMENT_HEAD',
            'staff_id' => 'DH001',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
        ]);

        $this->staffUser = User::factory()->create([
            'email' => 'staff@enterprise.test',
            'role' => 'EMPLOYEE',
            'staff_id' => 'STF001',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
        ]);

        $this->deptHeadEmployee = Employee::create([
            'staff_id' => 'DH001',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'full_name' => 'Ada Lovelace',
            'email' => 'depthead@enterprise.test',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Director of Engineering',
            'status' => 'Active',
        ]);

        $this->staffEmployee = Employee::create([
            'staff_id' => 'STF001',
            'first_name' => 'Alan',
            'last_name' => 'Turing',
            'full_name' => 'Alan Turing',
            'email' => 'staff@enterprise.test',
            'entity_id' => $this->entity->id,
            'department_id' => $this->department->id,
            'job_title' => 'Senior Systems Engineer',
            'status' => 'Active',
        ]);
    }

    // ==========================================
    // 1. Leave Management: Overlaps & Balances
    // ==========================================

    public function test_leave_request_cannot_overlap_existing_active_leave(): void
    {
        LeaveRequest::create([
            'employee_id' => $this->staffEmployee->id,
            'employee_staff_id' => $this->staffEmployee->staff_id,
            'employee_name' => $this->staffEmployee->full_name,
            'entity_name' => $this->entity->name,
            'department_name' => $this->department->name,
            'leave_type' => 'Annual Leave',
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-10',
            'total_days' => 8,
            'reason' => 'Existing booked holiday',
            'status' => 'Approved',
            'approval_stage' => 'COMPLETE',
            'applied_date' => now(),
        ]);

        // Attempt to submit overlapping leave (2026-12-05 to 2026-12-15)
        $response = $this->actingAs($this->staffUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->staffEmployee->id,
            'employeeStaffId' => $this->staffEmployee->staff_id,
            'employeeName' => $this->staffEmployee->full_name,
            'entityName' => $this->entity->name,
            'departmentName' => $this->department->name,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-05',
            'endDate' => '2026-12-15',
            'totalDays' => 9,
            'reason' => 'Overlapping vacation attempt',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'The requested leave period overlaps with an existing leave request.');
    }

    public function test_leave_balances_are_enforced_and_dynamically_tracked(): void
    {
        $category = LeaveCategory::create([
            'name' => 'Annual Leave',
            'code' => 'AL',
            'is_paid' => true,
            'is_active' => true,
        ]);

        // Assign 10 days of entitlement via the new entitlement endpoint
        $this->actingAs($this->hrUser)->postJson('/api/v1/leave/entitlements', [
            'employeeId' => $this->staffEmployee->id,
            'leaveCategoryId' => $category->id,
            'year' => 2026,
            'totalDays' => 10,
        ])->assertStatus(201)
            ->assertJsonPath('data.total_days', '10.00')
            ->assertJsonPath('data.remaining_days', '10.00');

        // Attempt to request 15 days (exceeds balance)
        $this->actingAs($this->staffUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->staffEmployee->id,
            'employeeStaffId' => $this->staffEmployee->staff_id,
            'employeeName' => $this->staffEmployee->full_name,
            'entityName' => $this->entity->name,
            'departmentName' => $this->department->name,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-01',
            'endDate' => '2026-12-20',
            'totalDays' => 15,
            'reason' => 'Over-budget holiday',
        ])->assertStatus(422);

        // Request valid 4 days
        $applyRes = $this->actingAs($this->staffUser)->postJson('/api/v1/leave-requests', [
            'employeeId' => $this->staffEmployee->id,
            'employeeStaffId' => $this->staffEmployee->staff_id,
            'employeeName' => $this->staffEmployee->full_name,
            'entityName' => $this->entity->name,
            'departmentName' => $this->department->name,
            'leaveType' => 'Annual Leave',
            'startDate' => '2026-12-01',
            'endDate' => '2026-12-04',
            'totalDays' => 4,
            'reason' => 'Quarterly break',
        ])->assertStatus(201);

        $leaveId = $applyRes->json('data.id');

        // Check balance: pending_days=4, remaining_days=6
        $balance = EmployeeLeaveBalance::where('employee_id', $this->staffEmployee->id)->first();
        $this->assertEquals(4, (float) $balance->pending_days);
        $this->assertEquals(6, (float) $balance->remaining_days);

        // Advance through approval stages: DEPARTMENT_HEAD -> BUSINESS_HEAD -> HR -> Approved
        $this->actingAs($this->deptHeadUser)->patchJson("/api/v1/leave-requests/{$leaveId}/status", ['status' => 'Approved'])
            ->assertOk();

        $this->actingAs($this->adminUser)->patchJson("/api/v1/leave-requests/{$leaveId}/status", ['status' => 'Approved'])
            ->assertOk();

        $this->actingAs($this->hrUser)->patchJson("/api/v1/leave-requests/{$leaveId}/status", ['status' => 'Approved'])
            ->assertOk();

        // When fully approved: pending_days=0, used_days=4, remaining_days=6
        $balance->refresh();
        $this->assertEquals(0, (float) $balance->pending_days);
        $this->assertEquals(4, (float) $balance->used_days);
        $this->assertEquals(6, (float) $balance->remaining_days);
    }

    // ==========================================
    // 2. Job Titles and Pay Grades
    // ==========================================

    public function test_job_titles_and_pay_grades_crud_and_rbac(): void
    {
        // Staff cannot create job titles
        $this->actingAs($this->staffUser)->postJson('/api/v1/job-titles', [
            'title' => 'Chief Technology Officer',
        ])->assertForbidden();

        // HR can create job title
        $jtRes = $this->actingAs($this->hrUser)->postJson('/api/v1/job-titles', [
            'title' => 'Chief Technology Officer',
            'description' => 'Leads technology vision',
            'minExperienceYears' => 10,
        ])->assertStatus(201)
            ->assertJsonPath('data.title', 'Chief Technology Officer');

        $jtId = $jtRes->json('data.id');

        // Pay Grades: validate min_salary <= max_salary
        $this->actingAs($this->hrUser)->postJson('/api/v1/pay-grades', [
            'name' => 'Executive Band A',
            'minSalary' => 5000000,
            'maxSalary' => 3000000, // Invalid: max < min
        ])->assertStatus(422);

        $pgRes = $this->actingAs($this->hrUser)->postJson('/api/v1/pay-grades', [
            'name' => 'Executive Band A',
            'currency' => 'NGN',
            'minSalary' => 3000000,
            'maxSalary' => 5000000,
            'description' => 'Executive grade band',
        ])->assertStatus(201);

        $pgId = $pgRes->json('data.id');

        // Read public list
        $this->actingAs($this->staffUser)->getJson('/api/v1/job-titles')->assertOk();
        $this->actingAs($this->staffUser)->getJson('/api/v1/pay-grades')->assertOk();

        // Clean up / update
        $this->actingAs($this->adminUser)->patchJson("/api/v1/pay-grades/{$pgId}", [
            'maxSalary' => 6000000,
        ])->assertOk()->assertJsonPath('data.max_salary', '6000000.00');
    }

    // ==========================================
    // 3. Timesheets and Weekly Workflow
    // ==========================================

    public function test_timesheet_lifecycle_and_actions(): void
    {
        $project = Project::create([
            'title' => 'Core Platform Modernization',
            'code' => 'PLATFORM',
            'department_id' => $this->department->id,
            'status' => 'active',
        ]);

        // Staff creates draft timesheet
        $tsRes = $this->actingAs($this->staffUser)->postJson('/api/v1/timesheets', [
            'employeeId' => $this->staffEmployee->id,
            'periodStart' => '2026-11-02',
            'periodEnd' => '2026-11-08',
            'items' => [
                [
                    'projectId' => $project->id,
                    'activityName' => 'API Architecture',
                    'date' => '2026-11-03',
                    'durationHours' => 8.0,
                    'notes' => 'Implemented OrangeHRM feature parity',
                ],
                [
                    'projectId' => $project->id,
                    'activityName' => 'Database Schema Migration',
                    'date' => '2026-11-04',
                    'durationHours' => 7.5,
                    'notes' => 'Domain migrations executed',
                ],
            ],
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'DRAFT')
            ->assertJsonPath('data.totalHours', 15.5);

        $tsId = $tsRes->json('data.id');

        // Cannot approve a DRAFT timesheet
        $this->actingAs($this->deptHeadUser)->postJson("/api/v1/timesheets/{$tsId}/approve")
            ->assertStatus(409);

        // Staff submits timesheet
        $this->actingAs($this->staffUser)->postJson("/api/v1/timesheets/{$tsId}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'SUBMITTED');

        // Staff cannot approve own timesheet
        $this->actingAs($this->staffUser)->postJson("/api/v1/timesheets/{$tsId}/approve")
            ->assertForbidden();

        // Department Head approves
        $this->actingAs($this->deptHeadUser)->postJson("/api/v1/timesheets/{$tsId}/approve", [
            'comments' => 'Verified against project deliverable goals.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'APPROVED');
    }

    // ==========================================
    // 4. Performance Reviews and KPI Scoring
    // ==========================================

    public function test_performance_review_kpi_evaluation_bounds_and_lifecycle(): void
    {
        $kpi = Kpi::create([
            'indicator' => 'Delivery Punctuality & Code Quality',
            'min_rating' => 1.0,
            'max_rating' => 5.0,
            'weight' => 100.0,
            'is_active' => true,
        ]);

        // HR creates a performance review
        $revRes = $this->actingAs($this->hrUser)->postJson('/api/v1/performance/reviews', [
            'employeeId' => $this->staffEmployee->id,
            'reviewerId' => $this->deptHeadEmployee->id,
            'reviewPeriodStart' => '2026-01-01',
            'reviewPeriodEnd' => '2026-06-30',
            'dueDate' => '2026-07-15',
            'kpis' => [
                ['kpiId' => $kpi->id, 'title' => $kpi->indicator],
            ],
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'IN_PROGRESS');

        $revId = $revRes->json('data.id');

        // Reviewer evaluates with out-of-bounds rating (e.g. 6.0 when max is 5.0)
        $this->actingAs($this->deptHeadUser)->postJson("/api/v1/performance/reviews/{$revId}/evaluate", [
            'ratings' => [
                [
                    'kpiId' => $kpi->id,
                    'kpiTitle' => $kpi->indicator,
                    'rating' => 6.0,
                ],
            ],
        ])->assertStatus(422);

        // Reviewer scores valid 4.5 rating
        $evalRes = $this->actingAs($this->deptHeadUser)->postJson("/api/v1/performance/reviews/{$revId}/evaluate", [
            'ratings' => [
                [
                    'kpiId' => $kpi->id,
                    'kpiTitle' => $kpi->indicator,
                    'rating' => 4.5,
                    'comment' => 'Exceeded engineering quality targets.',
                ],
            ],
            'reviewerComments' => 'High impact contributor.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'EVALUATED')
            ->assertJsonPath('data.finalRating', 4.5);

        // HR formally approves the review
        $this->actingAs($this->hrUser)->postJson("/api/v1/performance/reviews/{$revId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'APPROVED');
    }

    // ==========================================
    // 5. Recruitment Pipeline & Candidate ATS
    // ==========================================

    public function test_candidate_recruitment_state_transitions_and_interviews(): void
    {
        // Create job vacancy
        $vacRes = $this->actingAs($this->hrUser)->postJson('/api/v1/recruitment/vacancies', [
            'title' => 'Lead DevOps Architect',
            'departmentId' => $this->department->id,
            'positionsCount' => 2,
        ])->assertStatus(201);

        $vacancyId = $vacRes->json('data.id');

        // Register candidate
        $candRes = $this->actingAs($this->hrUser)->postJson('/api/v1/recruitment/candidates', [
            'vacancyId' => $vacancyId,
            'firstName' => 'Grace',
            'lastName' => 'Hopper',
            'email' => 'grace.hopper@navy.test',
            'phone' => '+1-555-0199',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'Application Initiated');

        $candidateId = $candRes->json('data.id');

        // Invalid jump directly to Hired throws 422
        $this->actingAs($this->hrUser)->patchJson("/api/v1/recruitment/candidates/{$candidateId}/status", [
            'status' => 'Hired',
        ])->assertStatus(422);

        // Advance to Shortlisted
        $this->actingAs($this->hrUser)->patchJson("/api/v1/recruitment/candidates/{$candidateId}/status", [
            'status' => 'Shortlisted',
        ])->assertOk()->assertJsonPath('data.status', 'Shortlisted');

        // Schedule an interview
        $intRes = $this->actingAs($this->hrUser)->postJson("/api/v1/recruitment/candidates/{$candidateId}/interviews", [
            'interviewTitle' => 'Technical System Design',
            'interviewerId' => $this->deptHeadEmployee->id,
            'scheduledDate' => '2026-11-25',
            'scheduledTime' => '14:00',
        ])->assertStatus(201);

        $interviewId = $intRes->json('data.id');

        // Verify candidate status auto-advanced to 'Interview Scheduled'
        $this->actingAs($this->hrUser)->getJson("/api/v1/recruitment/candidates/{$candidateId}")
            ->assertOk()
            ->assertJsonPath('data.status', 'Interview Scheduled');

        // Mark interview as Passed
        $this->actingAs($this->hrUser)->patchJson("/api/v1/recruitment/interviews/{$interviewId}", [
            'result' => 'Passed',
            'notes' => 'Outstanding knowledge of distributed architecture.',
        ])->assertOk();

        // Candidate status is now 'Interview Passed'
        $this->actingAs($this->hrUser)->getJson("/api/v1/recruitment/candidates/{$candidateId}")
            ->assertOk()
            ->assertJsonPath('data.status', 'Interview Passed');

        // Extend job offer -> accept -> hire
        $this->actingAs($this->hrUser)->patchJson("/api/v1/recruitment/candidates/{$candidateId}/status", ['status' => 'Job Offered'])->assertOk();
        $this->actingAs($this->hrUser)->patchJson("/api/v1/recruitment/candidates/{$candidateId}/status", ['status' => 'Offer Accepted'])->assertOk();
        $this->actingAs($this->hrUser)->patchJson("/api/v1/recruitment/candidates/{$candidateId}/status", ['status' => 'Hired'])->assertOk();
    }

    // ==========================================
    // 6. Corporate Training
    // ==========================================

    public function test_corporate_training_course_session_and_enrollment(): void
    {
        $courseRes = $this->actingAs($this->hrUser)->postJson('/api/v1/training/courses', [
            'title' => 'Information Security & Zero Trust',
            'code' => 'SEC-101',
            'durationHours' => 16.0,
            'trainerProvider' => 'Cyber Academy',
        ])->assertStatus(201);

        $courseId = $courseRes->json('data.id');

        $sessionRes = $this->actingAs($this->hrUser)->postJson('/api/v1/training/sessions', [
            'courseId' => $courseId,
            'sessionName' => 'Q4 Cohort A',
            'startDate' => '2026-12-01',
            'endDate' => '2026-12-02',
            'maxCapacity' => 20,
        ])->assertStatus(201);

        $sessionId = $sessionRes->json('data.id');

        // Enroll employee
        $enrRes = $this->actingAs($this->hrUser)->postJson("/api/v1/training/sessions/{$sessionId}/enroll", [
            'employeeId' => $this->staffEmployee->id,
        ])->assertStatus(201);

        $enrollmentId = $enrRes->json('data.id');

        // Duplicate enrollment rejected
        $this->actingAs($this->hrUser)->postJson("/api/v1/training/sessions/{$sessionId}/enroll", [
            'employeeId' => $this->staffEmployee->id,
        ])->assertStatus(409);

        // Mark completed with score
        $this->actingAs($this->hrUser)->patchJson("/api/v1/training/enrollments/{$enrollmentId}", [
            'status' => 'Completed',
            'score' => 98.5,
            'feedback' => 'Exceptional performance in hands-on lab exercises.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'Completed')
            ->assertJsonPath('data.score', '98.50');
    }

    // ==========================================
    // 7. Enterprise HR Reporting
    // ==========================================

    public function test_enterprise_hr_reports(): void
    {
        // Staff cannot access reports
        $this->actingAs($this->staffUser)->getJson('/api/v1/reports/workforce')->assertForbidden();

        // HR can access workforce report
        $this->actingAs($this->hrUser)->getJson('/api/v1/reports/workforce')
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['totalEmployees', 'totalActive', 'byEntity', 'byDepartment'],
            ]);

        // Leave utilization report
        $this->actingAs($this->hrUser)->getJson('/api/v1/reports/leave-utilization')
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['year', 'summary', 'byCategory', 'requestsByStatus'],
            ]);

        // Attendance summary report
        $this->actingAs($this->hrUser)->getJson('/api/v1/reports/attendance-summary')
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['totalAttendanceLogs', 'statusBreakdown', 'totalHoursWorked'],
            ]);

        // Recruitment summary report
        $this->actingAs($this->hrUser)->getJson('/api/v1/reports/recruitment-summary')
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['activeVacancies', 'totalCandidates', 'funnel'],
            ]);
    }
}
