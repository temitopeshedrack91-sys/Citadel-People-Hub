import {
  IAttendanceRepository,
  IAuditRepository,
  IDocumentRepository,
  IEmployeeRepository,
  ILeaveRepository,
  INotificationRepository,
  IOffboardingRepository,
  IOrganizationRepository,
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
  AttendanceRecord,
  AuditLogEntry,
  CitadelDepartment,
  CitadelEntity,
  Employee,
  EmployeeHierarchy,
  EmployeeDocumentInput,
  ExitClearances,
  ExitInterviewDetails,
  ExitRequest,
  HubDocument,
  LeaveRequest,
  LeaveBalanceRecord,
  LeaveCategoryRecord,
  TeamCalendarLeaveEvent,
  ClaimEvent,
  ExpenseType,
  ClaimRequest,
  ClaimAction,
  CreateClaimRequestInput,
  CreateExpenseItemInput,
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
  PayrollExcelTemplate,
  PayrollExcelMapping,
  PayrollImportBatch,
  PayrollImportRow,
  PayrollAdjustment,
  AttendancePenaltyRule,
  EmployeeProrationRecord,
  ExcelPreviewResponse,
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
} from '../types';
import { AttendanceImportSnapshot, BiometricPunch, matchPunchesToStaff, summarizeDailyAttendance } from '../features/attendance-import';
import { BiometricImportBatchResult } from './interfaces';
import { LaravelApiError, requestLaravel, requestLaravelBlob, requestLaravelData } from './laravelClient';
export class LaravelEmployeeRepository implements IEmployeeRepository {
  async getAll(filter?: { entityId?: string; departmentId?: string; search?: string }): Promise<Employee[]> {
    const params = new URLSearchParams();
    if (filter?.entityId && filter.entityId.toLowerCase() !== 'all') params.set('entityId', filter.entityId);
    if (filter?.departmentId && filter.departmentId.toLowerCase() !== 'all') params.set('departmentId', filter.departmentId);
    if (filter?.search?.trim()) params.set('search', filter.search.trim());
    const rows = await requestLaravelData<Employee[]>(`/employees${params.size ? `?${params}` : ''}`);
    return Array.isArray(rows)
      ? rows.map((emp) => ({
          ...emp,
          id: String(emp.id),
          departmentId: emp.departmentId ? String(emp.departmentId) : '',
          managerId: emp.managerId ? String(emp.managerId) : undefined,
        }))
      : [];
  }

  async getById(id: string): Promise<Employee | null> {
    try {
      const emp = await requestLaravelData<Employee>(`/employees/${encodeURIComponent(id)}`);
      return emp
        ? {
            ...emp,
            id: String(emp.id),
            departmentId: emp.departmentId ? String(emp.departmentId) : '',
            managerId: emp.managerId ? String(emp.managerId) : undefined,
          }
        : null;
    } catch (error) {
      if (error instanceof LaravelApiError && error.status === 404) return null;
      throw error;
    }
  }

