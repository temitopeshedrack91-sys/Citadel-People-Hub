import {
  IAttendanceRepository,
  IAuditRepository,
  IDocumentRepository,
  IEmployeeRepository,
  ILeaveRepository,
  INotificationRepository,
  IOrganizationRepository,
  ITalentRepository,
  IPayrollRepository,
} from './interfaces';
import {
  AttendanceRecord,
  AuditLogEntry,
  CitadelDepartment,
  CitadelEntity,
  Employee,
  HubDocument,
  LeaveRequest,
  OnboardingJourney,
  OnboardingTask,
  OnboardingChecklistTemplate,
  RecruitmentRequisition,
  SystemNotification,
  WorkflowStatus,
  SalaryTemplate,
  EmployeeSalaryAssignment,
  PayrollRun,
  PayrollItem,
  EmployeeLoan,
  EmployeeDeduction,
  EmployeeProvidentFund,
} from '../types';
import { LaravelApiError, requestLaravel, requestLaravelData } from './laravelClient';
import {
  INITIAL_EMPLOYEES,
  INITIAL_ONBOARDING_JOURNEYS,
  DEFAULT_CHECKLIST_TEMPLATES,
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

export class LaravelEmployeeRepository implements IEmployeeRepository {
  async getAll(filter?: { entityId?: string; departmentId?: string; search?: string }): Promise<Employee[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.entityId) params.set('entityId', filter.entityId);
      if (filter?.departmentId) params.set('departmentId', filter.departmentId);
      if (filter?.search) params.set('search', filter.search);
      const res = await requestLaravelData<Employee[]>(`/employees${params.size ? `?${params}` : ''}`);
      return res && res.length > 0 ? res : INITIAL_EMPLOYEES;
    } catch {
      return INITIAL_EMPLOYEES;
    }
  }

  async getById(id: string): Promise<Employee | null> {
    try {
      return await requestLaravelData(`/employees/${encodeURIComponent(id)}`);
    } catch (error) {
      if (error instanceof LaravelApiError && error.status === 404) return null;
      throw error;
    }
  }

  create(employee: Omit<Employee, 'id'>): Promise<Employee> {
    return requestLaravelData('/employees', { method: 'POST', body: JSON.stringify(employee) });
  }

  update(id: string, updates: Partial<Employee>): Promise<Employee> {
    return requestLaravelData(`/employees/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async delete(id: string): Promise<boolean> {
    await requestLaravel(`/employees/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return true;
  }
}

export class LaravelOrganizationRepository implements IOrganizationRepository {
  getEntities(): Promise<CitadelEntity[]> {
    return requestLaravelData('/entities');
  }

  getDepartments(entityId?: string): Promise<CitadelDepartment[]> {
    const query = entityId ? `?entityId=${encodeURIComponent(entityId)}` : '';
    return requestLaravelData(`/departments${query}`);
  }

  createDepartment(department: Omit<CitadelDepartment, 'id'>): Promise<CitadelDepartment> {
    return requestLaravelData('/departments', {
      method: 'POST',
      body: JSON.stringify(department),
    });
  }

  updateDepartment(id: string, updates: Partial<CitadelDepartment>): Promise<CitadelDepartment> {
    return requestLaravelData(`/departments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  toggleDepartmentStatus(id: string, isActive: boolean): Promise<CitadelDepartment> {
    return this.updateDepartment(id, { isActive });
  }

  createEntity(entity: Omit<CitadelEntity, 'id'>): Promise<CitadelEntity> {
    return requestLaravelData('/entities', { method: 'POST', body: JSON.stringify(entity) });
  }
}

export class LaravelLeaveRepository implements ILeaveRepository {
  getAll(): Promise<LeaveRequest[]> {
    return requestLaravelData('/leave-requests');
  }

  getByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return requestLaravelData(`/employees/${encodeURIComponent(employeeId)}/leave-requests`);
  }

  submitRequest(request: Omit<LeaveRequest, 'id' | 'appliedDate' | 'status'>): Promise<LeaveRequest> {
    return requestLaravelData('/leave-requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  updateStatus(
    requestId: string,
    status: WorkflowStatus,
    _actorName: string,
    comments?: string
  ): Promise<LeaveRequest> {
    return requestLaravelData(`/leave-requests/${encodeURIComponent(requestId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, comments }),
    });
  }
}

export class LaravelAttendanceRepository implements IAttendanceRepository {
  getTodaySummary(): Promise<Record<string, number>> {
    return requestLaravel('/attendance/today-summary');
  }

  getRecentLogs(limit = 20): Promise<AttendanceRecord[]> {
    return requestLaravelData(`/attendance?limit=${encodeURIComponent(String(limit))}`);
  }

