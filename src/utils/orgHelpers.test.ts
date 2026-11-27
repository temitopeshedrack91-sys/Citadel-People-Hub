import { describe, it, expect } from 'vitest';
import {
  buildEmployeesCsv,
  escapeCsvCell,
  filterDepartmentsByEntity,
  findEntityById,
  getDepartmentHeadLabel,
  isSafeImageUrl,
  matchesEntityId,
  normalizeEntityKey,
} from './orgHelpers';
import type { CitadelDepartment, CitadelEntity, Employee } from '../types';

const SAMPLE_ENTITIES: CitadelEntity[] = [
  {
    id: 'entity-cgcc',
    name: 'Citadel Global Community Church (CGCC)',
    shortCode: 'CGCC',
    description: 'Church ministry',
    headOfEntity: 'Pastor Segun Bakare / Pastor Taiwo Adebayo',
    isActive: true,
    departmentCount: 8,
    employeeCount: 10,
  },
  {
    id: 'entity-csog',
    name: 'Citadel School of Government (CSOG)',
    shortCode: 'CSOG',
    description: 'Governance & Policy School',
    headOfEntity: 'Mrs. Folashade Adeyemo',
    isActive: true,
    departmentCount: 2,
    employeeCount: 2,
  },
  {
    id: 'entity-holdings',
    name: 'Citadel Holdings',
    shortCode: 'HOLDINGS',
    description: 'Commercial ventures',
    headOfEntity: 'Mr. Femi Adeyemo / Mr. Kunle Adebayo',
    isActive: true,
    departmentCount: 5,
    employeeCount: 5,
  },
];

const SAMPLE_DEPARTMENTS: CitadelDepartment[] = [
  {
    id: 'dept-cgcc-ict',
    name: 'Information & Communication Technology (ICT)',
    code: 'ICT',
    entityId: 'entity-cgcc',
    entityName: 'Citadel Global Community Church (CGCC)',
    headOfDepartment: 'ICT Lead',
    isActive: true,
    employeeCount: 3,
  },
  {
    id: 'dept-csog-ops',
    name: 'School of Government Operations',
    code: 'CSOG-OPS',
    entityId: 'CSOG',
    entityName: 'Citadel School of Government (CSOG)',
    headOfDepartmentName: 'Mrs. Folashade Adeyemo',
    isActive: true,
    employeeCount: 2,
  },
  {
    id: 'dept-holdings-cafe',
    name: 'Cafeteria & Food Services',
    code: 'HOLD-CAFE',
    entityId: 'entity-holdings',
    entityName: 'Citadel Holdings',
    headOfDepartment: 'Cafeteria Manager',
    isActive: false,
    employeeCount: 1,
  },
];

const SAMPLE_EMPLOYEE: Employee = {
  id: 'emp-1',
  staffId: 'CGCC/001',
  firstName: 'Ada',
  lastName: 'Okafor',
  fullName: 'Ada Okafor',
  dateOfBirth: '1991-05-12',
  gender: 'Female',
  phone: '+2348030001111',
  email: 'ada.okafor@thecitadelglobal.org',
  address: '12 Allen Ave, Ikeja',
  entityId: 'entity-cgcc',
  entityName: 'Citadel Global Community Church (CGCC)',
  departmentId: 'dept-cgcc-ict',
  departmentName: 'ICT',
  jobTitle: 'Systems Engineer',
  gradeLevel: 'L3',
  employmentType: 'Full-Time',
  employmentDate: '2022-01-10',
  confirmationDate: '2022-07-10',
  managerName: 'ICT Lead',
  contractStatus: 'Permanent',
  yearsOfService: 4,
  status: 'Confirmed',
  emergencyContact: { name: 'Chidi Okafor', relationship: 'Spouse', phone: '+2348039990000' },
  nextOfKin: { name: 'Chidi Okafor', relationship: 'Spouse', phone: '+2348039990000', address: '12 Allen Ave' },
  qualifications: [],
  certifications: [],
  bankPayroll: {
    bankName: 'GTBank',
    accountNumber: '0123456789',
    accountName: 'Ada Okafor',
    salaryGrade: 'L3',
    basicSalary: 550000,
    currency: 'NGN',
  },
  pensionHmo: {
    pfaName: 'Stanbic IBTC',
    rsaPin: 'PEN100200300',
    hmoProvider: 'Reliance HMO',
    hmoPlan: 'Gold',
    hmoIdNumber: 'HMO-991',
  },
};

