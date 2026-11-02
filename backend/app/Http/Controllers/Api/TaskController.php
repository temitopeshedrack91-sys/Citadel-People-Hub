<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use App\Services\TaskProjectAccess;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    public function index(Request $request, TaskProjectAccess $access): JsonResponse
    {
        $query = $access->visibleTasks($request->user())->with([
            'project:id,title,code',
            'department:id,name',
            'assignee:id,staff_id,full_name,job_title',
            'creator:id,staff_id,full_name',
            'reviewer:id,staff_id,full_name',
            'comments.author:id,staff_id,full_name',
        ])->withCount('comments');

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }
        if ($request->filled('assigned_to')) {
            $query->where('assigned_to_employee_id', $request->input('assigned_to'));
        }
        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json(['data' => $query->latest()->paginate(50)]);
    }

    public function show(Request $request, Task $task, TaskProjectAccess $access): JsonResponse
    {
        $task = $access->visibleTasks($request->user())->whereKey($task->getKey())->firstOrFail();
        $task->load([
            'project:id,title,code',
            'department:id,name',
            'assignee:id,staff_id,full_name,job_title',
            'creator:id,staff_id,full_name',
            'comments.author:id,staff_id,full_name',
            'reviewer:id,staff_id,full_name',
        ]);

        return response()->json(['data' => $task]);
    }

    public function store(Request $request, TaskProjectAccess $access): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'priority' => ['required', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'status' => ['required', Rule::in(['todo', 'in_progress', 'review', 'completed'])],
            'due_date' => ['nullable', 'date_format:Y-m-d'],
            'assigned_to_employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'reviewer_employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'labels' => ['sometimes', 'array', 'max:20'],
            'labels.*' => ['string', 'max:50'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'checklist' => ['sometimes', 'array', 'max:100'],
            'checklist.*.id' => ['required', 'string', 'max:80'],
            'checklist.*.text' => ['required', 'string', 'max:500'],
            'checklist.*.done' => ['required', 'boolean'],
            'pr_tag' => ['nullable', 'string', 'max:120'],
        ]);

        $departmentId = $this->validateTaskScope(
            $request->user(),
            $access,
            isset($validated['project_id']) ? (int) $validated['project_id'] : null,
            isset($validated['department_id']) ? (int) $validated['department_id'] : null,
            isset($validated['assigned_to_employee_id']) ? (int) $validated['assigned_to_employee_id'] : null,
            isset($validated['reviewer_employee_id']) ? (int) $validated['reviewer_employee_id'] : null,
        );

        $currentEmployee = Employee::query()->where('staff_id', $request->user()->staff_id)->first();
        $assigneeId = isset($validated['assigned_to_employee_id']) ? (int) $validated['assigned_to_employee_id'] : null;

        $task = Task::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'project_id' => $validated['project_id'] ?? null,
            'department_id' => $departmentId,
            'priority' => $validated['priority'],
            'status' => $validated['status'],
            'due_date' => $validated['due_date'] ?? null,
            'assigned_to_employee_id' => $validated['assigned_to_employee_id'] ?? null,
            'created_by_employee_id' => $currentEmployee?->id,
            'reviewer_employee_id' => $validated['reviewer_employee_id'] ?? null,
            'labels' => $validated['labels'] ?? [],
            'estimated_hours' => $validated['estimated_hours'] ?? null,
            'checklist' => $validated['checklist'] ?? [],
            'pr_tag' => $validated['pr_tag'] ?? null,
            'assignment_status' => $assigneeId !== null && $assigneeId !== (int) $currentEmployee?->id ? 'pending' : 'accepted',
            'decline_reason' => null,
        ]);

        AuditLogger::record($request, 'Tasks', 'Created task', $task->id, $task->title, null, $task->status);

        return response()->json(['data' => $task->load(['project', 'department', 'assignee', 'creator', 'reviewer', 'comments.author'])], 201);
    }

    public function update(Request $request, Task $task, TaskProjectAccess $access): JsonResponse
    {
        $task = $access->visibleTasks($request->user())->whereKey($task->getKey())->firstOrFail();
        abort_unless($access->canManageTask($request->user(), $task), 403, 'You are not authorized to manage this task.');

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'status' => ['sometimes', Rule::in(['todo', 'in_progress', 'review', 'completed'])],
            'due_date' => ['nullable', 'date_format:Y-m-d'],
            'assigned_to_employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'reviewer_employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'labels' => ['sometimes', 'array', 'max:20'],
            'labels.*' => ['string', 'max:50'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'checklist' => ['sometimes', 'array', 'max:100'],
            'checklist.*.id' => ['required', 'string', 'max:80'],
            'checklist.*.text' => ['required', 'string', 'max:500'],
            'checklist.*.done' => ['required', 'boolean'],
            'pr_tag' => ['nullable', 'string', 'max:120'],
        ]);

        $projectId = array_key_exists('project_id', $validated)
            ? ($validated['project_id'] === null ? null : (int) $validated['project_id'])
            : ($task->project_id === null ? null : (int) $task->project_id);
        $requestedDepartmentId = array_key_exists('department_id', $validated)
            ? ($validated['department_id'] === null ? null : (int) $validated['department_id'])
            : ($task->department_id === null ? null : (int) $task->department_id);
        $assigneeId = array_key_exists('assigned_to_employee_id', $validated)
            ? ($validated['assigned_to_employee_id'] === null ? null : (int) $validated['assigned_to_employee_id'])
            : ($task->assigned_to_employee_id === null ? null : (int) $task->assigned_to_employee_id);
        $reviewerId = array_key_exists('reviewer_employee_id', $validated)
            ? ($validated['reviewer_employee_id'] === null ? null : (int) $validated['reviewer_employee_id'])
            : ($task->reviewer_employee_id === null ? null : (int) $task->reviewer_employee_id);
        $departmentId = $this->validateTaskScope($request->user(), $access, $projectId, $requestedDepartmentId, $assigneeId, $reviewerId);

        $previousStatus = $task->status;
        $currentEmployee = Employee::query()->where('staff_id', $request->user()->staff_id)->first();
        $assignmentChanges = array_key_exists('assigned_to_employee_id', $validated);
        $task->update([
            ...$validated,
            'department_id' => $departmentId,
            ...($assignmentChanges ? [
                'assignment_status' => $assigneeId !== null && $assigneeId !== (int) $currentEmployee?->id ? 'pending' : 'accepted',
                'decline_reason' => null,
            ] : []),
        ]);

        AuditLogger::record($request, 'Tasks', 'Updated task', $task->id, $task->title, $previousStatus, $task->status);

        return response()->json(['data' => $task->fresh()->load(['project', 'department', 'assignee', 'creator', 'reviewer', 'comments.author'])]);
    }

    public function updateStatus(Request $request, Task $task, TaskProjectAccess $access): JsonResponse
    {
        $task = $access->visibleTasks($request->user())->whereKey($task->getKey())->firstOrFail();
        abort_unless($access->canUpdateTaskStatus($request->user(), $task), 403, 'You are not authorized to change this task status.');

        $validated = $request->validate([
            'status' => ['required', Rule::in(['todo', 'in_progress', 'review', 'completed'])],
        ]);

        $previousStatus = $task->status;
        $task->update(['status' => $validated['status']]);

        AuditLogger::record($request, 'Tasks', 'Changed task status', $task->id, $task->title, $previousStatus, $task->status);

        return response()->json(['data' => $task]);
    }

    public function updateAssignment(Request $request, Task $task, TaskProjectAccess $access): JsonResponse
    {
        $task = $access->visibleTasks($request->user())->whereKey($task->getKey())->firstOrFail();
        $employeeId = $access->employeeIdFor($request->user());
        abort_unless($employeeId !== null && (int) $task->assigned_to_employee_id === $employeeId, 403, 'Only the assigned employee can respond to this task assignment.');

        $validated = $request->validate([
            'status' => ['required', Rule::in(['accepted', 'declined'])],
            'reason' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);
        $previous = $task->assignment_status;
        $task->update([
            'assignment_status' => $validated['status'],
            'decline_reason' => $validated['status'] === 'declined' ? $validated['reason'] : null,
        ]);
        AuditLogger::record($request, 'Tasks', 'Responded to task assignment', $task->id, $task->title, $previous, $task->assignment_status);

        return response()->json(['data' => $task->fresh()->load(['project', 'department', 'assignee', 'creator', 'reviewer', 'comments.author'])]);
    }

    public function updateChecklist(Request $request, Task $task, TaskProjectAccess $access): JsonResponse
    {
        $task = $access->visibleTasks($request->user())->whereKey($task->getKey())->firstOrFail();
        abort_unless($access->canUpdateTaskStatus($request->user(), $task), 403, 'You are not authorized to update this task checklist.');
        $validated = $request->validate([
            'checklist' => ['present', 'array', 'max:100'],
            'checklist.*.id' => ['required', 'string', 'max:80'],
            'checklist.*.text' => ['required', 'string', 'max:500'],
            'checklist.*.done' => ['required', 'boolean'],
        ]);
        $task->update(['checklist' => $validated['checklist']]);
        AuditLogger::record($request, 'Tasks', 'Updated task checklist', $task->id, $task->title, null, 'Checklist updated');

        return response()->json(['data' => $task->fresh()->load(['project', 'department', 'assignee', 'creator', 'reviewer', 'comments.author'])]);
    }

    public function addComment(Request $request, Task $task, TaskProjectAccess $access): JsonResponse
    {
        $task = $access->visibleTasks($request->user())->whereKey($task->getKey())->firstOrFail();
        $validated = $request->validate([
            'comment' => ['required', 'string', 'max:3000'],
        ]);

        $currentEmployee = Employee::query()->where('staff_id', $request->user()->staff_id)->first();

        $comment = TaskComment::create([
            'task_id' => $task->id,
            'employee_id' => $currentEmployee?->id,
            'comment' => $validated['comment'],
        ]);
        AuditLogger::record($request, 'Tasks', 'Added task comment', $task->id, $task->title, null, 'Comment added');

        return response()->json(['data' => $comment->load('author:id,staff_id,full_name')], 201);
    }

    public function destroy(Request $request, Task $task, TaskProjectAccess $access): JsonResponse
    {
        $task = $access->visibleTasks($request->user())->whereKey($task->getKey())->firstOrFail();
        abort_unless($access->canManageTask($request->user(), $task), 403, 'You are not authorized to manage this task.');

        $task->delete();
        AuditLogger::record($request, 'Tasks', 'Deleted task', $task->id, $task->title, 'Active', 'Deleted', 'Warning');

        return response()->json(['message' => 'Task removed.']);
    }

    private function validateTaskScope(
        User $user,
        TaskProjectAccess $access,
        ?int $projectId,
        ?int $departmentId,
        ?int $assigneeId,
        ?int $reviewerId = null,
    ): ?int {
        $project = $projectId === null ? null : Project::query()->findOrFail($projectId);
        if ($project !== null && $departmentId !== null && $project->department_id !== null) {
            abort_unless((int) $project->department_id === $departmentId, 422, 'The task department must match the project department.');
        }

        $effectiveDepartmentId = $departmentId ?? ($project?->department_id === null ? null : (int) $project->department_id);
        $assignee = $assigneeId === null ? null : Employee::query()->findOrFail($assigneeId);

        if ($effectiveDepartmentId === null && $assignee !== null && $assignee->department_id !== null) {
            $effectiveDepartmentId = (int) $assignee->department_id;
        }

        abort_unless($access->canManageDepartment($user, $effectiveDepartmentId), 403, 'You are not authorized to create or assign tasks in this department.');

        if ($project !== null) {
            abort_unless($access->canManageProject($user, $project), 403, 'You are not authorized to attach tasks to this project.');
        }

        if ($assignee !== null) {
            abort_unless($access->canAssignEmployee($user, $assignee, $effectiveDepartmentId), 403, 'Task assignees must belong to the task department entity.');
        }

        if ($reviewerId !== null) {
            $reviewer = Employee::query()->findOrFail($reviewerId);
            abort_unless($access->canAssignEmployee($user, $reviewer, $effectiveDepartmentId), 403, 'Task reviewers must belong to the task department entity.');
        }

        return $effectiveDepartmentId;
    }
}
