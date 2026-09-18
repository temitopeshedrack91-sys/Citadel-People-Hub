/**
 * In-Memory Mock Repository Implementation
 * Citadel People Hub
 * 
 * Implements data access interfaces with realistic async delays,
 * state persistence during session, and automatic audit logging.
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
  RecruitmentRequisition,
} from '../types';
import {
  INITIAL_ENTITIES,
  INITIAL_DEPARTMENTS,
  INITIAL_EMPLOYEES,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_ATTENDANCE_SUMMARY,
  INITIAL_AUDIT_LOGS,
  INITIAL_ONBOARDING_JOURNEYS,
  INITIAL_DOCUMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_RECRUITMENT,
} from '../data/mockData';

// Simulated database state
let entities = [...INITIAL_ENTITIES];
let departments = [...INITIAL_DEPARTMENTS];
let employees = [...INITIAL_EMPLOYEES];
let leaveRequests = [...INITIAL_LEAVE_REQUESTS];
let auditLogs = [...INITIAL_AUDIT_LOGS];
let onboardingJourneys = [...INITIAL_ONBOARDING_JOURNEYS];
let documents = [...INITIAL_DOCUMENTS];
let notifications = [...INITIAL_NOTIFICATIONS];
let requisitions = [...INITIAL_RECRUITMENT];

const sleep = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

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
    return created;
  }

  async update(id: string, updates: Partial<Employee>): Promise<Employee> {
    await sleep();
    const index = employees.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Employee not found');
    employees[index] = { ...employees[index], ...updates };
    return employees[index];
  }

  async delete(id: string): Promise<boolean> {
    await sleep();
    const initialLen = employees.length;
    employees = employees.filter((e) => e.id !== id);
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
    return created;
  }

  async updateDepartment(id: string, updates: Partial<CitadelDepartment>): Promise<CitadelDepartment> {
    await sleep();
    const index = departments.findIndex((d) => d.id === id);
    if (index === -1) throw new Error('Department not found');
    departments[index] = { ...departments[index], ...updates };
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
    return leaveRequests[index];
  }
}

export class MockAttendanceRepository implements IAttendanceRepository {
  async getTodaySummary(): Promise<any> {
    await sleep();
    return { ...INITIAL_ATTENDANCE_SUMMARY };
  }

  async getRecentLogs(limit = 10): Promise<AttendanceRecord[]> {
    await sleep();
    const records: AttendanceRecord[] = [
      {
        id: 'att-1',
        employeeId: 'emp-1',
        employeeStaffId: 'CGCC/004',
        employeeName: 'Dr. Bukola Adeleke',
        entityName: 'Citadel Global Community Church (CGCC)',
        departmentName: 'People, Culture & Change',
        date: '2026-09-18',
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
        date: '2026-09-18',
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
        date: '2026-09-18',
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
        date: '2026-09-18',
        status: 'On Leave',
        verificationSource: 'Manual_PCCM',
      },
    ];
    return records.slice(0, limit);
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
    return record;
  }

  async recordClockOut(recordId: string): Promise<AttendanceRecord> {
    await sleep();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      id: recordId,
      employeeId: 'self',
      employeeStaffId: 'CGCC/SELF',
      employeeName: 'Logged In User',
      entityName: 'Citadel',
      departmentName: 'Department',
      date: now.toISOString().split('T')[0],
      clockOutTime: timeStr,
      status: 'Present',
      verificationSource: 'Web_SelfService',
    };
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

  async uploadDocument(doc: Omit<HubDocument, 'id' | 'uploadedDate'>): Promise<HubDocument> {
    await sleep();
    const created: HubDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadedDate: new Date().toISOString().split('T')[0],
    };
    documents.unshift(created);
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
  }

  async markAllAsRead(): Promise<void> {
    await sleep();
    notifications = notifications.map((n) => ({ ...n, isRead: true }));
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
    return journey;
  }

  async getRequisitions(): Promise<RecruitmentRequisition[]> {
    await sleep();
    return [...requisitions];
  }
}
