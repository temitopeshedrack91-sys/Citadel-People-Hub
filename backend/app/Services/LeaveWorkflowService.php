<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\SystemNotification;
use App\Models\User;
use App\Repositories\EmployeeRepository;
use App\Repositories\LeaveRepository;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * Business logic for Phase 2 two-stage leave approval workflow.
 *
 * Depends directly on Phase 1 employee reporting hierarchy (`employees.manager_id`):
 * - Stage 1 (MANAGER): Direct supervisor approves or rejects.
 * - Stage 2 (HR): Only after manager approval, HR performs final approval or rejection.
 * - Rejection at either stage terminates the workflow and preserves the stage where it stopped.
 */
class LeaveWorkflowService
{
    public function __construct(
        private readonly LeaveRepository $leaves,
        private readonly EmployeeRepository $employees,
    ) {}

    /**
     * Submit a new leave request with server-side date, overlap, and balance checks.
     *
     * @throws ValidationException
     */
    public function submit(Request $request, array $data): LeaveRequest
    {
        $user = $request->user();
        $employee = $this->employees->findById($data['employeeId'], ['entity', 'department', 'supervisor']);
        if ($employee === null) {
            throw ValidationException::withMessages([
                'employeeId' => ['The selected employee record could not be found.'],
            ]);
        }

        $isSelf = $user->staff_id !== null && $employee->staff_id === $user->staff_id;
        abort_unless(
            $isSelf || RoleAuthorization::isGlobalHrOrAdmin($user),
            403,
            'Leave requests must be submitted by the employee or an authorized HR administrator.'
        );

        if ($employee->staff_id !== $data['employeeStaffId']) {
            throw ValidationException::withMessages([
                'employeeStaffId' => ['Employee identity does not match the selected employee.'],
            ]);
        }

        $start = Carbon::createFromFormat('Y-m-d', $data['startDate'])->startOfDay();
        $end = Carbon::createFromFormat('Y-m-d', $data['endDate'])->startOfDay();
        if ($end->lt($start)) {
            throw ValidationException::withMessages([
                'endDate' => ['End date must be on or after the start date.'],
            ]);
        }

        $inclusiveDays = (int) $start->diffInDays($end) + 1;
        $requestedDays = isset($data['totalDays']) ? (int) $data['totalDays'] : $inclusiveDays;
        if ($requestedDays < 1 || $requestedDays > $inclusiveDays) {
            throw ValidationException::withMessages([
                'totalDays' => ["Total leave days ({$requestedDays}) must be between 1 and {$inclusiveDays} for the selected date range."],
            ]);
        }

        if ($this->leaves->hasOverlappingActiveLeave((int) $employee->id, $data['startDate'], $data['endDate'])) {
            throw ValidationException::withMessages([
                'startDate' => ['The requested leave period overlaps with an existing leave request.'],
            ]);
        }

        return DB::transaction(function () use ($request, $user, $employee, $data, $requestedDays) {
            $category = $this->leaves->findCategoryByName($data['leaveType']);
            if ($category !== null) {
                $year = (int) date('Y', strtotime($data['startDate']));
                $balance = $this->leaves->findOrProvisionBalance((int) $employee->id, (int) $category->id, $year);

                if ($balance !== null) {
                    if ((float) $balance->remaining_days < (float) $requestedDays) {
                        throw ValidationException::withMessages([
                            'totalDays' => ["Insufficient leave balance for {$data['leaveType']}. Remaining: {$balance->remaining_days} day(s), requested: {$requestedDays} day(s)."],
                        ]);
                    }
                    $balance->pending_days = (float) $balance->pending_days + (float) $requestedDays;
                    $balance->remaining_days = max(0, (float) $balance->total_days - (float) $balance->used_days - (float) $balance->pending_days);
                    $balance->save();
                }
            }

            $directHrLeaveTypes = ['Exam Leave', 'Compassionate Leave'];
            $requiresDirectHrApproval = in_array($data['leaveType'], $directHrLeaveTypes, true);

            $requestedManagerId = $data['managerId'] ?? null;
            if ($requestedManagerId !== null && $requestedManagerId !== '') {
                if ((string) $requestedManagerId === (string) $employee->id) {
                    throw ValidationException::withMessages([
                        'managerId' => ['You cannot select yourself as your own reviewing manager.'],
                    ]);
                }
                $supervisor = $this->employees->findById((int) $requestedManagerId);
            } else {
                $supervisor = $employee->manager_id !== null && is_numeric($employee->manager_id)
                    ? $this->employees->findById((int) $employee->manager_id)
                    : null;
            }

            $routeToManagerFirst = ! $requiresDirectHrApproval && $supervisor !== null;
            $initialStage = $routeToManagerFirst ? 'MANAGER' : 'HR';
            $initialStatus = $routeToManagerFirst ? 'Submitted' : 'Pending Review';
            $submissionComment = $requiresDirectHrApproval
                ? "{$data['leaveType']} routes directly to HR for approval per CGCC Leave Policy (Sheet 7)."
                : ($supervisor !== null
                    ? "Routed to direct supervisor {$supervisor->full_name} (Stage 1: Manager)."
                    : 'No direct supervisor assigned; routed directly to HR (Stage 2: HR).');

            $payload = [
                'employee_id' => $employee->id,
                'employee_staff_id' => $employee->staff_id,
                'employee_name' => $employee->full_name,
                'entity_name' => $employee->entity?->name ?? '',
                'department_name' => $employee->department?->name ?? '',
                'leave_type' => $data['leaveType'],
                'start_date' => $data['startDate'],
                'end_date' => $data['endDate'],
                'total_days' => $requestedDays,
                'reason' => $data['reason'],
                'relieving_staff_id' => $data['relievingStaffId'] ?? null,
                'relieving_staff_name' => $data['relievingStaffName'] ?? null,
                'handover_colleague' => $data['handoverColleague'] ?? null,
                'status' => $initialStatus,
                'approval_stage' => $initialStage,
                'stopped_at_stage' => null,
                'applied_date' => now(),
                'approval_history' => [
                    [
                        'actor' => $employee->full_name,
                        'actorId' => $user->id,
                        'role' => $user->role,
                        'stage' => 'SUBMITTED',
                        'decision' => 'Submitted',
                        'status' => $initialStatus,
                        'comments' => $submissionComment,
                        'timestamp' => now()->toISOString(),
                    ],
                ],
            ];

            if (Schema::hasColumn('leave_requests', 'manager_id')) {
                $payload['manager_id'] = $supervisor ? (string) $supervisor->id : null;
            }
            if (Schema::hasColumn('leave_requests', 'manager_name')) {
                $payload['manager_name'] = $supervisor?->full_name;
            }

            $record = LeaveRequest::create($payload);
            AuditLogger::record($request, 'Leave Management', 'Submitted leave request', $record->id, "{$record->leave_type} for {$record->employee_name}", null, $initialStatus);

            $this->notifySubmission($record, $routeToManagerFirst ? $supervisor : null);
            RealtimeEventService::publish('leave_requests', 'INSERT', $record->id, ['status' => $record->status, 'approvalStage' => $record->approval_stage], (int) $user->id);
            RealtimeEventService::publish('leave_balances', 'UPDATE', $employee->id, ['employeeId' => $employee->id], (int) $user->id);

            return $record->fresh(['employee.supervisor']);
        });
    }

