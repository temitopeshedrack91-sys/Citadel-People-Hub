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
  EmployeeDocumentInput,
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
  PayrollExcelTemplate,
  PayrollExcelMapping,
  PayrollImportBatch,
  PayrollImportRow,
  PayrollAdjustment,
  AttendancePenaltyRule,
  EmployeeProrationRecord,
  ExcelPreviewResponse,
} from '../types';
import { AttendanceImportSnapshot, BiometricPunch, matchPunchesToStaff, summarizeDailyAttendance } from '../features/attendance-import';
import { BiometricImportBatchResult } from './interfaces';
import { LaravelApiError, requestLaravel, requestLaravelBlob, requestLaravelData } from './laravelClient';
export class LaravelEmployeeRepository implements IEmployeeRepository {
  async getAll(filter?: { entityId?: string; departmentId?: string; search?: string }): Promise<Employee[]> {
    const params = new URLSearchParams();
    if (filter?.entityId) params.set('entityId', filter.entityId);
    if (filter?.departmentId) params.set('departmentId', filter.departmentId);
    if (filter?.search) params.set('search', filter.search);
    return requestLaravelData(`/employees${params.size ? `?${params}` : ''}`);
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

  toggleTaskCompletion(journeyId: string, taskId: string, isCompleted: boolean): Promise<OnboardingJourney> {
    return requestLaravelData(
      `/onboarding-journeys/${encodeURIComponent(journeyId)}/tasks/${encodeURIComponent(taskId)}`,
      { method: 'PATCH', body: JSON.stringify({ isCompleted }) }
    );
  }

  createOnboardingTask(journeyId: string, task: Omit<OnboardingTask, 'id' | 'isCompleted'>): Promise<OnboardingJourney> {
    return requestLaravelData(`/onboarding-journeys/${encodeURIComponent(journeyId)}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async sendTaskReminder(journeyId: string, taskId: string): Promise<boolean> {
    void journeyId;
    void taskId;
    throw new Error('Reminder delivery is not configured. No reminder was sent.');
  }

  toggleDocumentSubmission(journeyId: string, docId: string, isSubmitted: boolean): Promise<OnboardingJourney> {
    return requestLaravelData(
      `/onboarding-journeys/${encodeURIComponent(journeyId)}/documents/${encodeURIComponent(docId)}`,
      { method: 'PATCH', body: JSON.stringify({ isSubmitted }) }
    );
  }

  toggleOrientationItem(journeyId: string, itemId: string, isCompleted: boolean): Promise<OnboardingJourney> {
    return requestLaravelData(
      `/onboarding-journeys/${encodeURIComponent(journeyId)}/orientation/${encodeURIComponent(itemId)}`,
      { method: 'PATCH', body: JSON.stringify({ isCompleted }) }
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
}

export class LaravelPayrollRepository implements IPayrollRepository {
  getSalaryTemplates(): Promise<SalaryTemplate[]> {
    return requestLaravelData('/payroll/templates');
  }

  createSalaryTemplate(template: Omit<SalaryTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<SalaryTemplate> {
    return requestLaravelData('/payroll/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  getAssignments(): Promise<EmployeeSalaryAssignment[]> {
    return requestLaravelData('/payroll/assignments');
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
    return requestLaravelData('/payroll/assignments', {
      method: 'POST',
      body: JSON.stringify(assignment),
    });
  }

  getPayrollRuns(): Promise<PayrollRun[]> {
    return requestLaravelData('/payroll/runs');
  }

  getPayrollRun(id: string): Promise<PayrollRun> {
    return requestLaravelData(`/payroll/runs/${encodeURIComponent(id)}`);
  }

  async generatePayrollRun(data: {
    title?: string;
    period_start: string;
    period_end: string;
    pay_date?: string;
    notes?: string;
  }): Promise<PayrollRun> {
    return requestLaravelData('/payroll/runs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  finalizePayrollRun(id: string): Promise<PayrollRun> {
    return requestLaravelData(`/payroll/runs/${encodeURIComponent(id)}/finalize`, { method: 'POST' });
  }

  getPayslip(id: string): Promise<PayrollItem> {
    return requestLaravelData(`/payroll/payslips/${encodeURIComponent(id)}`);
  }

  markPayslipPaid(id: string, paymentMethod?: string): Promise<PayrollItem> {
    return requestLaravelData(`/payroll/payslips/${encodeURIComponent(id)}/paid`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_method: paymentMethod || 'Direct Bank Transfer' }),
    });
  }

  getLoans(filter?: { employee_id?: string; status?: string }): Promise<EmployeeLoan[]> {
    const params = new URLSearchParams();
    if (filter?.employee_id) params.set('employee_id', filter.employee_id);
    if (filter?.status) params.set('status', filter.status);
    return requestLaravelData(`/payroll/loans${params.size ? `?${params}` : ''}`);
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
    return requestLaravelData('/payroll/loans', {
      method: 'POST',
      body: JSON.stringify(loan),
    });
  }

  approveLoan(id: string): Promise<EmployeeLoan> {
    return requestLaravelData(`/payroll/loans/${encodeURIComponent(id)}/approve`, { method: 'PATCH' });
  }

  getDeductions(filter?: { employee_id?: string }): Promise<EmployeeDeduction[]> {
    const params = new URLSearchParams();
    if (filter?.employee_id) params.set('employee_id', filter.employee_id);
    return requestLaravelData(`/payroll/deductions${params.size ? `?${params}` : ''}`);
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

  getProvidentFunds(): Promise<EmployeeProvidentFund[]> {
    return requestLaravelData('/payroll/provident-funds');
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

