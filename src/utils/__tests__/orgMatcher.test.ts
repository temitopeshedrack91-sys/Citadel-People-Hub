import { describe, it, expect } from 'vitest';
import {
  normalizeEntityKey,
  entitiesMatch,
  findMatchingEntity,
  filterDepartmentsByEntity,
  filterEmployeesByEntity,
  resolveEntityOptionValue,
  escapeCsvCell,
  buildEmployeeMasterCsv,
  isSafeImageUrl,
  buildEmployeePatchFromProfileChanges,
} from '../orgMatcher';
import { INITIAL_ENTITIES, INITIAL_DEPARTMENTS, INITIAL_EMPLOYEES } from '../../data/mockData';

describe('orgMatcher utilities', () => {
  it('normalizes slug IDs, short codes, and full names into canonical entity keys', () => {
    expect(normalizeEntityKey('entity-cgcc')).toBe('CGCC');
    expect(normalizeEntityKey('CGCC')).toBe('CGCC');
    expect(normalizeEntityKey('Citadel Global Community Church (CGCC)')).toBe('CGCC');

    expect(normalizeEntityKey('entity-csog')).toBe('CSOG');
    expect(normalizeEntityKey('CSOG')).toBe('CSOG');
    expect(normalizeEntityKey('Citadel School of Government')).toBe('CSOG');

    expect(normalizeEntityKey('entity-holdings')).toBe('HOLDINGS');
    expect(normalizeEntityKey('HOLDINGS')).toBe('HOLDINGS');
    expect(normalizeEntityKey('CH')).toBe('HOLDINGS');
    expect(normalizeEntityKey('Citadel Holdings')).toBe('HOLDINGS');

    expect(normalizeEntityKey('all')).toBe('');
    expect(normalizeEntityKey(null)).toBe('');
  });

  it('matches equivalent entity identifiers across backend short codes and frontend slugs', () => {
    expect(entitiesMatch('CGCC', 'entity-cgcc')).toBe(true);
    expect(entitiesMatch('CSOG', 'entity-csog')).toBe(true);
    expect(entitiesMatch('HOLDINGS', 'entity-holdings')).toBe(true);
    expect(entitiesMatch('Citadel Holdings', 'CH')).toBe(true);
    expect(entitiesMatch('CGCC', 'CSOG')).toBe(false);
    expect(entitiesMatch('CGCC', 'HOLDINGS')).toBe(false);
  });

  it('resolves entity catalog option values cleanly without blank dropdown mismatches', () => {
    const entity = findMatchingEntity(INITIAL_ENTITIES, 'CSOG');
    expect(entity?.shortCode).toBe('CSOG');

    expect(resolveEntityOptionValue(INITIAL_ENTITIES, 'CGCC')).toBe('entity-cgcc');
    expect(resolveEntityOptionValue(INITIAL_ENTITIES, 'CSOG')).toBe('entity-csog');
    expect(resolveEntityOptionValue(INITIAL_ENTITIES, 'HOLDINGS')).toBe('entity-holdings');
    expect(resolveEntityOptionValue(INITIAL_ENTITIES, 'all')).toBe('');
  });

  it('strictly filters departments per business entity without cross-entity leakage', () => {
    const cgccDepts = filterDepartmentsByEntity(INITIAL_DEPARTMENTS, 'CGCC');
    const csogDepts = filterDepartmentsByEntity(INITIAL_DEPARTMENTS, 'CSOG');
    const holdingsDepts = filterDepartmentsByEntity(INITIAL_DEPARTMENTS, 'HOLDINGS');

    expect(cgccDepts.length).toBe(8);
    expect(csogDepts.length).toBe(2);
    expect(holdingsDepts.length).toBe(5);

    expect(cgccDepts.every((d) => entitiesMatch(d.entityId, 'CGCC'))).toBe(true);
    expect(csogDepts.every((d) => entitiesMatch(d.entityId, 'CSOG'))).toBe(true);
    expect(holdingsDepts.every((d) => entitiesMatch(d.entityId, 'HOLDINGS'))).toBe(true);
  });

  it('supports activeOnly and preserveDepartmentId when editing legacy records', () => {
    const withInactive = INITIAL_DEPARTMENTS.map((d, idx) =>
      idx === 0 ? { ...d, isActive: false } : d
    );
    const activeOnly = filterDepartmentsByEntity(withInactive, 'CGCC', { activeOnly: true });
    expect(activeOnly.length).toBe(7);

    const preserved = filterDepartmentsByEntity(withInactive, 'CGCC', {
      activeOnly: true,
      preserveDepartmentId: withInactive[0].id,
    });
    expect(preserved.length).toBe(8);
  });

  it('filters employees accurately by business entity', () => {
    const csogStaff = filterEmployeesByEntity(INITIAL_EMPLOYEES, 'CSOG');
    expect(csogStaff.length).toBeGreaterThan(0);
    expect(csogStaff.every((emp) => entitiesMatch(emp.entityId, 'CSOG'))).toBe(true);
  });

  it('neutralizes CSV formula injection payloads and escapes quotes per RFC 4180', () => {
    expect(escapeCsvCell('=CMD("calc")')).toBe('"\'=CMD(""calc"")"');
    expect(escapeCsvCell('+1+1')).toBe('"\'+1+1"');
    expect(escapeCsvCell('-2+3')).toBe('"\'-2+3"');
    expect(escapeCsvCell('@SUM(A1:A5)')).toBe('"\'@SUM(A1:A5)"');
    expect(escapeCsvCell('Regular, "Quoted" Value')).toBe('"Regular, ""Quoted"" Value"');
  });

  it('exports employee master CSV with sensitive column gating', () => {
    const sample = INITIAL_EMPLOYEES.slice(0, 2);
    const nonSensitiveCsv = buildEmployeeMasterCsv(sample, { includeSensitive: false });
    expect(nonSensitiveCsv).toContain('"Staff ID"');
    expect(nonSensitiveCsv).not.toContain('"Bank Name"');
    expect(nonSensitiveCsv).not.toContain('"Date of Birth"');

    const sensitiveCsv = buildEmployeeMasterCsv(sample, { includeSensitive: true });
    expect(sensitiveCsv).toContain('"Date of Birth"');
    expect(sensitiveCsv).toContain('"Bank Name"');
    expect(sensitiveCsv).toContain('"HMO Provider"');
  });

  it('validates profile photo URLs against unsafe schemes', () => {
    expect(isSafeImageUrl('https://cdn.citadel.org/photos/staff-1.png')).toBe(true);
    expect(isSafeImageUrl('/storage/avatars/staff-1.jpg')).toBe(true);
    expect(isSafeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeImageUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
    expect(isSafeImageUrl('')).toBe(false);
  });

  it('builds typed Employee master data patches from approved ProfileChangeRequest fields', () => {
    const employee = INITIAL_EMPLOYEES[0];
    const patch = buildEmployeePatchFromProfileChanges(employee, {
      phone: '+234 809 555 0199',
      address: '14 Kudirat Abiola Way, Oregun, Lagos',
      emergencyContactName: 'Tunde Adeyemi',
      emergencyContactPhone: '+234 803 111 2233',
      nextOfKinName: 'Bola Adeyemi',
      nextOfKinRelationship: 'Spouse',
      bankName: 'GTBank',
      qualifications: 'B.Sc Accounting, MBA Finance',
      certifications: 'ICAN, CIPM',
      profilePhoto: 'javascript:alert(1)', // must be ignored because unsafe
    });

    expect(patch.phone).toBe('+234 809 555 0199');
    expect(patch.address).toBe('14 Kudirat Abiola Way, Oregun, Lagos');
    expect(patch.emergencyContact?.name).toBe('Tunde Adeyemi');
    expect(patch.emergencyContact?.phone).toBe('+234 803 111 2233');
    expect(patch.nextOfKin?.name).toBe('Bola Adeyemi');
    expect(patch.nextOfKin?.relationship).toBe('Spouse');
    expect(patch.bankPayroll?.bankName).toBe('GTBank');
    expect(patch.qualifications?.map((q) => q.degree)).toEqual(['B.Sc Accounting', 'MBA Finance']);
    expect(patch.certifications?.map((c) => c.name)).toEqual(['ICAN', 'CIPM']);
    expect(patch.profilePhoto).toBeUndefined();
  });
});
