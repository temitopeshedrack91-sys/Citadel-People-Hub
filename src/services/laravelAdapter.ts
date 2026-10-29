import {
  IAttendanceRepository,
  IAuditRepository,
  IDocumentRepository,
  IEmployeeRepository,
  ILeaveRepository,
  INotificationRepository,
  IOrganizationRepository,
  ITalentRepository,
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
} from '../types';
import { LaravelApiError, requestLaravel, requestLaravelData } from './laravelClient';

export class LaravelEmployeeRepository implements IEmployeeRepository {
  getAll(filter?: { entityId?: string; departmentId?: string; search?: string }): Promise<Employee[]> {
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
  getOnboardingJourneys(): Promise<OnboardingJourney[]> {
    return requestLaravelData('/onboarding-journeys');
  }

  toggleTaskCompletion(journeyId: string, taskId: string, isCompleted: boolean): Promise<OnboardingJourney> {
    return requestLaravelData(
      `/onboarding-journeys/${encodeURIComponent(journeyId)}/tasks/${encodeURIComponent(taskId)}`,
      { method: 'PATCH', body: JSON.stringify({ isCompleted }) }
    );
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

  getRequisitions(): Promise<RecruitmentRequisition[]> {
    return requestLaravelData('/requisitions');
  }

  createOnboardingJourney(journey: OnboardingJourney): Promise<OnboardingJourney> {
    return requestLaravelData('/onboarding-journeys', {
      method: 'POST',
      body: JSON.stringify(journey),
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
