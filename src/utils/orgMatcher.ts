/**
 * Organizational Entity & Department Matching Utilities
 *
 * Ensures consistent entity/department filtering across both Laravel short-code IDs
 * ('CGCC', 'CSOG', 'HOLDINGS') and slug IDs ('entity-cgcc', 'entity-csog', 'entity-holdings'),
 * and provides formula-safe CSV export for employee records.
 */

import type { CitadelDepartment, CitadelEntity, Employee } from '../types';

/**
 * Normalizes any entity identifier or short code into a canonical uppercase key
 * ('CGCC' | 'CSOG' | 'HOLDINGS' | uppercase string).
 */
export function normalizeEntityKey(value?: string | number | null): string {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === 'all') return '';
  const upper = raw.toUpperCase();

  if (
    upper === 'CGCC' ||
    upper === 'ENTITY-CGCC' ||
    upper.includes('COMMUNITY CHURCH') ||
    upper.includes('(CGCC)')
  ) {
    return 'CGCC';
  }
  if (
    upper === 'CSOG' ||
    upper === 'ENTITY-CSOG' ||
    upper.includes('SCHOOL OF GOVERNMENT') ||
    upper.includes('(CSOG)')
  ) {
    return 'CSOG';
  }
  if (
    upper === 'HOLDINGS' ||
    upper === 'ENTITY-HOLDINGS' ||
    upper === 'CH' ||
    upper.includes('CITADEL HOLDINGS')
  ) {
    return 'HOLDINGS';
  }

  return upper.replace(/^ENTITY-/, '');
}

/**
 * Compares two entity identifiers, short codes, or entity names for structural equivalence.
 */
export function entitiesMatch(
  a?: string | number | null,
  b?: string | number | null
): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  const strA = String(a).trim();
  const strB = String(b).trim();
  if (!strA || !strB) return false;
  if (strA.toLowerCase() === strB.toLowerCase()) return true;

  const keyA = normalizeEntityKey(strA);
  const keyB = normalizeEntityKey(strB);
  return Boolean(keyA && keyB && keyA === keyB);
}

/**
 * Finds the matching CitadelEntity record from a loaded catalog by ID, short code, or name.
 */
export function findMatchingEntity(
  entities: CitadelEntity[],
  entityIdOrCode?: string | number | null
): CitadelEntity | undefined {
  if (!entityIdOrCode) return undefined;
  return entities.find(
    (ent) =>
      entitiesMatch(ent.id, entityIdOrCode) ||
      entitiesMatch(ent.shortCode, entityIdOrCode) ||
      entitiesMatch(ent.name, entityIdOrCode)
  );
}

/**
 * Filters departments strictly belonging to the selected entity.
 * Never falls back to departments from other entities.
 */
export function filterDepartmentsByEntity(
  departments: CitadelDepartment[],
  entityId?: string | number | null,
  options?: { activeOnly?: boolean; preserveDepartmentId?: string | number | null }
): CitadelDepartment[] {
  if (!departments || departments.length === 0) return [];
  const activeOnly = options?.activeOnly ?? false;
  const preserveId =
    options?.preserveDepartmentId !== undefined && options?.preserveDepartmentId !== null
      ? String(options.preserveDepartmentId)
      : '';

  const entityFiltered = !entityId || String(entityId).toLowerCase() === 'all'
    ? departments
    : departments.filter(
        (dept) =>
          entitiesMatch(dept.entityId, entityId) ||
          entitiesMatch(dept.entityName, entityId)
      );

  if (!activeOnly) return entityFiltered;

  return entityFiltered.filter(
    (dept) => dept.isActive !== false || (preserveId !== '' && String(dept.id) === preserveId)
  );
}

/**
 * Filters employees belonging to the selected entity.
 */
export function filterEmployeesByEntity<
  T extends { entityId?: string | number | null; entityName?: string | null }
>(employees: T[], entityId?: string | number | null): T[] {
  if (!entityId || String(entityId).toLowerCase() === 'all') return employees;
  return employees.filter(
    (emp) =>
      entitiesMatch(emp.entityId, entityId) ||
      entitiesMatch(emp.entityName, entityId)
  );
}

/**
 * Resolves the canonical entity option ID from the loaded catalog matching a filter value.
 * Prevents <select> blank state when header filter uses 'entity-cgcc' and API uses 'CGCC'.
 */
export function resolveEntityOptionValue(
  entities: CitadelEntity[],
  candidate?: string | null
): string {
  if (!candidate || candidate.toLowerCase() === 'all') return '';
  const match = findMatchingEntity(entities, candidate);
  return match ? String(match.id) : String(candidate);
}

/**
 * Neutralizes CSV formula injection (=, +, -, @, leading tab/CR) and escapes RFC 4180 quotes.
 */
export function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Builds an RFC 4180, formula-safe CSV export of employee master records.
 * Sensitive payroll/DOB/address fields are only included when includeSensitive is true.
 */
