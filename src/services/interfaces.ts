/**
 * Data Access Layer Interfaces
 * Citadel People Hub
 * 
 * These interfaces isolate view components from local demo storage or Laravel.
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
  OnboardingTask,
  OnboardingChecklistTemplate,
  RecruitmentRequisition,
  SalaryTemplate,
  EmployeeSalaryAssignment,
  PayrollRun,
  PayrollItem,
  EmployeeLoan,
  EmployeeDeduction,
  EmployeeProvidentFund,
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
  logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void | AuditLogEntry>;
}

export interface IDocumentRepository {
  getAll(filter?: { category?: string; accessLevel?: string }): Promise<HubDocument[]>;
  uploadDocument(doc: Omit<HubDocument, 'id' | 'uploadedDate'>, file?: File): Promise<HubDocument>;
}

export interface INotificationRepository {
  getAll(): Promise<SystemNotification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
}

export interface ITalentRepository {
  getOnboardingJourneys(): Promise<OnboardingJourney[]>;
  toggleTaskCompletion(journeyId: string, taskId: string, isCompleted: boolean): Promise<OnboardingJourney>;
  createOnboardingTask?(journeyId: string, task: Omit<OnboardingTask, 'id' | 'isCompleted'>): Promise<OnboardingJourney>;
  sendTaskReminder?(journeyId: string, taskId: string): Promise<boolean>;
  toggleDocumentSubmission?(journeyId: string, docId: string, isSubmitted: boolean): Promise<OnboardingJourney>;
  toggleOrientationItem?(journeyId: string, itemId: string, isCompleted: boolean): Promise<OnboardingJourney>;
  getRequisitions(): Promise<RecruitmentRequisition[]>;
  createRequisition?(requisition: RecruitmentRequisition): Promise<RecruitmentRequisition>;
  createOnboardingJourney?(journey: OnboardingJourney): Promise<OnboardingJourney>;
  getChecklistTemplates?(): Promise<OnboardingChecklistTemplate[]>;
  createChecklistTemplate?(template: OnboardingChecklistTemplate): Promise<OnboardingChecklistTemplate>;
}

export interface IPayrollRepository {
  getSalaryTemplates(): Promise<SalaryTemplate[]>;
  createSalaryTemplate(template: Omit<SalaryTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<SalaryTemplate>;
  getAssignments(): Promise<EmployeeSalaryAssignment[]>;
  assignSalaryTemplate(assignment: {
    employee_id: string;
    salary_template_id: string;
    effective_date: string;
    override_basic_salary?: number | null;
    custom_allowances?: any[];
    custom_deductions?: any[];
    notes?: string;
  }): Promise<EmployeeSalaryAssignment>;
  getPayrollRuns(): Promise<PayrollRun[]>;
  getPayrollRun(id: string): Promise<PayrollRun>;
  generatePayrollRun(data: {
    title?: string;
    period_start: string;
    period_end: string;
    pay_date?: string;
    notes?: string;
  }): Promise<PayrollRun>;
  finalizePayrollRun(id: string): Promise<PayrollRun>;
  getPayslip(id: string): Promise<PayrollItem>;
  markPayslipPaid(id: string, paymentMethod?: string): Promise<PayrollItem>;
  getLoans(filter?: { employee_id?: string; status?: string }): Promise<EmployeeLoan[]>;
  createLoan(loan: {
    employee_id: string;
    loan_type: string;
    principal_amount: number;
    interest_rate?: number;
    monthly_installment: number;
    total_installments: number;
    disbursed_at?: string;
    notes?: string;
  }): Promise<EmployeeLoan>;
  approveLoan(id: string): Promise<EmployeeLoan>;
  getDeductions(filter?: { employee_id?: string }): Promise<EmployeeDeduction[]>;
  createDeduction(deduction: {
    employee_id: string;
    title: string;
    deduction_type: string;
    amount: number;
    is_percentage?: boolean;
    start_date: string;
    end_date?: string | null;
    is_recurring?: boolean;
  }): Promise<EmployeeDeduction>;
  getProvidentFunds(): Promise<EmployeeProvidentFund[]>;
  createProvidentFund(data: {
    employee_id: string;
    employee_rate?: number;
    employer_rate?: number;
    status?: 'active' | 'inactive';
  }): Promise<EmployeeProvidentFund>;
}