describe('orgHelpers', () => {
  it('normalizes entity slugs, short codes, and the all sentinel', () => {
    expect(normalizeEntityKey('all')).toBe('');
    expect(normalizeEntityKey('entity-cgcc')).toBe('cgcc');
    expect(normalizeEntityKey('CGCC')).toBe('cgcc');
    expect(normalizeEntityKey('entity-csog')).toBe('csog');
    expect(normalizeEntityKey('CSOG')).toBe('csog');
    expect(normalizeEntityKey('entity-holdings')).toBe('holdings');
    expect(normalizeEntityKey('CH')).toBe('holdings');

    expect(matchesEntityId('entity-cgcc', 'CGCC')).toBe(true);
    expect(matchesEntityId('CSOG', 'entity-csog')).toBe(true);
    expect(matchesEntityId('entity-holdings', 'all')).toBe(true);
    expect(matchesEntityId('entity-cgcc', 'CSOG')).toBe(false);
  });

  it('filters departments strictly by normalized entityId and preserves kept inactive dept', () => {
    const cgccDepts = filterDepartmentsByEntity(SAMPLE_DEPARTMENTS, 'CGCC');
    expect(cgccDepts).toHaveLength(1);
    expect(cgccDepts[0].id).toBe('dept-cgcc-ict');

    const csogDepts = filterDepartmentsByEntity(SAMPLE_DEPARTMENTS, 'entity-csog');
    expect(csogDepts).toHaveLength(1);
    expect(csogDepts[0].id).toBe('dept-csog-ops');

    expect(filterDepartmentsByEntity(SAMPLE_DEPARTMENTS, 'HOLDINGS')).toHaveLength(0);
    const kept = filterDepartmentsByEntity(SAMPLE_DEPARTMENTS, 'HOLDINGS', {
      keepDepartmentId: 'dept-holdings-cafe',
    });
    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe('dept-holdings-cafe');
  });

  it('resolves entity lookup and department head labels across mock and API shapes', () => {
    expect(findEntityById(SAMPLE_ENTITIES, 'CSOG')?.id).toBe('entity-csog');
    expect(findEntityById(SAMPLE_ENTITIES, 'entity-holdings')?.shortCode).toBe('HOLDINGS');
    expect(getDepartmentHeadLabel(SAMPLE_DEPARTMENTS[0])).toBe('ICT Lead');
    expect(getDepartmentHeadLabel(SAMPLE_DEPARTMENTS[1])).toBe('Mrs. Folashade Adeyemo');
  });

  it('validates image URLs and rejects unsafe schemes', () => {
    expect(isSafeImageUrl('https://cdn.citadel.org/avatar.jpg')).toBe(true);
    expect(isSafeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeImageUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isSafeImageUrl('')).toBe(false);
  });

  it('neutralizes CSV formula prefixes and applies RBAC redaction in buildEmployeesCsv', () => {
    expect(escapeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeCsvCell('+2348030001111')).toBe("'+2348030001111");
    expect(escapeCsvCell('Lagos, Nigeria')).toBe('"Lagos, Nigeria"');

    const redacted = buildEmployeesCsv([SAMPLE_EMPLOYEE], false);
    expect(redacted).toContain('Confirmation Date');
    expect(redacted).toContain('2022-07-10');
    expect(redacted).not.toContain('Basic Salary');
    expect(redacted).not.toContain('PEN100200300');

    const full = buildEmployeesCsv([SAMPLE_EMPLOYEE], true);
    expect(full).toContain('Basic Salary (NGN)');
    expect(full).toContain('550000');
    expect(full).toContain('PEN100200300');
    expect(full).toContain('Chidi Okafor');
  });
});
