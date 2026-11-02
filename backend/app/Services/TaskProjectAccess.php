<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Support\RoleAuthorization;
use Illuminate\Database\Eloquent\Builder;

class TaskProjectAccess
{
    /** @return Builder<Project> */
    public function visibleProjects(User $user): Builder
    {
        $query = Project::query();
        $role = strtoupper(trim($user->role ?? ''));

        if ($this->isGlobalManager($user)) {
            return $query;
        }

        if (in_array($role, ['BUSINESS_HEAD', 'SYSTEM_ADMIN'], true) && $user->entity_id !== null) {
            return $query->whereHas('department', fn (Builder $departmentQuery) => $departmentQuery->where('entity_id', $user->entity_id));
        }

        if (in_array($role, ['DEPARTMENT_HEAD', 'HR_STAFF', 'ADMIN'], true) && $user->department_id !== null) {
            return $query->where('department_id', $user->department_id);
        }

        if (RoleAuthorization::canonical($user->role) === 'EMPLOYEE') {
            $employeeId = $this->employeeIdFor($user);

            return $employeeId === null
                ? $query->whereRaw('1 = 0')
                : $query->whereHas('members', fn (Builder $employeeQuery) => $employeeQuery->whereKey($employeeId));
        }

        return $query->whereRaw('1 = 0');
    }

    /** @return Builder<Task> */
    public function visibleTasks(User $user): Builder
    {
        $query = Task::query();
        $role = strtoupper(trim($user->role ?? ''));

        if ($this->isGlobalManager($user)) {
            return $query;
        }

        if (RoleAuthorization::canonical($user->role) === 'EMPLOYEE') {
            $employee = $user->staff_id === null
                ? null
                : Employee::query()->where('staff_id', $user->staff_id)->first(['id', 'entity_id']);

            return $employee === null
                ? $query->whereRaw('1 = 0')
                : $query->where('assigned_to_employee_id', $employee->id)
                    ->where(function (Builder $departmentScopeQuery) use ($employee): void {
                        $departmentScopeQuery->whereNull('department_id')
                            ->orWhereHas('department', fn (Builder $departmentQuery) => $departmentQuery->where('entity_id', $employee->entity_id));
                    })
                    ->where(function (Builder $projectScopeQuery) use ($employee): void {
                        $projectScopeQuery->whereNull('project_id')
                            ->orWhereHas('project.department', fn (Builder $departmentQuery) => $departmentQuery->where('entity_id', $employee->entity_id));
                    });
        }

        if (in_array($role, ['BUSINESS_HEAD', 'SYSTEM_ADMIN'], true) && $user->entity_id !== null) {
            return $query->where(function (Builder $taskQuery) use ($user): void {
                $taskQuery->where(function (Builder $directDepartmentQuery) use ($user): void {
                    $directDepartmentQuery->whereNotNull('department_id')
                        ->whereHas('department', fn (Builder $departmentQuery) => $departmentQuery->where('entity_id', $user->entity_id))
                        ->where(function (Builder $projectQuery) use ($user): void {
                            $projectQuery->whereNull('project_id')
                                ->orWhereHas('project.department', fn (Builder $departmentQuery) => $departmentQuery->where('entity_id', $user->entity_id));
                        });
                })->orWhere(function (Builder $projectDepartmentQuery) use ($user): void {
                    $projectDepartmentQuery->whereNull('department_id')
                        ->whereHas('project.department', fn (Builder $departmentQuery) => $departmentQuery->where('entity_id', $user->entity_id));
                });
            });
        }

        if (in_array($role, ['DEPARTMENT_HEAD'], true) && $user->department_id !== null) {
            return $query->where(function (Builder $taskQuery) use ($user): void {
                $taskQuery->where('department_id', $user->department_id)
                    ->where(function (Builder $projectQuery) use ($user): void {
                        $projectQuery->whereNull('project_id')
                            ->orWhereHas('project', fn (Builder $relatedProjectQuery) => $relatedProjectQuery->where('department_id', $user->department_id));
                    })
                    ->orWhere(function (Builder $projectDepartmentQuery) use ($user): void {
                        $projectDepartmentQuery->whereNull('department_id')
                            ->whereHas('project', fn (Builder $projectQuery) => $projectQuery->where('department_id', $user->department_id));
                    });
            });
        }

        return $query->whereRaw('1 = 0');
    }

    public function isGlobalManager(User $user): bool
    {
        $role = strtoupper(trim($user->role ?? ''));

        return in_array($role, ['PCCM_SUPER_ADMIN', 'HR_STAFF', 'HR_MANAGER', 'ADMIN'], true);
    }

    public function canManageDepartment(User $user, ?int $departmentId): bool
    {
        if ($this->isGlobalManager($user)) {
            return true;
        }

        if ($departmentId === null) {
            return false;
        }

        $role = strtoupper(trim($user->role ?? ''));

        if (in_array($role, ['DEPARTMENT_HEAD'], true)) {
            return $user->department_id !== null && $departmentId === (int) $user->department_id;
        }

        if (in_array($role, ['BUSINESS_HEAD', 'SYSTEM_ADMIN'], true) && $user->entity_id !== null) {
            return Department::query()->whereKey($departmentId)->where('entity_id', $user->entity_id)->exists();
        }

        return false;
    }

    public function canViewProject(User $user, Project $project): bool
    {
        return $this->visibleProjects($user)->whereKey($project->getKey())->exists();
    }

    public function canManageProject(User $user, Project $project): bool
    {
        return $this->canManageDepartment($user, $project->department_id === null ? null : (int) $project->department_id);
    }

    public function canViewTask(User $user, Task $task): bool
    {
        return $this->visibleTasks($user)->whereKey($task->getKey())->exists();
    }

    public function canManageTask(User $user, Task $task): bool
    {
        if ($this->isGlobalManager($user)) {
            return true;
        }

        return $this->canManageDepartment($user, $this->effectiveDepartmentId($task));
    }

    public function canUpdateTaskStatus(User $user, Task $task): bool
    {
        if ($this->canManageTask($user, $task)) {
            return true;
        }

        $employeeId = $this->employeeIdFor($user);

        return RoleAuthorization::canonical($user->role) === 'EMPLOYEE'
            && $employeeId !== null
            && (int) $task->assigned_to_employee_id === $employeeId;
    }

    public function canAssignEmployee(User $user, Employee $employee, ?int $departmentId): bool
    {
        if ($departmentId === null || ! $this->canManageDepartment($user, $departmentId)) {
            return false;
        }

        $departmentEntityId = Department::query()->whereKey($departmentId)->value('entity_id');
        if ($departmentEntityId === null || (string) $employee->entity_id !== (string) $departmentEntityId) {
            return false;
        }

        return RoleAuthorization::canonical($user->role) !== 'DEPARTMENT_HEAD' || (int) $employee->department_id === (int) $user->department_id;
    }

    public function employeeIdFor(User $user): ?int
    {
        if ($user->staff_id === null) {
            return null;
        }

        $employeeId = Employee::query()->where('staff_id', $user->staff_id)->value('id');

        return $employeeId === null ? null : (int) $employeeId;
    }

    private function effectiveDepartmentId(Task $task): ?int
    {
        if ($task->department_id !== null) {
            return (int) $task->department_id;
        }

        $departmentId = $task->project()->value('department_id');

        return $departmentId === null ? null : (int) $departmentId;
    }
}
