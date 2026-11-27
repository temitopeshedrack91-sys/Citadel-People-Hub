/**
 * Citadel People Hub — Employee Master Data, Lifecycle, Documents & Data Migration Engine
 *
 * Covers Workbook Sheets:
 * - Sheet 5: Employee Data (all 24 mandatory sensitive fields, edit permissions, staged HR approvals)
 * - Sheet 6: Existing Data Sources (6 legacy HR files to migrate/clean)
 * - Sheet 14: Employee Lifecycle (Confirmation, Promotion, Transfer, Contract Change, Suspension, Exit)
 * - Sheet 16: HR Documents (taxonomy, upload/view permissions, expiry reminder calculations)
 * - Sheet 22: Data Migration (CSV/JSON Employee Bio-Data validator against Sheets 1, 3 & 5)
 */

import type { Employee } from '../../types';
import {
  detectForbiddenCredentials,
  resolveDepartmentBelongsToEntity,
} from './orgAndGovernance';
import type {
  DocumentExpiryStatus,
  DocumentPolicySpec,
  EmployeeMasterFieldSpec,
  LegacyDataSourceSpec,
  LifecycleEventRecord,
  LifecycleEventType,
  MigrationRowValidation,
  MigrationValidationReport,
  ProfileChangeRequest,
  WorkbookRole,
} from './types';

// ============================================================================
// SHEET 5: EMPLOYEE MASTER DATA — ALL 24 MANDATORY SENSITIVE FIELDS
// ============================================================================

