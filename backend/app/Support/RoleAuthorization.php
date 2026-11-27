<?php

namespace App\Support;

use App\Models\Employee;
use App\Models\User;
use App\Services\EmployeeHierarchyService;
use Illuminate\Database\Eloquent\Builder;

/**
 * Centralized server-side RBAC and organizational/hierarchy scoping.
 *
 * Enforces strict separation between:
 * - Global HR / Admin roles (all employees, all leave stages, all reporting tools)
 * - Manager / Supervisor roles (own profile + reporting team from Phase 1 hierarchy; NO HR reports or cross-team access)
 * - Employee self-service roles (own profile, leave balance, leave history)
 * - Read-only Viewer roles
 */
class RoleAuthorization
{
    public static function canonical(?string $role): ?string
    {
        return match (strtoupper(trim($role ?? ''))) {
            'ADMIN', 'SYSTEM_ADMIN', 'SYSADMIN', 'SUPER_ADMIN' => 'ADMIN',
            'HR_STAFF', 'HR', 'HR_MANAGER', 'PCCM_SUPER_ADMIN' => 'HR_STAFF',
            'MANAGER', 'BUSINESS_HEAD', 'DEPARTMENT_HEAD' => 'MANAGER',
            'EMPLOYEE', 'STAFF', 'USER' => 'EMPLOYEE',
            'VIEWER', 'AUDITOR', 'READONLY', 'GUEST' => 'VIEWER',
            default => null,
        };
    }

    /**
     * Returns true strictly for organization-wide HR and Admin roles.
     * Explicitly excludes line managers, DEPARTMENT_HEAD, BUSINESS_HEAD, EMPLOYEE, and VIEWER.
     */
    public static function isGlobalHrOrAdmin(User $user): bool
    {
        return in_array(strtoupper(trim($user->role ?? '')), [
            'ADMIN',
            'SYSTEM_ADMIN',
            'SYSADMIN',
            'SUPER_ADMIN',
            'HR_STAFF',
            'HR',
            'HR_MANAGER',
            'PCCM_SUPER_ADMIN',
        ], true);
    }

    public static function isExplicitManagerRole(User $user): bool
    {
        return in_array(strtoupper(trim($user->role ?? '')), [
            'MANAGER',
            'DEPARTMENT_HEAD',
            'BUSINESS_HEAD',
        ], true);
    }

    /**
     * A user acts as a manager if they hold a manager role OR have direct reports in Phase 1 hierarchy.
     */
    public static function isSupervisor(User $user): bool
    {
        if (self::isGlobalHrOrAdmin($user)) {
            return false;
        }

        if (self::isExplicitManagerRole($user)) {
            return true;
        }

        if (! $user->staff_id) {
            return false;
        }

        $employee = Employee::query()->where('staff_id', $user->staff_id)->first();
        if ($employee === null) {
            return false;
        }

        return Employee::query()->where('manager_id', (string) $employee->id)->exists();
    }

    public static function effectiveDashboardRole(User $user): string
    {
        if (self::isGlobalHrOrAdmin($user)) {
            return 'HR';
        }
        if (self::isSupervisor($user)) {
            return 'MANAGER';
        }
        if (self::canonical($user->role) === 'VIEWER') {
            return 'VIEWER';
        }

        return 'EMPLOYEE';
    }

    public static function canManageEmployeeRecords(User $user): bool
    {
        return self::isGlobalHrOrAdmin($user)
            || in_array(strtoupper(trim($user->role ?? '')), ['DEPARTMENT_HEAD', 'BUSINESS_HEAD'], true);
    }

    public static function canViewSensitiveEmployeeData(User $user): bool
    {
        return self::isGlobalHrOrAdmin($user);
    }

