/**
 * User Roles & Authentication Types
 * Citadel People Hub
 */

export type UserRole =
  | 'PCCM_SUPER_ADMIN'   // People, Culture & Change Manager (Super Admin - primary HR admin)
  | 'BUSINESS_HEAD'       // Entity-scoped executive
  | 'DEPARTMENT_HEAD'     // Department/Team-scoped leader
  | 'EMPLOYEE'            // Self-service access
  | 'SYSTEM_ADMIN';       // Technical administration (no automatic HR sensitive data access)

export interface User {
  id: string;
  staffId: string;
  name: string;
  email: string;
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
}
