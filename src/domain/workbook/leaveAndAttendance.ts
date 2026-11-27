/**
 * Citadel People Hub — Leave Management & Attendance Rules Engine
 *
 * Covers Workbook Sheets:
 * - Sheet 7: Leave Management (6 leave types, exact entitlements, eligibility, attachments, advance planning & Manager->HR vs Direct HR routing)
 * - Sheet 8: Attendance (5 entity/unit schedules, 9am-4pm & Facilities 7am-4pm, 10-min grace period, biometric compliance, CSOG event-day override)
 */

import { calculateYearsOfService } from './employeeMasterData';
import type {
  AttendanceEvaluationResult,
  AttendancePunchInput,
  LeaveApplicationValidationInput,
  LeaveEligibilityEmployeeInput,
  LeaveValidationResult,
  WorkbookAttendanceSchedule,
  WorkbookLeavePolicy,
  WorkbookLeaveType,
} from './types';

// ============================================================================
// SHEET 7: LEAVE MANAGEMENT POLICIES & VALIDATION ENGINE
// ============================================================================

export const WORKBOOK_LEAVE_POLICIES: WorkbookLeavePolicy[] = [
  {
    leaveType: 'Annual Leave',
    entitlementLabel: '21 days per annum',
    entitlementDays: 21,
    approvalRoute: 'MANAGER_TO_HR',
    attachmentRequirement: 'REQUIRED',
    attachmentLabel: 'Leave form',
    requiresConfirmedEmployee: true,
    minServiceYears: 1,
    advanceNoticePolicy: 'REQUIRED',
    notes: 'Confirmed Employees who have completed one year only. ALL leave should be planned in advance.',
  },
  {
    leaveType: 'Sick Leave',
    entitlementLabel: '10 days per annum',
    entitlementDays: 10,
    approvalRoute: 'MANAGER_TO_HR',
    attachmentRequirement: 'REQUIRED',
    attachmentLabel: 'Medical Note',
    requiresConfirmedEmployee: true,
    minServiceYears: 0,
    advanceNoticePolicy: 'ADVISORY',
    notes: 'Confirmed Employees only. Sheet 7 notes advance planning; treated as advisory for acute illness while requiring a Medical Note.',
  },
  {
    leaveType: 'Maternity Leave',
    entitlementLabel: '3 months (90 days)',
    entitlementDays: 90,
    approvalRoute: 'MANAGER_TO_HR',
    attachmentRequirement: 'REQUIRED',
    attachmentLabel: 'Medical Note',
    requiresConfirmedEmployee: true,
    minServiceYears: 0,
    restrictedGender: 'Female',
    advanceNoticePolicy: 'REQUIRED',
    notes: 'Confirmed female employees only. ALL leave should be planned in advance.',
  },
  {
    leaveType: 'Paternity Leave',
    entitlementLabel: '2 weeks (14 days)',
    entitlementDays: 14,
    approvalRoute: 'MANAGER_TO_HR',
    attachmentRequirement: 'REQUIRED',
    attachmentLabel: 'Medical Note',
    requiresConfirmedEmployee: true,
    minServiceYears: 0,
    restrictedGender: 'Male',
    advanceNoticePolicy: 'REQUIRED',
    notes: 'Confirmed male employees only. ALL leave should be planned in advance.',
  },
  {
    leaveType: 'Exam Leave',
    entitlementLabel: '3 weeks (21 days)',
    entitlementDays: 21,
    approvalRoute: 'DIRECT_HR',
    attachmentRequirement: 'REQUIRED',
    attachmentLabel: 'School Note / Exam Timetable',
    requiresConfirmedEmployee: true,
    minServiceYears: 0,
    advanceNoticePolicy: 'REQUIRED',
    notes: 'Routes directly to HR. Confirmed Employees only. ALL leave should be planned in advance.',
  },
  {
    leaveType: 'Compassionate Leave',
    entitlementLabel: '5 days',
    entitlementDays: 5,
    approvalRoute: 'DIRECT_HR',
    attachmentRequirement: 'SUBJECTIVE_OPTIONAL',
    attachmentLabel: 'Supporting Note (Subjective / Optional)',
    requiresConfirmedEmployee: false,
    minServiceYears: 0,
    advanceNoticePolicy: 'ADVISORY',
    notes: 'Routes directly to HR. Eligibility and supporting attachment are subjective at HR discretion.',
  },
];

export function getWorkbookLeavePolicy(leaveType: string): WorkbookLeavePolicy | null {
  const lower = (leaveType || '').trim().toLowerCase();
  return (
    WORKBOOK_LEAVE_POLICIES.find(
      (p) => p.leaveType.toLowerCase() === lower || lower.includes(p.leaveType.toLowerCase().replace(' leave', ''))
    ) || null
  );
}

