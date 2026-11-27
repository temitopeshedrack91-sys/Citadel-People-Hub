<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Kpi;
use App\Models\PerformanceReview;
use App\Models\ReviewRating;
use App\Services\EmployeeHierarchyService;
use App\Services\RealtimeEventService;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Manages Key Performance Indicators (KPIs), weighted appraisals, and review evaluations.
 */
class PerformanceController extends Controller
{
    public function kpis(Request $request): JsonResponse
    {
        $query = Kpi::query()->with('jobTitle');
        if ($request->filled('jobTitleId')) {
            $query->where('job_title_id', $request->input('jobTitleId'));
        }
        if ($request->boolean('activeOnly', true)) {
            $query->where('is_active', true);
        }

        return response()->json([
            'data' => $query->orderBy('id')->get()->map(fn (Kpi $kpi) => $this->presentKpi($kpi)),
        ]);
    }

    public function storeKpi(Request $request): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'jobTitleId' => ['nullable', 'exists:job_titles,id'],
            'indicator' => ['required', 'string', 'max:250'],
            'minRating' => ['sometimes', 'numeric', 'min:0', 'max:10'],
            'maxRating' => ['sometimes', 'numeric', 'gt:minRating', 'max:100'],
            'weight' => ['sometimes', 'numeric', 'min:1', 'max:100'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        $min = (float) ($data['minRating'] ?? 1.0);
        $max = (float) ($data['maxRating'] ?? 5.0);
        abort_unless($max > $min, 422, 'Maximum rating must be strictly greater than minimum rating.');

        $kpi = DB::transaction(function () use ($request, $data, $min, $max) {
            $kpi = Kpi::create([
                'job_title_id' => $data['jobTitleId'] ?? null,
                'indicator' => trim($data['indicator']),
                'min_rating' => $min,
                'max_rating' => $max,
                'weight' => $data['weight'] ?? 100.00,
                'is_active' => $data['isActive'] ?? true,
                'version' => 1,
            ]);

            AuditLogger::record($request, 'Performance', 'Created KPI', (string) $kpi->id, $kpi->indicator, null, 'Active');
            RealtimeEventService::publish('kpis', 'INSERT', $kpi->id, ['indicator' => $kpi->indicator], (int) $request->user()->id);

            return $kpi;
        });

        return response()->json(['data' => $this->presentKpi($kpi->load('jobTitle'))], 201);
    }