export function buildEmployeeMasterCsv(
  employees: Employee[],
  options?: { includeSensitive?: boolean }
): string {
  const includeSensitive = options?.includeSensitive ?? false;

  const baseHeaders = [
    'Staff ID',
    'Full Name',
    'Gender',
    'Official Email',
    'Phone',
    'Business Entity',
    'Department',
    'Job Title',
    'Grade Level',
    'Employment Type',
    'Contract Status',
    'Lifecycle Status',
    'Employment Date',
    'Confirmation Date',
    'Direct Manager',
    'Years of Service',
  ];

  const sensitiveHeaders = includeSensitive
    ? [
        'Date of Birth',
        'Residential Address',
        'Emergency Contact',
        'Next of Kin',
        'Bank Name',
        'Salary Grade',
        'PFA Provider',
        'HMO Provider',
        'HMO Plan',
      ]
    : [];

  const headers = [...baseHeaders, ...sensitiveHeaders];

  const rows = employees.map((emp) => {
    const baseCols = [
      emp.staffId,
      emp.fullName,
      emp.gender || '',
      emp.email || '',
      emp.phone || '',
      emp.entityName || '',
      emp.departmentName || '',
      emp.jobTitle || '',
      emp.gradeLevel || '',
      emp.employmentType || '',
      emp.contractStatus || '',
      emp.status || '',
      emp.employmentDate || '',
      emp.confirmationDate || '',
      emp.managerName || 'Top-Level / GEC',
      emp.yearsOfService ?? 0,
    ];

    const sensitiveCols = includeSensitive
      ? [
          emp.dateOfBirth || '',
          emp.address || '',
          emp.emergencyContact?.name
            ? `${emp.emergencyContact.name} (${emp.emergencyContact.relationship || 'Contact'}) ${emp.emergencyContact.phone || ''}`.trim()
            : '',
          emp.nextOfKin?.name
            ? `${emp.nextOfKin.name} (${emp.nextOfKin.relationship || 'NOK'}) ${emp.nextOfKin.phone || ''}`.trim()
            : '',
          emp.bankPayroll?.bankName || '',
          emp.bankPayroll?.salaryGrade || emp.gradeLevel || '',
          emp.pensionHmo?.pfaName || '',
          emp.pensionHmo?.hmoProvider || '',
          emp.pensionHmo?.hmoPlan || '',
        ]
      : [];

    return [...baseCols, ...sensitiveCols].map(escapeCsvCell).join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
}

/**
 * Validates that a profile photo URL uses a safe scheme (https, http, /storage/, or safe image data URI).
 */
export function isSafeImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^\/storage\//i.test(trimmed)) return true;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(trimmed)) return true;
  return false;
}

/**
 * Converts approved Sheet 5 ProfileChangeRequest proposedChanges into a typed Partial<Employee>
 * update payload so authoritative employee records stay in sync across demo and API modes.
 */
export function buildEmployeePatchFromProfileChanges(
  employee: Employee,
  proposedChanges: Record<string, string>
): Partial<Employee> {
  const patch: Partial<Employee> = {};
  const emergency = { ...(employee.emergencyContact || { name: '', relationship: '', phone: '' }) };
  const nok = { ...(employee.nextOfKin || { name: '', relationship: '', phone: '' }) };
  const bank = {
    ...(employee.bankPayroll || { bankName: '', accountNumber: '', accountName: employee.fullName, salaryGrade: employee.gradeLevel || '', currency: 'NGN' as const }),
  };
  let touchedEmergency = false;
  let touchedNok = false;
  let touchedBank = false;

  for (const [key, rawVal] of Object.entries(proposedChanges)) {
    const val = String(rawVal ?? '').trim();
    switch (key) {
      case 'staffId':
        if (val) patch.staffId = val;
        break;
      case 'phone':
        patch.phone = val;
        break;
      case 'email':
        if (val) patch.email = val;
        break;
      case 'address':
        patch.address = val;
        break;
      case 'profilePhoto':
        if (!val || isSafeImageUrl(val)) {
          patch.profilePhoto = val || undefined;
        }
        break;
      case 'emergencyContact':
      case 'emergencyContactName':
        emergency.name = val;
        touchedEmergency = true;
        break;
      case 'emergencyContactRelationship':
        emergency.relationship = val;
        touchedEmergency = true;
        break;
      case 'emergencyContactPhone':
        emergency.phone = val;
        touchedEmergency = true;
        break;
      case 'nextOfKin':
      case 'nextOfKinName':
        nok.name = val;
        touchedNok = true;
        break;
      case 'nextOfKinRelationship':
        nok.relationship = val;
        touchedNok = true;
        break;
      case 'nextOfKinPhone':
        nok.phone = val;
        touchedNok = true;
        break;
      case 'bankName':
        bank.bankName = val;
        touchedBank = true;
        break;
      case 'accountNumber':
        bank.accountNumber = val;
        touchedBank = true;
        break;
      case 'accountName':
        bank.accountName = val;
        touchedBank = true;
        break;
      case 'qualifications':
        patch.qualifications = val
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((degree, idx) => ({
            id: `qual-${Date.now()}-${idx}`,
            degree,
            institution: 'Self-Reported (HR Approved)',
            fieldOfStudy: degree,
            yearCompleted: new Date().getFullYear(),
          }));
        break;
      case 'certifications':
        patch.certifications = val
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((name, idx) => ({
            id: `cert-${Date.now()}-${idx}`,
            name,
            issuingBody: 'Self-Reported (HR Approved)',
            yearObtained: new Date().getFullYear(),
          }));
        break;
      default:
        break;
    }
  }

  if (touchedEmergency) patch.emergencyContact = emergency;
  if (touchedNok) patch.nextOfKin = nok;
  if (touchedBank) patch.bankPayroll = bank;

  return patch;
}