export function isConfirmedEmployee(employee: LeaveEligibilityEmployeeInput): boolean {
  const status = (employee.status || '').trim().toLowerCase();
  const contract = (employee.contractStatus || '').trim().toLowerCase();
  if (status === 'probation' || contract === 'probation') return false;
  if (employee.confirmationDate && employee.confirmationDate.trim().length > 0) return true;
  if (status === 'confirmed' || contract === 'permanent') return true;
  return false;
}

export function calculateInclusiveLeaveDays(startDate: string, endDate: string): number {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return 0;
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  if (endUtc < startUtc) return 0;
  return Math.round((endUtc - startUtc) / 86400000) + 1;
}

export function validateLeaveApplication(input: LeaveApplicationValidationInput): LeaveValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const policy = getWorkbookLeavePolicy(input.leaveType);

  const calculatedDays = calculateInclusiveLeaveDays(input.startDate, input.endDate);
  if (!input.startDate || !input.endDate || calculatedDays <= 0) {
    errors.push('End date must be on or after the start date.');
  }

  const initialApprovalStage: 'MANAGER' | 'HR' =
    policy?.approvalRoute === 'DIRECT_HR' ? 'HR' : 'MANAGER';
  const requiresManagerSelection = initialApprovalStage === 'MANAGER';
  const requiresAttachment = policy?.attachmentRequirement === 'REQUIRED';
  const attachmentLabel = policy?.attachmentLabel || 'Supporting Document';

  if (!policy) {
    warnings.push(
      `Leave type "${input.leaveType}" is not one of the 6 standard Sheet 7 leave policies; defaulting to Manager -> HR routing.`
    );
  } else {
    // 1. Confirmed Employee Eligibility
    const confirmed = isConfirmedEmployee(input.employee);
    if (policy.requiresConfirmedEmployee && !confirmed) {
      errors.push(`${policy.leaveType} is restricted to Confirmed employees only (Sheet 7).`);
    }

    // 2. Minimum Service Years (Annual Leave = >= 1 year)
    if (policy.minServiceYears > 0) {
      const tenureYears =
        typeof input.employee.yearsOfService === 'number' && !Number.isNaN(input.employee.yearsOfService)
          ? input.employee.yearsOfService
          : calculateYearsOfService(input.employee.employmentDate, input.today);
      if (tenureYears < policy.minServiceYears) {
        errors.push(
          `${policy.leaveType} requires at least ${policy.minServiceYears} completed year of service (employee currently has ${tenureYears} year(s)).`
        );
      }
    }

    // 3. Gender eligibility (Maternity = Female, Paternity = Male)
    if (policy.restrictedGender && input.employee.gender) {
      const empGender = input.employee.gender.trim().toLowerCase();
      if (empGender !== policy.restrictedGender.toLowerCase()) {
        errors.push(`${policy.leaveType} is restricted to ${policy.restrictedGender} employees.`);
      }
    }

    // 4. Entitlement & Available Balance Cap
    if (calculatedDays > policy.entitlementDays) {
      errors.push(
        `Requested ${calculatedDays} day(s) exceeds the maximum ${policy.leaveType} entitlement of ${policy.entitlementDays} days (${policy.entitlementLabel}).`
      );
    }
    if (
      typeof input.availableBalanceDays === 'number' &&
      !Number.isNaN(input.availableBalanceDays) &&
      calculatedDays > input.availableBalanceDays
    ) {
      errors.push(
        `Insufficient ${policy.leaveType} balance: requested ${calculatedDays} day(s), available ${input.availableBalanceDays} day(s).`
      );
    }

    // 5. Required Attachment Enforcement
    if (requiresAttachment && !(input.attachmentName && input.attachmentName.trim().length > 0)) {
      errors.push(`${policy.leaveType} requires an attached "${policy.attachmentLabel}" (Sheet 7).`);
    }

    // 6. Advance Planning Rule
    const todayStr = input.today || new Date().toISOString().split('T')[0];
    if (input.startDate && input.startDate <= todayStr) {
      if (policy.advanceNoticePolicy === 'REQUIRED') {
        errors.push(`${policy.leaveType} must be planned in advance (start date must be after ${todayStr}).`);
      } else if (policy.leaveType === 'Sick Leave') {
        warnings.push(
          'Sheet 7 states all leave should be planned in advance; same-day/retroactive Sick Leave is permitted with a valid Medical Note.'
        );
      }
    }
  }

  // 7. Overlapping Leave Check
  if (input.existingLeaves && input.startDate && input.endDate && calculatedDays > 0) {
    const overlaps = input.existingLeaves.some(
      (l) =>
        l.status !== 'Rejected' &&
        l.status !== 'Cancelled' &&
        l.startDate <= input.endDate &&
        l.endDate >= input.startDate
    );
    if (overlaps) {
      errors.push('Leave dates overlap with an existing active or pending leave request.');
    }
  }

  // 8. Self-approval guard when Manager stage is required
  if (
    requiresManagerSelection &&
    input.managerId &&
    String(input.managerId) === String(input.employee.id)
  ) {
    errors.push('Employees cannot select themselves as their own Stage 1 reviewing manager.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    calculatedDays,
    policy,
    initialApprovalStage,
    requiresManagerSelection,
    requiresAttachment,
    attachmentLabel,
  };
}

