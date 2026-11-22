<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\JobTitle;
use App\Models\Kpi;
use App\Models\PerformanceReview;
use App\Models\ReviewRating;
use App\Support\AuditLogger;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Manages Key Performance Indicators (KPIs), Performance Appraisals, and Employee Ratings.
 * Replicates the Review Workflow and KPI Scoring rules of OrangeHRM Performance Plugin.
 */
class PerformanceController extends Controller
{
    // ==========================================
    // KPI Management
    // ==========================================

    public function kpis(Request $request): JsonResponse
    {
        $query = Kpi::query()->with('jobTitle');
        if ($request->filled('jobTitleId')) {
            $query->where('job_title_id', $request->input('jobTitleId'));
        }
        if ($request->boolean('activeOnly', true)) {
            $query->where('is_active', true);
        }

        return response()->json(['data' => $query->get()]);
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

        $kpi = DB::transaction(function () use ($request, $data) {
            $kpi = Kpi::create([
                'job_title_id' => $data['jobTitleId'] ?? null,
                'indicator' => $data['indicator'],
                'min_rating' => $data['minRating'] ?? 1.0,
                'max_rating' => $data['maxRating'] ?? 5.0,
                'weight' => $data['weight'] ?? 100.00,
                'is_active' => $data['isActive'] ?? true,
            ]);

            AuditLogger::record($request, 'Performance', 'Created KPI', (string) $kpi->id, $kpi->indicator, null, 'Active');

            return $kpi;
        });

        return response()->json(['data' => $kpi->load('jobTitle')], 201);
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
        ]);

        $min = $data['minRating'] ?? $kpi->min_rating;
        $max = $data['maxRating'] ?? $kpi->max_rating;
        if ((float) $max <= (float) $min) {
            abort(422, 'Maximum rating must be strictly greater than minimum rating.');
        }

        $kpi = DB::transaction(function () use ($request, $kpi, $data, $min, $max) {
            $kpi->update([
                'job_title_id' => array_key_exists('jobTitleId', $data) ? $data['jobTitleId'] : $kpi->job_title_id,
                'indicator' => $data['indicator'] ?? $kpi->indicator,
                'min_rating' => $min,
                'max_rating' => $max,
                'weight' => $data['weight'] ?? $kpi->weight,
                'is_active' => $data['isActive'] ?? $kpi->is_active,
            ]);

            AuditLogger::record($request, 'Performance', 'Updated KPI', (string) $kpi->id, $kpi->indicator, null, 'Updated');

            return $kpi;
        });

        return response()->json(['data' => $kpi->load('jobTitle')]);
    }

    public function destroyKpi(Request $request, Kpi $kpi): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        DB::transaction(function () use ($request, $kpi) {
            $indicator = $kpi->indicator;
            $kpi->delete();
            AuditLogger::record($request, 'Performance', 'Deleted KPI', (string) $kpi->id, $indicator, 'Active', 'Deleted');
        });

        return response()->json(['message' => 'KPI deleted successfully.']);
    }

    // ==========================================
    // Performance Review Workflow
    // ==========================================

    public function reviews(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = PerformanceReview::query()->with(['employee:id,staff_id,full_name,department_id,entity_id', 'reviewer:id,staff_id,full_name']);

        $role = RoleAuthorization::canonical($user->role);
        abort_unless(in_array($role, ['ADMIN', 'HR_STAFF', 'EMPLOYEE'], true), 403, 'Unauthorized.');

        if ($role === 'EMPLOYEE') {
            $employee = Employee::query()->where('staff_id', $user->staff_id)->first();
            if (! $employee) {
                return response()->json(['data' => []]);
            }
            $query->where(function ($q) use ($employee) {
                $q->where('employee_id', $employee->id)
                    ->orWhere('reviewer_id', $employee->id);
            });
        } elseif (strtoupper(trim($user->role)) === 'DEPARTMENT_HEAD') {
            $query->whereIn('employee_id', Employee::query()->select('id')->where('department_id', $user->department_id));
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
        $this->authorizeAdminOrHr($request);

        $data = $request->validate([
            'employeeId' => ['required', 'exists:employees,id'],
            'reviewerId' => ['required', 'exists:employees,id'],
            'reviewPeriodStart' => ['required', 'date_format:Y-m-d'],
            'reviewPeriodEnd' => ['required', 'date_format:Y-m-d', 'after_or_equal:reviewPeriodStart'],
            'dueDate' => ['required', 'date_format:Y-m-d', 'after_or_equal:reviewPeriodEnd'],
            'kpis' => ['sometimes', 'array'],
            'kpis.*.kpiId' => ['nullable', 'exists:kpis,id'],
            'kpis.*.title' => ['required_without:kpis.*.kpiId', 'string', 'max:250'],
        ]);

        $review = DB::transaction(function () use ($request, $data) {
            $user = $request->user();
            $review = PerformanceReview::create([
                'employee_id' => $data['employeeId'],
                'reviewer_id' => $data['reviewerId'],
                'creator_id' => $user->id,
                'review_period_start' => $data['reviewPeriodStart'],
                'review_period_end' => $data['reviewPeriodEnd'],
                'due_date' => $data['dueDate'],
                'status' => 'IN_PROGRESS',
            ]);

            if (! empty($data['kpis'])) {
                foreach ($data['kpis'] as $kpiItem) {
                    $title = $kpiItem['title'] ?? null;
                    if (empty($title) && ! empty($kpiItem['kpiId'])) {
                        $title = Kpi::query()->where('id', $kpiItem['kpiId'])->value('indicator') ?? 'KPI';
                    }
                    ReviewRating::create([
                        'performance_review_id' => $review->id,
                        'kpi_id' => $kpiItem['kpiId'] ?? null,
                        'kpi_title' => $title,
                        'rating' => 0,
                    ]);
                }
            }

            AuditLogger::record($request, 'Performance', 'Created Performance Review', (string) $review->id, "Review for Employee #{$data['employeeId']}", null, 'IN_PROGRESS');

            return $review;
        });

        return response()->json(['data' => $this->presentReview($review->load(['employee', 'reviewer', 'ratings']))], 201);
    }

    public function evaluateReview(Request $request, PerformanceReview $performanceReview): JsonResponse
    {
        $this->ensureCanEvaluateReview($request, $performanceReview);
        abort_unless(in_array($performanceReview->status, ['IN_PROGRESS', 'SUBMITTED'], true), 409, 'Only reviews In Progress or Submitted can be evaluated.');

        $data = $request->validate([
            'ratings' => ['required', 'array', 'min:1'],
            'ratings.*.kpiId' => ['nullable', 'exists:kpis,id'],
            'ratings.*.kpiTitle' => ['required', 'string', 'max:250'],
            'ratings.*.rating' => ['required', 'numeric', 'min:0', 'max:100'],
            'ratings.*.comment' => ['nullable', 'string', 'max:1000'],
            'reviewerComments' => ['nullable', 'string', 'max:2000'],
            'employeeComments' => ['nullable', 'string', 'max:2000'],
        ]);

        $updated = DB::transaction(function () use ($request, $performanceReview, $data) {
            $performanceReview->ratings()->delete();

            $totalScore = 0;
            $count = 0;
            $totalWeightedScore = 0;
            $totalWeight = 0;

            foreach ($data['ratings'] as $item) {
                $ratingVal = (float) $item['rating'];
                $kpi = ! empty($item['kpiId']) ? Kpi::query()->find($item['kpiId']) : null;
                $weight = (float) ($item['weight'] ?? ($kpi ? $kpi->weight : 100));

                // Validate against KPI bounds if KPI exists (OrangeHRM rating validation rule)
                if ($kpi && ($ratingVal < (float) $kpi->min_rating || $ratingVal > (float) $kpi->max_rating)) {
                    abort(422, "Rating for '{$kpi->indicator}' must be between {$kpi->min_rating} and {$kpi->max_rating}.");
                }

                ReviewRating::create([
                    'performance_review_id' => $performanceReview->id,
                    'kpi_id' => $item['kpiId'] ?? null,
                    'kpi_title' => $item['kpiTitle'],
                    'rating' => $ratingVal,
                    'comment' => $item['comment'] ?? null,
                ]);

                $totalScore += $ratingVal;
                $totalWeightedScore += ($ratingVal * $weight);
                $totalWeight += $weight;
                $count++;
            }

            // Calculate overall weighted performance score (or fallback to average)
            $finalRating = $totalWeight > 0
                ? round($totalWeightedScore / $totalWeight, 2)
                : ($count > 0 ? round($totalScore / $count, 2) : 0);

            $performanceReview->update([
                'status' => 'EVALUATED',
                'final_rating' => $finalRating,
                'reviewer_comments' => $data['reviewerComments'] ?? $performanceReview->reviewer_comments,
                'employee_comments' => $data['employeeComments'] ?? $performanceReview->employee_comments,
            ]);

            AuditLogger::record($request, 'Performance', 'Evaluated Performance Review', (string) $performanceReview->id, "Review #{$performanceReview->id}", 'IN_PROGRESS', 'EVALUATED');

            return $performanceReview;
        });

        return response()->json(['data' => $this->presentReview($updated->load(['employee', 'reviewer', 'ratings']))]);
    }

    public function approveReview(Request $request, PerformanceReview $performanceReview): JsonResponse
    {
        $this->authorizeAdminOrHr($request);
        abort_unless(in_array($performanceReview->status, ['EVALUATED', 'SUBMITTED'], true), 409, 'Only evaluated reviews can be formally approved.');

        $updated = DB::transaction(function () use ($request, $performanceReview) {
            $performanceReview->update([
                'status' => 'APPROVED',
                'completed_at' => now(),
            ]);

            AuditLogger::record($request, 'Performance', 'Approved Performance Review', (string) $performanceReview->id, "Review #{$performanceReview->id}", 'EVALUATED', 'APPROVED');

            return $performanceReview;
        });

        return response()->json(['data' => $this->presentReview($updated->load(['employee', 'reviewer', 'ratings']))]);
    }

    private function ensureCanAccessReview(Request $request, PerformanceReview $review): void
    {
        $user = $request->user();
        $role = RoleAuthorization::canonical($user->role);

        if (in_array($role, ['ADMIN', 'HR_STAFF'], true)) {
            return;
        }

        $employee = Employee::query()->where('staff_id', $user->staff_id)->first();
        if ($employee && ($employee->id === $review->employee_id || $employee->id === $review->reviewer_id)) {
            return;
        }

        abort(403, 'Unauthorized access to this performance review.');
    }

    private function ensureCanEvaluateReview(Request $request, PerformanceReview $review): void
    {
        $user = $request->user();
        $role = RoleAuthorization::canonical($user->role);

        if (in_array($role, ['ADMIN', 'HR_STAFF'], true)) {
            return;
        }

        $employee = Employee::query()->where('staff_id', $user->staff_id)->first();
        if ($employee && $employee->id === $review->reviewer_id) {
            return;
        }

        abort(403, 'You are not assigned as the reviewer for this appraisal.');
    }

    private function authorizeAdminOrHr(Request $request): void
    {
        $role = RoleAuthorization::canonical($request->user()->role);
        abort_unless(in_array($role, ['ADMIN', 'HR_STAFF'], true), 403, 'Unauthorized.');
    }

    private function presentReview(PerformanceReview $review): array
    {
        return [
            'id' => $review->id,
            'employeeId' => $review->employee_id,
            'employeeName' => $review->employee?->full_name,
            'employeeStaffId' => $review->employee?->staff_id,
            'reviewerId' => $review->reviewer_id,
            'reviewerName' => $review->reviewer?->full_name,
            'reviewPeriodStart' => $review->review_period_start->format('Y-m-d'),
            'reviewPeriodEnd' => $review->review_period_end->format('Y-m-d'),
            'dueDate' => $review->due_date->format('Y-m-d'),
            'status' => $review->status,
            'finalRating' => $review->final_rating !== null ? (float) $review->final_rating : null,
            'employeeComments' => $review->employee_comments,
            'reviewerComments' => $review->reviewer_comments,
            'completedAt' => $review->completed_at?->toISOString(),
            'ratings' => $review->relationLoaded('ratings') ? $review->ratings->map(fn (ReviewRating $r) => [
                'id' => $r->id,
                'kpiId' => $r->kpi_id,
                'kpiTitle' => $r->kpi_title,
                'rating' => (float) $r->rating,
                'comment' => $r->comment,
            ]) : [],
        ];
    }
}
