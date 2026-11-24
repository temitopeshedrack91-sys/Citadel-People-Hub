/**
 * Centralized Role-Based Access Control (RBAC) Module
 * Citadel People Hub
 */

import { User, UserRole, RolePermissions } from '../types';
import { NavModule } from '../components/layout/Sidebar';

export type CanonicalRole = 'ADMIN' | 'HR_STAFF' | 'MANAGER' | 'EMPLOYEE' | 'VIEWER';

export type PermissionAction =
  | 'manage_employees'
  | 'view_all_employees'
  | 'view_sensitive_data'
  | 'manage_settings'
  | 'manage_integrations'
  | 'view_audit_logs'
  | 'approve_leave'
  | 'apply_leave'
  | 'manage_recruitment'
  | 'manage_onboarding'
  | 'manage_offboarding'
  | 'manage_performance'
  | 'manage_documents'
  | 'export_reports'
  | 'create_task'
  | 'edit_task'
  | 'delete_task'
  | 'clock_in_out'
  | 'manage_payroll'
  | 'view_payroll';

export function normalizeRole(role?: string | null): CanonicalRole | null {
  if (!role || typeof role !== 'string') return null;
  const upper = role.trim().toUpperCase();

  switch (upper) {
    case 'ADMIN':
    case 'SYSTEM_ADMIN':
    case 'SYSADMIN':
    case 'SUPER_ADMIN':
      return 'ADMIN';

    case 'HR_STAFF':
    case 'HR':
    case 'HR_MANAGER':
    case 'PCCM_SUPER_ADMIN':
      return 'HR_STAFF';

    case 'MANAGER':
    case 'BUSINESS_HEAD':
    case 'DEPARTMENT_HEAD':
      return 'MANAGER';

    case 'EMPLOYEE':
    case 'STAFF':
    case 'USER':
      return 'EMPLOYEE';

    case 'VIEWER':
    case 'AUDITOR':
    case 'READONLY':
    case 'GUEST':
      return 'VIEWER';

    default:
      return null;
  }
}

export function isHrOrAdminUser(user?: User | null): boolean {
  const canonical = normalizeRole(user?.role);
  return canonical === 'ADMIN' || canonical === 'HR_STAFF';
}

export function isManagerUser(user?: User | null): boolean {
  if (!user || isHrOrAdminUser(user)) return false;
  if (normalizeRole(user.role) === 'MANAGER') return true;
  if (user.effectiveRole === 'MANAGER') return true;
  return Boolean(user.isSupervisor) || (user.directReportsCount ?? 0) > 0;
}

export const ROLE_MODULE_PERMISSIONS: Record<CanonicalRole, NavModule[]> = {
  ADMIN: [
    'dashboard',
    'employees',
    'directory',
    'leave',
    'attendance',
    'projects',
    'payroll',
    'claims',
    'calendar',
    'team-notes',
    'recruitment',
    'onboarding',
    'offboarding',
    'performance',
    'documents',
    'reports',
    'notifications',
    'integrations',
    'ai-assistant',
    'settings',
    'audit-logs',
  ],

  HR_STAFF: [
    'dashboard',
    'employees',
    'directory',
    'leave',
    'attendance',
    'projects',
    'payroll',
    'claims',
    'calendar',
    'team-notes',
    'recruitment',
    'onboarding',
    'offboarding',
    'performance',
    'documents',
    'reports',
    'notifications',
    'ai-assistant',
  ],

  // Managers see team approvals & team calendar, NOT HR reports or HR master controls
  MANAGER: [
    'dashboard',
    'directory',
    'leave',
    'attendance',
    'projects',
    'claims',
    'calendar',
    'team-notes',
    'documents',
    'notifications',
    'ai-assistant',
  ],

  EMPLOYEE: [
    'dashboard',
    'attendance',
    'leave',
    'projects',
    'payroll',
    'claims',
    'calendar',
    'team-notes',
    'directory',
    'documents',
    'notifications',
    'ai-assistant',
  ],

  VIEWER: [
    'dashboard',
    'directory',
    'calendar',
    'team-notes',
    'documents',
    'reports',
    'payroll',
    'notifications',
    'ai-assistant',
  ],
};

export function canAccessModule(
  userOrRole: User | UserRole | string | null | undefined,
  module: NavModule
): boolean {
  if (!userOrRole) return false;
  const roleStr = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  const canonical = normalizeRole(roleStr);
  if (!canonical) return false;

  return ROLE_MODULE_PERMISSIONS[canonical].includes(module);
}

export interface RouteAccessResult {
  allowed: boolean;
  status: 200 | 401 | 403;
  error?: string;
  reason?: string;
  canonicalRole?: CanonicalRole;
}