export function getDefaultWorkbookLeaveTypes(): WorkbookLeaveType[] {
  return WORKBOOK_LEAVE_POLICIES.map((p) => p.leaveType);
}

// ============================================================================
// SHEET 8: ATTENDANCE SCHEDULES, 10-MIN GRACE PERIOD & EVALUATION ENGINE
// ============================================================================

export const WORKBOOK_ATTENDANCE_SCHEDULES: WorkbookAttendanceSchedule[] = [
  {
    id: 'wb-sched-facilities',
    entityOrDepartment: 'Facilities',
    matchKeywords: ['facilities', 'facility', 'maintenance'],
    shiftStart: '07:00',
    shiftEnd: '16:00',
    biometricRequired: true,
    gracePeriodMinutes: 10,
    supportsEventDayOverride: false,
    notes: 'Works different schedule (7:00 am - 4:00 pm, 10-minute grace period, biometric required).',
  },
  {
    id: 'wb-sched-workstation',
    entityOrDepartment: 'Citadel Workstation',
    matchKeywords: ['workstation'],
    shiftStart: '09:00',
    shiftEnd: '16:00',
    biometricRequired: true,
    gracePeriodMinutes: 10,
    supportsEventDayOverride: false,
    notes: '9:00 am - 4:00 pm with 10-minute grace period (workbook notes "Works different schedule" — flagged for HR confirmation).',
  },
  {
    id: 'wb-sched-asabi',
    entityOrDepartment: 'Asabi Aladire',
    matchKeywords: ['asabi', 'aladire'],
    shiftStart: '09:00',
    shiftEnd: '16:00',
    biometricRequired: true,
    gracePeriodMinutes: 10,
    supportsEventDayOverride: false,
    notes: '9:00 am - 4:00 pm with 10-minute grace period (workbook notes "Works different schedule" — flagged for HR confirmation).',
  },
  {
    id: 'wb-sched-csog',
    entityOrDepartment: 'Citadel School of Government',
    matchKeywords: ['school of government', 'csog', 'academy'],
    shiftStart: '09:00',
    shiftEnd: '16:00',
    biometricRequired: true,
    gracePeriodMinutes: 10,
    supportsEventDayOverride: true,
    notes: '9:00 am - 4:00 pm with 10-minute grace period. Event days may require special attendance.',
  },
  {
    id: 'wb-sched-cgcc',
    entityOrDepartment: 'CGCC',
    matchKeywords: ['cgcc', 'citadel global community church', 'church'],
    shiftStart: '09:00',
    shiftEnd: '16:00',
    biometricRequired: true,
    gracePeriodMinutes: 10,
    supportsEventDayOverride: false,
    notes: 'Standard Office Hours (9:00 am - 4:00 pm, 10-minute grace period, biometric required).',
  },
];

export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim().toUpperCase();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) return null;

  if (meridiem === 'AM') {
    if (hours === 12) hours = 0;
  } else if (meridiem === 'PM') {
    if (hours < 12) hours += 12;
  }

  if (hours < 0 || hours > 23) return null;
  return hours * 60 + minutes;
}

