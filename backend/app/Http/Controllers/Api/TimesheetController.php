<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Timesheet;
use App\Models\TimesheetActionLog;
use App\Models\TimesheetItem;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Manages weekly/monthly employee timesheets, activity logs, and approval workflows.
 * Replicates the Timesheet workflow state machine of OrangeHRM Time Plugin.
 */
class TimesheetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Timesheet::query()->with(['employee:id,staff_id,full_name,department_id,entity_id', 'approver:id,name']);

        $role = RoleAuthorization::canonical($user->role);
        abort_unless(in_array($role, ['ADMIN', 'HR_STAFF', 'EMPLOYEE'], true), 403, 'Unauthorized.');

        if ($role === 'EMPLOYEE') {
            $employee = Employee::query()->where('staff_id', $user->staff_id)->first();
            if (! $employee) {
                return response()->json(['data' => []]);
            }
            $query->where('employee_id', $employee->id);
        } elseif (strtoupper(trim($user->role)) === 'DEPARTMENT_HEAD') {
            $query->whereIn('employee_id', Employee::query()->select('id')->where('department_id', $user->department_id));
        } elseif (strtoupper(trim($user->role)) === 'BUSINESS_HEAD') {
            $query->whereIn('employee_id', Employee::query()->select('id')->where('entity_id', $user->entity_id));
        }

        if ($request->filled('employeeId')) {
            $query->where('employee_id', $request->input('employeeId'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json([
            'data' => $query->latest('period_start')->limit(200)->get()->map(fn (Timesheet $ts) => $this->present($ts)),
        ]);
    }

    public function show(Request $request, Timesheet $timesheet): JsonResponse
    {
        $this->ensureCanAccessTimesheet($request, $timesheet);

        return response()->json([
            'data' => $this->present($timesheet->load(['employee', 'items.project', 'actionLogs.performer', 'approver'])),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'employeeId' => ['required', 'exists:employees,id'],
            'periodStart' => ['required', 'date_format:Y-m-d'],
            'periodEnd' => ['required', 'date_format:Y-m-d', 'after_or_equal:periodStart'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.projectId' => ['nullable', 'exists:projects,id'],
            'items.*.activityName' => ['required', 'string', 'max:180'],
            'items.*.date' => ['required', 'date_format:Y-m-d', 'after_or_equal:periodStart', 'before_or_equal:periodEnd'],
            'items.*.durationHours' => ['required', 'numeric', 'min:0.25', 'max:24'],
            'items.*.notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $employee = Employee::query()->findOrFail($data['employeeId']);
        $this->ensureCanModifyEmployeeTimesheet($request, $employee);

        $timesheet = DB::transaction(function () use ($request, $user, $employee, $data) {
            $timesheet = Timesheet::query()->firstOrNew([
                'employee_id' => $employee->id,
                'period_start' => $data['periodStart'],
            ]);

            if ($timesheet->exists && ! in_array($timesheet->status, ['DRAFT', 'REJECTED'], true)) {
                abort(409, 'Only Draft or Rejected timesheets can be updated.');
            }

            $timesheet->period_end = $data['periodEnd'];
            $timesheet->status = 'DRAFT';
            $timesheet->comments = $data['comments'] ?? $timesheet->comments;
            $timesheet->save();

            // Clear previous items if replacing
            $timesheet->items()->delete();

            $totalHours = 0;
            foreach ($data['items'] as $item) {
                $duration = (float) $item['durationHours'];
                $totalHours += $duration;
                TimesheetItem::create([
                    'timesheet_id' => $timesheet->id,
                    'project_id' => $item['projectId'] ?? null,
                    'activity_name' => $item['activityName'],
                    'date' => $item['date'],
                    'duration_hours' => $duration,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            $timesheet->total_hours = $totalHours;
            $timesheet->save();

            TimesheetActionLog::create([
                'timesheet_id' => $timesheet->id,
                'action' => 'CREATE',
                'performed_by' => $user->id,
                'comments' => 'Timesheet drafted with '.$totalHours.' total hours.',
            ]);

            AuditLogger::record($request, 'Timesheets', 'Drafted Timesheet', (string) $timesheet->id, "Timesheet for {$employee->full_name}", null, 'DRAFT');

            return $timesheet;
        });

        return response()->json(['data' => $this->present($timesheet->load(['employee', 'items.project', 'actionLogs']))], 201);
    }

    public function submit(Request $request, Timesheet $timesheet): JsonResponse
    {
        $this->ensureCanAccessTimesheet($request, $timesheet);
        abort_unless(in_array($timesheet->status, ['DRAFT', 'REJECTED'], true), 409, 'Only Draft or Rejected timesheets can be submitted.');

        $timesheet = DB::transaction(function () use ($request, $timesheet) {
            $user = $request->user();
            $timesheet->update([
                'status' => 'SUBMITTED',
                'submitted_at' => now(),
            ]);

            TimesheetActionLog::create([
                'timesheet_id' => $timesheet->id,
                'action' => 'SUBMIT',
                'performed_by' => $user->id,
                'comments' => 'Timesheet submitted for supervisory approval.',
            ]);

            AuditLogger::record($request, 'Timesheets', 'Submitted Timesheet', (string) $timesheet->id, "Timesheet #{$timesheet->id}", 'DRAFT', 'SUBMITTED');

            return $timesheet;
        });

        return response()->json(['data' => $this->present($timesheet->load(['employee', 'items', 'actionLogs']))]);
    }

    public function approve(Request $request, Timesheet $timesheet): JsonResponse
    {
        $this->authorizeApprover($request, $timesheet);
        abort_unless($timesheet->status === 'SUBMITTED', 409, 'Only submitted timesheets can be approved.');

        $timesheet = DB::transaction(function () use ($request, $timesheet) {
            $user = $request->user();
            $timesheet->update([
                'status' => 'APPROVED',
                'approved_by' => $user->id,
                'approved_at' => now(),
            ]);

            TimesheetActionLog::create([
                'timesheet_id' => $timesheet->id,
                'action' => 'APPROVE',
                'performed_by' => $user->id,
                'comments' => $request->input('comments', 'Timesheet approved by supervisor.'),
            ]);

            AuditLogger::record($request, 'Timesheets', 'Approved Timesheet', (string) $timesheet->id, "Timesheet #{$timesheet->id}", 'SUBMITTED', 'APPROVED');

            return $timesheet;
        });

        return response()->json(['data' => $this->present($timesheet->load(['employee', 'items', 'actionLogs']))]);
    }

    public function reject(Request $request, Timesheet $timesheet): JsonResponse
    {
        $this->authorizeApprover($request, $timesheet);
        abort_unless($timesheet->status === 'SUBMITTED', 409, 'Only submitted timesheets can be rejected.');

        $data = $request->validate([
            'comments' => ['required', 'string', 'max:1000'],
        ]);

        $timesheet = DB::transaction(function () use ($request, $timesheet, $data) {
            $user = $request->user();
            $timesheet->update([
                'status' => 'REJECTED',
                'comments' => $data['comments'],
            ]);

            TimesheetActionLog::create([
                'timesheet_id' => $timesheet->id,
                'action' => 'REJECT',
                'performed_by' => $user->id,
                'comments' => $data['comments'],
            ]);

            AuditLogger::record($request, 'Timesheets', 'Rejected Timesheet', (string) $timesheet->id, "Timesheet #{$timesheet->id}", 'SUBMITTED', 'REJECTED');

            return $timesheet;
        });

        return response()->json(['data' => $this->present($timesheet->load(['employee', 'items', 'actionLogs']))]);
    }

    public function reset(Request $request, Timesheet $timesheet): JsonResponse
    {
        $this->ensureCanAccessTimesheet($request, $timesheet);
        abort_unless(in_array($timesheet->status, ['SUBMITTED', 'REJECTED'], true), 409, 'Cannot reset an approved timesheet.');

        $timesheet = DB::transaction(function () use ($request, $timesheet) {
            $user = $request->user();
            $previousStatus = $timesheet->status;
            $timesheet->update([
                'status' => 'DRAFT',
            ]);

            TimesheetActionLog::create([
                'timesheet_id' => $timesheet->id,
                'action' => 'RESET',
                'performed_by' => $user->id,
                'comments' => 'Reset to draft state for modifications.',
            ]);

            AuditLogger::record($request, 'Timesheets', 'Reset Timesheet', (string) $timesheet->id, "Timesheet #{$timesheet->id}", $previousStatus, 'DRAFT');

            return $timesheet;
        });

        return response()->json(['data' => $this->present($timesheet->load(['employee', 'items', 'actionLogs']))]);
    }

    private function ensureCanAccessTimesheet(Request $request, Timesheet $timesheet): void
    {
        $user = $request->user();
        $employee = Employee::query()->findOrFail($timesheet->employee_id);
        $role = RoleAuthorization::canonical($user->role);

        $allowed = in_array($role, ['ADMIN', 'HR_STAFF'], true)
            || ($role === 'EMPLOYEE' && $employee->staff_id === $user->staff_id)
            || (strtoupper(trim($user->role)) === 'DEPARTMENT_HEAD' && $employee->department_id === $user->department_id)
            || (strtoupper(trim($user->role)) === 'BUSINESS_HEAD' && $employee->entity_id === $user->entity_id);

        abort_unless($allowed, 403, 'Unauthorized access to this timesheet.');
    }

    private function ensureCanModifyEmployeeTimesheet(Request $request, Employee $employee): void
    {
        $user = $request->user();
        $role = RoleAuthorization::canonical($user->role);
        $allowed = ($role === 'EMPLOYEE' && $employee->staff_id === $user->staff_id)
            || RoleAuthorization::canManageEmployee($user, $employee);

        abort_unless($allowed, 403, 'You are not authorized to log timesheets for this employee.');
    }

    private function authorizeApprover(Request $request, Timesheet $timesheet): void
    {
        $user = $request->user();
        $employee = Employee::query()->findOrFail($timesheet->employee_id);
        $role = RoleAuthorization::canonical($user->role);

        $allowed = in_array($role, ['ADMIN', 'HR_STAFF'], true)
            || (strtoupper(trim($user->role)) === 'DEPARTMENT_HEAD' && $employee->department_id === $user->department_id)
            || (strtoupper(trim($user->role)) === 'BUSINESS_HEAD' && $employee->entity_id === $user->entity_id);

        abort_unless($allowed, 403, 'You do not have supervisory authority to approve or reject this timesheet.');
    }

    private function present(Timesheet $ts): array
    {
        return [
            'id' => $ts->id,
            'employeeId' => $ts->employee_id,
            'employeeName' => $ts->employee?->full_name,
            'employeeStaffId' => $ts->employee?->staff_id,
            'periodStart' => $ts->period_start->format('Y-m-d'),
            'periodEnd' => $ts->period_end->format('Y-m-d'),
            'status' => $ts->status,
            'totalHours' => (float) $ts->total_hours,
            'submittedAt' => $ts->submitted_at?->toISOString(),
            'approvedBy' => $ts->approver?->name,
            'approvedAt' => $ts->approved_at?->toISOString(),
            'comments' => $ts->comments,
            'items' => $ts->relationLoaded('items') ? $ts->items->map(fn (TimesheetItem $item) => [
                'id' => $item->id,
                'projectId' => $item->project_id,
                'projectName' => $item->project?->title,
                'activityName' => $item->activity_name,
                'date' => $item->date->format('Y-m-d'),
                'durationHours' => (float) $item->duration_hours,
                'notes' => $item->notes,
            ]) : [],
            'actionLogs' => $ts->relationLoaded('actionLogs') ? $ts->actionLogs->map(fn (TimesheetActionLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'performer' => $log->performer?->name,
                'comments' => $log->comments,
                'timestamp' => $log->created_at->toISOString(),
            ]) : [],
        ];
    }
}
