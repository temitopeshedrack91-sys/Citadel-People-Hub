<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeLeaveBalance;
use App\Models\Entity;
use App\Models\LeavePolicy;
use App\Models\User;
use App\Repositories\EmployeeRepository;
use App\Repositories\OrganizationRepository;
use App\Services\EmployeeHierarchyService;
use App\Services\RealtimeEventService;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Manages employee master directory records, supervisor hierarchy, and organizational placement.
 */
class EmployeeController extends Controller
{
    public function __construct(
        private readonly EmployeeRepository $employees,
        private readonly OrganizationRepository $organizations,
        private readonly EmployeeHierarchyService $hierarchy,
    ) {}

    /**
     * List employees matching optional filters within caller's organizational/hierarchy scope.
     *
     * GET /api/v1/employees
     */
    public function index(Request $request): JsonResponse
    {
        $query = $this->scopedQuery($request->user())
            ->with(['entity', 'department', 'supervisor'])
            ->withCount('directReports');

        $this->employees->applyDirectoryFilters(
            $query,
            $request->filled('entityId') ? $request->string('entityId')->toString() : null,
            $request->filled('departmentId') ? $request->input('departmentId') : null,
            $request->filled('search') ? $request->string('search')->toString() : null
        );

        return response()->json([
            'data' => $query->orderBy('full_name')->limit(500)->get()->map(
                fn (Employee $employee) => $this->present($employee, $request)
            ),
        ]);
    }

    /**
     * Retrieve single employee profile, organizational relationships, and hierarchy counts.
     *
     * GET /api/v1/employees/{employee}
     */
    public function show(Request $request, Employee $employee): JsonResponse
    {
        abort_unless($this->scopedQuery($request->user())->whereKey($employee->id)->exists(), 404);

        $employee->load(['entity', 'department', 'supervisor'])->loadCount('directReports');

        return response()->json(['data' => $this->present($employee, $request)]);
    }

    /**
     * Retrieve an employee's upward supervisor chain and downward direct reports.
     *
     * GET /api/v1/employees/{employee}/hierarchy
     */
    public function hierarchy(Request $request, Employee $employee): JsonResponse
    {
        abort_unless($this->scopedQuery($request->user())->whereKey($employee->id)->exists(), 404);

        $employee->load(['entity', 'department', 'supervisor']);
        $supervisorChain = $this->hierarchy->getSupervisorChain($employee);
        $directReports = $this->hierarchy->getDirectReports($employee);

        return response()->json([
            'data' => [
                'employee' => $this->presentDirectorySummary($employee),
                'supervisorChain' => array_map(fn (Employee $sup) => $this->presentDirectorySummary($sup), $supervisorChain),
                'directReports' => $directReports->map(fn (Employee $rep) => $this->presentDirectorySummary($rep))->values(),
            ],
        ]);
    }

    /**
     * Create an employee master record within caller's organizational scope.
     *
     * POST /api/v1/employees
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorizeRole($request);
        $data = $this->validated($request);

        abort_unless(RoleAuthorization::canManageEmployeeScope(
            $request->user(),
            $data['entityId'],
            (int) $data['departmentId'],
        ), 403, 'You are not authorized to create an employee in this organization scope.');

        $employee = DB::transaction(function () use ($request, $data) {
            $employee = Employee::create($this->toDatabase($data));
            $this->seedDefaultLeaveBalances($employee);
            AuditLogger::record($request, 'Employee Records', 'Created employee', $employee->id, $employee->full_name, null, 'Created');
            RealtimeEventService::publish('employees', 'INSERT', $employee->id, ['staffId' => $employee->staff_id], (int) $request->user()->id);

            return $employee;
        });

        $employee->load(['entity', 'department', 'supervisor'])->loadCount('directReports');

        return response()->json(['data' => $this->present($employee, $request)], 201);
    }

    /**
     * Update employee details, department/entity placement, or supervisor.
     *
     * PATCH /api/v1/employees/{employee}
     */
    public function update(Request $request, Employee $employee): JsonResponse
    {
        $this->authorizeRole($request);
        abort_unless(RoleAuthorization::canManageEmployee($request->user(), $employee), 403, 'You are not authorized to update this employee.');
        $data = $this->validated($request, $employee);

        abort_unless(RoleAuthorization::canManageEmployeeScope(
            $request->user(),
            $data['entityId'] ?? $employee->entity_id,
            (int) ($data['departmentId'] ?? $employee->department_id),
        ), 403, 'You are not authorized to move an employee outside your organization scope.');

        DB::transaction(function () use ($request, $employee, $data): void {
            $lockedEmployee = Employee::query()->lockForUpdate()->findOrFail($employee->id);
            $previousStaffId = $lockedEmployee->staff_id;
            $previousName = $lockedEmployee->full_name;
            $lockedEmployee->update($this->toDatabase($data));

            if ($lockedEmployee->full_name !== $previousName) {
                Employee::query()
                    ->where('manager_id', (string) $lockedEmployee->id)
                    ->update(['manager_name' => $lockedEmployee->full_name]);
            }

            $this->syncUserAccounts($lockedEmployee, $previousStaffId);
            AuditLogger::record($request, 'Employee Records', 'Updated employee', $lockedEmployee->id, $lockedEmployee->full_name, null, 'Updated');
            RealtimeEventService::publish('employees', 'UPDATE', $lockedEmployee->id, ['staffId' => $lockedEmployee->staff_id], (int) $request->user()->id);
        });

        $fresh = $employee->fresh(['entity', 'department', 'supervisor'])->loadCount('directReports');

        return response()->json(['data' => $this->present($fresh, $request)]);
    }