    /**
     * Advance two-stage leave approval (Manager -> HR -> Complete) or reject/cancel.
     */
    public function transition(Request $request, LeaveRequest $leaveRequest, string $decision, ?string $comments = null): LeaveRequest
    {
        $user = $request->user();

        return DB::transaction(function () use ($request, $user, $leaveRequest, $decision, $comments) {
            $record = LeaveRequest::query()->lockForUpdate()->findOrFail($leaveRequest->id);
            $employee = Employee::query()->with('supervisor')->findOrFail($record->employee_id);

            abort_if(
                ! in_array($record->status, ['Pending', 'Submitted', 'Pending Review'], true),
                409,
                'Only open leave requests can be updated.'
            );

            $actorEmployee = $user->staff_id
                ? $this->employees->findByStaffId($user->staff_id)
                : null;
            $isRequester = $user->staff_id !== null && $employee->staff_id === $user->staff_id;
            $isHrOrAdmin = RoleAuthorization::isGlobalHrOrAdmin($user);
            $effectiveManagerId = $record->manager_id !== null && $record->manager_id !== ''
                ? (string) $record->manager_id
                : ($employee->manager_id !== null ? (string) $employee->manager_id : null);
            $isDirectSupervisor = $actorEmployee !== null
                && $effectiveManagerId !== null
                && $effectiveManagerId === (string) $actorEmployee->id;

            // Support legacy requests created explicitly with DEPARTMENT_HEAD / LINE_MANAGER
            $currentStage = match ($record->approval_stage) {
                'DEPARTMENT_HEAD', 'LINE_MANAGER' => 'MANAGER',
                default => $record->approval_stage ?: 'MANAGER',
            };

            if ($decision === 'Cancelled') {
                abort_unless(
                    $isRequester || $isHrOrAdmin,
                    403,
                    'Only the requester or an HR administrator can cancel this leave request.'
                );

                return $this->applyCancellation($request, $record, $employee, $user, $comments);
            }

            if ($currentStage === 'MANAGER') {
                if (! $isDirectSupervisor) {
                    if ($isHrOrAdmin) {
                        abort(403, 'This request is awaiting direct supervisor (manager) approval before HR can act.');
                    }
                    abort(403, 'Only the employee\'s direct supervisor can approve or reject at Stage 1 (Manager).');
                }
            } elseif ($currentStage === 'HR') {
                abort_unless(
                    $isHrOrAdmin,
                    403,
                    'Only HR can approve or reject at Stage 2 (HR final approval).'
                );
            } else {
                abort(409, 'This leave request has already completed its approval workflow.');
            }

            $history = $record->approval_history ?? [];
            $previousStatus = $record->status;

            if ($decision === 'Approved') {
                if ($currentStage === 'MANAGER') {
                    $nextStage = 'HR';
                    $newStatus = 'Pending Review';
                    $stoppedAtStage = null;
                } else {
                    $nextStage = 'COMPLETE';
                    $newStatus = 'Approved';
                    $stoppedAtStage = null;
                }
            } else {
                // Rejected or Requires Correction terminates the request and preserves the stage where it stopped
                $nextStage = $currentStage;
                $newStatus = $decision;
                $stoppedAtStage = $currentStage;
            }

            $now = now();
            $history[] = [
                'actor' => $user->name,
                'actorId' => $user->id,
                'role' => $user->role,
                'stage' => $currentStage,
                'decision' => $decision,
                'status' => $newStatus,
                'comments' => $comments,
                'timestamp' => $now->toISOString(),
            ];

            $updates = [
                'status' => $newStatus,
                'approval_stage' => $nextStage,
                'stopped_at_stage' => $stoppedAtStage,
                'approver_comments' => $comments,
                'approval_history' => $history,
            ];

            if ($currentStage === 'MANAGER') {
                $updates['manager_actor_id'] = $user->id;
                $updates['manager_actor_name'] = $user->name;
                $updates['manager_acted_at'] = $now;
            } elseif ($currentStage === 'HR') {
                $updates['hr_actor_id'] = $user->id;
                $updates['hr_actor_name'] = $user->name;
                $updates['hr_acted_at'] = $now;
            }

            $record->update($updates);
            $this->reconcileLeaveBalance($record, $previousStatus, $newStatus, $nextStage);

            AuditLogger::record(
                $request,
                'Leave Management',
                "Leave request {$newStatus} at {$currentStage} stage",
                $record->id,
                "{$record->leave_type} for {$record->employee_name}",
                $previousStatus,
                $newStatus,
                $decision === 'Rejected' ? 'Warning' : 'Info'
            );

            $this->notifyTransition($record, $employee, $currentStage, $decision);
            RealtimeEventService::publish('leave_requests', 'UPDATE', $record->id, ['status' => $record->status, 'approvalStage' => $record->approval_stage, 'stoppedAtStage' => $record->stopped_at_stage], (int) $user->id);
            RealtimeEventService::publish('leave_balances', 'UPDATE', $employee->id, ['employeeId' => $employee->id], (int) $user->id);

            return $record->fresh(['employee.supervisor']);
        });
    }

