/**
 * Data Service Singleton Instances
 * Citadel People Hub
 *
 * Production data access goes through Laravel. Mock repositories are available
 * only in development when no Laravel API URL is configured.
 */

import {
  LaravelAttendanceRepository,
  LaravelAuditRepository,
  LaravelDocumentRepository,
  LaravelEmployeeRepository,
  LaravelLeaveRepository,
  LaravelNotificationRepository,
  LaravelOrganizationRepository,
  LaravelTalentRepository,
} from './laravelAdapter';
import { isLaravelApiConfigured } from './laravelClient';
import {
  MockAttendanceRepository,
  MockAuditRepository,
  MockDocumentRepository,
  MockEmployeeRepository,
  MockLeaveRepository,
  MockNotificationRepository,
  MockOrganizationRepository,
  MockTalentRepository,
} from './mockRepository';

const useLaravelApi = isLaravelApiConfigured();

if (import.meta.env.PROD && !useLaravelApi) {
  throw new Error('VITE_API_BASE_URL must be configured for production builds.');
}

export const employeeRepository = useLaravelApi ? new LaravelEmployeeRepository() : new MockEmployeeRepository();
export const organizationRepository = useLaravelApi ? new LaravelOrganizationRepository() : new MockOrganizationRepository();
export const leaveRepository = useLaravelApi ? new LaravelLeaveRepository() : new MockLeaveRepository();
export const attendanceRepository = useLaravelApi ? new LaravelAttendanceRepository() : new MockAttendanceRepository();
export const auditRepository = useLaravelApi ? new LaravelAuditRepository() : new MockAuditRepository();
export const documentRepository = useLaravelApi ? new LaravelDocumentRepository() : new MockDocumentRepository();
export const notificationRepository = useLaravelApi ? new LaravelNotificationRepository() : new MockNotificationRepository();
export const talentRepository = useLaravelApi ? new LaravelTalentRepository() : new MockTalentRepository();