    /**
     * Mark an employee record as Inactive and disable linked system login accounts.
     *
     * DELETE /api/v1/employees/{employee}
     */
    public function destroy(Request $request, Employee $employee): JsonResponse
    {
        $this->authorizeRole($request);
        abort_unless(RoleAuthorization::canManageEmployee($request->user(), $employee), 403, 'You are not authorized to deactivate this employee.');
        DB::transaction(function () use ($request, $employee): void {
            $lockedEmployee = Employee::query()->lockForUpdate()->findOrFail($employee->id);
            $lockedEmployee->update(['status' => 'Inactive']);
            $this->deactivateUserAccounts($lockedEmployee->staff_id);
            AuditLogger::record($request, 'Employee Records', 'Deactivated employee', $lockedEmployee->id, $lockedEmployee->full_name, 'Active', 'Inactive', 'Warning');
            RealtimeEventService::publish('employees', 'UPDATE', $lockedEmployee->id, ['status' => 'Inactive'], (int) $request->user()->id);
        });

        return response()->json(['message' => 'Employee deactivated.']);
    }

    private function scopedQuery($user): Builder
    {
        return RoleAuthorization::visibleEmployees($user);
    }

    private function authorizeRole(Request $request): void
    {
        abort_unless(RoleAuthorization::canManageEmployeeRecords($request->user()), 403, 'You are not authorized to manage employee records.');
    }

    private function syncUserAccounts(Employee $employee, string $previousStaffId): void
    {
        $accounts = User::query()->where('staff_id', $previousStaffId)->get();
        foreach ($accounts as $account) {
            $account->forceFill([
                'staff_id' => $employee->staff_id,
                'entity_id' => $employee->entity_id,
                'department_id' => $employee->department_id,
                'job_title' => $employee->job_title,
            ])->save();
        }

        if (! in_array($employee->status, ['Active', 'Probation', 'Confirmed', 'On Leave'], true)) {
            $this->deactivateUserAccounts($employee->staff_id);
        }
    }

    private function deactivateUserAccounts(string $staffId): void
    {
        User::query()->where('staff_id', $staffId)->get()->each(function (User $user): void {
            $user->forceFill(['is_active' => false])->save();
            $user->tokens()->delete();
        });
    }

    private function seedDefaultLeaveBalances(Employee $employee): void
    {
        $year = (int) date('Y');
        $policies = LeavePolicy::query()
            ->where('is_active', true)
            ->orderByDesc('effective_year')
            ->get()
            ->unique('leave_category_id');

        foreach ($policies as $policy) {
            EmployeeLeaveBalance::firstOrCreate(
                [
                    'employee_id' => $employee->id,
                    'leave_category_id' => $policy->leave_category_id,
                    'year' => $year,
                ],
                [
                    'total_days' => (float) $policy->days_allowed,
                    'used_days' => 0,
                    'pending_days' => 0,
                    'remaining_days' => (float) $policy->days_allowed,
                ]
            );
        }
    }

