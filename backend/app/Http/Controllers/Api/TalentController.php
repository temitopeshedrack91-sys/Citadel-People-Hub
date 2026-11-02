<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Entity;
use App\Models\OnboardingChecklistTemplate;
use App\Models\OnboardingJourney;
use App\Models\RecruitmentRequisition;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TalentController extends Controller
{
    public function journeys(Request $request): JsonResponse
    {
        $query = $this->scopedJourneys($request);

        return response()->json(['data' => $query->latest()->limit(200)->get()->map(fn (OnboardingJourney $journey) => array_merge($journey->journey_data, ['id' => $journey->id]))]);
    }

    public function createJourney(Request $request): JsonResponse
    {
        $this->authorizeTalentManagement($request);
        $data = $request->validate([
            'employeeId' => ['required', 'integer', 'exists:employees,id'],
            'checklistId' => ['required', 'uuid', 'exists:onboarding_checklist_templates,id'],
            'startDate' => ['required', 'date_format:Y-m-d'],
        ]);
        $employee = Employee::query()->with(['entity', 'department'])->findOrFail($data['employeeId']);
        abort_unless(RoleAuthorization::canManageEmployee($request->user(), $employee), 403, 'You are not authorized to onboard this employee.');
        $template = OnboardingChecklistTemplate::query()->findOrFail($data['checklistId']);

        $journey = DB::transaction(function () use ($request, $employee, $template, $data): OnboardingJourney {
            $tasks = collect($template->task_data ?? [])->map(function (array $task): array {
                return [
                    ...$task,
                    'id' => (string) Str::uuid(),
                    'isCompleted' => false,
                    'completedAt' => null,
                ];
            })->all();
            $managerName = $employee->manager_name ?? '';
            $journeyData = [
                'employeeId' => (string) $employee->id,
                'employeeName' => $employee->full_name,
                'staffId' => $employee->staff_id,
                'jobTitle' => $employee->job_title,
                'entityName' => $employee->entity?->name ?? '',
                'departmentName' => $employee->department?->name ?? '',
                'startDate' => $data['startDate'],
                'checklistId' => $template->id,
                'checklistTitle' => $template->title,
                'avatarUrl' => $employee->profile_photo,
                'mentorName' => $managerName,
                'mentorBuddyName' => '',
                'overallProgressPercent' => 0,
                'status' => 'In Progress',
                'tasks' => $tasks,
                'requiredDocuments' => [],
                'orientationItems' => [],
                'teamRoster' => [
                    'managerName' => $managerName,
                    'pccmOfficerName' => '',
                    'itLeadName' => '',
                    'financeLeadName' => '',
                    'mentorBuddyName' => '',
                ],
            ];
            $journey = OnboardingJourney::create([
                'employee_record_id' => $employee->id,
                'journey_data' => $journeyData,
            ]);
            AuditLogger::record($request, 'Talent & Onboarding', 'Created onboarding journey', $journey->id, $employee->full_name, null, 'In Progress');

            return $journey;
        });

        return response()->json(['data' => array_merge($journey->journey_data, ['id' => $journey->id])], 201);
    }

    public function checklistTemplates(Request $request): JsonResponse
    {
        $this->authorizeTalentManagement($request);

        return response()->json(['data' => OnboardingChecklistTemplate::query()->latest()->limit(200)->get()->map(
            fn (OnboardingChecklistTemplate $template) => $this->presentChecklistTemplate($template)
        )]);
    }

    public function createChecklistTemplate(Request $request): JsonResponse
    {
        $this->authorizeTalentManagement($request);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'category' => ['required', Rule::in(['General', 'Pastoral & Ministry', 'Operations & Facilities', 'Legal & Corporate', 'ICT & Systems'])],
            'targetAudience' => ['required', 'string', 'max:180'],
            'duration' => ['required', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:2000'],
            'tasks' => ['present', 'array', 'max:100'],
            'tasks.*.title' => ['required', 'string', 'max:180'],
            'tasks.*.description' => ['nullable', 'string', 'max:2000'],
            'tasks.*.department' => ['required', Rule::in(['Manager', 'PCCM', 'IT', 'Finance', 'Mentor'])],
            'tasks.*.timeline' => ['required', Rule::in(['Before Resumption', 'Day 1', 'Day 2', 'Week 1', '1st Two Weeks', '1st Three Weeks', '1st Month', '60 Days', '90 Days', 'Post-3-Months'])],
            'tasks.*.assignedRole' => ['required', Rule::in(['PCCM', 'Department Head', 'Employee', 'ICT', 'Finance', 'Mentor'])],
            'tasks.*.responsibleRole' => ['nullable', 'string', 'max:100'],
            'tasks.*.assignedToName' => ['nullable', 'string', 'max:180'],
            'tasks.*.dueDate' => ['required', 'string', 'max:80'],
            'tasks.*.isConditional' => ['sometimes', 'boolean'],
            'tasks.*.conditionNote' => ['nullable', 'string', 'max:1000'],
            'tasks.*.requiresHrConfirmation' => ['sometimes', 'boolean'],
        ]);
        $tasks = collect($data['tasks'])->map(fn (array $task) => [
            ...$task,
            'id' => (string) Str::uuid(),
            'isCompleted' => false,
        ])->all();
        $template = OnboardingChecklistTemplate::create([
            'title' => $data['title'],
            'category' => $data['category'],
            'target_audience' => $data['targetAudience'],
            'duration' => $data['duration'],
            'description' => $data['description'] ?? '',
            'task_data' => $tasks,
            'created_by_user_id' => $request->user()->id,
        ]);
        AuditLogger::record($request, 'Talent & Onboarding', 'Created onboarding checklist template', $template->id, $template->title, null, $template->category);

        return response()->json(['data' => $this->presentChecklistTemplate($template)], 201);
    }

    public function updateTask(Request $request, OnboardingJourney $journey, string $taskId): JsonResponse
    {
        $journey = $this->scopedJourneys($request)->whereKey($journey->getKey())->firstOrFail();
        $data = $request->validate(['isCompleted' => ['required', 'boolean']]);
        $journeyData = DB::transaction(function () use ($request, $journey, $taskId, $data) {
            $lockedJourney = OnboardingJourney::query()->lockForUpdate()->findOrFail($journey->id);
            $journeyData = $lockedJourney->journey_data;
            $found = false;
            foreach ($journeyData['tasks'] ?? [] as $index => $task) {
                if (($task['id'] ?? null) === $taskId) {
                    $journeyData['tasks'][$index]['isCompleted'] = $data['isCompleted'];
                    $journeyData['tasks'][$index]['completedAt'] = $data['isCompleted'] ? now()->toISOString() : null;
                    $found = true;
                    break;
                }
            }
            abort_unless($found, 404, 'Onboarding task not found.');
            $tasks = $journeyData['tasks'];
            $journeyData['overallProgressPercent'] = count($tasks) > 0
                ? (int) round(collect($tasks)->where('isCompleted', true)->count() * 100 / count($tasks))
                : 0;
            $lockedJourney->update(['journey_data' => $journeyData]);
            AuditLogger::record($request, 'Talent & Onboarding', 'Updated onboarding task', $lockedJourney->id, $journeyData['employeeName'] ?? 'Employee onboarding', null, $data['isCompleted'] ? 'Completed' : 'Pending');

            return $journeyData;
        });

        return response()->json(['data' => array_merge($journeyData, ['id' => $journey->id])]);
    }

    public function updateDocument(Request $request, OnboardingJourney $journey, string $documentId): JsonResponse
    {
        return $this->updateJourneyItem($request, $journey, 'requiredDocuments', $documentId, 'isSubmitted', 'submittedAt', 'Updated onboarding document status');
    }

    public function updateOrientation(Request $request, OnboardingJourney $journey, string $itemId): JsonResponse
    {
        return $this->updateJourneyItem($request, $journey, 'orientationItems', $itemId, 'isCompleted', 'completedAt', 'Updated onboarding orientation status');
    }

    public function createOnboardingTask(Request $request, OnboardingJourney $journey): JsonResponse
    {
        $journey = $this->scopedJourneys($request)->whereKey($journey->getKey())->firstOrFail();
        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'description' => ['required', 'string', 'max:2000'],
            'department' => ['required', Rule::in(['Manager', 'PCCM', 'IT', 'Finance', 'Mentor'])],
            'timeline' => ['required', Rule::in(['Before Resumption', 'Day 1', 'Day 2', 'Week 1', '1st Two Weeks', '1st Three Weeks', '1st Month', '60 Days', '90 Days', 'Post-3-Months'])],
            'assignedRole' => ['required', Rule::in(['PCCM', 'Department Head', 'Employee', 'ICT', 'Finance', 'Mentor'])],
            'responsibleRole' => ['nullable', 'string', 'max:100'],
            'assignedToName' => ['nullable', 'string', 'max:180'],
            'dueDate' => ['required', 'string', 'max:80'],
            'isConditional' => ['sometimes', 'boolean'],
            'conditionNote' => ['nullable', 'string', 'max:1000'],
            'requiresHrConfirmation' => ['sometimes', 'boolean'],
        ]);
        $journeyData = DB::transaction(function () use ($request, $journey, $data): array {
            $lockedJourney = OnboardingJourney::query()->lockForUpdate()->findOrFail($journey->id);
            $journeyData = $lockedJourney->journey_data;
            $task = [
                ...$data,
                'id' => (string) Str::uuid(),
                'isCompleted' => false,
            ];
            $journeyData['tasks'][] = $task;
            $tasks = $journeyData['tasks'];
            $completed = collect($tasks)->where('isCompleted', true)->count();
            $journeyData['overallProgressPercent'] = count($tasks) > 0 ? (int) round($completed * 100 / count($tasks)) : 0;
            $lockedJourney->update(['journey_data' => $journeyData]);
            AuditLogger::record($request, 'Talent & Onboarding', 'Created onboarding task', $journey->id, $journeyData['employeeName'] ?? 'Employee onboarding', null, $task['title']);

            return $journeyData;
        });

        return response()->json(['data' => array_merge($journeyData, ['id' => $journey->id])], 201);
    }

    private function updateJourneyItem(
        Request $request,
        OnboardingJourney $journey,
        string $collection,
        string $itemId,
        string $stateField,
        string $timestampField,
        string $auditAction,
    ): JsonResponse {
        $journey = $this->scopedJourneys($request)->whereKey($journey->getKey())->firstOrFail();
        $data = $request->validate([$stateField => ['required', 'boolean']]);
        $journeyData = DB::transaction(function () use ($request, $journey, $collection, $itemId, $stateField, $timestampField, $auditAction, $data): array {
            $lockedJourney = OnboardingJourney::query()->lockForUpdate()->findOrFail($journey->id);
            $journeyData = $lockedJourney->journey_data;
            $found = false;
            foreach ($journeyData[$collection] ?? [] as $index => $item) {
                if (($item['id'] ?? null) === $itemId) {
                    $journeyData[$collection][$index][$stateField] = $data[$stateField];
                    $journeyData[$collection][$index][$timestampField] = $data[$stateField] ? now()->toISOString() : null;
                    $found = true;
                    break;
                }
            }
            abort_unless($found, 404, 'Onboarding item not found.');
            $lockedJourney->update(['journey_data' => $journeyData]);
            AuditLogger::record($request, 'Talent & Onboarding', $auditAction, $lockedJourney->id, $journeyData['employeeName'] ?? 'Employee onboarding', null, $data[$stateField] ? 'Complete' : 'Pending');

            return $journeyData;
        });

        return response()->json(['data' => array_merge($journeyData, ['id' => $journey->id])]);
    }

    public function requisitions(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->scopedRequisitions($request)->latest()->limit(200)->get()->map(
            fn (RecruitmentRequisition $requisition) => $this->presentRequisition($requisition)
        )]);
    }

    public function createRequisition(Request $request): JsonResponse
    {
        $this->authorizeTalentManagement($request);
        $data = $request->validate([
            'jobTitle' => ['required', 'string', 'max:180'],
            'entityId' => ['required', 'string', 'exists:entities,id'],
            'departmentId' => ['required', 'integer', 'exists:departments,id'],
            'openPositions' => ['required', 'integer', 'min:1', 'max:100'],
            'employmentType' => ['required', 'string', 'max:50'],
            'targetDate' => ['required', 'date_format:Y-m-d'],
            'hiringManager' => ['required', 'string', 'max:180'],
            'workLocation' => ['nullable', 'string', 'max:180'],
            'salaryBand' => ['nullable', 'string', 'max:180'],
            'justification' => ['nullable', 'string', 'max:2000'],
            'interviewFormat' => ['nullable', 'string', 'max:180'],
            'sourcingChannel' => ['nullable', 'string', 'max:180'],
            'keyRequirements' => ['nullable', 'string', 'max:4000'],
        ]);

        $entity = Entity::query()->findOrFail($data['entityId']);
        $department = Department::query()->findOrFail($data['departmentId']);
        abort_unless((string) $department->entity_id === (string) $entity->id, 422, 'The department must belong to the selected entity.');
        $this->authorizeRequisitionScope($request, $entity->id, (int) $department->id);

        $requisition = DB::transaction(function () use ($request, $data, $entity, $department): RecruitmentRequisition {
            $requisitionCode = $this->newRequisitionCode($entity);
            $requisitionData = [
                ...$data,
                'entityName' => $entity->name,
                'departmentName' => $department->name,
                'targetHiringDate' => $data['targetDate'],
                'status' => 'Open',
                'applicantsCount' => 0,
                'candidates' => [],
            ];
            $requisition = RecruitmentRequisition::create([
                'requisition_code' => $requisitionCode,
                'job_title' => $data['jobTitle'],
                'entity_id' => $entity->id,
                'department_id' => $department->id,
                'requisition_data' => $requisitionData,
            ]);
            AuditLogger::record($request, 'Recruitment', 'Created recruitment requisition', $requisition->id, $requisition->job_title, null, 'Open');

            return $requisition;
        });

        return response()->json(['data' => $this->presentRequisition($requisition)], 201);
    }

    public function updateRequisitionStatus(Request $request, RecruitmentRequisition $requisition): JsonResponse
    {
        $this->authorizeTalentManagement($request);
        $requisition = $this->scopedRequisitions($request)->whereKey($requisition->getKey())->firstOrFail();
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:Draft,Approved,Open,Interviewing,Filled,Closed'],
        ]);

        $requisition = DB::transaction(function () use ($request, $requisition, $validated): RecruitmentRequisition {
            $locked = RecruitmentRequisition::query()->lockForUpdate()->findOrFail($requisition->id);
            $details = $locked->requisition_data;
            $previousStatus = $details['status'] ?? null;
            $details['status'] = $validated['status'];
            $locked->update(['requisition_data' => $details]);
            AuditLogger::record($request, 'Recruitment', 'Updated requisition status', $locked->id, $locked->job_title, $previousStatus, $validated['status']);

            return $locked->fresh();
        });

        return response()->json(['data' => $this->presentRequisition($requisition)]);
    }

    private function authorizeTalentManagement(Request $request): void
    {
        abort_unless(RoleAuthorization::canManageEmployeeRecords($request->user()), 403, 'You are not authorized to manage recruitment and onboarding.');
    }

    private function authorizeRequisitionScope(Request $request, string $entityId, int $departmentId): void
    {
        $role = strtoupper(trim($request->user()->role));
        if ($role === 'BUSINESS_HEAD' && $request->user()->entity_id !== null) {
            abort_unless((string) $entityId === (string) $request->user()->entity_id, 403, 'You can only manage requisitions in your entity.');
        }
        if ($role === 'BUSINESS_HEAD' && $request->user()->entity_id === null) {
            abort(403, 'Your account is not assigned to an entity.');
        }
        if ($role === 'DEPARTMENT_HEAD') {
            abort_unless($request->user()->department_id !== null && $departmentId === (int) $request->user()->department_id, 403, 'You can only manage requisitions in your department.');
        }
    }

    private function scopedJourneys(Request $request)
    {
        $this->authorizeTalentManagement($request);
        $query = OnboardingJourney::query();
        $role = strtoupper(trim($request->user()->role));

        if ($role === 'BUSINESS_HEAD') {
            return $request->user()->entity_id === null
                ? $query->whereRaw('1 = 0')
                : $query->whereHas('employeeRecord', fn ($employees) => $employees->where('entity_id', $request->user()->entity_id));
        }

        if ($role === 'DEPARTMENT_HEAD') {
            return $request->user()->department_id === null
                ? $query->whereRaw('1 = 0')
                : $query->whereHas('employeeRecord', fn ($employees) => $employees->where('department_id', $request->user()->department_id));
        }

        return $query;
    }

    private function scopedRequisitions(Request $request)
    {
        $this->authorizeTalentManagement($request);
        $query = RecruitmentRequisition::query();
        $role = strtoupper(trim($request->user()->role));

        if ($role === 'BUSINESS_HEAD' && $request->user()->entity_id !== null) {
            return $query->where('entity_id', $request->user()->entity_id);
        }

        if ($role === 'BUSINESS_HEAD') {
            return $query->whereRaw('1 = 0');
        }

        if ($role === 'DEPARTMENT_HEAD') {
            return $request->user()->department_id === null
                ? $query->whereRaw('1 = 0')
                : $query->where('department_id', $request->user()->department_id);
        }

        return $query;
    }

    private function presentRequisition(RecruitmentRequisition $requisition): array
    {
        return array_merge(
            $requisition->requisition_data,
            [
                'id' => $requisition->id,
                'requisitionCode' => $requisition->requisition_code,
                'jobTitle' => $requisition->job_title,
                'entityId' => $requisition->entity_id,
                'departmentId' => $requisition->department_id === null ? null : (string) $requisition->department_id,
            ],
        );
    }

    private function presentChecklistTemplate(OnboardingChecklistTemplate $template): array
    {
        return [
            'id' => $template->id,
            'title' => $template->title,
            'category' => $template->category,
            'targetAudience' => $template->target_audience,
            'duration' => $template->duration,
            'description' => $template->description ?? '',
            'taskCount' => count($template->task_data ?? []),
            'tasks' => $template->task_data ?? [],
            'createdAt' => $template->created_at?->toDateString(),
        ];
    }

    private function newRequisitionCode(Entity $entity): string
    {
        $shortCode = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $entity->short_code ?: 'REQ'));
        do {
            $code = sprintf('REQ-%s-%s-%s', $shortCode, now()->format('Y'), Str::upper(Str::random(6)));
        } while (RecruitmentRequisition::query()->where('requisition_code', $code)->exists());

        return $code;
    }
}
