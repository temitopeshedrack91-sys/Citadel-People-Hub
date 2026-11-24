/**
 * Leave Management Types
 * Citadel People Hub
 */

import { WorkflowStatus } from './workflow';

export type LeaveType =
  | 'Annual Leave'
  | 'Sick Leave'
  | 'Maternity Leave'
  | 'Paternity Leave'
  | 'Exam Leave'
  | 'Compassionate Leave'
  | 'Casual Leave';

export interface LeavePolicyRule {
  leaveType: LeaveType;
  entitlement: string;
  entitlementDays: number;
  eligibility: string;
  approvalFlow: 'Line Manager -> HR' | 'Direct HR';
  attachmentRequired: string;
  notes: string;
}

export interface LeaveBalance {
  leaveType: LeaveType;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
}

export interface ApprovalHistoryEntry {
  actor: string;
  actorId?: string | number;
  role?: string;
  stage: string;
  decision?: string;
  status: string;
  comments?: string | null;
  timestamp: string;
}

export interface LeaveBalanceRecord {
  id: string | number;
  employee_id: string | number;
  leave_category_id: string | number;
  year: number;
  total_days: string | number;
  used_days: string | number;
  pending_days: string | number;
  remaining_days: string | number;
  category?: {
    id: string | number;
    name: string;
    code: string;
    is_paid?: boolean;
  };
  employee?: {
    id: string | number;
    staff_id: string;
    full_name: string;
  };
}

export interface LeaveCategoryRecord {
  id: string | number;
  name: string;
  code: string;
  is_paid?: boolean;
  is_active?: boolean;
  policies?: Array<{
    id: string | number;
    name: string;
    days_allowed: number;
    effective_year: number;
  }>;
}

export interface TeamCalendarLeaveEvent {
  id: string | number;
  employeeId: string | number;
  employeeStaffId?: string;
  employeeName: string;
  departmentName?: string;
  entityName?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  approvalStage?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeStaffId: string;
  employeeName: string;
  entityName: string;
  departmentName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  daysRequested?: number;
  reason: string;
  relievingStaffId?: string;
  relievingStaffName?: string;
  handoverColleague?: string;
  status: WorkflowStatus;
  appliedDate: string;
  approvalHistoryId?: string;
  approverComments?: string;
  managerId?: string;
  managerName?: string;
  approvalStage?: 'MANAGER' | 'LINE_MANAGER' | 'DEPARTMENT_HEAD' | 'BUSINESS_HEAD' | 'HR' | 'COMPLETE';
  stoppedAtStage?: string | null;
  managerActorName?: string | null;
  managerActedAt?: string | null;
  hrActorName?: string | null;
  hrActedAt?: string | null;
  approvalHistory?: ApprovalHistoryEntry[];
}