    private function validated(Request $request, ?Employee $employee = null): array
    {
        $input = $request->all();
        if (array_key_exists('entityId', $input) && $input['entityId'] !== null && $input['entityId'] !== '') {
            $input['entityId'] = Entity::normalizeEntityId((string) $input['entityId']) ?? $input['entityId'];
        }
        if (array_key_exists('departmentId', $input) && $input['departmentId'] !== null && $input['departmentId'] !== '') {
            $input['departmentId'] = Department::normalizeDepartmentId($input['departmentId']) ?? $input['departmentId'];
        }
        if (array_key_exists('managerId', $input) && ($input['managerId'] === '' || $input['managerId'] === 'none')) {
            $input['managerId'] = null;
        }
        $request->replace($input);

        $required = $employee ? 'sometimes' : 'required';
        $data = $request->validate([
            'staffId' => [$required, 'string', 'max:50', Rule::unique('employees', 'staff_id')->ignore($employee?->id)],
            'biometricDeviceId' => ['nullable', 'string', 'max:100', Rule::unique('employees', 'biometric_device_id')->ignore($employee?->id)],
            'fullName' => [$required, 'string', 'max:180'],
            'firstName' => [$required, 'string', 'max:100'],
            'lastName' => [$required, 'string', 'max:100'],
            'profilePhoto' => ['nullable', 'url', 'max:2048'],
            'dateOfBirth' => ['nullable', 'date_format:Y-m-d'],
            'gender' => ['nullable', Rule::in(['Male', 'Female'])],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email:rfc', 'max:254'],
            'address' => ['nullable', 'string', 'max:2000'],
            'emergencyContact' => ['nullable', 'array'],
            'nextOfKin' => ['nullable', 'array'],
            'entityId' => [$required, 'string', 'exists:entities,id'],
            'departmentId' => [$required, 'exists:departments,id'],
            'jobTitle' => [$required, 'string', 'max:180'],
            'gradeLevel' => ['nullable', 'string', 'max:80'],
            'employmentType' => ['nullable', 'string', 'max:50'],
            'employmentDate' => ['nullable', 'date_format:Y-m-d'],
            'confirmationDate' => ['nullable', 'date_format:Y-m-d'],
            'managerId' => ['nullable', 'integer', 'exists:employees,id'],
            'managerName' => ['nullable', 'string', 'max:180'],
            'contractStatus' => ['nullable', 'string', 'max:50'],
            'yearsOfService' => ['sometimes', 'integer', 'min:0', 'max:80'],
            'qualifications' => ['nullable', 'array'],
            'certifications' => ['nullable', 'array'],
            'bankPayroll' => ['nullable', 'array'],
            'pensionHmo' => ['nullable', 'array'],
            'status' => ['sometimes', Rule::in(['Active', 'Probation', 'Confirmed', 'On Leave', 'Suspended', 'Resigned', 'Terminated', 'Retired', 'Inactive'])],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        // Enforce Entity <-> Department consistency
        $departmentId = $data['departmentId'] ?? $employee?->department_id;
        $entityId = $data['entityId'] ?? $employee?->entity_id;
        $department = $departmentId ? $this->organizations->findDepartment($departmentId) : null;
        if ($department && $entityId && $department->entity_id !== $entityId) {
            throw ValidationException::withMessages([
                'departmentId' => ['The selected department does not belong to the selected entity.'],
            ]);
        }

        // Enforce acyclic supervisor hierarchy and sync supervisor name from Phase 1 record
        if (array_key_exists('managerId', $data)) {
            $managerId = $data['managerId'] !== null ? (int) $data['managerId'] : null;
            $this->hierarchy->assertNoCycle($employee?->id, $managerId);

            if ($managerId !== null) {
                $supervisor = $this->employees->findById($managerId);
                $data['managerId'] = (string) $managerId;
                $data['managerName'] = $supervisor?->full_name;
            } else {
                $data['managerId'] = null;
                $data['managerName'] = null;
            }
        }

        return $data;
    }

    private function toDatabase(array $data): array
    {
        $map = [
            'staffId' => 'staff_id', 'biometricDeviceId' => 'biometric_device_id', 'fullName' => 'full_name', 'firstName' => 'first_name',
            'lastName' => 'last_name', 'profilePhoto' => 'profile_photo', 'dateOfBirth' => 'date_of_birth',
            'emergencyContact' => 'emergency_contact', 'nextOfKin' => 'next_of_kin', 'entityId' => 'entity_id',
            'departmentId' => 'department_id', 'jobTitle' => 'job_title', 'gradeLevel' => 'grade_level',
            'employmentType' => 'employment_type', 'employmentDate' => 'employment_date',
            'confirmationDate' => 'confirmation_date', 'managerId' => 'manager_id', 'managerName' => 'manager_name',
            'contractStatus' => 'contract_status', 'yearsOfService' => 'years_of_service',
            'bankPayroll' => 'bank_payroll', 'pensionHmo' => 'pension_hmo',
        ];
        $result = [];
        foreach ($data as $key => $value) {
            $result[$map[$key] ?? $key] = $value;
        }

        return $result;
    }

    private function presentDirectorySummary(Employee $employee): array
    {
        $employee->loadMissing(['entity', 'department']);

        return [
            'id' => (string) $employee->id,
            'staffId' => $employee->staff_id,
            'fullName' => $employee->full_name,
            'firstName' => $employee->first_name,
            'lastName' => $employee->last_name,
            'jobTitle' => $employee->job_title,
            'entityId' => $employee->entity_id,
            'entityName' => $employee->entity?->name,
            'departmentId' => $employee->department_id ? (string) $employee->department_id : null,
            'departmentName' => $employee->department?->name,
            'email' => $employee->email,
            'phone' => $employee->phone,
            'managerId' => $employee->manager_id ? (string) $employee->manager_id : null,
            'managerName' => $employee->manager_name,
            'status' => $employee->status,
        ];
    }

    private function present(Employee $employee, Request $request): array
    {
        $employee->loadMissing(['entity', 'department', 'supervisor']);
        $supervisorName = $employee->supervisor?->full_name ?? $employee->manager_name;
        $data = [
            'id' => $employee->id,
            'staffId' => $employee->staff_id,
            'fullName' => $employee->full_name,
            'firstName' => $employee->first_name,
            'lastName' => $employee->last_name,
            'profilePhoto' => $employee->profile_photo,
            'dateOfBirth' => '',
            'gender' => $employee->gender,
            'phone' => $employee->phone,
            'email' => $employee->email,
            'address' => '',
            'emergencyContact' => ['name' => '', 'relationship' => '', 'phone' => ''],
            'nextOfKin' => ['name' => '', 'relationship' => '', 'phone' => '', 'address' => ''],
            'entityId' => $employee->entity_id,
            'entityName' => $employee->entity?->name,
            'departmentId' => $employee->department_id,
            'departmentName' => $employee->department?->name,
            'jobTitle' => $employee->job_title,
            'gradeLevel' => $employee->grade_level,
            'employmentType' => $employee->employment_type,
            'employmentDate' => $employee->employment_date?->format('Y-m-d'),
            'confirmationDate' => $employee->confirmation_date?->format('Y-m-d'),
            'managerId' => $employee->manager_id ? (string) $employee->manager_id : null,
            'managerName' => $supervisorName,
            'directReportsCount' => (int) ($employee->direct_reports_count ?? $employee->directReports()->count()),
            'contractStatus' => $employee->contract_status,
            'yearsOfService' => $employee->years_of_service,
            'qualifications' => $employee->qualifications ?? [],
            'certifications' => $employee->certifications ?? [],
            'bankPayroll' => ['bankName' => '', 'accountNumber' => '', 'accountName' => '', 'salaryGrade' => '', 'currency' => 'NGN'],
            'pensionHmo' => ['pfaName' => '', 'rsaPin' => '', 'hmoProvider' => '', 'hmoPlan' => '', 'hmoIdNumber' => ''],
            'status' => $employee->status,
            'notes' => $employee->notes,
        ];

        if (RoleAuthorization::canViewSensitiveEmployeeData($request->user())) {
            $data = array_merge($data, [
                'dateOfBirth' => $employee->date_of_birth,
                'biometricDeviceId' => $employee->biometric_device_id,
                'address' => $employee->address,
                'emergencyContact' => $employee->emergency_contact,
                'nextOfKin' => $employee->next_of_kin,
                'bankPayroll' => $employee->bank_payroll,
                'pensionHmo' => $employee->pension_hmo,
            ]);
        }

        return $data;
    }
}