export function checkRouteAccess(
  user: User | null | undefined,
  module: NavModule
): RouteAccessResult {
  if (!user) {
    return {
      allowed: false,
      status: 401,
      error: 'Unauthenticated',
      reason: 'Authentication required. Please sign in to access Citadel People Hub.',
    };
  }

  const canonical = normalizeRole(user.role);
  if (!canonical) {
    return {
      allowed: false,
      status: 403,
      error: 'Forbidden',
      reason: `User '${user.name}' has unrecognized role '${user.role}'. Access denied.`,
    };
  }

  const allowed = canAccessModule(canonical, module);
  if (!allowed) {
    let reason = `Your role (${canonical}) does not have permission to access '${module}'.`;
    if (canonical === 'HR_STAFF' && ['settings', 'integrations', 'audit-logs'].includes(module)) {
      reason = `System-level module '${module}' is restricted to Admin personnel only. HR Staff access is prohibited.`;
    } else if (canonical === 'MANAGER') {
      reason = `Manager access is scoped to team approvals and calendar. '${module}' requires HR or Admin privileges.`;
    } else if (canonical === 'EMPLOYEE') {
      reason = `Employee access is restricted to self-service and department views. '${module}' requires elevated privileges.`;
    } else if (canonical === 'VIEWER') {
      reason = `Viewer access is read-only. Access to management module '${module}' is forbidden.`;
    }

    return {
      allowed: false,
      status: 403,
      error: 'Forbidden',
      reason,
      canonicalRole: canonical,
    };
  }

  return {
    allowed: true,
    status: 200,
    canonicalRole: canonical,
  };
}

export function getRolePermissions(role?: string | null): RolePermissions {
  const canonical = normalizeRole(role);

  switch (canonical) {
    case 'ADMIN':
      return {
        canManageEmployees: true,
        canViewAllEmployees: true,
        canViewSensitiveData: true,
        canManageEntitiesAndDepts: true,
        canApproveLeave: true,
        canManageLeavePolicies: true,
        canViewAuditLogs: true,
        canManageOnboarding: true,
        canManagePerformance: true,
        canManageDocuments: true,
        canConfigureIntegrations: true,
        canExportReports: true,
        canManageSettings: true,
        canManagePayroll: true,
        canViewPayroll: true,
        isReadOnly: false,
      };

    case 'HR_STAFF':
      return {
        canManageEmployees: true,
        canViewAllEmployees: true,
        canViewSensitiveData: true,
        canManageEntitiesAndDepts: false,
        canApproveLeave: true,
        canManageLeavePolicies: true,
        canViewAuditLogs: false,
        canManageOnboarding: true,
        canManagePerformance: true,
        canManageDocuments: true,
        canConfigureIntegrations: false,
        canExportReports: true,
        canManageSettings: false,
        canManagePayroll: true,
        canViewPayroll: true,
        isReadOnly: false,
      };

    case 'MANAGER':
      return {
        canManageEmployees: false,
        canViewAllEmployees: false,
        canViewSensitiveData: false,
        canManageEntitiesAndDepts: false,
        canApproveLeave: true,
        canManageLeavePolicies: false,
        canViewAuditLogs: false,
        canManageOnboarding: false,
        canManagePerformance: false,
        canManageDocuments: false,
        canConfigureIntegrations: false,
        canExportReports: false,
        canManageSettings: false,
        canManagePayroll: false,
        canViewPayroll: true,
        isReadOnly: false,
      };

    case 'EMPLOYEE':
      return {
        canManageEmployees: false,
        canViewAllEmployees: false,
        canViewSensitiveData: false,
        canManageEntitiesAndDepts: false,
        canApproveLeave: false,
        canManageLeavePolicies: false,
        canViewAuditLogs: false,
        canManageOnboarding: false,
        canManagePerformance: false,
        canManageDocuments: false,
        canConfigureIntegrations: false,
        canExportReports: false,
        canManageSettings: false,
        canManagePayroll: false,
        canViewPayroll: true,
        isReadOnly: false,
      };

    case 'VIEWER':
      return {
        canManageEmployees: false,
        canViewAllEmployees: true,
        canViewSensitiveData: false,
        canManageEntitiesAndDepts: false,
        canApproveLeave: false,
        canManageLeavePolicies: false,
        canViewAuditLogs: false,
        canManageOnboarding: false,
        canManagePerformance: false,
        canManageDocuments: false,
        canConfigureIntegrations: false,
        canExportReports: true,
        canManageSettings: false,
        canManagePayroll: false,
        canViewPayroll: true,
        isReadOnly: true,
      };

    default:
      return {
        canManageEmployees: false,
        canViewAllEmployees: false,
        canViewSensitiveData: false,
        canManageEntitiesAndDepts: false,
        canApproveLeave: false,
        canManageLeavePolicies: false,
        canViewAuditLogs: false,
        canManageOnboarding: false,
        canManagePerformance: false,
        canManageDocuments: false,
        canConfigureIntegrations: false,
        canExportReports: false,
        canManageSettings: false,
        isReadOnly: true,
      };
  }
}