export function formatMinutesToHHmm(totalMinutes: number): string {
  const clamped = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function resolveAttendanceSchedule(
  entityName?: string,
  departmentName?: string
): WorkbookAttendanceSchedule {
  const deptLower = (departmentName || '').trim().toLowerCase();
  const entityLower = (entityName || '').trim().toLowerCase();

  // Prioritize unit-specific schedules (Facilities, Workstation, Asabi Aladire) first
  for (const sched of WORKBOOK_ATTENDANCE_SCHEDULES.slice(0, 3)) {
    if (sched.matchKeywords.some((kw) => deptLower.includes(kw) || entityLower.includes(kw))) {
      return sched;
    }
  }

  // Next match CSOG entity
  const csog = WORKBOOK_ATTENDANCE_SCHEDULES[3];
  if (csog.matchKeywords.some((kw) => entityLower.includes(kw) || deptLower.includes(kw))) {
    return csog;
  }

  // Default CGCC standard office hours (9:00 - 16:00, 10m grace)
  return WORKBOOK_ATTENDANCE_SCHEDULES[4];
}

export function evaluateAttendancePunch(input: AttendancePunchInput): AttendanceEvaluationResult {
  const schedule = resolveAttendanceSchedule(input.entityName, input.departmentName);
  const anomalies: string[] = [];

  const useEventOverride = Boolean(
    input.isEventDay && schedule.supportsEventDayOverride && input.eventShiftStart && input.eventShiftEnd
  );
  const effectiveShiftStart = useEventOverride && input.eventShiftStart ? input.eventShiftStart : schedule.shiftStart;
  const effectiveShiftEnd = useEventOverride && input.eventShiftEnd ? input.eventShiftEnd : schedule.shiftEnd;

  const shiftStartMin = parseTimeToMinutes(effectiveShiftStart) ?? 540;
  const shiftEndMin = parseTimeToMinutes(effectiveShiftEnd) ?? 960;
  const graceCutoffMin = shiftStartMin + schedule.gracePeriodMinutes;
  const graceCutoffTime = formatMinutesToHHmm(graceCutoffMin);

  const inMin = parseTimeToMinutes(input.clockInTime);
  const outMin = parseTimeToMinutes(input.clockOutTime);

  const sourceLower = (input.verificationSource || '').toLowerCase();
  const biometricCompliant = !schedule.biometricRequired || sourceLower.includes('biometric') || sourceLower.includes('zkteco');
  if (schedule.biometricRequired && input.verificationSource && !biometricCompliant) {
    anomalies.push('Non-biometric clock-in recorded for a biometric-mandatory unit (Sheet 8).');
  }

  if (typeof input.punchCount === 'number' && input.punchCount > 2) {
    anomalies.push(`Multiple clock-ins/clock-outs detected (${input.punchCount} punches).`);
  }

  if (inMin === null && outMin === null) {
    anomalies.push('No clock-in or clock-out recorded (Absent).');
    return {
      schedule,
      effectiveShiftStart,
      effectiveShiftEnd,
      graceCutoffTime,
      status: 'Absent',
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0,
      workedMinutes: 0,
      biometricCompliant,
      anomalies,
    };
  }

  if (inMin === null && outMin !== null) {
    anomalies.push('Missing clock-in punch.');
    return {
      schedule,
      effectiveShiftStart,
      effectiveShiftEnd,
      graceCutoffTime,
      status: 'Missing Punch',
      lateMinutes: 0,
      earlyDepartureMinutes: Math.max(0, shiftEndMin - outMin),
      overtimeMinutes: Math.max(0, outMin - shiftEndMin),
      workedMinutes: 0,
      biometricCompliant,
      anomalies,
    };
  }

  // inMin is guaranteed non-null here
  const clockIn = inMin as number;
  const isLate = clockIn > graceCutoffMin;
  const lateMinutes = isLate ? clockIn - shiftStartMin : 0;
  if (isLate) {
    anomalies.push(
      `Late arrival: clocked in at ${formatMinutesToHHmm(clockIn)} (past ${graceCutoffTime} grace cutoff, ${lateMinutes} mins after shift start).`
    );
  }

  let earlyDepartureMinutes = 0;
  let overtimeMinutes = 0;
  let workedMinutes = 0;

  if (outMin === null) {
    anomalies.push('Missing clock-out punch.');
  } else {
    if (outMin < shiftEndMin) {
      earlyDepartureMinutes = shiftEndMin - outMin;
      anomalies.push(`Early departure: left ${earlyDepartureMinutes} mins before ${effectiveShiftEnd}.`);
    } else if (outMin > shiftEndMin) {
      overtimeMinutes = outMin - shiftEndMin;
    }
    workedMinutes = Math.max(0, outMin - clockIn);
  }

  const expectedShiftMinutes = Math.max(60, shiftEndMin - shiftStartMin);
  let status: AttendanceEvaluationResult['status'] = isLate ? 'Late' : 'Present';
  if (outMin !== null && workedMinutes < expectedShiftMinutes * 0.5) {
    status = 'Half-Day';
  }

  return {
    schedule,
    effectiveShiftStart,
    effectiveShiftEnd,
    graceCutoffTime,
    status,
    lateMinutes,
    earlyDepartureMinutes,
    overtimeMinutes,
    workedMinutes,
    biometricCompliant,
    anomalies,
  };
}
