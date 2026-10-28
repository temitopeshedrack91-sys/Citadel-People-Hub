/**
 * Biometric staff matcher
 * Citadel People Hub
 *
 * This is the single source of truth for device-ID -> staff mapping.
 *
 * ASSUMPTIONS (change these constants/regexes when the real export is known):
 * - Device exports use a 4-digit, zero-padded numeric user ID: 0001, 0042, 0102.
 * - App staff IDs use an entity prefix and a numeric suffix: CGCC/004, CH/001.
 *   A device ID of 0004 maps to CGCC/004 by zero-padding the staff number.
 * - Matching is intentionally exact on the device format. "4" is not treated
 *   as "0004"; it is flagged as an invalid device-ID format instead.
 * - If two staff records share the same numeric suffix (for example CH/001 and
 *   CSOG/001), the device ID is reported as ambiguous rather than guessed.
 */

import {
  BiometricPunch,
  MatchedPunch,
  PunchDirectionCount,
  StaffIdentity,
  UnmatchedDeviceRecord,
  UnmatchedReason,
} from './types';

export const DEFAULT_DEVICE_ID_PATTERN = /^\d{4}$/;
export const DEFAULT_DEVICE_ID_WIDTH = 4;
export const DEFAULT_STAFF_ID_PATTERN = /^[A-Za-z][A-Za-z0-9]*[\/-](\d+)$/;

export interface StaffMatchingOptions {
  deviceIdPattern?: RegExp;
  deviceIdWidth?: number;
  staffIdPattern?: RegExp;
}

export type DeviceIdMatch =
  | {
      status: 'matched';
      staff: StaffIdentity;
      normalizedDeviceId: string;
      matchType: 'biometric_device_id' | 'staff_id' | 'numeric_suffix';
    }
  | {
      status: 'unmatched';
      normalizedDeviceId: string;
      reason: Exclude<UnmatchedReason, 'ambiguous_staff_match'>;
      candidateStaffIds: string[];
    }
  | {
      status: 'ambiguous';
      normalizedDeviceId: string;
      reason: 'ambiguous_staff_match';
      candidateStaffIds: string[];
    };

function normalizeDeviceId(value: string): string {
  return value.replace(/\u00a0/g, ' ').trim();
}

export function extractStaffNumber(
  staffId: string,
  options: StaffMatchingOptions = {}
): string | null {
  const pattern = options.staffIdPattern || DEFAULT_STAFF_ID_PATTERN;
  const match = staffId.trim().match(pattern);
  return match ? match[1] : null;
}

export function matchDeviceIdToStaff(
  rawDeviceId: string,
  staff: StaffIdentity[],
  options: StaffMatchingOptions = {}
): DeviceIdMatch {
  const deviceId = normalizeDeviceId(rawDeviceId);

  if (!deviceId) {
    return {
      status: 'unmatched',
      normalizedDeviceId: deviceId,
      reason: 'invalid_device_id_format',
      candidateStaffIds: [],
    };
  }

  const explicitDeviceMatch = staff.find(
    (member) =>
      member.biometricDeviceId !== undefined &&
      normalizeDeviceId(member.biometricDeviceId) === deviceId
  );
  if (explicitDeviceMatch) {
    return {
      status: 'matched',
      staff: explicitDeviceMatch,
      normalizedDeviceId: deviceId,
      matchType: 'biometric_device_id',
    };
  }

  const exactStaffIdMatch = staff.find(
    (member) => member.staffId.trim() === deviceId
  );
  if (exactStaffIdMatch) {
    return {
      status: 'matched',
      staff: exactStaffIdMatch,
      normalizedDeviceId: deviceId,
      matchType: 'staff_id',
    };
  }

  const devicePattern = options.deviceIdPattern || DEFAULT_DEVICE_ID_PATTERN;
  if (!devicePattern.test(deviceId)) {
    return {
      status: 'unmatched',
      normalizedDeviceId: deviceId,
      reason: 'invalid_device_id_format',
      candidateStaffIds: [],
    };
  }

  const width = options.deviceIdWidth || DEFAULT_DEVICE_ID_WIDTH;
  const candidates = staff.filter((member) => {
    const number = extractStaffNumber(member.staffId, options);
    return number !== null && number.padStart(width, '0') === deviceId;
  });

  if (candidates.length === 1) {
    return {
      status: 'matched',
      staff: candidates[0],
      normalizedDeviceId: deviceId,
      matchType: 'numeric_suffix',
    };
  }

  if (candidates.length > 1) {
    return {
      status: 'ambiguous',
      normalizedDeviceId: deviceId,
      reason: 'ambiguous_staff_match',
      candidateStaffIds: candidates.map((member) => member.staffId),
    };
  }

  return {
    status: 'unmatched',
    normalizedDeviceId: deviceId,
    reason: 'no_staff_record',
    candidateStaffIds: [],
  };
}