export function canPerformAction(
  user: User | null | undefined,
  action: PermissionAction,
  context?: {
    targetDepartmentName?: string;
    targetDepartmentId?: string;
    targetEmployeeId?: string;
  }
): { allowed: boolean; status: 200 | 401 | 403; reason?: string } {
  if (!user) {
    return { allowed: false, status: 401, reason: 'Unauthenticated. Sign in required.' };
  }

  const canonical = normalizeRole(user.role);
  if (!canonical) {
    return { allowed: false, status: 403, reason: 'Forbidden. Unknown role.' };
  }

  const perms = getRolePermissions(canonical);

  if (perms.isReadOnly && !['view_all_employees', 'export_reports'].includes(action)) {
    return {
      allowed: false,
      status: 403,
      reason: 'Viewer role is strictly read-only. Action denied.',
    };
  }

  if (canonical === 'ADMIN') {
    return { allowed: true, status: 200 };
  }

  if (canonical === 'HR_STAFF') {
    if (['manage_settings', 'manage_integrations', 'view_audit_logs'].includes(action)) {
      return {
        allowed: false,
        status: 403,
        reason: 'HR Staff cannot perform system-level administration or access technical audit trails.',
      };
    }
    return { allowed: true, status: 200 };
  }

  if (canonical === 'MANAGER') {
    if (['approve_leave', 'apply_leave', 'clock_in_out', 'create_task', 'edit_task'].includes(action)) {
      return { allowed: true, status: 200 };
    }
    return {
      allowed: false,
      status: 403,
      reason: `Managers cannot perform HR or system administration action '${action}'.`,
    };
  }

  if (canonical === 'EMPLOYEE') {
    if (
      [
        'manage_employees',
        'view_all_employees',
        'view_sensitive_data',
        'manage_settings',
        'manage_integrations',
        'view_audit_logs',
        'approve_leave',
        'manage_recruitment',
        'manage_onboarding',
        'manage_offboarding',
        'manage_performance',
        'manage_documents',
        'export_reports',
        'manage_payroll',
      ].includes(action)
    ) {
      return {
        allowed: false,
        status: 403,
        reason: `Employees do not have permission to perform '${action}'.`,
      };
    }

    if (context?.targetDepartmentName || context?.targetDepartmentId) {
      const userDept = user.departmentName || user.departmentId;
      const targetDept = context.targetDepartmentName || context.targetDepartmentId;
      if (userDept && targetDept && !isDepartmentMatch(userDept, targetDept)) {
        return {
          allowed: false,
          status: 403,
          reason: `Department scoping violation: Employee in '${userDept}' cannot access '${targetDept}'.`,
        };
      }
    }

    if (['apply_leave', 'clock_in_out', 'create_task', 'edit_task'].includes(action)) {
      return { allowed: true, status: 200 };
    }
  }

  return { allowed: true, status: 200 };
}

export function isDepartmentMatch(deptA?: string, deptB?: string): boolean {
  if (!deptA || !deptB) return false;
  const cleanA = deptA.trim().toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
  const cleanB = deptB.trim().toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
  return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
}

export function filterEmployeesForUser<
  T extends {
    departmentName?: string;
    departmentId?: string;
    id?: string;
    staffId?: string;
    managerId?: string;
    managerName?: string;
  }
>(user: User | null | undefined, employees: T[]): T[] {
  if (!user) return [];
  const canonical = normalizeRole(user.role);

  if (canonical === 'ADMIN' || canonical === 'HR_STAFF' || canonical === 'VIEWER') {
    return employees;
  }

  const userDept = user.departmentName || user.departmentId || '';
  const userNameLower = (user.name || '').toLowerCase();
  const userStaffId = (user.staffId || '').toLowerCase();
  const userId = (user.id || '').toLowerCase();

  return employees.filter((e) => {
    const mId = (e.managerId || '').toLowerCase();
    const mName = (e.managerName || '').toLowerCase();
    const isDirectReport =
      Boolean(userStaffId && mId && mId === userStaffId) ||
      Boolean(userId && mId && mId === userId) ||
      Boolean(userNameLower && mName && (mName.includes(userNameLower) || userNameLower.includes(mName)));

    if (isDirectReport) return true;

    if (String(e.id) === String(user.id) || (userStaffId && e.staffId && e.staffId.toLowerCase() === userStaffId)) {
      return true;
    }

    if (canonical === 'MANAGER') {
      return false;
    }

    if (userDept) {
      const empDept = e.departmentName || e.departmentId || '';
      return isDepartmentMatch(userDept, empDept);
    }

    return false;
  });
}