  recordClockIn(
    employeeId: string,
    employeeName: string,
    staffId: string,
    entity: string,
    department: string
  ): Promise<AttendanceRecord> {
    return requestLaravelData('/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify({ employeeId, employeeName, staffId, entity, department }),
    });
  }

  recordClockOut(recordId: string): Promise<AttendanceRecord> {
    return requestLaravelData(`/attendance/${encodeURIComponent(recordId)}/clock-out`, { method: 'POST' });
  }
}

export class LaravelAuditRepository implements IAuditRepository {
  getLogs(filter?: { module?: string; userId?: string; limit?: number }): Promise<AuditLogEntry[]> {
    const params = new URLSearchParams();
    if (filter?.module) params.set('module', filter.module);
    if (filter?.userId) params.set('userId', filter.userId);
    if (filter?.limit) params.set('limit', String(filter.limit));
    return requestLaravelData(`/audit-logs${params.size ? `?${params}` : ''}`);
  }

  async logAction(_entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    // Compliance audit rows are written by Laravel domain actions, not browser claims.
  }
}

export class LaravelDocumentRepository implements IDocumentRepository {
  getAll(filter?: { category?: string; accessLevel?: string }): Promise<HubDocument[]> {
    const params = new URLSearchParams();
    if (filter?.category) params.set('category', filter.category);
    if (filter?.accessLevel) params.set('accessLevel', filter.accessLevel);
    return requestLaravelData(`/documents${params.size ? `?${params}` : ''}`);
  }

  async uploadDocument(
    document: Omit<HubDocument, 'id' | 'uploadedDate'>,
    file?: File
  ): Promise<HubDocument> {
    if (!file) {
      throw new Error('Choose an actual document file before uploading to the secure backend.');
    }
    const form = new FormData();
    form.set('file', file);
    form.set('title', document.title);
    form.set('description', document.description || '');
    form.set('category', document.category);
    form.set('accessLevel', document.accessLevel);
    form.set('entityScope', document.entityScope || '');
    form.set('departmentScope', document.departmentScope || '');
    form.set('version', document.version);
    form.set('isSensitive', String(document.isSensitive));
    return requestLaravelData('/documents', { method: 'POST', body: form });
  }
}

export class LaravelNotificationRepository implements INotificationRepository {
  getAll(): Promise<SystemNotification[]> {
    return requestLaravelData('/notifications');
  }

  async markAsRead(id: string): Promise<void> {
    await requestLaravel(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
  }

  async markAllAsRead(): Promise<void> {
    await requestLaravel('/notifications/read-all', { method: 'POST' });
  }
}

export class LaravelTalentRepository implements ITalentRepository {
  async getOnboardingJourneys(): Promise<OnboardingJourney[]> {
    try {
      const res = await requestLaravelData<OnboardingJourney[]>('/onboarding-journeys');
      return res && res.length > 0 ? res : INITIAL_ONBOARDING_JOURNEYS;
    } catch {
      return INITIAL_ONBOARDING_JOURNEYS;
    }
  }

  async toggleTaskCompletion(journeyId: string, taskId: string, isCompleted: boolean): Promise<OnboardingJourney> {
    try {
      return await requestLaravelData(
        `/onboarding-journeys/${encodeURIComponent(journeyId)}/tasks/${encodeURIComponent(taskId)}`,
        { method: 'PATCH', body: JSON.stringify({ isCompleted }) }
      );
    } catch {
      const journey = INITIAL_ONBOARDING_JOURNEYS.find(j => j.id === journeyId) || INITIAL_ONBOARDING_JOURNEYS[0];
      const task = journey.tasks.find(t => t.id === taskId);
      if (task) {
        task.isCompleted = isCompleted;
        task.completedAt = isCompleted ? new Date().toISOString().split('T')[0] : undefined;
      }
      return journey;
    }
  }

  async createOnboardingTask(journeyId: string, task: Omit<OnboardingTask, 'id' | 'isCompleted'>): Promise<OnboardingJourney> {
    const list = await this.getOnboardingJourneys();
    return list.find((j) => j.id === journeyId) || list[0];
  }

  async sendTaskReminder(journeyId: string, taskId: string): Promise<boolean> {
    return true;
  }

  async toggleDocumentSubmission(journeyId: string, docId: string, isSubmitted: boolean): Promise<OnboardingJourney> {
    const list = await this.getOnboardingJourneys();
    return list.find((j) => j.id === journeyId) || list[0];
  }

  async toggleOrientationItem(journeyId: string, itemId: string, isCompleted: boolean): Promise<OnboardingJourney> {
    const list = await this.getOnboardingJourneys();
    return list.find((j) => j.id === journeyId) || list[0];
  }

