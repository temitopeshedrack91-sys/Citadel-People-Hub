<?php

namespace App\Services;

use App\Models\Employee;
use App\Repositories\EmployeeRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Business logic for Phase 1 employee reporting hierarchy.
 *
 * Enforces acyclic reporting chains, resolves upward supervisor chains,
 * and computes downward direct reports and reporting subtrees.
 */
class EmployeeHierarchyService
{
    public function __construct(
        private readonly EmployeeRepository $employees
    ) {}

    /**
     * Ensure assigning $managerId as supervisor for $employeeId does not form a cycle.
     *
     * @throws ValidationException
     */
    public function assertNoCycle(?int $employeeId, ?int $managerId): void
    {
        if ($managerId === null) {
            return;
        }

        if ($employeeId !== null && $employeeId === $managerId) {
            throw ValidationException::withMessages([
                'managerId' => ['An employee cannot be assigned as their own supervisor.'],
            ]);
        }

        $supervisor = $this->employees->findById($managerId);
        if ($supervisor === null) {
            throw ValidationException::withMessages([
                'managerId' => ['The selected supervisor does not exist.'],
            ]);
        }

        if ($employeeId === null) {
            return;
        }

        $visited = [$employeeId => true];
        $currentId = $supervisor->manager_id;
        $depth = 0;

        while ($currentId !== null && $currentId !== '' && is_numeric($currentId) && $depth < 200) {
            $ancestorId = (int) $currentId;
            if ($ancestorId === $employeeId) {
                throw ValidationException::withMessages([
                    'managerId' => ['Circular reporting lines are not allowed: an employee cannot become their own ancestor.'],
                ]);
            }

            if (isset($visited[$ancestorId])) {
                break;
            }
            $visited[$ancestorId] = true;

            $ancestor = $this->employees->findById($ancestorId);
            if ($ancestor === null) {
                break;
            }

            $currentId = $ancestor->manager_id;
            $depth++;
        }
    }

    /**
     * Walk upward from the given employee to the top of the reporting chain.
     * Ordered from immediate direct supervisor to highest-level ancestor.
     *
     * @return array<int, Employee>
     */
    public function getSupervisorChain(Employee $employee): array
    {
        $chain = [];
        $visited = [(int) $employee->id => true];
        $currentManagerId = $employee->manager_id;
        $depth = 0;

        while ($currentManagerId !== null && $currentManagerId !== '' && is_numeric($currentManagerId) && $depth < 100) {
            $managerIdInt = (int) $currentManagerId;
            if (isset($visited[$managerIdInt])) {
                break;
            }
            $visited[$managerIdInt] = true;

            $supervisor = $this->employees->findById($managerIdInt, ['entity', 'department']);
            if ($supervisor === null) {
                break;
            }

            $chain[] = $supervisor;
            $currentManagerId = $supervisor->manager_id;
            $depth++;
        }

        return $chain;
    }

    /** @return array<int, int> */
    public function getAncestorEmployeeIds(int $employeeId): array
    {
        $employee = $this->employees->findById($employeeId);
        if ($employee === null) {
            return [];
        }

        return array_map(fn (Employee $emp) => (int) $emp->id, $this->getSupervisorChain($employee));
    }

    /** @return Collection<int, Employee> */
    public function getDirectReports(Employee $employee): Collection
    {
        return $this->employees->getDirectReports((int) $employee->id);
    }

    /**
     * Collect all employee IDs reporting directly or indirectly under $rootEmployeeId.
     *
     * @return array<int, int>
     */
    public function getSubtreeEmployeeIds(int $rootEmployeeId): array
    {
        $edges = $this->employees->allHierarchyEdges();
        $childrenByManager = [];
        foreach ($edges as $edge) {
            if ($edge['manager_id'] !== null && is_numeric($edge['manager_id'])) {
                $childrenByManager[(int) $edge['manager_id']][] = $edge['id'];
            }
        }

        $result = [];
        $visited = [$rootEmployeeId => true];
        $queue = $childrenByManager[$rootEmployeeId] ?? [];

        while ($queue !== []) {
            $childId = array_shift($queue);
            if (isset($visited[$childId])) {
                continue;
            }
            $visited[$childId] = true;
            $result[] = $childId;

            foreach ($childrenByManager[$childId] ?? [] as $grandChildId) {
                if (! isset($visited[$grandChildId])) {
                    $queue[] = $grandChildId;
                }
            }
        }

        return $result;
    }
}
