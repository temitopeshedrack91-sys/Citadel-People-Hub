/**
 * Attendance & Hardware Integration Types
 * Citadel People Hub
 */

export type AttendanceStatus =
  | 'Present'
  | 'Late'
  | 'On Leave'
  | 'Absent'
  | 'Half-Day'
  | 'Excused';

export type VerificationSource =
  | 'Biometric_ZKTeco'
  | 'Card_RFID'
  | 'Mobile_GPS'
  | 'Mobile_App'
  | 'Web_SelfService'
  | 'Manual_PCCM';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeStaffId: string;
  employeeName: string;
  entityName: string;
  departmentName: string;
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  durationHours?: number;
  status: AttendanceStatus;
  verificationSource: VerificationSource;
  deviceId?: string;
  notes?: string;
}

export interface AttendanceDeviceConfig {
  deviceId: string;
  deviceName: string;
  location: string;
  entity: string;
  model: string; // e.g., 'ZKTeco SilkBio-101TC'
  ipAddress: string;
  port: number;
  lastHeartbeat: string;
  status: 'Online' | 'Offline' | 'Syncing' | 'Pending_Setup';
}
