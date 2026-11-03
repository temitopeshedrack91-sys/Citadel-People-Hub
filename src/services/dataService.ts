/**
 * Data Service Singleton Instances
 * Citadel People Hub
 *
 * Connected directly to Supabase PostgreSQL & Storage, with optional Laravel API adapter.
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
  LaravelPayrollRepository,
} from './laravelAdapter';
import { isLaravelApiConfigured } from './laravelClient';
import { canUseSupabaseDirectAccess, shouldUseLaravelBackend } from '../utils/authMode';
import { IAttendanceRepository, ITalentRepository } from './interfaces';
import {
  MockAttendanceRepository,
  MockAuditRepository,
  MockDocumentRepository,
  MockEmployeeRepository,
  MockLeaveRepository,
  MockNotificationRepository,
  MockOrganizationRepository,
  MockPayrollRepository,
  MockTalentRepository,
} from './mockRepository';
import {
  SupabaseAttendanceRepository,
  SupabaseAuditRepository,
  SupabaseDocumentRepository,
  SupabaseEmployeeRepository,
  SupabaseLeaveRepository,
  SupabaseNotificationRepository,
  SupabaseOrganizationRepository,
  SupabaseTalentRepository,
  SupabasePayrollRepository,
} from './supabaseAdapter';

// Production and configured environments use the authenticated API. Browser
// database access is limited to an explicit local-development opt-in because
// the canonical project's RLS and Storage policies have not been verified.
const useLaravelApi = shouldUseLaravelBackend(import.meta.env.PROD, isLaravelApiConfigured());
const useSupabaseDirectAccess = canUseSupabaseDirectAccess(
  import.meta.env.DEV,
  useLaravelApi,
  import.meta.env.VITE_ENABLE_SUPABASE_DIRECT_DEV_ACCESS === 'true'
);

export const employeeRepository = useLaravelApi
  ? new LaravelEmployeeRepository()
  : useSupabaseDirectAccess ? new SupabaseEmployeeRepository() : new MockEmployeeRepository();
export const organizationRepository = useLaravelApi
  ? new LaravelOrganizationRepository()
  : useSupabaseDirectAccess ? new SupabaseOrganizationRepository() : new MockOrganizationRepository();
export const leaveRepository = useLaravelApi
  ? new LaravelLeaveRepository()
  : useSupabaseDirectAccess ? new SupabaseLeaveRepository() : new MockLeaveRepository();
export const attendanceRepository: IAttendanceRepository = useLaravelApi
  ? new LaravelAttendanceRepository()
  : useSupabaseDirectAccess ? new SupabaseAttendanceRepository() : new MockAttendanceRepository();
export const auditRepository = useLaravelApi
  ? new LaravelAuditRepository()
  : useSupabaseDirectAccess ? new SupabaseAuditRepository() : new MockAuditRepository();
export const documentRepository = useLaravelApi
  ? new LaravelDocumentRepository()
  : useSupabaseDirectAccess ? new SupabaseDocumentRepository() : new MockDocumentRepository();
export const notificationRepository = useLaravelApi
  ? new LaravelNotificationRepository()
  : useSupabaseDirectAccess ? new SupabaseNotificationRepository() : new MockNotificationRepository();
export const talentRepository: ITalentRepository = useLaravelApi
  ? new LaravelTalentRepository()
  : useSupabaseDirectAccess ? new SupabaseTalentRepository() : new MockTalentRepository();
export const payrollRepository = useLaravelApi
  ? new LaravelPayrollRepository()
  : useSupabaseDirectAccess ? new SupabasePayrollRepository() : new MockPayrollRepository();

