import { isLaravelApiConfigured, requestLaravelData } from './laravelClient';
import type {
  LifecycleEventRecord,
  ProfileChangeRequest,
  WorkbookRole,
} from '../domain/workbook';

const CHANGE_REQ_STORAGE_KEY = 'citadel_workbook_profile_change_requests';
const LIFECYCLE_STORAGE_KEY = 'citadel_workbook_lifecycle_events';

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

interface LaravelProfileChangeDTO {
  id: string;
  employeeId: string;
  employeeStaffId: string;
  employeeName: string;
  requestedByName: string;
  requestedByRole: string;
  requestedAt: string;
  changes: Array<{ fieldKey: string; fieldLabel?: string; oldValue?: string; newValue: string }>;
  reason: string;
  status: 'PENDING_HR_APPROVAL' | 'APPROVED' | 'REJECTED';
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  reviewComments?: string | null;
}

interface LaravelLifecycleDTO {
  id: string;
  employeeId: string;
  employeeStaffId: string;
  employeeName: string;
  eventType: LifecycleEventRecord['eventType'];
  triggerReason: string;
  initiatedByName: string;
  initiatedAt: string;
  status: string;
  details?: Record<string, string>;
  approvedByName?: string | null;
  approvedAt?: string | null;
}

function mapDtoToProfileChange(dto: LaravelProfileChangeDTO): ProfileChangeRequest {
  const proposedChanges: Record<string, string> = {};
  const previousValues: Record<string, string> = {};
  for (const item of dto.changes || []) {
    proposedChanges[item.fieldKey] = item.newValue;
    previousValues[item.fieldKey] = item.oldValue ?? '';
  }
  return {
    id: dto.id,
    employeeId: dto.employeeId,
    employeeStaffId: dto.employeeStaffId,
    employeeName: dto.employeeName,
    requestedByName: dto.requestedByName,
    requestedByRole: (dto.requestedByRole as WorkbookRole) || 'EMPLOYEE',
    proposedChanges,
    previousValues,
    reason: dto.reason,
    status: dto.status,
    createdAt: dto.requestedAt,
    reviewedBy: dto.reviewedByName ?? undefined,
    reviewedAt: dto.reviewedAt ?? undefined,
    reviewComments: dto.reviewComments ?? undefined,
  };
}

function mapDtoToLifecycle(dto: LaravelLifecycleDTO): LifecycleEventRecord {
  return {
    id: dto.id,
    eventType: dto.eventType,
    employeeId: dto.employeeId,
    employeeName: dto.employeeName,
    trigger: dto.triggerReason,
    requiredAction: `HR governance review for ${dto.eventType}`,
    approverRole: 'SUPER_ADMIN_HR',
    approvedBy: dto.approvedByName ?? undefined,
    approvedAt: dto.approvedAt ?? undefined,
    effectiveDate: (dto.initiatedAt || new Date().toISOString()).slice(0, 10),
    changes: dto.details || {},
    recordsUpdated: Object.keys(dto.details || {}),
    status: dto.status === 'APPROVED' ? 'APPLIED' : 'PENDING_APPROVAL',
  };
}

export const governanceRepository = {
  async listProfileChangeRequests(): Promise<ProfileChangeRequest[]> {
    if (isLaravelApiConfigured()) {
      const rows = await requestLaravelData<LaravelProfileChangeDTO[]>('/governance/profile-change-requests');
      return rows.map(mapDtoToProfileChange);
    }
    return loadLocal<ProfileChangeRequest[]>(CHANGE_REQ_STORAGE_KEY, []);
  },

  async createProfileChangeRequest(request: ProfileChangeRequest): Promise<ProfileChangeRequest> {
    if (isLaravelApiConfigured()) {
      const changes = Object.entries(request.proposedChanges).map(([fieldKey, newValue]) => ({
        fieldKey,
        fieldLabel: fieldKey,
        oldValue: request.previousValues[fieldKey] ?? '',
        newValue,
      }));
      const dto = await requestLaravelData<LaravelProfileChangeDTO>('/governance/profile-change-requests', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: request.employeeId,
          changes,
          reason: request.reason,
        }),
      });
      return mapDtoToProfileChange(dto);
    }
    const current = loadLocal<ProfileChangeRequest[]>(CHANGE_REQ_STORAGE_KEY, []);
    const next = [request, ...current];
    saveLocal(CHANGE_REQ_STORAGE_KEY, next);
    return request;
  },

  async reviewProfileChangeRequest(
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    comments?: string,
    localFallbackUpdated?: ProfileChangeRequest
  ): Promise<ProfileChangeRequest> {
    if (isLaravelApiConfigured()) {
      const dto = await requestLaravelData<LaravelProfileChangeDTO>(
        `/governance/profile-change-requests/${id}/review`,
        {
          method: 'PATCH',
          body: JSON.stringify({ decision, comments }),
        }
      );
      return mapDtoToProfileChange(dto);
    }
    const current = loadLocal<ProfileChangeRequest[]>(CHANGE_REQ_STORAGE_KEY, []);
    const next = current.map((item) =>
      item.id === id && localFallbackUpdated ? localFallbackUpdated : item
    );
    saveLocal(CHANGE_REQ_STORAGE_KEY, next);
    return localFallbackUpdated || current.find((item) => item.id === id)!;
  },

  async listLifecycleEvents(): Promise<LifecycleEventRecord[]> {
    if (isLaravelApiConfigured()) {
      const rows = await requestLaravelData<LaravelLifecycleDTO[]>('/governance/lifecycle-events');
      return rows.map(mapDtoToLifecycle);
    }
    return loadLocal<LifecycleEventRecord[]>(LIFECYCLE_STORAGE_KEY, []);
  },

  async createLifecycleEvent(event: LifecycleEventRecord): Promise<LifecycleEventRecord> {
    if (isLaravelApiConfigured()) {
      const dto = await requestLaravelData<LaravelLifecycleDTO>('/governance/lifecycle-events', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: event.employeeId,
          eventType: event.eventType,
          triggerReason: event.trigger,
          details: event.changes,
        }),
      });
      return mapDtoToLifecycle(dto);
    }
    const current = loadLocal<LifecycleEventRecord[]>(LIFECYCLE_STORAGE_KEY, []);
    const next = [event, ...current];
    saveLocal(LIFECYCLE_STORAGE_KEY, next);
    return event;
  },

  async approveLifecycleEvent(
    id: string,
    localFallbackUpdated?: LifecycleEventRecord
  ): Promise<LifecycleEventRecord> {
    if (isLaravelApiConfigured()) {
      const dto = await requestLaravelData<LaravelLifecycleDTO>(
        `/governance/lifecycle-events/${id}/approve`,
        {
          method: 'PATCH',
        }
      );
      return mapDtoToLifecycle(dto);
    }
    const current = loadLocal<LifecycleEventRecord[]>(LIFECYCLE_STORAGE_KEY, []);
    const next = current.map((item) =>
      item.id === id && localFallbackUpdated ? localFallbackUpdated : item
    );
    saveLocal(LIFECYCLE_STORAGE_KEY, next);
    return localFallbackUpdated || current.find((item) => item.id === id)!;
  },
};
