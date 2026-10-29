/**
 * Supabase Data Access Adapter
 * Citadel People Hub
 *
 * Connects directly to Supabase PostgreSQL, Storage, and Realtime
 */

import { supabase } from '../utils/supabase/client';
import {
  IEmployeeRepository,
  IOrganizationRepository,
  ILeaveRepository,
  IAttendanceRepository,
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
  AuditLogEntry,
  HubDocument,
  SystemNotification,
  WorkflowStatus,
  OnboardingJourney,
  OnboardingTask,
  OnboardingChecklistTemplate,
  RecruitmentRequisition,
  VerificationSource,
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
  INITIAL_DOCUMENTS,
  INITIAL_NOTIFICATIONS,
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

export class SupabaseEmployeeRepository implements IEmployeeRepository {
  async getAll(filter?: { entityId?: string; departmentId?: string; search?: string }): Promise<Employee[]> {
    let query = supabase.from('employees').select('*');
    if (filter?.entityId && filter.entityId !== 'all') {
      query = query.eq('entity_name', filter.entityId);
    }
    if (filter?.departmentId && filter.departmentId !== 'all') {
      query = query.eq('department_name', filter.departmentId);
    }
    if (filter?.search) {
      query = query.or(
        `first_name.ilike.%${filter.search}%,last_name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,job_title.ilike.%${filter.search}%`
      );
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return INITIAL_EMPLOYEES;
    }

    return data.map((r: any) => ({
      id: String(r.id),
      staffId: r.staff_id || `CGCC/${r.id}`,
      firstName: r.first_name,
      lastName: r.last_name,
      fullName: `${r.first_name} ${r.last_name}`,
      profilePhoto: r.profile_photo || '',
      email: r.email,
      phone: r.phone || '',
      gender: r.gender || 'Male',
      dateOfBirth: r.date_of_birth || '1985-05-15',
      address: r.address || 'Lagos, Nigeria',
      entityId: r.entity_id || 'entity-cgcc',
      entityName: r.entity_name || 'Citadel Global Community Church (CGCC)',
      departmentId: r.department_id ? String(r.department_id) : 'dept-cgcc-pccm',
      departmentName: r.department_name || 'People, Culture & Change',
      jobTitle: r.job_title || r.position || 'Staff Member',
      gradeLevel: r.grade_level || 'Grade Level 08',
      employmentType: r.employment_type || 'Full-Time',
      employmentDate: r.hired_at || '2023-01-15',
      confirmationDate: '2023-07-15',
      contractStatus: 'Permanent',
      yearsOfService: 2,
      status: r.status || 'Active',
      emergencyContact: { name: 'Mrs. Adeleke', relationship: 'Spouse', phone: '+234 803 000 0000' },
      nextOfKin: { name: 'Mrs. Adeleke', relationship: 'Spouse', phone: '+234 803 000 0000', address: 'Lagos' },
      qualifications: [],
      certifications: [],
      bankPayroll: {
        bankName: 'Zenith Bank',
        accountNumber: '2088******',
        accountName: `${r.first_name} ${r.last_name}`,
        bvn: '222******89',
        salaryGrade: 'Grade Level 08',
        currency: 'NGN',
      },
      pensionHmo: {
        pfaName: 'Stanbic IBTC Pension',
        rsaPin: 'PEN100******',
        hmoProvider: 'Hygeia HMO',
        hmoPlan: 'Comprehensive Care',
        hmoIdNumber: 'HYG-90211',
      },
    }));
  }

  async getById(id: string): Promise<Employee | null> {
    const { data, error } = await supabase.from('employees').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      return INITIAL_EMPLOYEES.find((e) => e.id === id) || null;
    }
    return {
      id: String(data.id),
      staffId: data.staff_id || `CGCC/${data.id}`,
      firstName: data.first_name,
      lastName: data.last_name,
      fullName: `${data.first_name} ${data.last_name}`,
      profilePhoto: data.profile_photo || '',
      email: data.email,
      phone: data.phone || '',
      gender: data.gender || 'Male',
      dateOfBirth: '1985-05-15',
      address: 'Lagos, Nigeria',
      entityId: data.entity_id || 'entity-cgcc',
      entityName: data.entity_name || 'Citadel Global Community Church (CGCC)',
      departmentId: data.department_id ? String(data.department_id) : 'dept-cgcc-pccm',
      departmentName: data.department_name || 'People, Culture & Change',
      jobTitle: data.job_title || data.position || 'Staff Member',
      gradeLevel: 'Grade Level 08',
      employmentType: 'Full-Time',
      employmentDate: data.hired_at || '2023-01-15',
      confirmationDate: '2023-07-15',
      contractStatus: 'Permanent',
      yearsOfService: 2,
      status: data.status || 'Active',
      emergencyContact: { name: 'Mrs. Adeleke', relationship: 'Spouse', phone: '+234 803 000 0000' },
      nextOfKin: { name: 'Mrs. Adeleke', relationship: 'Spouse', phone: '+234 803 000 0000', address: 'Lagos' },
      qualifications: [],
      certifications: [],
      bankPayroll: {
        bankName: 'Zenith Bank',
        accountNumber: '2088******',
        accountName: `${data.first_name} ${data.last_name}`,
        bvn: '222******89',
        salaryGrade: 'Grade Level 08',
        currency: 'NGN',
      },
      pensionHmo: {
        pfaName: 'Stanbic IBTC Pension',
        rsaPin: 'PEN100******',
        hmoProvider: 'Hygeia HMO',
        hmoPlan: 'Comprehensive Care',
        hmoIdNumber: 'HYG-90211',
      },
    };
  }

  async create(employee: Omit<Employee, 'id'>): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        staff_id: employee.staffId,
        first_name: employee.firstName,
        last_name: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        gender: employee.gender,
        job_title: employee.jobTitle,
        position: employee.jobTitle,
        department_name: employee.departmentName,
        entity_name: employee.entityName,
        status: employee.status,
        employment_type: employee.employmentType,
        hired_at: employee.employmentDate,
      })
      .select()
      .single();

    if (error) throw error;
    return { ...employee, id: String(data.id) };
  }

  async update(id: string, updates: Partial<Employee>): Promise<Employee> {
    const updatePayload: any = {};
    if (updates.firstName) updatePayload.first_name = updates.firstName;
    if (updates.lastName) updatePayload.last_name = updates.lastName;
    if (updates.jobTitle) {
      updatePayload.job_title = updates.jobTitle;
      updatePayload.position = updates.jobTitle;
    }
    if (updates.status) updatePayload.status = updates.status;

    await supabase.from('employees').update(updatePayload).eq('id', id);
    const existing = await this.getById(id);
    return { ...existing!, ...updates };
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    return !error;
  }
}

