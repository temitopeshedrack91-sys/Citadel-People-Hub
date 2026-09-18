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