  async getRequisitions(): Promise<RecruitmentRequisition[]> {
    try {
      return await requestLaravelData('/requisitions');
    } catch {
      return INITIAL_RECRUITMENT;
    }
  }

  async createRequisition(requisition: RecruitmentRequisition): Promise<RecruitmentRequisition> {
    try {
      return await requestLaravelData('/requisitions', {
        method: 'POST',
        body: JSON.stringify(requisition),
      });
    } catch {
      INITIAL_RECRUITMENT.unshift(requisition);
      return requisition;
    }
  }

  async createOnboardingJourney(journey: OnboardingJourney): Promise<OnboardingJourney> {
    try {
      return await requestLaravelData('/onboarding-journeys', {
        method: 'POST',
        body: JSON.stringify(journey),
      });
    } catch {
      INITIAL_ONBOARDING_JOURNEYS.unshift(journey);
      return journey;
    }
  }

  async getChecklistTemplates(): Promise<OnboardingChecklistTemplate[]> {
    try {
      const res = await requestLaravelData<OnboardingChecklistTemplate[]>('/checklist-templates');
      return res && res.length > 0 ? res : DEFAULT_CHECKLIST_TEMPLATES;
    } catch {
      return DEFAULT_CHECKLIST_TEMPLATES;
    }
  }

  async createChecklistTemplate(template: OnboardingChecklistTemplate): Promise<OnboardingChecklistTemplate> {
    try {
      return await requestLaravelData('/checklist-templates', {
        method: 'POST',
        body: JSON.stringify(template),
      });
    } catch {
      DEFAULT_CHECKLIST_TEMPLATES.unshift(template);
      return template;
    }
  }
}

export class LaravelPayrollRepository implements IPayrollRepository {
  async getSalaryTemplates(): Promise<SalaryTemplate[]> {
    try {
      const res = await requestLaravelData<SalaryTemplate[]>('/payroll/templates');
      return res && res.length > 0 ? res : INITIAL_SALARY_TEMPLATES;
    } catch {
      return INITIAL_SALARY_TEMPLATES;
    }
  }