export const EMPLOYEE_MASTER_FIELDS: EmployeeMasterFieldSpec[] = [
  { key: 'staffId', label: 'Staff ID', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'EMPLOYEE_WITH_HR_APPROVAL', source: 'Employee Bio Data Form', notes: 'Employee can edit. HR Approves (flagged for HR review as primary ID).' },
  { key: 'fullName', label: 'Full Name', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'HR_SUPER_ADMIN_ONLY', source: 'Employee Bio Data Form', notes: 'HR/Super Admin can edit.' },
  { key: 'profilePhoto', label: 'Profile Photo', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'EMPLOYEE_WITH_HR_APPROVAL', source: 'Employee Bio Data Form', notes: 'Employee can edit. HR Approves.' },
  { key: 'dateOfBirth', label: 'Date of Birth', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'EMPLOYEE_WITH_HR_APPROVAL', source: 'Employee Bio Data Form', notes: 'Employee can edit. HR Approves.' },
  { key: 'gender', label: 'Gender', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'EMPLOYEE_WITH_HR_APPROVAL', source: 'Employee Bio Data Form', notes: 'Employee can edit. HR Approves.' },
  { key: 'phone', label: 'Phone', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'EMPLOYEE_WITH_HR_APPROVAL', source: 'Employee Bio Data Form', notes: 'Employee can edit. HR Approves.' },
  { key: 'email', label: 'Email', required: true, sensitive: true, priority: 'Important', editPolicy: 'EMPLOYEE_WITH_HR_APPROVAL', source: 'Employee Bio Data Form', notes: 'Employee can edit. HR Approves.' },
  { key: 'address', label: 'Address', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'EMPLOYEE_WITH_HR_APPROVAL', source: 'Employee Bio Data Form', notes: 'Employee can edit. HR Approves.' },
  { key: 'emergencyContact', label: 'Emergency Contact', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'EMPLOYEE_WITH_HR_APPROVAL', source: 'Employee Bio Data Form', notes: 'Employee can edit. HR Approves.' },
  { key: 'nextOfKin', label: 'Next of Kin', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'EMPLOYEE_WITH_HR_APPROVAL', source: 'Employee Bio Data Form', notes: 'Employee can edit. HR Approves.' },
  { key: 'entityName', label: 'Entity', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'HR_SUPER_ADMIN_ONLY', source: 'Employee Bio Data Form', notes: 'HR/Super Admin can edit.' },
  { key: 'departmentName', label: 'Department', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'HR_SUPER_ADMIN_ONLY', source: 'Employee Bio Data Form', notes: 'HR/Super Admin can edit.' },
  { key: 'jobTitle', label: 'Job Title', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'HR_SUPER_ADMIN_ONLY', source: 'Employee Bio Data Form', notes: 'HR/Super Admin can edit.' },
  { key: 'gradeLevel', label: 'Grade/Level', required: true, sensitive: true, priority: 'Important', editPolicy: 'HR_SUPER_ADMIN_ONLY', source: 'Employee Bio Data Form', notes: 'HR/Super Admin can edit.' },
  { key: 'employmentType', label: 'Employment Type', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'HR_SUPER_ADMIN_ONLY', source: 'Employee Bio Data Form', notes: 'HR/Super Admin can edit.' },
  { key: 'employmentDate', label: 'Employment Date', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'HR_SUPER_ADMIN_ONLY', source: 'Employee Bio Data Form', notes: 'HR/Super Admin can edit.' },
  { key: 'confirmationDate', label: 'Confirmation Date', required: true, sensitive: true, priority: 'Important', editPolicy: 'HR_SUPER_ADMIN_ONLY', source: 'Employee Bio Data Form', notes: 'HR/Super Admin can edit.' },
  { key: 'managerName', label: 'Manager/Head', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'HR_SUPER_ADMIN_ONLY', source: 'Employee Bio Data Form', notes: 'HR/Super Admin can edit.' },
  { key: 'contractStatus', label: 'Contract Status', required: true, sensitive: true, priority: 'Must Have', editPolicy: 'HR_SUPER_ADMIN_ONLY', source: 'Employee Bio Data Form', notes: 'HR/Super Admin can edit.' },
  { key: 'yearsOfService', label: 'Years of Service', required: true, sensitive: true, priority: 'Phase 2', editPolicy: 'HR_SUPER_ADMIN_ONLY', source: 'Employee Bio Data Form', notes: 'HR/Super Admin can edit (auto-calculated from Employment Date).' },
  { key: 'qualifications', label: 'Qualifications', required: true, sensitive: true, priority: 'Phase 2', editPolicy: 'EMPLOYEE_WITH_HR_APPROVAL', source: 'Employee Bio Data Form', notes: 'Employee can edit. HR Approves.' },
  { key: 'certifications', label: 'Certifications', required: true, sensitive: true, priority: 'Phase 2', editPolicy: 'EMPLOYEE_WITH_HR_APPROVAL', source: 'Employee Bio Data Form', notes: 'Employee can edit. HR Approves.' },
  { key: 'bankPayroll', label: 'Bank/Payroll Information', required: true, sensitive: true, priority: 'Important', editPolicy: 'HR_SUPER_ADMIN_ONLY', source: 'Employee Bio Data Form', notes: 'HR/Super Admin can edit.' },
  { key: 'pensionHmo', label: 'Pension/HMO/Benefits', required: true, sensitive: true, priority: 'Important', editPolicy: 'HR_SUPER_ADMIN_ONLY', source: 'Employee Bio Data Form', notes: 'HR/Super Admin can edit.' },
];

