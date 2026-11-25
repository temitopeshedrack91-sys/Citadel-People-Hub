<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeLeaveBalance;
use App\Models\Entity;
use App\Models\Kpi;
use App\Models\LeaveCategory;
use App\Models\LeavePolicy;
use App\Models\LeaveRequest;
use App\Models\OffboardingRequest;
use App\Models\OnboardingChecklistTemplate;
use App\Models\OnboardingJourney;
use App\Models\PerformanceReview;
use App\Models\ReviewRating;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with entities, departments,
     * a multi-level employee reporting hierarchy, HR/Manager/Employee accounts,
     * leave categories/policies/balances, and sample leave requests.
     */
    public function run(): void
    {
        $entities = [
            ['id' => 'CGCC', 'name' => 'Citadel Global Community Church (CGCC)', 'short_code' => 'CGCC', 'description' => 'Flagship church organization, ministry operations, pastoral care, and administrative functions.', 'is_active' => true],
            ['id' => 'CSOG', 'name' => 'Citadel School of Government', 'short_code' => 'CSOG', 'description' => 'Academic and leadership institution developing ethical governance leaders and policy practitioners.', 'is_active' => true],
            ['id' => 'HOLDINGS', 'name' => 'Citadel Holdings', 'short_code' => 'Holdings', 'description' => 'Commercial and enterprise arm operating retail, hospitality, workspaces, and creative ventures.', 'is_active' => true],
        ];
        $entityIds = [];
        foreach ($entities as $attributes) {
            $entity = Entity::firstOrCreate(['short_code' => $attributes['short_code']], $attributes);
            $entityIds[$attributes['short_code']] = $entity->id;
        }

        $departments = [
            ['entity' => 'CGCC', 'name' => 'Finance', 'code' => 'CGCC-FIN'],
            ['entity' => 'CGCC', 'name' => 'People, Culture & Change', 'code' => 'CGCC-PCCM'],
            ['entity' => 'CGCC', 'name' => 'Facilities', 'code' => 'CGCC-FAC'],
            ['entity' => 'CGCC', 'name' => 'Security', 'code' => 'CGCC-SEC'],
            ['entity' => 'CGCC', 'name' => "S.O.'s Office / Admin", 'code' => 'CGCC-SO'],
            ['entity' => 'CGCC', 'name' => 'Protocol', 'code' => 'CGCC-PRO'],
            ['entity' => 'CGCC', 'name' => 'ICT', 'code' => 'CGCC-ICT'],
            ['entity' => 'CGCC', 'name' => 'Transport & Logistics', 'code' => 'CGCC-LOG'],
            ['entity' => 'CSOG', 'name' => 'Academy & Programmes', 'code' => 'CSOG-ACAD'],
            ['entity' => 'CSOG', 'name' => 'Admin & Operations', 'code' => 'CSOG-OPS'],
            ['entity' => 'Holdings', 'name' => 'Bookshop', 'code' => 'CH-BOOK'],
            ['entity' => 'Holdings', 'name' => 'Cafe', 'code' => 'CH-CAFE'],
            ['entity' => 'Holdings', 'name' => 'Workstation', 'code' => 'CH-WORK'],
            ['entity' => 'Holdings', 'name' => 'Asabi Aladire', 'code' => 'CH-ASABI'],
            ['entity' => 'Holdings', 'name' => 'Sales & Business Development', 'code' => 'CH-SBD'],
        ];
        $deptByCode = [];
        foreach ($departments as $attributes) {
            $dept = Department::firstOrCreate(
                ['entity_id' => $entityIds[$attributes['entity']], 'code' => $attributes['code']],
                [
                    'name' => $attributes['name'],
                    'is_active' => true,
                ],
            );
            $deptByCode[$attributes['code']] = $dept;
        }

        // Seed Leave Categories & 2026 Policies
        $year = (int) date('Y');
        $leaveSpecs = [
            ['name' => 'Annual Leave', 'code' => 'AL', 'days' => 24, 'is_paid' => true],
            ['name' => 'Casual Leave', 'code' => 'CL', 'days' => 7, 'is_paid' => true],
            ['name' => 'Sick Leave', 'code' => 'SL', 'days' => 12, 'is_paid' => true],
            ['name' => 'Maternity Leave', 'code' => 'ML', 'days' => 84, 'is_paid' => true],
            ['name' => 'Paternity Leave', 'code' => 'PL', 'days' => 14, 'is_paid' => true],
            ['name' => 'Exam Leave', 'code' => 'EL', 'days' => 5, 'is_paid' => true],
            ['name' => 'Compassionate Leave', 'code' => 'CMPL', 'days' => 5, 'is_paid' => true],
        ];
        $categories = [];
        foreach ($leaveSpecs as $spec) {
            $category = LeaveCategory::firstOrCreate(
                ['name' => $spec['name']],
                ['code' => $spec['code'], 'is_paid' => $spec['is_paid'], 'is_active' => true]
            );
            LeavePolicy::firstOrCreate(
                ['leave_category_id' => $category->id, 'effective_year' => $year],
                ['name' => "Standard {$spec['name']} {$year}", 'days_allowed' => $spec['days'], 'carry_forward_days' => 5, 'is_active' => true]
            );
            $categories[$spec['name']] = ['category' => $category, 'days' => $spec['days']];
        }

        // Seed Employees (with reporting hierarchy) & Accounts
        $passwordHash = Hash::make('Password123!');

        $staffSeed = [
            [
                'staff_id' => 'CGCC-000',
                'first_name' => 'Tunde',
                'last_name' => 'Bakare',
                'full_name' => 'Pastor Tunde Bakare',
                'email' => 'pastor.bakare@citadel.ng',
                'dept_code' => 'CGCC-SO',
                'job_title' => 'President & General Overseer',
                'role' => 'MANAGER',
                'manager_staff_id' => null,
            ],
            [
                'staff_id' => 'CGCC-001',
                'first_name' => 'Bukola',
                'last_name' => 'Adeleke',
                'full_name' => 'Dr. Bukola Adeleke',
                'email' => 'dr.adeleke@citadel.ng',
                'dept_code' => 'CGCC-PCCM',
                'job_title' => 'Chief People Officer',
                'role' => 'PCCM_SUPER_ADMIN',
                'manager_staff_id' => null,
            ],
            [
                'staff_id' => 'CGCC-007',
                'first_name' => 'Sussan',
                'last_name' => 'Afuwape',
                'full_name' => 'Sussan Afuwape',
                'email' => 's.afuwape@thecitadelglobal.org',
                'dept_code' => 'CGCC-PCCM',
                'job_title' => 'People, Culture & Change Manager',
                'role' => 'HR_STAFF',
                'manager_staff_id' => 'CGCC-001',
            ],
            [
                'staff_id' => 'CGCC-002',
                'first_name' => 'Femi',
                'last_name' => 'Olatunji',
                'full_name' => 'Engr. Femi Olatunji',
                'email' => 'femi.olatunji@citadel.ng',
                'dept_code' => 'CGCC-ICT',
                'job_title' => 'Head of Technology',
                'role' => 'MANAGER',
                'manager_staff_id' => 'CGCC-000',
            ],
            [
                'staff_id' => 'CGCC-003',
                'first_name' => 'Nadia',
                'last_name' => 'Safitri',
                'full_name' => 'Nadia Safitri',
                'email' => 'nadia@citadel.ng',
                'dept_code' => 'CGCC-ICT',
                'job_title' => 'Lead Product Designer',
                'role' => 'EMPLOYEE',
                'manager_staff_id' => 'CGCC-002',
            ],
            [
                'staff_id' => 'CGCC-004',
                'first_name' => 'Bayu',
                'last_name' => 'Wirawan',
                'full_name' => 'Bayu Wirawan',
                'email' => 'bayu@citadel.ng',
                'dept_code' => 'CGCC-ICT',
                'job_title' => 'Senior Android Engineer',
                'role' => 'EMPLOYEE',
                'manager_staff_id' => 'CGCC-002',
            ],
            [
                'staff_id' => 'CGCC-005',
                'first_name' => 'Jonathan',
                'last_name' => 'Tan',
                'full_name' => 'Jonathan Tan',
                'email' => 'jonathan@citadel.ng',
                'dept_code' => 'CGCC-ICT',
                'job_title' => 'Backend Systems Lead',
                'role' => 'EMPLOYEE',
                'manager_staff_id' => 'CGCC-003',
            ],
            [
                'staff_id' => 'CGCC-006',
                'first_name' => 'Grace',
                'last_name' => 'Okafor',
                'full_name' => 'Grace Okafor',
                'email' => 'grace.okafor@citadel.ng',
                'dept_code' => 'CGCC-PCCM',
                'job_title' => 'Compliance Auditor',
                'role' => 'AUDITOR',
                'manager_staff_id' => 'CGCC-001',
            ],
            [
                'staff_id' => 'CSOG-001',
                'first_name' => 'Omoaholo',
                'last_name' => 'Omoakhalen',
                'full_name' => 'Omoaholo Omoakhalen',
                'email' => 'omoaholo@citadel.ng',
                'dept_code' => 'CSOG-ACAD',
                'job_title' => 'Director CSOG',
                'role' => 'MANAGER',
                'manager_staff_id' => 'CGCC-000',
            ],
            [
                'staff_id' => 'CSOG-002',
                'first_name' => 'Adaobi',
                'last_name' => 'Nwosu',
                'full_name' => 'Adaobi Nwosu',
                'email' => 'adaobi@citadel.ng',
                'dept_code' => 'CSOG-ACAD',
                'job_title' => 'Programme Coordinator',
                'role' => 'EMPLOYEE',
                'manager_staff_id' => 'CSOG-001',
            ],
        ];

        $seededEmployees = [];
        foreach ($staffSeed as $row) {
            $dept = $deptByCode[$row['dept_code']];
            $emp = Employee::updateOrCreate(
                ['staff_id' => $row['staff_id']],
                [
                    'full_name' => $row['full_name'],
                    'first_name' => $row['first_name'],
                    'last_name' => $row['last_name'],
                    'email' => $row['email'],
                    'phone' => '+234 800 100 0000',
                    'entity_id' => $dept->entity_id,
                    'department_id' => $dept->id,
                    'job_title' => $row['job_title'],
                    'grade_level' => 'Associate (A-1)',
                    'employment_type' => 'Full-Time',
                    'employment_date' => '2024-01-15',
                    'contract_status' => 'Permanent',
                    'years_of_service' => 2,
                    'status' => 'Active',
                ]
            );
            $seededEmployees[$row['staff_id']] = $emp;
        }

        // Link supervisor hierarchy cleanly using Phase 1 employee IDs
        foreach ($staffSeed as $row) {
            $emp = $seededEmployees[$row['staff_id']];
            $manager = $row['manager_staff_id'] ? ($seededEmployees[$row['manager_staff_id']] ?? null) : null;
            $emp->update([
                'manager_id' => $manager ? (string) $manager->id : null,
                'manager_name' => $manager?->full_name,
            ]);

            User::updateOrCreate(
                ['email' => $row['email']],
                [
                    'name' => $row['full_name'],
                    'password' => $passwordHash,
                    'role' => $row['role'],
                    'staff_id' => $emp->staff_id,
                    'entity_id' => $emp->entity_id,
                    'department_id' => $emp->department_id,
                    'job_title' => $emp->job_title,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]
            );

            // Seed leave balances for each category if missing
            foreach ($categories as $catInfo) {
                EmployeeLeaveBalance::firstOrCreate(
                    [
                        'employee_id' => $emp->id,
                        'leave_category_id' => $catInfo['category']->id,
                        'year' => $year,
                    ],
                    [
                        'total_days' => $catInfo['days'],
                        'used_days' => 0,
                        'pending_days' => 0,
                        'remaining_days' => $catInfo['days'],
                    ]
                );
            }
        }

        // Also seed a System Admin account
        User::updateOrCreate(
            ['email' => 'sysadmin@citadel.ng'],
            [
                'name' => 'System Administrator',
                'password' => $passwordHash,
                'role' => 'ADMIN',
                'entity_id' => 'CGCC',
                'department_id' => $deptByCode['CGCC-ICT']->id,
                'job_title' => 'System Administrator',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        // Seed sample leave requests across stages if table is empty
        if (LeaveRequest::query()->count() === 0) {
            $bayu = $seededEmployees['CGCC-004'];
            $femi = $seededEmployees['CGCC-002'];
            $nadia = $seededEmployees['CGCC-003'];

            LeaveRequest::create([
                'employee_id' => $bayu->id,
                'employee_staff_id' => $bayu->staff_id,
                'employee_name' => $bayu->full_name,
                'entity_name' => $bayu->entity->name,
                'department_name' => $bayu->department->name,
                'leave_type' => 'Annual Leave',
                'start_date' => now()->addDays(10)->toDateString(),
                'end_date' => now()->addDays(12)->toDateString(),
                'total_days' => 3,
                'reason' => 'Family retreat and rest.',
                'manager_id' => (string) $femi->id,
                'manager_name' => $femi->full_name,
                'status' => 'Submitted',
                'approval_stage' => 'MANAGER',
                'applied_date' => now()->subHours(4),
                'approval_history' => [
                    [
                        'actor' => $bayu->full_name,
                        'role' => 'EMPLOYEE',
                        'stage' => 'SUBMITTED',
                        'decision' => 'Submitted',
                        'status' => 'Submitted',
                        'comments' => "Routed to direct supervisor {$femi->full_name} (Stage 1: Manager).",
                        'timestamp' => now()->subHours(4)->toISOString(),
                    ],
                ],
            ]);

            $annualBalanceBayu = EmployeeLeaveBalance::where('employee_id', $bayu->id)
                ->where('leave_category_id', $categories['Annual Leave']['category']->id)
                ->where('year', $year)
                ->first();
            if ($annualBalanceBayu) {
                $annualBalanceBayu->update([
                    'pending_days' => 3,
                    'remaining_days' => max(0, (float) $annualBalanceBayu->total_days - 3),
                ]);
            }

            LeaveRequest::create([
                'employee_id' => $nadia->id,
                'employee_staff_id' => $nadia->staff_id,
                'employee_name' => $nadia->full_name,
                'entity_name' => $nadia->entity->name,
                'department_name' => $nadia->department->name,
                'leave_type' => 'Casual Leave',
                'start_date' => now()->addDays(18)->toDateString(),
                'end_date' => now()->addDays(19)->toDateString(),
                'total_days' => 2,
                'reason' => 'Personal appointment.',
                'manager_id' => (string) $femi->id,
                'manager_name' => $femi->full_name,
                'status' => 'Pending Review',
                'approval_stage' => 'HR',
                'manager_actor_name' => $femi->full_name,
                'manager_acted_at' => now()->subHour(),
                'applied_date' => now()->subDay(),
                'approver_comments' => 'Coverage arranged with team.',
                'approval_history' => [
                    [
                        'actor' => $nadia->full_name,
                        'role' => 'EMPLOYEE',
                        'stage' => 'SUBMITTED',
                        'decision' => 'Submitted',
                        'status' => 'Submitted',
                        'comments' => "Routed to direct supervisor {$femi->full_name}.",
                        'timestamp' => now()->subDay()->toISOString(),
                    ],
                    [
                        'actor' => $femi->full_name,
                        'role' => 'MANAGER',
                        'stage' => 'MANAGER',
                        'decision' => 'Approved',
                        'status' => 'Pending Review',
                        'comments' => 'Coverage arranged with team.',
                        'timestamp' => now()->subHour()->toISOString(),
                    ],
                ],
            ]);

            $casualBalanceNadia = EmployeeLeaveBalance::where('employee_id', $nadia->id)
                ->where('leave_category_id', $categories['Casual Leave']['category']->id)
                ->where('year', $year)
                ->first();
            if ($casualBalanceNadia) {
                $casualBalanceNadia->update([
                    'pending_days' => 2,
                    'remaining_days' => max(0, (float) $casualBalanceNadia->total_days - 2),
                ]);
            }
        }

        // Phase 3: Talent & Performance Seed Data
        $hrUser = User::where('email', 'dr.adeleke@citadel.ng')->first()
            ?? User::where('email', 'sysadmin@citadel.ng')->firstOrFail();
        $this->seedPhase3TalentAndPerformance($seededEmployees, $hrUser);
    }

    private function seedPhase3TalentAndPerformance(array $seededEmployees, User $hrUser): void
    {
        // 1. Weighted KPI Library (weights sum cleanly to 100%)
        $kpiSpecs = [
            ['indicator' => 'Ministry & Operational Objective Delivery', 'min_rating' => 1, 'max_rating' => 5, 'weight' => 40, 'is_active' => true],
            ['indicator' => 'Technical Excellence & Process Compliance', 'min_rating' => 1, 'max_rating' => 5, 'weight' => 20, 'is_active' => true],
            ['indicator' => 'Stakeholder Collaboration & Team Support', 'min_rating' => 1, 'max_rating' => 5, 'weight' => 20, 'is_active' => true],
            ['indicator' => 'Leadership Initiative & Continuous Learning', 'min_rating' => 1, 'max_rating' => 5, 'weight' => 20, 'is_active' => true],
        ];
        $kpis = [];
        foreach ($kpiSpecs as $spec) {
            $kpis[] = Kpi::firstOrCreate(
                ['indicator' => $spec['indicator']],
                [
                    'min_rating' => $spec['min_rating'],
                    'max_rating' => $spec['max_rating'],
                    'weight' => $spec['weight'],
                    'is_active' => $spec['is_active'],
                    'version' => 1,
                ]
            );
        }

        // Seed 1 In-Progress Weighted Performance Review (Bayu Wirawan reviewed by Engr. Femi Olatunji)
        $bayu = $seededEmployees['CGCC-004'] ?? null;
        $femi = $seededEmployees['CGCC-002'] ?? null;
        if ($bayu && $femi && PerformanceReview::count() === 0) {
            $review = PerformanceReview::create([
                'employee_id' => $bayu->id,
                'reviewer_id' => $femi->id,
                'creator_id' => $hrUser->id,
                'review_period_start' => now()->startOfYear()->toDateString(),
                'review_period_end' => now()->endOfYear()->toDateString(),
                'due_date' => now()->addMonth()->toDateString(),
                'status' => 'IN_PROGRESS',
                'version' => 1,
            ]);
            foreach ($kpis as $kpi) {
                ReviewRating::create([
                    'performance_review_id' => $review->id,
                    'kpi_id' => $kpi->id,
                    'kpi_title' => $kpi->indicator,
                    'weight' => $kpi->weight,
                    'rating' => 0,
                    'comment' => null,
                ]);
            }
        }

        // 2. Onboarding SOP Builder (CGCC 19-Task Standard Template + Active Journey)
        $sopTasks = [
            // IT Prep (1-3)
            ['id' => 'sop-01', 'order' => 1, 'title' => 'Create ministry email address for new hire', 'department' => 'IT', 'timeline' => 'Before Resumption', 'assignedRole' => 'IT Systems Lead', 'dueDate' => 'Before Resumption', 'dependsOnTaskIds' => []],
            ['id' => 'sop-02', 'order' => 2, 'title' => 'Set up account permissions for platforms & software', 'department' => 'IT', 'timeline' => 'Before Resumption', 'assignedRole' => 'IT Systems Lead', 'dueDate' => 'Before Resumption', 'dependsOnTaskIds' => ['sop-01']],
            ['id' => 'sop-03', 'order' => 3, 'title' => 'Prepare computer, phone equipment and tech accessories', 'department' => 'IT', 'timeline' => 'Before Resumption', 'assignedRole' => 'IT Systems Lead', 'dueDate' => 'Before Resumption', 'dependsOnTaskIds' => []],
            // Manager Day 1-2 (4-8)
            ['id' => 'sop-04', 'order' => 4, 'title' => 'Send welcome email introducing new hire', 'department' => 'Manager', 'timeline' => 'Day 1', 'assignedRole' => 'Line Manager', 'dueDate' => 'Day 1', 'dependsOnTaskIds' => ['sop-01']],
            ['id' => 'sop-05', 'order' => 5, 'title' => 'Coordinate welcome meeting to kick off first day and introduce team', 'department' => 'Manager', 'timeline' => 'Day 1', 'assignedRole' => 'Line Manager', 'dueDate' => 'Day 1', 'dependsOnTaskIds' => []],
            ['id' => 'sop-06', 'order' => 6, 'title' => 'Assign new hire a mentor and/or onboarding buddy', 'department' => 'Manager', 'timeline' => 'Day 1', 'assignedRole' => 'Line Manager', 'dueDate' => 'Day 1', 'dependsOnTaskIds' => []],
            ['id' => 'sop-07', 'order' => 7, 'title' => 'Schedule first day meetings and introduction calls', 'department' => 'Manager', 'timeline' => 'Day 1', 'assignedRole' => 'Line Manager', 'dueDate' => 'Day 1', 'dependsOnTaskIds' => ['sop-05']],
            ['id' => 'sop-08', 'order' => 8, 'title' => 'Give introduction to ministry, role expectations and KPIs', 'department' => 'Manager', 'timeline' => 'Day 2', 'assignedRole' => 'Line Manager', 'dueDate' => 'Day 2', 'dependsOnTaskIds' => []],
            // Mentor Day 1 (9)
            ['id' => 'sop-09', 'order' => 9, 'title' => 'Office & Campus tour (parking spots, break room, chapel)', 'department' => 'Mentor', 'timeline' => 'Day 1', 'assignedRole' => 'Onboarding Buddy / Mentor', 'dueDate' => 'Day 1', 'dependsOnTaskIds' => ['sop-06']],
            // PCCM Day 1 - 90 Days (10-16)
            ['id' => 'sop-10', 'order' => 10, 'title' => 'Send new hire welcome packet (Bio-data, NDA, Handbook)', 'department' => 'PCCM', 'timeline' => 'Day 1', 'assignedRole' => 'PCCM / HR Coordinator', 'dueDate' => 'Day 1', 'requiredDocument' => 'Welcome Packet', 'dependsOnTaskIds' => []],
            ['id' => 'sop-11', 'order' => 11, 'title' => 'Share essential ministry policies, hours of operation, dress code', 'department' => 'PCCM', 'timeline' => 'Day 1', 'assignedRole' => 'PCCM / HR Coordinator', 'dueDate' => 'Day 1', 'requiredDocument' => 'Employee Handbook', 'dependsOnTaskIds' => []],
            ['id' => 'sop-12', 'order' => 12, 'title' => 'Document role & compensation in Citadel HRIS system', 'department' => 'PCCM', 'timeline' => 'Week 1', 'assignedRole' => 'PCCM / HR Coordinator', 'dueDate' => 'Week 1', 'dependsOnTaskIds' => ['sop-10']],
            ['id' => 'sop-13', 'order' => 13, 'title' => 'Complete background check (guarantors, reference checks)', 'department' => 'PCCM', 'timeline' => '1st Month', 'assignedRole' => 'PCCM / HR Coordinator', 'dueDate' => '1st Month', 'requiredDocument' => 'Guarantor Form', 'dependsOnTaskIds' => ['sop-10']],
            ['id' => 'sop-14', 'order' => 14, 'title' => 'Review policy understanding, Job Description & KPIs', 'department' => 'PCCM', 'timeline' => '1st Three Weeks', 'assignedRole' => 'PCCM / HR Coordinator', 'dueDate' => '1st Three Weeks', 'dependsOnTaskIds' => ['sop-11']],
            ['id' => 'sop-15', 'order' => 15, 'title' => 'Periodic reviews of important milestones during 90-day probation', 'department' => 'PCCM', 'timeline' => '90 Days', 'assignedRole' => 'PCCM / HR Coordinator', 'dueDate' => '90 Days', 'dependsOnTaskIds' => ['sop-14']],
            ['id' => 'sop-16', 'order' => 16, 'title' => 'New hire evaluation with manager and confirmation', 'department' => 'PCCM', 'timeline' => '90 Days', 'assignedRole' => 'PCCM / HR Coordinator', 'dueDate' => '90 Days', 'dependsOnTaskIds' => ['sop-15']],
            // Finance Week 1 (17-18)
            ['id' => 'sop-17', 'order' => 17, 'title' => 'Add new employee to monthly payroll template', 'department' => 'Finance', 'timeline' => 'Week 1', 'assignedRole' => 'Finance & Payroll Officer', 'dueDate' => 'Week 1', 'requiredDocument' => 'Bank Bio-data', 'dependsOnTaskIds' => ['sop-12']],
            ['id' => 'sop-18', 'order' => 18, 'title' => 'Confirm employee financial and pension details (RSA PIN)', 'department' => 'Finance', 'timeline' => 'Week 1', 'assignedRole' => 'Finance & Payroll Officer', 'dueDate' => 'Week 1', 'dependsOnTaskIds' => ['sop-12']],
            // Manager Ongoing (19)
            ['id' => 'sop-19', 'order' => 19, 'title' => 'Conduct recurring one-on-one check-in meetings', 'department' => 'Manager', 'timeline' => '90 Days', 'assignedRole' => 'Line Manager', 'dueDate' => '90 Days', 'dependsOnTaskIds' => ['sop-08']],
        ];

        $sopTemplate = OnboardingChecklistTemplate::firstOrCreate(
            ['title' => 'The Citadel Global Community Church — Standard Onboarding Checklist'],
            [
                'category' => 'General',
                'target_audience' => 'All Citadel Employees & Ministers',
                'duration' => '3 Months',
                'description' => 'Official 19-task induction schedule and task allocation breakdown coordinated by PCCM, Line Manager, IT, Finance, and Mentor. Approved 30 March 2024.',
                'task_data' => $sopTasks,
                'created_by_user_id' => $hrUser->id,
                'version' => 1,
            ]
        );

        $jonathan = $seededEmployees['CGCC-005'] ?? null;
        $nadia = $seededEmployees['CGCC-003'] ?? null;
        if ($jonathan && OnboardingJourney::count() === 0) {
            $journeyTasks = array_map(function (array $task) {
                $done = in_array($task['id'], ['sop-01', 'sop-03', 'sop-05', 'sop-10'], true);

                return [
                    ...$task,
                    'isCompleted' => $done,
                    'completedAt' => $done ? now()->subDays(2)->toISOString() : null,
                ];
            }, $sopTasks);

            OnboardingJourney::create([
                'employee_record_id' => $jonathan->id,
                'version' => 1,
                'journey_data' => [
                    'employeeId' => (string) $jonathan->id,
                    'employeeName' => $jonathan->full_name,
                    'staffId' => $jonathan->staff_id,
                    'jobTitle' => $jonathan->job_title,
                    'departmentName' => $jonathan->department?->name ?? 'ICT',
                    'entityName' => $jonathan->entity?->name ?? 'Citadel Global Community Church (CGCC)',
                    'startDate' => now()->subDays(5)->toDateString(),
                    'checklistId' => (string) $sopTemplate->id,
                    'checklistTitle' => $sopTemplate->title,
                    'mentorName' => $nadia?->full_name ?? 'Nadia Safitri',
                    'mentorBuddyName' => $nadia?->full_name ?? 'Nadia Safitri',
                    'overallProgressPercent' => (int) round(4 * 100 / count($journeyTasks)),
                    'status' => 'In Progress',
                    'tasks' => $journeyTasks,
                    'requiredDocuments' => [
                        ['id' => 'doc-bio', 'name' => 'Employee Bio-Data Form', 'isSubmitted' => true, 'submittedAt' => now()->subDays(4)->toDateString()],
                        ['id' => 'doc-emg', 'name' => 'Emergency Contact Information', 'isSubmitted' => true, 'submittedAt' => now()->subDays(4)->toDateString()],
                        ['id' => 'doc-ben', 'name' => 'Benefits Enrollment Paperwork (HMO / Pension)', 'isSubmitted' => false],
                        ['id' => 'doc-pay', 'name' => 'Payroll & Bank Account Details', 'isSubmitted' => false],
                        ['id' => 'doc-hbk', 'name' => 'Employee Handbook featuring all company policies', 'isSubmitted' => false],
                        ['id' => 'doc-sop', 'name' => 'Standard Operating Procedure (SOP) manual', 'isSubmitted' => false],
                        ['id' => 'doc-nda', 'name' => 'Non-disclosure agreement, non-compete, or confidentiality agreement', 'isSubmitted' => false, 'isConditional' => true, 'conditionNote' => 'Conditional (if applicable): Required for roles with access to confidential, proprietary, or financial data.'],
                    ],
                    'orientationItems' => [
                        ['id' => 'ori-tour', 'name' => 'Show new hires office space, parking spots & break room', 'isCompleted' => true],
                        ['id' => 'ori-id', 'name' => 'Create Employee ID & Biometric Access Pass', 'isCompleted' => false],
                        ['id' => 'ori-desk', 'name' => 'Set up work space, computer, phone, and supplies', 'isCompleted' => true],
                        ['id' => 'ori-gift', 'name' => 'Place Citadel Welcome Gift (Swag Mug, T-Shirt, Stationery) on desk', 'isCompleted' => false],
                    ],
                    'teamRoster' => [
                        'managerName' => $nadia?->full_name ?? 'Nadia Safitri',
                        'pccmOfficerName' => 'Dr. Bukola Adeleke',
                        'itLeadName' => 'Engr. Femi Olatunji',
                        'financeLeadName' => 'Finance Desk',
                        'mentorBuddyName' => $nadia?->full_name ?? 'Nadia Safitri',
                    ],
                ],
            ]);
        }

        // 3. 5-Stage Offboarding Seed Request (Adaobi Nwosu -> Supervisor: Omoaholo Omoakhalen)
        $adaobi = $seededEmployees['CSOG-002'] ?? null;
        $omoaholo = $seededEmployees['CSOG-001'] ?? null;
        if ($adaobi && OffboardingRequest::count() === 0) {
            OffboardingRequest::create([
                'employee_id' => $adaobi->id,
                'manager_id' => $omoaholo?->id,
                'manager_name' => $omoaholo?->full_name ?? 'Omoaholo Omoakhalen',
                'resignation_date' => now()->toDateString(),
                'proposed_last_day' => now()->addDays(35)->toDateString(),
                'notice_period_days' => 35,
                'notice_compliant' => true,
                'reason' => 'Relocation & Personal Family Transition',
                'manager_endorsed' => false,
                'hr_verified' => false,
                'status' => 'SUBMITTED',
                'clearances' => ['it' => false, 'facilities' => false, 'finance' => false, 'hr' => false],
                'clearance_notes' => [],
                'created_by_user_id' => $hrUser->id,
                'version' => 1,
            ]);
        }
    }
}