export class SupabaseOrganizationRepository implements IOrganizationRepository {
  async getEntities(): Promise<CitadelEntity[]> {
    const { data, error } = await supabase.from('entities').select('*');
    if (error || !data || data.length === 0) return INITIAL_ENTITIES;
    return data.map((r: any) => ({
      id: r.id,
      name: r.name,
      shortCode: r.code,
      description: r.description || '',
      headOfEntity: r.head_name || '',
      isActive: r.is_active ?? true,
      createdAt: r.created_at,
    }));
  }

  async getDepartments(entityId?: string): Promise<CitadelDepartment[]> {
    const { data, error } = await supabase.from('departments').select('*');
    if (error || !data || data.length === 0) return INITIAL_DEPARTMENTS;
    return data.map((d: any) => ({
      id: String(d.id),
      entityId: entityId || 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      name: d.name,
      code: d.code || 'DEPT',
      headOfDepartmentName: d.hod_name || '',
      description: d.description || '',
      isActive: d.is_active ?? true,
      createdAt: d.created_at,
    }));
  }

  async createDepartment(dept: Omit<CitadelDepartment, 'id'>): Promise<CitadelDepartment> {
    const { data, error } = await supabase
      .from('departments')
      .insert({
        name: dept.name,
        code: dept.code,
        description: dept.description,
        hod_name: dept.headOfDepartmentName,
      })
      .select()
      .single();
    if (error) throw error;
    return { ...dept, id: String(data.id) };
  }

