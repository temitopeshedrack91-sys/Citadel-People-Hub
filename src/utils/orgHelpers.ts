/**
 * Organizational Structure, Dropdown Normalization & Employee Export Helpers
 * Citadel People Hub — Phase 3
 */

import type { CitadelDepartment, CitadelEntity, Employee } from '../types';

/**
 * Canonicalizes Citadel entity identifiers across backend IDs ('CGCC', 'CSOG', 'HOLDINGS')
 * and frontend/workbook slugs ('entity-cgcc', 'entity-csog', 'entity-holdings', 'CH').
 * Returns '' for empty values or the sentinel 'all'.
 */
export function normalizeEntityKey(entityId?: string | null): string {
  if (!entityId) return '';
  const raw = String(entityId).trim().toLowerCase();
  if (!raw || raw === 'all') return '';
  if (raw === 'cgcc' || raw === 'entity-cgcc' || raw.includes('church')) return 'cgcc';
  if (raw === 'csog' || raw === 'entity-csog' || raw.includes('school of government')) return 'csog';
  if (raw === 'holdings' || raw === 'entity-holdings' || raw === 'ch' || raw.includes('holdings')) return 'holdings';
  return raw;
}

/**
 * Checks whether a record's entityId belongs to the selected entity filter.
 * Treats empty/'all' filter as matching all entities.
 */
export function matchesEntityId(
  recordEntityId?: string | null,
  filterEntityId?: string | null
): boolean {
  const normalizedFilter = normalizeEntityKey(filterEntityId);
  if (!normalizedFilter) return true;
  const normalizedRecord = normalizeEntityKey(recordEntityId);
  if (!normalizedRecord) return false;
  return normalizedRecord === normalizedFilter;
}

/**
 * Strictly filters departments to those belonging to the selected entity.
 * Preserves an already-assigned inactive department if `keepDepartmentId` matches it.
 */
export function filterDepartmentsByEntity(
  departments: CitadelDepartment[],
  entityId?: string | null,
  options?: { includeInactive?: boolean; keepDepartmentId?: string | null }
): CitadelDepartment[] {
  if (!Array.isArray(departments) || departments.length === 0) return [];
  const includeInactive = options?.includeInactive ?? false;
  const keepId = options?.keepDepartmentId ? String(options.keepDepartmentId) : '';
  const normalizedEntity = normalizeEntityKey(entityId);

  return departments.filter((dept) => {
    const isKept = Boolean(keepId && String(dept.id) === keepId);
    if (!includeInactive && dept.isActive === false && !isKept) {
      return false;
    }
    if (!normalizedEntity) return true;
    return matchesEntityId(dept.entityId, normalizedEntity) || matchesEntityId(dept.entityName, normalizedEntity);
  });
}

/**
 * Resolves the canonical entity object from a list of loaded entities.
 */
export function findEntityById(
  entities: CitadelEntity[],
  entityId?: string | null
): CitadelEntity | undefined {
  if (!entityId || !Array.isArray(entities)) return undefined;
  const exact = entities.find((e) => String(e.id) === String(entityId));
  if (exact) return exact;
  const key = normalizeEntityKey(entityId);
  if (!key) return undefined;
  return entities.find(
    (e) =>
      normalizeEntityKey(e.id) === key ||
      normalizeEntityKey(e.shortCode) === key ||
      normalizeEntityKey(e.name) === key
  );
}

/**
 * Returns a consistent department head label regardless of whether the API/mock
 * populated `headOfDepartmentName` or `headOfDepartment`.
 */
export function getDepartmentHeadLabel(dept: CitadelDepartment): string {
  return (dept.headOfDepartmentName || dept.headOfDepartment || '').trim();
}

/**
 * Validates that a profile photo URL uses a safe scheme (https, http, or image data URL).
 */
export function isSafeImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(trimmed)) return true;
  return false;
}

/**
 * Escapes CSV cell values per RFC-4180 and neutralizes spreadsheet formula prefixes.
 */
export function escapeCsvCell(value: unknown): string {
  let str = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a formula-safe CSV export of employee master records covering Sheet 5 fields.
 * Redacts sensitive personal/payroll columns when `includeSensitive` is false.
 */
export function buildEmployeesCsv(
  employees: Employee[],
  includeSensitive: boolean
): string {
  const headers = [
    'Staff ID',
    'Full Name',
    'Gender',
    'Official Email',
    'Phone',
    'Business Entity',
    'Department',
    'Job Title',
    'Grade / Level',
    'Employment Type',
    'Employment Date',
    'Confirmation Date',
    'Reporting Manager',
    'Contract Status',
    'Lifecycle Status',
    'Years of Service',
    ...(includeSensitive
      ? [
          'Date of Birth',
          'Residential Address',
          'Emergency Contact',
          'Next of Kin',
          'Bank Name',
          'Account Number',
          'Basic Salary (NGN)',
          'PFA Provider',
          'RSA PIN',
          'HMO Provider & Plan',
        ]
      : []),
  ];

  const rows = employees.map((emp) => {
    const base = [
      emp.staffId,
      emp.fullName,
      emp.gender,
      emp.email,
      emp.phone,
      emp.entityName,
      emp.departmentName,
      emp.jobTitle,
      emp.gradeLevel,
      emp.employmentType,
      emp.employmentDate,
      emp.confirmationDate || '',
      emp.managerName || '',
      emp.contractStatus,
      emp.status,
      emp.yearsOfService,
    ];

    if (!includeSensitive) {
      return base;
    }

    const emergencySummary = emp.emergencyContact?.name
      ? `${emp.emergencyContact.name} (${emp.emergencyContact.relationship || 'Contact'}) ${emp.emergencyContact.phone || ''}`.trim()
      : '';
    const nokSummary = emp.nextOfKin?.name
      ? `${emp.nextOfKin.name} (${emp.nextOfKin.relationship || 'Kin'}) ${emp.nextOfKin.phone || ''}`.trim()
      : '';
    const hmoSummary = emp.pensionHmo?.hmoProvider
      ? `${emp.pensionHmo.hmoProvider}${emp.pensionHmo.hmoPlan ? ` - ${emp.pensionHmo.hmoPlan}` : ''}`
      : '';

    return [
      ...base,
      emp.dateOfBirth || '',
      emp.address || '',
      emergencySummary,
      nokSummary,
      emp.bankPayroll?.bankName || '',
      emp.bankPayroll?.accountNumber || '',
      emp.bankPayroll?.basicSalary ?? '',
      emp.pensionHmo?.pfaName || '',
      emp.pensionHmo?.rsaPin || '',
      hmoSummary,
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n');
}
