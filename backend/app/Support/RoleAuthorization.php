<?php

namespace App\Support;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class RoleAuthorization
{
    public static function canonical(?string $role): ?string
    {
        return match (strtoupper(trim($role ?? ''))) {
            'ADMIN', 'SYSTEM_ADMIN', 'SYSADMIN', 'SUPER_ADMIN' => 'ADMIN',
            'HR_STAFF', 'HR', 'HR_MANAGER', 'PCCM_SUPER_ADMIN', 'BUSINESS_HEAD', 'DEPARTMENT_HEAD' => 'HR_STAFF',
            'EMPLOYEE', 'STAFF', 'USER' => 'EMPLOYEE',
            'VIEWER', 'AUDITOR', 'READONLY', 'GUEST' => 'VIEWER',
            default => null,
        };
    }

    public static function canManageEmployeeRecords(User $user): bool
    {
        return in_array(self::canonical($user->role), ['ADMIN', 'HR_STAFF'], true);
    }

    public static function canViewSensitiveEmployeeData(User $user): bool
    {
        return self::canManageEmployeeRecords($user);
    }

    /** @return Builder<Employee> */
    public static function visibleEmployees(User $user): Builder
    {
        $query = Employee::query();
        $role = strtoupper(trim($user->role));

        if (self::canonical($role) === 'ADMIN'
            || in_array($role, ['HR_STAFF', 'HR', 'HR_MANAGER', 'PCCM_SUPER_ADMIN', 'VIEWER', 'AUDITOR', 'READONLY', 'GUEST'], true)) {
            return $query;
        }

        if ($role === 'BUSINESS_HEAD' && $user->entity_id !== null) {
            return $query->where('entity_id', $user->entity_id);
        }

        if ($role === 'DEPARTMENT_HEAD' && $user->department_id !== null) {
            return $query->where('department_id', $user->department_id);
        }

        if (self::canonical($role) === 'EMPLOYEE' && $user->department_id !== null) {
            return $query->where('department_id', $user->department_id);
        }

        return $query->whereRaw('1 = 0');
    }

    public static function canManageEmployee(User $user, Employee $employee): bool
    {
        if (! self::canManageEmployeeRecords($user)) {
            return false;
        }

        return match (strtoupper(trim($user->role))) {
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

        return match (strtoupper(trim($user->role))) {
            'BUSINESS_HEAD' => $user->entity_id !== null && $entityId !== null && (string) $entityId === (string) $user->entity_id,
            'DEPARTMENT_HEAD' => $user->department_id !== null && $departmentId !== null && (int) $departmentId === (int) $user->department_id,
            default => true,
        };
    }
}
