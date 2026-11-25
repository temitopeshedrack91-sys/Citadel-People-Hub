<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\EmployeeLeaveBalance;
use App\Models\Entity;
use App\Models\LeaveRequest;
use App\Models\Task;
use App\Repositories\EmployeeRepository;
use App\Repositories\LeaveRepository;
use App\Services\EmployeeHierarchyService;
use App\Support\RoleAuthorization;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

                return $r->approval_stage === 'MANAGER'
                    && $selfEmployee !== null
                    && (int) $r->employee_id !== (int) $selfEmployee->id;
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
            $entityFilter = $request->string('entity_id')->trim()->value();
            $hasEntityFilter = $entityFilter !== '' && strtolower($entityFilter) !== 'all';

            $employeeScope = Employee::query()
                ->when($hasEntityFilter, fn ($q) => $q->where('entity_id', $entityFilter));

            $allLeaves = $this->leaves->listScopedRequests(null, 500);
            if ($hasEntityFilter) {
                $scopedEmpIds = (clone $employeeScope)->pluck('id')->map(fn ($id) => (int) $id)->all();
                $allLeaves = $allLeaves->filter(fn (LeaveRequest $r) => in_array((int) $r->employee_id, $scopedEmpIds, true))->values();
            }

            $today = Carbon::today()->toDateString();
            $recentHireCutoff = Carbon::today()->subDays(30)->toDateString();

            $entityCounts = Employee::query()
                ->select('entity_id', DB::raw('COUNT(*) as total'))
                ->groupBy('entity_id')
                ->pluck('total', 'entity_id');

            $entityBreakdown = Entity::query()
                ->orderBy('name')
                ->get(['id', 'name', 'short_code'])
                ->map(fn (Entity $entity) => [
                    'id' => (string) $entity->id,
                    'name' => $entity->name,
                    'shortCode' => $entity->short_code,
                    'count' => (int) ($entityCounts[$entity->id] ?? 0),
                ])
                ->values();

            $onLeaveToday = $allLeaves
                ->filter(function (LeaveRequest $leave) use ($today): bool {
                    if ($leave->status !== 'Approved') {
                        return false;
                    }

                    return $leave->start_date->toDateString() <= $today
                        && $leave->end_date->toDateString() >= $today;
                })
                ->take(8)
                ->map(fn (LeaveRequest $r) => [
                    'id' => $r->id,
                    'employeeId' => $r->employee_id,
                    'employeeName' => $r->employee_name,
                    'departmentName' => $r->department_name,
                    'entityName' => $r->entity_name,
                    'leaveType' => $r->leave_type,
                    'startDate' => $r->start_date->format('Y-m-d'),
                    'endDate' => $r->end_date->format('Y-m-d'),
                    'totalDays' => $r->total_days,
                ])
                ->values();

            $activeTasks = Task::query()
                ->with(['project:id,title,code', 'assignee:id,full_name,job_title', 'department:id,name,entity_id'])
                ->where('status', '!=', 'completed')
                ->when($hasEntityFilter, fn ($q) => $q->whereHas('department', fn ($dq) => $dq->where('entity_id', $entityFilter)))
                ->orderByRaw("CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END")
                ->orderBy('due_date')
                ->limit(6)
                ->get()
                ->map(fn (Task $task) => [
                    'id' => (string) $task->id,
                    'title' => $task->title,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'dueDate' => $task->due_date?->format('Y-m-d'),
                    'projectName' => $task->project?->title,
                    'departmentName' => $task->department?->name,
                    'assigneeName' => $task->assignee?->full_name,
                ])
                ->values();

            $weekdays = collect();
            $cursor = Carbon::today();
            while ($weekdays->count() < 5) {
                if (! $cursor->isWeekend()) {
                    $weekdays->prepend($cursor->copy());
                }
                $cursor->subDay();
            }
            $windowStart = $weekdays->first()->toDateString();
            $windowEnd = $weekdays->last()->toDateString();

            $attendanceRows = AttendanceRecord::query()
                ->when($hasEntityFilter, fn ($q) => $q->whereHas('employee', fn ($eq) => $eq->where('entity_id', $entityFilter)))
                ->whereBetween('date', [$windowStart, $windowEnd])
                ->get(['date', 'status']);

            $attendanceByDate = $attendanceRows->groupBy(fn (AttendanceRecord $row) => $row->date?->format('Y-m-d') ?? '');
            $attendanceTrend = $weekdays->map(function (Carbon $day) use ($attendanceByDate, $today) {
                $key = $day->toDateString();
                $rows = $attendanceByDate->get($key, collect());
                $lateCount = $rows->filter(fn (AttendanceRecord $r) => strcasecmp((string) $r->status, 'Late') === 0)->count();
                $totalLogged = $rows->count();

                return [
                    'day' => $day->format('D'),
                    'date' => $key,
                    'presentCount' => max(0, $totalLogged - $lateCount),
                    'lateCount' => $lateCount,
                    'totalLogged' => $totalLogged,
                    'isToday' => $key === $today,
                ];
            })->values();

            $todayRows = $attendanceByDate->get($today, collect());
            $todayLate = $todayRows->filter(fn (AttendanceRecord $r) => strcasecmp((string) $r->status, 'Late') === 0)->count();

            $nowDate = Carbon::today();
            $upcomingMilestones = (clone $employeeScope)
                ->with('department:id,name')
                ->whereNotNull('date_of_birth')
                ->get(['id', 'full_name', 'department_id', 'date_of_birth'])
                ->map(function (Employee $emp) use ($nowDate) {
                    $dob = $emp->date_of_birth;
                    if (! $dob) {
                        return null;
                    }
                    $nextBirthday = Carbon::create($nowDate->year, $dob->month, min($dob->day, 28))->startOfDay();
                    if ($dob->month !== 2 || $dob->day !== 29 || $nextBirthday->isLeapYear()) {
                        $nextBirthday = Carbon::create($nowDate->year, $dob->month, $dob->day)->startOfDay();
                    }
                    if ($nextBirthday->lt($nowDate)) {
                        $nextBirthday->addYear();
                    }
                    $daysUntil = $nowDate->diffInDays($nextBirthday, false);
                    if ($daysUntil < 0 || $daysUntil > 45) {
                        return null;
                    }

                    return [
                        'id' => (string) $emp->id,
                        'fullName' => $emp->full_name,
                        'departmentName' => $emp->department?->name ?? 'General',
                        'dateLabel' => $nextBirthday->format('M j'),
                        'daysUntil' => $daysUntil,
                        'type' => 'Birthday',
                    ];
                })
                ->filter()
                ->sortBy('daysUntil')
                ->take(5)
                ->values();

            $payload['hrOverview'] = [
                'totalEmployees' => (clone $employeeScope)->count(),
                'activeEmployees' => (clone $employeeScope)->where('status', 'Active')->count(),
                'recentHiresCount' => (clone $employeeScope)->where('employment_date', '>=', $recentHireCutoff)->count(),
                'pendingManagerCount' => $allLeaves->whereIn('status', ['Submitted', 'Pending'])->where('approval_stage', 'MANAGER')->count(),
                'pendingHrCount' => $allLeaves->where('status', 'Pending Review')->where('approval_stage', 'HR')->count(),
                'approvedCount' => $allLeaves->where('status', 'Approved')->count(),
                'rejectedCount' => $allLeaves->where('status', 'Rejected')->count(),
                'allRequests' => $allLeaves->map(fn (LeaveRequest $r) => $this->presentLeave($r))->values(),
                'entityBreakdown' => $entityBreakdown,
                'onLeaveToday' => $onLeaveToday,
                'activeTasks' => $activeTasks,
                'attendanceToday' => [
                    'totalLogged' => $todayRows->count(),
                    'presentCount' => max(0, $todayRows->count() - $todayLate),
                    'lateCount' => $todayLate,
                ],
                'attendanceTrend' => $attendanceTrend,
                'upcomingMilestones' => $upcomingMilestones,
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