/**
 * Identity used for idempotent imports. The requirement is staff ID + timestamp.
 * Unmatched punches fall back to device ID + timestamp so they are not lost.
 */
export function buildPunchIdentity(
  punch: BiometricPunch,
  staff: StaffIdentity[],
  options: StaffMatchingOptions = {}
): string {
  const match = matchDeviceIdToStaff(punch.deviceId, staff, options);
  if (match.status === 'matched') {
    return `staff:${match.staff.staffId.trim()}|${punch.timestamp}`;
  }
  return `device:${normalizeDeviceId(punch.deviceId)}|${punch.timestamp}`;
}

function emptyDirectionCount(): PunchDirectionCount {
  return { in: 0, out: 0, unknown: 0 };
}

export interface MatchPunchesResult {
  matched: MatchedPunch[];
  unmatched: UnmatchedDeviceRecord[];
}

export function matchPunchesToStaff(
  punches: BiometricPunch[],
  staff: StaffIdentity[],
  options: StaffMatchingOptions = {}
): MatchPunchesResult {
  const matched: MatchedPunch[] = [];
  const unmatchedByDevice = new Map<string, UnmatchedDeviceRecord>();

  for (const punch of punches) {
    const result = matchDeviceIdToStaff(punch.deviceId, staff, options);

    if (result.status === 'matched') {
      matched.push({
        ...punch,
        deviceId: result.normalizedDeviceId,
        employeeId: result.staff.id,
        employeeStaffId: result.staff.staffId,
        employeeName: result.staff.fullName,
        entityName: result.staff.entityName || '',
        departmentName: result.staff.departmentName || '',
      });
      continue;
    }

    const key = `${result.normalizedDeviceId}|${result.reason}|${result.candidateStaffIds.join(',')}`;
    const existing = unmatchedByDevice.get(key);
    if (existing) {
      existing.occurrences += 1;
      if (punch.timestamp < existing.firstTimestamp) {
        existing.firstTimestamp = punch.timestamp;
      }
      if (punch.timestamp > existing.lastTimestamp) {
        existing.lastTimestamp = punch.timestamp;
      }
      if (punch.sourceLine !== undefined && !existing.sourceLines.includes(punch.sourceLine)) {
        existing.sourceLines.push(punch.sourceLine);
      }
      continue;
    }

    unmatchedByDevice.set(key, {
      deviceId: result.normalizedDeviceId,
      reason: result.reason,
      occurrences: 1,
      firstTimestamp: punch.timestamp,
      lastTimestamp: punch.timestamp,
      sourceLines: punch.sourceLine !== undefined ? [punch.sourceLine] : [],
      candidateStaffIds: result.candidateStaffIds,
    });
  }

  return {
    matched,
    unmatched: Array.from(unmatchedByDevice.values()).sort((a, b) =>
      a.deviceId.localeCompare(b.deviceId)
    ),
  };
}

export function countPunchDirections(punches: BiometricPunch[]): PunchDirectionCount {
  return punches.reduce<PunchDirectionCount>((counts, punch) => {
    counts[punch.direction] += 1;
    return counts;
  }, emptyDirectionCount());
}