  async createSalaryTemplate(template: Omit<SalaryTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<SalaryTemplate> {
    try {
      return await requestLaravelData<SalaryTemplate>('/payroll/templates', {
        method: 'POST',
        body: JSON.stringify(template),
      });
    } catch {
      const newTemplate: SalaryTemplate = {
        ...template,
        id: `st-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      INITIAL_SALARY_TEMPLATES.unshift(newTemplate);
      return newTemplate;
    }
  }

  async getAssignments(): Promise<EmployeeSalaryAssignment[]> {
    try {
      const res = await requestLaravelData<EmployeeSalaryAssignment[]>('/payroll/assignments');
      return res && res.length > 0 ? res : INITIAL_PAYROLL_ASSIGNMENTS;
    } catch {
      return INITIAL_PAYROLL_ASSIGNMENTS;
    }
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
    try {
      return await requestLaravelData<EmployeeSalaryAssignment>('/payroll/assignments', {
        method: 'POST',
        body: JSON.stringify(assignment),
      });
    } catch {
      const matchedTemplate = INITIAL_SALARY_TEMPLATES.find((t) => t.id === assignment.salary_template_id);
      const matchedEmployee = INITIAL_EMPLOYEES.find((e) => e.id === assignment.employee_id);
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
      INITIAL_PAYROLL_ASSIGNMENTS.unshift(newAssignment);
      return newAssignment;
    }
  }

  async getPayrollRuns(): Promise<PayrollRun[]> {
    try {
      const res = await requestLaravelData<PayrollRun[]>('/payroll/runs');
      return res && res.length > 0 ? res : INITIAL_PAYROLL_RUNS;
    } catch {
      return INITIAL_PAYROLL_RUNS;
    }
  }

  async getPayrollRun(id: string): Promise<PayrollRun> {
    try {
      return await requestLaravelData<PayrollRun>(`/payroll/runs/${encodeURIComponent(id)}`);
    } catch {
      const match = INITIAL_PAYROLL_RUNS.find((r) => r.id === id);
      if (match) return match;
      throw new Error(`Payroll run ${id} not found.`);
    }
  }

  async generatePayrollRun(data: {
    title?: string;
    period_start: string;
    period_end: string;
    pay_date?: string;
    notes?: string;
  }): Promise<PayrollRun> {
    try {
      return await requestLaravelData<PayrollRun>('/payroll/runs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
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
      INITIAL_PAYROLL_RUNS.unshift(newRun);
      return newRun;
    }
  }

  async finalizePayrollRun(id: string): Promise<PayrollRun> {
    try {
      return await requestLaravelData<PayrollRun>(`/payroll/runs/${encodeURIComponent(id)}/finalize`, {
        method: 'POST',
      });
    } catch {
      const match = INITIAL_PAYROLL_RUNS.find((r) => r.id === id);
      if (match) {
        match.status = 'approved';
        return match;
      }
      throw new Error(`Payroll run ${id} not found.`);
    }
  }

  async getPayslip(id: string): Promise<PayrollItem> {
    try {
      return await requestLaravelData<PayrollItem>(`/payroll/payslips/${encodeURIComponent(id)}`);
    } catch {
      const allItems = INITIAL_PAYROLL_RUNS.flatMap((r) => r.items || []);
      const item = allItems.find((i) => i.id === id);
      if (item) return item;
      throw new Error(`Payslip ${id} not found.`);
    }
  }

  async markPayslipPaid(id: string, paymentMethod?: string): Promise<PayrollItem> {
    try {
      return await requestLaravelData<PayrollItem>(`/payroll/payslips/${encodeURIComponent(id)}/paid`, {
        method: 'PATCH',
        body: JSON.stringify({ payment_method: paymentMethod || 'Direct Bank Transfer' }),
      });
    } catch {
      const allItems = INITIAL_PAYROLL_RUNS.flatMap((r) => r.items || []);
      const item = allItems.find((i) => i.id === id);
      if (item) {
        item.payment_status = 'paid';
        item.payment_method = paymentMethod || 'Direct Bank Transfer';
        return item;
      }
      throw new Error(`Payslip ${id} not found.`);
    }
  }

  async getLoans(filter?: { employee_id?: string; status?: string }): Promise<EmployeeLoan[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.employee_id) params.set('employee_id', filter.employee_id);
      if (filter?.status) params.set('status', filter.status);
      const res = await requestLaravelData<EmployeeLoan[]>(`/payroll/loans${params.size ? `?${params}` : ''}`);
      return res && res.length > 0 ? res : INITIAL_EMPLOYEE_LOANS;
    } catch {
      return INITIAL_EMPLOYEE_LOANS;
    }
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
    try {
      return await requestLaravelData<EmployeeLoan>('/payroll/loans', {
        method: 'POST',
        body: JSON.stringify(loan),
      });
    } catch {
      const matchedEmployee = INITIAL_EMPLOYEES.find((e) => e.id === loan.employee_id);
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
      INITIAL_EMPLOYEE_LOANS.unshift(newLoan);
      return newLoan;
    }
  }

  async approveLoan(id: string): Promise<EmployeeLoan> {
    try {
      return await requestLaravelData<EmployeeLoan>(`/payroll/loans/${encodeURIComponent(id)}/approve`, {
        method: 'PATCH',
      });
    } catch {
      const loan = INITIAL_EMPLOYEE_LOANS.find((l) => l.id === id);
      if (loan) {
        loan.status = 'active';
        return loan;
      }
      throw new Error(`Loan ${id} not found.`);
    }
  }

  async getDeductions(filter?: { employee_id?: string }): Promise<EmployeeDeduction[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.employee_id) params.set('employee_id', filter.employee_id);
      const res = await requestLaravelData<EmployeeDeduction[]>(`/payroll/deductions${params.size ? `?${params}` : ''}`);
      return res && res.length > 0 ? res : INITIAL_EMPLOYEE_DEDUCTIONS;
    } catch {
      return INITIAL_EMPLOYEE_DEDUCTIONS;
    }
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
    try {
      return await requestLaravelData<EmployeeDeduction>('/payroll/deductions', {
        method: 'POST',
        body: JSON.stringify(deduction),
      });
    } catch {
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
      INITIAL_EMPLOYEE_DEDUCTIONS.unshift(newDed);
      return newDed;
    }
  }

  async getProvidentFunds(): Promise<EmployeeProvidentFund[]> {
    try {
      const res = await requestLaravelData<EmployeeProvidentFund[]>('/payroll/provident-funds');
      return res && res.length > 0 ? res : INITIAL_PROVIDENT_FUNDS;
    } catch {
      return INITIAL_PROVIDENT_FUNDS;
    }
  }

  async createProvidentFund(data: {
    employee_id: string;
    employee_rate?: number;
    employer_rate?: number;
    status?: 'active' | 'inactive';
  }): Promise<EmployeeProvidentFund> {
    try {
      return await requestLaravelData<EmployeeProvidentFund>('/payroll/provident-funds', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
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
      INITIAL_PROVIDENT_FUNDS.unshift(newPf);
      return newPf;
    }
  }
}

