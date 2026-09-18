/**
 * Audit Log Structure
 * Citadel People Hub
 */

import { UserRole } from './auth';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  module: string;
  action: string;
  recordAffectedId: string;
  recordAffectedTitle: string;
  previousValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
  severity: 'Info' | 'Warning' | 'Critical';
}
