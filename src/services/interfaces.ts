/**
 * Data Access Layer Interfaces
 * Citadel People Hub
 * 
 * These interfaces isolate view components from local demo storage or Laravel.
 */

import {
  Employee,
  EmployeeHierarchy,
  CitadelEntity,
  CitadelDepartment,
  LeaveRequest,
  LeaveBalanceRecord,
  LeaveCategoryRecord,
  TeamCalendarLeaveEvent,
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
  ExitRequest,
  ExitClearances,
  ExitInterviewDetails,
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
  getHierarchy(id: string): Promise<EmployeeHierarchy | null>;
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
  getCategories(): Promise<LeaveCategoryRecord[]>;
  getBalances(employeeId?: string): Promise<LeaveBalanceRecord[]>;
  getTeamCalendar(params?: { startDate?: string; endDate?: string }): Promise<TeamCalendarLeaveEvent[]>;
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
  toggleTaskCompletion(journeyId: string, taskId: string, isCompleted: boolean, version?: number): Promise<OnboardingJourney>;
  createOnboardingTask?(journeyId: string, task: Omit<OnboardingTask, 'id' | 'isCompleted'>, version?: number): Promise<OnboardingJourney>;
  reorderOnboardingTasks?(journeyId: string, taskIds: string[], version?: number): Promise<OnboardingJourney>;
  sendTaskReminder?(journeyId: string, taskId: string): Promise<boolean>;
  sendBulkTaskReminders?(journeyId: string): Promise<{ remindedCount: number; journey: OnboardingJourney }>;
  completeOnboardingJourney?(journeyId: string, version?: number): Promise<OnboardingJourney>;
  toggleDocumentSubmission?(journeyId: string, docId: string, isSubmitted: boolean, version?: number): Promise<OnboardingJourney>;
  toggleOrientationItem?(journeyId: string, itemId: string, isCompleted: boolean, version?: number): Promise<OnboardingJourney>;
  getRequisitions(): Promise<RecruitmentRequisition[]>;
  createRequisition?(requisition: RecruitmentRequisition): Promise<RecruitmentRequisition>;
  updateRequisitionStatus?(id: string, status: RecruitmentRequisition['status']): Promise<RecruitmentRequisition>;
  createOnboardingJourney?(journey: OnboardingJourney): Promise<OnboardingJourney>;
  getChecklistTemplates?(): Promise<OnboardingChecklistTemplate[]>;
  createChecklistTemplate?(template: OnboardingChecklistTemplate): Promise<OnboardingChecklistTemplate>;
  updateChecklistTemplate?(id: string, template: OnboardingChecklistTemplate, version?: number): Promise<OnboardingChecklistTemplate>;
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

export interface IClassificationRepository {
  getJobTitles(activeOnly?: boolean): Promise<import('../types').JobTitle[]>;
  createJobTitle(title: Partial<import('../types').JobTitle>): Promise<import('../types').JobTitle>;
  getPayGrades(activeOnly?: boolean): Promise<import('../types').PayGrade[]>;
  createPayGrade(grade: Partial<import('../types').PayGrade>): Promise<import('../types').PayGrade>;
}

export interface ITimesheetRepository {
  getTimesheets(filter?: { employeeId?: number; status?: string }): Promise<import('../types').Timesheet[]>;
  getTimesheet(id: number): Promise<import('../types').Timesheet>;
  saveDraftTimesheet(data: {
    employeeId: number;
    periodStart: string;
    periodEnd: string;
    items: import('../types').TimesheetItem[];
  }): Promise<import('../types').Timesheet>;
  submitTimesheet(id: number): Promise<import('../types').Timesheet>;
  approveTimesheet(id: number, comments?: string): Promise<import('../types').Timesheet>;
  rejectTimesheet(id: number, comments: string): Promise<import('../types').Timesheet>;
  resetTimesheet(id: number): Promise<import('../types').Timesheet>;
}

export interface IPerformanceRepository {
  getKpis(jobTitleId?: number): Promise<import('../types').Kpi[]>;
  createKpi(kpi: Partial<import('../types').Kpi>): Promise<import('../types').Kpi>;
  updateKpi(id: number, kpi: Partial<import('../types').Kpi>): Promise<import('../types').Kpi>;
  deleteKpi(id: number): Promise<void>;
  getReviews(filter?: { employeeId?: number; status?: string }): Promise<import('../types').PerformanceReview[]>;
  getReview(id: number): Promise<import('../types').PerformanceReview>;
  createReview(data: Partial<import('../types').PerformanceReview>): Promise<import('../types').PerformanceReview>;
  evaluateReview(
    id: number,
    data: {
      ratings: import('../types').ReviewRating[];
      reviewerComments?: string;
      employeeComments?: string;
      version?: number;
    }
  ): Promise<import('../types').PerformanceReview>;
  approveReview(id: number, version?: number): Promise<import('../types').PerformanceReview>;
}

export interface IOffboardingRepository {
  getAll(): Promise<ExitRequest[]>;
  create(payload: {
    employeeId: string;
    resignationDate: string;
    proposedLastDay: string;
    reason: string;
    managerId?: string;
  }): Promise<ExitRequest>;
  endorseByManager(id: string, payload?: { comments?: string; version?: number }): Promise<ExitRequest>;
  verifyNotice(id: string, payload?: { noticeCompliant?: boolean; contractNotes?: string; version?: number }): Promise<ExitRequest>;
  scheduleInterview(id: string, payload: ExitInterviewDetails & { version?: number }): Promise<ExitRequest>;
  updateClearance(
    id: string,
    department: keyof ExitClearances,
    cleared: boolean,
    payload?: { note?: string; version?: number }
  ): Promise<ExitRequest>;
  finalize(id: string, payload?: { settlementNotes?: string; version?: number }): Promise<ExitRequest>;
}

export interface IRecruitmentPipelineRepository {
  getVacancies(filter?: { activeOnly?: boolean; departmentId?: number }): Promise<import('../types').JobVacancy[]>;
  createVacancy(data: Partial<import('../types').JobVacancy>): Promise<import('../types').JobVacancy>;
  getCandidates(filter?: { vacancyId?: number; status?: string }): Promise<import('../types').Candidate[]>;
  createCandidate(data: Partial<import('../types').Candidate>): Promise<import('../types').Candidate>;
  updateCandidateStatus(id: number, status: string, notes?: string): Promise<import('../types').Candidate>;
  scheduleInterview(candidateId: number, data: Partial<import('../types').CandidateInterview>): Promise<import('../types').CandidateInterview>;
  updateInterviewResult(interviewId: number, result: 'Passed' | 'Failed', notes?: string): Promise<import('../types').CandidateInterview>;
}

export interface ITrainingRepository {
  getCourses(activeOnly?: boolean): Promise<import('../types').TrainingCourse[]>;
  createCourse(data: Partial<import('../types').TrainingCourse>): Promise<import('../types').TrainingCourse>;
  getSessions(filter?: { courseId?: number; status?: string }): Promise<import('../types').TrainingSession[]>;
  createSession(data: Partial<import('../types').TrainingSession>): Promise<import('../types').TrainingSession>;
  enrollEmployee(sessionId: number, employeeId: number): Promise<import('../types').EmployeeTraining>;
  updateEmployeeTraining(enrollmentId: number, data: Partial<import('../types').EmployeeTraining>): Promise<import('../types').EmployeeTraining>;
}

export interface IReportRepository {
  getWorkforceReport(): Promise<import('../types').WorkforceReport>;
  getLeaveReport(year?: number): Promise<import('../types').LeaveReport>;
  getAttendanceReport(params?: { startDate?: string; endDate?: string }): Promise<import('../types').AttendanceReport>;
  getRecruitmentReport(): Promise<import('../types').RecruitmentReport>;
}

export interface IClaimRepository {
  getClaimEvents(activeOnly?: boolean): Promise<import('../types').ClaimEvent[]>;
  createClaimEvent(data: Partial<import('../types').ClaimEvent>): Promise<import('../types').ClaimEvent>;
  getExpenseTypes(activeOnly?: boolean): Promise<import('../types').ExpenseType[]>;
  createExpenseType(data: Partial<import('../types').ExpenseType>): Promise<import('../types').ExpenseType>;
  getClaims(filter?: { employeeId?: string | number; status?: string; search?: string }): Promise<import('../types').ClaimRequest[]>;
  getClaim(id: string | number): Promise<import('../types').ClaimRequest>;
  createClaim(data: import('../types').CreateClaimRequestInput): Promise<import('../types').ClaimRequest>;
  addExpense(claimId: string | number, data: import('../types').CreateExpenseItemInput): Promise<import('../types').ClaimRequest>;
  deleteExpense(expenseId: string | number): Promise<import('../types').ClaimRequest>;
  performAction(claimId: string | number, action: import('../types').ClaimAction, reason?: string): Promise<import('../types').ClaimRequest>;
}


