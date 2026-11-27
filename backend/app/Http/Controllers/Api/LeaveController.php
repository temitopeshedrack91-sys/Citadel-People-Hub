<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeLeaveBalance;
use App\Models\LeaveCategory;
use App\Models\LeaveRequest as LeaveRecord;
use App\Repositories\EmployeeRepository;
use App\Repositories\LeaveRepository;
use App\Services\LeaveWorkflowService;
use App\Services\RealtimeEventService;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Manages leave requests, balances, categories, team calendar, and two-stage approval workflow.
 */
class LeaveController extends Controller
{
    public function __construct(
        private readonly LeaveRepository $leaves,
        private readonly EmployeeRepository $employees,
        private readonly LeaveWorkflowService $workflow,
    ) {}

    /**
     * List leave requests visible to the authenticated user based on Phase 1 hierarchy & role.
     *
     * GET /api/v1/leave-requests
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(RoleAuthorization::canonical($user->role) !== 'VIEWER', 403, 'You are not authorized to access leave requests.');

        $allowedEmployeeIds = RoleAuthorization::visibleLeaveEmployeeIds($user);
        $viewerEmployeeId = $user->staff_id
            ? $this->employees->findByStaffId($user->staff_id)?->id
            : null;
        $records = $this->leaves->listScopedRequests($allowedEmployeeIds, 500, $viewerEmployeeId ? (int) $viewerEmployeeId : null);

        return response()->json([
            'data' => $records->map(fn (LeaveRecord $record) => $this->present($record)),
        ]);
    }

    /**
     * Retrieve leave history for a specific employee (strictly scoped by hierarchy/HR).
     *
     * GET /api/v1/employees/{employeeId}/leave-requests
     */
    public function forEmployee(Request $request, string $employeeId): JsonResponse
    {
        $employee = $this->employees->findById($employeeId) ?? abort(404, 'Employee not found.');
        $this->ensureCanViewEmployeeLeave($request, $employee);

        $records = LeaveRecord::query()
            ->with(['employee.supervisor'])
            ->where('employee_id', $employee->id)
            ->latest('applied_date')
            ->get();

        return response()->json([
            'data' => $records->map(fn (LeaveRecord $record) => $this->present($record)),
        ]);
    }

    /**
     * Submit a new leave application.
     *
     * POST /api/v1/leave-requests
     */
    public function store(Request $request): JsonResponse
    {
        $empId = $request->input('employeeId');
        $resolvedEmp = null;
        if ($empId === null || $empId === '') {
            $staffId = $request->input('employeeStaffId') ?? $request->user()->staff_id;
            $resolvedEmp = $staffId
                ? Employee::query()->where('staff_id', $staffId)->first()
                : Employee::query()->whereRaw('LOWER(email) = ?', [strtolower((string) $request->user()->email)])->first();
            if ($resolvedEmp) {
                $request->merge(['employeeId' => $resolvedEmp->id]);
            }
        } elseif (! is_numeric($empId)) {
            $resolvedEmp = Employee::query()->where('staff_id', (string) $empId)->first();
            if ($resolvedEmp) {
                $request->merge(['employeeId' => $resolvedEmp->id]);
            }
        } else {
            $resolvedEmp = Employee::query()->find($empId);
        }

        if ($resolvedEmp && ! $request->filled('employeeStaffId')) {
            $request->merge(['employeeStaffId' => $resolvedEmp->staff_id]);
        }

        $data = $request->validate([
            'employeeId' => ['required', 'exists:employees,id'],
            'employeeStaffId' => ['sometimes', 'string', 'max:50'],
            'employeeName' => ['sometimes', 'string', 'max:180'],
            'entityName' => ['sometimes', 'string', 'max:180'],
            'departmentName' => ['sometimes', 'string', 'max:180'],
            'leaveType' => ['required', Rule::in(['Annual Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Exam Leave', 'Compassionate Leave', 'Casual Leave'])],
            'startDate' => ['required', 'date_format:Y-m-d'],
            'endDate' => ['required', 'date_format:Y-m-d', 'after_or_equal:startDate'],
            'totalDays' => ['sometimes', 'integer', 'min:1', 'max:366'],
            'reason' => ['required', 'string', 'max:3000'],
            'relievingStaffId' => ['nullable', 'string', 'max:50'],
            'relievingStaffName' => ['nullable', 'string', 'max:180'],
            'handoverColleague' => ['nullable', 'string', 'max:180'],
            'managerId' => ['nullable', 'exists:employees,id'],
            'managerName' => ['nullable', 'string', 'max:180'],
        ]);

        if (! isset($data['totalDays'])) {
            $data['totalDays'] = (int) Carbon::parse($data['startDate'])->diffInDays(Carbon::parse($data['endDate'])) + 1;
        }
        $data['employeeStaffId'] = $data['employeeStaffId'] ?? ($resolvedEmp?->staff_id ?? '');

        $record = $this->workflow->submit($request, $data);

        return response()->json(['data' => $this->present($record)], 201);
    }

