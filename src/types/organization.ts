/**
 * Organization Structure Types
 * Citadel People Hub
 */

export interface CitadelEntity {
  id: string;
  name: string;
  shortCode: string;
  code?: string;
  description: string;
  headOfEntity?: string;
  isActive: boolean;
  departmentCount?: number;
  employeeCount?: number;
}

export interface CitadelDepartment {
  id: string;
  entityId: string;
  entityName: string;
  name: string;
  code: string;
  headOfDepartment?: string;
  headOfDepartmentName?: string;
  headStaffId?: string;
  description?: string;
  isActive: boolean;
  employeeCount?: number;
}

export interface GroupExecutiveCouncilMember {
  id: string;
  name: string;
  title: string;
  portfolio: string;
  entityScope: string;
  email: string;
  roleType: 'Business Head' | 'Shared Services Lead' | 'Executive Oversight';
  reportingLine?: string;
}

export interface RolesGovernanceTier {
  tierNumber: number;
  roleName: string;
  code: string;
  gecStatus: string;
  scopeOfAccess: string;
  leaveApprovalAuthority: string;
  attendanceAccess: string;
  biometricDeviceManagement: string;
  auditTrailAccess: string;
}

