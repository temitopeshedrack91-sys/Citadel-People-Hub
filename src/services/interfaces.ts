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
  EmployeeDocumentInput,
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
  PayrollExcelTemplate,
  PayrollExcelMapping,
  PayrollImportBatch,
  PayrollImportRow,
  PayrollAdjustment,
  AttendancePenaltyRule,
  EmployeeProrationRecord,
  ExcelPreviewResponse,
} from '../types';
import { AttendanceImportSnapshot, BiometricPunch, UnmatchedDeviceRecord } from '../features/attendance-import';

export interface BiometricImportBatchResult {
  totalRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  duplicateRecords: number;
  storedPunchCount: number;
  unmatchedDeviceIds: UnmatchedDeviceRecord[];
  importedAt: string;
  fileName: string;
}

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
  getBiometricPunchSnapshot?(employees: Employee[]): Promise<AttendanceImportSnapshot>;
  importBiometricPunches?(fileName: string, punches: BiometricPunch[]): Promise<BiometricImportBatchResult>;
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
  getEmployeeDocuments(employeeId: string, filter?: { category?: string }): Promise<HubDocument[]>;
  uploadEmployeeDocument(employeeId: string, doc: EmployeeDocumentInput, file: File): Promise<HubDocument>;
  replaceEmployeeDocument(employeeId: string, documentId: string, doc: EmployeeDocumentInput, file: File): Promise<HubDocument>;
  deleteEmployeeDocument(employeeId: string, documentId: string): Promise<void>;
  downloadEmployeeDocument(employeeId: string, documentId: string): Promise<Blob>;
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
  updateRequisitionStatus?(id: string, status: RecruitmentRequisition['status']): Promise<RecruitmentRequisition>;
  createOnboardingJourney?(journey: OnboardingJourney): Promise<OnboardingJourney>;
  getChecklistTemplates?(): Promise<OnboardingChecklistTemplate[]>;
  createChecklistTemplate?(template: OnboardingChecklistTemplate): Promise<OnboardingChecklistTemplate>;
}

export interface IPayrollRepository {
  // Salary Templates
  getSalaryTemplates(): Promise<SalaryTemplate[]>;
  createSalaryTemplate(template: Omit<SalaryTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<SalaryTemplate>;

  // Employee Assignments
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

  // Payroll Runs
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

  // Payslips
  getPayslip(id: string): Promise<PayrollItem>;
  markPayslipPaid(id: string, paymentMethod?: string): Promise<PayrollItem>;

  // Loans
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

  // Deductions
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

  // Provident Funds
  getProvidentFunds(): Promise<EmployeeProvidentFund[]>;
  createProvidentFund(data: {
    employee_id: string;
    employee_rate?: number;
    employer_rate?: number;
    status?: 'active' | 'inactive';
  }): Promise<EmployeeProvidentFund>;

  // Excel Payroll Templates
  getExcelTemplates(params?: { active_only?: boolean; entity_id?: string }): Promise<{ data: PayrollExcelTemplate[] }>;
  getImportBatches(): Promise<{ data: PayrollImportBatch[] }>;
  createExcelTemplate(template: Omit<PayrollExcelTemplate, 'id' | 'created_at' | 'updated_at' | 'creator' | 'entity' | 'import_batches' | 'mappings'> & { mappings?: any[] }): Promise<PayrollExcelTemplate>;
  getExcelTemplate(id: string): Promise<PayrollExcelTemplate>;
  updateExcelTemplate(id: string, updates: Partial<PayrollExcelTemplate>): Promise<PayrollExcelTemplate>;
  deleteExcelTemplate(id: string): Promise<void>;

  // Excel Upload & Import
  previewExcelUpload(file: File, templateId?: string): Promise<ExcelPreviewResponse>;
  importExcelPayroll(data: {
    file: File;
    template_id?: string;
    mappings: Array<{
      excel_column: string;
      payroll_field: string;
      field_type: 'earning' | 'deduction' | 'identifier' | 'info';
      calculation_type?: 'fixed' | 'percentage' | 'formula';
      default_value?: number;
      is_required?: boolean;
      is_identifier?: boolean;
      sort_order?: number;
    }>;
    save_as_template?: boolean;
    template_name?: string;
    import_options?: {
      proration_method?: 'calendar_days' | 'working_days';
      apply_attendance_penalties?: boolean;
      create_payroll_run?: boolean;
      period_start?: string;
      period_end?: string;
      pay_date?: string;
      pay_frequency?: 'monthly' | 'weekly';
    };
  }): Promise<PayrollImportBatch>;
  getImportBatch(id: string): Promise<PayrollImportBatch>;
  updateImportRow(id: string, updates: { employee_id?: string | null; mapped_data?: Record<string, any>; status?: string }): Promise<PayrollImportRow>;
  processImportBatch(id: string, options: {
    payroll_run_id?: string;
    create_payroll_run?: boolean;
    period_start?: string;
    period_end?: string;
    pay_date?: string;
    pay_frequency?: 'monthly' | 'weekly';
    proration_method?: 'calendar_days' | 'working_days';
    apply_attendance_penalties?: boolean;
  }): Promise<{ batch: PayrollImportBatch; payroll_run?: PayrollRun; processed_count: number }>;

  // Payroll Adjustments
  getAdjustments(filter?: { payroll_run_id?: string; employee_id?: string }): Promise<{ data: PayrollAdjustment[] }>;
  createAdjustment(adjustment: Omit<PayrollAdjustment, 'id' | 'created_at' | 'updated_at' | 'employee' | 'adjuster' | 'difference'>): Promise<PayrollAdjustment>;

  // Attendance Penalty Rules
  getPenaltyRules(params?: { entity_id?: string; active_only?: boolean }): Promise<AttendancePenaltyRule[]>;
  createPenaltyRule(rule: Omit<AttendancePenaltyRule, 'id' | 'created_at' | 'updated_at' | 'entity'>): Promise<AttendancePenaltyRule>;
  updatePenaltyRule(id: string, updates: Partial<AttendancePenaltyRule>): Promise<AttendancePenaltyRule>;
  deletePenaltyRule(id: string): Promise<void>;

  // Proration Records
  getProrationRecords(filter?: { payroll_run_id?: string; employee_id?: string }): Promise<{ data: EmployeeProrationRecord[] }>;
}

