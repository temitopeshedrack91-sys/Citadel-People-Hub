<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeLeaveBalance;
use App\Models\LeaveCategory;
use App\Models\LeaveRequest as LeaveRecord;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class LeaveController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = LeaveRecord::query();
        $role = RoleAuthorization::canonical($user->role);
        abort_unless(in_array($role, ['ADMIN', 'HR_STAFF', 'EMPLOYEE'], true), 403, 'You are not authorized to access leave requests.');

        if ($role === 'EMPLOYEE') {
            $query->where('employee_staff_id', $user->staff_id);
        } elseif (strtoupper(trim($user->role)) === 'BUSINESS_HEAD') {
            $query->whereIn('employee_id', Employee::query()->select('id')->where('entity_id', $user->entity_id));
        } elseif (strtoupper(trim($user->role)) === 'DEPARTMENT_HEAD') {
            $query->whereIn('employee_id', Employee::query()->select('id')->where('department_id', $user->department_id));
        }

        return response()->json(['data' => $query->latest('applied_date')->limit(500)->get()->map(fn (LeaveRecord $record) => $this->present($record))]);
    }

    public function forEmployee(Request $request, string $employeeId): JsonResponse
    {
        $employee = Employee::query()->findOrFail($employeeId);
        $this->ensureCanViewEmployee($request, $employee);

        return response()->json(['data' => LeaveRecord::query()->where('employee_id', $employee->id)->latest('applied_date')->get()->map(fn (LeaveRecord $record) => $this->present($record))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employeeId' => ['required', 'exists:employees,id'],
            'employeeStaffId' => ['required', 'string', 'max:50'],
            'employeeName' => ['required', 'string', 'max:180'],
            'entityName' => ['required', 'string', 'max:180'],
            'departmentName' => ['required', 'string', 'max:180'],
            'leaveType' => ['required', Rule::in(['Annual Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Exam Leave', 'Compassionate Leave', 'Casual Leave'])],
            'startDate' => ['required', 'date_format:Y-m-d'],
            'endDate' => ['required', 'date_format:Y-m-d', 'after_or_equal:startDate'],
            'totalDays' => ['required', 'integer', 'min:1', 'max:366'],
            'reason' => ['required', 'string', 'max:3000'],
            'relievingStaffId' => ['nullable', 'string', 'max:50'],
            'relievingStaffName' => ['nullable', 'string', 'max:180'],
            'handoverColleague' => ['nullable', 'string', 'max:180'],
        ]);
        $employee = Employee::query()->findOrFail($data['employeeId']);
        $role = RoleAuthorization::canonical($request->user()->role);
        $isSelf = $role === 'EMPLOYEE' && $employee->staff_id === $request->user()->staff_id;
        abort_unless($isSelf || RoleAuthorization::canManageEmployee($request->user(), $employee), 403, 'Leave requests must be submitted by the employee or an authorized HR administrator.');
        if ($employee->staff_id !== $data['employeeStaffId']) {
            abort(422, 'Employee identity does not match the selected employee.');
        }

        $record = DB::transaction(function () use ($request, $employee, $data) {
            $record = LeaveRecord::create([
                'employee_id' => $employee->id,
                'employee_staff_id' => $employee->staff_id,
                'employee_name' => $employee->full_name,
                'entity_name' => $employee->entity()->value('name') ?? '',
                'department_name' => $employee->department()->value('name') ?? '',
                'leave_type' => $data['leaveType'],
                'start_date' => $data['startDate'],
                'end_date' => $data['endDate'],
                'total_days' => $data['totalDays'],
                'reason' => $data['reason'],
                'relieving_staff_id' => $data['relievingStaffId'] ?? null,
                'relieving_staff_name' => $data['relievingStaffName'] ?? null,
                'handover_colleague' => $data['handoverColleague'] ?? null,
                'status' => 'Submitted',
                'approval_stage' => 'DEPARTMENT_HEAD',
                'applied_date' => now(),
                'approval_history' => [],
            ]);
            AuditLogger::record($request, 'Leave Management', 'Submitted leave request', $record->id, "{$record->leave_type} for {$record->employee_name}", null, 'Submitted');

            return $record;
        });

        return response()->json(['data' => $this->present($record)], 201);
    }

    public function updateStatus(Request $request, LeaveRecord $leaveRequest): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'status' => ['required', Rule::in(['Approved', 'Rejected', 'Cancelled', 'Requires Correction'])],
            'comments' => ['nullable', 'string', 'max:2000'],
        ]);
        $updated = DB::transaction(function () use ($request, $user, $data, $leaveRequest) {
            $record = LeaveRecord::query()->lockForUpdate()->findOrFail($leaveRequest->id);
            $employee = Employee::query()->findOrFail($record->employee_id);
            abort_if(! in_array($record->status, ['Pending', 'Submitted', 'Pending Review'], true), 409, 'Only open leave requests can be updated.');

            $userRole = strtoupper(trim($user->role));
            $canonicalRole = RoleAuthorization::canonical($userRole);
            $stageRole = match ($record->approval_stage) {
                'DEPARTMENT_HEAD' => 'DEPARTMENT_HEAD',
                'BUSINESS_HEAD' => 'BUSINESS_HEAD',
                'HR' => 'HR_STAFF',
                default => null,
            };
            $stageScopeMatches = match ($stageRole) {
                'DEPARTMENT_HEAD' => $employee->department_id === $user->department_id,
                'BUSINESS_HEAD' => $employee->entity_id === $user->entity_id,
                'HR_STAFF' => true,
                default => false,
            };
            $isScopedHead = in_array($userRole, ['BUSINESS_HEAD', 'DEPARTMENT_HEAD'], true);
            $isGlobalReviewer = $canonicalRole === 'ADMIN' || ($canonicalRole === 'HR_STAFF' && ! $isScopedHead);
            $authorizedForStage = match ($stageRole) {
                'DEPARTMENT_HEAD' => $userRole === 'DEPARTMENT_HEAD',
                'BUSINESS_HEAD' => $userRole === 'BUSINESS_HEAD',
                'HR_STAFF' => false,
                default => false,
            };
            $authorizedReviewer = $isGlobalReviewer || ($authorizedForStage && $stageScopeMatches);
            $isRequester = $canonicalRole === 'EMPLOYEE' && $employee->staff_id === $user->staff_id;
            $authorized = $data['status'] === 'Cancelled'
                ? ($authorizedReviewer || $isRequester)
                : $authorizedReviewer;
            abort_unless($authorized, 403, 'This request is not awaiting action from your role or scope.');

            $history = $record->approval_history ?? [];
            $previousStatus = $record->status;
            $nextStage = $record->approval_stage;
            $newStatus = $data['status'];
            if ($data['status'] === 'Approved') {
                if ($record->approval_stage === 'DEPARTMENT_HEAD') {
                    $nextStage = 'BUSINESS_HEAD';
                    $newStatus = 'Pending Review';
                } elseif ($record->approval_stage === 'BUSINESS_HEAD') {
                    $nextStage = 'HR';
                    $newStatus = 'Pending Review';
                } else {
                    $nextStage = 'COMPLETE';
                }
            } elseif ($data['status'] !== 'Cancelled') {
                $nextStage = 'COMPLETE';
            }

            $history[] = [
                'actor' => $user->name,
                'role' => $user->role,
                'stage' => $record->approval_stage,
                'status' => $newStatus,
                'comments' => $data['comments'] ?? null,
                'timestamp' => now()->toISOString(),
            ];
            $record->update([
                'status' => $newStatus,
                'approval_stage' => $nextStage,
                'approver_comments' => $data['comments'] ?? null,
                'approval_history' => $history,
            ]);
            AuditLogger::record($request, 'Leave Management', "Leave request {$newStatus}", $record->id, "{$record->leave_type} for {$record->employee_name}", $previousStatus, $newStatus);

            return $record;
        });

        return response()->json(['data' => $this->present($updated)]);
    }

    public function categories(): JsonResponse
    {
        $categories = LeaveCategory::query()
            ->where('is_active', true)
            ->with(['policies' => fn ($q) => $q->where('is_active', true)])
            ->get();

        return response()->json(['data' => $categories]);
    }

    public function balances(Request $request, ?string $employeeId = null): JsonResponse
    {
        $user = $request->user();
        $query = EmployeeLeaveBalance::query()->with(['category', 'employee:id,staff_id,full_name']);

        if ($employeeId !== null) {
            $employee = Employee::query()->findOrFail($employeeId);
            $this->ensureCanViewEmployee($request, $employee);

            return response()->json(['data' => $query->where('employee_id', $employee->id)->get()]);
        }

        $role = RoleAuthorization::canonical($user->role);
        abort_unless(in_array($role, ['ADMIN', 'HR_STAFF', 'EMPLOYEE'], true), 403, 'You are not authorized to access leave balances.');

        if ($role === 'EMPLOYEE') {
            $employee = Employee::query()->where('staff_id', $user->staff_id)->first();
            if ($employee === null) {
                return response()->json(['data' => []]);
            }

            $query->where('employee_id', $employee->id);
        } elseif (in_array(strtoupper(trim($user->role)), ['BUSINESS_HEAD', 'DEPARTMENT_HEAD'], true)) {
            $query->whereIn('employee_id', RoleAuthorization::visibleEmployees($user)->select('id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    private function ensureCanViewEmployee(Request $request, Employee $employee): void
    {
        $user = $request->user();
        $role = RoleAuthorization::canonical($user->role);
        $allowed = $role === 'ADMIN'
            || ($role === 'HR_STAFF' && RoleAuthorization::canManageEmployee($user, $employee))
            || ($role === 'EMPLOYEE' && $employee->staff_id === $user->staff_id);
        abort_unless($allowed, 403, 'You are not authorized to access this employee record.');
    }

    private function present(LeaveRecord $record): array
    {
        return [
            'id' => $record->id,
            'employeeId' => $record->employee_id,
            'employeeStaffId' => $record->employee_staff_id,
            'employeeName' => $record->employee_name,
            'entityName' => $record->entity_name,
            'departmentName' => $record->department_name,
            'leaveType' => $record->leave_type,
            'startDate' => $record->start_date->format('Y-m-d'),
            'endDate' => $record->end_date->format('Y-m-d'),
            'totalDays' => $record->total_days,
            'reason' => $record->reason,
            'relievingStaffId' => $record->relieving_staff_id,
            'relievingStaffName' => $record->relieving_staff_name,
            'handoverColleague' => $record->handover_colleague,
            'status' => $record->status,
            'approvalStage' => $record->approval_stage,
            'appliedDate' => $record->applied_date->toISOString(),
            'approverComments' => $record->approver_comments,
            'approvalHistory' => $record->approval_history ?? [],
        ];
    }
}
