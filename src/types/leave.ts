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
}
