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
} from './laravelAdapter';
import { isLaravelApiConfigured } from './laravelClient';
import {
  SupabaseAttendanceRepository,
  SupabaseAuditRepository,
  SupabaseDocumentRepository,
  SupabaseEmployeeRepository,
  SupabaseLeaveRepository,
  SupabaseNotificationRepository,
  SupabaseOrganizationRepository,
  SupabaseTalentRepository,
} from './supabaseAdapter';

const useLaravelApi = isLaravelApiConfigured();

export const employeeRepository = useLaravelApi ? new LaravelEmployeeRepository() : new SupabaseEmployeeRepository();
export const organizationRepository = useLaravelApi ? new LaravelOrganizationRepository() : new SupabaseOrganizationRepository();
export const leaveRepository = useLaravelApi ? new LaravelLeaveRepository() : new SupabaseLeaveRepository();
export const attendanceRepository = useLaravelApi ? new LaravelAttendanceRepository() : new SupabaseAttendanceRepository();
export const auditRepository = useLaravelApi ? new LaravelAuditRepository() : new SupabaseAuditRepository();
export const documentRepository = useLaravelApi ? new LaravelDocumentRepository() : new SupabaseDocumentRepository();
export const notificationRepository = useLaravelApi ? new LaravelNotificationRepository() : new SupabaseNotificationRepository();
export const talentRepository = useLaravelApi ? new LaravelTalentRepository() : new SupabaseTalentRepository();
