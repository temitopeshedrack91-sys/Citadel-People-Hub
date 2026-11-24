<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\OffboardingRequest;
use App\Models\SystemNotification;
use App\Models\User;
use App\Services\EmployeeHierarchyService;
use App\Services\RealtimeEventService;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Sequential 5-Stage Offboarding & Clearance Controller:
 * 1. Resignation Submission (SUBMITTED)
 * 2. Manager Endorsement (MANAGER_REVIEWED)
 * 3. HR Notice & Contract Verification (NOTICE_VERIFIED)
 * 4. Exit Interview Scheduling (INTERVIEW_SCHEDULED)
 * 5. Multi-Department Clearance (CLEARANCE_IN_PROGRESS) -> Final Settlement (OFFBOARDED)
 */
class OffboardingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(RoleAuthorization::canonical($user->role) !== 'VIEWER', 403, 'Unauthorized.');

        $query = OffboardingRequest::query()->with(['employee.entity', 'employee.department', 'employee.supervisor']);

        if (! RoleAuthorization::isGlobalHrOrAdmin($user)) {
            $selfEmployee = $user->staff_id
                ? Employee::query()->where('staff_id', $user->staff_id)->first()
                : null;

            if (! $selfEmployee) {
                return response()->json(['data' => []]);
            }

            if (RoleAuthorization::isSupervisor($user)) {
                $teamIds = app(EmployeeHierarchyService::class)->getSubtreeEmployeeIds((int) $selfEmployee->id);
                $allowedIds = array_values(array_unique(array_merge([(int) $selfEmployee->id], $teamIds)));
                $query->where(function ($q) use ($allowedIds, $selfEmployee) {
                    $q->whereIn('employee_id', $allowedIds)
                        ->orWhere('manager_id', (string) $selfEmployee->id);
                });
            } else {
                $query->where('employee_id', $selfEmployee->id);
            }
        }

        $records = $query->latest()->limit(200)->get();

        return response()->json([
            'data' => $records->map(fn (OffboardingRequest $req) => $this->present($req)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(RoleAuthorization::canonical($user->role) !== 'VIEWER', 403, 'Read-only users cannot initiate offboarding.');

        $empInput = $request->input('employeeId');
        $selfEmployee = $user->staff_id
            ? Employee::query()->where('staff_id', $user->staff_id)->first()
            : null;
        if (! $empInput && $selfEmployee) {
            $request->merge(['employeeId' => $selfEmployee->id]);
        }

        $data = $request->validate([
            'employeeId' => ['required', 'integer', 'exists:employees,id'],
            'resignationDate' => ['required', 'date_format:Y-m-d'],
            'proposedLastDay' => ['required', 'date_format:Y-m-d', 'after_or_equal:resignationDate'],
            'reason' => ['required', 'string', 'max:3000'],
            'managerName' => ['nullable', 'string', 'max:180'],
        ]);

        $targetEmployee = Employee::query()->with(['entity', 'department', 'supervisor'])->findOrFail($data['employeeId']);

        $isSelf = $selfEmployee && $selfEmployee->id === $targetEmployee->id;
        abort_unless(
            $isSelf || RoleAuthorization::isGlobalHrOrAdmin($user) || RoleAuthorization::canManageEmployee($user, $targetEmployee),
            403,
            'You are not authorized to initiate offboarding for this employee.'
        );

        $hasActiveExit = OffboardingRequest::query()
            ->where('employee_id', $targetEmployee->id)
            ->where('status', '!=', 'OFFBOARDED')
            ->exists();
        abort_if($hasActiveExit, 422, "{$targetEmployee->full_name} already has an active offboarding request in progress.");

        $start = Carbon::parse($data['resignationDate']);
        $end = Carbon::parse($data['proposedLastDay']);
        $noticeDays = max(0, (int) $start->diffInDays($end));
        $noticeCompliant = $noticeDays >= 30;

        $managerId = $targetEmployee->manager_id ? (string) $targetEmployee->manager_id : null;
        $managerName = $targetEmployee->supervisor?->full_name
            ?? $targetEmployee->manager_name
            ?? ($data['managerName'] ?? 'PCCM Manager');

        $record = DB::transaction(function () use ($request, $user, $targetEmployee, $managerId, $managerName, $data, $noticeDays, $noticeCompliant): OffboardingRequest {
            $exit = OffboardingRequest::create([
                'employee_id' => $targetEmployee->id,
                'manager_id' => $managerId,
                'manager_name' => $managerName,
                'resignation_date' => $data['resignationDate'],
                'proposed_last_day' => $data['proposedLastDay'],
                'notice_period_days' => $noticeDays,
                'notice_compliant' => $noticeCompliant,
                'reason' => trim($data['reason']),
                'manager_endorsed' => false,
                'hr_verified' => false,
                'status' => 'SUBMITTED',
                'clearances' => [
                    'it' => false,
                    'facilities' => false,
                    'finance' => false,
                    'hr' => false,
                ],
                'clearance_notes' => [],
                'created_by_user_id' => $user->id,
                'version' => 1,
            ]);

            $this->notifyManagersAndHr($targetEmployee, 'Resignation Submitted', "{$targetEmployee->full_name} submitted an exit request (Last Day: {$data['proposedLastDay']}).");
            AuditLogger::record($request, 'Offboarding', 'Submitted Resignation', $exit->id, $targetEmployee->full_name, 'Active', 'SUBMITTED');
            RealtimeEventService::publish('offboarding_requests', 'INSERT', $exit->id, ['status' => 'SUBMITTED'], (int) $user->id);

            return $exit->load(['employee.entity', 'employee.department', 'employee.supervisor']);
        });

        return response()->json(['data' => $this->present($record)], 201);
    }

    public function managerEndorse(Request $request, OffboardingRequest $offboardingRequest): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'managerComments' => ['nullable', 'string', 'max:2000'],
            'version' => ['sometimes', 'integer', 'min:1'],
        ]);

        $updated = DB::transaction(function () use ($request, $user, $offboardingRequest, $data): OffboardingRequest {
            $locked = OffboardingRequest::query()->with(['employee.entity', 'employee.department', 'employee.supervisor'])->lockForUpdate()->findOrFail($offboardingRequest->id);

            $this->assertVersion($locked, $data['version'] ?? null);
            $this->authorizeManagerStage($user, $locked);

            abort_unless(
                $locked->status === 'SUBMITTED' && ! $locked->manager_endorsed,
                409,
                "Cannot endorse out of order: request is in '{$locked->status}' stage and requires SUBMITTED status."
            );

            $locked->update([
                'manager_endorsed' => true,
                'manager_endorsed_by_id' => $user->id,
                'manager_endorsed_at' => now(),
                'manager_comments' => trim((string) ($data['managerComments'] ?? 'Handover plan verified by line manager and forwarded to HR.')),
                'status' => 'MANAGER_REVIEWED',
                'version' => ((int) $locked->version) + 1,
            ]);

            SystemNotification::create([
                'type' => 'info',
                'category' => 'Offboarding',
                'title' => 'Offboarding Endorsed by Manager',
                'message' => "{$locked->employee->full_name}'s resignation was endorsed by {$user->name} and awaits HR contract verification.",
                'target_user_role' => 'HR_STAFF',
                'action_url' => '/offboarding',
            ]);

            AuditLogger::record($request, 'Offboarding', 'Manager Endorsed Resignation', $locked->id, $locked->employee->full_name, 'SUBMITTED', 'MANAGER_REVIEWED');
            RealtimeEventService::publish('offboarding_requests', 'UPDATE', $locked->id, ['status' => 'MANAGER_REVIEWED'], (int) $user->id);

            return $locked->fresh(['employee.entity', 'employee.department', 'employee.supervisor']);
        });

        return response()->json(['data' => $this->present($updated)]);
    }

    public function verifyNotice(Request $request, OffboardingRequest $offboardingRequest): JsonResponse
    {
        $user = $request->user();
        abort_unless(RoleAuthorization::isGlobalHrOrAdmin($user), 403, 'Only HR/Admin can verify contract & notice period.');

        $data = $request->validate([
            'contractNotes' => ['nullable', 'string', 'max:2000'],
            'noticeCompliant' => ['sometimes', 'boolean'],
            'version' => ['sometimes', 'integer', 'min:1'],
        ]);

        $updated = DB::transaction(function () use ($request, $user, $offboardingRequest, $data): OffboardingRequest {
            $locked = OffboardingRequest::query()->with(['employee.entity', 'employee.department', 'employee.supervisor'])->lockForUpdate()->findOrFail($offboardingRequest->id);

            $this->assertVersion($locked, $data['version'] ?? null);
            abort_unless(
                $locked->manager_endorsed && $locked->status === 'MANAGER_REVIEWED',
                409,
                'Sequential stage error: Stage 2 Manager Endorsement must complete before Stage 3 HR Notice Verification.'
            );

            $locked->update([
                'hr_verified' => true,
                'hr_verified_by_id' => $user->id,
                'hr_verified_at' => now(),
                'notice_compliant' => $data['noticeCompliant'] ?? $locked->notice_compliant,
                'contract_notes' => $data['contractNotes'] ?? 'Contract notice obligations verified by HR.',
                'status' => 'NOTICE_VERIFIED',
                'version' => ((int) $locked->version) + 1,
            ]);

            AuditLogger::record($request, 'Offboarding', 'HR Verified Contract & Notice', $locked->id, $locked->employee->full_name, 'MANAGER_REVIEWED', 'NOTICE_VERIFIED');
            RealtimeEventService::publish('offboarding_requests', 'UPDATE', $locked->id, ['status' => 'NOTICE_VERIFIED'], (int) $user->id);

            return $locked->fresh(['employee.entity', 'employee.department', 'employee.supervisor']);
        });

        return response()->json(['data' => $this->present($updated)]);
    }

    public function scheduleInterview(Request $request, OffboardingRequest $offboardingRequest): JsonResponse
    {
        $user = $request->user();
        abort_unless(RoleAuthorization::isGlobalHrOrAdmin($user), 403, 'Only HR/Admin can schedule exit interviews.');

        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'time' => ['required', 'string', 'max:40'],
            'mode' => ['required', Rule::in(['In-Person', 'MS Teams'])],
            'interviewer' => ['required', 'string', 'max:180'],
            'feedback' => ['nullable', 'string', 'max:2000'],
            'version' => ['sometimes', 'integer', 'min:1'],
        ]);

        $updated = DB::transaction(function () use ($request, $user, $offboardingRequest, $data): OffboardingRequest {
            $locked = OffboardingRequest::query()->with(['employee.entity', 'employee.department', 'employee.supervisor'])->lockForUpdate()->findOrFail($offboardingRequest->id);

            $this->assertVersion($locked, $data['version'] ?? null);
            abort_unless(
                $locked->hr_verified && in_array($locked->status, ['NOTICE_VERIFIED', 'INTERVIEW_SCHEDULED'], true),
                409,
                'Sequential stage error: Stage 3 HR Notice Verification must complete before scheduling an Exit Interview.'
            );

            $previousStatus = $locked->status;
            $interviewPayload = [
                'date' => $data['date'],
                'time' => $data['time'],
                'mode' => $data['mode'],
                'interviewer' => trim($data['interviewer']),
                'feedback' => $data['feedback'] ?? '',
            ];

            $locked->update([
                'exit_interview' => $interviewPayload,
                'status' => 'INTERVIEW_SCHEDULED',
                'version' => ((int) $locked->version) + 1,
            ]);

            $targetUser = User::query()->where('staff_id', $locked->employee->staff_id)->first();
            SystemNotification::create([
                'type' => 'info',
                'category' => 'Offboarding',
                'title' => 'Scheduled Exit Interview',
                'message' => "Exit interview scheduled on {$data['date']} at {$data['time']} ({$data['mode']}) with {$data['interviewer']}.",
                'target_user_id' => $targetUser?->id,
                'action_url' => '/offboarding',
            ]);

            AuditLogger::record($request, 'Offboarding', 'Scheduled Exit Interview', $locked->id, $locked->employee->full_name, $previousStatus, 'INTERVIEW_SCHEDULED');
            RealtimeEventService::publish('offboarding_requests', 'UPDATE', $locked->id, ['status' => 'INTERVIEW_SCHEDULED'], (int) $user->id);
            RealtimeEventService::publish('notifications', 'INSERT', $locked->id, [], (int) $user->id);

            return $locked->fresh(['employee.entity', 'employee.department', 'employee.supervisor']);
        });

        return response()->json(['data' => $this->present($updated)]);
    }

    public function updateClearance(Request $request, OffboardingRequest $offboardingRequest): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            RoleAuthorization::isGlobalHrOrAdmin($user) || RoleAuthorization::isSupervisor($user),
            403,
            'You are not authorized to sign off departmental clearances.'
        );

        $data = $request->validate([
            'department' => ['required', Rule::in(['it', 'facilities', 'finance', 'hr'])],
            'cleared' => ['required', 'boolean'],
            'note' => ['nullable', 'string', 'max:500'],
            'version' => ['sometimes', 'integer', 'min:1'],
        ]);

        if (in_array($data['department'], ['hr', 'finance'], true) && ! RoleAuthorization::isGlobalHrOrAdmin($user)) {
            abort(403, 'Only HR/Admin or Finance-authorized personnel can sign off Finance or HR clearance.');
        }

        $updated = DB::transaction(function () use ($request, $user, $offboardingRequest, $data): OffboardingRequest {
            $locked = OffboardingRequest::query()->with(['employee.entity', 'employee.department', 'employee.supervisor'])->lockForUpdate()->findOrFail($offboardingRequest->id);

            $this->assertVersion($locked, $data['version'] ?? null);
            abort_unless(
                $locked->manager_endorsed
                && $locked->hr_verified
                && ! empty($locked->exit_interview)
                && in_array($locked->status, ['INTERVIEW_SCHEDULED', 'CLEARANCE_IN_PROGRESS'], true),
                409,
                'Sequential stage error: Stages 1–4 (Submission, Manager Endorsement, Notice Check, Exit Interview) must complete before departmental clearances.'
            );

            // Prevent Finance sign-off while employee still carries active unsettled loans
            if ($data['department'] === 'finance' && $data['cleared']) {
                $blockingLoans = $this->findBlockingLoans($locked->employee_id);
                if ($blockingLoans !== []) {
                    abort(
                        422,
                        'Finance clearance blocked by active unsettled employee loan(s): '.implode(', ', $blockingLoans).'. Settle or close loans before clearing Finance.'
                    );
                }
            }

            $clearances = array_merge([
                'it' => false,
                'facilities' => false,
                'finance' => false,
                'hr' => false,
            ], $locked->clearances ?? []);
            $clearances[$data['department']] = $data['cleared'];

            $notes = $locked->clearance_notes ?? [];
            if (array_key_exists('note', $data)) {
                $notes[$data['department']] = $data['note'];
            }

            $locked->update([
                'clearances' => $clearances,
                'clearance_notes' => $notes,
                'status' => 'CLEARANCE_IN_PROGRESS',
                'version' => ((int) $locked->version) + 1,
            ]);

            AuditLogger::record($request, 'Offboarding', 'Updated Departmental Clearance', $locked->id, "{$locked->employee->full_name} ({$data['department']})", null, $data['cleared'] ? 'Cleared' : 'Pending');
            RealtimeEventService::publish('offboarding_requests', 'UPDATE', $locked->id, ['department' => $data['department']], (int) $user->id);

            return $locked->fresh(['employee.entity', 'employee.department', 'employee.supervisor']);
        });

        return response()->json(['data' => $this->present($updated)]);
    }

    public function finalize(Request $request, OffboardingRequest $offboardingRequest): JsonResponse
    {
        $user = $request->user();
        abort_unless(RoleAuthorization::isGlobalHrOrAdmin($user), 403, 'Only HR/Admin can authorize final settlement & offboarding completion.');

        $data = $request->validate([
            'settlementNotes' => ['nullable', 'string', 'max:2000'],
            'version' => ['sometimes', 'integer', 'min:1'],
        ]);

        $updated = DB::transaction(function () use ($request, $user, $offboardingRequest, $data): OffboardingRequest {
            $locked = OffboardingRequest::query()->with(['employee.entity', 'employee.department', 'employee.supervisor'])->lockForUpdate()->findOrFail($offboardingRequest->id);

            $this->assertVersion($locked, $data['version'] ?? null);
            abort_unless($locked->status !== 'OFFBOARDED', 409, 'This offboarding case is already finalized.');
            abort_unless(
                $locked->manager_endorsed
                && $locked->hr_verified
                && ! empty($locked->exit_interview)
                && in_array($locked->status, ['INTERVIEW_SCHEDULED', 'CLEARANCE_IN_PROGRESS'], true),
                409,
                'Sequential stage error: all prerequisite stages (2–4) must complete before final settlement.'
            );

            $clearances = $locked->clearances ?? [];
            $deptLabels = [
                'it' => 'IT Hardware & Email',
                'facilities' => 'Facilities & Security',
                'finance' => 'Finance & Loans',
                'hr' => 'HR Service Certificate',
            ];
            $pending = [];
            foreach ($deptLabels as $key => $label) {
                if (empty($clearances[$key])) {
                    $pending[] = $label;
                }
            }
            if ($pending !== []) {
                abort(422, 'Final settlement blocked: pending departmental clearance items in '.implode(', ', $pending).'.');
            }

            $blockingLoans = $this->findBlockingLoans($locked->employee_id);
            if ($blockingLoans !== []) {
                abort(422, 'Final settlement blocked by unsettled employee loan(s): '.implode(', ', $blockingLoans).'.');
            }

            $locked->update([
                'status' => 'OFFBOARDED',
                'final_settled_at' => now(),
                'final_settled_by_id' => $user->id,
                'settlement_notes' => trim((string) ($data['settlementNotes'] ?? 'All departmental clearances certified and final payroll settlement released.')),
                'version' => ((int) $locked->version) + 1,
            ]);

            $locked->employee->update([
                'status' => 'Resigned',
                'contract_status' => 'Inactive',
            ]);

            AuditLogger::record($request, 'Offboarding', 'Finalized Offboarding & Settlement', $locked->id, $locked->employee->full_name, 'CLEARANCE_IN_PROGRESS', 'OFFBOARDED');
            RealtimeEventService::publish('offboarding_requests', 'UPDATE', $locked->id, ['status' => 'OFFBOARDED'], (int) $user->id);
            RealtimeEventService::publish('employees', 'UPDATE', $locked->employee_id, ['status' => 'Resigned'], (int) $user->id);

            return $locked->fresh(['employee.entity', 'employee.department', 'employee.supervisor']);
        });

        return response()->json(['data' => $this->present($updated)]);
    }

    private function assertVersion(OffboardingRequest $locked, mixed $expectedVersion): void
    {
        if ($expectedVersion !== null && (int) $locked->version !== (int) $expectedVersion) {
            abort(409, 'This offboarding record was updated by another user. Refresh before saving.');
        }
    }

    private function authorizeManagerStage(User $user, OffboardingRequest $exit): void
    {
        if (RoleAuthorization::isGlobalHrOrAdmin($user)) {
            return;
        }

        $selfEmployee = $user->staff_id
            ? Employee::query()->where('staff_id', $user->staff_id)->first()
            : null;
        if ($selfEmployee && $exit->manager_id && (int) $exit->manager_id === (int) $selfEmployee->id) {
            return;
        }

        if (RoleAuthorization::canManageEmployee($user, $exit->employee)) {
            return;
        }

        abort(403, 'You are not authorized to endorse this employee\'s resignation.');
    }

    /** @return array<int, string> */
    private function findBlockingLoans(int $employeeId): array
    {
        $loans = EmployeeLoan::query()
            ->with('installments')
            ->where('employee_id', $employeeId)
            ->whereNotIn('status', ['paid', 'closed', 'rejected', 'cancelled'])
            ->get();

        $blockers = [];
        foreach ($loans as $loan) {
            $remaining = (float) $loan->remaining_balance;
            if ($remaining > 0.01) {
                $blockers[] = sprintf('%s (Balance: %.2f)', $loan->loan_number, $remaining);
            }
        }

        return $blockers;
    }

    private function notifyManagersAndHr(Employee $employee, string $title, string $message): void
    {
        if ($employee->manager_id) {
            $mgr = Employee::query()->find($employee->manager_id);
            $mgrUser = $mgr ? User::query()->where('staff_id', $mgr->staff_id)->first() : null;
            if ($mgrUser) {
                SystemNotification::create([
                    'type' => 'warning',
                    'category' => 'Offboarding',
                    'title' => $title,
                    'message' => $message,
                    'target_user_id' => $mgrUser->id,
                    'action_url' => '/offboarding',
                ]);
            }
        }

        SystemNotification::create([
            'type' => 'info',
            'category' => 'Offboarding',
            'title' => $title,
            'message' => $message,
            'target_user_role' => 'HR_STAFF',
            'action_url' => '/offboarding',
        ]);
    }

    private function present(OffboardingRequest $req): array
    {
        $blockingLoans = $this->findBlockingLoans($req->employee_id);
        $clearances = array_merge([
            'it' => false,
            'facilities' => false,
            'finance' => false,
            'hr' => false,
        ], $req->clearances ?? []);

        return [
            'id' => $req->id,
            'employeeId' => (string) $req->employee_id,
            'employeeName' => $req->employee?->full_name ?? 'Staff Member',
            'staffId' => $req->employee?->staff_id ?? '',
            'departmentName' => $req->employee?->department?->name ?? '',
            'entityName' => $req->employee?->entity?->name ?? '',
            'resignationDate' => $req->resignation_date?->format('Y-m-d'),
            'proposedLastDay' => $req->proposed_last_day?->format('Y-m-d'),
            'noticePeriodDays' => (int) $req->notice_period_days,
            'noticeCompliant' => (bool) $req->notice_compliant,
            'reason' => $req->reason,
            'managerId' => $req->manager_id ? (string) $req->manager_id : null,
            'managerName' => $req->manager_name ?: ($req->employee?->supervisor?->full_name ?? ''),
            'managerEndorsed' => (bool) $req->manager_endorsed,
            'managerEndorsedAt' => $req->manager_endorsed_at?->toISOString(),
            'managerComments' => $req->manager_comments,
            'hrVerified' => (bool) $req->hr_verified,
            'hrVerifiedAt' => $req->hr_verified_at?->toISOString(),
            'contractNotes' => $req->contract_notes,
            'status' => $req->status,
            'exitInterview' => $req->exit_interview,
            'clearances' => $clearances,
            'clearanceNotes' => $req->clearance_notes ?? [],
            'blockingLoans' => $blockingLoans,
            'finalSettledAt' => $req->final_settled_at?->toISOString(),
            'settlementNotes' => $req->settlement_notes,
            'version' => (int) ($req->version ?? 1),
            'updatedAt' => $req->updated_at?->toISOString(),
        ];
    }
}