    public function updateKpi(Request $request, Kpi $kpi): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'jobTitleId' => ['nullable', 'exists:job_titles,id'],
            'indicator' => ['sometimes', 'string', 'max:250'],
            'minRating' => ['sometimes', 'numeric', 'min:0'],
            'maxRating' => ['sometimes', 'numeric'],
            'weight' => ['sometimes', 'numeric', 'min:1', 'max:100'],
            'isActive' => ['sometimes', 'boolean'],
            'version' => ['sometimes', 'integer', 'min:1'],
        ]);

        $updated = DB::transaction(function () use ($request, $kpi, $data) {
            $locked = Kpi::query()->lockForUpdate()->findOrFail($kpi->id);

            if (isset($data['version']) && (int) $locked->version !== (int) $data['version']) {
                abort(409, 'This KPI was modified by another user. Refresh before saving.');
            }

            $min = (float) ($data['minRating'] ?? $locked->min_rating);
            $max = (float) ($data['maxRating'] ?? $locked->max_rating);
            if ($max <= $min) {
                abort(422, 'Maximum rating must be strictly greater than minimum rating.');
            }

            $locked->update([
                'job_title_id' => array_key_exists('jobTitleId', $data) ? $data['jobTitleId'] : $locked->job_title_id,
                'indicator' => isset($data['indicator']) ? trim($data['indicator']) : $locked->indicator,
                'min_rating' => $min,
                'max_rating' => $max,
                'weight' => $data['weight'] ?? $locked->weight,
                'is_active' => $data['isActive'] ?? $locked->is_active,
                'version' => ((int) $locked->version) + 1,
            ]);

            AuditLogger::record($request, 'Performance', 'Updated KPI', (string) $locked->id, $locked->indicator, null, 'Updated');
            RealtimeEventService::publish('kpis', 'UPDATE', $locked->id, ['indicator' => $locked->indicator], (int) $request->user()->id);

            return $locked->fresh();
        });

        return response()->json(['data' => $this->presentKpi($updated->load('jobTitle'))]);
    }

    public function destroyKpi(Request $request, Kpi $kpi): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        DB::transaction(function () use ($request, $kpi) {
            $id = $kpi->id;
            $indicator = $kpi->indicator;
            $kpi->delete();
            AuditLogger::record($request, 'Performance', 'Deleted KPI', (string) $id, $indicator, 'Active', 'Deleted');
            RealtimeEventService::publish('kpis', 'DELETE', $id, ['indicator' => $indicator], (int) $request->user()->id);
        });

        return response()->json(['message' => 'KPI deleted successfully.']);
    }

    public function reviews(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = RoleAuthorization::canonical($user->role);
        abort_unless(in_array($role, ['ADMIN', 'HR_STAFF', 'MANAGER', 'EMPLOYEE'], true), 403, 'Unauthorized.');

        $query = PerformanceReview::query()->with([
            'employee:id,staff_id,full_name,department_id,entity_id',
            'reviewer:id,staff_id,full_name',
            'ratings.kpi',
        ]);

        if (! RoleAuthorization::isGlobalHrOrAdmin($user)) {
            $employee = $user->staff_id
                ? Employee::query()->where('staff_id', $user->staff_id)->first()
                : null;

            if (RoleAuthorization::isSupervisor($user)) {
                $teamIds = $employee
                    ? app(EmployeeHierarchyService::class)->getSubtreeEmployeeIds((int) $employee->id)
                    : [];

                if ($employee !== null) {
                    $allowedEmployeeIds = array_values(array_unique(array_merge([(int) $employee->id], $teamIds)));
                    $query->where(function ($q) use ($employee, $allowedEmployeeIds) {
                        $q->whereIn('employee_id', $allowedEmployeeIds)
                            ->orWhere('reviewer_id', $employee->id);
                    });
                } elseif (strtoupper(trim($user->role)) === 'DEPARTMENT_HEAD' && $user->department_id !== null) {
                    $query->whereIn('employee_id', Employee::query()->select('id')->where('department_id', $user->department_id));
                } else {
                    return response()->json(['data' => []]);
                }
            } else {
                if (! $employee) {
                    return response()->json(['data' => []]);
                }
                $query->where(function ($q) use ($employee) {
                    $q->where('employee_id', $employee->id)
                        ->orWhere('reviewer_id', $employee->id);
                });
            }
        }

        if ($request->filled('employeeId')) {
            $query->where('employee_id', $request->input('employeeId'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json([
            'data' => $query->latest()->limit(200)->get()->map(fn (PerformanceReview $rev) => $this->presentReview($rev)),
        ]);
    }

    public function showReview(Request $request, PerformanceReview $performanceReview): JsonResponse
    {
        $this->ensureCanAccessReview($request, $performanceReview);

        return response()->json([
            'data' => $this->presentReview($performanceReview->load(['employee', 'reviewer', 'ratings.kpi'])),
        ]);
    }

    public function storeReview(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'employeeId' => ['required', 'exists:employees,id'],
            'reviewerId' => ['nullable', 'exists:employees,id'],
            'reviewPeriodStart' => ['required', 'date_format:Y-m-d'],
            'reviewPeriodEnd' => ['required', 'date_format:Y-m-d', 'after_or_equal:reviewPeriodStart'],
            'dueDate' => ['required', 'date_format:Y-m-d', 'after_or_equal:reviewPeriodEnd'],
            'kpis' => ['sometimes', 'array'],
            'kpis.*.kpiId' => ['nullable', 'exists:kpis,id'],
            'kpis.*.title' => ['required_without:kpis.*.kpiId', 'string', 'max:250'],
            'kpis.*.weight' => ['nullable', 'numeric', 'min:0.01', 'max:100'],
        ]);

        $employee = Employee::query()->findOrFail($data['employeeId']);

        if (! RoleAuthorization::isGlobalHrOrAdmin($user)) {
            $actorEmployee = $user->staff_id
                ? Employee::query()->where('staff_id', $user->staff_id)->first()
                : null;
            $canManageTarget = $actorEmployee !== null
                && RoleAuthorization::isSupervisor($user)
                && (
                    (string) $employee->manager_id === (string) $actorEmployee->id
                    || in_array(
                        (int) $employee->id,
                        app(EmployeeHierarchyService::class)->getSubtreeEmployeeIds((int) $actorEmployee->id),
                        true
                    )
                );
            abort_unless($canManageTarget, 403, 'Only HR/Admin or the employee\'s line manager can set KPI goals and initiate an appraisal.');
        }

        $reviewerId = $data['reviewerId'] ?? ($employee->manager_id ? (int) $employee->manager_id : null);
        if (! $reviewerId && $request->user()->staff_id) {
            $reviewerId = Employee::query()->where('staff_id', $request->user()->staff_id)->value('id');
        }
        abort_unless($reviewerId !== null && Employee::query()->whereKey($reviewerId)->exists(), 422, 'Select a valid reviewer/supervisor employee.');

        $preparedKpis = [];
        if (! empty($data['kpis'])) {
            $totalWeight = 0.0;
            $seenKeys = [];
            foreach ($data['kpis'] as $kpiItem) {
                $kpiModel = ! empty($kpiItem['kpiId']) ? Kpi::query()->find($kpiItem['kpiId']) : null;
                if ($kpiModel && ! $kpiModel->is_active) {
                    abort(422, "KPI '{$kpiModel->indicator}' is inactive and cannot be assigned.");
                }
                $title = trim((string) ($kpiItem['title'] ?? ($kpiModel?->indicator ?? 'KPI')));
                $dedupeKey = $kpiModel ? 'id:'.$kpiModel->id : 'title:'.strtolower($title);
                if (isset($seenKeys[$dedupeKey])) {
                    abort(422, "Duplicate KPI '{$title}' in appraisal assignment.");
                }
                $seenKeys[$dedupeKey] = true;

                $weight = isset($kpiItem['weight'])
                    ? (float) $kpiItem['weight']
                    : (float) ($kpiModel?->weight ?? 0);
                if ($weight <= 0) {
                    abort(422, "KPI '{$title}' must have a weight greater than 0%.");
                }
                $totalWeight += $weight;

                $preparedKpis[] = [
                    'kpi_id' => $kpiModel?->id,
                    'kpi_title' => $title,
                    'weight' => round($weight, 2),
                ];
            }

            if (abs($totalWeight - 100.0) > 0.01) {
                $formattedTotal = round($totalWeight, 2);
                abort(422, "Assigned KPI weights must sum to 100% (currently {$formattedTotal}%).");
            }
        }

        $review = DB::transaction(function () use ($request, $data, $reviewerId, $preparedKpis) {
            $user = $request->user();
            $review = PerformanceReview::create([
                'employee_id' => $data['employeeId'],
                'reviewer_id' => $reviewerId,
                'creator_id' => $user->id,
                'review_period_start' => $data['reviewPeriodStart'],
                'review_period_end' => $data['reviewPeriodEnd'],
                'due_date' => $data['dueDate'],
                'status' => 'IN_PROGRESS',
                'version' => 1,
            ]);

            foreach ($preparedKpis as $kpiRow) {
                ReviewRating::create([
                    'performance_review_id' => $review->id,
                    'kpi_id' => $kpiRow['kpi_id'],
                    'kpi_title' => $kpiRow['kpi_title'],
                    'weight' => $kpiRow['weight'],
                    'rating' => 0,
                ]);
            }

            AuditLogger::record($request, 'Performance', 'Created Performance Review', (string) $review->id, "Review for Employee #{$data['employeeId']}", null, 'IN_PROGRESS');
            RealtimeEventService::publish('performance_reviews', 'INSERT', $review->id, ['employeeId' => $review->employee_id], (int) $user->id);

            return $review;
        });

        return response()->json(['data' => $this->presentReview($review->load(['employee', 'reviewer', 'ratings.kpi']))], 201);
    }

    public function evaluateReview(Request $request, PerformanceReview $performanceReview): JsonResponse
    {
        $this->ensureCanEvaluateReview($request, $performanceReview);

        $data = $request->validate([
            'ratings' => ['required', 'array', 'min:1'],
            'ratings.*.kpiId' => ['nullable', 'exists:kpis,id'],
            'ratings.*.kpiTitle' => ['required', 'string', 'max:250'],
            'ratings.*.weight' => ['nullable', 'numeric', 'min:0.01', 'max:100'],
            'ratings.*.rating' => ['required', 'numeric', 'min:0', 'max:100'],
            'ratings.*.comment' => ['nullable', 'string', 'max:1000'],
            'reviewerComments' => ['nullable', 'string', 'max:2000'],
            'employeeComments' => ['nullable', 'string', 'max:2000'],
            'version' => ['sometimes', 'integer', 'min:1'],
        ]);

        $updated = DB::transaction(function () use ($request, $performanceReview, $data) {
            $locked = PerformanceReview::query()->with('ratings.kpi')->lockForUpdate()->findOrFail($performanceReview->id);

            abort_unless(in_array($locked->status, ['IN_PROGRESS', 'SUBMITTED'], true), 409, 'Only reviews In Progress or Submitted can be evaluated.');

            if (isset($data['version']) && (int) $locked->version !== (int) $data['version']) {
                abort(409, 'This appraisal was updated by another user. Refresh before saving your scores.');
            }

            $assignedRatings = $locked->ratings;
            $assignedByKpiId = [];
            $assignedByTitle = [];
            foreach ($assignedRatings as $existing) {
                if ($existing->kpi_id !== null) {
                    $assignedByKpiId[(int) $existing->kpi_id] = $existing;
                }
                $assignedByTitle[strtolower(trim($existing->kpi_title))] = $existing;
            }

            $submittedKeys = [];
            $rowsToInsert = [];
            $totalWeightedScore = 0.0;
            $totalWeight = 0.0;

            foreach ($data['ratings'] as $item) {
                $title = trim((string) $item['kpiTitle']);
                $kpiId = ! empty($item['kpiId']) ? (int) $item['kpiId'] : null;

                // Resolve matching assigned row if kpiId was omitted or needs canonical reference
                $assignedRow = $kpiId !== null
                    ? ($assignedByKpiId[$kpiId] ?? null)
                    : ($assignedByTitle[strtolower($title)] ?? null);
                if ($kpiId === null && $assignedRow && $assignedRow->kpi_id !== null) {
                    $kpiId = (int) $assignedRow->kpi_id;
                }

                $dedupeKey = $kpiId !== null ? 'id:'.$kpiId : 'title:'.strtolower($title);
                if (isset($submittedKeys[$dedupeKey])) {
                    abort(422, "Duplicate KPI rating submitted for '{$title}'.");
                }
                $submittedKeys[$dedupeKey] = true;

                $kpi = $kpiId !== null ? Kpi::query()->find($kpiId) : null;
                $weight = isset($item['weight'])
                    ? (float) $item['weight']
                    : ($assignedRow ? (float) $assignedRow->weight : ($kpi ? (float) $kpi->weight : 100.0));

                $ratingVal = (float) $item['rating'];
                $minRating = $kpi ? (float) $kpi->min_rating : 1.0;
                $maxRating = $kpi ? (float) $kpi->max_rating : 5.0;
                if ($ratingVal < $minRating || $ratingVal > $maxRating) {
                    abort(422, "Rating for '{$title}' must be between {$minRating} and {$maxRating}.");
                }

                $rowsToInsert[] = [
                    'performance_review_id' => $locked->id,
                    'kpi_id' => $kpiId,
                    'kpi_title' => $title,
                    'weight' => round($weight, 2),
                    'rating' => $ratingVal,
                    'comment' => $item['comment'] ?? null,
                ];

                $totalWeightedScore += ($ratingVal * $weight);
                $totalWeight += $weight;
            }

            // Reject incomplete KPI sets whenever the review has pre-assigned KPIs
            if ($assignedRatings->isNotEmpty()) {
                $missing = [];
                foreach ($assignedRatings as $existing) {
                    $key = $existing->kpi_id !== null
                        ? 'id:'.((int) $existing->kpi_id)
                        : 'title:'.strtolower(trim($existing->kpi_title));
                    if (! isset($submittedKeys[$key])) {
                        $missing[] = $existing->kpi_title;
                    }
                }
                if ($missing !== []) {
                    abort(422, 'Incomplete KPI set: all assigned KPIs must be scored before evaluation (missing: '.implode(', ', $missing).').');
                }
            }

            if (abs($totalWeight - 100.0) > 0.01) {
                $formattedWeight = round($totalWeight, 2);
                abort(422, "Appraisal KPI weights must sum to 100% (currently {$formattedWeight}%).");
            }

            $locked->ratings()->delete();
            foreach ($rowsToInsert as $row) {
                ReviewRating::create($row);
            }

            $finalRating = round($totalWeightedScore / $totalWeight, 2);

            $locked->update([
                'status' => 'EVALUATED',
                'final_rating' => $finalRating,
                'reviewer_comments' => $data['reviewerComments'] ?? $locked->reviewer_comments,
                'employee_comments' => $data['employeeComments'] ?? $locked->employee_comments,
                'version' => ((int) $locked->version) + 1,
            ]);

            AuditLogger::record($request, 'Performance', 'Evaluated Performance Review', (string) $locked->id, "Review #{$locked->id}", 'IN_PROGRESS', 'EVALUATED');
            RealtimeEventService::publish('performance_reviews', 'UPDATE', $locked->id, ['status' => 'EVALUATED'], (int) $request->user()->id);

            return $locked->fresh();
        });

        return response()->json(['data' => $this->presentReview($updated->load(['employee', 'reviewer', 'ratings.kpi']))]);
    }

    public function approveReview(Request $request, PerformanceReview $performanceReview): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'version' => ['sometimes', 'integer', 'min:1'],
        ]);

        $updated = DB::transaction(function () use ($request, $performanceReview, $data) {
            $locked = PerformanceReview::query()->with('ratings')->lockForUpdate()->findOrFail($performanceReview->id);

            abort_unless(in_array($locked->status, ['EVALUATED', 'SUBMITTED'], true), 409, 'Only evaluated reviews can be formally approved.');

            if (isset($data['version']) && (int) $locked->version !== (int) $data['version']) {
                abort(409, 'This appraisal was updated by another user. Refresh before approving.');
            }

            if ($locked->ratings->isEmpty() || $locked->ratings->contains(fn (ReviewRating $r) => (float) $r->rating <= 0)) {
                abort(422, 'Cannot approve an appraisal with missing or unscored KPI ratings.');
            }

            $totalWeight = (float) $locked->ratings->sum(fn (ReviewRating $r) => (float) ($r->weight ?? 0));
            if (abs($totalWeight - 100.0) > 0.01) {
                abort(422, "Cannot approve appraisal: KPI weights sum to {$totalWeight}% instead of 100%.");
            }

            $locked->update([
                'status' => 'APPROVED',
                'completed_at' => now(),
                'version' => ((int) $locked->version) + 1,
            ]);

            AuditLogger::record($request, 'Performance', 'Approved Performance Review', (string) $locked->id, "Review #{$locked->id}", 'EVALUATED', 'APPROVED');
            RealtimeEventService::publish('performance_reviews', 'UPDATE', $locked->id, ['status' => 'APPROVED'], (int) $request->user()->id);

            return $locked->fresh();
        });

        return response()->json(['data' => $this->presentReview($updated->load(['employee', 'reviewer', 'ratings.kpi']))]);
    }

    private function ensureCanAccessReview(Request $request, PerformanceReview $review): void
    {
        $user = $request->user();
        if (RoleAuthorization::isGlobalHrOrAdmin($user)) {
            return;
        }

        $employee = $user->staff_id
            ? Employee::query()->where('staff_id', $user->staff_id)->first()
            : null;
        if ($employee && ($employee->id === $review->employee_id || $employee->id === $review->reviewer_id)) {
            return;
        }

        if ($employee && RoleAuthorization::isSupervisor($user)) {
            $subtree = app(EmployeeHierarchyService::class)->getSubtreeEmployeeIds((int) $employee->id);
            if (in_array((int) $review->employee_id, $subtree, true)) {
                return;
            }
        }

        abort(403, 'Unauthorized access to this performance review.');
    }

    private function ensureCanEvaluateReview(Request $request, PerformanceReview $review): void
    {
        $user = $request->user();
        if (RoleAuthorization::isGlobalHrOrAdmin($user)) {
            return;
        }

        $employee = $user->staff_id
            ? Employee::query()->where('staff_id', $user->staff_id)->first()
            : null;
        if ($employee && $employee->id === $review->reviewer_id) {
            return;
        }

        if ($employee && RoleAuthorization::isSupervisor($user)) {
            $subtree = app(EmployeeHierarchyService::class)->getSubtreeEmployeeIds((int) $employee->id);
            if (in_array((int) $review->employee_id, $subtree, true)) {
                return;
            }
        }

        abort(403, 'You are not assigned as the reviewer for this appraisal.');
    }

    private function authorizeAdminOrHr(Request $request): void
    {
        abort_unless(RoleAuthorization::isGlobalHrOrAdmin($request->user()), 403, 'Unauthorized.');
    }

    private function presentKpi(Kpi $kpi): array
    {
        return [
            'id' => (int) $kpi->id,
            'jobTitleId' => $kpi->job_title_id ? (int) $kpi->job_title_id : null,
            'jobTitleName' => $kpi->jobTitle?->title ?? null,
            'jobTitle' => $kpi->jobTitle ? [
                'id' => (int) $kpi->jobTitle->id,
                'name' => $kpi->jobTitle->title,
            ] : null,
            'indicator' => $kpi->indicator,
            'minRating' => (float) $kpi->min_rating,
            'maxRating' => (float) $kpi->max_rating,
            'weight' => (float) $kpi->weight,
            'isActive' => (bool) $kpi->is_active,
            'version' => (int) ($kpi->version ?? 1),
            'updatedAt' => $kpi->updated_at?->toISOString(),
        ];
    }

    private function presentReview(PerformanceReview $review): array
    {
        return [
            'id' => (int) $review->id,
            'employeeId' => (int) $review->employee_id,
            'employeeName' => $review->employee?->full_name,
            'employeeStaffId' => $review->employee?->staff_id,
            'reviewerId' => $review->reviewer_id ? (int) $review->reviewer_id : null,
            'reviewerName' => $review->reviewer?->full_name,
            'reviewPeriodStart' => $review->review_period_start->format('Y-m-d'),
            'reviewPeriodEnd' => $review->review_period_end->format('Y-m-d'),
            'dueDate' => $review->due_date->format('Y-m-d'),
            'status' => $review->status,
            'finalRating' => $review->final_rating !== null ? (float) $review->final_rating : null,
            'employeeComments' => $review->employee_comments,
            'reviewerComments' => $review->reviewer_comments,
            'completedAt' => $review->completed_at?->toISOString(),
            'version' => (int) ($review->version ?? 1),
            'updatedAt' => $review->updated_at?->toISOString(),
            'ratings' => $review->relationLoaded('ratings') ? $review->ratings->map(fn (ReviewRating $r) => [
                'id' => (int) $r->id,
                'kpiId' => $r->kpi_id ? (int) $r->kpi_id : null,
                'kpiTitle' => $r->kpi_title,
                'weight' => (float) ($r->weight ?? ($r->kpi?->weight ?? 100)),
                'minRating' => (float) ($r->kpi?->min_rating ?? 1.0),
                'maxRating' => (float) ($r->kpi?->max_rating ?? 5.0),
                'rating' => (float) $r->rating,
                'comment' => $r->comment,
            ])->values() : [],
        ];
    }
}
