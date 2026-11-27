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
        $user = $this->authorizeReportsAccess($request);
        $empQuery = $this->scopedEmployeesQuery($user);

        $totalActive = (clone $empQuery)->where('status', 'Active')->count();
        $totalEmployees = (clone $empQuery)->count();

        // Entity breakdown
        $byEntity = (clone $empQuery)
            ->select('entity_id', DB::raw('count(*) as count'))
            ->groupBy('entity_id')
            ->pluck('count', 'entity_id');

        // Department breakdown
        $byDepartment = (clone $empQuery)
            ->join('departments', 'employees.department_id', '=', 'departments.id')
            ->select('departments.name as department_name', DB::raw('count(*) as count'))
            ->groupBy('departments.name')
            ->pluck('count', 'department_name');

        // Gender breakdown
        $byGender = (clone $empQuery)
            ->select('gender', DB::raw('count(*) as count'))
            ->groupBy('gender')
            ->pluck('count', 'gender');

        // Employment type breakdown
        $byEmploymentType = (clone $empQuery)
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
        $user = $this->authorizeReportsAccess($request);
        $year = (int) $request->input('year', date('Y'));
        $scopedIds = $this->scopedEmployeeIds($user);

        // Totals across leave balances
        $balanceQuery = EmployeeLeaveBalance::query()->where('year', $year);
        if ($scopedIds !== null) {
            $balanceQuery->whereIn('employee_id', $scopedIds);
        }
        $balanceSummary = $balanceQuery
            ->select(
                DB::raw('SUM(total_days) as total_entitled'),
                DB::raw('SUM(used_days) as total_used'),
                DB::raw('SUM(pending_days) as total_pending'),
                DB::raw('SUM(remaining_days) as total_remaining')
            )
            ->first();

        // Breakdown by category
        $byCategoryQuery = EmployeeLeaveBalance::query()
            ->join('leave_categories', 'employee_leave_balances.leave_category_id', '=', 'leave_categories.id')
            ->where('employee_leave_balances.year', $year);
        if ($scopedIds !== null) {
            $byCategoryQuery->whereIn('employee_leave_balances.employee_id', $scopedIds);
        }
        $byCategory = $byCategoryQuery
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
        $leaveReqQuery = LeaveRequest::query()->whereYear('start_date', $year);
        if ($scopedIds !== null) {
            $leaveReqQuery->whereIn('employee_id', $scopedIds);
        }
        $requestsByStatus = $leaveReqQuery
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
        $user = $this->authorizeReportsAccess($request);
        $scopedIds = $this->scopedEmployeeIds($user);

        $query = AttendanceRecord::query();
        if ($scopedIds !== null) {
            $query->whereIn('employee_id', $scopedIds);
        }
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

    private function authorizeReportsAccess(Request $request): \App\Models\User
    {
        $user = $request->user();
        abort_unless($user !== null, 401);
        abort_unless(
            RoleAuthorization::isGlobalHrOrAdmin($user) || RoleAuthorization::isSupervisor($user),
            403,
            'Only HR, Admin, Business Head, and Department Head roles can access HR reporting.'
        );

        return $user;
    }

    /** @return \Illuminate\Database\Eloquent\Builder<Employee> */
    private function scopedEmployeesQuery(\App\Models\User $user): \Illuminate\Database\Eloquent\Builder
    {
        if (RoleAuthorization::isGlobalHrOrAdmin($user)) {
            return Employee::query();
        }

        return RoleAuthorization::visibleEmployees($user);
    }

    /** @return array<int, int>|null */
    private function scopedEmployeeIds(\App\Models\User $user): ?array
    {
        if (RoleAuthorization::isGlobalHrOrAdmin($user)) {
            return null;
        }

        return RoleAuthorization::visibleEmployees($user)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }
}
