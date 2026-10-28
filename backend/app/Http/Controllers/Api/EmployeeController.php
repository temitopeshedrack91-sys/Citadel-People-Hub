<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    private const HR_ROLES = ['PCCM_SUPER_ADMIN'];

    public function index(Request $request): JsonResponse
    {
        $query = $this->scopedQuery($request->user())->with(['entity', 'department']);

        if ($request->filled('entityId')) {
            $query->where('entity_id', $request->string('entityId'));
        }
        if ($request->filled('departmentId')) {
            $query->where('department_id', $request->string('departmentId'));
        }
        if ($request->filled('search')) {
            $search = trim($request->string('search')->toString());
            $query->where(function (Builder $builder) use ($search) {
                $builder->where('full_name', 'like', "%{$search}%")
                    ->orWhere('staff_id', 'like', "%{$search}%")
                    ->orWhere('job_title', 'like', "%{$search}%");
            });
        }

        return response()->json([
            'data' => $query->orderBy('full_name')->limit(500)->get()->map(fn (Employee $employee) => $this->present($employee, $request)),
        ]);
    }

    public function show(Request $request, Employee $employee): JsonResponse
    {
        abort_unless($this->scopedQuery($request->user())->whereKey($employee->id)->exists(), 404);

        return response()->json(['data' => $this->present($employee->load(['entity', 'department']), $request)]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);
        $data = $this->validated($request);
        $employee = DB::transaction(function () use ($request, $data) {
            $employee = Employee::create($this->toDatabase($data));
            AuditLogger::record($request, 'Employee Records', 'Created employee', $employee->id, $employee->full_name, null, 'Created');

            return $employee;
        });

        return response()->json(['data' => $this->present($employee->load(['entity', 'department']), $request)], 201);
    }

    public function update(Request $request, Employee $employee): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);
        DB::transaction(function () use ($request, $employee): void {
            $lockedEmployee = Employee::query()->lockForUpdate()->findOrFail($employee->id);
            $previousStaffId = $lockedEmployee->staff_id;
            $lockedEmployee->update($this->toDatabase($this->validated($request, $lockedEmployee)));
            $this->syncUserAccounts($lockedEmployee, $previousStaffId);
            AuditLogger::record($request, 'Employee Records', 'Updated employee', $lockedEmployee->id, $lockedEmployee->full_name, null, 'Updated');
        });

        return response()->json(['data' => $this->present($employee->fresh()->load(['entity', 'department']), $request)]);
    }

    public function destroy(Request $request, Employee $employee): JsonResponse
    {
        $this->authorizeRole($request, self::HR_ROLES);
        DB::transaction(function () use ($request, $employee): void {
            $lockedEmployee = Employee::query()->lockForUpdate()->findOrFail($employee->id);
            $lockedEmployee->update(['status' => 'Inactive']);
            $this->deactivateUserAccounts($lockedEmployee->staff_id);
            AuditLogger::record($request, 'Employee Records', 'Deactivated employee', $lockedEmployee->id, $lockedEmployee->full_name, 'Active', 'Inactive', 'Warning');
        });

        return response()->json(['message' => 'Employee deactivated.']);
    }

    private function scopedQuery($user): Builder
    {
        $query = Employee::query();
        if ($user->role === 'PCCM_SUPER_ADMIN') {
            return $query;
        }
        if ($user->role === 'BUSINESS_HEAD' && $user->entity_id) {
            return $query->where('entity_id', $user->entity_id);
        }
        if ($user->role === 'DEPARTMENT_HEAD' && $user->department_id) {
            return $query->where('department_id', $user->department_id);
        }
        if ($user->role === 'SYSTEM_ADMIN' && $user->entity_id) {
            return $query->where('entity_id', $user->entity_id);
        }

        return $query->where('staff_id', $user->staff_id ?? '');
    }

    private function authorizeRole(Request $request, array $roles): void
    {
        abort_unless(in_array($request->user()->role, $roles, true), 403, 'You are not authorized to manage employee records.');
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

    private function validated(Request $request, ?Employee $employee = null): array
    {
        $required = $employee ? 'sometimes' : 'required';
        $data = $request->validate([
            'staffId' => [$required, 'string', 'max:50', Rule::unique('employees', 'staff_id')->ignore($employee?->id)],
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
            'managerId' => ['nullable', 'exists:employees,id'],
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

        $department = Department::query()->whereKey($data['departmentId'] ?? $employee?->department_id)->first();
        $entityId = $data['entityId'] ?? $employee?->entity_id;
        if ($department && $entityId && $department->entity_id !== $entityId) {
            abort(422, 'The selected department does not belong to the selected entity.');
        }

        return $data;
    }

    private function toDatabase(array $data): array
    {
        $map = [
            'staffId' => 'staff_id', 'fullName' => 'full_name', 'firstName' => 'first_name',
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

    private function present(Employee $employee, Request $request): array
    {
        $employee->loadMissing(['entity', 'department']);
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
            'managerId' => $employee->manager_id,
            'managerName' => $employee->manager_name,
            'contractStatus' => $employee->contract_status,
            'yearsOfService' => $employee->years_of_service,
            'qualifications' => $employee->qualifications ?? [],
            'certifications' => $employee->certifications ?? [],
            'bankPayroll' => ['bankName' => '', 'accountNumber' => '', 'accountName' => '', 'salaryGrade' => '', 'currency' => 'NGN'],
            'pensionHmo' => ['pfaName' => '', 'rsaPin' => '', 'hmoProvider' => '', 'hmoPlan' => '', 'hmoIdNumber' => ''],
            'status' => $employee->status,
            'notes' => $employee->notes,
        ];

        if ($request->user()->role === 'PCCM_SUPER_ADMIN') {
            $data = array_merge($data, [
                'dateOfBirth' => $employee->date_of_birth,
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
