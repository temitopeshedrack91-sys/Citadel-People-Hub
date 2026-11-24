/**
 * Persistent Mock Repository Implementation
 * Citadel People Hub
 * 
 * Implements data access interfaces with realistic async delays,
 * persistent localStorage caching across browser sessions and reloads,
 * and automatic audit logging.
 */

import {
  IEmployeeRepository,
  IOrganizationRepository,
  ILeaveRepository,
  IAttendanceRepository,
  IWorkflowRepository,
  IAuditRepository,
  IDocumentRepository,
  INotificationRepository,
  ITalentRepository,
  IPayrollRepository,
  IClassificationRepository,
  ITimesheetRepository,
  IPerformanceRepository,
  IRecruitmentPipelineRepository,
  ITrainingRepository,
  IReportRepository,
  IClaimRepository,
} from './interfaces';
import {
  Employee,
  CitadelEntity,
  CitadelDepartment,
  LeaveRequest,
  ClaimEvent,
  ExpenseType,
  ClaimRequest,
  ClaimExpense,
  ClaimAction,
  CreateClaimRequestInput,
  CreateExpenseItemInput,
  AttendanceRecord,
  WorkflowRequest,
  WorkflowStatus,
  WorkflowActionType,
  AuditLogEntry,
  EmployeeDocumentInput,
  HubDocument,
  SystemNotification,
  OnboardingJourney,
  OnboardingTask,
  OnboardingChecklistTemplate,
  RecruitmentRequisition,
  SalaryTemplate,
  EmployeeSalaryAssignment,
  JobTitle,
  PayGrade,
  Timesheet,
  TimesheetItem,
  Kpi,
  PerformanceReview,
  ReviewRating,
  JobVacancy,
  Candidate,
  CandidateInterview,
  TrainingCourse,
  TrainingSession,
  EmployeeTraining,
  WorkforceReport,
  LeaveReport,
  AttendanceReport,
  RecruitmentReport,
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
import {
  INITIAL_ENTITIES,
  INITIAL_DEPARTMENTS,
  INITIAL_EMPLOYEES,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_ATTENDANCE_SUMMARY,
  INITIAL_AUDIT_LOGS,
  INITIAL_ONBOARDING_JOURNEYS,
  DEFAULT_CHECKLIST_TEMPLATES,
  INITIAL_DOCUMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_RECRUITMENT,
} from '../data/mockData';
import {
  INITIAL_SALARY_TEMPLATES,
  INITIAL_PAYROLL_ASSIGNMENTS,
  INITIAL_PAYROLL_RUNS,
  INITIAL_EMPLOYEE_LOANS,
  INITIAL_EMPLOYEE_DEDUCTIONS,
  INITIAL_PROVIDENT_FUNDS,
  INITIAL_PAYROLL_EXCEL_TEMPLATES,
  INITIAL_PAYROLL_IMPORT_BATCHES,
  INITIAL_PAYROLL_ADJUSTMENTS,
  INITIAL_ATTENDANCE_PENALTY_RULES,
  INITIAL_PRORATION_RECORDS,
  INITIAL_PAYROLL_IMPORT_ROWS,
} from '../data/mockPayrollData';

// Persistent storage helpers
const loadStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`citadel_hub_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const saveStorage = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`citadel_hub_${key}`, JSON.stringify(value));
  } catch (err) {
    console.warn(`[Citadel Storage] Failed to persist ${key}:`, err);
  }
};

// State initialized from localStorage or initial seed data
let entities: CitadelEntity[] = loadStorage('entities', [...INITIAL_ENTITIES]);
let departments: CitadelDepartment[] = loadStorage('departments', [...INITIAL_DEPARTMENTS]);
let employees: Employee[] = loadStorage('employees', [...INITIAL_EMPLOYEES]);
let leaveRequests: LeaveRequest[] = loadStorage('leaves', [...INITIAL_LEAVE_REQUESTS]);
let auditLogs: AuditLogEntry[] = loadStorage('audit_logs', [...INITIAL_AUDIT_LOGS]);
let rawOnboarding = loadStorage<OnboardingJourney[]>('onboarding', [...INITIAL_ONBOARDING_JOURNEYS]);
let onboardingJourneys: OnboardingJourney[] =
  rawOnboarding.length > 0 && rawOnboarding.some((j) => j.id === 'onboard-samuel')
    ? rawOnboarding
    : [...INITIAL_ONBOARDING_JOURNEYS];
let checklistTemplates: OnboardingChecklistTemplate[] = loadStorage<OnboardingChecklistTemplate[]>(
  'checklist_templates',
  [...DEFAULT_CHECKLIST_TEMPLATES]
);

let rawDocs = loadStorage<HubDocument[]>('documents', [...INITIAL_DOCUMENTS]);
let documents: HubDocument[] =
  rawDocs.some((d) => d.id === 'doc-005')
    ? rawDocs
    : [...INITIAL_DOCUMENTS];
let notifications: SystemNotification[] = loadStorage('notifications', [...INITIAL_NOTIFICATIONS]);
let requisitions: RecruitmentRequisition[] = loadStorage('requisitions', [...INITIAL_RECRUITMENT]);
let salaryTemplates: SalaryTemplate[] = loadStorage('salary_templates', [...INITIAL_SALARY_TEMPLATES]);
let payrollAssignments: EmployeeSalaryAssignment[] = loadStorage('payroll_assignments', [...INITIAL_PAYROLL_ASSIGNMENTS]);
let payrollRuns: PayrollRun[] = loadStorage('payroll_runs', [...INITIAL_PAYROLL_RUNS]);
let employeeLoans: EmployeeLoan[] = loadStorage('employee_loans', [...INITIAL_EMPLOYEE_LOANS]);
let employeeDeductions: EmployeeDeduction[] = loadStorage('employee_deductions', [...INITIAL_EMPLOYEE_DEDUCTIONS]);
let providentFunds: EmployeeProvidentFund[] = loadStorage('provident_funds', [...INITIAL_PROVIDENT_FUNDS]);
let excelTemplates: PayrollExcelTemplate[] = loadStorage('excel_templates', [...INITIAL_PAYROLL_EXCEL_TEMPLATES]);
let importBatches: PayrollImportBatch[] = loadStorage('import_batches', [...INITIAL_PAYROLL_IMPORT_BATCHES]);
let payrollAdjustments: PayrollAdjustment[] = loadStorage('payroll_adjustments', [...INITIAL_PAYROLL_ADJUSTMENTS]);
let penaltyRules: AttendancePenaltyRule[] = loadStorage('penalty_rules', [...INITIAL_ATTENDANCE_PENALTY_RULES]);
let prorationRecords: EmployeeProrationRecord[] = loadStorage('proration_records', [...INITIAL_PRORATION_RECORDS]);

const sleep = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockEmployeeRepository implements IEmployeeRepository {
  async getAll(filter?: { entityId?: string; departmentId?: string; search?: string }): Promise<Employee[]> {
    await sleep();
    let result = [...employees];
    if (filter?.entityId) {
      result = result.filter((e) => e.entityId === filter.entityId);
    }
    if (filter?.departmentId) {
      result = result.filter((e) => e.departmentId === filter.departmentId);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.staffId.toLowerCase().includes(q) ||
          e.jobTitle.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
      );
    }
    return result;
  }

  async getById(id: string): Promise<Employee | null> {
    await sleep();
    return employees.find((e) => e.id === id) || null;
  }

  async create(newEmp: Omit<Employee, 'id'>): Promise<Employee> {
    await sleep();
    const created: Employee = {
      ...newEmp,
      id: `emp-${Date.now()}`,
    };
    employees.unshift(created);
    saveStorage('employees', employees);
    return created;
  }

  async update(id: string, updates: Partial<Employee>): Promise<Employee> {
    await sleep();
    const index = employees.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Employee not found');
    employees[index] = { ...employees[index], ...updates };
    saveStorage('employees', employees);
    return employees[index];
  }

  async delete(id: string): Promise<boolean> {
    await sleep();
    const initialLen = employees.length;
    employees = employees.filter((e) => e.id !== id);
    saveStorage('employees', employees);
    return employees.length < initialLen;
  }
}

export class MockOrganizationRepository implements IOrganizationRepository {
  async getEntities(): Promise<CitadelEntity[]> {
    await sleep();
    return [...entities];
  }

  async getDepartments(entityId?: string): Promise<CitadelDepartment[]> {
    await sleep();
    if (entityId) {
      return departments.filter((d) => d.entityId === entityId);
    }
    return [...departments];
  }

  async createDepartment(dept: Omit<CitadelDepartment, 'id'>): Promise<CitadelDepartment> {
    await sleep();
    const created: CitadelDepartment = {
      ...dept,
      id: `dept-${Date.now()}`,
    };
    departments.push(created);
    saveStorage('departments', departments);
    return created;
  }

  async updateDepartment(id: string, updates: Partial<CitadelDepartment>): Promise<CitadelDepartment> {
    await sleep();
    const index = departments.findIndex((d) => d.id === id);
    if (index === -1) throw new Error('Department not found');
    departments[index] = { ...departments[index], ...updates };
    saveStorage('departments', departments);
    return departments[index];
  }

  async toggleDepartmentStatus(id: string, isActive: boolean): Promise<CitadelDepartment> {
    return this.updateDepartment(id, { isActive });
  }

  async createEntity(entity: Omit<CitadelEntity, 'id'>): Promise<CitadelEntity> {
    await sleep();
    const created: CitadelEntity = {
      ...entity,
      id: `entity-${Date.now()}`,
    };
    entities.push(created);
    saveStorage('entities', entities);
    return created;
  }
}

export class MockLeaveRepository implements ILeaveRepository {
  async getAll(): Promise<LeaveRequest[]> {
    await sleep();
    return [...leaveRequests];
  }

  async getByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    await sleep();
    return leaveRequests.filter((l) => l.employeeId === employeeId);
  }

  async submitRequest(request: Omit<LeaveRequest, 'id' | 'appliedDate' | 'status'>): Promise<LeaveRequest> {
    await sleep();
    const newRequest: LeaveRequest = {
      ...request,
      totalDays: request.totalDays || request.daysRequested || 1,
      id: `leave-${Date.now()}`,
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'Submitted',
      approvalStage: request.approvalStage || 'DEPARTMENT_HEAD',
    };
    leaveRequests.unshift(newRequest);
    saveStorage('leaves', leaveRequests);
    return newRequest;
  }

  async updateStatus(
    requestId: string,
    status: WorkflowStatus,
    actorName: string,
    comments?: string
  ): Promise<LeaveRequest> {
    await sleep();
    const index = leaveRequests.findIndex((l) => l.id === requestId);
    if (index === -1) throw new Error('Leave request not found');

    const nextStage = status === 'Approved' ? 'COMPLETE' : status === 'Pending Review' ? 'HR' : leaveRequests[index].approvalStage;

    leaveRequests[index] = {
      ...leaveRequests[index],
      status,
      approvalStage: nextStage,
      approverComments: comments || `Actioned by ${actorName}`,
    };
    saveStorage('leaves', leaveRequests);
    return leaveRequests[index];
  }
}

export class MockAttendanceRepository implements IAttendanceRepository {
  private attendanceLogs: AttendanceRecord[] = loadStorage('attendance_logs', [
    {
      id: 'att-1',
      employeeId: 'emp-1',
      employeeStaffId: 'CGCC/004',
      employeeName: 'Dr. Bukola Adeleke',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentName: 'People, Culture & Change',
      date: new Date().toISOString().split('T')[0],
      clockInTime: '07:48 AM',
      status: 'Present',
      verificationSource: 'Biometric_ZKTeco',
      deviceId: 'DEV-ZK-01',
    },
    {
      id: 'att-2',
      employeeId: 'emp-2',
      employeeStaffId: 'CGCC/015',
      employeeName: 'Femi Olatunji',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentName: 'ICT',
      date: new Date().toISOString().split('T')[0],
      clockInTime: '08:02 AM',
      status: 'Present',
      verificationSource: 'Biometric_ZKTeco',
      deviceId: 'DEV-ZK-01',
    },
    {
      id: 'att-3',
      employeeId: 'emp-3',
      employeeStaffId: 'CGCC/072',
      employeeName: 'Blessing Okafor',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentName: 'People, Culture & Change',
      date: new Date().toISOString().split('T')[0],
      clockInTime: '08:24 AM',
      status: 'Late',
      verificationSource: 'Web_SelfService',
      notes: 'Traffic delay on Third Mainland Bridge',
    },
    {
      id: 'att-4',
      employeeId: 'emp-6',
      employeeStaffId: 'CH/018',
      employeeName: 'Chef Kolawole Briggs',
      entityName: 'Citadel Holdings',
      departmentName: 'Cafe',
      date: new Date().toISOString().split('T')[0],
      status: 'On Leave',
      verificationSource: 'Manual_PCCM',
    },
  ]);

  async getTodaySummary(): Promise<any> {
    await sleep();
    return { ...INITIAL_ATTENDANCE_SUMMARY };
  }

  async getRecentLogs(limit = 20): Promise<AttendanceRecord[]> {
    await sleep();
    return this.attendanceLogs.slice(0, limit);
  }

  async recordClockIn(
    employeeId: string,
    employeeName: string,
    staffId: string,
    entity: string,
    dept: string
  ): Promise<AttendanceRecord> {
    await sleep();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const record: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId,
      employeeStaffId: staffId,
      employeeName,
      entityName: entity,
      departmentName: dept,
      date: now.toISOString().split('T')[0],
      clockInTime: timeStr,
      status: 'Present',
      verificationSource: 'Web_SelfService',
    };
    this.attendanceLogs.unshift(record);
    saveStorage('attendance_logs', this.attendanceLogs);
    return record;
  }

  async recordClockOut(recordId: string): Promise<AttendanceRecord> {
    await sleep();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const record = this.attendanceLogs.find((r) => r.id === recordId) || {
      id: recordId,
      employeeId: 'self',
      employeeStaffId: 'CGCC/SELF',
      employeeName: 'Logged In User',
      entityName: 'Citadel',
      departmentName: 'Department',
      date: now.toISOString().split('T')[0],
      clockInTime: '08:00 AM',
      status: 'Present' as const,
      verificationSource: 'Web_SelfService' as const,
    };
    record.clockOutTime = timeStr;
    saveStorage('attendance_logs', this.attendanceLogs);
    return record;
  }
}

export class MockAuditRepository implements IAuditRepository {
  async getLogs(filter?: { module?: string; userId?: string; limit?: number }): Promise<AuditLogEntry[]> {
    await sleep();
    let result = [...auditLogs];
    if (filter?.module) {
      result = result.filter((l) => l.module === filter.module);
    }
    if (filter?.userId) {
      result = result.filter((l) => l.userId === filter.userId);
    }
    if (filter?.limit) {
      result = result.slice(0, filter.limit);
    }
    return result;
  }

  async logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const created: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    auditLogs.unshift(created);
    saveStorage('audit_logs', auditLogs);
    return created;
  }
}

export class MockDocumentRepository implements IDocumentRepository {
  async getAll(filter?: { category?: string; accessLevel?: string }): Promise<HubDocument[]> {
    await sleep();
    let result = [...documents];
    if (filter?.category) {
      result = result.filter((d) => d.category === filter.category);
    }
    if (filter?.accessLevel) {
      result = result.filter((d) => d.accessLevel === filter.accessLevel);
    }
    return result;
  }

  async uploadDocument(doc: Omit<HubDocument, 'id' | 'uploadedDate'>, _file?: File): Promise<HubDocument> {
    await sleep();
    const created: HubDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadedDate: new Date().toISOString().split('T')[0],
    };
    documents.unshift(created);
    saveStorage('documents', documents);
    return created;
  }

  async getEmployeeDocuments(employeeId: string, filter?: { category?: string }): Promise<HubDocument[]> {
    await sleep();
    return documents.filter(
      (document) =>
        document.employeeId === employeeId && (!filter?.category || document.category === filter.category)
    );
  }

  async uploadEmployeeDocument(
    employeeId: string,
    doc: EmployeeDocumentInput,
    file: File
  ): Promise<HubDocument> {
    await sleep();
    const created: HubDocument = {
      ...doc,
      employeeId,
      id: `doc-${Date.now()}`,
      accessLevel: 'Departmental',
      uploadedBy: 'Current User',
      isSensitive: true,
      version: doc.version ?? '1.0',
      uploadedDate: new Date().toISOString().split('T')[0],
      fileName: file.name,
      fileSize: file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`,
      fileType: file.type.split('/')[1]?.toUpperCase() || 'FILE',
      versionNumber: 1,
    };
    documents.unshift(created);
    saveStorage('documents', documents);
    return created;
  }

  async replaceEmployeeDocument(
    employeeId: string,
    documentId: string,
    doc: EmployeeDocumentInput,
    file: File
  ): Promise<HubDocument> {
    await sleep();
    const previous = documents.find((document) => document.id === documentId && document.employeeId === employeeId);
    if (!previous) throw new Error('Document not found');
    documents = documents.filter((document) => document.id !== documentId);
    const created: HubDocument = {
      ...doc,
      employeeId,
      id: `doc-${Date.now()}`,
      accessLevel: previous.accessLevel,
      uploadedBy: previous.uploadedBy,
      isSensitive: previous.isSensitive,
      version: doc.version ?? previous.version ?? '1.0',
      uploadedDate: new Date().toISOString().split('T')[0],
      fileName: file.name,
      fileSize: file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`,
      fileType: file.type.split('/')[1]?.toUpperCase() || 'FILE',
      versionNumber: (previous.versionNumber ?? 1) + 1,
      previousVersionId: previous.id,
    };
    documents.unshift(created);
    saveStorage('documents', documents);
    return created;
  }

  async deleteEmployeeDocument(employeeId: string, documentId: string): Promise<void> {
    await sleep();
    const exists = documents.some((document) => document.id === documentId && document.employeeId === employeeId);
    if (!exists) throw new Error('Document not found');
    documents = documents.filter((document) => document.id !== documentId);
    saveStorage('documents', documents);
  }

  async downloadEmployeeDocument(employeeId: string, documentId: string): Promise<Blob> {
    await sleep();
    const document = documents.find((item) => item.id === documentId && item.employeeId === employeeId);
    if (!document) throw new Error('Document not found');
    return new Blob([`${document.title}\n\nMock copy of ${document.fileName}.`], { type: 'text/plain' });
  }
}

export class MockNotificationRepository implements INotificationRepository {
  async getAll(): Promise<SystemNotification[]> {
    await sleep();
    return [...notifications];
  }

  async markAsRead(id: string): Promise<void> {
    await sleep();
    notifications = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    saveStorage('notifications', notifications);
  }

  async markAllAsRead(): Promise<void> {
    await sleep();
    notifications = notifications.map((n) => ({ ...n, isRead: true }));
    saveStorage('notifications', notifications);
  }
}

export class MockTalentRepository implements ITalentRepository {
  async getOnboardingJourneys(): Promise<OnboardingJourney[]> {
    await sleep();
    return [...onboardingJourneys];
  }

  async toggleTaskCompletion(
    journeyId: string,
    taskId: string,
    isCompleted: boolean
  ): Promise<OnboardingJourney> {
    await sleep();
    const jIndex = onboardingJourneys.findIndex((j) => j.id === journeyId);
    if (jIndex === -1) throw new Error('Journey not found');
    const journey = onboardingJourneys[jIndex];
    const taskIndex = journey.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) throw new Error('Task not found');

    journey.tasks[taskIndex].isCompleted = isCompleted;
    if (isCompleted) {
      journey.tasks[taskIndex].completedAt = new Date().toISOString().split('T')[0];
    } else {
      journey.tasks[taskIndex].completedAt = undefined;
    }

    const completedCount = journey.tasks.filter((t) => t.isCompleted).length;
    journey.overallProgressPercent = Math.round((completedCount / journey.tasks.length) * 100);
    if (journey.overallProgressPercent === 100) {
      journey.status = 'Completed';
    } else {
      journey.status = 'In Progress';
    }

    onboardingJourneys[jIndex] = { ...journey };
    saveStorage('onboarding', onboardingJourneys);
    return journey;
  }

  async createOnboardingTask(
    journeyId: string,
    newTask: Omit<OnboardingTask, 'id' | 'isCompleted'>
  ): Promise<OnboardingJourney> {
    await sleep();
    const jIndex = onboardingJourneys.findIndex((j) => j.id === journeyId);
    if (jIndex === -1) throw new Error('Journey not found');
    const journey = onboardingJourneys[jIndex];

    const task: OnboardingTask = {
      ...newTask,
      id: `task-custom-${Date.now()}`,
      isCompleted: false,
    };

    journey.tasks.push(task);
    const completedCount = journey.tasks.filter((t) => t.isCompleted).length;
    journey.overallProgressPercent = Math.round((completedCount / journey.tasks.length) * 100);

    onboardingJourneys[jIndex] = { ...journey };
    saveStorage('onboarding', onboardingJourneys);
    return journey;
  }

  async sendTaskReminder(journeyId: string, taskId: string): Promise<boolean> {
    await sleep();
    const journey = onboardingJourneys.find((j) => j.id === journeyId);
    if (!journey) return false;
    const task = journey.tasks.find((t) => t.id === taskId);
    if (!task) return false;

    task.reminderSentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    saveStorage('onboarding', onboardingJourneys);
    return true;
  }

  async toggleDocumentSubmission(
    journeyId: string,
    docId: string,
    isSubmitted: boolean
  ): Promise<OnboardingJourney> {
    await sleep();
    const jIndex = onboardingJourneys.findIndex((j) => j.id === journeyId);
    if (jIndex === -1) throw new Error('Journey not found');
    const journey = onboardingJourneys[jIndex];

    if (!journey.requiredDocuments) journey.requiredDocuments = [];
    const doc = journey.requiredDocuments.find((d) => d.id === docId);
    if (doc) {
      doc.isSubmitted = isSubmitted;
      doc.submittedAt = isSubmitted ? new Date().toISOString().split('T')[0] : undefined;
    }

    onboardingJourneys[jIndex] = { ...journey };
    saveStorage('onboarding', onboardingJourneys);
    return journey;
  }

  async toggleOrientationItem(
    journeyId: string,
    itemId: string,
    isCompleted: boolean
  ): Promise<OnboardingJourney> {
    await sleep();
    const jIndex = onboardingJourneys.findIndex((j) => j.id === journeyId);
    if (jIndex === -1) throw new Error('Journey not found');
    const journey = onboardingJourneys[jIndex];

    if (!journey.orientationItems) journey.orientationItems = [];
    const item = journey.orientationItems.find((i) => i.id === itemId);
    if (item) {
      item.isCompleted = isCompleted;
    }

    onboardingJourneys[jIndex] = { ...journey };
    saveStorage('onboarding', onboardingJourneys);
    return journey;
  }

  async getRequisitions(): Promise<RecruitmentRequisition[]> {
    await sleep();
    return [...requisitions];
  }

  async createRequisition(requisition: RecruitmentRequisition): Promise<RecruitmentRequisition> {
    await sleep();
    requisitions = [requisition, ...requisitions];
    saveStorage('requisitions', requisitions);
    return requisition;
  }

  async updateRequisitionStatus(
    id: string,
    status: RecruitmentRequisition['status']
  ): Promise<RecruitmentRequisition> {
    await sleep();
    const index = requisitions.findIndex((requisition) => requisition.id === id);
    if (index < 0) throw new Error(`Requisition ${id} not found`);
    const updated = { ...requisitions[index], status };
    requisitions[index] = updated;
    saveStorage('requisitions', requisitions);
    return updated;
  }

  async createOnboardingJourney(journey: OnboardingJourney): Promise<OnboardingJourney> {
    await sleep();
    onboardingJourneys = [journey, ...onboardingJourneys];
    saveStorage('onboarding', onboardingJourneys);
    return journey;
  }

  async getChecklistTemplates(): Promise<OnboardingChecklistTemplate[]> {
    await sleep();
    return [...checklistTemplates];
  }

  async createChecklistTemplate(template: OnboardingChecklistTemplate): Promise<OnboardingChecklistTemplate> {
    await sleep();
    checklistTemplates = [template, ...checklistTemplates];
    saveStorage('checklist_templates', checklistTemplates);
    return template;
  }
}

export class MockPayrollRepository implements IPayrollRepository {
  async getSalaryTemplates(): Promise<SalaryTemplate[]> {
    await sleep();
    return [...salaryTemplates];
  }

  async createSalaryTemplate(template: Omit<SalaryTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<SalaryTemplate> {
    await sleep();
    const newTemplate: SalaryTemplate = {
      ...template,
      id: `st-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    salaryTemplates = [newTemplate, ...salaryTemplates];
    saveStorage('salary_templates', salaryTemplates);
    return newTemplate;
  }

  async getAssignments(): Promise<EmployeeSalaryAssignment[]> {
    await sleep();
    return [...payrollAssignments];
  }

  async assignSalaryTemplate(assignment: {
    employee_id: string;
    salary_template_id: string;
    effective_date: string;
    override_basic_salary?: number | null;
    custom_allowances?: any[];
    custom_deductions?: any[];
    notes?: string;
  }): Promise<EmployeeSalaryAssignment> {
    await sleep();
    const matchedTemplate = salaryTemplates.find((t) => t.id === assignment.salary_template_id);
    const matchedEmployee = employees.find((e) => e.id === assignment.employee_id);

    const newAssignment: EmployeeSalaryAssignment = {
      id: `assign-${Date.now()}`,
      employee_id: assignment.employee_id,
      salary_template_id: assignment.salary_template_id,
      salary_template: matchedTemplate,
      employee: matchedEmployee
        ? {
            id: matchedEmployee.id,
            name: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
            staff_id: matchedEmployee.staffId,
            department_name: matchedEmployee.departmentName,
            job_title: matchedEmployee.jobTitle,
          }
        : undefined,
      effective_date: assignment.effective_date,
      basic_salary: assignment.override_basic_salary ?? matchedTemplate?.basic_salary ?? 0,
      override_basic_salary: assignment.override_basic_salary,
      custom_allowances: assignment.custom_allowances,
      custom_deductions: assignment.custom_deductions,
      is_active: true,
      notes: assignment.notes,
      created_at: new Date().toISOString(),
    };
    payrollAssignments = [newAssignment, ...payrollAssignments];
    saveStorage('payroll_assignments', payrollAssignments);
    return newAssignment;
  }

  async getPayrollRuns(): Promise<PayrollRun[]> {
    await sleep();
    return [...payrollRuns];
  }

  async getPayrollRun(id: string): Promise<PayrollRun> {
    await sleep();
    const match = payrollRuns.find((r) => r.id === id);
    if (match) return match;
    throw new Error(`Payroll run ${id} not found.`);
  }

  async generatePayrollRun(data: {
    title?: string;
    period_start: string;
    period_end: string;
    pay_date?: string;
    notes?: string;
  }): Promise<PayrollRun> {
    await sleep();
    const newRun: PayrollRun = {
      id: `run-${Date.now()}`,
      run_number: `PR-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`,
      title: data.title || `Payroll Run for ${data.period_start} to ${data.period_end}`,
      period_start: data.period_start,
      period_end: data.period_end,
      pay_date: data.pay_date || new Date().toISOString().split('T')[0],
      status: 'draft',
      currency: 'NGN',
      total_basic: 1690000,
      total_allowance: 975000,
      total_gross: 2665000,
      total_deduction: 423000,
      total_net: 2242000,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };
    payrollRuns = [newRun, ...payrollRuns];
    saveStorage('payroll_runs', payrollRuns);
    return newRun;
  }

  async finalizePayrollRun(id: string): Promise<PayrollRun> {
    await sleep();
    const match = payrollRuns.find((r) => r.id === id);
    if (match) {
      match.status = 'approved';
      saveStorage('payroll_runs', payrollRuns);
      return match;
    }
    throw new Error(`Payroll run ${id} not found.`);
  }

  async getPayslip(id: string): Promise<PayrollItem> {
    await sleep();
    const allItems = payrollRuns.flatMap((r) => r.items || []);
    const match = allItems.find((i) => i.id === id);
    if (match) return match;
    throw new Error(`Payslip ${id} not found.`);
  }

  async markPayslipPaid(id: string, paymentMethod?: string): Promise<PayrollItem> {
    await sleep();
    for (const r of payrollRuns) {
      if (r.items) {
        const item = r.items.find((i) => i.id === id);
        if (item) {
          item.payment_status = 'paid';
          item.payment_method = paymentMethod || 'Direct Bank Transfer';
          saveStorage('payroll_runs', payrollRuns);
          return item;
        }
      }
    }
    throw new Error(`Payslip ${id} not found.`);
  }

  async getLoans(filter?: { employee_id?: string; status?: string }): Promise<EmployeeLoan[]> {
    await sleep();
    let result = [...employeeLoans];
    if (filter?.employee_id) result = result.filter((l) => l.employee_id === filter.employee_id);
    if (filter?.status) result = result.filter((l) => l.status === filter.status);
    return result;
  }

  async createLoan(loan: {
    employee_id: string;
    loan_type: string;
    principal_amount: number;
    interest_rate?: number;
    monthly_installment: number;
    total_installments: number;
    disbursed_at?: string;
    notes?: string;
  }): Promise<EmployeeLoan> {
    await sleep();
    const matchedEmployee = employees.find((e) => e.id === loan.employee_id);
    const totalPayable = loan.principal_amount * (1 + (loan.interest_rate || 0) / 100);

    const newLoan: EmployeeLoan = {
      id: `loan-${Date.now()}`,
      employee_id: loan.employee_id,
      employee: matchedEmployee
        ? {
            id: matchedEmployee.id,
            name: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
            staff_id: matchedEmployee.staffId,
            department_name: matchedEmployee.departmentName,
          }
        : undefined,
      loan_number: `LN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      loan_type: loan.loan_type,
      principal_amount: loan.principal_amount,
      interest_rate: loan.interest_rate || 0,
      total_payable: totalPayable,
      monthly_installment: loan.monthly_installment,
      total_installments: loan.total_installments,
      paid_installments: 0,
      remaining_balance: totalPayable,
      status: 'pending',
      disbursed_at: loan.disbursed_at,
      notes: loan.notes,
      created_at: new Date().toISOString(),
    };
    employeeLoans = [newLoan, ...employeeLoans];
    saveStorage('employee_loans', employeeLoans);
    return newLoan;
  }

  async approveLoan(id: string): Promise<EmployeeLoan> {
    await sleep();
    const loan = employeeLoans.find((l) => l.id === id);
    if (loan) {
      loan.status = 'active';
      saveStorage('employee_loans', employeeLoans);
      return loan;
    }
    throw new Error(`Loan ${id} not found.`);
  }

  async getDeductions(filter?: { employee_id?: string }): Promise<EmployeeDeduction[]> {
    await sleep();
    let result = [...employeeDeductions];
    if (filter?.employee_id) result = result.filter((d) => d.employee_id === filter.employee_id);
    return result;
  }

  async createDeduction(deduction: {
    employee_id: string;
    title: string;
    deduction_type: string;
    amount: number;
    is_percentage?: boolean;
    start_date: string;
    end_date?: string | null;
    is_recurring?: boolean;
    calculation_type?: 'fixed' | 'percent';
    frequency?: 'monthly' | 'weekly' | 'one_time';
  }): Promise<EmployeeDeduction> {
    await sleep();
    const newDed: EmployeeDeduction = {
      id: `ded-${Date.now()}`,
      employee_id: deduction.employee_id,
      title: deduction.title,
      deduction_type: deduction.deduction_type,
      calculation_type: deduction.calculation_type ?? 'fixed',
      amount: deduction.amount,
      is_percentage: !!deduction.is_percentage,
      start_date: deduction.start_date,
      end_date: deduction.end_date,
      frequency: deduction.frequency ?? 'monthly',
      is_recurring: deduction.is_recurring ?? true,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    employeeDeductions = [newDed, ...employeeDeductions];
    saveStorage('employee_deductions', employeeDeductions);
    return newDed;
  }

  async getProvidentFunds(): Promise<EmployeeProvidentFund[]> {
    await sleep();
    return [...providentFunds];
  }

  async createProvidentFund(data: {
    employee_id: string;
    employee_rate?: number;
    employer_rate?: number;
    status?: 'active' | 'inactive';
  }): Promise<EmployeeProvidentFund> {
    await sleep();
    const newPf: EmployeeProvidentFund = {
      id: `pf-${Date.now()}`,
      employee_id: data.employee_id,
      employee_rate: data.employee_rate ?? 8.0,
      employer_rate: data.employer_rate ?? 10.0,
      total_employee_contribution: 0,
      total_employer_contribution: 0,
      current_balance: 0,
      status: data.status || 'active',
      created_at: new Date().toISOString(),
    };
    providentFunds = [newPf, ...providentFunds];
    saveStorage('provident_funds', providentFunds);
    return newPf;
  }

  async getExcelTemplates(params?: { active_only?: boolean; entity_id?: string }): Promise<{ data: PayrollExcelTemplate[] }> {
    await sleep();
    let result = [...excelTemplates];
    if (params?.active_only) {
      result = result.filter((t) => t.is_active);
    }
    if (params?.entity_id) {
      result = result.filter((t) => t.entity_id === params.entity_id);
    }
    return { data: result };
  }

  async createExcelTemplate(template: Omit<PayrollExcelTemplate, 'id' | 'created_at' | 'updated_at' | 'creator' | 'entity' | 'import_batches' | 'mappings'> & { mappings?: any[] }): Promise<PayrollExcelTemplate> {
    await sleep();
    const newTemplate: PayrollExcelTemplate = {
      ...template,
      id: `ext-${Date.now()}`,
      creator: undefined,
      entity: undefined,
      import_batches: [],
      mappings: template.mappings || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as PayrollExcelTemplate;
    excelTemplates = [newTemplate, ...excelTemplates];
    saveStorage('excel_templates', excelTemplates);
    return newTemplate;
  }

  async getExcelTemplate(id: string): Promise<PayrollExcelTemplate> {
    await sleep();
    const match = excelTemplates.find((t) => t.id === id);
    if (match) return match;
    throw new Error(`Excel template ${id} not found.`);
  }

  async updateExcelTemplate(id: string, updates: Partial<PayrollExcelTemplate>): Promise<PayrollExcelTemplate> {
    await sleep();
    const index = excelTemplates.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Excel template not found');
    excelTemplates[index] = { ...excelTemplates[index], ...updates, updated_at: new Date().toISOString() };
    saveStorage('excel_templates', excelTemplates);
    return excelTemplates[index];
  }

  async deleteExcelTemplate(id: string): Promise<void> {
    await sleep();
    excelTemplates = excelTemplates.filter((t) => t.id !== id);
    saveStorage('excel_templates', excelTemplates);
  }

  async previewExcelUpload(file: File, templateId?: string): Promise<any> {
    await sleep();
    return {
      headers: ['staff_id', 'basic_salary', 'housing_allowance'],
      rows: [
        { staff_id: 'CIT-001', basic_salary: 850000, housing_allowance: 350000 },
        { staff_id: 'CIT-002', basic_salary: 520000, housing_allowance: 200000 },
      ],
      total_rows: 2,
      valid_rows: 2,
      error_rows: 0,
      template: templateId ? excelTemplates.find((t) => t.id === templateId) : undefined,
    };
  }

  async importExcelPayroll(data: any): Promise<any> {
    await sleep();
    return {
      id: `import-${Date.now()}`,
      template_id: data.template_id,
      original_filename: data.file?.name || 'upload.xlsx',
      uploaded_by: 'emp-002',
      status: 'preview',
      total_rows: 2,
      valid_rows: 2,
      error_rows: 0,
      warning_rows: 0,
      validation_errors: null,
      validation_warnings: null,
      import_options: data.import_options,
      payroll_run_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async getImportBatch(id: string): Promise<any> {
    await sleep();
    throw new Error(`Import batch ${id} not found.`);
  }

  async updateImportRow(id: string, updates: { employee_id?: string | null; mapped_data?: Record<string, any>; status?: string }): Promise<any> {
    await sleep();
    return { id, ...updates };
  }

  async processImportBatch(id: string, options: {
    payroll_run_id?: string;
    create_payroll_run?: boolean;
    period_start?: string;
    period_end?: string;
  }): Promise<any> {
    await sleep();
    return { id, status: 'processing', ...options };
  }

  async getImportBatches(): Promise<{ data: PayrollImportBatch[] }> {
    await sleep();
    return { data: [...importBatches] };
  }

  async getAdjustments(filter?: { payroll_run_id?: string; employee_id?: string }): Promise<{ data: PayrollAdjustment[] }> {
    await sleep();
    let result = [...payrollAdjustments];
    if (filter?.payroll_run_id) {
      result = result.filter((a) => a.payroll_run_id === filter.payroll_run_id);
    }
    if (filter?.employee_id) {
      result = result.filter((a) => a.employee_id === filter.employee_id);
    }
    return { data: result };
  }

  async createAdjustment(adjustment: Omit<PayrollAdjustment, 'id' | 'created_at' | 'updated_at' | 'employee' | 'adjuster' | 'difference'>): Promise<PayrollAdjustment> {
    await sleep();
    const newAdjustment: PayrollAdjustment = {
      ...adjustment,
      id: `adj-${Date.now()}`,
      difference: adjustment.adjusted_value - adjustment.original_value,
      employee: undefined,
      adjuster: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    payrollAdjustments = [newAdjustment, ...payrollAdjustments];
    saveStorage('payroll_adjustments', payrollAdjustments);
    return newAdjustment;
  }

  async getPenaltyRules(params?: { entity_id?: string; active_only?: boolean }): Promise<AttendancePenaltyRule[]> {
    await sleep();
    let result = [...penaltyRules];
    if (params?.entity_id) {
      result = result.filter((r) => r.entity_id === params.entity_id);
    }
    if (params?.active_only) {
      result = result.filter((r) => r.is_active);
    }
    return result;
  }

  async createPenaltyRule(rule: Omit<AttendancePenaltyRule, 'id' | 'created_at' | 'updated_at' | 'entity'>): Promise<AttendancePenaltyRule> {
    await sleep();
    const newRule: AttendancePenaltyRule = {
      ...rule,
      id: `pen-${Date.now()}`,
      entity: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    penaltyRules = [newRule, ...penaltyRules];
    saveStorage('penalty_rules', penaltyRules);
    return newRule;
  }

  async updatePenaltyRule(id: string, updates: Partial<AttendancePenaltyRule>): Promise<AttendancePenaltyRule> {
    await sleep();
    const index = penaltyRules.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Penalty rule not found');
    penaltyRules[index] = { ...penaltyRules[index], ...updates, updated_at: new Date().toISOString() };
    saveStorage('penalty_rules', penaltyRules);
    return penaltyRules[index];
  }

  async deletePenaltyRule(id: string): Promise<void> {
    await sleep();
    penaltyRules = penaltyRules.filter((r) => r.id !== id);
    saveStorage('penalty_rules', penaltyRules);
  }

  async getProrationRecords(filter?: { payroll_run_id?: string; employee_id?: string }): Promise<{ data: EmployeeProrationRecord[] }> {
    await sleep();
    let result = [...prorationRecords];
    if (filter?.payroll_run_id) {
      result = result.filter((r) => r.payroll_run_id === filter.payroll_run_id);
    }
    if (filter?.employee_id) {
      result = result.filter((r) => r.employee_id === filter.employee_id);
    }
    return { data: result };
  }

  async getImportBatchRows(batchId: string): Promise<PayrollImportRow[]> {
    await sleep();
    return INITIAL_PAYROLL_IMPORT_ROWS.filter((r) => r.batch_id === batchId);
  }
}

export class MockClassificationRepository implements IClassificationRepository {
  private jobTitles: JobTitle[] = [
    { id: 1, title: 'Lead Software Architect', minExperienceYears: 8, isActive: true },
    { id: 2, title: 'Senior Systems Engineer', minExperienceYears: 5, isActive: true },
    { id: 3, title: 'HR Business Partner', minExperienceYears: 4, isActive: true },
    { id: 4, title: 'Chief Financial Officer', minExperienceYears: 12, isActive: true },
  ];

  private payGrades: PayGrade[] = [
    { id: 1, name: 'Grade 1 - Executive', currency: 'NGN', minSalary: 3500000, maxSalary: 6000000, isActive: true },
    { id: 2, name: 'Grade 2 - Senior Management', currency: 'NGN', minSalary: 2000000, maxSalary: 3400000, isActive: true },
    { id: 3, name: 'Grade 3 - Professional & Tech', currency: 'NGN', minSalary: 1200000, maxSalary: 2200000, isActive: true },
  ];

  async getJobTitles(activeOnly: boolean = true): Promise<JobTitle[]> {
    await sleep();
    return activeOnly ? this.jobTitles.filter((j) => j.isActive) : [...this.jobTitles];
  }

  async createJobTitle(title: Partial<JobTitle>): Promise<JobTitle> {
    await sleep();
    const newTitle: JobTitle = {
      id: Date.now(),
      title: title.title || 'Untitled',
      description: title.description,
      minExperienceYears: title.minExperienceYears ?? 0,
      isActive: title.isActive ?? true,
    };
    this.jobTitles.push(newTitle);
    return newTitle;
  }

  async getPayGrades(activeOnly: boolean = true): Promise<PayGrade[]> {
    await sleep();
    return activeOnly ? this.payGrades.filter((p) => p.isActive) : [...this.payGrades];
  }

  async createPayGrade(grade: Partial<PayGrade>): Promise<PayGrade> {
    await sleep();
    const newGrade: PayGrade = {
      id: Date.now(),
      name: grade.name || 'Untitled Grade',
      currency: grade.currency || 'NGN',
      minSalary: grade.minSalary ?? 0,
      maxSalary: grade.maxSalary ?? 0,
      isActive: grade.isActive ?? true,
    };
    this.payGrades.push(newGrade);
    return newGrade;
  }
}

export class MockTimesheetRepository implements ITimesheetRepository {
  private timesheets: Timesheet[] = [
    {
      id: 1,
      employeeId: 1,
      employeeName: 'Engr. Femi Olatunji',
      employeeStaffId: 'STF-001',
      periodStart: '2026-11-02',
      periodEnd: '2026-11-08',
      status: 'SUBMITTED',
      totalHours: 40,
      items: [
        { activityName: 'Platform Security Architecture', date: '2026-11-02', durationHours: 8 },
        { activityName: 'Core HRM Module Integration', date: '2026-11-03', durationHours: 8 },
        { activityName: 'Code Reviews & Sprint Planning', date: '2026-11-04', durationHours: 8 },
        { activityName: 'Biometric Integration Sync', date: '2026-11-05', durationHours: 8 },
        { activityName: 'System Testing & Optimization', date: '2026-11-06', durationHours: 8 },
      ],
    },
  ];

  async getTimesheets(filter?: { employeeId?: number; status?: string }): Promise<Timesheet[]> {
    await sleep();
    let res = [...this.timesheets];
    if (filter?.employeeId) res = res.filter((t) => t.employeeId === filter.employeeId);
    if (filter?.status) res = res.filter((t) => t.status === filter.status);
    return res;
  }

  async getTimesheet(id: number): Promise<Timesheet> {
    await sleep();
    const ts = this.timesheets.find((t) => t.id === id);
    if (!ts) throw new Error('Timesheet not found');
    return ts;
  }

  async saveDraftTimesheet(data: {
    employeeId: number;
    periodStart: string;
    periodEnd: string;
    items: TimesheetItem[];
  }): Promise<Timesheet> {
    await sleep();
    const totalHours = data.items.reduce((sum, item) => sum + (item.durationHours || 0), 0);
    const newTs: Timesheet = {
      id: Date.now(),
      employeeId: data.employeeId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      status: 'DRAFT',
      totalHours,
      items: data.items,
    };
    this.timesheets.push(newTs);
    return newTs;
  }

  async submitTimesheet(id: number): Promise<Timesheet> {
    await sleep();
    const ts = await this.getTimesheet(id);
    ts.status = 'SUBMITTED';
    ts.submittedAt = new Date().toISOString();
    return ts;
  }

  async approveTimesheet(id: number, comments?: string): Promise<Timesheet> {
    await sleep();
    const ts = await this.getTimesheet(id);
    ts.status = 'APPROVED';
    ts.approvedAt = new Date().toISOString();
    ts.comments = comments;
    return ts;
  }

  async rejectTimesheet(id: number, comments: string): Promise<Timesheet> {
    await sleep();
    const ts = await this.getTimesheet(id);
    ts.status = 'REJECTED';
    ts.comments = comments;
    return ts;
  }

  async resetTimesheet(id: number): Promise<Timesheet> {
    await sleep();
    const ts = await this.getTimesheet(id);
    ts.status = 'DRAFT';
    return ts;
  }
}

export class MockPerformanceRepository implements IPerformanceRepository {
  private kpis: Kpi[] = [
    { id: 1, indicator: 'Quarterly Sprint Delivery & Reliability', minRating: 1, maxRating: 5, weight: 40, isActive: true },
    { id: 2, indicator: 'Architecture Integrity & Code Review Coverage', minRating: 1, maxRating: 5, weight: 30, isActive: true },
    { id: 3, indicator: 'Mentorship & Engineering Governance', minRating: 1, maxRating: 5, weight: 30, isActive: true },
  ];

  private reviews: PerformanceReview[] = [
    {
      id: 1,
      employeeId: 1,
      employeeName: 'Engr. Femi Olatunji',
      reviewerId: 2,
      reviewerName: 'Dr. Stella Adeleke',
      reviewPeriodStart: '2026-01-01',
      reviewPeriodEnd: '2026-06-30',
      dueDate: '2026-07-15',
      status: 'EVALUATED',
      finalRating: 4.8,
      reviewerComments: 'Exceeded strategic milestone commitments consistently.',
      ratings: [
        { kpiId: 1, kpiTitle: 'Quarterly Sprint Delivery & Reliability', rating: 5, comment: 'Flawless execution' },
        { kpiId: 2, kpiTitle: 'Architecture Integrity & Code Review Coverage', rating: 4.8, comment: 'High quality standards' },
      ],
    },
  ];

  async getKpis(): Promise<Kpi[]> {
    await sleep();
    return [...this.kpis];
  }

  async createKpi(kpi: Partial<Kpi>): Promise<Kpi> {
    await sleep();
    const newKpi: Kpi = {
      id: Date.now(),
      indicator: kpi.indicator || 'Untitled KPI',
      minRating: kpi.minRating ?? 1,
      maxRating: kpi.maxRating ?? 5,
      weight: kpi.weight ?? 100,
      isActive: kpi.isActive ?? true,
    };
    this.kpis.push(newKpi);
    return newKpi;
  }

  async updateKpi(id: number, kpi: Partial<Kpi>): Promise<Kpi> {
    await sleep();
    const existing = this.kpis.find((k) => k.id === id);
    if (!existing) throw new Error('KPI not found');
    Object.assign(existing, kpi);
    return existing;
  }

  async deleteKpi(id: number): Promise<void> {
    await sleep();
    this.kpis = this.kpis.filter((k) => k.id !== id);
  }

  async getReviews(): Promise<PerformanceReview[]> {
    await sleep();
    return [...this.reviews];
  }

  async getReview(id: number): Promise<PerformanceReview> {
    await sleep();
    const rev = this.reviews.find((r) => r.id === id);
    if (!rev) throw new Error('Review not found');
    return rev;
  }

  async createReview(data: Partial<PerformanceReview>): Promise<PerformanceReview> {
    await sleep();
    const newRev: PerformanceReview = {
      id: Date.now(),
      employeeId: data.employeeId || 1,
      reviewerId: data.reviewerId || 2,
      reviewPeriodStart: data.reviewPeriodStart || '2026-01-01',
      reviewPeriodEnd: data.reviewPeriodEnd || '2026-06-30',
      dueDate: data.dueDate || '2026-07-15',
      status: 'IN_PROGRESS',
      ratings: data.ratings || [],
    };
    this.reviews.push(newRev);
    return newRev;
  }

  async evaluateReview(
    id: number,
    data: { ratings: ReviewRating[]; reviewerComments?: string; employeeComments?: string }
  ): Promise<PerformanceReview> {
    await sleep();
    const rev = await this.getReview(id);
    rev.ratings = data.ratings;
    rev.reviewerComments = data.reviewerComments;
    rev.employeeComments = data.employeeComments;
    const totalWeighted = data.ratings.reduce((sum, r) => sum + r.rating * ((r as any).weight || 100), 0);
    const totalWeight = data.ratings.reduce((sum, r) => sum + ((r as any).weight || 100), 0);
    const avg = totalWeight > 0 ? totalWeighted / totalWeight : 0;
    rev.finalRating = Number(avg.toFixed(2));
    rev.status = 'EVALUATED';
    return rev;
  }

  async approveReview(id: number): Promise<PerformanceReview> {
    await sleep();
    const rev = await this.getReview(id);
    rev.status = 'APPROVED';
    rev.completedAt = new Date().toISOString();
    return rev;
  }
}

export class MockRecruitmentPipelineRepository implements IRecruitmentPipelineRepository {
  private vacancies: JobVacancy[] = loadStorage('recruitment_vacancies', [
    { id: 1, title: 'Lead Full-Stack Systems Architect', positionsCount: 2, status: 'Active', candidateCount: 8, createdAt: '2026-11-01' },
    { id: 2, title: 'Senior Talent Acquisition Manager', positionsCount: 1, status: 'Active', candidateCount: 4, createdAt: '2026-11-03' },
    { id: 3, title: 'Payroll & Treasury Specialist', positionsCount: 1, status: 'Active', candidateCount: 5, createdAt: '2026-11-05' },
  ]);

  private candidates: Candidate[] = loadStorage('recruitment_candidates', [
    {
      id: 1,
      vacancyId: 1,
      vacancyTitle: 'Lead Full-Stack Systems Architect',
      departmentName: 'ICT',
      firstName: 'Babatunde',
      lastName: 'Adegoke',
      fullName: 'Babatunde Adegoke',
      email: 'babatunde.adegoke@example.com',
      phone: '+234 803 111 2233',
      status: 'Shortlisted',
      appliedDate: '2026-11-05',
      notes: 'Strong enterprise systems architecture and API design experience.',
      interviews: [],
    },
    {
      id: 2,
      vacancyId: 1,
      vacancyTitle: 'Lead Full-Stack Systems Architect',
      departmentName: 'ICT',
      firstName: 'Amina',
      lastName: 'Bello',
      fullName: 'Amina Bello',
      email: 'amina.bello@example.com',
      phone: '+234 802 334 5566',
      status: 'Interview Scheduled',
      appliedDate: '2026-11-06',
      notes: 'High technical aptitude in backend scalability and microservices.',
      interviews: [
        {
          id: 101,
          title: 'Stage 1: Physical Technical Interview',
          interviewerName: 'Pastor Segun Bakare (ICT)',
          scheduledDate: '2026-11-28',
          scheduledTime: '10:00 AM',
          result: 'Pending',
          notes: 'Citadel Boardroom - Architecture whiteboard and system security.',
        },
      ],
    },
    {
      id: 3,
      vacancyId: 2,
      vacancyTitle: 'Senior Talent Acquisition Manager',
      departmentName: 'People, Culture & Change',
      firstName: 'Chidinma',
      lastName: 'Okafor',
      fullName: 'Chidinma Okafor',
      email: 'chidinma.okafor@example.com',
      phone: '+234 805 778 9900',
      status: 'Interview Passed',
      appliedDate: '2026-10-25',
      notes: 'Ex-Big4 HR recruiter. Passed both physical technical and virtual competency interviews.',
      interviews: [
        {
          id: 102,
          title: 'Stage 1: Technical Panel Assessment',
          interviewerName: 'Sussan Afuwape (PCCM)',
          scheduledDate: '2026-11-10',
          result: 'Passed',
          notes: 'Demonstrated exceptional knowledge of CGCC hiring workflows and talent acquisition metrics.',
        },
        {
          id: 103,
          title: 'Stage 2: Virtual Competency Assessment',
          interviewerName: 'Pastor Biola Adeyoola',
          scheduledDate: '2026-11-14',
          result: 'Passed',
          notes: 'Clear cultural alignment with CGCC faith and institutional values.',
        },
      ],
    },
    {
      id: 4,
      vacancyId: 3,
      vacancyTitle: 'Payroll & Treasury Specialist',
      departmentName: 'Finance',
      firstName: 'Olumide',
      lastName: 'Johnson',
      fullName: 'Olumide Johnson',
      email: 'olumide.johnson@example.com',
      phone: '+234 809 123 4567',
      status: 'Job Offered',
      appliedDate: '2026-10-20',
      notes: 'Formal offer extended following unanimous GEC approval.',
      interviews: [
        {
          id: 104,
          title: 'Stage 1: Physical Technical Interview',
          interviewerName: 'Stephen Anuforo (Finance & Accounts)',
          scheduledDate: '2026-11-04',
          result: 'Passed',
          notes: 'Verified mastery of Nigerian tax schedules, PAYE, and Pension Reform Act.',
        },
      ],
    },
    {
      id: 5,
      vacancyId: 1,
      vacancyTitle: 'Lead Full-Stack Systems Architect',
      departmentName: 'ICT',
      firstName: 'Emeka',
      lastName: 'Nnamdi',
      fullName: 'Emeka Nnamdi',
      email: 'emeka.nnamdi@example.com',
      phone: '+234 808 654 3210',
      status: 'Application Initiated',
      appliedDate: '2026-11-18',
      notes: 'Submitted resume via CGCC Careers Portal.',
      interviews: [],
    },
  ]);

  async getVacancies(): Promise<JobVacancy[]> {
    await sleep();
    return [...this.vacancies];
  }

  async createVacancy(data: Partial<JobVacancy>): Promise<JobVacancy> {
    await sleep();
    const newVac: JobVacancy = {
      id: Date.now(),
      title: data.title || 'Untitled Vacancy',
      positionsCount: data.positionsCount ?? 1,
      status: data.status || 'Active',
      candidateCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.vacancies.push(newVac);
    saveStorage('recruitment_vacancies', this.vacancies);
    return newVac;
  }

  async getCandidates(): Promise<Candidate[]> {
    await sleep();
    return [...this.candidates];
  }

  async createCandidate(data: Partial<Candidate>): Promise<Candidate> {
    await sleep();
    const newCand: Candidate = {
      id: Date.now(),
      vacancyId: data.vacancyId || 1,
      vacancyTitle: data.vacancyTitle || 'General Vacancy',
      departmentName: data.departmentName || 'General',
      firstName: data.firstName || 'Candidate',
      lastName: data.lastName || 'Name',
      fullName: `${data.firstName || 'Candidate'} ${data.lastName || 'Name'}`,
      email: data.email || 'candidate@example.com',
      phone: data.phone || '',
      status: (data.status as any) || 'Application Initiated',
      appliedDate: data.appliedDate || new Date().toISOString().split('T')[0],
      notes: data.notes || '',
      interviews: [],
    };
    this.candidates.unshift(newCand);
    saveStorage('recruitment_candidates', this.candidates);
    return newCand;
  }

  async updateCandidateStatus(id: number, status: string, notes?: string): Promise<Candidate> {
    await sleep();
    const cand = this.candidates.find((c) => c.id === id);
    if (!cand) throw new Error('Candidate not found');
    cand.status = status as any;
    if (notes) {
      cand.notes = cand.notes ? `${cand.notes}\n[${status}]: ${notes}` : `[${status}]: ${notes}`;
    }
    saveStorage('recruitment_candidates', this.candidates);
    return cand;
  }

  async scheduleInterview(candidateId: number, data: Partial<CandidateInterview>): Promise<CandidateInterview> {
    await sleep();
    const cand = this.candidates.find((c) => c.id === candidateId);
    if (!cand) throw new Error('Candidate not found');

    const newInterview: CandidateInterview = {
      id: Date.now(),
      title: data.title || 'Stage 1: Physical Technical Interview',
      interviewerName: data.interviewerName || 'Hiring Manager',
      scheduledDate: data.scheduledDate || new Date().toISOString().split('T')[0],
      scheduledTime: data.scheduledTime || '10:00 AM',
      result: 'Pending',
      notes: data.notes || '',
    };
    cand.interviews = cand.interviews || [];
    cand.interviews.push(newInterview);
    cand.status = 'Interview Scheduled';
    saveStorage('recruitment_candidates', this.candidates);
    return newInterview;
  }

  async updateInterviewResult(interviewId: number, result: 'Passed' | 'Failed', notes?: string): Promise<CandidateInterview> {
    await sleep();
    for (const cand of this.candidates) {
      const interview = (cand.interviews || []).find((i) => i.id === interviewId);
      if (interview) {
        interview.result = result;
        if (notes) interview.notes = notes;
        cand.status = result === 'Passed' ? 'Interview Passed' : 'Interview Failed';
        saveStorage('recruitment_candidates', this.candidates);
        return interview;
      }
    }
    return {
      id: interviewId,
      title: 'Interview',
      scheduledDate: '2026-12-01',
      result,
      notes,
    };
  }
}

export class MockTrainingRepository implements ITrainingRepository {
  private courses: TrainingCourse[] = [
    { id: 1, title: 'Information Security & Data Privacy', code: 'SEC-101', durationHours: 12, isActive: true, sessionsCount: 2 },
    { id: 2, title: 'Enterprise Leadership & People Operations', code: 'LEAD-201', durationHours: 24, isActive: true, sessionsCount: 1 },
  ];

  private sessions: TrainingSession[] = [
    {
      id: 1,
      courseId: 1,
      courseTitle: 'Information Security & Data Privacy',
      sessionName: 'Q4 Citadel Security Workshop',
      startDate: '2026-12-05',
      endDate: '2026-12-06',
      deliveryMethod: 'Hybrid',
      maxCapacity: 25,
      enrolledCount: 18,
      status: 'Scheduled',
    },
  ];

  async getCourses(): Promise<TrainingCourse[]> {
    await sleep();
    return [...this.courses];
  }

  async createCourse(data: Partial<TrainingCourse>): Promise<TrainingCourse> {
    await sleep();
    const c: TrainingCourse = {
      id: Date.now(),
      title: data.title || 'Course',
      code: data.code || 'CRS-01',
      durationHours: data.durationHours ?? 10,
      isActive: data.isActive ?? true,
    };
    this.courses.push(c);
    return c;
  }

  async getSessions(): Promise<TrainingSession[]> {
    await sleep();
    return [...this.sessions];
  }

  async createSession(data: Partial<TrainingSession>): Promise<TrainingSession> {
    await sleep();
    const s: TrainingSession = {
      id: Date.now(),
      courseId: data.courseId || 1,
      sessionName: data.sessionName || 'Session',
      startDate: data.startDate || '2026-12-01',
      endDate: data.endDate || '2026-12-02',
      deliveryMethod: data.deliveryMethod || 'In-Person',
      maxCapacity: data.maxCapacity ?? 20,
      enrolledCount: 0,
      status: 'Scheduled',
    };
    this.sessions.push(s);
    return s;
  }

  async enrollEmployee(sessionId: number, employeeId: number): Promise<EmployeeTraining> {
    await sleep();
    return {
      id: Date.now(),
      employeeId,
      status: 'Enrolled',
    };
  }

  async updateEmployeeTraining(enrollmentId: number, data: Partial<EmployeeTraining>): Promise<EmployeeTraining> {
    await sleep();
    return {
      id: enrollmentId,
      employeeId: 1,
      status: data.status || 'Completed',
      score: data.score,
    };
  }
}

export class MockReportRepository implements IReportRepository {
  async getWorkforceReport(): Promise<WorkforceReport> {
    await sleep();
    return {
      totalEmployees: 45,
      totalActive: 42,
      byEntity: { CGCC: 22, CSOG: 14, 'Citadel Holdings': 9 },
      byDepartment: { Engineering: 15, 'People & Culture': 8, Finance: 7, Operations: 15 },
      byGender: { Male: 24, Female: 21 },
      byEmploymentType: { 'Full-Time': 38, Contract: 7 },
    };
  }

  async getLeaveReport(): Promise<LeaveReport> {
    await sleep();
    return {
      year: 2026,
      summary: { totalEntitled: 450, totalUsed: 120, totalPending: 35, totalRemaining: 295 },
      byCategory: [
        { category_name: 'Annual Leave', entitled: 300, used: 90, pending: 20, remaining: 190 },
        { category_name: 'Sick Leave', entitled: 100, used: 25, pending: 10, remaining: 65 },
        { category_name: 'Casual Leave', entitled: 50, used: 5, pending: 5, remaining: 40 },
      ],
      requestsByStatus: { Approved: 28, 'Pending Review': 6, Submitted: 4, Rejected: 2 },
    };
  }

  async getAttendanceReport(): Promise<AttendanceReport> {
    await sleep();
    return {
      totalAttendanceLogs: 840,
      statusBreakdown: { Present: 780, Late: 45, 'Half Day': 15 },
      totalHoursWorked: 6720,
      averageHoursPerLog: 8.0,
    };
  }

  async getRecruitmentReport(): Promise<RecruitmentReport> {
    await sleep();
    return {
      activeVacancies: 5,
      totalVacancies: 12,
      totalCandidates: 34,
      funnel: {
        'Application Initiated': 14,
        Shortlisted: 8,
        'Interview Scheduled': 5,
        'Interview Passed': 3,
        'Job Offered': 2,
        Hired: 2,
      },
    };
  }
}

let mockClaimEvents: import('../types').ClaimEvent[] = loadStorage('claim_events', [
  { id: 1, name: 'Ministry & Pastoral Outreach', code: 'EVT-OUTREACH', description: 'Outreach missions and pastoral field work', status: 'Active', is_active: true },
  { id: 2, name: 'Official Travel & Transport', code: 'EVT-TRAVEL', description: 'Interstate travel, flights and transit', status: 'Active', is_active: true },
  { id: 3, name: 'Medical & Health Reimbursement', code: 'EVT-MEDICAL', description: 'Emergency medical expenses and clinic care', status: 'Active', is_active: true },
  { id: 4, name: 'Facilities & Technical Maintenance', code: 'EVT-FACILITIES', description: 'Repairs and audio-visual hardware maintenance', status: 'Active', is_active: true },
  { id: 5, name: 'Staff Training & Education Sponsorship', code: 'EVT-TRAINING', description: 'Professional certifications and conferences', status: 'Active', is_active: true },
]);

let mockExpenseTypes: import('../types').ExpenseType[] = loadStorage('claim_expense_types', [
  { id: 1, name: 'Fuel & Vehicle Mileage', code: 'EXP-FUEL', description: 'Vehicle fuel and transit mileage', status: 'Active', is_active: true },
  { id: 2, name: 'Hotel & Accommodation', code: 'EXP-HOTEL', description: 'Hotel lodging during corporate duty', status: 'Active', is_active: true },
  { id: 3, name: 'Meals & Refreshment', code: 'EXP-MEAL', description: 'Field meals and hospitality', status: 'Active', is_active: true },
  { id: 4, name: 'Tools, Hardware & Equipment', code: 'EXP-EQUIP', description: 'Hardware parts, cables and tech gear', status: 'Active', is_active: true },
  { id: 5, name: 'Prescription & Clinical Care', code: 'EXP-MEDIC', description: 'Clinic visits and prescriptions', status: 'Active', is_active: true },
  { id: 6, name: 'Course Tuition & Exam Fees', code: 'EXP-TUITION', description: 'Accredited training fees and courses', status: 'Active', is_active: true },
  { id: 7, name: 'Administrative Consumables', code: 'EXP-ADMIN', description: 'Emergency stationery and office consumables', status: 'Active', is_active: true },
]);

let mockClaims: import('../types').ClaimRequest[] = loadStorage('claim_requests', [
  {
    id: 1,
    claim_number: 'CLM-2026-0001',
    employee_id: 1,
    employee: { id: 1, name: 'Dr. Bukola Adeleke', full_name: 'Dr. Bukola Adeleke', staff_id: 'CGCC-001', department_name: 'People, Culture & Change', job_title: 'Chief People Officer' },
    claim_event_id: 1,
    claim_event: { id: 1, name: 'Ministry & Pastoral Outreach', code: 'EVT-OUTREACH', status: 'Active' },
    currency: 'NGN',
    description: 'Outreach mission logistics and community seminar feeding',
    status: 'APPROVED',
    total_amount: 145000,
    submitted_at: '2026-11-10T10:00:00Z',
    approved_by: 1,
    approver: { id: 1, name: 'Dr. Bukola Adeleke', email: 'dr.adeleke@citadel.ng' },
    approved_at: '2026-11-12T14:30:00Z',
    expenses: [
      { id: 101, claim_request_id: 1, expense_type_id: 1, expense_type: { id: 1, name: 'Fuel & Vehicle Mileage', status: 'Active' }, expense_date: '2026-11-09', amount: 45000, note: 'Convoy bus fueling to Abeokuta' },
      { id: 102, claim_request_id: 1, expense_type_id: 3, expense_type: { id: 3, name: 'Meals & Refreshment', status: 'Active' }, expense_date: '2026-11-10', amount: 100000, note: 'Outreach volunteers packed lunches' },
    ],
    created_at: '2026-11-09T08:00:00Z',
  },
  {
    id: 2,
    claim_number: 'CLM-2026-0002',
    employee_id: 2,
    employee: { id: 2, name: 'Engr. Femi Olatunji', full_name: 'Engr. Femi Olatunji', staff_id: 'CGCC-002', department_name: 'ICT', job_title: 'Head of Technology' },
    claim_event_id: 4,
    claim_event: { id: 4, name: 'Facilities & Technical Maintenance', code: 'EVT-FACILITIES', status: 'Active' },
    currency: 'NGN',
    description: 'Emergency replacement of Cisco PoE core switch',
    status: 'PAID',
    total_amount: 280000,
    submitted_at: '2026-11-04T09:00:00Z',
    approved_by: 1,
    approver: { id: 1, name: 'Dr. Bukola Adeleke', email: 'dr.adeleke@citadel.ng' },
    approved_at: '2026-11-05T11:00:00Z',
    paid_by: 1,
    paid_at: '2026-11-06T15:00:00Z',
    expenses: [
      { id: 103, claim_request_id: 2, expense_type_id: 4, expense_type: { id: 4, name: 'Tools, Hardware & Equipment', status: 'Active' }, expense_date: '2026-11-04', amount: 280000, note: 'Gigabit 24-Port Switch purchase from Computer Village' },
    ],
    created_at: '2026-11-04T08:30:00Z',
  },
  {
    id: 3,
    claim_number: 'CLM-2026-0003',
    employee_id: 4,
    employee: { id: 4, name: 'Nadia Safitri', full_name: 'Nadia Safitri', staff_id: 'CGCC-003', department_name: 'ICT', job_title: 'Lead Product Designer' },
    claim_event_id: 5,
    claim_event: { id: 5, name: 'Staff Training & Education Sponsorship', code: 'EVT-TRAINING', status: 'Active' },
    currency: 'NGN',
    description: 'Advanced Design System certification registration',
    status: 'SUBMITTED',
    total_amount: 85000,
    submitted_at: '2026-11-18T16:00:00Z',
    expenses: [
      { id: 104, claim_request_id: 3, expense_type_id: 6, expense_type: { id: 6, name: 'Course Tuition & Exam Fees', status: 'Active' }, expense_date: '2026-11-18', amount: 85000, note: 'Figma Config & Design System Certification pass' },
    ],
    created_at: '2026-11-18T15:45:00Z',
  },
]);

export class MockClaimRepository implements IClaimRepository {
  async getClaimEvents(activeOnly = true): Promise<ClaimEvent[]> {
    await sleep();
    return activeOnly ? mockClaimEvents.filter((e) => e.is_active !== false) : [...mockClaimEvents];
  }

  async createClaimEvent(data: Partial<ClaimEvent>): Promise<ClaimEvent> {
    await sleep();
    const newEvent: ClaimEvent = {
      id: Date.now(),
      name: data.name || 'New Claim Event',
      code: data.code || `EVT-${Date.now().toString().slice(-4)}`,
      description: data.description || '',
      status: (data.status as any) || 'Active',
      is_active: data.status !== 'Inactive',
    };
    mockClaimEvents = [newEvent, ...mockClaimEvents];
    saveStorage('claim_events', mockClaimEvents);
    return newEvent;
  }

  async getExpenseTypes(activeOnly = true): Promise<ExpenseType[]> {
    await sleep();
    return activeOnly ? mockExpenseTypes.filter((t) => t.is_active !== false) : [...mockExpenseTypes];
  }

  async createExpenseType(data: Partial<ExpenseType>): Promise<ExpenseType> {
    await sleep();
    const newType: ExpenseType = {
      id: Date.now(),
      name: data.name || 'New Expense Type',
      code: data.code || `EXP-${Date.now().toString().slice(-4)}`,
      description: data.description || '',
      status: (data.status as any) || 'Active',
      is_active: data.status !== 'Inactive',
    };
    mockExpenseTypes = [newType, ...mockExpenseTypes];
    saveStorage('claim_expense_types', mockExpenseTypes);
    return newType;
  }

  async getClaims(filter?: { employeeId?: string | number; status?: string; search?: string }): Promise<ClaimRequest[]> {
    await sleep();
    let res = [...mockClaims];
    if (filter?.employeeId) {
      res = res.filter((c) => String(c.employee_id) === String(filter.employeeId));
    }
    if (filter?.status && filter.status !== 'all') {
      res = res.filter((c) => c.status.toLowerCase() === filter.status!.toLowerCase());
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      res = res.filter((c) =>
        c.claim_number.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.employee?.name || '').toLowerCase().includes(q) ||
        (c.employee?.full_name || '').toLowerCase().includes(q)
      );
    }
    return res;
  }

  async getClaim(id: string | number): Promise<ClaimRequest> {
    await sleep();
    const match = mockClaims.find((c) => String(c.id) === String(id));
    if (!match) throw new Error(`Claim #${id} not found.`);
    return match;
  }

  async createClaim(data: CreateClaimRequestInput): Promise<ClaimRequest> {
    await sleep();
    const year = new Date().getFullYear();
    const num = `CLM-${year}-${String(mockClaims.length + 1).padStart(4, '0')}`;
    const event = mockClaimEvents.find((e) => String(e.id) === String(data.claim_event_id)) || mockClaimEvents[0];
    const initialStatus = data.status || 'SUBMITTED';

    const expenses: ClaimExpense[] = (data.expenses || []).map((exp, idx) => {
      const type = mockExpenseTypes.find((t) => String(t.id) === String(exp.expense_type_id)) || mockExpenseTypes[0];
      return {
        id: Date.now() + idx,
        expense_type_id: type.id,
        expense_type: type,
        expense_date: exp.expense_date || exp.expenseDate || new Date().toISOString().split('T')[0],
        amount: Number(exp.amount),
        currency: data.currency || 'NGN',
        note: exp.note,
        receipt_url: exp.receipt_url,
      };
    });

    const totalAmount = expenses.reduce((acc, item) => acc + item.amount, 0);

    const newClaim: ClaimRequest = {
      id: Date.now(),
      claim_number: num,
      employee_id: data.employee_id || 1,
      employee: {
        id: data.employee_id || 1,
        name: 'Dr. Bukola Adeleke',
        full_name: 'Dr. Bukola Adeleke',
        staff_id: 'CGCC-001',
        department_name: 'People, Culture & Change',
      },
      claim_event_id: event.id,
      claim_event: event,
      currency: data.currency || 'NGN',
      description: data.description,
      remarks: data.remarks,
      status: initialStatus,
      total_amount: totalAmount,
      submitted_at: initialStatus === 'SUBMITTED' ? new Date().toISOString() : null,
      expenses,
      created_at: new Date().toISOString(),
    };

    mockClaims = [newClaim, ...mockClaims];
    saveStorage('claim_requests', mockClaims);
    return newClaim;
  }

  async addExpense(claimId: string | number, data: CreateExpenseItemInput): Promise<ClaimRequest> {
    await sleep();
    const claim = mockClaims.find((c) => String(c.id) === String(claimId));
    if (!claim) throw new Error(`Claim #${claimId} not found.`);

    const type = mockExpenseTypes.find((t) => String(t.id) === String(data.expense_type_id)) || mockExpenseTypes[0];
    const newExp: ClaimExpense = {
      id: Date.now(),
      claim_request_id: claim.id,
      expense_type_id: type.id,
      expense_type: type,
      expense_date: data.expense_date || data.expenseDate || new Date().toISOString().split('T')[0],
      amount: Number(data.amount),
      currency: claim.currency,
      note: data.note,
      receipt_url: data.receipt_url,
    };

    claim.expenses = [...claim.expenses, newExp];
    claim.total_amount = claim.expenses.reduce((acc, x) => acc + x.amount, 0);
    saveStorage('claim_requests', mockClaims);
    return claim;
  }

  async deleteExpense(expenseId: string | number): Promise<ClaimRequest> {
    await sleep();
    let parentClaim: ClaimRequest | undefined;
    for (const c of mockClaims) {
      if (c.expenses.some((e) => String(e.id) === String(expenseId))) {
        c.expenses = c.expenses.filter((e) => String(e.id) !== String(expenseId));
        c.total_amount = c.expenses.reduce((acc, x) => acc + x.amount, 0);
        parentClaim = c;
        break;
      }
    }
    if (!parentClaim) throw new Error(`Expense item #${expenseId} not found.`);
    saveStorage('claim_requests', mockClaims);
    return parentClaim;
  }

  async performAction(claimId: string | number, action: ClaimAction, reason?: string): Promise<ClaimRequest> {
    await sleep();
    const claim = mockClaims.find((c) => String(c.id) === String(claimId));
    if (!claim) throw new Error(`Claim #${claimId} not found.`);

    switch (action) {
      case 'SUBMIT':
        claim.status = 'SUBMITTED';
        claim.submitted_at = new Date().toISOString();
        break;
      case 'APPROVE':
        claim.status = 'APPROVED';
        claim.approved_at = new Date().toISOString();
        claim.approved_by = 1;
        claim.approver = { id: 1, name: 'Dr. Bukola Adeleke', email: 'dr.adeleke@citadel.ng' };
        break;
      case 'REJECT':
        claim.status = 'REJECTED';
        claim.rejection_reason = reason || 'Claim rejected by manager';
        break;
      case 'CANCEL':
        claim.status = 'CANCELLED';
        break;
      case 'PAY':
        claim.status = 'PAID';
        claim.paid_at = new Date().toISOString();
        claim.paid_by = 1;
        claim.payer = { id: 1, name: 'Finance Settlement Officer', email: 'finance@citadel.ng' };
        break;
    }

    saveStorage('claim_requests', mockClaims);
    return claim;
  }
}


