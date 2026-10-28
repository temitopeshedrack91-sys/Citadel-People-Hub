/**
 * Centralized Role-Based Access Control (RBAC) Module
 * Citadel People Hub
 *
 * Provides a single source of truth for:
 * 1. Role normalization and hierarchy (Admin, HR Staff, Employee, Viewer)
 * 2. Nav module and route-level authorization
 * 3. Granular action permissions and read-only enforcement
 * 4. Department-scoped record filtering for Employee role
 * 5. Sensitive data masking (salaries, bank records, confidential notes)
 * 6. Backend/API-level authorization verification
 */

import { User, UserRole, RolePermissions } from '../types';
import { NavModule } from '../components/layout/Sidebar';

export type CanonicalRole = 'ADMIN' | 'HR_STAFF' | 'EMPLOYEE' | 'VIEWER';

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
  | 'clock_in_out';

/**
 * Normalizes any role string (including legacy and alias roles) into canonical roles:
 * - Admin: Full access (SYSTEM_ADMIN, ADMIN)
 * - HR Staff: HR records across departments, no system settings (HR_STAFF, PCCM_SUPER_ADMIN, HR_MANAGER, BUSINESS_HEAD, DEPARTMENT_HEAD)
 * - Employee: Department-scoped & self-service access (EMPLOYEE)
 * - Viewer: Read-only access across allowed views (VIEWER, AUDITOR, READONLY)
 */
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
    case 'BUSINESS_HEAD':
    case 'DEPARTMENT_HEAD':
      return 'HR_STAFF';

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

/**
 * Module access permissions matrix by canonical role
 */
export const ROLE_MODULE_PERMISSIONS: Record<CanonicalRole, NavModule[]> = {
  // Admin: Complete, unrestricted access across all modules
  ADMIN: [
    'dashboard',
    'employees',
    'directory',
    'leave',
    'attendance',
    'projects',
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

  // HR Staff: Cross-department HR records, strictly NO system-level settings
  HR_STAFF: [
    'dashboard',
    'employees',
    'directory',
    'leave',
    'attendance',
    'projects',
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

  // Employee: Department-scoped & self-service views
  EMPLOYEE: [
    'dashboard',
    'attendance',
    'leave',
    'projects',
    'calendar',
    'team-notes',
    'directory',
    'documents',
    'notifications',
    'ai-assistant',
  ],

  // Viewer: Read-only access across standard public/reporting views
  VIEWER: [
    'dashboard',
    'directory',
    'calendar',
    'team-notes',
    'documents',
    'reports',
    'notifications',
    'ai-assistant',
  ],
};

/**
 * Evaluates whether a user or role has access to a specific sidebar/route module
 */
export function canAccessModule(
  userOrRole: User | UserRole | string | null | undefined,
  module: NavModule
): boolean {
  if (!userOrRole) return false;
  const roleStr = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  const canonical = normalizeRole(roleStr);
  if (!canonical) return false;

  const allowedModules = ROLE_MODULE_PERMISSIONS[canonical];
  return allowedModules.includes(module);
}

export interface RouteAccessResult {
  allowed: boolean;
  status: 200 | 401 | 403;
  error?: string;
  reason?: string;
  canonicalRole?: CanonicalRole;
}

/**
 * Route guard checking access to an active module for the current user
 * Returns explicit status codes (401 for unauthenticated, 403 for forbidden)
 */
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

/**
 * Returns comprehensive action permissions for a given role
 */
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
        isReadOnly: false,
      };

    case 'HR_STAFF':
      return {
        canManageEmployees: true,
        canViewAllEmployees: true,
        canViewSensitiveData: true,
        canManageEntitiesAndDepts: false, // System-level
        canApproveLeave: true,
        canManageLeavePolicies: true,
        canViewAuditLogs: false, // System-level
        canManageOnboarding: true,
        canManagePerformance: true,
        canManageDocuments: true,
        canConfigureIntegrations: false, // System-level
        canExportReports: true,
        canManageSettings: false, // System-level
        isReadOnly: false,
      };

    case 'EMPLOYEE':
      return {
        canManageEmployees: false,
        canViewAllEmployees: false, // Department-scoped only
        canViewSensitiveData: false, // No salary/bank records of others
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
        isReadOnly: false, // Can clock-in, apply leave, manage personal tasks
      };

    case 'VIEWER':
      return {
        canManageEmployees: false,
        canViewAllEmployees: true,
        canViewSensitiveData: false, // Masked
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

/**
 * Checks whether user can execute a specific action, taking department context into account
 */
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

  // Viewer is strictly read-only for any mutating action
  if (perms.isReadOnly && !['view_all_employees', 'export_reports'].includes(action)) {
    return {
      allowed: false,
      status: 403,
      reason: 'Viewer role is strictly read-only. Action denied.',
    };
  }

  // Admin has full access to all actions
  if (canonical === 'ADMIN') {
    return { allowed: true, status: 200 };
  }

  // HR Staff has cross-department HR permissions, but blocked from system settings
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

  // Employee: Scoped strictly to self & own department
  if (canonical === 'EMPLOYEE') {
    // Prohibited actions for Employee
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
      ].includes(action)
    ) {
      return {
        allowed: false,
        status: 403,
        reason: `Employees do not have permission to perform '${action}'.`,
      };
    }

    // Check department scoping if target department is provided
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

    // Allowed self-service actions
    if (['apply_leave', 'clock_in_out', 'create_task', 'edit_task'].includes(action)) {
      return { allowed: true, status: 200 };
    }
  }

  return { allowed: true, status: 200 };
}

