<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeLifecycleEvent;
use App\Models\ProfileChangeRequest;
use App\Services\RealtimeEventService;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Workbook Sheets 5 & 14 Governance API:
 * - Sheet 5: Staged employee profile change requests gated by mandatory HR approval.
 * - Sheet 14: Employee lifecycle transitions (Confirmation, Promotion, Transfer) with audit trail.
 */
class GovernanceController extends Controller
{
    /** @var array<int, string> */
    private const EMPLOYEE_EDITABLE_FIELDS = [
        'phone',
        'email',
        'address',
        'maritalStatus',
        'nextOfKin',
        'nextOfKinName',
        'nextOfKinRelationship',
        'nextOfKinPhone',
        'nextOfKinAddress',
        'emergencyContact',
        'emergencyContactName',
        'emergencyContactRelationship',
        'emergencyContactPhone',
        'qualifications',
        'certifications',
        'bankName',
        'accountNumber',
        'accountName',
        'pfaName',
        'rsaPin',
        'hmoProvider',
        'hmoPlan',
        'profilePhoto',
        'profilePhotoUrl',
    ];

    /**
     * GET /api/v1/governance/profile-change-requests
     */
    public function indexProfileChanges(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = ProfileChangeRequest::query()->latest('created_at');

        if (! RoleAuthorization::isGlobalHrOrAdmin($user)) {
            $visibleIds = RoleAuthorization::visibleEmployees($user)->pluck('id');
            $query->whereIn('employee_id', $visibleIds);
        }

        return response()->json([
            'data' => $query->limit(200)->get()->map(fn (ProfileChangeRequest $item) => $this->presentProfileChange($item)),
        ]);
    }

    /**
     * POST /api/v1/governance/profile-change-requests
     */
    public function storeProfileChange(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employeeId' => ['required', 'exists:employees,id'],
            'changes' => ['required', 'array', 'min:1'],
            'changes.*.fieldKey' => ['required', 'string', 'max:60'],
            'changes.*.fieldLabel' => ['sometimes', 'string', 'max:120'],
            'changes.*.oldValue' => ['nullable', 'string', 'max:1000'],
            'changes.*.newValue' => ['required', 'string', 'max:1000'],
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $user = $request->user();
        $employee = Employee::query()->findOrFail($data['employeeId']);
        $isHr = RoleAuthorization::isGlobalHrOrAdmin($user);
        $isSelf = $user->staff_id !== null && $user->staff_id === $employee->staff_id;

        abort_unless($isHr || $isSelf, 403, 'You can only submit profile change requests for your own record.');

        foreach ($data['changes'] as $change) {
            if (! $isHr && ! in_array($change['fieldKey'], self::EMPLOYEE_EDITABLE_FIELDS, true)) {
                abort(403, "Field '{$change['fieldKey']}' is HR-only and cannot be modified by employees (Sheet 5).");
            }
        }

        $record = DB::transaction(function () use ($request, $user, $employee, $data, $isHr): ProfileChangeRequest {
            $status = $isHr ? 'APPROVED' : 'PENDING_HR_APPROVAL';
            $record = ProfileChangeRequest::create([
                'employee_id' => $employee->id,
                'employee_staff_id' => $employee->staff_id,
                'employee_name' => $employee->full_name,
                'requested_by_name' => $user->name,
                'requested_by_role' => strtoupper((string) $user->role),
                'changes' => $data['changes'],
                'reason' => trim($data['reason']),
                'status' => $status,
                'reviewed_by_name' => $isHr ? $user->name : null,
                'reviewed_at' => $isHr ? now() : null,
                'review_comments' => $isHr ? 'Applied directly by HR Super Admin.' : null,
            ]);

            if ($isHr) {
                $this->applyProfileChangesToEmployee($employee, $data['changes']);
            }

            AuditLogger::record(
                $request,
                'Employee Governance',
                $isHr ? 'Applied direct profile update' : 'Submitted staged profile change request',
                (string) $record->id,
                $employee->full_name,
                null,
                $status
            );
            RealtimeEventService::publish('employees', 'UPDATE', $employee->id, ['employeeId' => $employee->id], (int) $user->id);

            return $record;
        });

        return response()->json(['data' => $this->presentProfileChange($record)], 201);
    }

