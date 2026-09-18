/**
 * Approval Workflow Architecture
 * Reusable across Leave, Requisitions, Documents, Profile Changes, etc.
 * Citadel People Hub
 */

export type WorkflowStatus =
  | 'Draft'
  | 'Submitted'
  | 'Pending Review'
  | 'Approved'
  | 'Rejected'
  | 'Requires Correction'
  | 'Cancelled';

export type WorkflowActionType =
  | 'Submit'
  | 'Approve'
  | 'Reject'
  | 'Request Correction'
  | 'Resubmit'
  | 'Cancel';

export type WorkflowModule =
  | 'Leave'
  | 'Profile Change'
  | 'Recruitment'
  | 'Document Approval'
  | 'Performance Appraisal'
  | 'Department Reorganization';

export interface WorkflowActionRecord {
  id: string;
  workflowId: string;
  action: WorkflowActionType;
  actorId: string;
  actorName: string;
  actorRole: string;
  previousStatus: WorkflowStatus;
  newStatus: WorkflowStatus;
  comments: string;
  timestamp: string;
}

export interface WorkflowRequest<T = unknown> {
  id: string;
  module: WorkflowModule;
  title: string;
  description: string;
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  requesterEntity: string;
  requesterDepartment: string;
  currentStatus: WorkflowStatus;
  assignedApproverRole?: string;
  assignedApproverId?: string;
  assignedApproverName?: string;
  submittedAt: string;
  updatedAt: string;
  completedAt?: string;
  history: WorkflowActionRecord[];
  payload: T;
}
