<?php

namespace Database\Seeders;

use App\Models\AttendanceRecord;
use App\Models\Candidate;
use App\Models\ClaimEvent;
use App\Models\ClaimExpense;
use App\Models\ClaimRequest;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeDeduction;
use App\Models\EmployeeLeaveBalance;
use App\Models\EmployeeLoan;
use App\Models\EmployeeProvidentFund;
use App\Models\EmployeeSalaryTemplate;
use App\Models\Entity;
use App\Models\ExpenseType;
use App\Models\HubDocument;
use App\Models\JobVacancy;
use App\Models\Kpi;
use App\Models\LeaveCategory;
use App\Models\LeavePolicy;
use App\Models\LeaveRequest;
use App\Models\OffboardingRequest;
use App\Models\OnboardingChecklistTemplate;
use App\Models\OnboardingJourney;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Models\PerformanceReview;
use App\Models\Project;
use App\Models\RecruitmentRequisition;
use App\Models\ReviewRating;
use App\Models\SalaryTemplate;
use App\Models\Task;
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
            [
                'id' => 'CGCC',
                'name' => 'Citadel Global Community Church (CGCC)',
                'short_code' => 'CGCC',
                'head_of_entity' => 'Pastor Christian Ike, Pastor Biola Adeyoola & Pastor Segun Bakare',
                'description' => 'Flagship church organization, ministry operations, pastoral care, and GEC shared services.',
                'is_active' => true,
            ],
            [
                'id' => 'CSOG',
                'name' => 'Citadel School of Government',
                'short_code' => 'CSOG',
                'head_of_entity' => 'Mr. Omoaholo Omoakhalen (Director)',
                'description' => 'Academic and leadership institution developing ethical governance leaders and policy practitioners.',
                'is_active' => true,
            ],
            [
                'id' => 'HOLDINGS',
                'name' => 'Citadel Holdings',
                'short_code' => 'Holdings',
                'head_of_entity' => 'Ms. Olufisayo Bakare (CEO)',
                'description' => 'Commercial and enterprise arm operating retail, hospitality, workspaces, and creative ventures.',
                'is_active' => true,
            ],
        ];
        $entityIds = [];
        foreach ($entities as $attributes) {
            $entity = Entity::updateOrCreate(['short_code' => $attributes['short_code']], $attributes);
            $entityIds[$attributes['short_code']] = $entity->id;
        }

        $departments = [
            ['entity' => 'CGCC', 'name' => 'Finance', 'code' => 'CGCC-FIN', 'head' => 'Finance & Account Manager', 'business_head' => 'Group Executive Council (GEC)', 'email' => null, 'reports_to' => 'Group Executive Council (GEC)', 'gec' => true, 'desc' => 'Reports to Group Executive Council (GEC) · GEC Shared Service'],
            ['entity' => 'CGCC', 'name' => 'People, Culture & Change', 'code' => 'CGCC-PCCM', 'head' => 'Mrs. Sussan Afuwape (People, Culture & Change Manager)', 'business_head' => 'Group Executive Council (GEC)', 'email' => 's.afuwape@thecitadelglobal.org', 'reports_to' => 'Group Executive Council (GEC)', 'gec' => true, 'desc' => 'Reports to Group Executive Council (GEC) · GEC Shared Service'],
            ['entity' => 'CGCC', 'name' => 'Facilities', 'code' => 'CGCC-FAC', 'head' => 'Facilities & Resource Manager', 'business_head' => 'Pastor Christian Ike', 'email' => null, 'reports_to' => 'Pastor Christian Ike', 'gec' => true, 'desc' => 'Reports to Pastor Christian Ike · GEC Shared Service'],
            ['entity' => 'CGCC', 'name' => 'Security', 'code' => 'CGCC-SEC', 'head' => 'Chief Security Officer', 'business_head' => 'Pastor Christian Ike', 'email' => 'olubunmi.ojo@thecitadelglobal.org', 'reports_to' => 'Pastor Christian Ike', 'gec' => true, 'desc' => 'Reports to Pastor Christian Ike · GEC Shared Service'],
            ['entity' => 'CGCC', 'name' => "S.O.'s Office / Admin", 'code' => 'CGCC-SO', 'head' => 'Pastor Biola Adeyoola (Pastor, Planning & Operations)', 'business_head' => 'Pastor Biola Adeyoola', 'email' => 'b.adeyoola@thecitadelglobal.org', 'reports_to' => 'Pastor Biola Adeyoola', 'gec' => true, 'desc' => 'Reports to Pastor Biola Adeyoola · GEC Shared Service'],
            ['entity' => 'CGCC', 'name' => 'Protocol', 'code' => 'CGCC-PRO', 'head' => 'Pastor Biola Adeyoola (Pastor, Planning & Operations)', 'business_head' => 'Pastor Biola Adeyoola', 'email' => 'b.adeyoola@thecitadelglobal.org', 'reports_to' => 'Pastor Biola Adeyoola', 'gec' => true, 'desc' => 'Reports to Pastor Biola Adeyoola · GEC Shared Service'],
            ['entity' => 'CGCC', 'name' => 'ICT', 'code' => 'CGCC-ICT', 'head' => 'Engr. Femi Olatunji (ICT Manager)', 'business_head' => 'Pastor Segun Bakare', 'email' => null, 'reports_to' => 'Pastor Segun Bakare', 'gec' => true, 'desc' => 'Reports to Pastor Segun Bakare · GEC Shared Service'],
            ['entity' => 'CGCC', 'name' => 'Transport & Logistics', 'code' => 'CGCC-LOG', 'head' => 'Transport Lead', 'business_head' => 'Pastor Christian Ike', 'email' => 'j.osumili@thecitadelglobal.org', 'reports_to' => 'Facilities & Resource Manager', 'gec' => false, 'desc' => 'Reports to Facilities & Resource Manager'],
            ['entity' => 'CSOG', 'name' => 'Academy & Programmes', 'code' => 'CSOG-ACAD', 'head' => 'Academy Liaison Officer', 'business_head' => 'Mr. Omoaholo Omoakhalen', 'email' => 'clementina.busayo@citadelschoolofgovernment.org', 'reports_to' => 'Director School of Government (Mr. Omoaholo Omoakhalen)', 'gec' => false, 'desc' => 'Reports to Director School of Government (Mr. Omoaholo Omoakhalen)'],
            ['entity' => 'CSOG', 'name' => 'Admin & Operations', 'code' => 'CSOG-OPS', 'head' => 'Admin & Operations Officer', 'business_head' => 'Mr. Omoaholo Omoakhalen', 'email' => 'fatima.pedro-lawrence@citadelschoolofgovernment.org', 'reports_to' => 'Director School of Government (Mr. Omoaholo Omoakhalen)', 'gec' => false, 'desc' => 'Reports to Director School of Government (Mr. Omoaholo Omoakhalen)'],
            ['entity' => 'Holdings', 'name' => 'Bookshop', 'code' => 'CH-BOOK', 'head' => 'Bookshop Officer', 'business_head' => 'Ms. Olufisayo Bakare', 'email' => null, 'reports_to' => 'Business Manager (Citadel Holdings)', 'gec' => false, 'desc' => 'Reports to Business Manager (Citadel Holdings)'],
            ['entity' => 'Holdings', 'name' => 'Cafe', 'code' => 'CH-CAFE', 'head' => 'Cafe Supervisor', 'business_head' => 'Ms. Olufisayo Bakare', 'email' => null, 'reports_to' => 'Business Manager (Citadel Holdings)', 'gec' => false, 'desc' => 'Reports to Business Manager (Citadel Holdings)'],
            ['entity' => 'Holdings', 'name' => 'Workstation', 'code' => 'CH-WORK', 'head' => 'Workstation Supervisor', 'business_head' => 'Ms. Olufisayo Bakare', 'email' => null, 'reports_to' => 'Business Manager (Citadel Holdings)', 'gec' => false, 'desc' => 'Reports to Business Manager (Citadel Holdings)'],
            ['entity' => 'Holdings', 'name' => 'Asabi Aladire', 'code' => 'CH-ASABI', 'head' => 'Shop Attendant', 'business_head' => 'Ms. Olufisayo Bakare', 'email' => null, 'reports_to' => 'Business Manager (Citadel Holdings)', 'gec' => false, 'desc' => 'Reports to Business Manager (Citadel Holdings)'],
            ['entity' => 'Holdings', 'name' => 'Sales & Business Development', 'code' => 'CH-SBD', 'head' => 'Business Manager', 'business_head' => 'Ms. Olufisayo Bakare', 'email' => null, 'reports_to' => 'CEO / Business Head (Ms. Olufisayo Bakare)', 'gec' => false, 'desc' => 'Reports to CEO / Business Head (Ms. Olufisayo Bakare)'],
        ];
        $deptByCode = [];
        foreach ($departments as $attributes) {
            $dept = Department::updateOrCreate(
                ['entity_id' => $entityIds[$attributes['entity']], 'code' => $attributes['code']],
                [
                    'name' => $attributes['name'],
                    'head_of_department_name' => $attributes['head'],
                    'business_head_name' => $attributes['business_head'],
                    'head_email' => $attributes['email'],
                    'reports_to' => $attributes['reports_to'],
                    'is_gec_shared_service' => $attributes['gec'],
                    'description' => $attributes['desc'],
                    'is_active' => true,
                ],
            );
            $deptByCode[$attributes['code']] = $dept;
        }

        // Seed Leave Categories & Policies aligned with CGCC Workbook Sheet 7
        $year = (int) date('Y');
        $leaveSpecs = [
            ['name' => 'Annual Leave', 'code' => 'AL', 'days' => 21, 'is_paid' => true],
            ['name' => 'Sick Leave', 'code' => 'SL', 'days' => 10, 'is_paid' => true],
            ['name' => 'Maternity Leave', 'code' => 'ML', 'days' => 90, 'is_paid' => true],
            ['name' => 'Paternity Leave', 'code' => 'PL', 'days' => 14, 'is_paid' => true],
            ['name' => 'Exam Leave', 'code' => 'EL', 'days' => 21, 'is_paid' => true],
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
                'full_name' => 'Mr. Omoaholo Omoakhalen',
                'email' => 'omoaholo@citadel.ng',
                'dept_code' => 'CSOG-ACAD',
                'job_title' => 'Director School of Government',
                'role' => 'BUSINESS_HEAD',
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
            [
                'staff_id' => 'CH-001',
                'first_name' => 'Olufisayo',
                'last_name' => 'Bakare',
                'full_name' => 'Ms. Olufisayo Bakare',
                'email' => 'o.bakare@citadelholdings.org',
                'dept_code' => 'CH-SBD',
                'job_title' => 'CEO / Business Head — Citadel Holdings',
                'role' => 'BUSINESS_HEAD',
                'manager_staff_id' => 'CGCC-000',
            ],
            [
                'staff_id' => 'CH-005',
                'first_name' => 'Ifeanyi',
                'last_name' => 'Okonkwo',
                'full_name' => 'Ifeanyi Okonkwo',
                'email' => 'i.okonkwo@citadelholdings.org',
                'dept_code' => 'CH-WORK',
                'job_title' => 'Workstation Supervisor',
                'role' => 'EMPLOYEE',
                'manager_staff_id' => 'CH-001',
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
                'leave_type' => 'Compassionate Leave',
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
                ->where('leave_category_id', $categories['Compassionate Leave']['category']->id)
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
        $this->seedEnterpriseModules($seededEmployees, $deptByCode, $hrUser);
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

    private function seedEnterpriseModules(array $seededEmployees, array $deptByCode, User $hrUser): void
    {
        $femi = $seededEmployees['CGCC-002'] ?? null;
        $nadia = $seededEmployees['CGCC-003'] ?? null;
        $bayu = $seededEmployees['CGCC-004'] ?? null;
        $jonathan = $seededEmployees['CGCC-005'] ?? null;
        $bukola = $seededEmployees['CGCC-001'] ?? null;
        $sussan = $seededEmployees['CGCC-007'] ?? null;

        // 1. Projects & Trellis Tasks
        if (Project::count() === 0) {
            $ictDept = $deptByCode['CGCC-ICT'] ?? null;
            $pccmDept = $deptByCode['CGCC-PCCM'] ?? null;

            $projHub = Project::create([
                'title' => 'Citadel People Hub',
                'code' => 'CPH-2026',
                'description' => 'Core HRIS, Payroll, Leave & Attendance platform rollout across CGCC, CSOG, and Holdings.',
                'department_id' => $ictDept?->id,
                'status' => 'active',
                'priority' => 'high',
                'start_date' => now()->subDays(30)->toDateString(),
                'end_date' => now()->addDays(60)->toDateString(),
                'budget' => 4500000,
                'created_by' => $hrUser->id,
            ]);

            $projPayroll = Project::create([
                'title' => 'Payroll & Biometric Sync',
                'code' => 'PAY-2026',
                'description' => 'Automated monthly payroll cycles, PAYE/Pension compliance, and biometric punch import.',
                'department_id' => $pccmDept?->id,
                'status' => 'active',
                'priority' => 'high',
                'start_date' => now()->subDays(20)->toDateString(),
                'end_date' => now()->addDays(45)->toDateString(),
                'budget' => 2800000,
                'created_by' => $hrUser->id,
            ]);

            $tasks = [
                ['project_id' => $projHub->id, 'department_id' => $ictDept?->id, 'title' => 'Verify biometric punch CSV import', 'description' => 'Validate device timestamp parsing and unmatched staff alerts.', 'priority' => 'high', 'status' => 'todo', 'due_date' => now()->addDays(3)->toDateString(), 'assigned_to_employee_id' => $bayu?->id, 'created_by_employee_id' => $femi?->id, 'labels' => ['Tech', 'High'], 'estimated_hours' => 6, 'assignment_status' => 'accepted'],
                ['project_id' => $projHub->id, 'department_id' => $ictDept?->id, 'title' => 'Configure M365 SSO directory sync', 'description' => 'Map Entra ID groups to Citadel RBAC roles.', 'priority' => 'medium', 'status' => 'todo', 'due_date' => now()->addDays(7)->toDateString(), 'assigned_to_employee_id' => $jonathan?->id, 'created_by_employee_id' => $femi?->id, 'labels' => ['Feature', 'Tech'], 'estimated_hours' => 8, 'assignment_status' => 'accepted'],
                ['project_id' => $projHub->id, 'department_id' => $ictDept?->id, 'title' => 'Live SSE realtime notification stream', 'description' => 'Ensure instant updates across Leave, Payroll, and Claims.', 'priority' => 'urgent', 'status' => 'in_progress', 'due_date' => now()->addDays(2)->toDateString(), 'assigned_to_employee_id' => $femi?->id, 'created_by_employee_id' => $bukola?->id, 'labels' => ['Feature', 'High'], 'estimated_hours' => 10, 'assignment_status' => 'accepted'],
                ['project_id' => $projPayroll->id, 'department_id' => $pccmDept?->id, 'title' => 'Finalize Q4 CGCC payroll worksheet', 'description' => 'Reconcile staff allowances, loans, and statutory pension deductions.', 'priority' => 'high', 'status' => 'in_progress', 'due_date' => now()->addDays(4)->toDateString(), 'assigned_to_employee_id' => $sussan?->id, 'created_by_employee_id' => $bukola?->id, 'labels' => ['High'], 'estimated_hours' => 5, 'assignment_status' => 'accepted'],
                ['project_id' => $projHub->id, 'department_id' => $pccmDept?->id, 'title' => 'Audit 2-stage leave approval logs', 'description' => 'Review manager and HR stage audit trail for compliance.', 'priority' => 'medium', 'status' => 'in_review', 'due_date' => now()->addDays(5)->toDateString(), 'assigned_to_employee_id' => $nadia?->id, 'created_by_employee_id' => $bukola?->id, 'labels' => ['UI'], 'estimated_hours' => 4, 'assignment_status' => 'accepted'],
                ['project_id' => $projPayroll->id, 'department_id' => $pccmDept?->id, 'title' => 'Publish November payslips & payment batch', 'description' => 'Issue official payslips and record bank disbursement references.', 'priority' => 'low', 'status' => 'done', 'due_date' => now()->subDays(1)->toDateString(), 'assigned_to_employee_id' => $sussan?->id, 'created_by_employee_id' => $bukola?->id, 'labels' => ['Feature'], 'estimated_hours' => 4, 'assignment_status' => 'accepted'],
            ];
            foreach ($tasks as $taskData) {
                Task::create($taskData);
            }
        }

        // 2. Payroll: Salary Templates, Assignments, Runs, Loans, Deductions, Provident Funds
        if (SalaryTemplate::count() === 0) {
            $execTpl = SalaryTemplate::create([
                'name' => 'Executive & Management Grade',
                'code' => 'TPL-EXEC-01',
                'pay_frequency' => 'monthly',
                'basic_salary' => 550000,
                'house_rent' => 150000,
                'medical_allowance' => 60000,
                'conveyance_allowance' => 50000,
                'other_allowance' => 40000,
                'provident_fund_percent' => 8,
                'tax_percent' => 10,
                'notes' => 'Standard executive monthly compensation package.',
                'is_active' => true,
            ]);
            $midTpl = SalaryTemplate::create([
                'name' => 'Mid-Level Specialist Grade',
                'code' => 'TPL-MID-02',
                'pay_frequency' => 'monthly',
                'basic_salary' => 320000,
                'house_rent' => 90000,
                'medical_allowance' => 40000,
                'conveyance_allowance' => 35000,
                'other_allowance' => 25000,
                'provident_fund_percent' => 8,
                'tax_percent' => 7.5,
                'notes' => 'Standard officer and specialist monthly structure.',
                'is_active' => true,
            ]);
            $jrTpl = SalaryTemplate::create([
                'name' => 'Support & Junior Staff Grade',
                'code' => 'TPL-JNR-03',
                'pay_frequency' => 'monthly',
                'basic_salary' => 180000,
                'house_rent' => 50000,
                'medical_allowance' => 25000,
                'conveyance_allowance' => 20000,
                'other_allowance' => 15000,
                'provident_fund_percent' => 8,
                'tax_percent' => 5,
                'notes' => 'Entry and support staff compensation package.',
                'is_active' => true,
            ]);

            $assignMap = [
                'CGCC-001' => $execTpl,
                'CGCC-002' => $execTpl,
                'CGCC-007' => $execTpl,
                'CGCC-003' => $midTpl,
                'CGCC-004' => $midTpl,
                'CGCC-005' => $jrTpl,
                'CSOG-001' => $execTpl,
                'HOLD-001' => $execTpl,
            ];

            $grossSum = 0;
            $dedSum = 0;
            $netSum = 0;
            $itemRows = [];
            foreach ($assignMap as $staffId => $tpl) {
                $emp = $seededEmployees[$staffId] ?? null;
                if (! $emp) {
                    continue;
                }
                $gross = (float) $tpl->basic_salary + (float) $tpl->house_rent + (float) $tpl->medical_allowance + (float) $tpl->conveyance_allowance + (float) $tpl->other_allowance;
                $pf = round($gross * ((float) $tpl->provident_fund_percent / 100), 2);
                $tax = round($gross * ((float) $tpl->tax_percent / 100), 2);
                $net = round($gross - $pf - $tax, 2);

                EmployeeSalaryTemplate::create([
                    'employee_id' => $emp->id,
                    'salary_template_id' => $tpl->id,
                    'pay_frequency' => 'monthly',
                    'basic_salary' => $tpl->basic_salary,
                    'house_rent' => $tpl->house_rent,
                    'medical_allowance' => $tpl->medical_allowance,
                    'conveyance_allowance' => $tpl->conveyance_allowance,
                    'other_allowance' => $tpl->other_allowance,
                    'gross_salary' => $gross,
                    'provident_fund_percent' => $tpl->provident_fund_percent,
                    'tax_percent' => $tpl->tax_percent,
                    'ctc_amount' => $gross * 12,
                    'effective_from' => now()->startOfYear()->toDateString(),
                ]);

                EmployeeProvidentFund::create([
                    'employee_id' => $emp->id,
                    'employee_contribution_percent' => 8,
                    'employer_contribution_percent' => 10,
                    'opening_balance' => $pf * 6,
                    'effective_from' => now()->startOfYear()->toDateString(),
                ]);

                $grossSum += $gross;
                $dedSum += ($pf + $tax);
                $netSum += $net;
                $itemRows[] = ['emp' => $emp, 'tpl' => $tpl, 'gross' => $gross, 'pf' => $pf, 'tax' => $tax, 'net' => $net];
            }

            $run = PayrollRun::create([
                'pay_frequency' => 'monthly',
                'payroll_year' => (int) date('Y'),
                'payroll_month' => (int) date('n'),
                'period_label' => date('F Y').' Monthly Consolidated Payroll',
                'period_start' => now()->startOfMonth()->toDateString(),
                'period_end' => now()->endOfMonth()->toDateString(),
                'pay_date' => now()->endOfMonth()->toDateString(),
                'status' => 'processed',
                'gross_total' => $grossSum,
                'deduction_total' => $dedSum,
                'net_total' => $netSum,
                'processed_by' => $hrUser->id,
                'processed_at' => now(),
            ]);

            foreach ($itemRows as $row) {
                PayrollItem::create([
                    'payroll_run_id' => $run->id,
                    'employee_id' => $row['emp']->id,
                    'pay_frequency' => 'monthly',
                    'basic_salary' => $row['tpl']->basic_salary,
                    'allowance_total' => $row['gross'] - (float) $row['tpl']->basic_salary,
                    'bonus_total' => 0,
                    'loan_deduction' => 0,
                    'other_deduction' => 0,
                    'provident_fund_deduction' => $row['pf'],
                    'employer_pf_contribution' => round($row['gross'] * 0.10, 2),
                    'tax_deduction' => $row['tax'],
                    'total_deduction' => $row['pf'] + $row['tax'],
                    'net_payable' => $row['net'],
                    'payment_status' => 'paid',
                    'payment_reference' => 'GTB-BATCH-'.date('Ym').'-'.$row['emp']->id,
                ]);
            }

            if ($bayu) {
                EmployeeLoan::create([
                    'employee_id' => $bayu->id,
                    'loan_reference' => 'LN-'.date('Y').'-001',
                    'principal_amount' => 240000,
                    'interest_rate_percent' => 0,
                    'installment_count' => 6,
                    'installment_amount' => 40000,
                    'issued_date' => now()->subMonths(1)->toDateString(),
                    'first_installment_date' => now()->startOfMonth()->toDateString(),
                    'status' => 'active',
                    'applied_by' => $hrUser->id,
                    'supervisor_approved_by' => $hrUser->id,
                    'supervisor_approved_at' => now()->subDays(20),
                    'final_approved_by' => $hrUser->id,
                    'final_approved_at' => now()->subDays(18),
                    'remarks' => 'Staff laptop & housing support facility.',
                ]);

                EmployeeDeduction::create([
                    'employee_id' => $bayu->id,
                    'deduction_type' => 'Welfare Cooperative',
                    'calculation_type' => 'fixed',
                    'amount' => 10000,
                    'effective_from' => now()->startOfMonth()->toDateString(),
                    'frequency' => 'monthly',
                    'reason' => 'Monthly Citadel Staff Cooperative savings',
                    'is_active' => true,
                ]);
            }
        }

        // 3. Claims & Expense Reimbursements
        if (ClaimEvent::count() === 0) {
            $evOutreach = ClaimEvent::create(['name' => 'Ministry & Outreach Logistics', 'code' => 'CLM-OUT', 'description' => 'Field outreach, transport, and community logistics', 'status' => 'ACTIVE', 'is_active' => true]);
            $evFacility = ClaimEvent::create(['name' => 'Facilities & Technical Maintenance', 'code' => 'CLM-FAC', 'description' => 'Emergency ICT and facility equipment repairs', 'status' => 'ACTIVE', 'is_active' => true]);
            $evTraining = ClaimEvent::create(['name' => 'Staff Training & Certifications', 'code' => 'CLM-TRN', 'description' => 'Approved professional development expenses', 'status' => 'ACTIVE', 'is_active' => true]);

            $expTransport = ExpenseType::create(['name' => 'Transport & Fuel', 'code' => 'EXP-TRN', 'description' => 'Official transit, ride-share, and fuel', 'status' => 'ACTIVE', 'is_active' => true]);
            $expEquip = ExpenseType::create(['name' => 'ICT & Equipment Parts', 'code' => 'EXP-EQP', 'description' => 'Cables, switches, and emergency spares', 'status' => 'ACTIVE', 'is_active' => true]);
            $expMeals = ExpenseType::create(['name' => 'Outreach & Duty Meals', 'code' => 'EXP-MEL', 'description' => 'Approved team duty meals', 'status' => 'ACTIVE', 'is_active' => true]);

            if ($bayu) {
                $c1 = ClaimRequest::create([
                    'claim_number' => 'CLM-'.date('Y').'-0001',
                    'employee_id' => $bayu->id,
                    'claim_event_id' => $evFacility->id,
                    'currency' => 'NGN',
                    'description' => 'Emergency replacement of Cisco PoE network switch for Annex',
                    'status' => 'APPROVED',
                    'total_amount' => 145000,
                    'submitted_at' => now()->subDays(3),
                    'approved_by' => $hrUser->id,
                    'approved_at' => now()->subDay(),
                ]);
                ClaimExpense::create(['claim_request_id' => $c1->id, 'expense_type_id' => $expEquip->id, 'expense_date' => now()->subDays(4)->toDateString(), 'amount' => 145000, 'currency' => 'NGN', 'note' => '8-Port Gigabit PoE Switch']);
            }
            if ($nadia) {
                $c2 = ClaimRequest::create([
                    'claim_number' => 'CLM-'.date('Y').'-0002',
                    'employee_id' => $nadia->id,
                    'claim_event_id' => $evOutreach->id,
                    'currency' => 'NGN',
                    'description' => 'Community outreach transport and team welfare',
                    'status' => 'SUBMITTED',
                    'total_amount' => 85000,
                    'submitted_at' => now()->subDay(),
                ]);
                ClaimExpense::create(['claim_request_id' => $c2->id, 'expense_type_id' => $expTransport->id, 'expense_date' => now()->subDays(2)->toDateString(), 'amount' => 55000, 'currency' => 'NGN', 'note' => 'Shuttle hire']);
                ClaimExpense::create(['claim_request_id' => $c2->id, 'expense_type_id' => $expMeals->id, 'expense_date' => now()->subDays(2)->toDateString(), 'amount' => 30000, 'currency' => 'NGN', 'note' => 'Volunteer lunch packs']);
            }
            if ($femi) {
                $c3 = ClaimRequest::create([
                    'claim_number' => 'CLM-'.date('Y').'-0003',
                    'employee_id' => $femi->id,
                    'claim_event_id' => $evTraining->id,
                    'currency' => 'NGN',
                    'description' => 'Cloud Security & Infrastructure Certification Fee',
                    'status' => 'PAID',
                    'total_amount' => 280000,
                    'submitted_at' => now()->subDays(10),
                    'approved_by' => $hrUser->id,
                    'approved_at' => now()->subDays(8),
                    'paid_by' => $hrUser->id,
                    'paid_at' => now()->subDays(6),
                ]);
                ClaimExpense::create(['claim_request_id' => $c3->id, 'expense_type_id' => $expEquip->id, 'expense_date' => now()->subDays(11)->toDateString(), 'amount' => 280000, 'currency' => 'NGN', 'note' => 'Exam voucher & study lab']);
            }
        }

        // 4. Documents
        if (HubDocument::count() === 0) {
            $docs = [
                ['title' => 'Citadel People Handbook & Code of Conduct', 'description' => 'Official employee handbook, leave rules, and workplace ethics across CGCC, CSOG, and Holdings.', 'file_name' => 'Citadel-Employee-Handbook-2026.pdf', 'storage_path' => 'documents/Citadel-Employee-Handbook-2026.pdf', 'file_size' => 2516582, 'file_type' => 'PDF', 'category' => 'Company Policy', 'access_level' => 'All Staff', 'entity_scope' => 'All Entities', 'uploaded_by' => $hrUser->id, 'version' => 'v2.1', 'version_number' => 2, 'issue_date' => now()->startOfYear()->toDateString(), 'is_sensitive' => false],
                ['title' => 'PCCM Leave Policy & Two-Stage Approval Guide', 'description' => 'Line manager Stage 1 and PCCM HR Stage 2 leave workflow policy.', 'file_name' => 'PCCM-Leave-Workflow-Policy.pdf', 'storage_path' => 'documents/PCCM-Leave-Workflow-Policy.pdf', 'file_size' => 1153433, 'file_type' => 'PDF', 'category' => 'PCCM Form / Template', 'access_level' => 'All Staff', 'entity_scope' => 'All Entities', 'uploaded_by' => $hrUser->id, 'version' => 'v1.4', 'version_number' => 1, 'issue_date' => now()->subMonths(2)->toDateString(), 'is_sensitive' => false],
                ['title' => 'ICT Information Security & Biometric SOP', 'description' => 'Data protection, Sanctum access, and biometric attendance device sync procedures.', 'file_name' => 'ICT-Security-Biometric-SOP.pdf', 'storage_path' => 'documents/ICT-Security-Biometric-SOP.pdf', 'file_size' => 1887436, 'file_type' => 'PDF', 'category' => 'Company Policy', 'access_level' => 'Department Only', 'entity_scope' => 'Citadel Global Community Church (CGCC)', 'department_scope' => 'ICT', 'uploaded_by' => $hrUser->id, 'version' => 'v1.0', 'version_number' => 1, 'issue_date' => now()->subMonths(1)->toDateString(), 'is_sensitive' => false],
            ];
            foreach ($docs as $doc) {
                HubDocument::create($doc);
            }
        }

        // 5. Attendance Records
        if (AttendanceRecord::count() === 0) {
            $today = now()->toDateString();
            $attStaff = array_filter([$bukola, $sussan, $femi, $nadia, $bayu, $jonathan]);
            foreach ($attStaff as $idx => $emp) {
                $late = $idx === 4;
                $inHour = $late ? '08:32:00' : '07:54:00';
                AttendanceRecord::create([
                    'employee_id' => $emp->id,
                    'employee_staff_id' => $emp->staff_id,
                    'employee_name' => $emp->full_name,
                    'entity_name' => $emp->entity?->name ?? 'Citadel Global Community Church (CGCC)',
                    'department_name' => $emp->department?->name ?? 'ICT',
                    'date' => $today,
                    'clock_in_time' => "{$today} {$inHour}",
                    'clock_out_time' => "{$today} 17:05:00",
                    'duration_hours' => $late ? 8.55 : 9.18,
                    'status' => $late ? 'Late' : 'Present',
                    'verification_source' => 'Biometric Device',
                    'device_id' => 'ZK-HQ-01',
                ]);
            }
        }

        // 6. Recruitment Pipeline
        if (RecruitmentRequisition::count() === 0) {
            $ictDept = $deptByCode['CGCC-ICT'] ?? null;
            $pccmDept = $deptByCode['CGCC-PCCM'] ?? null;

            $req1 = RecruitmentRequisition::create([
                'requisition_code' => 'REQ-2026-01',
                'job_title' => 'Systems & Network Engineer',
                'entity_id' => $ictDept?->entity_id,
                'department_id' => $ictDept?->id,
                'requisition_data' => [
                    'title' => 'Systems & Network Engineer',
                    'department' => 'ICT',
                    'entity' => 'Citadel Global Community Church (CGCC)',
                    'employmentType' => 'Full-Time',
                    'openings' => 1,
                    'status' => 'Open',
                    'hiringManager' => 'Engr. Femi Olatunji',
                    'priority' => 'High',
                ],
            ]);

            $vac1 = JobVacancy::create([
                'requisition_id' => $req1->id,
                'title' => 'Systems & Network Engineer',
                'department_id' => $ictDept?->id,
                'hiring_manager_id' => $femi?->id,
                'positions_count' => 1,
                'description' => 'Manage campus network infrastructure, audio-visual broadcast links, and biometric devices.',
                'status' => 'ACTIVE',
            ]);

            $vac2 = JobVacancy::create([
                'title' => 'People & Culture Associate',
                'department_id' => $pccmDept?->id,
                'hiring_manager_id' => $bukola?->id,
                'positions_count' => 1,
                'description' => 'Support onboarding journeys, employee records, and payroll administration.',
                'status' => 'ACTIVE',
            ]);

            Candidate::create(['vacancy_id' => $vac1->id, 'first_name' => 'Chinedu', 'last_name' => 'Okonkwo', 'email' => 'chinedu.okonkwo@example.com', 'phone' => '+234 803 555 0142', 'status' => 'INTERVIEW_SCHEDULED', 'notes' => 'Strong Cisco & Mikrotik experience.', 'applied_date' => now()->subDays(5)->toDateString()]);
            Candidate::create(['vacancy_id' => $vac1->id, 'first_name' => 'Amina', 'last_name' => 'Bello', 'email' => 'amina.bello@example.com', 'phone' => '+234 805 555 0198', 'status' => 'SHORTLISTED', 'notes' => '5 years enterprise sysadmin.', 'applied_date' => now()->subDays(3)->toDateString()]);
            Candidate::create(['vacancy_id' => $vac2->id, 'first_name' => 'Toluwalope', 'last_name' => 'Adeyemi', 'email' => 'tolu.adeyemi@example.com', 'phone' => '+234 809 555 0114', 'status' => 'APPLICATION_INITIATED', 'notes' => 'CIPM certified HR generalist.', 'applied_date' => now()->subDays(2)->toDateString()]);
        }
    }
}