/**
 * Normalizes and checks department equality
 */
export function isDepartmentMatch(deptA?: string, deptB?: string): boolean {
  if (!deptA || !deptB) return false;
  const cleanA = deptA.trim().toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
  const cleanB = deptB.trim().toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
  return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
}

/**
 * Enforces department scoping on an employee list
 * - Admin, HR Staff, Viewer: see all employees
 * - Employee: see ONLY employees within their own department
 */
export function filterEmployeesForUser<
  T extends {
    departmentName?: string;
    departmentId?: string;
    id?: string;
    staffId?: string;
  }
>(user: User | null | undefined, employees: T[]): T[] {
  if (!user) return [];
  const canonical = normalizeRole(user.role);

  // Admin and HR Staff see all employees across all departments
  if (canonical === 'ADMIN' || canonical === 'HR_STAFF' || canonical === 'VIEWER') {
    return employees;
  }

  // Employee: strictly scoped to their own department
  const userDept = user.departmentName || user.departmentId || '';
  if (!userDept) {
    // If no department specified, return only self
    return employees.filter((e) => e.id === user.id || e.staffId === user.staffId);
  }

  return employees.filter((e) => {
    const empDept = e.departmentName || e.departmentId || '';
    return isDepartmentMatch(userDept, empDept) || e.id === user.id || e.staffId === user.staffId;
  });
}

/**
 * Enforces department scoping on leave requests
 * - Admin and HR Staff: see all requests across all departments
 * - Employee: see ONLY requests from their own department or self
 */
export function filterLeaveRequestsForUser<
  T extends {
    department?: string;
    employeeId?: string;
    staffId?: string;
  }
>(user: User | null | undefined, requests: T[]): T[] {
  if (!user) return [];
  const canonical = normalizeRole(user.role);

  if (canonical === 'ADMIN' || canonical === 'HR_STAFF') {
    return requests;
  }

  const userDept = user.departmentName || user.departmentId || '';
  return requests.filter((r) => {
    if (r.employeeId === user.id || r.staffId === user.staffId) return true;
    if (userDept && r.department && isDepartmentMatch(userDept, r.department)) return true;
    return false;
  });
}

/**
 * Enforces department scoping on attendance records
 */
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

/**
 * Masks sensitive compensation and personal identity records for roles lacking permission
 */
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

  // If user has permission, return data as is
  if (perms.canViewSensitiveData) {
    return employee;
  }

  // Mask sensitive fields
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

/**
 * Backend/Service API authorization checker
 * Reusable across services, API routes, or repository layers
 */
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

  // If module check specified
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

  // If action check specified
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