export function calculateYearsOfService(employmentDate?: string, referenceDate?: string): number {
  if (!employmentDate) return 0;
  const start = new Date(`${employmentDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return 0;
  const ref = referenceDate ? new Date(`${referenceDate}T00:00:00Z`) : new Date();
  if (Number.isNaN(ref.getTime()) || ref < start) return 0;

  let years = ref.getUTCFullYear() - start.getUTCFullYear();
  const monthDiff = ref.getUTCMonth() - start.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getUTCDate() < start.getUTCDate())) {
    years -= 1;
  }
  return Math.max(0, years);
}

export function evaluateEmployeeCompleteness(employee: Partial<Employee>): {
  completedCount: number;
  totalFields: number;
  percentComplete: number;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  for (const field of EMPLOYEE_MASTER_FIELDS) {
    const val = (employee as Record<string, unknown>)[field.key];
    let present = false;
    if (field.key === 'emergencyContact') {
      const ec = val as Employee['emergencyContact'] | undefined;
      present = Boolean(ec?.name && ec?.phone);
    } else if (field.key === 'nextOfKin') {
      const nok = val as Employee['nextOfKin'] | undefined;
      present = Boolean(nok?.name && nok?.phone);
    } else if (field.key === 'bankPayroll') {
      const bp = val as Employee['bankPayroll'] | undefined;
      present = Boolean(bp?.bankName && bp?.accountNumber);
    } else if (field.key === 'pensionHmo') {
      const ph = val as Employee['pensionHmo'] | undefined;
      present = Boolean(ph?.pfaName && ph?.rsaPin);
    } else if (field.key === 'qualifications' || field.key === 'certifications') {
      present = Array.isArray(val) && val.length > 0;
    } else if (field.key === 'yearsOfService') {
      present = typeof val === 'number' && !Number.isNaN(val);
    } else {
      present = typeof val === 'string' ? val.trim().length > 0 : Boolean(val);
    }

    if (!present) {
      missingFields.push(field.label);
    }
  }

  const totalFields = EMPLOYEE_MASTER_FIELDS.length;
  const completedCount = totalFields - missingFields.length;
  const percentComplete = Math.round((completedCount / totalFields) * 100);
  return { completedCount, totalFields, percentComplete, missingFields };
}

export function validateEmployeeFieldEdits(
  actorRole: WorkbookRole,
  proposedFields: Record<string, string>
): {
  allowed: boolean;
  requiresHrApproval: boolean;
  blockedFields: string[];
  credentialViolations: string[];
  errors: string[];
} {
  const blockedFields: string[] = [];
  const credentialViolations: string[] = [];
  const errors: string[] = [];

  const keys = Object.keys(proposedFields);
  if (keys.length === 0) {
    return {
      allowed: false,
      requiresHrApproval: false,
      blockedFields: [],
      credentialViolations: [],
      errors: ['At least one field change must be provided.'],
    };
  }

  for (const key of keys) {
    const spec = EMPLOYEE_MASTER_FIELDS.find((f) => f.key === key);
    if (!spec) {
      blockedFields.push(key);
      errors.push(`Field "${key}" is not a recognized Sheet 5 Employee Master Data field.`);
      continue;
    }

    const rawValue = String(proposedFields[key] ?? '');
    const leaked = detectForbiddenCredentials(rawValue);
    if (leaked.length > 0) {
      credentialViolations.push(`${spec.label}: ${leaked.join(', ')}`);
      errors.push(`Security violation (Sheet 1 Rule 4): ${spec.label} cannot contain ${leaked.join(', ')}.`);
    }

    if (actorRole !== 'SUPER_ADMIN_HR') {
      if (spec.editPolicy === 'HR_SUPER_ADMIN_ONLY') {
        blockedFields.push(spec.label);
        errors.push(`"${spec.label}" can only be edited by HR / Super Admin (Sheet 5).`);
      }
    }
  }

  return {
    allowed: errors.length === 0,
    requiresHrApproval: actorRole !== 'SUPER_ADMIN_HR',
    blockedFields,
    credentialViolations,
    errors,
  };
}

export function createProfileChangeRequest(params: {
  employee: Employee;
  actorRole: WorkbookRole;
  actorName: string;
  proposedChanges: Record<string, string>;
  reason: string;
}): ProfileChangeRequest {
  const validation = validateEmployeeFieldEdits(params.actorRole, params.proposedChanges);
  if (!validation.allowed) {
    throw new Error(validation.errors.join(' '));
  }
  if (!params.reason.trim()) {
    throw new Error('Please provide a reason for this profile update request.');
  }

  const previousValues: Record<string, string> = {};
  for (const key of Object.keys(params.proposedChanges)) {
    const prev = (params.employee as unknown as Record<string, unknown>)[key];
    previousValues[key] = typeof prev === 'string' ? prev : JSON.stringify(prev ?? '');
  }

  return {
    id: `pcr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    employeeId: params.employee.id,
    employeeStaffId: params.employee.staffId,
    employeeName: params.employee.fullName,
    requestedByRole: params.actorRole,
    requestedByName: params.actorName,
    proposedChanges: { ...params.proposedChanges },
    previousValues,
    reason: params.reason.trim(),
    status: params.actorRole === 'SUPER_ADMIN_HR' ? 'APPROVED' : 'PENDING_HR_APPROVAL',
    createdAt: new Date().toISOString(),
    reviewedBy: params.actorRole === 'SUPER_ADMIN_HR' ? params.actorName : undefined,
    reviewedAt: params.actorRole === 'SUPER_ADMIN_HR' ? new Date().toISOString() : undefined,
  };
}