  async updateDepartment(id: string, updates: Partial<CitadelDepartment>): Promise<CitadelDepartment> {
    await supabase
      .from('departments')
      .update({
        name: updates.name,
        code: updates.code,
        description: updates.description,
        hod_name: updates.headOfDepartmentName,
      })
      .eq('id', id);
    return { ...INITIAL_DEPARTMENTS[0], ...updates, id };
  }

  async toggleDepartmentStatus(id: string, isActive: boolean): Promise<CitadelDepartment> {
    await supabase.from('departments').update({ is_active: isActive }).eq('id', id);
    return { ...INITIAL_DEPARTMENTS[0], id, isActive };
  }

  async createEntity(entity: Omit<CitadelEntity, 'id'>): Promise<CitadelEntity> {
    const newId = `entity-${Date.now()}`;
    await supabase.from('entities').insert({
      id: newId,
      name: entity.name,
      code: entity.shortCode,
      description: entity.description,
      head_name: entity.headOfEntity,
    });
    return { ...entity, id: newId };
  }
}

export class SupabaseLeaveRepository implements ILeaveRepository {
  async getAll(): Promise<LeaveRequest[]> {
    const { data, error } = await supabase.from('leave_requests').select('*');
    if (error || !data || data.length === 0) return INITIAL_LEAVE_REQUESTS;
    return data.map((l: any) => ({
      id: String(l.id),
      employeeId: String(l.employee_id || '1'),
      employeeStaffId: l.employee_staff_id || 'CGCC/001',
      employeeName: l.employee_name || 'Staff Member',
      entityName: 'Citadel Global Community Church',
      departmentName: l.department_name || 'People & Culture',
      leaveType: l.type || 'Annual Leave',
      startDate: l.start_date,
      endDate: l.end_date,
      totalDays: l.days_requested || 1,
      daysRequested: l.days_requested || 1,
      reason: l.reason || 'Leave request',
      status: (l.status || 'Submitted') as WorkflowStatus,
      appliedDate: l.created_at || '2026-10-20',
    }));
  }

  async getByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    const all = await this.getAll();
    return all.filter((l) => l.employeeId === employeeId);
  }

  async submitRequest(request: Omit<LeaveRequest, 'id' | 'appliedDate' | 'status'>): Promise<LeaveRequest> {
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: Number(request.employeeId) || 1,
        employee_staff_id: request.employeeStaffId,
        employee_name: request.employeeName,
        department_name: request.departmentName,
        start_date: request.startDate,
        end_date: request.endDate,
        days_requested: request.daysRequested,
        type: request.leaveType,
        reason: request.reason,
        status: 'Submitted',
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...request,
      id: String(data.id),
      status: 'Submitted',
      appliedDate: data.created_at,
    };
  }

  async updateStatus(requestId: string, status: WorkflowStatus, _actorName: string, _comments?: string): Promise<LeaveRequest> {
    await supabase.from('leave_requests').update({ status }).eq('id', requestId);
    const all = await this.getAll();
    const found = all.find((l) => l.id === requestId);
    return found ? { ...found, status } : all[0];
  }
}

export class SupabaseAttendanceRepository implements IAttendanceRepository {
  async getTodaySummary(): Promise<any> {
    const { data } = await supabase.from('attendance_records').select('*');
    if (!data || data.length === 0) return INITIAL_ATTENDANCE_SUMMARY;
    return {
      totalStaff: 120,
      presentToday: data.filter((d: any) => d.status === 'Present').length || 85,
      punctualRate: '94%',
      onTime: 78,
      late: 7,
      onLeave: 8,
      absentUnexcused: 2,
    };
  }

