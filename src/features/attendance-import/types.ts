/**
 * Attendance Import Types
 * Citadel People Hub
 */

export type PunchDirection = 'in' | 'out' | 'unknown';

export interface BiometricPunch {
  deviceId: string;
  /** Normalized local wall-clock timestamp: YYYY-MM-DDTHH:mm:ss */
  timestamp: string;
  /** Local calendar date: YYYY-MM-DD */
  date: string;
  /** Local time: HH:mm:ss */
  time: string;
  direction: PunchDirection;
  rawDirection?: string;
  sourceLine?: number;
}

export interface StaffIdentity {
  id: string;
  staffId: string;
  fullName: string;
  entityName?: string;
  departmentName?: string;
  /** Optional explicit biometric ID if a staff record stores one directly. */
  biometricDeviceId?: string;
}

export interface MatchedPunch extends BiometricPunch {
  employeeId: string;
  employeeStaffId: string;
  employeeName: string;
  entityName: string;
  departmentName: string;
}

export type UnmatchedReason =
  | 'no_staff_record'
  | 'ambiguous_staff_match'
  | 'invalid_device_id_format';

export interface UnmatchedDeviceRecord {
  deviceId: string;
  reason: UnmatchedReason;
  occurrences: number;
  firstTimestamp: string;
  lastTimestamp: string;
  sourceLines: number[];
  candidateStaffIds: string[];
}

export interface PunchDirectionCount {
  in: number;
  out: number;
  unknown: number;
}

export interface DailyAttendanceSummary {
  id: string;
  employeeId: string;
  employeeStaffId: string;
  employeeName: string;
  entityName: string;
  departmentName: string;
  /** Local calendar date: YYYY-MM-DD */
  date: string;
  /** First punch of the day: HH:mm:ss */
  clockInTime: string;
  /** Last punch of the day: HH:mm:ss */
  clockOutTime: string;
  firstPunchAt: string;
  lastPunchAt: string;
  punchCount: number;
  punchDirections: PunchDirectionCount;
  punches: MatchedPunch[];
}

export interface SkippedExportRow {
  line: number;
  reason: string;
  raw: string;
}

export interface BiometricParseResult {
  punches: BiometricPunch[];
  skippedRows: SkippedExportRow[];
  delimiter: string;
  hasHeader: boolean;
}

export interface AttendanceImportResult {
  fileName: string;
  importedAt: string;
  totalRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  duplicateRecords: number;
  storedPunchCount: number;
  unmatchedDeviceIds: UnmatchedDeviceRecord[];
  summaries: DailyAttendanceSummary[];
  matchedPunches: MatchedPunch[];
  skippedRows: SkippedExportRow[];
}

export interface AttendanceImportSnapshot {
  punchCount: number;
  summaries: DailyAttendanceSummary[];
  unmatchedDeviceIds: UnmatchedDeviceRecord[];
  lastImportedAt?: string;
  lastFileName?: string;
}

export interface StoredAttendanceState {
  punches: BiometricPunch[];
  lastImportedAt?: string;
  lastFileName?: string;
}