export function reviewProfileChangeRequest(params: {
  request: ProfileChangeRequest;
  reviewerRole: WorkbookRole;
  reviewerName: string;
  decision: 'APPROVED' | 'REJECTED';
  comments?: string;
}): ProfileChangeRequest {
  if (params.reviewerRole !== 'SUPER_ADMIN_HR') {
    throw new Error('Only Super Admin / HR can approve or reject employee profile change requests (Sheets 4 & 5).');
  }
  if (params.request.status !== 'PENDING_HR_APPROVAL') {
    throw new Error(`Change request ${params.request.id} is already ${params.request.status}.`);
  }
  if (params.decision === 'REJECTED' && !params.comments?.trim()) {
    throw new Error('Please include a rejection reason when rejecting a profile change request.');
  }

  return {
    ...params.request,
    status: params.decision,
    reviewedBy: params.reviewerName,
    reviewedAt: new Date().toISOString(),
    reviewComments: params.comments?.trim() || (params.decision === 'APPROVED' ? 'Verified and approved by HR.' : ''),
  };
}

export function applyApprovedChangeRequest(employee: Employee, request: ProfileChangeRequest): Employee {
  if (request.status !== 'APPROVED') {
    throw new Error('Only APPROVED change requests can be applied to the live employee record.');
  }
  const updated: Employee = { ...employee };
  for (const [key, value] of Object.entries(request.proposedChanges)) {
    if (key === 'phone' || key === 'email' || key === 'address' || key === 'dateOfBirth' || key === 'staffId' || key === 'profilePhoto') {
      (updated as unknown as Record<string, unknown>)[key] = value;
    } else if (key === 'gender' && (value === 'Male' || value === 'Female')) {
      updated.gender = value;
    } else if (key === 'emergencyContact') {
      if (value.includes('|')) {
        const [name, relationship, phone] = value.split('|').map((part) => part.trim());
        updated.emergencyContact = {
          name: name || updated.emergencyContact.name,
          relationship: relationship || updated.emergencyContact.relationship,
          phone: phone || updated.emergencyContact.phone,
        };
      } else {
        updated.emergencyContact = { ...updated.emergencyContact, phone: value };
      }
    } else if (key === 'nextOfKin') {
      if (value.includes('|')) {
        const [name, relationship, phone, address] = value.split('|').map((part) => part.trim());
        updated.nextOfKin = {
          name: name || updated.nextOfKin.name,
          relationship: relationship || updated.nextOfKin.relationship,
          phone: phone || updated.nextOfKin.phone,
          address: address || updated.nextOfKin.address,
        };
      } else {
        updated.nextOfKin = { ...updated.nextOfKin, name: value };
      }
    }
  }
  return updated;
}

// ============================================================================
// SHEET 14: EMPLOYEE LIFECYCLE ENGINE
// ============================================================================

