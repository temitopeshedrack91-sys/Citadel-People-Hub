<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeLeaveBalance;
use App\Models\LeaveRequest;
use App\Repositories\EmployeeRepository;
use App\Repositories\LeaveRepository;
use App\Services\EmployeeHierarchyService;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Role-scoped dashboard aggregation endpoint enforced strictly on the server.
 */
class DashboardController extends Controller
{
    public function __construct(
        private readonly EmployeeRepository $employees,
        private readonly LeaveRepository $leaves,
        private readonly EmployeeHierarchyService $hierarchy,
    ) {}

    /**
     * GET /api/v1/dashboard/summary
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        $effectiveRole = RoleAuthorization::effectiveDashboardRole($user);
        $selfEmployee = $user->staff_id
            ? $this->employees->findByStaffId($user->staff_id, ['entity', 'department', 'supervisor'])
            : null;

        $myBalances = $selfEmployee
            ? EmployeeLeaveBalance::query()
                ->with('category')
                ->where('employee_id', $selfEmployee->id)
                ->get()
            : collect();

        $myLeaves = $selfEmployee
            ? LeaveRequest::query()
                ->with('employee.supervisor')
                ->where('employee_id', $selfEmployee->id)
                ->latest('applied_date')
                ->limit(100)
                ->get()
            : collect();

        $payload = [
            'effectiveRole' => $effectiveRole,
            'profile' => $selfEmployee ? [
                'id' => (string) $selfEmployee->id,
                'staffId' => $selfEmployee->staff_id,
                'fullName' => $selfEmployee->full_name,
                'jobTitle' => $selfEmployee->job_title,
                'entityName' => $selfEmployee->entity?->name,
                'departmentName' => $selfEmployee->department?->name,
                'managerId' => $selfEmployee->manager_id ? (string) $selfEmployee->manager_id : null,
                'managerName' => $selfEmployee->supervisor?->full_name ?? $selfEmployee->manager_name,
                'status' => $selfEmployee->status,
            ] : null,
            'balances' => $myBalances,
            'myLeaves' => $myLeaves->map(fn (LeaveRequest $r) => $this->presentLeave($r))->values(),
        ];

        if ($effectiveRole === 'MANAGER' || $effectiveRole === 'HR') {
            $allowedIds = RoleAuthorization::visibleLeaveEmployeeIds($user);
            $scopedLeaves = $this->leaves->listScopedRequests($allowedIds, 200);
            $teamPending = $scopedLeaves->filter(function (LeaveRequest $r) use ($effectiveRole, $selfEmployee) {
                if (! in_array($r->status, ['Submitted', 'Pending Review', 'Pending'], true)) {
                    return false;
                }
                if ($effectiveRole === 'HR') {
                    return true;
                }

                $directManagerId = $r->manager_id ?? $r->employee?->manager_id;

                return in_array($r->approval_stage, ['MANAGER', 'LINE_MANAGER', 'DEPARTMENT_HEAD'], true)
                    && $selfEmployee !== null
                    && (int) $r->employee_id !== (int) $selfEmployee->id
                    && $directManagerId !== null
                    && (string) $directManagerId === (string) $selfEmployee->id;
            })->values();

            $directReports = $selfEmployee ? $this->hierarchy->getDirectReports($selfEmployee) : collect();

            $payload['team'] = [
                'directReports' => $directReports->map(fn (Employee $e) => [
                    'id' => (string) $e->id,
                    'staffId' => $e->staff_id,
                    'fullName' => $e->full_name,
                    'jobTitle' => $e->job_title,
                    'departmentName' => $e->department?->name,
                    'status' => $e->status,
                ])->values(),
                'pendingApprovals' => $teamPending->map(fn (LeaveRequest $r) => $this->presentLeave($r))->values(),
                'teamCalendar' => $this->leaves->listCalendarLeaves($allowedIds)->map(fn (LeaveRequest $r) => [
                    'id' => $r->id,
                    'employeeId' => $r->employee_id,
                    'employeeName' => $r->employee_name,
                    'departmentName' => $r->department_name,
                    'leaveType' => $r->leave_type,
                    'startDate' => $r->start_date->format('Y-m-d'),
                    'endDate' => $r->end_date->format('Y-m-d'),
                    'totalDays' => $r->total_days,
                    'status' => $r->status,
                    'approvalStage' => $r->approval_stage,
                ])->values(),
            ];
        }

        if ($effectiveRole === 'HR') {
            $allLeaves = $this->leaves->listScopedRequests(null, 500);
            $payload['hrOverview'] = [
                'totalEmployees' => Employee::query()->count(),
                'activeEmployees' => Employee::query()->where('status', 'Active')->count(),
                'pendingManagerCount' => $allLeaves->whereIn('status', ['Submitted', 'Pending'])->where('approval_stage', 'MANAGER')->count(),
                'pendingHrCount' => $allLeaves->where('status', 'Pending Review')->where('approval_stage', 'HR')->count(),
                'approvedCount' => $allLeaves->where('status', 'Approved')->count(),
                'rejectedCount' => $allLeaves->where('status', 'Rejected')->count(),
                'allRequests' => $allLeaves->map(fn (LeaveRequest $r) => $this->presentLeave($r))->values(),
            ];
        }

        return response()->json(['data' => $payload]);
    }

    private function presentLeave(LeaveRequest $record): array
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
            'managerId' => $record->manager_id,
            'managerName' => $record->manager_name ?? $record->employee?->supervisor?->full_name,
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
