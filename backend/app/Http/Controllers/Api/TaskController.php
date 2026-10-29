<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Task;
use App\Models\TaskComment;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Task::query()->with([
            'project:id,title,code',
            'department:id,name',
            'assignee:id,staff_id,full_name,job_title',
            'creator:id,staff_id,full_name',
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

    public function show(Task $task): JsonResponse
    {
        $task->load([
            'project:id,title,code',
            'department:id,name',
            'assignee:id,staff_id,full_name,job_title',
            'creator:id,staff_id,full_name',
            'comments.author:id,staff_id,full_name',
        ]);

        return response()->json(['data' => $task]);
    }

    public function store(Request $request): JsonResponse
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
        ]);

        $currentEmployee = Employee::query()->where('staff_id', $request->user()->staff_id)->first();

        $task = Task::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'project_id' => $validated['project_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'priority' => $validated['priority'],
            'status' => $validated['status'],
            'due_date' => $validated['due_date'] ?? null,
            'assigned_to_employee_id' => $validated['assigned_to_employee_id'] ?? null,
            'created_by_employee_id' => $currentEmployee?->id,
        ]);

        AuditLogger::record($request, 'Tasks', 'Created task', $task->id, $task->title, null, $task->status);

        return response()->json(['data' => $task->load(['project', 'assignee'])], 201);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'status' => ['sometimes', Rule::in(['todo', 'in_progress', 'review', 'completed'])],
            'due_date' => ['nullable', 'date_format:Y-m-d'],
            'assigned_to_employee_id' => ['nullable', 'integer', 'exists:employees,id'],
        ]);

        $previousStatus = $task->status;
        $task->update($validated);

        AuditLogger::record($request, 'Tasks', 'Updated task', $task->id, $task->title, $previousStatus, $task->status);

        return response()->json(['data' => $task->fresh()->load(['project', 'assignee'])]);
    }

    public function updateStatus(Request $request, Task $task): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['todo', 'in_progress', 'review', 'completed'])],
        ]);

        $previousStatus = $task->status;
        $task->update(['status' => $validated['status']]);

        AuditLogger::record($request, 'Tasks', 'Changed task status', $task->id, $task->title, $previousStatus, $task->status);

        return response()->json(['data' => $task]);
    }

    public function addComment(Request $request, Task $task): JsonResponse
    {
        $validated = $request->validate([
            'comment' => ['required', 'string', 'max:3000'],
        ]);

        $currentEmployee = Employee::query()->where('staff_id', $request->user()->staff_id)->first();

        $comment = TaskComment::create([
            'task_id' => $task->id,
            'employee_id' => $currentEmployee?->id,
            'comment' => $validated['comment'],
        ]);

        return response()->json(['data' => $comment->load('author:id,staff_id,full_name')], 201);
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        $task->delete();
        AuditLogger::record($request, 'Tasks', 'Deleted task', $task->id, $task->title, 'Active', 'Deleted', 'Warning');

        return response()->json(['message' => 'Task removed.']);
    }
}