export function createLifecycleEvent(params: {
  eventType: LifecycleEventType;
  employee: Employee;
  trigger: string;
  effectiveDate: string;
  changes: Record<string, string>;
}): LifecycleEventRecord {
  const meta: Record<
    LifecycleEventType,
    { requiredAction: string; approverRole: 'SUPER_ADMIN_HR' | 'BUSINESS_HEAD_AND_HR'; recordsUpdated: string[] }
  > = {
    CONFIRMATION: {
      requiredAction: 'Confirm permanent employment status, record confirmation date, and unlock Confirmed Leave entitlements (Sheet 7).',
      approverRole: 'BUSINESS_HEAD_AND_HR',
      recordsUpdated: ['contractStatus', 'status', 'confirmationDate'],
    },
    PROMOTION: {
      requiredAction: 'Update job title, grade level, and compensation alignment.',
      approverRole: 'BUSINESS_HEAD_AND_HR',
      recordsUpdated: ['jobTitle', 'gradeLevel'],
    },
    TRANSFER: {
      requiredAction: 'Validate target entity-department pairing (Sheet 3) and reassign reporting manager.',
      approverRole: 'BUSINESS_HEAD_AND_HR',
      recordsUpdated: ['entityId', 'entityName', 'departmentId', 'departmentName', 'managerName'],
    },
    CONTRACT_CHANGE: {
      requiredAction: 'Update employment type and contract status.',
      approverRole: 'SUPER_ADMIN_HR',
      recordsUpdated: ['employmentType', 'contractStatus'],
    },
    SUSPENSION: {
      requiredAction: 'Place employee on Suspended status and log disciplinary notice.',
      approverRole: 'SUPER_ADMIN_HR',
      recordsUpdated: ['status'],
    },
    EXIT: {
      requiredAction: 'Initiate separation, verify 30-day notice, complete clearances, and revoke system access.',
      approverRole: 'BUSINESS_HEAD_AND_HR',
      recordsUpdated: ['status', 'contractStatus'],
    },
  };

  if (params.eventType === 'TRANSFER' && params.changes.entityName && params.changes.departmentName) {
    const check = resolveDepartmentBelongsToEntity(params.changes.entityName, params.changes.departmentName);
    if (!check.valid) {
      throw new Error(check.error || 'Invalid entity/department combination for transfer.');
    }
  }

  const spec = meta[params.eventType];
  return {
    id: `lce-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventType: params.eventType,
    employeeId: params.employee.id,
    employeeName: params.employee.fullName,
    trigger: params.trigger.trim() || `${params.eventType} initiated`,
    requiredAction: spec.requiredAction,
    approverRole: spec.approverRole,
    effectiveDate: params.effectiveDate,
    changes: { ...params.changes },
    recordsUpdated: spec.recordsUpdated,
    status: 'PENDING_APPROVAL',
  };
}

export function applyApprovedLifecycleEvent(
  employee: Employee,
  event: LifecycleEventRecord,
  approverRole: WorkbookRole,
  approverName: string
): { employee: Employee; event: LifecycleEventRecord } {
  if (approverRole !== 'SUPER_ADMIN_HR') {
    throw new Error('HR / Super Admin final approval is required to commit employee lifecycle changes.');
  }

  const nextEmployee: Employee = { ...employee };
  if (event.eventType === 'CONFIRMATION') {
    nextEmployee.status = 'Confirmed';
    nextEmployee.contractStatus = 'Permanent';
    nextEmployee.confirmationDate = event.effectiveDate;
  } else if (event.eventType === 'PROMOTION') {
    if (event.changes.jobTitle) nextEmployee.jobTitle = event.changes.jobTitle;
    if (event.changes.gradeLevel) nextEmployee.gradeLevel = event.changes.gradeLevel;
  } else if (event.eventType === 'TRANSFER') {
    if (event.changes.entityName && event.changes.departmentName) {
      const check = resolveDepartmentBelongsToEntity(event.changes.entityName, event.changes.departmentName);
      if (!check.valid || !check.entity || !check.department) {
        throw new Error(check.error || 'Invalid entity/department transfer.');
      }
      nextEmployee.entityId = check.entity.id;
      nextEmployee.entityName = check.entity.name;
      nextEmployee.departmentId = check.department.id;
      nextEmployee.departmentName = check.department.departmentName;
    }
    if (event.changes.managerName) nextEmployee.managerName = event.changes.managerName;
  } else if (event.eventType === 'CONTRACT_CHANGE') {
    if (event.changes.contractStatus) {
      nextEmployee.contractStatus = event.changes.contractStatus as Employee['contractStatus'];
    }
  } else if (event.eventType === 'SUSPENSION') {
    nextEmployee.status = 'Suspended';
  } else if (event.eventType === 'EXIT') {
    nextEmployee.status = 'Resigned';
    nextEmployee.contractStatus = 'Inactive';
  }

  return {
    employee: nextEmployee,
    event: {
      ...event,
      status: 'APPLIED',
      approvedBy: approverName,
      approvedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// SHEET 16: HR DOCUMENTS POLICY & EXPIRY REMINDERS
// ============================================================================

export const WORKBOOK_DOCUMENT_POLICIES: DocumentPolicySpec[] = [
  { documentType: 'CV / Resume', whoUploads: 'Employee (HR Approves)', whoCanView: 'Employee & HR', required: true, tracksExpiry: false, reminderLeadDays: 0, notes: 'Explicitly cited in Sheet 4 Employee permissions.' },
  { documentType: 'Academic & Professional Certificates', whoUploads: 'Employee (HR Approves)', whoCanView: 'Employee & HR', required: true, tracksExpiry: true, reminderLeadDays: 60, notes: 'Tracks professional license renewal reminders.' },
  { documentType: 'Government-Issued ID / Passport', whoUploads: 'Employee (HR Approves)', whoCanView: 'Employee & HR', required: true, tracksExpiry: true, reminderLeadDays: 30, notes: 'Mandatory bio-data identity verification.' },
  { documentType: 'Signed Employment Offer & Contract', whoUploads: 'HR / Super Admin', whoCanView: 'Employee & HR', required: true, tracksExpiry: true, reminderLeadDays: 45, notes: 'Fixed-term contract expiry reminders.' },
  { documentType: 'Leave Supporting Attachment (Leave Form / Medical Note / Exam Timetable)', whoUploads: 'Employee (HR Approves)', whoCanView: 'HR & Business Head', required: true, tracksExpiry: false, reminderLeadDays: 0, notes: 'Required per Sheet 7 leave rules.' },
  { documentType: 'Exit Clearance & Handover Form', whoUploads: 'HR / Super Admin', whoCanView: 'HR & Business Head', required: true, tracksExpiry: false, reminderLeadDays: 0, notes: 'Required prior to Sheet 15 offboarding closure.' },
];

export function evaluateDocumentExpiry(
  documentName: string,
  expiryDate?: string | null,
  reminderLeadDays = 30,
  todayIso?: string
): DocumentExpiryStatus {
  if (!expiryDate) {
    return { documentName, state: 'NO_EXPIRY', daysRemaining: null };
  }
  const exp = new Date(`${expiryDate}T00:00:00Z`);
  const today = todayIso ? new Date(`${todayIso}T00:00:00Z`) : new Date();
  if (Number.isNaN(exp.getTime())) {
    return { documentName, expiryDate, state: 'NO_EXPIRY', daysRemaining: null };
  }
  const todayMidnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const diffDays = Math.round((exp.getTime() - todayMidnight) / 86400000);

  if (diffDays < 0) {
    return { documentName, expiryDate, state: 'EXPIRED', daysRemaining: diffDays };
  }
  if (diffDays <= reminderLeadDays) {
    return { documentName, expiryDate, state: 'EXPIRING_SOON', daysRemaining: diffDays };
  }
  return { documentName, expiryDate, state: 'VALID', daysRemaining: diffDays };
}

// ============================================================================
// SHEETS 6 & 22: EXISTING DATA SOURCES & LEGACY BIO-DATA MIGRATION VALIDATOR
// ============================================================================

export const WORKBOOK_LEGACY_DATA_SOURCES: LegacyDataSourceSpec[] = [
  {
    id: 'src-biodata',
    sourceName: 'Employee Bio Data Form',
    format: 'Excel',
    owner: 'HR / PCCM (TBD)',
    approxRecords: 40,
    currentLocation: 'Excel file',
    migrationNeeded: 'Yes',
    cleaningRequired: true,
    importPriority: 'Must Have',
    notes: 'Primary source for all 24 mandatory Sheet 5 Employee Master Data fields.',
  },
  {
    id: 'src-leave-form',
    sourceName: 'Leave Application Form',
    format: 'Google Doc',
    owner: 'HR / PCCM (TBD)',
    approxRecords: null,
    currentLocation: 'Google Docs',
    migrationNeeded: 'Yes',
    cleaningRequired: true,
    importPriority: 'Must Have',
    notes: 'Replaced by Sheet 7 digital Leave Policy & 2-Stage / Direct-HR approval workflow.',
  },
  {
    id: 'src-appraisal',
    sourceName: 'Performance Appraisal Form',
    format: 'Google Doc',
    owner: 'HR / PCCM (TBD)',
    approxRecords: null,
    currentLocation: 'Google Docs',
    migrationNeeded: 'Yes',
    cleaningRequired: true,
    importPriority: 'Must Have',
    notes: 'Replaced by weighted KPI & role-linked appraisal module.',
  },
  {
    id: 'src-org-chart',
    sourceName: 'Organisation Chart ("Organisation Chat" in Sheet 6)',
    format: 'Excel',
    owner: 'HR / PCCM (TBD)',
    approxRecords: 3,
    currentLocation: 'Excel file',
    migrationNeeded: 'Yes',
    cleaningRequired: false,
    importPriority: 'Must Have',
    notes: '3 records corresponding to CGCC, CSOG, and Citadel Holdings entities.',
  },
  {
    id: 'src-onboarding',
    sourceName: 'Onboarding Checklist',
    format: 'Excel',
    owner: 'HR / PCCM (TBD)',
    approxRecords: null,
    currentLocation: 'Excel file',
    migrationNeeded: 'Maybe',
    cleaningRequired: true,
    importPriority: 'Important',
    notes: 'Supported directly via custom CSV/JSON/Text checklist template upload.',
  },
  {
    id: 'src-offboarding',
    sourceName: 'Off-boarding Checklist',
    format: 'Excel',
    owner: 'HR / PCCM (TBD)',
    approxRecords: null,
    currentLocation: 'Excel file',
    migrationNeeded: 'Maybe',
    cleaningRequired: true,
    importPriority: 'Important',
    notes: 'Mapped to Sheet 15 Offboarding clearance & access-revocation workflow.',
  },
];

function parseSimpleCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function validateBioDataMigrationCsv(csvContent: string, sourceName = 'Employee Bio Data Form'): MigrationValidationReport {
  const lines = csvContent
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      sourceName,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateStaffIds: [],
      duplicateEmails: [],
      credentialLeakRows: [],
      rows: [],
    };
  }

  const headers = parseSimpleCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const seenStaffIds = new Set<string>();
  const seenEmails = new Set<string>();
  const duplicateStaffIds = new Set<string>();
  const duplicateEmails = new Set<string>();
  const credentialLeakRows: number[] = [];
  const rows: MigrationRowValidation[] = [];

  const headerAliases: Record<string, string[]> = {
    staffId: ['staffid', 'employeeid', 'id'],
    fullName: ['fullname', 'name', 'employeename'],
    profilePhoto: ['profilephoto', 'photo', 'avatar'],
    dateOfBirth: ['dateofbirth', 'dob', 'birthdate'],
    gender: ['gender', 'sex'],
    phone: ['phone', 'phonenumber', 'mobile'],
    email: ['email', 'emailaddress', 'workemail'],
    address: ['address', 'homeaddress', 'residentialaddress'],
    emergencyContact: ['emergencycontact', 'emergencyphone'],
    nextOfKin: ['nextofkin', 'nok'],
    entityName: ['entity', 'entityname', 'business'],
    departmentName: ['department', 'departmentname', 'dept'],
    jobTitle: ['jobtitle', 'role', 'position'],
    gradeLevel: ['gradelevel', 'grade', 'level'],
    employmentType: ['employmenttype', 'emptype'],
    employmentDate: ['employmentdate', 'hiredate', 'startdate'],
    confirmationDate: ['confirmationdate', 'confirmeddate'],
    managerName: ['managerhead', 'manager', 'managername', 'supervisor'],
    contractStatus: ['contractstatus', 'status'],
    yearsOfService: ['yearsofservice', 'tenure', 'yos'],
    qualifications: ['qualifications', 'education'],
    certifications: ['certifications', 'certificates'],
    bankPayroll: ['bankpayrollinformation', 'bankpayroll', 'bankaccount'],
    pensionHmo: ['pensionhmobenefits', 'pensionhmo', 'rsapin'],
  };

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1;
    const rawLine = lines[i];
    const cells = parseSimpleCsvLine(rawLine);
    const getVal = (fieldKey: string): string => {
      const aliases = headerAliases[fieldKey] || [fieldKey.toLowerCase()];
      const idx = headers.findIndex((h) => aliases.includes(h));
      return idx >= 0 ? (cells[idx] || '').trim() : '';
    };

    const staffId = getVal('staffId');
    const fullName = getVal('fullName');
    const email = getVal('email').toLowerCase();
    const entityName = getVal('entityName');
    const departmentName = getVal('departmentName');

    const missingFields: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check Sheet 1 Rule 4 credential leak guard
    const leaked = detectForbiddenCredentials(rawLine);
    if (leaked.length > 0) {
      credentialLeakRows.push(rowNumber);
      errors.push(`Blocked credential/PIN content detected (${leaked.join(', ')}) — violates Sheet 1 Rule 4.`);
    }

    // Validate all 24 Sheet 5 mandatory fields
    for (const field of EMPLOYEE_MASTER_FIELDS) {
      const val = getVal(field.key);
      if (!val) {
        if (field.priority === 'Phase 2') {
          warnings.push(`Phase 2 field "${field.label}" is empty.`);
        } else {
          missingFields.push(field.label);
        }
      }
    }

    if (missingFields.length > 0) {
      errors.push(`Missing required Sheet 5 fields (${missingFields.length}): ${missingFields.slice(0, 5).join(', ')}${missingFields.length > 5 ? '…' : ''}`);
    }

    if (staffId) {
      if (seenStaffIds.has(staffId.toLowerCase())) {
        duplicateStaffIds.add(staffId);
        errors.push(`Duplicate Staff ID "${staffId}".`);
      }
      seenStaffIds.add(staffId.toLowerCase());
    }

    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Invalid email format "${email}".`);
      }
      if (seenEmails.has(email)) {
        duplicateEmails.add(email);
        errors.push(`Duplicate email "${email}".`);
      }
      seenEmails.add(email);
    }

    if (entityName && departmentName) {
      const orgCheck = resolveDepartmentBelongsToEntity(entityName, departmentName);
      if (!orgCheck.valid && orgCheck.error) {
        errors.push(orgCheck.error);
      }
    }

    rows.push({
      rowNumber,
      staffId: staffId || `(Row ${rowNumber})`,
      fullName: fullName || 'Unnamed Record',
      valid: errors.length === 0,
      missingFields,
      errors,
      warnings,
    });
  }

  const validRows = rows.filter((r) => r.valid).length;
  return {
    sourceName,
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
    duplicateStaffIds: Array.from(duplicateStaffIds),
    duplicateEmails: Array.from(duplicateEmails),
    credentialLeakRows,
    rows,
  };
}