    /** @return Builder<Employee> */
    public static function visibleEmployees(User $user): Builder
    {
        $query = Employee::query();
        $rawRole = strtoupper(trim($user->role ?? ''));

        if (self::isGlobalHrOrAdmin($user)
            || in_array($rawRole, ['VIEWER', 'AUDITOR', 'READONLY', 'GUEST'], true)) {
            return $query;
        }

        $selfEmployee = $user->staff_id
            ? Employee::query()->where('staff_id', $user->staff_id)->first()
            : null;

        if ($rawRole === 'MANAGER') {
            if ($selfEmployee === null) {
                return $query->whereRaw('1 = 0');
            }
            $hierarchy = app(EmployeeHierarchyService::class);
            $allowedIds = array_values(array_unique(array_merge(
                [(int) $selfEmployee->id],
                $hierarchy->getAncestorEmployeeIds((int) $selfEmployee->id),
                $hierarchy->getSubtreeEmployeeIds((int) $selfEmployee->id)
            )));

            return $query->whereIn('id', $allowedIds);
        }

        if ($rawRole === 'BUSINESS_HEAD' && $user->entity_id !== null) {
            $normalizedEntity = \App\Models\Entity::normalizeEntityId($user->entity_id) ?? $user->entity_id;

            return $query->where('entity_id', $normalizedEntity);
        }

        if ($rawRole === 'DEPARTMENT_HEAD' && $user->department_id !== null) {
            return $query->where('department_id', $user->department_id);
        }

        if (self::canonical($rawRole) === 'EMPLOYEE') {
            $allowedIds = [];
            if ($selfEmployee !== null) {
                $hierarchy = app(EmployeeHierarchyService::class);
                $allowedIds = array_merge(
                    [(int) $selfEmployee->id],
                    $hierarchy->getAncestorEmployeeIds((int) $selfEmployee->id),
                    $hierarchy->getSubtreeEmployeeIds((int) $selfEmployee->id)
                );
            }

            if ($user->department_id !== null) {
                $deptIds = Employee::query()
                    ->where('department_id', $user->department_id)
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id)
                    ->all();
                $allowedIds = array_merge($allowedIds, $deptIds);
            }

            $allowedIds = array_values(array_unique($allowedIds));

            return $allowedIds === []
                ? $query->whereRaw('1 = 0')
                : $query->whereIn('id', $allowedIds);
        }

        return $query->whereRaw('1 = 0');
    }

    /**
     * Resolve employee IDs whose leave balances/requests/calendar are visible to $user.
     * Returns null when caller has global HR/Admin visibility.
     *
     * @return array<int, int>|null
     */
    public static function visibleLeaveEmployeeIds(User $user): ?array
    {
        if (self::isGlobalHrOrAdmin($user)) {
            return null;
        }

        if (self::canonical($user->role) === 'VIEWER') {
            return [];
        }

        $selfEmployee = $user->staff_id
            ? Employee::query()->where('staff_id', $user->staff_id)->first()
            : null;

        if (self::isSupervisor($user)) {
            if ($selfEmployee !== null) {
                $hierarchy = app(EmployeeHierarchyService::class);
                $teamIds = $hierarchy->getSubtreeEmployeeIds((int) $selfEmployee->id);

                if ($teamIds !== [] || strtoupper(trim($user->role ?? '')) === 'MANAGER') {
                    return array_values(array_unique(array_merge([(int) $selfEmployee->id], $teamIds)));
                }
            }

            $rawRole = strtoupper(trim($user->role ?? ''));
            if ($rawRole === 'DEPARTMENT_HEAD' && $user->department_id !== null) {
                $ids = Employee::query()->where('department_id', $user->department_id)->pluck('id')->map(fn ($id) => (int) $id)->all();
                if ($selfEmployee !== null) {
                    $ids[] = (int) $selfEmployee->id;
                }

                return array_values(array_unique($ids));
            }
            if ($rawRole === 'BUSINESS_HEAD' && $user->entity_id !== null) {
                $ids = Employee::query()->where('entity_id', $user->entity_id)->pluck('id')->map(fn ($id) => (int) $id)->all();
                if ($selfEmployee !== null) {
                    $ids[] = (int) $selfEmployee->id;
                }

                return array_values(array_unique($ids));
            }

            return $selfEmployee !== null ? [(int) $selfEmployee->id] : [];
        }

        return $selfEmployee !== null ? [(int) $selfEmployee->id] : [];
    }

    public static function canManageEmployee(User $user, Employee $employee): bool
    {
        if (! self::canManageEmployeeRecords($user)) {
            return false;
        }

        return match (strtoupper(trim($user->role ?? ''))) {
            'BUSINESS_HEAD' => $user->entity_id !== null && (string) $employee->entity_id === (string) $user->entity_id,
            'DEPARTMENT_HEAD' => $user->department_id !== null && (string) $employee->department_id === (string) $user->department_id,
            default => true,
        };
    }

    public static function canManageEmployeeScope(User $user, ?string $entityId, ?int $departmentId): bool
    {
        if (! self::canManageEmployeeRecords($user)) {
            return false;
        }

        return match (strtoupper(trim($user->role ?? ''))) {
            'BUSINESS_HEAD' => $user->entity_id !== null && $entityId !== null && (string) $entityId === (string) $user->entity_id,
            'DEPARTMENT_HEAD' => $user->department_id !== null && $departmentId !== null && (int) $departmentId === (int) $user->department_id,
            default => true,
        };
    }
}
