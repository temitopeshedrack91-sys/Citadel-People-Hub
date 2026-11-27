<?php

namespace App\Repositories;

use App\Models\EmployeeLeaveBalance;
use App\Models\LeaveCategory;
use App\Models\LeavePolicy;
use App\Models\LeaveRequest;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data access layer for leave requests, leave categories, policies, and balances.
 */
class LeaveRepository
{
    public function hasOverlappingActiveLeave(int $employeeId, string $startDate, string $endDate, ?int $excludeLeaveId = null): bool
    {
        return LeaveRequest::query()
            ->where('employee_id', $employeeId)
            ->whereNotIn('status', ['Cancelled', 'Rejected', 'Requires Correction'])
            ->when($excludeLeaveId !== null, fn ($q) => $q->whereKeyNot($excludeLeaveId))
            ->where(function ($query) use ($startDate, $endDate) {
                $query->where('start_date', '<=', $endDate)
                    ->where('end_date', '>=', $startDate);
            })
            ->exists();
    }

    public function findCategoryByName(string $name): ?LeaveCategory
    {
        return LeaveCategory::query()->where('name', $name)->first();
    }

    public function findLockedBalance(int $employeeId, int $leaveCategoryId, int $year): ?EmployeeLeaveBalance
    {
        return EmployeeLeaveBalance::query()
            ->where('employee_id', $employeeId)
            ->where('leave_category_id', $leaveCategoryId)
            ->where('year', $year)
            ->lockForUpdate()
            ->first();
    }

    public function findOrProvisionBalance(int $employeeId, int $leaveCategoryId, int $year): ?EmployeeLeaveBalance
    {
        $balance = $this->findLockedBalance($employeeId, $leaveCategoryId, $year);
        if ($balance !== null) {
            return $balance;
        }

        $policy = LeavePolicy::query()
            ->where('leave_category_id', $leaveCategoryId)
            ->where('is_active', true)
            ->orderByDesc('effective_year')
            ->first();

        if ($policy === null) {
            return null;
        }

        return EmployeeLeaveBalance::create([
            'employee_id' => $employeeId,
            'leave_category_id' => $leaveCategoryId,
            'year' => $year,
            'total_days' => (float) $policy->days_allowed,
            'used_days' => 0,
            'pending_days' => 0,
            'remaining_days' => (float) $policy->days_allowed,
        ]);
    }

    /** @return Collection<int, LeaveRequest> */
    public function listScopedRequests(?array $allowedEmployeeIds, int $limit = 500, ?int $viewerEmployeeId = null): Collection
    {
        $query = LeaveRequest::query()->with(['employee.supervisor']);

        if ($allowedEmployeeIds !== null) {
            if ($allowedEmployeeIds === [] && $viewerEmployeeId === null) {
                $query->whereRaw('1 = 0');
            } else {
                $query->where(function ($sub) use ($allowedEmployeeIds, $viewerEmployeeId) {
                    if ($allowedEmployeeIds !== []) {
                        $sub->whereIn('employee_id', $allowedEmployeeIds);
                    }
                    if ($viewerEmployeeId !== null) {
                        $sub->orWhere('manager_id', (string) $viewerEmployeeId);
                    }
                });
            }
        }

        return $query->latest('applied_date')->limit($limit)->get();
    }

    /** @return Collection<int, LeaveRequest> */
    public function listCalendarLeaves(?array $allowedEmployeeIds, ?string $startDate = null, ?string $endDate = null): Collection
    {
        $query = LeaveRequest::query()
            ->with(['employee'])
            ->whereNotIn('status', ['Rejected', 'Cancelled', 'Requires Correction']);

        if ($allowedEmployeeIds !== null) {
            if ($allowedEmployeeIds === []) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('employee_id', $allowedEmployeeIds);
            }
        }

        if ($startDate !== null) {
            $query->where('end_date', '>=', $startDate);
        }

        if ($endDate !== null) {
            $query->where('start_date', '<=', $endDate);
        }

        return $query->orderBy('start_date')->limit(500)->get();
    }
}
