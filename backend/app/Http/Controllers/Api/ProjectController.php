<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Project;
use App\Services\TaskProjectAccess;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Manages organizational projects and initiatives (Trellis project management).
 *
 * Scoped by TaskProjectAccess: members, creators, department heads, and admins
 * have visibility and management permissions according to their role.
 */
class ProjectController extends Controller
{
    /**
     * List projects visible to the authenticated user.
     *
     * GET /api/v1/projects
     */
    public function index(Request $request, TaskProjectAccess $access): JsonResponse
    {
        $query = $access->visibleProjects($request->user())->with(['department', 'creator:id,name,email', 'members:id,staff_id,full_name']);

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->input('department_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%");
            });
        }

        return response()->json(['data' => $query->latest()->paginate(30)]);
    }

    /**
     * Retrieve single project details with assigned members and task items.
     *
     * GET /api/v1/projects/{project}
     */
    public function show(Request $request, Project $project, TaskProjectAccess $access): JsonResponse
    {
        $project = $access->visibleProjects($request->user())->whereKey($project->getKey())->firstOrFail();
        $project->load(['department', 'creator:id,name,email', 'members:id,staff_id,full_name,job_title']);
        $project->setRelation('tasks', $access->visibleTasks($request->user())
            ->where('project_id', $project->id)
            ->with('assignee:id,staff_id,full_name')
            ->get());

        return response()->json(['data' => $project]);
    }

    /**
     * Create a new project within caller's authorized scope.
     *
     * POST /api/v1/projects
     */
    public function store(Request $request, TaskProjectAccess $access): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'code' => ['required', 'string', 'max:50', 'unique:projects,code'],
            'description' => ['nullable', 'string', 'max:5000'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'status' => ['required', Rule::in(['planning', 'active', 'on_hold', 'completed', 'cancelled'])],
            'priority' => ['required', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => ['integer', 'exists:employees,id'],
        ]);

        $departmentId = isset($validated['department_id']) ? (int) $validated['department_id'] : null;
        abort_unless($access->canManageDepartment($request->user(), $departmentId), 403, 'You are not authorized to create a project in this department.');
        $memberIds = array_values(array_unique($validated['member_ids'] ?? []));
        $this->ensureMembersBelongToDepartment($memberIds, $departmentId);

        $project = Project::create([
            'title' => $validated['title'],
            'code' => $validated['code'],
            'description' => $validated['description'] ?? null,
            'department_id' => $departmentId,
            'status' => $validated['status'],
            'priority' => $validated['priority'],
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'budget' => $validated['budget'] ?? 0,
            'created_by' => $request->user()->id,
        ]);

        if ($memberIds !== []) {
            $project->members()->sync($memberIds);
        }

        AuditLogger::record($request, 'Projects', 'Created project', $project->id, $project->title, null, 'Created');

        return response()->json(['data' => $project->load(['members', 'department'])], 201);
    }

    /**
     * Update an existing project's metadata, status, or member list.
     *
     * PATCH /api/v1/projects/{project}
     */
    public function update(Request $request, Project $project, TaskProjectAccess $access): JsonResponse
    {
        $project = $access->visibleProjects($request->user())->whereKey($project->getKey())->firstOrFail();
        abort_unless($access->canManageProject($request->user(), $project), 403, 'You are not authorized to manage this project.');

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:5000'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'status' => ['sometimes', Rule::in(['planning', 'active', 'on_hold', 'completed', 'cancelled'])],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => ['integer', 'exists:employees,id'],
        ]);

        $departmentId = array_key_exists('department_id', $validated)
            ? ($validated['department_id'] === null ? null : (int) $validated['department_id'])
            : ($project->department_id === null ? null : (int) $project->department_id);
        abort_unless($access->canManageDepartment($request->user(), $departmentId), 403, 'You are not authorized to move this project to that department.');
        $memberIds = array_values(array_unique($validated['member_ids'] ?? $project->members()->pluck('employees.id')->all()));
        $this->ensureMembersBelongToDepartment($memberIds, $departmentId);

        $project->update([...$validated, 'department_id' => $departmentId]);

        if (array_key_exists('member_ids', $validated)) {
            $project->members()->sync($memberIds);
        }

        AuditLogger::record($request, 'Projects', 'Updated project', $project->id, $project->title, null, 'Updated');

        return response()->json(['data' => $project->fresh()->load(['members', 'department'])]);
    }

    /**
     * Remove or archive a project.
     *
     * DELETE /api/v1/projects/{project}
     */
    public function destroy(Request $request, Project $project, TaskProjectAccess $access): JsonResponse
    {
        $project = $access->visibleProjects($request->user())->whereKey($project->getKey())->firstOrFail();
        abort_unless($access->canManageProject($request->user(), $project), 403, 'You are not authorized to manage this project.');

        $project->delete();
        AuditLogger::record($request, 'Projects', 'Deleted project', $project->id, $project->title, 'Active', 'Deleted', 'Warning');

        return response()->json(['message' => 'Project removed.']);
    }

    /**
     * @param  array<int, int|string>  $memberIds
     */
    private function ensureMembersBelongToDepartment(array $memberIds, ?int $departmentId): void
    {
        if ($memberIds === []) {
            return;
        }

        if ($departmentId === null) {
            $employees = Employee::query()->whereIn('id', $memberIds)->whereNotNull('entity_id');
            $entityIds = (clone $employees)->distinct()->pluck('entity_id')->all();

            abort_unless(count($entityIds) === 1 && $employees->count() === count($memberIds), 422, 'A project without a department must have members from one entity.');

            return;
        }

        $entityId = Department::query()->whereKey($departmentId)->value('entity_id');
        abort_unless($entityId !== null, 422, 'Project members require a department linked to an entity.');
        $matchingEmployees = Employee::query()
            ->whereIn('id', $memberIds)
            ->where('entity_id', $entityId)
            ->count();

        abort_unless($matchingEmployees === count($memberIds), 422, 'All project members must belong to the project department entity.');
    }
}