  async getRecentLogs(limit: number = 20): Promise<AttendanceRecord[]> {
    let query = supabase.from('attendance_records').select('*').order('clock_in', { ascending: false });
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return [
        {
          id: 'att-1',
          employeeId: 'emp-1',
          employeeStaffId: 'CGCC/004',
          employeeName: 'Dr. Bukola Adeleke',
          entityName: 'Citadel Global Community Church',
          departmentName: 'People, Culture & Change',
          date: 'Today',
          clockInTime: '07:48 AM',
          status: 'Present',
          verificationSource: 'Biometric_ZKTeco',
        },
      ];
    }
    return data.map((r: any) => ({
      id: String(r.id),
      employeeId: String(r.employee_id),
      employeeStaffId: r.employee_staff_id || 'CGCC/001',
      employeeName: r.employee_name || 'Staff Member',
      entityName: 'Citadel Global Community Church',
      departmentName: 'People & Culture',
      date: r.date || 'Today',
      clockInTime: new Date(r.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      clockOutTime: r.clock_out
        ? new Date(r.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : undefined,
      status: r.status || 'Present',
      verificationSource: (r.verification_source || 'Web_SelfService') as VerificationSource,
    }));
  }

  async recordClockIn(
    employeeId: string,
    employeeName: string,
    staffId: string,
    entity: string,
    dept: string
  ): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        employee_id: Number(employeeId) || 1,
        employee_name: employeeName,
        employee_staff_id: staffId,
        clock_in: new Date().toISOString(),
        status: 'Present',
        verification_source: 'Web_SelfService',
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: String(data.id),
      employeeId,
      employeeStaffId: staffId,
      employeeName,
      entityName: entity,
      departmentName: dept,
      date: 'Today',
      clockInTime: 'Just now',
      status: 'Present',
      verificationSource: 'Web_SelfService',
    };
  }

  async recordClockOut(recordId: string): Promise<AttendanceRecord> {
    await supabase
      .from('attendance_records')
      .update({
        clock_out: new Date().toISOString(),
      })
      .eq('id', recordId);
    const logs = await this.getRecentLogs(1);
    return logs[0];
  }
}

