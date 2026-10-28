/**
 * Attendance import service
 * Citadel People Hub
 *
 * The service keeps the raw biometric punches, not just the daily totals, so
 * the matching rule can change later and every upload can be re-evaluated.
 * Raw punches are de-duplicated with the identity from staffMatcher:
 * staff ID + timestamp (device ID + timestamp when the staff is unmatched).
 */

import { parseBiometricExport } from './parseBiometricExport';
import {
  buildPunchIdentity,
  matchPunchesToStaff,
  StaffMatchingOptions,
} from './staffMatcher';
import { summarizeDailyAttendance } from './summarizeAttendance';
import {
  AttendanceImportResult,
  AttendanceImportSnapshot,
  BiometricPunch,
  DailyAttendanceSummary,
  SkippedExportRow,
  StaffIdentity,
  StoredAttendanceState,
} from './types';

export const ATTENDANCE_IMPORT_STORAGE_KEY = 'citadel_biometric_attendance_v1';

export interface AttendanceImportStorage {
  load(): StoredAttendanceState;
  save(state: StoredAttendanceState): void;
  clear(): void;
}

const EMPTY_STATE: StoredAttendanceState = { punches: [] };

function cloneState(state: StoredAttendanceState): StoredAttendanceState {
  return {
    punches: [...state.punches],
    lastImportedAt: state.lastImportedAt,
    lastFileName: state.lastFileName,
  };
}

export class MemoryAttendanceImportStorage implements AttendanceImportStorage {
  private state: StoredAttendanceState = cloneState(EMPTY_STATE);

  load(): StoredAttendanceState {
    return cloneState(this.state);
  }

  save(state: StoredAttendanceState): void {
    this.state = cloneState(state);
  }

  clear(): void {
    this.state = cloneState(EMPTY_STATE);
  }
}

export class LocalStorageAttendanceImportStorage implements AttendanceImportStorage {
  load(): StoredAttendanceState {
    if (typeof window === 'undefined') return cloneState(EMPTY_STATE);
    try {
      const raw = window.localStorage.getItem(ATTENDANCE_IMPORT_STORAGE_KEY);
      if (!raw) return cloneState(EMPTY_STATE);
      const parsed = JSON.parse(raw) as Partial<StoredAttendanceState>;
      if (!parsed || !Array.isArray(parsed.punches)) return cloneState(EMPTY_STATE);
      return {
        punches: parsed.punches.filter(
          (punch): punch is BiometricPunch =>
            !!punch &&
            typeof punch.deviceId === 'string' &&
            typeof punch.timestamp === 'string' &&
            typeof punch.date === 'string' &&
            typeof punch.time === 'string'
        ),
        lastImportedAt: parsed.lastImportedAt,
        lastFileName: parsed.lastFileName,
      };
    } catch {
      return cloneState(EMPTY_STATE);
    }
  }

  save(state: StoredAttendanceState): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ATTENDANCE_IMPORT_STORAGE_KEY, JSON.stringify(state));
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(ATTENDANCE_IMPORT_STORAGE_KEY);
  }
}

export interface RunAttendanceImportInput {
  existingPunches: BiometricPunch[];
  incomingPunches: BiometricPunch[];
  staff: StaffIdentity[];
  matchingOptions?: StaffMatchingOptions;
  fileName?: string;
  importedAt?: string;
  skippedRows?: SkippedExportRow[];
}

export interface RunAttendanceImportOutput {
  result: AttendanceImportResult;
  state: StoredAttendanceState;
}

function emptySummary(): DailyAttendanceSummary[] {
  return [];
}

export function runAttendanceImport({
  existingPunches,
  incomingPunches,
  staff,
  matchingOptions,
  fileName = '',
  importedAt = new Date().toISOString(),
  skippedRows = [],
}: RunAttendanceImportInput): RunAttendanceImportOutput {
  const identities = new Set<string>();
  const merged: BiometricPunch[] = [];

  for (const punch of existingPunches) {
    const identity = buildPunchIdentity(punch, staff, matchingOptions);
    if (identities.has(identity)) continue;
    identities.add(identity);
    merged.push(punch);
  }

  let duplicateRecords = 0;
  let matchedRecords = 0;

  for (const punch of incomingPunches) {
    const identity = buildPunchIdentity(punch, staff, matchingOptions);
    const match = matchPunchesToStaff([punch], staff, matchingOptions);
    if (match.matched.length === 1) matchedRecords += 1;

    if (identities.has(identity)) {
      duplicateRecords += 1;
      continue;
    }

    identities.add(identity);
    merged.push(punch);
  }

  const { matched, unmatched } = matchPunchesToStaff(merged, staff, matchingOptions);
  const summaries = merged.length > 0 ? summarizeDailyAttendance(matched) : emptySummary();

  const state: StoredAttendanceState = {
    punches: merged,
    lastImportedAt: importedAt,
    lastFileName: fileName || undefined,
  };

  return {
    state,
    result: {
      fileName,
      importedAt,
      totalRecords: incomingPunches.length,
      matchedRecords,
      unmatchedRecords: incomingPunches.length - matchedRecords,
      duplicateRecords,
      storedPunchCount: merged.length,
      unmatchedDeviceIds: unmatched,
      summaries,
      matchedPunches: matched,
      skippedRows,
    },
  };
}

export class AttendanceImportService {
  constructor(
    private readonly storage: AttendanceImportStorage = new LocalStorageAttendanceImportStorage()
  ) {}

  importContent(
    content: string,
    fileName: string,
    staff: StaffIdentity[],
    matchingOptions?: StaffMatchingOptions
  ): AttendanceImportResult {
    const parsed = parseBiometricExport(content);
    const existing = this.storage.load();
    const { result, state } = runAttendanceImport({
      existingPunches: existing.punches,
      incomingPunches: parsed.punches,
      staff,
      matchingOptions,
      fileName,
      skippedRows: parsed.skippedRows,
    });

    this.storage.save(state);
    return result;
  }

  async importFile(
    file: File,
    staff: StaffIdentity[],
    matchingOptions?: StaffMatchingOptions
  ): Promise<AttendanceImportResult> {
    const content = await file.text();
    return this.importContent(content, file.name, staff, matchingOptions);
  }

  getSnapshot(
    staff: StaffIdentity[],
    matchingOptions?: StaffMatchingOptions
  ): AttendanceImportSnapshot {
    const state = this.storage.load();
    const { matched, unmatched } = matchPunchesToStaff(
      state.punches,
      staff,
      matchingOptions
    );

    return {
      punchCount: state.punches.length,
      summaries: summarizeDailyAttendance(matched),
      unmatchedDeviceIds: unmatched,
      lastImportedAt: state.lastImportedAt,
      lastFileName: state.lastFileName,
    };
  }

  getStoredState(): StoredAttendanceState {
    return this.storage.load();
  }

  clear(): void {
    this.storage.clear();
  }
}

export const attendanceImportService = new AttendanceImportService();
