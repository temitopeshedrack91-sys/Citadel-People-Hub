/**
 * Data Access Layer Interfaces
 * Citadel People Hub
 * 
 * These interfaces form the architectural abstraction boundary.
 * The current mock repository implements these interfaces.
 * When Supabase PostgreSQL and Auth are connected in a future phase,
 * a SupabaseRepository will implement these same interfaces with ZERO UI code changes.
 */

import {
  Employee,
  CitadelEntity,
  CitadelDepartment,
  LeaveRequest,
  AttendanceRecord,
  WorkflowRequest,
  WorkflowActionRecord,
  WorkflowStatus,
  WorkflowActionType,
  AuditLogEntry,
  HubDocument,
  SystemNotification,
  OnboardingJourney,
  RecruitmentRequisition,
} from '../types';

export interface IEmployeeRepository {
  getAll(filter?: { entityId?: string; departmentId?: string; search?: string }): Promise<Employee[]>;
  getById(id: string): Promise<Employee | null>;
  create(employee: Omit<Employee, 'id'>): Promise<Employee>;
  update(id: string, updates: Partial<Employee>): Promise<Employee>;
  delete(id: string): Promise<boolean>;
}

export interface IOrganizationRepository {
  getEntities(): Promise<CitadelEntity[]>;
  getDepartments(entityId?: string): Promise<CitadelDepartment[]>;
  createDepartment(dept: Omit<CitadelDepartment, 'id'>): Promise<CitadelDepartment>;
  updateDepartment(id: string, updates: Partial<CitadelDepartment>): Promise<CitadelDepartment>;
  toggleDepartmentStatus(id: string, isActive: boolean): Promise<CitadelDepartment>;
  createEntity(entity: Omit<CitadelEntity, 'id'>): Promise<CitadelEntity>;
}

export interface ILeaveRepository {
  getAll(): Promise<LeaveRequest[]>;
  getByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  submitRequest(request: Omit<LeaveRequest, 'id' | 'appliedDate' | 'status'>): Promise<LeaveRequest>;
  updateStatus(requestId: string, status: WorkflowStatus, actorName: string, comments?: string): Promise<LeaveRequest>;
}

export interface IAttendanceRepository {
  getTodaySummary(): Promise<any>;
  getRecentLogs(limit?: number): Promise<AttendanceRecord[]>;
  recordClockIn(employeeId: string, employeeName: string, staffId: string, entity: string, dept: string): Promise<AttendanceRecord>;
  recordClockOut(recordId: string): Promise<AttendanceRecord>;
}

export interface IWorkflowRepository {
  getPendingWorkflows(role?: string, entityId?: string): Promise<WorkflowRequest[]>;
  executeAction(
    workflowId: string,
    action: WorkflowActionType,
    actorId: string,
    actorName: string,
    actorRole: string,
    comments: string
  ): Promise<WorkflowRequest>;
}

export interface IAuditRepository {
  getLogs(filter?: { module?: string; userId?: string; limit?: number }): Promise<AuditLogEntry[]>;
  logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry>;
}

export interface IDocumentRepository {
  getAll(filter?: { category?: string; accessLevel?: string }): Promise<HubDocument[]>;
  uploadDocument(doc: Omit<HubDocument, 'id' | 'uploadedDate'>): Promise<HubDocument>;
}

export interface INotificationRepository {
  getAll(): Promise<SystemNotification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
}

export interface ITalentRepository {
  getOnboardingJourneys(): Promise<OnboardingJourney[]>;
  toggleTaskCompletion(journeyId: string, taskId: string, isCompleted: boolean): Promise<OnboardingJourney>;
  getRequisitions(): Promise<RecruitmentRequisition[]>;
}