export function generateSampleBioDataMigrationCsv(): string {
  const headers = [
    'Staff ID', 'Full Name', 'Profile Photo', 'Date of Birth', 'Gender', 'Phone', 'Email', 'Address',
    'Emergency Contact', 'Next of Kin', 'Entity', 'Department', 'Job Title', 'Grade/Level',
    'Employment Type', 'Employment Date', 'Confirmation Date', 'Manager/Head', 'Contract Status',
    'Years of Service', 'Qualifications', 'Certifications', 'Bank/Payroll Information', 'Pension/HMO/Benefits',
  ];
  const validRow = [
    'CGCC/099', 'Chinedu Okafor', 'https://citadel.ng/photos/099.jpg', '1991-06-15', 'Male',
    '+2348035550199', 'c.okafor@thecitadelglobal.org', '12 Allen Ave Ikeja Lagos',
    'Ada Okafor +2348035550100', 'Ada Okafor (Spouse)', 'CGCC', 'ICT', 'Systems Engineer', 'L3',
    'Full-Time', '2024-01-10', '2024-07-10', 'ICT Manager', 'Permanent',
    '2', 'B.Sc Computer Science', 'Microsoft Azure Admin', 'GTBank 0199887766', 'Stanbic PEN100998877 / Reliance HMO',
  ];
  const invalidRow = [
    'CSOG/102', 'Amina Bello', '', '1994-03-20', 'Female',
    '+2348091112233', 'amina.bello@citadelschoolofgovernment.org', '45 Victoria Island Lagos',
    'Yusuf Bello +2348091112200', 'Yusuf Bello', 'CSOG', 'ICT', 'Program Coordinator', 'L2',
    'Full-Time', '2025-11-01', '', 'Director School of Government', 'Probation',
    '0', '', '', 'Access Bank 0011223344', '',
  ];
  return [headers, validRow, invalidRow]
    .map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
