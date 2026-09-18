/**
 * Notifications Types
 * Citadel People Hub
 */

import { UserRole } from './auth';

export type NotificationType =
  | 'LEAVE_REQUEST'
  | 'LEAVE_APPROVAL'
  | 'WORKFLOW_ACTION'
  | 'ONBOARDING_ASSIGNED'
  | 'POLICY_UPDATE'
  | 'SYSTEM_ALERT';

export interface SystemNotification {
  id: string;
  type: NotificationType;
  category?: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  targetUserRole?: UserRole;
  targetUserId?: string;
  actionUrl?: string;
}
