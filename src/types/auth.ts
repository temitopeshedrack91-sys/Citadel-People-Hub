/**
 * User Roles & Authentication Types
 * Citadel People Hub
 */

export type UserRole =
  | 'ADMIN'              // System Administrator (full access to all modules and system settings)
  | 'HR_STAFF'           // HR Staff / Manager (cross-department HR access, no system settings)
  | 'EMPLOYEE'           // Self-service employee (department-scoped records only)
  | 'VIEWER'             // Read-only auditor / viewer (view access, zero mutations)
  | 'PCCM_SUPER_ADMIN'   // Legacy: People, Culture & Change Manager (Super Admin - primary HR admin)
  | 'BUSINESS_HEAD'      // Legacy: Entity-scoped executive
  | 'DEPARTMENT_HEAD'    // Legacy: Department/Team-scoped leader
  | 'SYSTEM_ADMIN';      // Legacy: Technical administration (maps to Admin)

export interface User {
  id: string;
  userId?: string;
  employeeId?: string;
  staffId: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  role: UserRole;
  entityId: string;
  entityName: string;
  departmentId: string;
  departmentName: string;
  jobTitle: string;
  avatarUrl?: string;
  permissions: string[];
}

export interface RolePermissions {
  canManageEmployees: boolean;
  canViewAllEmployees: boolean;
  canViewSensitiveData: boolean;
  canManageEntitiesAndDepts: boolean;
  canApproveLeave: boolean;
  canManageLeavePolicies: boolean;
  canViewAuditLogs: boolean;
  canManageOnboarding: boolean;
  canManagePerformance: boolean;
  canManageDocuments: boolean;
  canConfigureIntegrations: boolean;
  canExportReports: boolean;
  canManageSettings: boolean;
  canManagePayroll?: boolean;
  canViewPayroll?: boolean;
  isReadOnly: boolean;
}