    /**
     * PATCH /api/v1/governance/profile-change-requests/{profileChangeRequest}/review
     */
    public function reviewProfileChange(Request $request, ProfileChangeRequest $profileChangeRequest): JsonResponse
    {
        abort_unless(
            RoleAuthorization::isGlobalHrOrAdmin($request->user()),
            403,
            'Only HR / Super Admin may approve or reject employee profile change requests (Sheet 5).'
        );

        $data = $request->validate([
            'decision' => ['required', Rule::in(['APPROVED', 'REJECTED'])],
            'comments' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($data['decision'] === 'REJECTED' && trim((string) ($data['comments'] ?? '')) === '') {
            abort(422, 'Rejection comments are required when declining a profile change request.');
        }

        $updated = DB::transaction(function () use ($request, $profileChangeRequest, $data): ProfileChangeRequest {
            $record = ProfileChangeRequest::query()->lockForUpdate()->findOrFail($profileChangeRequest->id);
            abort_if($record->status !== 'PENDING_HR_APPROVAL', 409, 'Only pending profile change requests can be reviewed.');

            $employee = Employee::query()->lockForUpdate()->findOrFail($record->employee_id);
            $record->update([
                'status' => $data['decision'],
                'reviewed_by_name' => $request->user()->name,
                'reviewed_at' => now(),
                'review_comments' => isset($data['comments']) ? trim($data['comments']) : null,
            ]);

            if ($data['decision'] === 'APPROVED') {
                $this->applyProfileChangesToEmployee($employee, $record->changes ?? []);
            }

            AuditLogger::record(
                $request,
                'Employee Governance',
                "Profile change request {$data['decision']}",
                (string) $record->id,
                $employee->full_name,
                'PENDING_HR_APPROVAL',
                $data['decision']
            );
            RealtimeEventService::publish('employees', 'UPDATE', $employee->id, ['employeeId' => $employee->id], (int) $request->user()->id);

            return $record->refresh();
        });

        return response()->json(['data' => $this->presentProfileChange($updated)]);
    }

    /**
     * GET /api/v1/governance/lifecycle-events
     */
    public function indexLifecycleEvents(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = EmployeeLifecycleEvent::query()->latest('created_at');

        if (! RoleAuthorization::isGlobalHrOrAdmin($user)) {
            $visibleIds = RoleAuthorization::visibleEmployees($user)->pluck('id');
            $query->whereIn('employee_id', $visibleIds);
        }

        return response()->json([
            'data' => $query->limit(200)->get()->map(fn (EmployeeLifecycleEvent $item) => $this->presentLifecycleEvent($item)),
        ]);
    }

    /**
     * POST /api/v1/governance/lifecycle-events
     */
    public function storeLifecycleEvent(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            RoleAuthorization::isGlobalHrOrAdmin($user) || RoleAuthorization::isSupervisor($user),
            403,
            'Only HR or authorized supervisors may initiate employee lifecycle events.'
        );

        $data = $request->validate([
            'employeeId' => ['required', 'exists:employees,id'],
            'eventType' => ['required', Rule::in(['CONFIRMATION', 'PROMOTION', 'TRANSFER'])],
            'triggerReason' => ['required', 'string', 'min:3', 'max:255'],
            'details' => ['nullable', 'array'],
        ]);

        $employee = Employee::query()->findOrFail($data['employeeId']);
        if (! RoleAuthorization::isGlobalHrOrAdmin($user)) {
            $visibleIds = RoleAuthorization::visibleEmployees($user)->pluck('id')->all();
            abort_unless(in_array($employee->id, $visibleIds, true), 403, 'Employee is outside your supervisory scope.');
        }

        $record = DB::transaction(function () use ($request, $user, $employee, $data): EmployeeLifecycleEvent {
            $record = EmployeeLifecycleEvent::create([
                'employee_id' => $employee->id,
                'employee_staff_id' => $employee->staff_id,
                'employee_name' => $employee->full_name,
                'event_type' => $data['eventType'],
                'trigger_reason' => trim($data['triggerReason']),
                'initiated_by_name' => $user->name,
                'status' => 'PENDING_HR_APPROVAL',
                'details' => $data['details'] ?? [],
            ]);

            AuditLogger::record(
                $request,
                'Employee Lifecycle',
                "Initiated {$data['eventType']} event",
                (string) $record->id,
                $employee->full_name,
                null,
                'PENDING_HR_APPROVAL'
            );

            return $record;
        });

        return response()->json(['data' => $this->presentLifecycleEvent($record)], 201);
    }

    /**
     * PATCH /api/v1/governance/lifecycle-events/{employeeLifecycleEvent}/approve
     */
    public function approveLifecycleEvent(Request $request, EmployeeLifecycleEvent $employeeLifecycleEvent): JsonResponse
    {
        abort_unless(
            RoleAuthorization::isGlobalHrOrAdmin($request->user()),
            403,
            'Only HR / Super Admin may approve employee lifecycle transitions (Sheet 14).'
        );

        $updated = DB::transaction(function () use ($request, $employeeLifecycleEvent): EmployeeLifecycleEvent {
            $event = EmployeeLifecycleEvent::query()->lockForUpdate()->findOrFail($employeeLifecycleEvent->id);
            abort_if($event->status !== 'PENDING_HR_APPROVAL', 409, 'Only pending lifecycle events can be approved.');

            $employee = Employee::query()->lockForUpdate()->findOrFail($event->employee_id);
            $details = is_array($event->details) ? $event->details : [];

            if ($event->event_type === 'CONFIRMATION') {
                $employee->status = 'Confirmed';
                $employee->contract_status = 'Permanent';
                $employee->confirmation_date = ! empty($details['confirmationDate']) && is_string($details['confirmationDate'])
                    ? trim($details['confirmationDate'])
                    : now()->toDateString();
            } elseif ($event->event_type === 'PROMOTION') {
                if (! empty($details['newRole']) && is_string($details['newRole'])) {
                    $employee->job_title = trim($details['newRole']);
                }
                if (! empty($details['newGrade']) && is_string($details['newGrade'])) {
                    $employee->grade_level = trim($details['newGrade']);
                }
            } elseif ($event->event_type === 'TRANSFER') {
                if (! empty($details['newDepartment']) && is_string($details['newDepartment'])) {
                    $dept = Department::query()->where('name', trim($details['newDepartment']))->first();
                    if ($dept) {
                        $employee->department_id = $dept->id;
                        $employee->entity_id = $dept->entity_id;
                    }
                }
            }
            $employee->save();

            $event->update([
                'status' => 'APPROVED',
                'approved_by_name' => $request->user()->name,
                'approved_at' => now(),
            ]);

            AuditLogger::record(
                $request,
                'Employee Lifecycle',
                "Approved {$event->event_type} event",
                (string) $event->id,
                $employee->full_name,
                'PENDING_HR_APPROVAL',
                'APPROVED'
            );
            RealtimeEventService::publish('employees', 'UPDATE', $employee->id, ['employeeId' => $employee->id], (int) $request->user()->id);

            return $event->refresh();
        });

        return response()->json(['data' => $this->presentLifecycleEvent($updated)]);
    }

    /** @param array<int, array<string, mixed>> $changes */
    private function applyProfileChangesToEmployee(Employee $employee, array $changes): void
    {
        $emergencyContact = is_array($employee->emergency_contact)
            ? $employee->emergency_contact
            : ['name' => '', 'relationship' => '', 'phone' => ''];
        $nextOfKin = is_array($employee->next_of_kin)
            ? $employee->next_of_kin
            : ['name' => '', 'relationship' => '', 'phone' => '', 'address' => ''];
        $bankPayroll = is_array($employee->bank_payroll)
            ? $employee->bank_payroll
            : ['bankName' => '', 'accountNumber' => '', 'accountName' => $employee->full_name, 'salaryGrade' => $employee->grade_level ?? '', 'currency' => 'NGN'];
        $pensionHmo = is_array($employee->pension_hmo)
            ? $employee->pension_hmo
            : ['pfaName' => '', 'rsaPin' => '', 'hmoProvider' => '', 'hmoPlan' => '', 'hmoIdNumber' => ''];
        $qualifications = is_array($employee->qualifications) ? $employee->qualifications : [];
        $certifications = is_array($employee->certifications) ? $employee->certifications : [];

        $dirtyEmergency = false;
        $dirtyNok = false;
        $dirtyBank = false;
        $dirtyPension = false;
        $dirtyQualifications = false;
        $dirtyCertifications = false;
        $updates = [];

        foreach ($changes as $item) {
            $key = $item['fieldKey'] ?? null;
            $val = isset($item['newValue']) ? trim((string) $item['newValue']) : '';
            if (! is_string($key) || $val === '') {
                continue;
            }

            switch ($key) {
                case 'phone':
                    $updates['phone'] = $val;
                    break;
                case 'email':
                    $updates['email'] = $val;
                    break;
                case 'address':
                    $updates['address'] = $val;
                    break;
                case 'profilePhoto':
                case 'profilePhotoUrl':
                    $updates['profile_photo'] = $val;
                    break;
                case 'emergencyContact':
                case 'emergencyContactName':
                    $emergencyContact['name'] = $val;
                    $dirtyEmergency = true;
                    break;
                case 'emergencyContactRelationship':
                    $emergencyContact['relationship'] = $val;
                    $dirtyEmergency = true;
                    break;
                case 'emergencyContactPhone':
                    $emergencyContact['phone'] = $val;
                    $dirtyEmergency = true;
                    break;
                case 'nextOfKin':
                case 'nextOfKinName':
                    $nextOfKin['name'] = $val;
                    $dirtyNok = true;
                    break;
                case 'nextOfKinRelationship':
                    $nextOfKin['relationship'] = $val;
                    $dirtyNok = true;
                    break;
                case 'nextOfKinPhone':
                    $nextOfKin['phone'] = $val;
                    $dirtyNok = true;
                    break;
                case 'nextOfKinAddress':
                    $nextOfKin['address'] = $val;
                    $dirtyNok = true;
                    break;
                case 'bankName':
                    $bankPayroll['bankName'] = $val;
                    $dirtyBank = true;
                    break;
                case 'accountNumber':
                    $bankPayroll['accountNumber'] = $val;
                    $dirtyBank = true;
                    break;
                case 'accountName':
                    $bankPayroll['accountName'] = $val;
                    $dirtyBank = true;
                    break;
                case 'pfaName':
                    $pensionHmo['pfaName'] = $val;
                    $dirtyPension = true;
                    break;
                case 'rsaPin':
                    $pensionHmo['rsaPin'] = $val;
                    $dirtyPension = true;
                    break;
                case 'hmoProvider':
                    $pensionHmo['hmoProvider'] = $val;
                    $dirtyPension = true;
                    break;
                case 'hmoPlan':
                    $pensionHmo['hmoPlan'] = $val;
                    $dirtyPension = true;
                    break;
                case 'qualifications':
                    $qualifications[] = [
                        'id' => 'q-'.time(),
                        'degree' => $val,
                        'institution' => 'Submitted via Self-Service',
                        'yearCompleted' => (int) date('Y'),
                        'fieldOfStudy' => 'Verified by HR',
                    ];
                    $dirtyQualifications = true;
                    break;
                case 'certifications':
                    $certifications[] = [
                        'id' => 'c-'.time(),
                        'name' => $val,
                        'issuingBody' => 'Submitted via Self-Service',
                        'yearObtained' => (int) date('Y'),
                    ];
                    $dirtyCertifications = true;
                    break;
                case 'maritalStatus':
                    $existingNotes = trim((string) ($employee->notes ?? ''));
                    $updates['notes'] = trim($existingNotes.($existingNotes !== '' ? "\n" : '')."Marital Status: {$val}");
                    break;
            }
        }

        if ($dirtyEmergency) {
            $updates['emergency_contact'] = $emergencyContact;
        }
        if ($dirtyNok) {
            $updates['next_of_kin'] = $nextOfKin;
        }
        if ($dirtyBank) {
            $updates['bank_payroll'] = $bankPayroll;
        }
        if ($dirtyPension) {
            $updates['pension_hmo'] = $pensionHmo;
        }
        if ($dirtyQualifications) {
            $updates['qualifications'] = $qualifications;
        }
        if ($dirtyCertifications) {
            $updates['certifications'] = $certifications;
        }

        if ($updates !== []) {
            $employee->forceFill($updates)->save();
        }
    }

    private function presentProfileChange(ProfileChangeRequest $item): array
    {
        return [
            'id' => (string) $item->id,
            'employeeId' => (string) $item->employee_id,
            'employeeStaffId' => $item->employee_staff_id,
            'employeeName' => $item->employee_name,
            'requestedByName' => $item->requested_by_name,
            'requestedByRole' => $item->requested_by_role,
            'requestedAt' => $item->created_at?->toISOString(),
            'changes' => $item->changes ?? [],
            'reason' => $item->reason,
            'status' => $item->status,
            'reviewedByName' => $item->reviewed_by_name,
            'reviewedAt' => $item->reviewed_at?->toISOString(),
            'reviewComments' => $item->review_comments,
        ];
    }

    private function presentLifecycleEvent(EmployeeLifecycleEvent $item): array
    {
        return [
            'id' => (string) $item->id,
            'employeeId' => (string) $item->employee_id,
            'employeeStaffId' => $item->employee_staff_id,
            'employeeName' => $item->employee_name,
            'eventType' => $item->event_type,
            'triggerReason' => $item->trigger_reason,
            'initiatedByName' => $item->initiated_by_name,
            'initiatedAt' => $item->created_at?->toISOString(),
            'status' => $item->status,
            'details' => $item->details ?? [],
            'approvedByName' => $item->approved_by_name,
            'approvedAt' => $item->approved_at?->toISOString(),
        ];
    }
}
