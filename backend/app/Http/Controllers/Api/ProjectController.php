<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Project::query()->with(['department', 'creator:id,name,email', 'members:id,staff_id,full_name']);

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

    public function show(Project $project): JsonResponse
    {
        $project->load(['department', 'creator:id,name,email', 'members:id,staff_id,full_name,job_title', 'tasks.assignee:id,staff_id,full_name']);

        return response()->json(['data' => $project]);
    }

    public function store(Request $request): JsonResponse
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

        $project = Project::create([
            'title' => $validated['title'],
            'code' => $validated['code'],
            'description' => $validated['description'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'status' => $validated['status'],
            'priority' => $validated['priority'],
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'budget' => $validated['budget'] ?? 0,
            'created_by' => $request->user()->id,
        ]);

        if (! empty($validated['member_ids'])) {
            $project->members()->sync($validated['member_ids']);
        }

        AuditLogger::record($request, 'Projects', 'Created project', $project->id, $project->title, null, 'Created');

        return response()->json(['data' => $project->load(['members', 'department'])], 201);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
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

        $project->update($validated);

        if (array_key_exists('member_ids', $validated)) {
            $project->members()->sync($validated['member_ids'] ?? []);
        }

        AuditLogger::record($request, 'Projects', 'Updated project', $project->id, $project->title, null, 'Updated');

        return response()->json(['data' => $project->fresh()->load(['members', 'department'])]);
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        $project->delete();
        AuditLogger::record($request, 'Projects', 'Deleted project', $project->id, $project->title, 'Active', 'Deleted', 'Warning');

        return response()->json(['message' => 'Project removed.']);
    }
}
