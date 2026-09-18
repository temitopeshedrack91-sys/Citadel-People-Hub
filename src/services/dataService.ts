/**
 * Data Service Singleton Instances
 * Citadel People Hub
 */

import {
  MockEmployeeRepository,
  MockOrganizationRepository,
  MockLeaveRepository,
  MockAttendanceRepository,
  MockAuditRepository,
  MockDocumentRepository,
  MockNotificationRepository,
  MockTalentRepository,
} from './mockRepository';

export const employeeRepository = new MockEmployeeRepository();
export const organizationRepository = new MockOrganizationRepository();
export const leaveRepository = new MockLeaveRepository();
export const attendanceRepository = new MockAttendanceRepository();
export const auditRepository = new MockAuditRepository();
export const documentRepository = new MockDocumentRepository();
export const notificationRepository = new MockNotificationRepository();
export const talentRepository = new MockTalentRepository();
