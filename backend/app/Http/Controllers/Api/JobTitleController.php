<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobTitle;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Manages enterprise job titles, job specifications, and required experience levels.
 * Replicates the Job Title management behavior of OrangeHRM Admin Plugin.
 */
class JobTitleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = JobTitle::query()->orderBy('title');
        if ($request->boolean('activeOnly', true)) {
            $query->where('is_active', true);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function show(JobTitle $jobTitle): JsonResponse
    {
        return response()->json(['data' => $jobTitle->load('kpis')]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:180', 'unique:job_titles,title'],
            'description' => ['nullable', 'string', 'max:2000'],
            'specification' => ['nullable', 'string', 'max:4000'],
            'minExperienceYears' => ['sometimes', 'integer', 'min:0', 'max:50'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        $jobTitle = DB::transaction(function () use ($request, $data) {
            $jobTitle = JobTitle::create([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'specification' => $data['specification'] ?? null,
                'min_experience_years' => $data['minExperienceYears'] ?? 0,
                'is_active' => $data['isActive'] ?? true,
            ]);

            AuditLogger::record($request, 'Job Specifications', 'Created Job Title', (string) $jobTitle->id, $jobTitle->title, null, 'Active');

            return $jobTitle;
        });

        return response()->json(['data' => $jobTitle], 201);
    }

    public function update(Request $request, JobTitle $jobTitle): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:180', Rule::unique('job_titles', 'title')->ignore($jobTitle->id)],
            'description' => ['nullable', 'string', 'max:2000'],
            'specification' => ['nullable', 'string', 'max:4000'],
            'minExperienceYears' => ['sometimes', 'integer', 'min:0', 'max:50'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        $updated = DB::transaction(function () use ($request, $jobTitle, $data) {
            $previousTitle = $jobTitle->title;
            $jobTitle->update([
                'title' => $data['title'] ?? $jobTitle->title,
                'description' => array_key_exists('description', $data) ? $data['description'] : $jobTitle->description,
                'specification' => array_key_exists('specification', $data) ? $data['specification'] : $jobTitle->specification,
                'min_experience_years' => $data['minExperienceYears'] ?? $jobTitle->min_experience_years,
                'is_active' => $data['isActive'] ?? $jobTitle->is_active,
            ]);

            AuditLogger::record($request, 'Job Specifications', 'Updated Job Title', (string) $jobTitle->id, $jobTitle->title, $previousTitle, $jobTitle->title);

            return $jobTitle;
        });

        return response()->json(['data' => $updated]);
    }

    public function destroy(Request $request, JobTitle $jobTitle): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        DB::transaction(function () use ($request, $jobTitle) {
            $title = $jobTitle->title;
            $jobTitle->delete();
            AuditLogger::record($request, 'Job Specifications', 'Deleted Job Title', (string) $jobTitle->id, $title, 'Active', 'Deleted');
        });

        return response()->json(['message' => 'Job title deleted successfully.']);
    }

    private function authorizeAdminOrHr(Request $request): void
    {
        abort_unless(RoleAuthorization::isGlobalHrOrAdmin($request->user()), 403, 'You are not authorized to manage job specifications.');
    }
}
