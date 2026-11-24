<?php

namespace App\Repositories;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data access layer for employee master records and reporting lines.
 */
class EmployeeRepository
{
    public function findById(int|string $id, array $relations = []): ?Employee
    {
        if (! is_numeric($id)) {
            return null;
        }

        $query = Employee::query();
        if ($relations !== []) {
            $query->with($relations);
        }

        return $query->find((int) $id);
    }

    public function findByStaffId(string $staffId, array $relations = []): ?Employee
    {
        $query = Employee::query()->where('staff_id', $staffId);
        if ($relations !== []) {
            $query->with($relations);
        }

        return $query->first();
    }

    public function hasDirectReports(int $employeeId): bool
    {
        return Employee::query()
            ->where('manager_id', (string) $employeeId)
            ->exists();
    }

    /** @return Collection<int, Employee> */
    public function getDirectReports(int $employeeId): Collection
    {
        return Employee::query()
            ->with(['entity', 'department'])
            ->where('manager_id', (string) $employeeId)
            ->orderBy('full_name')
            ->get();
    }

    /** @return array<int, array{id: int, manager_id: ?string}> */
    public function allHierarchyEdges(): array
    {
        return Employee::query()
            ->select(['id', 'manager_id'])
            ->get()
            ->map(fn (Employee $emp) => [
                'id' => (int) $emp->id,
                'manager_id' => $emp->manager_id !== null && $emp->manager_id !== '' ? (string) $emp->manager_id : null,
            ])
            ->all();
    }

    /** @return Builder<Employee> */
    public function applyDirectoryFilters(Builder $query, ?string $entityId, mixed $departmentId, ?string $search): Builder
    {
        if ($entityId !== null && $entityId !== '') {
            $normEntity = \App\Models\Entity::normalizeEntityId($entityId);
            if ($normEntity) {
                $query->where('entity_id', $normEntity);
            }
        }

        if ($departmentId !== null && $departmentId !== '') {
            $normDept = \App\Models\Department::normalizeDepartmentId($departmentId);
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