    private function applyCancellation(Request $request, LeaveRequest $record, Employee $employee, User $user, ?string $comments): LeaveRequest
    {
        $previousStatus = $record->status;
        $history = $record->approval_history ?? [];
        $history[] = [
            'actor' => $user->name,
            'actorId' => $user->id,
            'role' => $user->role,
            'stage' => $record->approval_stage,
            'decision' => 'Cancelled',
            'status' => 'Cancelled',
            'comments' => $comments,
            'timestamp' => now()->toISOString(),
        ];

        $record->update([
            'status' => 'Cancelled',
            'stopped_at_stage' => $record->approval_stage,
            'approver_comments' => $comments,
            'approval_history' => $history,
        ]);

        $this->reconcileLeaveBalance($record, $previousStatus, 'Cancelled', $record->approval_stage);
        AuditLogger::record($request, 'Leave Management', 'Leave request Cancelled', $record->id, "{$record->leave_type} for {$record->employee_name}", $previousStatus, 'Cancelled');
        RealtimeEventService::publish('leave_requests', 'UPDATE', $record->id, ['status' => 'Cancelled'], (int) $user->id);
        RealtimeEventService::publish('leave_balances', 'UPDATE', $employee->id, ['employeeId' => $employee->id], (int) $user->id);

        return $record->fresh(['employee.supervisor']);
    }

