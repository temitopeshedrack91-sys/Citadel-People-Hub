<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Candidate;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeLeaveBalance;
use App\Models\Entity;
use App\Models\JobVacancy;
use App\Models\LeaveCategory;
use App\Models\LeaveRequest;
use App\Support\RoleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Enterprise HR Reporting and Analytics Engine.
 * Provides database aggregations for workforce headcount, leave utilization,
 * attendance patterns, and candidate talent pipelines.
 */
class ReportController extends Controller
{
    /**
     * Workforce demographics, headcount by entity/dept, gender distribution, and service tenure.
     *
     * GET /api/v1/reports/workforce
     */
    public function workforce(Request $request): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $totalActive = Employee::query()->where('status', 'Active')->count();
        $totalEmployees = Employee::query()->count();

        // Entity breakdown
        $byEntity = Employee::query()
            ->select('entity_id', DB::raw('count(*) as count'))
            ->groupBy('entity_id')
            ->pluck('count', 'entity_id');

        // Department breakdown
        $byDepartment = Employee::query()
            ->join('departments', 'employees.department_id', '=', 'departments.id')
            ->select('departments.name as department_name', DB::raw('count(*) as count'))
            ->groupBy('departments.name')
            ->pluck('count', 'department_name');

        // Gender breakdown
        $byGender = Employee::query()
            ->select('gender', DB::raw('count(*) as count'))
            ->groupBy('gender')
            ->pluck('count', 'gender');

        // Employment type breakdown
        $byEmploymentType = Employee::query()
            ->select('employment_type', DB::raw('count(*) as count'))
            ->groupBy('employment_type')
            ->pluck('count', 'employment_type');

        return response()->json([
            'data' => [
                'totalEmployees' => $totalEmployees,
                'totalActive' => $totalActive,
                'byEntity' => $byEntity,
                'byDepartment' => $byDepartment,
                'byGender' => $byGender,
                'byEmploymentType' => $byEmploymentType,
            ],
        ]);
    }

    /**
     * Aggregated leave utilization and category consumption.
     *
     * GET /api/v1/reports/leave-utilization
     */
    public function leaveUtilization(Request $request): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $year = (int) $request->input('year', date('Y'));

        // Totals across leave balances
        $balanceSummary = EmployeeLeaveBalance::query()
            ->where('year', $year)
            ->select(
                DB::raw('SUM(total_days) as total_entitled'),
                DB::raw('SUM(used_days) as total_used'),
                DB::raw('SUM(pending_days) as total_pending'),
                DB::raw('SUM(remaining_days) as total_remaining')
            )
            ->first();

        // Breakdown by category
        $byCategory = EmployeeLeaveBalance::query()
            ->join('leave_categories', 'employee_leave_balances.leave_category_id', '=', 'leave_categories.id')
            ->where('employee_leave_balances.year', $year)
            ->select(
                'leave_categories.name as category_name',
                DB::raw('SUM(employee_leave_balances.total_days) as entitled'),
                DB::raw('SUM(employee_leave_balances.used_days) as used'),
                DB::raw('SUM(employee_leave_balances.pending_days) as pending'),
                DB::raw('SUM(employee_leave_balances.remaining_days) as remaining')
            )
            ->groupBy('leave_categories.name')
            ->get();

        // Leave requests status count for year
        $requestsByStatus = LeaveRequest::query()
            ->whereYear('start_date', $year)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        return response()->json([
            'data' => [
                'year' => $year,
                'summary' => [
                    'totalEntitled' => (float) ($balanceSummary->total_entitled ?? 0),
                    'totalUsed' => (float) ($balanceSummary->total_used ?? 0),
                    'totalPending' => (float) ($balanceSummary->total_pending ?? 0),
                    'totalRemaining' => (float) ($balanceSummary->total_remaining ?? 0),
                ],
                'byCategory' => $byCategory,
                'requestsByStatus' => $requestsByStatus,
            ],
        ]);
    }

    /**
     * Aggregated attendance, punctuality, and hours worked.
     *
     * GET /api/v1/reports/attendance-summary
     */
    public function attendanceSummary(Request $request): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $query = AttendanceRecord::query();
        if ($request->filled('startDate')) {
            $query->whereDate('date', '>=', $request->input('startDate'));
        }
        if ($request->filled('endDate')) {
            $query->whereDate('date', '<=', $request->input('endDate'));
        }

        $totalRecords = (clone $query)->count();
        $statusBreakdown = (clone $query)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $totalHoursWorked = (clone $query)->sum('duration_hours');
        $averageHours = $totalRecords > 0 ? round($totalHoursWorked / $totalRecords, 2) : 0;

        return response()->json([
            'data' => [
                'totalAttendanceLogs' => $totalRecords,
                'statusBreakdown' => $statusBreakdown,
                'totalHoursWorked' => (float) $totalHoursWorked,
                'averageHoursPerLog' => $averageHours,
            ],
        ]);
    }

    /**
     * Recruitment pipeline metrics, candidate status funnel, and active openings.
     *
     * GET /api/v1/reports/recruitment-summary
     */
    public function recruitmentSummary(Request $request): JsonResponse
    {
        $this->authorizeAdminOrHr($request);

        $activeVacancies = JobVacancy::query()->where('status', 'Active')->count();
        $totalVacancies = JobVacancy::query()->count();
        $totalCandidates = Candidate::query()->count();

        $candidatesByStatus = Candidate::query()
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        return response()->json([
            'data' => [
                'activeVacancies' => $activeVacancies,
                'totalVacancies' => $totalVacancies,
                'totalCandidates' => $totalCandidates,
                'funnel' => $candidatesByStatus,
            ],
        ]);
    }

    private function authorizeAdminOrHr(Request $request): void
    {
        abort_unless(RoleAuthorization::isGlobalHrOrAdmin($request->user()), 403, 'Only HR and Admin users can access enterprise HR reporting.');
    }
}
