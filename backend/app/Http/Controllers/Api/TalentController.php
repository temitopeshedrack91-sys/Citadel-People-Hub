<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Entity;
use App\Models\OnboardingChecklistTemplate;
use App\Models\OnboardingJourney;
use App\Models\RecruitmentRequisition;
use App\Models\SystemNotification;
use App\Models\User;
use App\Services\RealtimeEventService;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Talent, Recruitment & Onboarding Controller
 *
 * Coordinates workforce recruitment requisitions, 19-task SOP checklist templates,
 * onboarding journeys with dependency/order validation, reminders, concurrency checks,
 * and real-time updates.
 */
class TalentController extends Controller
{
    private const CANONICAL_DEPARTMENTS = ['Manager', 'PCCM', 'IT', 'Finance', 'Mentor'];

    private const CANONICAL_TIMELINES = [
        'Before Resumption',
        'Day 1',
        'Day 2',
        'Week 1',
        '1st Two Weeks',
        '1st Three Weeks',
        '1st Month',
        '60 Days',
        '90 Days',
        'Post-3-Months',
    ];

    public function journeys(Request $request): JsonResponse
    {
        $query = $this->scopedJourneys($request);

        return response()->json([
            'data' => $query->latest()->limit(200)->get()->map(fn (OnboardingJourney $journey) => $this->presentJourney($journey)),
        ]);
    }

    public function createJourney(Request $request): JsonResponse
    {
        $this->authorizeTalentManagement($request);
        $data = $request->validate([
            'employeeId' => ['required', 'integer', 'exists:employees,id'],
            'checklistId' => ['required', 'uuid', 'exists:onboarding_checklist_templates,id'],
            'startDate' => ['required', 'date_format:Y-m-d'],
        ]);
        $employee = Employee::query()->with(['entity', 'department', 'supervisor'])->findOrFail($data['employeeId']);
        abort_unless(RoleAuthorization::canManageEmployee($request->user(), $employee), 403, 'You are not authorized to onboard this employee.');
        $template = OnboardingChecklistTemplate::query()->findOrFail($data['checklistId']);

        $journey = DB::transaction(function () use ($request, $employee, $template, $data): OnboardingJourney {
            $rawTasks = array_values($template->task_data ?? []);
            $idMap = [];
            foreach ($rawTasks as $index => $task) {
                $oldId = (string) ($task['id'] ?? "idx-{$index}");
                $idMap[$oldId] = (string) Str::uuid();
            }

            $tasks = collect($rawTasks)->map(function (array $task, int $index) use ($idMap): array {
                $oldId = (string) ($task['id'] ?? "idx-{$index}");
                $deps = [];
                foreach ($task['dependsOnTaskIds'] ?? [] as $depId) {
                    $depKey = (string) $depId;
                    if (isset($idMap[$depKey]) && $idMap[$depKey] !== $idMap[$oldId]) {
                        $deps[] = $idMap[$depKey];
                    }
                }

                return [
                    ...$task,
                    'id' => $idMap[$oldId],
                    'order' => $index + 1,
                    'dependsOnTaskIds' => array_values(array_unique($deps)),
                    'isCompleted' => false,
                    'completedAt' => null,
                ];
            })->all();

            $managerName = $employee->supervisor?->full_name ?? $employee->manager_name ?? '';
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
                'requiredDocuments' => $this->defaultRequiredDocuments(),
                'orientationItems' => $this->defaultOrientationItems(),
                'teamRoster' => [
                    'managerName' => $managerName,
                    'pccmOfficerName' => $request->user()->name,
                    'itLeadName' => '',
                    'financeLeadName' => '',
                    'mentorBuddyName' => '',
                ],
            ];
            $journey = OnboardingJourney::create([
                'employee_record_id' => $employee->id,
                'journey_data' => $journeyData,
                'version' => 1,
            ]);
            AuditLogger::record($request, 'Talent & Onboarding', 'Created onboarding journey', $journey->id, $employee->full_name, null, 'In Progress');
            RealtimeEventService::publish('onboarding_journeys', 'INSERT', $journey->id, ['employeeName' => $employee->full_name], (int) $request->user()->id);

            return $journey;
        });

