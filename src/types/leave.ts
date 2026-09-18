/**
 * Leave Management Types
 * Citadel People Hub
 */

import { WorkflowStatus } from './workflow';

export type LeaveType =
  | 'Annual Leave'
  | 'Casual Leave'
  | 'Sick Leave'
  | 'Maternity Leave'
  | 'Paternity Leave'
  | 'Study Leave'
  | 'Compassionate Leave'
  | 'Sabbatical';

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
