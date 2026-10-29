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
} from './interfaces';
import {
  Employee,
  CitadelEntity,
  CitadelDepartment,
  LeaveRequest,
  AttendanceRecord,
  WorkflowRequest,
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
    leaveRequests[index] = {
      ...leaveRequests[index],
      status,
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
  }): Promise<EmployeeDeduction> {
    await sleep();
    const newDed: EmployeeDeduction = {
      id: `ded-${Date.now()}`,
      employee_id: deduction.employee_id,
      title: deduction.title,
      deduction_type: deduction.deduction_type,
      amount: deduction.amount,
      is_percentage: !!deduction.is_percentage,
      start_date: deduction.start_date,
      end_date: deduction.end_date,
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
}