    private function reconcileLeaveBalance(LeaveRequest $record, string $previousStatus, string $newStatus, string $nextStage): void
    {
        $category = $this->leaves->findCategoryByName($record->leave_type);
        if ($category === null) {
            return;
        }

        $year = (int) $record->start_date->format('Y');
        $balance = $this->leaves->findLockedBalance((int) $record->employee_id, (int) $category->id, $year);
        if ($balance === null) {
            return;
        }

        if ($newStatus === 'Approved' && $nextStage === 'COMPLETE') {
            $balance->pending_days = max(0, (float) $balance->pending_days - (float) $record->total_days);
            $balance->used_days = (float) $balance->used_days + (float) $record->total_days;
            $balance->remaining_days = max(0, (float) $balance->total_days - (float) $balance->used_days - (float) $balance->pending_days);
            $balance->save();
        } elseif (in_array($newStatus, ['Rejected', 'Cancelled', 'Requires Correction'], true)) {
            if ($previousStatus === 'Approved') {
                $balance->used_days = max(0, (float) $balance->used_days - (float) $record->total_days);
            } else {
                $balance->pending_days = max(0, (float) $balance->pending_days - (float) $record->total_days);
            }
            $balance->remaining_days = max(0, (float) $balance->total_days - (float) $balance->used_days - (float) $balance->pending_days);
            $balance->save();
        }
    }

    private function notifySubmission(LeaveRequest $record, ?Employee $supervisor): void
    {
        if ($supervisor !== null) {
            $managerUser = User::query()->where('staff_id', $supervisor->staff_id)->first();
            if ($managerUser !== null) {
                SystemNotification::create([
                    'type' => 'Leave',
                    'category' => 'Leave',
                    'title' => 'Leave Request Awaiting Manager Approval',
                    'message' => "{$record->employee_name} requested {$record->total_days} day(s) of {$record->leave_type} ({$record->start_date->format('Y-m-d')} to {$record->end_date->format('Y-m-d')}).",
                    'target_user_id' => $managerUser->id,
                    'action_url' => '#leave',
                ]);
                RealtimeEventService::publish('notifications', 'INSERT', $managerUser->id);
            }

            return;
        }

        $this->notifyHr('Leave Request Awaiting HR Final Approval', "{$record->employee_name} requested {$record->total_days} day(s) of {$record->leave_type}.");
    }

    private function notifyTransition(LeaveRequest $record, Employee $employee, string $stage, string $decision): void
    {
        $requesterUser = User::query()->where('staff_id', $employee->staff_id)->first();
        if ($requesterUser !== null) {
            $stageLabel = $stage === 'MANAGER' ? 'Manager' : 'HR';
            $statusMsg = $decision === 'Approved' && $stage === 'MANAGER'
                ? "Approved by {$stageLabel} ({$record->manager_actor_name}); moved to HR for final approval."
                : ($decision === 'Approved'
                    ? "Final HR approval granted by {$record->hr_actor_name}."
                    : "Rejected at {$stageLabel} stage.");

            SystemNotification::create([
                'type' => 'Leave',
                'category' => 'Leave',
                'title' => "Leave Request {$decision} ({$stageLabel})",
                'message' => "{$record->leave_type} ({$record->start_date->format('Y-m-d')} to {$record->end_date->format('Y-m-d')}): {$statusMsg}",
                'target_user_id' => $requesterUser->id,
                'action_url' => '#leave',
            ]);
            RealtimeEventService::publish('notifications', 'INSERT', $requesterUser->id);
        }

        if ($decision === 'Approved' && $stage === 'MANAGER') {
            $this->notifyHr(
                'Leave Request Ready for HR Final Approval',
                "{$record->employee_name}'s {$record->leave_type} was approved by manager {$record->manager_actor_name} and awaits HR sign-off."
            );
        }
    }

    private function notifyHr(string $title, string $message): void
    {
        $hrUsers = User::query()
            ->where('is_active', true)
            ->whereIn('role', ['HR_STAFF', 'HR', 'HR_MANAGER', 'PCCM_SUPER_ADMIN', 'ADMIN', 'SYSTEM_ADMIN'])
            ->get();

        foreach ($hrUsers as $hrUser) {
            SystemNotification::create([
                'type' => 'Leave',
                'category' => 'Leave',
                'title' => $title,
                'message' => $message,
                'target_user_id' => $hrUser->id,
                'action_url' => '#leave',
            ]);
        }
        RealtimeEventService::publish('notifications', 'INSERT');
    }
}