        return response()->json(['data' => $this->presentJourney($journey)], 201);
    }

    public function checklistTemplates(Request $request): JsonResponse
    {
        $this->authorizeTalentManagement($request);

        return response()->json([
            'data' => OnboardingChecklistTemplate::query()->latest()->limit(200)->get()->map(
                fn (OnboardingChecklistTemplate $template) => $this->presentChecklistTemplate($template)
            ),
        ]);
    }

    public function createChecklistTemplate(Request $request): JsonResponse
    {
        $this->authorizeTalentManagement($request);
        $data = $this->validateTemplatePayload($request);
        $tasks = $this->normalizeAndValidateTemplateTasks($data['tasks']);

        $template = OnboardingChecklistTemplate::create([
            'title' => trim($data['title']),
            'category' => $data['category'],
            'target_audience' => trim($data['targetAudience']),
            'duration' => trim($data['duration']),
            'description' => trim((string) ($data['description'] ?? '')),
            'task_data' => $tasks,
            'created_by_user_id' => $request->user()->id,
            'version' => 1,
        ]);

        AuditLogger::record($request, 'Talent & Onboarding', 'Created onboarding checklist template', $template->id, $template->title, null, $template->category);
        RealtimeEventService::publish('onboarding_checklist_templates', 'INSERT', $template->id, ['title' => $template->title], (int) $request->user()->id);

        return response()->json(['data' => $this->presentChecklistTemplate($template)], 201);
    }

    public function updateChecklistTemplate(Request $request, OnboardingChecklistTemplate $template): JsonResponse
    {
        $this->authorizeTalentManagement($request);
        $data = $this->validateTemplatePayload($request, true);
        $expectedVersion = $request->input('version');

        $updated = DB::transaction(function () use ($request, $template, $data, $expectedVersion): OnboardingChecklistTemplate {
            $locked = OnboardingChecklistTemplate::query()->lockForUpdate()->findOrFail($template->id);

            if ($expectedVersion !== null && (int) $locked->version !== (int) $expectedVersion) {
                abort(409, 'This SOP template was modified by another user. Refresh before saving.');
            }

            $tasks = isset($data['tasks'])
                ? $this->normalizeAndValidateTemplateTasks($data['tasks'])
                : ($locked->task_data ?? []);

            $locked->update([
                'title' => isset($data['title']) ? trim($data['title']) : $locked->title,
                'category' => $data['category'] ?? $locked->category,
                'target_audience' => isset($data['targetAudience']) ? trim($data['targetAudience']) : $locked->target_audience,
                'duration' => isset($data['duration']) ? trim($data['duration']) : $locked->duration,
                'description' => array_key_exists('description', $data) ? trim((string) ($data['description'] ?? '')) : $locked->description,
                'task_data' => $tasks,
                'version' => ((int) ($locked->version ?? 1)) + 1,
            ]);

            AuditLogger::record($request, 'Talent & Onboarding', 'Updated onboarding checklist template', $locked->id, $locked->title, null, 'Updated');
            RealtimeEventService::publish('onboarding_checklist_templates', 'UPDATE', $locked->id, ['title' => $locked->title], (int) $request->user()->id);

            return $locked->fresh();
        });

        return response()->json(['data' => $this->presentChecklistTemplate($updated)]);
    }

    public function updateTask(Request $request, OnboardingJourney $journey, string $taskId): JsonResponse
    {
        $journey = $this->scopedJourneys($request)->whereKey($journey->getKey())->firstOrFail();
        $data = $request->validate([
            'isCompleted' => ['required', 'boolean'],
            'version' => ['sometimes', 'integer', 'min:1'],
        ]);

        $updated = DB::transaction(function () use ($request, $journey, $taskId, $data): OnboardingJourney {
            $lockedJourney = OnboardingJourney::query()->lockForUpdate()->findOrFail($journey->id);

            if (isset($data['version']) && (int) ($lockedJourney->version ?? 1) !== (int) $data['version']) {
                abort(409, 'This onboarding journey was updated by another user. Refresh to view latest changes.');
            }

            $journeyData = $lockedJourney->journey_data;
            $tasks = $journeyData['tasks'] ?? [];
            $tasksById = [];
            $targetIndex = null;

            foreach ($tasks as $index => $task) {
                $id = (string) ($task['id'] ?? '');
                $tasksById[$id] = $task;
                if ($id === $taskId) {
                    $targetIndex = $index;
                }
            }
            abort_unless($targetIndex !== null, 404, 'Onboarding task not found.');

            $targetTask = $tasks[$targetIndex];

            if ($data['isCompleted']) {
                // Enforce prerequisite tasks
                foreach ($targetTask['dependsOnTaskIds'] ?? [] as $depId) {
                    $prereq = $tasksById[(string) $depId] ?? null;
                    if ($prereq && empty($prereq['isCompleted'])) {
                        $prereqTitle = $prereq['title'] ?? $depId;
                        $targetTitle = $targetTask['title'] ?? $taskId;
                        abort(422, "Cannot complete '{$targetTitle}' before prerequisite task '{$prereqTitle}' is completed.");
                    }
                }
            } else {
                // Prevent unchecking if a downstream completed task depends on this task
                foreach ($tasks as $other) {
                    if (! empty($other['isCompleted']) && in_array($taskId, array_map('strval', $other['dependsOnTaskIds'] ?? []), true)) {
                        $depTitle = $other['title'] ?? 'dependent task';
                        $targetTitle = $targetTask['title'] ?? $taskId;
                        abort(422, "Cannot mark '{$targetTitle}' incomplete while dependent task '{$depTitle}' is completed.");
                    }
                }
            }

            $journeyData['tasks'][$targetIndex]['isCompleted'] = $data['isCompleted'];
            $journeyData['tasks'][$targetIndex]['completedAt'] = $data['isCompleted'] ? now()->toISOString() : null;

            $journeyData = $this->recalculateJourneyMetrics($journeyData);

            $lockedJourney->update([
                'journey_data' => $journeyData,
                'version' => ((int) ($lockedJourney->version ?? 1)) + 1,
            ]);

            AuditLogger::record($request, 'Talent & Onboarding', 'Updated onboarding task', $lockedJourney->id, $journeyData['employeeName'] ?? 'Employee onboarding', null, $data['isCompleted'] ? 'Completed' : 'Pending');
            RealtimeEventService::publish('onboarding_journeys', 'UPDATE', $lockedJourney->id, ['taskId' => $taskId], (int) $request->user()->id);

            return $lockedJourney->fresh();
        });

        return response()->json(['data' => $this->presentJourney($updated)]);
    }

    public function reorderTasks(Request $request, OnboardingJourney $journey): JsonResponse
    {
        $journey = $this->scopedJourneys($request)->whereKey($journey->getKey())->firstOrFail();
        $data = $request->validate([
            'taskIds' => ['required', 'array', 'min:1'],
            'taskIds.*' => ['required', 'string'],
            'version' => ['sometimes', 'integer', 'min:1'],
        ]);

        $updated = DB::transaction(function () use ($request, $journey, $data): OnboardingJourney {
            $lockedJourney = OnboardingJourney::query()->lockForUpdate()->findOrFail($journey->id);

            if (isset($data['version']) && (int) ($lockedJourney->version ?? 1) !== (int) $data['version']) {
                abort(409, 'This onboarding journey was modified by another user. Refresh before reordering.');
            }

            $journeyData = $lockedJourney->journey_data;
            $existingTasks = $journeyData['tasks'] ?? [];
            $existingMap = [];
            foreach ($existingTasks as $t) {
                $existingMap[(string) $t['id']] = $t;
            }

            $requestedIds = array_values(array_unique(array_map('strval', $data['taskIds'])));
            if (count($requestedIds) !== count($existingMap)) {
                abort(422, 'Reorder payload must include every task currently on the journey.');
            }

            $newOrderIndex = array_flip($requestedIds);
            $reordered = [];
            foreach ($requestedIds as $idx => $tid) {
                if (! isset($existingMap[$tid])) {
                    abort(422, "Unknown task ID '{$tid}' in reorder request.");
                }
                $task = $existingMap[$tid];
                foreach ($task['dependsOnTaskIds'] ?? [] as $depId) {
                    $depKey = (string) $depId;
                    if (isset($newOrderIndex[$depKey]) && $newOrderIndex[$depKey] > $idx) {
                        $depTitle = $existingMap[$depKey]['title'] ?? $depKey;
                        abort(422, "Task '{$task['title']}' cannot be ordered ahead of its prerequisite '{$depTitle}'.");
                    }
                }
                $task['order'] = $idx + 1;
                $reordered[] = $task;
            }

            $journeyData['tasks'] = $reordered;
            $lockedJourney->update([
                'journey_data' => $journeyData,
                'version' => ((int) ($lockedJourney->version ?? 1)) + 1,
            ]);

            AuditLogger::record($request, 'Talent & Onboarding', 'Reordered onboarding tasks', $lockedJourney->id, $journeyData['employeeName'] ?? 'Employee onboarding', null, count($reordered).' tasks');
            RealtimeEventService::publish('onboarding_journeys', 'UPDATE', $lockedJourney->id, ['reordered' => true], (int) $request->user()->id);

            return $lockedJourney->fresh();
        });

        return response()->json(['data' => $this->presentJourney($updated)]);
    }

    public function remindTask(Request $request, OnboardingJourney $journey, string $taskId): JsonResponse
    {
        $journey = $this->scopedJourneys($request)->whereKey($journey->getKey())->firstOrFail();

        $updated = DB::transaction(function () use ($request, $journey, $taskId): OnboardingJourney {
            $lockedJourney = OnboardingJourney::query()->lockForUpdate()->findOrFail($journey->id);
            $journeyData = $lockedJourney->journey_data;
            $foundIndex = null;

            foreach ($journeyData['tasks'] ?? [] as $idx => $t) {
                if ((string) ($t['id'] ?? '') === $taskId) {
                    $foundIndex = $idx;
                    break;
                }
            }
            abort_unless($foundIndex !== null, 404, 'Onboarding task not found.');

            $task = $journeyData['tasks'][$foundIndex];
            $sentAt = now()->toISOString();
            $journeyData['tasks'][$foundIndex]['reminderSentAt'] = $sentAt;

            $this->dispatchTaskReminderNotification($lockedJourney, $task, $request->user());

            $lockedJourney->update([
                'journey_data' => $journeyData,
                'version' => ((int) ($lockedJourney->version ?? 1)) + 1,
            ]);

            AuditLogger::record($request, 'Talent & Onboarding', 'Sent onboarding task reminder', $lockedJourney->id, $task['title'] ?? $taskId, null, 'Reminder Sent');
            RealtimeEventService::publish('notifications', 'INSERT', $lockedJourney->id, [], (int) $request->user()->id);
            RealtimeEventService::publish('onboarding_journeys', 'UPDATE', $lockedJourney->id, ['taskId' => $taskId], (int) $request->user()->id);

            return $lockedJourney->fresh();
        });

        return response()->json(['data' => $this->presentJourney($updated)]);
    }

    public function remindBulkTasks(Request $request, OnboardingJourney $journey): JsonResponse
    {
        $journey = $this->scopedJourneys($request)->whereKey($journey->getKey())->firstOrFail();

        $result = DB::transaction(function () use ($request, $journey): array {
            $lockedJourney = OnboardingJourney::query()->lockForUpdate()->findOrFail($journey->id);
            $journeyData = $lockedJourney->journey_data;
            $sentAt = now()->toISOString();
            $remindedCount = 0;

            foreach ($journeyData['tasks'] ?? [] as $idx => $task) {
                if (empty($task['isCompleted'])) {
                    $journeyData['tasks'][$idx]['reminderSentAt'] = $sentAt;
                    $this->dispatchTaskReminderNotification($lockedJourney, $task, $request->user());
                    $remindedCount++;
                }
            }

            $lockedJourney->update([
                'journey_data' => $journeyData,
                'version' => ((int) ($lockedJourney->version ?? 1)) + 1,
            ]);

            if ($remindedCount > 0) {
                RealtimeEventService::publish('notifications', 'INSERT', $lockedJourney->id, [], (int) $request->user()->id);
            }
            RealtimeEventService::publish('onboarding_journeys', 'UPDATE', $lockedJourney->id, ['remindedCount' => $remindedCount], (int) $request->user()->id);

            return ['journey' => $lockedJourney->fresh(), 'remindedCount' => $remindedCount];
        });

        return response()->json([
            'data' => $this->presentJourney($result['journey']),
            'remindedCount' => $result['remindedCount'],
        ]);
    }

    public function completeJourney(Request $request, OnboardingJourney $journey): JsonResponse
    {
        $journey = $this->scopedJourneys($request)->whereKey($journey->getKey())->firstOrFail();
        $data = $request->validate([
            'version' => ['sometimes', 'integer', 'min:1'],
        ]);

        $updated = DB::transaction(function () use ($request, $journey, $data): OnboardingJourney {
            $locked = OnboardingJourney::query()->lockForUpdate()->findOrFail($journey->id);
            if (isset($data['version']) && (int) ($locked->version ?? 1) !== (int) $data['version']) {
                abort(409, 'This onboarding journey was updated by another user. Refresh before completing.');
            }

            $journeyData = $locked->journey_data;
            $pendingTasks = collect($journeyData['tasks'] ?? [])->where('isCompleted', false)->pluck('title')->values();
            if ($pendingTasks->isNotEmpty()) {
                abort(422, 'Complete all onboarding tasks before finalizing (pending: '.$pendingTasks->take(3)->implode(', ').').');
            }

            $pendingDocs = collect($journeyData['requiredDocuments'] ?? [])
                ->filter(fn (array $d) => empty($d['isConditional']) && empty($d['isSubmitted']))
                ->pluck('name')
                ->values();
            if ($pendingDocs->isNotEmpty()) {
                abort(422, 'Required compliance documents must be received first (missing: '.$pendingDocs->take(3)->implode(', ').').');
            }

            $pendingOri = collect($journeyData['orientationItems'] ?? [])
                ->filter(fn (array $i) => empty($i['isCompleted']))
                ->pluck('name')
                ->values();
            if ($pendingOri->isNotEmpty()) {
                abort(422, 'Complete all on-site orientation checklist items first.');
            }

            $journeyData['status'] = 'Completed';
            $journeyData['overallProgressPercent'] = 100;

            $locked->update([
                'journey_data' => $journeyData,
                'version' => ((int) ($locked->version ?? 1)) + 1,
            ]);

            AuditLogger::record($request, 'Talent & Onboarding', 'Completed onboarding journey', $locked->id, $journeyData['employeeName'] ?? 'Employee onboarding', null, 'Completed');
            RealtimeEventService::publish('onboarding_journeys', 'UPDATE', $locked->id, ['status' => 'Completed'], (int) $request->user()->id);

            return $locked->fresh();
        });

        return response()->json(['data' => $this->presentJourney($updated)]);
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

        $rawDept = (string) $request->input('department', 'PCCM');
        $rawTimeline = (string) $request->input('timeline', 'Week 1');
        $normDept = $this->normalizeDepartment($rawDept);
        $normTimeline = $this->normalizeTimeline($rawTimeline);

        $request->merge([
            'department' => $normDept,
            'timeline' => $normTimeline,
            'assignedRole' => $request->input('assignedRole') ?: $this->defaultAssignedRole($normDept),
            'dueDate' => $request->input('dueDate') ?: $normTimeline,
        ]);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'description' => ['required', 'string', 'max:2000'],
            'department' => ['required', Rule::in(self::CANONICAL_DEPARTMENTS)],
            'timeline' => ['required', Rule::in(self::CANONICAL_TIMELINES)],
            'assignedRole' => ['required', Rule::in(['PCCM', 'Department Head', 'Employee', 'ICT', 'Finance', 'Mentor'])],
            'responsibleRole' => ['nullable', 'string', 'max:100'],
            'assignedToName' => ['nullable', 'string', 'max:180'],
            'dueDate' => ['required', 'string', 'max:80'],
            'dependsOnTaskIds' => ['sometimes', 'array'],
            'dependsOnTaskIds.*' => ['string'],
            'isConditional' => ['sometimes', 'boolean'],
            'conditionNote' => ['nullable', 'string', 'max:1000'],
            'requiresHrConfirmation' => ['sometimes', 'boolean'],
            'version' => ['sometimes', 'integer', 'min:1'],
        ]);

        $updated = DB::transaction(function () use ($request, $journey, $data): OnboardingJourney {
            $lockedJourney = OnboardingJourney::query()->lockForUpdate()->findOrFail($journey->id);

            if (isset($data['version']) && (int) ($lockedJourney->version ?? 1) !== (int) $data['version']) {
                abort(409, 'This onboarding journey was modified by another user. Refresh before adding a task.');
            }

            $journeyData = $lockedJourney->journey_data;
            $existingIds = array_map(fn ($t) => (string) ($t['id'] ?? ''), $journeyData['tasks'] ?? []);

            $deps = [];
            foreach ($data['dependsOnTaskIds'] ?? [] as $depId) {
                if (! in_array((string) $depId, $existingIds, true)) {
                    abort(422, 'Prerequisite task dependency does not exist on this journey.');
                }
                $deps[] = (string) $depId;
            }

            unset($data['version']);
            $task = [
                ...$data,
                'id' => (string) Str::uuid(),
                'order' => count($journeyData['tasks'] ?? []) + 1,
                'dependsOnTaskIds' => array_values(array_unique($deps)),
                'isCompleted' => false,
            ];
            $journeyData['tasks'][] = $task;
            $journeyData = $this->recalculateJourneyMetrics($journeyData);

            $lockedJourney->update([
                'journey_data' => $journeyData,
                'version' => ((int) ($lockedJourney->version ?? 1)) + 1,
            ]);
            AuditLogger::record($request, 'Talent & Onboarding', 'Created onboarding task', $journey->id, $journeyData['employeeName'] ?? 'Employee onboarding', null, $task['title']);
            RealtimeEventService::publish('onboarding_journeys', 'UPDATE', $lockedJourney->id, ['taskId' => $task['id']], (int) $request->user()->id);

            return $lockedJourney->fresh();
        });

        return response()->json(['data' => $this->presentJourney($updated)], 201);
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
        $data = $request->validate([
            $stateField => ['required', 'boolean'],
            'version' => ['sometimes', 'integer', 'min:1'],
        ]);

        $updated = DB::transaction(function () use ($request, $journey, $collection, $itemId, $stateField, $timestampField, $auditAction, $data): OnboardingJourney {
            $lockedJourney = OnboardingJourney::query()->lockForUpdate()->findOrFail($journey->id);

            if (isset($data['version']) && (int) ($lockedJourney->version ?? 1) !== (int) $data['version']) {
                abort(409, 'This onboarding journey was modified by another user. Refresh to view latest changes.');
            }

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

            $journeyData = $this->recalculateJourneyMetrics($journeyData);
            $lockedJourney->update([
                'journey_data' => $journeyData,
                'version' => ((int) ($lockedJourney->version ?? 1)) + 1,
            ]);
            AuditLogger::record($request, 'Talent & Onboarding', $auditAction, $lockedJourney->id, $journeyData['employeeName'] ?? 'Employee onboarding', null, $data[$stateField] ? 'Complete' : 'Pending');
            RealtimeEventService::publish('onboarding_journeys', 'UPDATE', $lockedJourney->id, [$collection => $itemId], (int) $request->user()->id);

            return $lockedJourney->fresh();
        });

        return response()->json(['data' => $this->presentJourney($updated)]);
    }

    private function validateTemplatePayload(Request $request, bool $isUpdate = false): array
    {
        $tasks = $request->input('tasks');
        if (is_array($tasks)) {
            $normalizedTasks = [];
            foreach ($tasks as $idx => $task) {
                $dept = $this->normalizeDepartment((string) ($task['department'] ?? 'PCCM'));
                $timeline = $this->normalizeTimeline((string) ($task['timeline'] ?? 'Day 1'));
                $normalizedTasks[] = [
                    ...$task,
                    'department' => $dept,
                    'timeline' => $timeline,
                    'assignedRole' => ($task['assignedRole'] ?? null) ?: $this->defaultAssignedRole($dept),
                    'dueDate' => ($task['dueDate'] ?? null) ?: $timeline,
                    'order' => $task['order'] ?? ($idx + 1),
                ];
            }
            $request->merge(['tasks' => $normalizedTasks]);
        }

        $reqRule = $isUpdate ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$reqRule, 'string', 'max:180'],
            'category' => [$reqRule, Rule::in(['General', 'Pastoral & Ministry', 'Operations & Facilities', 'Legal & Corporate', 'ICT & Systems'])],
            'targetAudience' => [$reqRule, 'string', 'max:180'],
            'duration' => [$reqRule, 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:2000'],
            'tasks' => [$isUpdate ? 'sometimes' : 'present', 'array', 'max:100'],
            'tasks.*.id' => ['nullable', 'string', 'max:100'],
            'tasks.*.order' => ['nullable', 'integer', 'min:1'],
            'tasks.*.title' => ['required', 'string', 'max:180'],
            'tasks.*.description' => ['nullable', 'string', 'max:2000'],
            'tasks.*.department' => ['required', Rule::in(self::CANONICAL_DEPARTMENTS)],
            'tasks.*.timeline' => ['required', Rule::in(self::CANONICAL_TIMELINES)],
            'tasks.*.assignedRole' => ['required', Rule::in(['PCCM', 'Department Head', 'Employee', 'ICT', 'Finance', 'Mentor'])],
            'tasks.*.responsibleRole' => ['nullable', 'string', 'max:100'],
            'tasks.*.assignedToName' => ['nullable', 'string', 'max:180'],
            'tasks.*.dueDate' => ['required', 'string', 'max:80'],
            'tasks.*.dependsOnTaskIds' => ['sometimes', 'array'],
            'tasks.*.dependsOnTaskIds.*' => ['string', 'max:100'],
            'tasks.*.isConditional' => ['sometimes', 'boolean'],
            'tasks.*.conditionNote' => ['nullable', 'string', 'max:1000'],
            'tasks.*.requiresHrConfirmation' => ['sometimes', 'boolean'],
            'tasks.*.requiredDocument' => ['nullable', 'string', 'max:180'],
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rawTasks
     * @return array<int, array<string, mixed>>
     */
    private function normalizeAndValidateTemplateTasks(array $rawTasks): array
    {
        $assignedIds = [];
        $idMap = [];
        foreach ($rawTasks as $index => $task) {
            $rawId = ! empty($task['id']) ? (string) $task['id'] : (string) Str::uuid();
            $canonicalId = ! empty($task['id']) ? (string) $task['id'] : (string) Str::uuid();
            if (in_array($canonicalId, $assignedIds, true)) {
                $canonicalId = (string) Str::uuid();
            }
            $assignedIds[] = $canonicalId;
            $idMap[$rawId] = $canonicalId;
            $idMap["idx-{$index}"] = $canonicalId;
        }

        $graph = [];
        $normalized = [];
        foreach ($rawTasks as $index => $task) {
            $id = $assignedIds[$index];
            $deps = [];
            foreach ($task['dependsOnTaskIds'] ?? [] as $depRef) {
                $mappedDep = $idMap[(string) $depRef] ?? (in_array((string) $depRef, $assignedIds, true) ? (string) $depRef : null);
                if ($mappedDep === null) {
                    abort(422, "Invalid prerequisite dependency in task '{$task['title']}'.");
                }
                if ($mappedDep === $id) {
                    abort(422, "Task '{$task['title']}' cannot depend on itself.");
                }
                $deps[] = $mappedDep;
            }
            $deps = array_values(array_unique($deps));
            $graph[$id] = $deps;

            $normalized[] = [
                ...$task,
                'id' => $id,
                'order' => $index + 1,
                'dependsOnTaskIds' => $deps,
                'isCompleted' => false,
            ];
        }

        // Detect dependency cycles via DFS
        $visiting = [];
        $visited = [];
        $hasCycle = function (string $nodeId) use (&$graph, &$visiting, &$visited, &$hasCycle): bool {
            if (! empty($visited[$nodeId])) {
                return false;
            }
            if (! empty($visiting[$nodeId])) {
                return true;
            }
            $visiting[$nodeId] = true;
            foreach ($graph[$nodeId] ?? [] as $dep) {
                if ($hasCycle($dep)) {
                    return true;
                }
            }
            unset($visiting[$nodeId]);
            $visited[$nodeId] = true;

            return false;
        };

        foreach ($assignedIds as $id) {
            if ($hasCycle($id)) {
                abort(422, 'Circular task dependency detected in onboarding checklist template.');
            }
        }

        return $normalized;
    }

    private function normalizeDepartment(string $department): string
    {
        return match (strtolower(trim($department))) {
            'human resources', 'hr', 'pccm', 'people & culture', 'people, culture & change' => 'PCCM',
            'manager', 'unit manager', 'department head' => 'Manager',
            'it', 'ict', 'information technology' => 'IT',
            'finance', 'finance & account', 'accounts' => 'Finance',
            'mentor', 'buddy', 'onboarding buddy' => 'Mentor',
            default => $department,
        };
    }

    private function normalizeTimeline(string $timeline): string
    {
        return match (strtolower(trim($timeline))) {
            'within 1st month', 'within the first month of resumption', '1st month (30 days)' => '1st Month',
            '1st three months', '1st three months of resumption', 'end of probation', '90 days (probation end)', '90 days (end of probation)', '1st three months / end of probation', 'through probationary period' => '90 Days',
            'post-3-months continuous' => 'Post-3-Months',
            default => $timeline,
        };
    }

    private function defaultAssignedRole(string $department): string
    {
        return match ($department) {
            'Manager' => 'Department Head',
            'IT' => 'ICT',
            'Finance' => 'Finance',
            'Mentor' => 'Mentor',
            default => 'PCCM',
        };
    }

    private function recalculateJourneyMetrics(array $journeyData): array
    {
        $tasks = $journeyData['tasks'] ?? [];
        $completedCount = collect($tasks)->where('isCompleted', true)->count();
        $pct = count($tasks) > 0 ? (int) round($completedCount * 100 / count($tasks)) : 0;
        $journeyData['overallProgressPercent'] = $pct;

        $docsComplete = collect($journeyData['requiredDocuments'] ?? [])
            ->every(fn (array $d) => ! empty($d['isConditional']) || ! empty($d['isSubmitted']));
        $oriComplete = collect($journeyData['orientationItems'] ?? [])
            ->every(fn (array $i) => ! empty($i['isCompleted']));

        if ($pct === 100 && $docsComplete && $oriComplete) {
            $journeyData['status'] = 'Completed';
        } elseif (($journeyData['status'] ?? '') === 'Completed' && $pct < 100) {
            $journeyData['status'] = 'In Progress';
        }

        return $journeyData;
    }

    private function dispatchTaskReminderNotification(OnboardingJourney $journey, array $task, User $sender): void
    {
        $employeeId = $journey->employee_record_id ?? ($journey->journey_data['employeeId'] ?? null);
        $employee = $employeeId ? Employee::query()->find($employeeId) : null;
        $targetUser = null;

        if ($employee && ($task['assignedRole'] ?? '') === 'Employee') {
            $targetUser = User::query()->where('staff_id', $employee->staff_id)->first();
        } elseif ($employee && in_array($task['department'] ?? '', ['Manager'], true) && $employee->manager_id) {
            $mgr = Employee::query()->find($employee->manager_id);
            if ($mgr) {
                $targetUser = User::query()->where('staff_id', $mgr->staff_id)->first();
            }
        }

        SystemNotification::create([
            'type' => 'warning',
            'category' => 'Onboarding',
            'title' => 'Onboarding Task Reminder',
            'message' => sprintf(
                'Reminder from %s for %s: "%s" (%s · Due %s).',
                $sender->name,
                $journey->journey_data['employeeName'] ?? 'New Hire',
                $task['title'] ?? 'Onboarding Task',
                $task['department'] ?? 'PCCM',
                $task['dueDate'] ?? $task['timeline'] ?? 'Upcoming'
            ),
            'target_user_id' => $targetUser?->id,
            'target_user_role' => $targetUser ? null : 'HR_STAFF',
            'action_url' => '/onboarding',
        ]);
    }

    private function defaultRequiredDocuments(): array
    {
        return [
            ['id' => 'doc-bio', 'name' => 'Employee Bio-Data Form', 'isSubmitted' => false],
            ['id' => 'doc-emg', 'name' => 'Emergency Contact Information', 'isSubmitted' => false],
            ['id' => 'doc-ben', 'name' => 'Benefits Enrollment Paperwork (HMO / Pension)', 'isSubmitted' => false],
            ['id' => 'doc-pay', 'name' => 'Payroll & Bank Account Details', 'isSubmitted' => false],
            ['id' => 'doc-hbk', 'name' => 'Employee Handbook featuring all company policies', 'isSubmitted' => false],
            ['id' => 'doc-sop', 'name' => 'Standard Operating Procedure (SOP) manual', 'isSubmitted' => false],
            [
                'id' => 'doc-nda',
                'name' => 'Non-disclosure agreement, non-compete, or confidentiality agreement',
                'isSubmitted' => false,
                'isConditional' => true,
                'conditionNote' => 'Conditional (if applicable): Required for roles with access to confidential, proprietary, or financial data.',
            ],
        ];
    }

    private function defaultOrientationItems(): array
    {
        return [
            ['id' => 'ori-tour', 'name' => 'Show new hires office space, parking spots & break room', 'isCompleted' => false],
            ['id' => 'ori-id', 'name' => 'Create Employee ID & Biometric Access Pass', 'isCompleted' => false],
            ['id' => 'ori-desk', 'name' => 'Set up work space, computer, phone, and supplies', 'isCompleted' => false],
            ['id' => 'ori-gift', 'name' => 'Place Citadel Welcome Gift (Swag Mug, T-Shirt, Stationery) on desk', 'isCompleted' => false],
        ];
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
        $department = app(\App\Repositories\OrganizationRepository::class)
            ->assertDepartmentBelongsToEntity($data['departmentId'], (string) $entity->id);
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
            \App\Services\RealtimeEventService::publish('recruitment_requisitions', 'INSERT', $requisition->id, ['status' => 'Open'], (int) $request->user()->id);

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
            \App\Services\RealtimeEventService::publish('recruitment_requisitions', 'UPDATE', $locked->id, ['status' => $validated['status']], (int) $request->user()->id);

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

    private function presentJourney(OnboardingJourney $journey): array
    {
        return array_merge(
            $journey->journey_data,
            [
                'id' => $journey->id,
                'version' => (int) ($journey->version ?? 1),
                'updatedAt' => $journey->updated_at?->toISOString(),
            ]
        );
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
            'version' => (int) ($template->version ?? 1),
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