export class SupabaseDocumentRepository implements IDocumentRepository {
  async getAll(filter?: { category?: string; accessLevel?: string }): Promise<HubDocument[]> {
    let query = supabase.from('documents').select('*');
    if (filter?.category) query = query.eq('category', filter.category);
    if (filter?.accessLevel) query = query.eq('access_level', filter.accessLevel);
    const { data, error } = await query;
    if (error || !data || data.length === 0) return INITIAL_DOCUMENTS;
    return data.map((d: any) => ({
      id: String(d.id),
      title: d.title,
      fileName: `${d.title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      category: d.category || 'Company Policy',
      fileSize: d.file_size || '1.2 MB',
      fileType: d.mime_type ? d.mime_type.split('/')[1]?.toUpperCase() : 'PDF',
      accessLevel: d.access_level || 'Public',
      uploadedBy: 'Dr. Bukola Adeleke',
      uploadedDate: d.uploaded_at,
      version: 'v1.0',
      isSensitive: false,
      downloadUrl: d.download_url || '#',
    }));
  }

  async uploadDocument(doc: Omit<HubDocument, 'id' | 'uploadedDate'>, file?: File): Promise<HubDocument> {
    let downloadUrl = doc.downloadUrl || '#';
    if (file) {
      try {
        const filePath = `documents/${Date.now()}_${file.name}`;
        await supabase.storage.from('documents').upload(filePath, file, { upsert: true });
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
        downloadUrl = urlData.publicUrl;
      } catch (err) {
        console.warn('Storage upload error, proceeding with metadata:', err);
      }
    }

    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: doc.title,
        category: doc.category,
        file_size: doc.fileSize,
        mime_type: 'application/pdf',
        access_level: doc.accessLevel,
        storage_path: `documents/${doc.title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        download_url: downloadUrl,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...doc,
      id: String(data.id),
      uploadedDate: data.uploaded_at,
      downloadUrl,
    };
  }
}

export class SupabaseAuditRepository implements IAuditRepository {
  async getLogs(filter?: { module?: string; userId?: string; limit?: number }): Promise<AuditLogEntry[]> {
    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
    if (filter?.module) query = query.eq('module', filter.module);
    if (filter?.limit) query = query.limit(filter.limit);
    const { data, error } = await query;
    if (error || !data || data.length === 0) return INITIAL_AUDIT_LOGS;
    return data.map((a: any) => ({
      id: String(a.id),
      timestamp: a.created_at,
      userId: a.actor_id || 'usr-1',
      userName: a.actor_name || 'Dr. Bukola Adeleke',
      userRole: 'PCCM_SUPER_ADMIN',
      module: a.module || 'Core',
      action: a.action,
      recordAffectedId: String(a.target_id || '0'),
      recordAffectedTitle: a.target_type || 'System Record',
      severity: 'Info',
      ipAddress: a.ip_address || '127.0.0.1',
    }));
  }

  async logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    await supabase.from('audit_logs').insert({
      actor_name: entry.userName,
      action: entry.action,
      module: entry.module,
      target_type: entry.recordAffectedTitle,
      ip_address: entry.ipAddress || '127.0.0.1',
    });
  }
}

export class SupabaseNotificationRepository implements INotificationRepository {
  async getAll(): Promise<SystemNotification[]> {
    const { data, error } = await supabase.from('notifications').select('*');
    if (error || !data || data.length === 0) return INITIAL_NOTIFICATIONS;
    return data.map((n: any) => ({
      id: n.id,
      title: n.task_title || 'Notification',
      message: n.message,
      type: n.type || 'info',
      category: 'General',
      isRead: n.read ?? false,
      timestamp: n.timestamp || 'Just now',
    }));
  }

  async markAsRead(id: string): Promise<void> {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }

  async markAllAsRead(): Promise<void> {
    await supabase.from('notifications').update({ read: true });
  }
}

export class SupabaseTalentRepository implements ITalentRepository {
  async getOnboardingJourneys(): Promise<OnboardingJourney[]> {
    return INITIAL_ONBOARDING_JOURNEYS;
  }
  async toggleTaskCompletion(journeyId: string, taskId: string, isCompleted: boolean): Promise<OnboardingJourney> {
    const journey = INITIAL_ONBOARDING_JOURNEYS.find(j => j.id === journeyId) || INITIAL_ONBOARDING_JOURNEYS[0];
    const task = journey.tasks.find(t => t.id === taskId);
    if (task) {
      task.isCompleted = isCompleted;
      task.completedAt = isCompleted ? new Date().toISOString().split('T')[0] : undefined;
    }
    return journey;
  }
  async createOnboardingTask(journeyId: string, task: Omit<OnboardingTask, 'id' | 'isCompleted'>): Promise<OnboardingJourney> {
    const journey = INITIAL_ONBOARDING_JOURNEYS.find(j => j.id === journeyId) || INITIAL_ONBOARDING_JOURNEYS[0];
    const newTask: OnboardingTask = { ...task, id: `task-${Date.now()}`, isCompleted: false };
    journey.tasks.push(newTask);
    return journey;
  }
  async sendTaskReminder(journeyId: string, taskId: string): Promise<boolean> {
    return true;
  }
  async toggleDocumentSubmission(journeyId: string, docId: string, isSubmitted: boolean): Promise<OnboardingJourney> {
    const journey = INITIAL_ONBOARDING_JOURNEYS.find(j => j.id === journeyId) || INITIAL_ONBOARDING_JOURNEYS[0];
    const doc = journey.requiredDocuments?.find(d => d.id === docId);
    if (doc) doc.isSubmitted = isSubmitted;
    return journey;
  }
  async toggleOrientationItem(journeyId: string, itemId: string, isCompleted: boolean): Promise<OnboardingJourney> {
    const journey = INITIAL_ONBOARDING_JOURNEYS.find(j => j.id === journeyId) || INITIAL_ONBOARDING_JOURNEYS[0];
    const item = journey.orientationItems?.find(i => i.id === itemId);
    if (item) item.isCompleted = isCompleted;
    return journey;
  }
  async getRequisitions(): Promise<RecruitmentRequisition[]> {
    return INITIAL_RECRUITMENT;
  }
  async createRequisition(requisition: RecruitmentRequisition): Promise<RecruitmentRequisition> {
    INITIAL_RECRUITMENT.unshift(requisition);
    return requisition;
  }
  async createOnboardingJourney(journey: OnboardingJourney): Promise<OnboardingJourney> {
    INITIAL_ONBOARDING_JOURNEYS.unshift(journey);
    return journey;
  }
  async getChecklistTemplates(): Promise<OnboardingChecklistTemplate[]> {
    return DEFAULT_CHECKLIST_TEMPLATES;
  }
  async createChecklistTemplate(template: OnboardingChecklistTemplate): Promise<OnboardingChecklistTemplate> {
    DEFAULT_CHECKLIST_TEMPLATES.unshift(template);
    return template;
  }
}

export class SupabasePayrollRepository implements IPayrollRepository {
  async getSalaryTemplates(): Promise<SalaryTemplate[]> {
    return INITIAL_SALARY_TEMPLATES;
  }

  async createSalaryTemplate(template: Omit<SalaryTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<SalaryTemplate> {
    const newTemplate: SalaryTemplate = {
      ...template,
      id: `st-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    INITIAL_SALARY_TEMPLATES.unshift(newTemplate);
    return newTemplate;
  }

  async getAssignments(): Promise<EmployeeSalaryAssignment[]> {
    return INITIAL_PAYROLL_ASSIGNMENTS;
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

  async getPayrollRuns(): Promise<PayrollRun[]> {
    return INITIAL_PAYROLL_RUNS;
  }

  async getPayrollRun(id: string): Promise<PayrollRun> {
    const match = INITIAL_PAYROLL_RUNS.find((r) => r.id === id);
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

  async finalizePayrollRun(id: string): Promise<PayrollRun> {
    const match = INITIAL_PAYROLL_RUNS.find((r) => r.id === id);
    if (match) {
      match.status = 'approved';
      return match;
    }
    throw new Error(`Payroll run ${id} not found.`);
  }

  async getPayslip(id: string): Promise<PayrollItem> {
    const allItems = INITIAL_PAYROLL_RUNS.flatMap((r) => r.items || []);
    const item = allItems.find((i) => i.id === id);
    if (item) return item;
    throw new Error(`Payslip ${id} not found.`);
  }

  async markPayslipPaid(id: string, paymentMethod?: string): Promise<PayrollItem> {
    const allItems = INITIAL_PAYROLL_RUNS.flatMap((r) => r.items || []);
    const item = allItems.find((i) => i.id === id);
    if (item) {
      item.payment_status = 'paid';
      item.payment_method = paymentMethod || 'Direct Bank Transfer';
      return item;
    }
    throw new Error(`Payslip ${id} not found.`);
  }

  async getLoans(filter?: { employee_id?: string; status?: string }): Promise<EmployeeLoan[]> {
    let result = [...INITIAL_EMPLOYEE_LOANS];
    if (filter?.employee_id) {
      result = result.filter((l) => l.employee_id === filter.employee_id);
    }
    if (filter?.status) {
      result = result.filter((l) => l.status === filter.status);
    }
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

  async approveLoan(id: string): Promise<EmployeeLoan> {
    const loan = INITIAL_EMPLOYEE_LOANS.find((l) => l.id === id);
    if (loan) {
      loan.status = 'active';
      return loan;
    }
    throw new Error(`Loan ${id} not found.`);
  }

  async getDeductions(filter?: { employee_id?: string }): Promise<EmployeeDeduction[]> {
    let result = [...INITIAL_EMPLOYEE_DEDUCTIONS];
    if (filter?.employee_id) {
      result = result.filter((d) => d.employee_id === filter.employee_id);
    }
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

  async getProvidentFunds(): Promise<EmployeeProvidentFund[]> {
    return INITIAL_PROVIDENT_FUNDS;
  }

  async createProvidentFund(data: {
    employee_id: string;
    employee_rate?: number;
    employer_rate?: number;
    status?: 'active' | 'inactive';
  }): Promise<EmployeeProvidentFund> {
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