    /**
     * Advance two-stage approval (Manager -> HR), reject, or cancel a leave request.
     *
     * PATCH /api/v1/leave-requests/{leaveRequest}/status
     */
    public function updateStatus(Request $request, LeaveRecord $leaveRequest): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['Approved', 'Rejected', 'Cancelled', 'Requires Correction'])],
            'comments' => ['nullable', 'string', 'max:2000'],
        ]);

        $updated = $this->workflow->transition($request, $leaveRequest, $data['status'], $data['comments'] ?? null);

        return response()->json(['data' => $this->present($updated)]);
    }

    /**
     * Retrieve team leave calendar entries for Managers (reporting team only) and HR (all staff).
     *
     * GET /api/v1/leave/team-calendar
     */
    public function teamCalendar(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            RoleAuthorization::isGlobalHrOrAdmin($user) || RoleAuthorization::isSupervisor($user),
            403,
            'Only managers and HR can access the team leave calendar.'
        );

        $data = $request->validate([
            'startDate' => ['nullable', 'date_format:Y-m-d'],
            'endDate' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:startDate'],
        ]);

        $allowedIds = RoleAuthorization::visibleLeaveEmployeeIds($user);
        $records = $this->leaves->listCalendarLeaves(
            $allowedIds,
            $data['startDate'] ?? null,
            $data['endDate'] ?? null
        );

        return response()->json([
            'data' => $records->map(fn (LeaveRecord $record) => [
                'id' => $record->id,
                'employeeId' => $record->employee_id,
                'employeeStaffId' => $record->employee_staff_id,
                'employeeName' => $record->employee_name,
                'departmentName' => $record->department_name,
                'entityName' => $record->entity_name,
                'leaveType' => $record->leave_type,
                'startDate' => $record->start_date->format('Y-m-d'),
                'endDate' => $record->end_date->format('Y-m-d'),
                'totalDays' => $record->total_days,
                'status' => $record->status,
                'approvalStage' => $record->approval_stage,
            ]),
        ]);
    }

    /**
     * Allocate or adjust leave entitlement for an employee (HR/Admin only).
     *
     * POST /api/v1/leave/entitlements
     */
    public function storeEntitlement(Request $request): JsonResponse
    {
        abort_unless(RoleAuthorization::isGlobalHrOrAdmin($request->user()), 403, 'You are not authorized to assign leave entitlements.');

        $data = $request->validate([
            'employeeId' => ['required', 'exists:employees,id'],
            'leaveCategoryId' => ['required', 'exists:leave_categories,id'],
            'year' => ['required', 'integer', 'min:2020', 'max:2050'],
            'totalDays' => ['required', 'numeric', 'min:0', 'max:366'],
        ]);

        $balance = DB::transaction(function () use ($request, $data) {
            $balance = EmployeeLeaveBalance::query()->firstOrNew([
                'employee_id' => $data['employeeId'],
                'leave_category_id' => $data['leaveCategoryId'],
                'year' => $data['year'],
            ]);

            $balance->total_days = (float) $data['totalDays'];
            $balance->used_days = $balance->used_days ?? 0;
            $balance->pending_days = $balance->pending_days ?? 0;
            $balance->remaining_days = max(0, $balance->total_days - $balance->used_days - $balance->pending_days);
            $balance->save();

            AuditLogger::record($request, 'Leave Management', 'Assigned leave entitlement', (string) $balance->id, "Employee {$data['employeeId']} Category {$data['leaveCategoryId']}", null, (string) $data['totalDays']);
            RealtimeEventService::publish('leave_balances', 'UPDATE', $data['employeeId'], ['employeeId' => $data['employeeId']], (int) $request->user()->id);

            return $balance->load(['category', 'employee:id,staff_id,full_name']);
        });

        return response()->json(['data' => $balance], 201);
    }

    /**
     * List active statutory and organizational leave categories and policies.
     *
     * GET /api/v1/leave/categories
     */
    public function categories(): JsonResponse
    {
        $categories = LeaveCategory::query()
            ->where('is_active', true)
            ->with(['policies' => fn ($q) => $q->where('is_active', true)])
            ->get();

        return response()->json(['data' => $categories]);
    }

    /**
     * Retrieve accrued, used, and remaining leave balances within caller's scope.
     *
     * GET /api/v1/leave/balances
     * GET /api/v1/employees/{employeeId}/leave-balances
     */
    public function balances(Request $request, ?string $employeeId = null): JsonResponse
    {
        $user = $request->user();
        abort_unless(RoleAuthorization::canonical($user->role) !== 'VIEWER', 403, 'You are not authorized to access leave balances.');

        $query = EmployeeLeaveBalance::query()->with(['category', 'employee:id,staff_id,full_name']);

        if ($employeeId !== null) {
            $employee = $this->employees->findById($employeeId) ?? abort(404, 'Employee not found.');
            $this->ensureCanViewEmployeeLeave($request, $employee);

            return response()->json(['data' => $query->where('employee_id', $employee->id)->get()]);
        }

        $allowedIds = RoleAuthorization::visibleLeaveEmployeeIds($user);
        if ($allowedIds !== null) {
            if ($allowedIds === []) {
                return response()->json(['data' => []]);
            }
            $query->whereIn('employee_id', $allowedIds);
        }

        return response()->json(['data' => $query->get()]);
    }

    private function ensureCanViewEmployeeLeave(Request $request, Employee $employee): void
    {
        $allowedIds = RoleAuthorization::visibleLeaveEmployeeIds($request->user());
        $allowed = $allowedIds === null || in_array((int) $employee->id, $allowedIds, true);
        abort_unless($allowed, 403, 'You are not authorized to access this employee record.');
    }

    private function present(LeaveRecord $record): array
    {
        $record->loadMissing(['employee.supervisor']);
        $supervisorName = $record->manager_name ?? $record->employee?->supervisor?->full_name ?? $record->employee?->manager_name;
        $supervisorId = $record->manager_id ?? ($record->employee?->manager_id ? (string) $record->employee->manager_id : null);

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
            'managerId' => $supervisorId,
            'managerName' => $supervisorName,
            'status' => $record->status,
            'approvalStage' => $record->approval_stage,
            'stoppedAtStage' => $record->stopped_at_stage,
            'managerActorName' => $record->manager_actor_name,
            'managerActedAt' => $record->manager_acted_at?->toISOString(),
            'hrActorName' => $record->hr_actor_name,
            'hrActedAt' => $record->hr_acted_at?->toISOString(),
            'appliedDate' => $record->applied_date->toISOString(),
            'approverComments' => $record->approver_comments,
            'approvalHistory' => $record->approval_history ?? [],
        ];
    }
}