  async getHierarchy(id: string): Promise<EmployeeHierarchy | null> {
    try {
      return await requestLaravelData(`/employees/${encodeURIComponent(id)}/hierarchy`);
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
  async getEntities(): Promise<CitadelEntity[]> {
    const rows = await requestLaravelData<CitadelEntity[]>('/entities');
    return Array.isArray(rows) ? rows.map((e) => ({ ...e, id: String(e.id) })) : [];
  }

  async getDepartments(entityId?: string): Promise<CitadelDepartment[]> {
    const cleanEntity = entityId && entityId.toLowerCase() !== 'all' ? entityId : '';
    const query = cleanEntity ? `?entityId=${encodeURIComponent(cleanEntity)}` : '';
    const rows = await requestLaravelData<CitadelDepartment[]>(`/departments${query}`);
    return Array.isArray(rows)
      ? rows.map((d) => ({
          ...d,
          id: String(d.id),
          entityId: String(d.entityId),
          headOfDepartment: d.headOfDepartment || d.headOfDepartmentName,
          headOfDepartmentName: d.headOfDepartmentName || d.headOfDepartment,
        }))
      : [];
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

  getCategories(): Promise<LeaveCategoryRecord[]> {
    return requestLaravelData('/leave/categories');
  }

  getBalances(employeeId?: string): Promise<LeaveBalanceRecord[]> {
    if (employeeId) {
      return requestLaravelData(`/employees/${encodeURIComponent(employeeId)}/leave-balances`);
    }
    return requestLaravelData('/leave/balances');
  }

  getTeamCalendar(params?: { startDate?: string; endDate?: string }): Promise<TeamCalendarLeaveEvent[]> {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    return requestLaravelData(`/leave/team-calendar${q.size ? `?${q}` : ''}`);
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

  async getBiometricPunchSnapshot(employees: Employee[]): Promise<AttendanceImportSnapshot> {
    type PunchPage = {
      punches: BiometricPunch[];
      pagination: { currentPage: number; lastPage: number };
      punchCount: number;
      lastFileName: string | null;
      lastImportedAt: string | null;
    };
    const punches: BiometricPunch[] = [];
    let page = 1;
    let lastPage = 1;
    let metadata: PunchPage | null = null;
    do {
      metadata = await requestLaravelData<PunchPage>(`/attendance/biometric-punches?per_page=1000&page=${page}`);
      punches.push(...metadata.punches);
      lastPage = metadata.pagination.lastPage;
      page += 1;
      if (page > 51 && page <= lastPage) {
        throw new Error('Attendance history exceeds the 50,000 punch display limit. Filter or archive older imports before retrying.');
      }
    } while (page <= lastPage);

    const staff = employees.map((employee) => ({
      id: String(employee.id),
      staffId: employee.staffId,
      fullName: employee.fullName,
      entityName: employee.entityName,
      departmentName: employee.departmentName,
      biometricDeviceId: employee.biometricDeviceId,
    }));
    const { matched, unmatched } = matchPunchesToStaff(punches, staff);

    return {
      punchCount: metadata?.punchCount ?? 0,
      summaries: summarizeDailyAttendance(matched),
      unmatchedDeviceIds: unmatched,
      lastImportedAt: metadata?.lastImportedAt ?? undefined,
      lastFileName: metadata?.lastFileName ?? undefined,
    };
  }

  importBiometricPunches(fileName: string, punches: BiometricPunch[]): Promise<BiometricImportBatchResult> {
    return requestLaravelData<BiometricImportBatchResult>('/attendance/biometric-imports', {
      method: 'POST',
      body: JSON.stringify({ fileName, punches }),
    });
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

  getEmployeeDocuments(employeeId: string, filter?: { category?: string }): Promise<HubDocument[]> {
    const params = new URLSearchParams();
    if (filter?.category) params.set('category', filter.category);
    return requestLaravelData(`/employees/${encodeURIComponent(employeeId)}/documents${params.size ? `?${params}` : ''}`);
  }

  async uploadEmployeeDocument(
    employeeId: string,
    document: EmployeeDocumentInput,
    file: File
  ): Promise<HubDocument> {
    const form = new FormData();
    form.set('file', file);
    form.set('title', document.title);
    form.set('description', document.description || '');
    form.set('category', document.category);
    form.set('issueDate', document.issueDate || '');
    form.set('expiryDate', document.expiryDate || '');
    form.set('version', document.version || '1.0');
    return requestLaravelData(`/employees/${encodeURIComponent(employeeId)}/documents`, { method: 'POST', body: form });
  }

  async replaceEmployeeDocument(
    employeeId: string,
    documentId: string,
    document: EmployeeDocumentInput,
    file: File
  ): Promise<HubDocument> {
    const form = new FormData();
    form.set('file', file);
    form.set('title', document.title);
    form.set('description', document.description || '');
    form.set('category', document.category);
    form.set('issueDate', document.issueDate || '');
    form.set('expiryDate', document.expiryDate || '');
    form.set('version', document.version || '1.0');
    return requestLaravelData(
      `/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/replace`,
      { method: 'POST', body: form }
    );
  }

  async deleteEmployeeDocument(employeeId: string, documentId: string): Promise<void> {
    await requestLaravel(
      `/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}`,
      { method: 'DELETE' }
    );
  }

  async downloadEmployeeDocument(employeeId: string, documentId: string): Promise<Blob> {
    return requestLaravelBlob(
      `/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/download`
    );
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
  getOnboardingJourneys(): Promise<OnboardingJourney[]> {
    return requestLaravelData('/onboarding-journeys');
  }

  toggleTaskCompletion(journeyId: string, taskId: string, isCompleted: boolean, version?: number): Promise<OnboardingJourney> {
    const payload = version !== undefined ? { isCompleted, version } : { isCompleted };
    return requestLaravelData(
      `/onboarding-journeys/${encodeURIComponent(journeyId)}/tasks/${encodeURIComponent(taskId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
  }

  createOnboardingTask(journeyId: string, task: Omit<OnboardingTask, 'id' | 'isCompleted'>, version?: number): Promise<OnboardingJourney> {
    const payload = version !== undefined ? { ...task, version } : task;
    return requestLaravelData(`/onboarding-journeys/${encodeURIComponent(journeyId)}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  reorderOnboardingTasks(journeyId: string, taskIds: string[], version?: number): Promise<OnboardingJourney> {
    const payload = version !== undefined ? { taskIds, version } : { taskIds };
    return requestLaravelData(`/onboarding-journeys/${encodeURIComponent(journeyId)}/tasks/reorder`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async sendTaskReminder(journeyId: string, taskId: string): Promise<boolean> {
    await requestLaravelData(
      `/onboarding-journeys/${encodeURIComponent(journeyId)}/tasks/${encodeURIComponent(taskId)}/reminder`,
      { method: 'POST' }
    );
    return true;
  }

  sendBulkTaskReminders(journeyId: string): Promise<{ remindedCount: number; journey: OnboardingJourney }> {
    return requestLaravelData(`/onboarding-journeys/${encodeURIComponent(journeyId)}/reminders`, {
      method: 'POST',
    });
  }

  completeOnboardingJourney(journeyId: string, version?: number): Promise<OnboardingJourney> {
    const payload = version !== undefined ? { version } : undefined;
    return requestLaravelData(`/onboarding-journeys/${encodeURIComponent(journeyId)}/complete`, {
      method: 'POST',
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
  }

  toggleDocumentSubmission(journeyId: string, docId: string, isSubmitted: boolean, version?: number): Promise<OnboardingJourney> {
    const payload = version !== undefined ? { isSubmitted, version } : { isSubmitted };
    return requestLaravelData(
      `/onboarding-journeys/${encodeURIComponent(journeyId)}/documents/${encodeURIComponent(docId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
  }

  toggleOrientationItem(journeyId: string, itemId: string, isCompleted: boolean, version?: number): Promise<OnboardingJourney> {
    const payload = version !== undefined ? { isCompleted, version } : { isCompleted };
    return requestLaravelData(
      `/onboarding-journeys/${encodeURIComponent(journeyId)}/orientation/${encodeURIComponent(itemId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
  }

  getRequisitions(): Promise<RecruitmentRequisition[]> {
    return requestLaravelData('/requisitions');
  }

  createRequisition(requisition: RecruitmentRequisition): Promise<RecruitmentRequisition> {
    return requestLaravelData('/requisitions', {
      method: 'POST',
      body: JSON.stringify(requisition),
    });
  }

  updateRequisitionStatus(id: string, status: RecruitmentRequisition['status']): Promise<RecruitmentRequisition> {
    return requestLaravelData(`/requisitions/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  createOnboardingJourney(journey: OnboardingJourney): Promise<OnboardingJourney> {
    return requestLaravelData('/onboarding-journeys', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: journey.employeeId,
        checklistId: journey.checklistId,
        startDate: journey.startDate,
      }),
    });
  }

  getChecklistTemplates(): Promise<OnboardingChecklistTemplate[]> {
    return requestLaravelData('/checklist-templates');
  }

  createChecklistTemplate(template: OnboardingChecklistTemplate): Promise<OnboardingChecklistTemplate> {
    return requestLaravelData('/checklist-templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  updateChecklistTemplate(
    id: string,
    template: OnboardingChecklistTemplate,
    version?: number
  ): Promise<OnboardingChecklistTemplate> {
    const payload = version !== undefined ? { ...template, version } : template;
    return requestLaravelData(`/checklist-templates/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

function extractArray<T>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && res.data && Array.isArray(res.data.data)) return res.data.data;
  return [];
}

function mapPayrollItem(item: any): PayrollItem {
  if (!item) return item;
  const basic = Number(item.basic_salary ?? 0);
  const allowance = Number(item.allowance_total ?? 0);
  const bonus = Number(item.bonus_total ?? 0);
  const gross = Number(item.gross_salary ?? (basic + allowance + bonus));
  const deduction = Number(item.deduction_total ?? item.total_deduction ?? 0);
  const net = Number(item.net_salary ?? item.net_payable ?? (gross - deduction));
  const empName = item.employee?.full_name || item.employee?.name || `${item.employee?.first_name || ''} ${item.employee?.last_name || ''}`.trim();
  return {
    ...item,
    id: String(item.id),
    basic_salary: basic,
    allowance_total: allowance,
    bonus_total: bonus,
    gross_salary: gross,
    total_deduction: deduction,
    deduction_total: deduction,
    tax_amount: Number(item.tax_amount ?? item.tax_deduction ?? 0),
    provident_fund_amount: Number(item.provident_fund_amount ?? item.provident_fund_deduction ?? 0),
    loan_repayment_amount: Number(item.loan_repayment_amount ?? item.loan_deduction ?? 0),
    net_salary: net,
    net_payable: net,
    payment_status: item.payment_status || 'unpaid',
    employee: item.employee ? {
      ...item.employee,
      id: String(item.employee.id),
      name: empName,
      full_name: empName,
      staff_id: item.employee.staff_id,
      department_name: item.employee.department?.name || item.employee.department_name,
      job_title: item.employee.job_title,
    } : undefined,
  };
}

function mapPayrollRun(r: any): PayrollRun {
  if (!r) return r;
  const items = Array.isArray(r.items) ? r.items.map(mapPayrollItem) : [];
  const gross = Number(r.total_gross ?? r.gross_total ?? 0);
  const deduction = Number(r.total_deduction ?? r.deduction_total ?? 0);
  const net = Number(r.total_net ?? r.net_total ?? (gross - deduction));
  return {
    ...r,
    id: String(r.id),
    run_number: r.run_number || `PR-${r.payroll_year || new Date().getFullYear()}-${String(r.id).padStart(3, '0')}`,
    title: r.title || r.period_label || `Payroll Run (${r.period_start} - ${r.period_end})`,
    period_label: r.period_label || r.title,
    total_gross: gross,
    gross_total: gross,
    total_deduction: deduction,
    deduction_total: deduction,
    total_net: net,
    net_total: net,
    status: r.status || 'draft',
    items,
  };
}

function mapSalaryTemplate(tpl: any): SalaryTemplate {
  if (!tpl) return tpl;
  const allowances = Array.isArray(tpl.allowances) && tpl.allowances.length > 0 ? tpl.allowances : [
    { name: 'Housing Allowance', amount: Number(tpl.house_rent || 0) },
    { name: 'Medical Allowance', amount: Number(tpl.medical_allowance || 0) },
    { name: 'Transport Allowance', amount: Number(tpl.conveyance_allowance || 0) },
    { name: 'Other Allowance', amount: Number(tpl.other_allowance || 0) },
  ].filter((a) => a.amount > 0);

  const deductions = Array.isArray(tpl.deductions) && tpl.deductions.length > 0 ? tpl.deductions : [
    { name: 'Pension Contribution (8%)', amount: Number(tpl.provident_fund_percent || 0), is_percentage: true },
    { name: 'PAYE Tax', amount: Number(tpl.tax_percent || 0), is_percentage: true },
  ].filter((d) => d.amount > 0);

  return {
    ...tpl,
    id: String(tpl.id),
    name: tpl.name || 'Salary Structure',
    basic_salary: Number(tpl.basic_salary || 0),
    allowances,
    deductions,
    is_active: tpl.is_active !== false,
  };
}

function mapSalaryAssignment(asgn: any): EmployeeSalaryAssignment {
  if (!asgn) return asgn;
  const empName = asgn.employee?.full_name || asgn.employee?.name || `${asgn.employee?.first_name || ''} ${asgn.employee?.last_name || ''}`.trim();
  return {
    ...asgn,
    id: String(asgn.id),
    employee_id: String(asgn.employee_id),
    salary_template_id: String(asgn.salary_template_id),
    effective_date: asgn.effective_date || asgn.effective_from || new Date().toISOString().split('T')[0],
    basic_salary: Number(asgn.basic_salary ?? asgn.override_basic_salary ?? asgn.salary_template?.basic_salary ?? 0),
    is_active: asgn.is_active !== false,
    employee: asgn.employee ? {
      ...asgn.employee,
      id: String(asgn.employee.id),
      name: empName,
      full_name: empName,
      staff_id: asgn.employee.staff_id,
      department_name: asgn.employee.department?.name || asgn.employee.department_name,
    } : undefined,
    salary_template: asgn.salaryTemplate ? mapSalaryTemplate(asgn.salaryTemplate) : (asgn.salary_template ? mapSalaryTemplate(asgn.salary_template) : undefined),
  };
}

function mapEmployeeLoan(loan: any): EmployeeLoan {
  if (!loan) return loan;
  const principal = Number(loan.principal_amount || 0);
  const monthly = Number(loan.monthly_installment ?? loan.installment_amount ?? 0);
  const totalInst = Number(loan.total_installments ?? loan.installment_count ?? 1);
  const paidInst = Number(loan.paid_installments ?? (Array.isArray(loan.installments) ? loan.installments.filter((i: any) => i.status === 'paid').length : 0));
  const remaining = Number(loan.remaining_balance ?? Math.max(0, principal - (paidInst * monthly)));
  const empName = loan.employee?.full_name || loan.employee?.name || `${loan.employee?.first_name || ''} ${loan.employee?.last_name || ''}`.trim();

  return {
    ...loan,
    id: String(loan.id),
    employee_id: String(loan.employee_id),
    loan_number: loan.loan_number || loan.loan_reference || `LN-${loan.id}`,
    loan_type: loan.loan_type || loan.remarks || 'Staff Loan & Advance',
    principal_amount: principal,
    monthly_installment: monthly,
    total_installments: totalInst,
    paid_installments: paidInst,
    remaining_balance: remaining,
    status: loan.status || 'pending',
    employee: loan.employee ? {
      ...loan.employee,
      id: String(loan.employee.id),
      name: empName,
      full_name: empName,
      staff_id: loan.employee.staff_id,
      department_name: loan.employee.department?.name || loan.employee.department_name,
    } : undefined,
  };
}

export class LaravelPayrollRepository implements IPayrollRepository {
  async getSalaryTemplates(): Promise<SalaryTemplate[]> {
    const res = await requestLaravelData('/payroll/templates');
    return extractArray<any>(res).map(mapSalaryTemplate);
  }

  async createSalaryTemplate(template: Omit<SalaryTemplate, 'id' | 'created_at' | 'updated_at'> & { code?: string; pay_frequency?: string }): Promise<SalaryTemplate> {
    const payload = {
      code: template.code || 'TMPL-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      pay_frequency: template.pay_frequency || 'monthly',
      ...template,
    };
    const res = await requestLaravelData('/payroll/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapSalaryTemplate(res);
  }

  async getAssignments(): Promise<EmployeeSalaryAssignment[]> {
    const res = await requestLaravelData('/payroll/assignments');
    return extractArray<any>(res).map(mapSalaryAssignment);
  }

  async assignSalaryTemplate(assignment: {
    employee_id: string;
    salary_template_id: string;
    effective_date?: string;
    effective_from?: string;
    override_basic_salary?: number | null;
    basic_salary?: number | null;
    custom_allowances?: any[];
    custom_deductions?: any[];
    notes?: string;
  }): Promise<EmployeeSalaryAssignment> {
    const payload = {
      ...assignment,
      effective_from: assignment.effective_from || assignment.effective_date,
      basic_salary: assignment.basic_salary ?? assignment.override_basic_salary ?? 0,
    };
    const res = await requestLaravelData('/payroll/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapSalaryAssignment(res);
  }

  async getPayrollRuns(): Promise<PayrollRun[]> {
    const res = await requestLaravelData('/payroll/runs');
    return extractArray<any>(res).map(mapPayrollRun);
  }

  async getPayrollRun(id: string): Promise<PayrollRun> {
    const res = await requestLaravelData(`/payroll/runs/${encodeURIComponent(id)}`);
    return mapPayrollRun(res);
  }

  async generatePayrollRun(data: {
    title?: string;
    period_start: string;
    period_end: string;
    pay_date?: string;
    notes?: string;
    pay_frequency?: string;
    period_label?: string;
  }): Promise<PayrollRun> {
    const payload = {
      pay_frequency: data.pay_frequency || 'monthly',
      period_label: data.period_label || data.title,
      ...data,
    };
    const res = await requestLaravelData('/payroll/runs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapPayrollRun(res);
  }

  async finalizePayrollRun(id: string): Promise<PayrollRun> {
    const res = await requestLaravelData(`/payroll/runs/${encodeURIComponent(id)}/finalize`, { method: 'POST' });
    return mapPayrollRun(res);
  }

  async getPayslip(id: string): Promise<PayrollItem> {
    const res = await requestLaravelData(`/payroll/payslips/${encodeURIComponent(id)}`);
    return mapPayrollItem(res);
  }

  async markPayslipPaid(id: string, paymentMethod?: string): Promise<PayrollItem> {
    const res = await requestLaravelData(`/payroll/payslips/${encodeURIComponent(id)}/paid`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_method: paymentMethod || 'Direct Bank Transfer' }),
    });
    return mapPayrollItem(res);
  }

  async getLoans(filter?: { employee_id?: string; status?: string }): Promise<EmployeeLoan[]> {
    const params = new URLSearchParams();
    if (filter?.employee_id) params.set('employee_id', filter.employee_id);
    if (filter?.status) params.set('status', filter.status);
    const res = await requestLaravelData(`/payroll/loans${params.size ? `?${params}` : ''}`);
    return extractArray<any>(res).map(mapEmployeeLoan);
  }

  async createLoan(loan: {
    employee_id: string;
    loan_type?: string;
    principal_amount: number;
    interest_rate?: number;
    interest_rate_percent?: number;
    monthly_installment?: number;
    total_installments?: number;
    installment_count?: number;
    disbursed_at?: string;
    issued_date?: string;
    notes?: string;
    remarks?: string;
    loan_reference?: string;
  }): Promise<EmployeeLoan> {
    const payload = {
      ...loan,
      installment_count: loan.installment_count || loan.total_installments || 12,
      interest_rate_percent: loan.interest_rate_percent ?? loan.interest_rate ?? 0,
      issued_date: loan.issued_date || loan.disbursed_at || new Date().toISOString().split('T')[0],
      remarks: loan.remarks || loan.notes || '',
    };
    const res = await requestLaravelData('/payroll/loans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapEmployeeLoan(res);
  }

  async approveLoan(id: string): Promise<EmployeeLoan> {
    const res = await requestLaravelData(`/payroll/loans/${encodeURIComponent(id)}/approve`, { method: 'PATCH' });
    return mapEmployeeLoan(res);
  }

  async getDeductions(filter?: { employee_id?: string }): Promise<EmployeeDeduction[]> {
    const params = new URLSearchParams();
    if (filter?.employee_id) params.set('employee_id', filter.employee_id);
    const res = await requestLaravelData(`/payroll/deductions${params.size ? `?${params}` : ''}`);
    return extractArray<EmployeeDeduction>(res);
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
    return requestLaravelData('/payroll/deductions', {
      method: 'POST',
      body: JSON.stringify(deduction),
    });
  }

  async getProvidentFunds(): Promise<EmployeeProvidentFund[]> {
    const res = await requestLaravelData('/payroll/provident-funds');
    return extractArray<EmployeeProvidentFund>(res);
  }

  async createProvidentFund(data: {
    employee_id: string;
    employee_rate?: number;
    employer_rate?: number;
    status?: 'active' | 'inactive';
  }): Promise<EmployeeProvidentFund> {
    return requestLaravelData('/payroll/provident-funds', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Excel Payroll Templates
  getExcelTemplates(params?: { active_only?: boolean; entity_id?: string }): Promise<{ data: PayrollExcelTemplate[] }> {
    const queryParams = new URLSearchParams();
    if (params?.active_only !== undefined) queryParams.set('active_only', String(params.active_only));
    if (params?.entity_id) queryParams.set('entity_id', params.entity_id);
    return requestLaravelData(`/payroll/excel-templates${queryParams.size ? `?${queryParams}` : ''}`);
  }

  async createExcelTemplate(template: any): Promise<PayrollExcelTemplate> {
    const { mappings, ...templateData } = template;
    return requestLaravelData('/payroll/excel-templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  }

  getExcelTemplate(id: string): Promise<PayrollExcelTemplate> {
    return requestLaravelData(`/payroll/excel-templates/${encodeURIComponent(id)}`);
  }

  async updateExcelTemplate(id: string, updates: Partial<PayrollExcelTemplate>): Promise<PayrollExcelTemplate> {
    return requestLaravelData(`/payroll/excel-templates/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteExcelTemplate(id: string): Promise<void> {
    await requestLaravel(`/payroll/excel-templates/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async getImportBatches(): Promise<{ data: PayrollImportBatch[] }> {
    return requestLaravelData('/payroll/import-batches');
  }

  // Excel Upload & Import
  async previewExcelUpload(file: File, templateId?: string): Promise<ExcelPreviewResponse> {
    const form = new FormData();
    form.set('file', file);
    if (templateId) form.set('template_id', String(templateId));
    return requestLaravelData('/payroll/excel-preview', {
      method: 'POST',
      body: form,
    });
  }

  async importExcelPayroll(data: any): Promise<PayrollImportBatch> {
    const form = new FormData();
    form.set('file', data.file);
    form.set('mappings', JSON.stringify(data.mappings));
    if (data.template_id) form.set('template_id', String(data.template_id));
    if (data.save_as_template) form.set('save_as_template', 'true');
    if (data.template_name) form.set('template_name', data.template_name);
    if (data.import_options) form.set('import_options', JSON.stringify(data.import_options));
    return requestLaravelData('/payroll/excel-import', {
      method: 'POST',
      body: form,
    });
  }

  getImportBatch(id: string): Promise<PayrollImportBatch> {
    return requestLaravelData(`/payroll/import-batches/${encodeURIComponent(id)}`);
  }

  async updateImportRow(id: string, updates: any): Promise<PayrollImportRow> {
    return requestLaravelData(`/payroll/import-rows/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async processImportBatch(id: string, options: any): Promise<any> {
    return requestLaravelData(`/payroll/import-batches/${encodeURIComponent(id)}/process`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Payroll Adjustments
  getAdjustments(filter?: { payroll_run_id?: string; employee_id?: string }): Promise<{ data: PayrollAdjustment[] }> {
    const params = new URLSearchParams();
    if (filter?.payroll_run_id) params.set('payroll_run_id', filter.payroll_run_id);
    if (filter?.employee_id) params.set('employee_id', filter.employee_id);
    return requestLaravelData(`/payroll/adjustments${params.size ? `?${params}` : ''}`);
  }

  async createAdjustment(adjustment: Omit<PayrollAdjustment, 'id' | 'created_at' | 'updated_at' | 'employee' | 'adjuster' | 'difference'>): Promise<PayrollAdjustment> {
    return requestLaravelData('/payroll/adjustments', {
      method: 'POST',
      body: JSON.stringify(adjustment),
    });
  }

  // Attendance Penalty Rules
  getPenaltyRules(params?: { entity_id?: string; active_only?: boolean }): Promise<AttendancePenaltyRule[]> {
    const queryParams = new URLSearchParams();
    if (params?.entity_id) queryParams.set('entity_id', params.entity_id);
    if (params?.active_only !== undefined) queryParams.set('active_only', String(params.active_only));
    return requestLaravelData(`/payroll/penalty-rules${queryParams.size ? `?${queryParams}` : ''}`);
  }

  async createPenaltyRule(rule: Omit<AttendancePenaltyRule, 'id' | 'created_at' | 'updated_at' | 'entity'>): Promise<AttendancePenaltyRule> {
    return requestLaravelData('/payroll/penalty-rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  }

  async updatePenaltyRule(id: string, updates: Partial<AttendancePenaltyRule>): Promise<AttendancePenaltyRule> {
    return requestLaravelData(`/payroll/penalty-rules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deletePenaltyRule(id: string): Promise<void> {
    await requestLaravel(`/payroll/penalty-rules/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // Proration Records
  getProrationRecords(filter?: { payroll_run_id?: string; employee_id?: string }): Promise<{ data: EmployeeProrationRecord[] }> {
    const params = new URLSearchParams();
    if (filter?.payroll_run_id) params.set('payroll_run_id', filter.payroll_run_id);
    if (filter?.employee_id) params.set('employee_id', filter.employee_id);
    return requestLaravelData(`/payroll/proration-records${params.size ? `?${params}` : ''}`);
  }
}

export class LaravelClassificationRepository implements IClassificationRepository {
  async getJobTitles(activeOnly: boolean = true): Promise<JobTitle[]> {
    return requestLaravelData(`/job-titles?activeOnly=${activeOnly}`);
  }

  async createJobTitle(title: Partial<JobTitle>): Promise<JobTitle> {
    return requestLaravelData('/job-titles', {
      method: 'POST',
      body: JSON.stringify(title),
    });
  }

  async getPayGrades(activeOnly: boolean = true): Promise<PayGrade[]> {
    return requestLaravelData(`/pay-grades?activeOnly=${activeOnly}`);
  }

  async createPayGrade(grade: Partial<PayGrade>): Promise<PayGrade> {
    return requestLaravelData('/pay-grades', {
      method: 'POST',
      body: JSON.stringify(grade),
    });
  }
}

export class LaravelTimesheetRepository implements ITimesheetRepository {
  async getTimesheets(filter?: { employeeId?: number; status?: string }): Promise<Timesheet[]> {
    const params = new URLSearchParams();
    if (filter?.employeeId) params.set('employeeId', String(filter.employeeId));
    if (filter?.status) params.set('status', filter.status);
    return requestLaravelData(`/timesheets${params.size ? `?${params}` : ''}`);
  }

  async getTimesheet(id: number): Promise<Timesheet> {
    return requestLaravelData(`/timesheets/${id}`);
  }

  async saveDraftTimesheet(data: {
    employeeId: number;
    periodStart: string;
    periodEnd: string;
    items: TimesheetItem[];
  }): Promise<Timesheet> {
    return requestLaravelData('/timesheets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitTimesheet(id: number): Promise<Timesheet> {
    return requestLaravelData(`/timesheets/${id}/submit`, { method: 'POST' });
  }

  async approveTimesheet(id: number, comments?: string): Promise<Timesheet> {
    return requestLaravelData(`/timesheets/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    });
  }

  async rejectTimesheet(id: number, comments: string): Promise<Timesheet> {
    return requestLaravelData(`/timesheets/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    });
  }

  async resetTimesheet(id: number): Promise<Timesheet> {
    return requestLaravelData(`/timesheets/${id}/reset`, { method: 'POST' });
  }
}

export class LaravelPerformanceRepository implements IPerformanceRepository {
  async getKpis(jobTitleId?: number): Promise<Kpi[]> {
    const query = jobTitleId ? `?jobTitleId=${jobTitleId}` : '';
    return requestLaravelData(`/performance/kpis${query}`);
  }

  async createKpi(kpi: Partial<Kpi>): Promise<Kpi> {
    return requestLaravelData('/performance/kpis', {
      method: 'POST',
      body: JSON.stringify(kpi),
    });
  }

  async updateKpi(id: number, kpi: Partial<Kpi>): Promise<Kpi> {
    return requestLaravelData(`/performance/kpis/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(kpi),
    });
  }

  async deleteKpi(id: number): Promise<void> {
    await requestLaravelData(`/performance/kpis/${id}`, {
      method: 'DELETE',
    });
  }

  async getReviews(filter?: { employeeId?: number; status?: string }): Promise<PerformanceReview[]> {
    const params = new URLSearchParams();
    if (filter?.employeeId) params.set('employeeId', String(filter.employeeId));
    if (filter?.status) params.set('status', filter.status);
    return requestLaravelData(`/performance/reviews${params.size ? `?${params}` : ''}`);
  }

  async getReview(id: number): Promise<PerformanceReview> {
    return requestLaravelData(`/performance/reviews/${id}`);
  }

  async createReview(data: Partial<PerformanceReview>): Promise<PerformanceReview> {
    return requestLaravelData('/performance/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async evaluateReview(
    id: number,
    data: {
      ratings: ReviewRating[];
      reviewerComments?: string;
      employeeComments?: string;
      version?: number;
    }
  ): Promise<PerformanceReview> {
    return requestLaravelData(`/performance/reviews/${id}/evaluate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveReview(id: number, version?: number): Promise<PerformanceReview> {
    return requestLaravelData(
      `/performance/reviews/${id}/approve`,
      version !== undefined
        ? { method: 'POST', body: JSON.stringify({ version }) }
        : { method: 'POST' }
    );
  }
}

export class LaravelRecruitmentPipelineRepository implements IRecruitmentPipelineRepository {
  async getVacancies(filter?: { activeOnly?: boolean; departmentId?: number }): Promise<JobVacancy[]> {
    const params = new URLSearchParams();
    if (filter?.activeOnly !== undefined) params.set('activeOnly', String(filter.activeOnly));
    if (filter?.departmentId) params.set('departmentId', String(filter.departmentId));
    return requestLaravelData(`/recruitment/vacancies${params.size ? `?${params}` : ''}`);
  }

  async createVacancy(data: Partial<JobVacancy>): Promise<JobVacancy> {
    return requestLaravelData('/recruitment/vacancies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCandidates(filter?: { vacancyId?: number; status?: string }): Promise<Candidate[]> {
    const params = new URLSearchParams();
    if (filter?.vacancyId) params.set('vacancyId', String(filter.vacancyId));
    if (filter?.status) params.set('status', filter.status);
    return requestLaravelData(`/recruitment/candidates${params.size ? `?${params}` : ''}`);
  }

  async createCandidate(data: Partial<Candidate>): Promise<Candidate> {
    return requestLaravelData('/recruitment/candidates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCandidateStatus(id: number, status: string, notes?: string): Promise<Candidate> {
    return requestLaravelData(`/recruitment/candidates/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  async scheduleInterview(candidateId: number, data: Partial<CandidateInterview>): Promise<CandidateInterview> {
    return requestLaravelData(`/recruitment/candidates/${candidateId}/interviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInterviewResult(interviewId: number, result: 'Passed' | 'Failed', notes?: string): Promise<CandidateInterview> {
    return requestLaravelData(`/recruitment/interviews/${interviewId}`, {
      method: 'PATCH',
      body: JSON.stringify({ result, notes }),
    });
  }
}

export class LaravelTrainingRepository implements ITrainingRepository {
  async getCourses(activeOnly: boolean = true): Promise<TrainingCourse[]> {
    return requestLaravelData(`/training/courses?activeOnly=${activeOnly}`);
  }

  async createCourse(data: Partial<TrainingCourse>): Promise<TrainingCourse> {
    return requestLaravelData('/training/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSessions(filter?: { courseId?: number; status?: string }): Promise<TrainingSession[]> {
    const params = new URLSearchParams();
    if (filter?.courseId) params.set('courseId', String(filter.courseId));
    if (filter?.status) params.set('status', filter.status);
    return requestLaravelData(`/training/sessions${params.size ? `?${params}` : ''}`);
  }

  async createSession(data: Partial<TrainingSession>): Promise<TrainingSession> {
    return requestLaravelData('/training/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async enrollEmployee(sessionId: number, employeeId: number): Promise<EmployeeTraining> {
    return requestLaravelData(`/training/sessions/${sessionId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    });
  }

  async updateEmployeeTraining(enrollmentId: number, data: Partial<EmployeeTraining>): Promise<EmployeeTraining> {
    return requestLaravelData(`/training/enrollments/${enrollmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export class LaravelReportRepository implements IReportRepository {
  async getWorkforceReport(): Promise<WorkforceReport> {
    return requestLaravelData('/reports/workforce');
  }

  async getLeaveReport(year?: number): Promise<LeaveReport> {
    const query = year ? `?year=${year}` : '';
    return requestLaravelData(`/reports/leave-utilization${query}`);
  }

  async getAttendanceReport(params?: { startDate?: string; endDate?: string }): Promise<AttendanceReport> {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    return requestLaravelData(`/reports/attendance-summary${q.size ? `?${q}` : ''}`);
  }

  async getRecruitmentReport(): Promise<RecruitmentReport> {
    return requestLaravelData('/reports/recruitment-summary');
  }
}

export class LaravelClaimRepository implements IClaimRepository {
  async getClaimEvents(activeOnly = true): Promise<ClaimEvent[]> {
    const q = activeOnly ? '?activeOnly=true' : '';
    return requestLaravelData(`/claims/events${q}`);
  }

  async createClaimEvent(data: Partial<ClaimEvent>): Promise<ClaimEvent> {
    return requestLaravelData('/claims/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getExpenseTypes(activeOnly = true): Promise<ExpenseType[]> {
    const q = activeOnly ? '?activeOnly=true' : '';
    return requestLaravelData(`/claims/expense-types${q}`);
  }

  async createExpenseType(data: Partial<ExpenseType>): Promise<ExpenseType> {
    return requestLaravelData('/claims/expense-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getClaims(filter?: { employeeId?: string | number; status?: string; search?: string }): Promise<ClaimRequest[]> {
    const params = new URLSearchParams();
    if (filter?.employeeId) params.set('employee_id', String(filter.employeeId));
    if (filter?.status && filter.status !== 'all') params.set('status', filter.status);
    if (filter?.search) params.set('search', filter.search);
    const q = params.toString() ? `?${params.toString()}` : '';
    return requestLaravelData(`/claims/requests${q}`);
  }

  async getClaim(id: string | number): Promise<ClaimRequest> {
    return requestLaravelData(`/claims/requests/${id}`);
  }

  async createClaim(data: CreateClaimRequestInput): Promise<ClaimRequest> {
    return requestLaravelData('/claims/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addExpense(claimId: string | number, data: CreateExpenseItemInput): Promise<ClaimRequest> {
    return requestLaravelData(`/claims/requests/${claimId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(expenseId: string | number): Promise<ClaimRequest> {
    return requestLaravelData(`/claims/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  }

  async performAction(claimId: string | number, action: ClaimAction, reason?: string): Promise<ClaimRequest> {
    return requestLaravelData(`/claims/requests/${claimId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    });
  }
}

export class LaravelOffboardingRepository implements IOffboardingRepository {
  async getAll(): Promise<ExitRequest[]> {
    return requestLaravelData('/offboarding/requests');
  }

  async create(payload: {
    employeeId: string;
    resignationDate: string;
    proposedLastDay: string;
    reason: string;
    managerId?: string;
  }): Promise<ExitRequest> {
    return requestLaravelData('/offboarding/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async endorseByManager(id: string, payload?: { comments?: string; version?: number }): Promise<ExitRequest> {
    return requestLaravelData(`/offboarding/requests/${encodeURIComponent(id)}/manager-endorse`, {
      method: 'POST',
      body: JSON.stringify({
        managerComments: payload?.comments,
        ...(payload?.version !== undefined ? { version: payload.version } : {}),
      }),
    });
  }

  async verifyNotice(
    id: string,
    payload?: { noticeCompliant?: boolean; contractNotes?: string; version?: number }
  ): Promise<ExitRequest> {
    return requestLaravelData(`/offboarding/requests/${encodeURIComponent(id)}/verify-notice`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  }

  async scheduleInterview(id: string, payload: ExitInterviewDetails & { version?: number }): Promise<ExitRequest> {
    return requestLaravelData(`/offboarding/requests/${encodeURIComponent(id)}/schedule-interview`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateClearance(
    id: string,
    department: keyof ExitClearances,
    cleared: boolean,
    payload?: { note?: string; version?: number }
  ): Promise<ExitRequest> {
    return requestLaravelData(`/offboarding/requests/${encodeURIComponent(id)}/clearance`, {
      method: 'PATCH',
      body: JSON.stringify({
        department,
        cleared,
        ...(payload ?? {}),
      }),
    });
  }

  async finalize(id: string, payload?: { settlementNotes?: string; version?: number }): Promise<ExitRequest> {
    return requestLaravelData(`/offboarding/requests/${encodeURIComponent(id)}/finalize`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  }
}