export function filterLeaveRequestsForUser<
  T extends {
    department?: string;
    departmentName?: string;
    employeeId?: string;
    staffId?: string;
    employeeStaffId?: string;
    managerId?: string;
    managerName?: string;
  }
>(user: User | null | undefined, requests: T[]): T[] {
  if (!user) return [];
  const canonical = normalizeRole(user.role);

  if (canonical === 'ADMIN' || canonical === 'HR_STAFF') {
    return requests;
  }

  const userDept = user.departmentName || user.departmentId || '';
  const userNameLower = (user.name || '').toLowerCase();
  const userStaffId = (user.staffId || '').toLowerCase();
  const userId = (user.id || '').toLowerCase();

  return requests.filter((r) => {
    if (String(r.employeeId) === String(user.id)) return true;
    if (userStaffId && r.staffId && r.staffId.toLowerCase() === userStaffId) return true;
    if (userStaffId && r.employeeStaffId && r.employeeStaffId.toLowerCase() === userStaffId) return true;

    const mId = (r.managerId || '').toLowerCase();
    const mName = (r.managerName || '').toLowerCase();
    if (
      (userStaffId && mId && mId === userStaffId) ||
      (userId && mId && mId === userId) ||
      (userNameLower && mName && (mName.includes(userNameLower) || userNameLower.includes(mName)))
    ) {
      return true;
    }

    if (canonical === 'MANAGER') {
      return false;
    }

    const reqDept = r.department || r.departmentName;
    if (userDept && reqDept && isDepartmentMatch(userDept, reqDept)) {
      return true;
    }

    return false;
  });
}

export function filterAttendanceForUser<
  T extends {
    department?: string;
    employeeId?: string;
    staffId?: string;
  }
>(user: User | null | undefined, records: T[]): T[] {
  if (!user) return [];
  const canonical = normalizeRole(user.role);

  if (canonical === 'ADMIN' || canonical === 'HR_STAFF' || canonical === 'VIEWER') {
    return records;
  }

  const userDept = user.departmentName || user.departmentId || '';
  return records.filter((rec) => {
    if (rec.employeeId === user.id || rec.staffId === user.staffId) return true;
    if (userDept && rec.department && isDepartmentMatch(userDept, rec.department)) return true;
    return false;
  });
}

export function maskSensitiveEmployeeData<
  T extends {
    salary?: string | number;
    bankAccountNumber?: string;
    bankName?: string;
    bvn?: string;
    nationalId?: string;
    [key: string]: any;
  }
>(user: User | null | undefined, employee: T): T {
  const perms = getRolePermissions(user?.role);

  if (perms.canViewSensitiveData) {
    return employee;
  }

  return {
    ...employee,
    salary: undefined,
    salaryFormatted: '[Confidential - PCCM Access Only]',
    bankAccountNumber: employee.bankAccountNumber ? '••••••••' : undefined,
    bankName: employee.bankName ? '••••••••' : undefined,
    bvn: employee.bvn ? '•••••••••••' : undefined,
    nationalId: employee.nationalId ? '•••••••••••' : undefined,
  };
}

export function authorizeApiRequest(
  user: User | null | undefined,
  options: {
    action?: PermissionAction;
    module?: NavModule;
    targetDepartmentName?: string;
    targetDepartmentId?: string;
    targetEmployeeId?: string;
  }
): { success: boolean; status: number; error?: string } {
  if (!user) {
    return {
      success: false,
      status: 401,
      error: 'Unauthorized: Authentication credentials required.',
    };
  }

  const canonical = normalizeRole(user.role);
  if (!canonical) {
    return {
      success: false,
      status: 403,
      error: `Forbidden: Unknown user role '${user.role}'.`,
    };
  }

  if (options.module) {
    const routeCheck = checkRouteAccess(user, options.module);
    if (!routeCheck.allowed) {
      return {
        success: false,
        status: routeCheck.status,
        error: routeCheck.reason || 'Forbidden: Module access denied.',
      };
    }
  }

  if (options.action) {
    const actionCheck = canPerformAction(user, options.action, {
      targetDepartmentName: options.targetDepartmentName,
      targetDepartmentId: options.targetDepartmentId,
      targetEmployeeId: options.targetEmployeeId,
    });

    if (!actionCheck.allowed) {
      return {
        success: false,
        status: actionCheck.status,
        error: actionCheck.reason || 'Forbidden: Action not allowed for current role.',
      };
    }
  }

  return { success: true, status: 200 };
}
