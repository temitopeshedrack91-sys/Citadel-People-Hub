<?php

namespace App\Repositories;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Entity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data access layer for employees and reporting hierarchy edges.
 */
class EmployeeRepository
{
    public function findById(int|string $id, array $with = []): ?Employee
    {
        if (! is_numeric($id)) {
            return null;
        }

        return Employee::query()->with($with)->whereKey((int) $id)->first();
    }

    public function findByStaffId(string $staffId, array $with = []): ?Employee
    {
        return Employee::query()->with($with)->where('staff_id', $staffId)->first();
    }

    /** @return Collection<int, Employee> */
    public function getDirectReports(int $managerEmployeeId): Collection
    {
        return Employee::query()
            ->with(['entity', 'department'])
            ->where('manager_id', (string) $managerEmployeeId)
            ->orderBy('full_name')
            ->get();
    }

    /**
     * Fetch all (id, manager_id) pairs for in-memory cycle/subtree graph resolution.
     *
     * @return array<int, array{id: int, manager_id: ?string}>
     */
    public function allHierarchyEdges(): array
    {
        return Employee::query()
            ->select(['id', 'manager_id'])
            ->get()
            ->map(fn (Employee $emp) => [
                'id' => (int) $emp->id,
                'manager_id' => $emp->manager_id !== null ? (string) $emp->manager_id : null,
            ])
            ->all();
    }

    public function applyDirectoryFilters(Builder $query, ?string $entityId, mixed $departmentId, ?string $search): Builder
    {
        if ($entityId !== null && $entityId !== '') {
            $normEntity = Entity::normalizeEntityId($entityId);
            if ($normEntity) {
                $query->where('entity_id', $normEntity);
            }
        }

        if ($departmentId !== null && $departmentId !== '') {
            $normDept = Department::normalizeDepartmentId($departmentId);
            if ($normDept) {
                $query->where('department_id', $normDept);
            }
        }

        if ($search !== null && trim($search) !== '') {
            $term = trim($search);
            $query->where(function (Builder $builder) use ($term) {
                $builder->where('full_name', 'like', "%{$term}%")
                    ->orWhere('staff_id', 'like', "%{$term}%")
                    ->orWhere('job_title', 'like', "%{$term}%");
            });
        }

        return $query;
    }
}
