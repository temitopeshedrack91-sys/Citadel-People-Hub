import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_ENTITIES,
  INITIAL_DEPARTMENTS,
  INITIAL_EMPLOYEES,
} from '../../data/mockData';
import {
  organizationRepository,
  employeeRepository,
  classificationRepository,
} from '../../services';
import { governanceRepository } from '../../services/governanceRepository';
import { createProfileChangeRequest, reviewProfileChangeRequest } from '../../domain/workbook';
import {
  filterDepartmentsByEntity,
  buildEmployeePatchFromProfileChanges,
} from '../../utils/orgMatcher';

describe('Phase 3: Organisation Structure & Employee Management Workflows', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('preserves all 3 documented business entities and 15 Sheet-3 departments with governance metadata', async () => {
    const entities = await organizationRepository.getEntities();
    const departments = await organizationRepository.getDepartments();

    expect(entities.length).toBe(3);
    const shortCodes = entities.map((e) => e.shortCode).sort();
    expect(shortCodes).toEqual(['CGCC', 'CSOG', 'HOLDINGS']);

    expect(departments.length).toBe(15);
    expect(filterDepartmentsByEntity(departments, 'CGCC').length).toBe(8);
    expect(filterDepartmentsByEntity(departments, 'CSOG').length).toBe(2);
    expect(filterDepartmentsByEntity(departments, 'HOLDINGS').length).toBe(5);

    // Verify Sheet 3 governance fields are hydrated (Business Head, Reports To, GEC Shared Service)
    const hrDept = departments.find(
      (d) => d.code === 'CGCC-PCCM' || d.name.includes('People, Culture') || d.name.includes('Human Resources')
    );
    expect(hrDept).toBeDefined();
    expect(hrDept?.businessHeadName).toBeTruthy();
    expect(hrDept?.reportsTo).toBeTruthy();
    expect(hrDept?.isGecSharedService).toBe(true);

    const csogDepts = filterDepartmentsByEntity(departments, 'CSOG');
    expect(csogDepts.every((d) => Boolean(d.businessHeadName && d.reportsTo))).toBe(true);
  });

  it('loads live pay grades and job titles from classificationRepository without hardcoded dropdown gaps', async () => {
    const [grades, titles] = await Promise.all([
      classificationRepository.getPayGrades(),
      classificationRepository.getJobTitles(),
    ]);

    expect(grades.length).toBeGreaterThanOrEqual(4);
    expect(titles.length).toBeGreaterThanOrEqual(4);
    expect(grades.every((g) => Boolean(g.code && g.name))).toBe(true);
  });

  it('enforces entity-department coupling and hierarchy cycle protection in employeeRepository', async () => {
    const entities = await organizationRepository.getEntities();
    const departments = await organizationRepository.getDepartments();
    const cgcc = entities.find((e) => e.shortCode === 'CGCC')!;
    const csogDept = filterDepartmentsByEntity(departments, 'CSOG')[0];

    // Cross-entity department assignment must fail
    await expect(
      employeeRepository.create({
        staffId: 'CGCC-999',
        firstName: 'Ada',
        lastName: 'Nwachukwu',
        fullName: 'Ada Nwachukwu',
        email: 'ada.nwachukwu@citadel.org',
        phone: '+234 809 000 1111',
        gender: 'Female',
        entityId: cgcc.id,
        entityName: cgcc.name,
        departmentId: csogDept.id,
        departmentName: csogDept.name,
        jobTitle: 'Operations Officer',
        gradeLevel: 'Grade 4',
        employmentType: 'Full-Time',
        contractStatus: 'Probation',
        status: 'Active',
        employmentDate: '2026-01-10',
        yearsOfService: 0,
        dateOfBirth: '1995-05-12',
        address: '10 Oregun Road, Ikeja, Lagos',
        emergencyContact: { name: 'Chuka Nwachukwu', relationship: 'Brother', phone: '+234 803 000 1122' },
        nextOfKin: { name: 'Chuka Nwachukwu', relationship: 'Brother', phone: '+234 803 000 1122', address: '10 Oregun Road' },
        qualifications: [],
        certifications: [],
        bankPayroll: { bankName: 'GTBank', accountNumber: '0123456789', accountName: 'Ada Nwachukwu', salaryGrade: 'Grade 4', currency: 'NGN' },
        pensionHmo: { pfaName: 'ARM Pension', rsaPin: 'PEN100111222', hmoProvider: 'Reliance HMO', hmoPlan: 'Standard', hmoIdNumber: 'HMO-111' },
      })
    ).rejects.toThrow(/department/i);

    // Self-supervision must fail
    const employees = await employeeRepository.getAll();
    const target = employees[0];
    await expect(
      employeeRepository.update(target.id, { managerId: target.id })
    ).rejects.toThrow(/own supervisor|cannot report to themselves|cycle|self/i);
  });

  it('routes employee self-service protected field updates through HR approval before updating authoritative master data', async () => {
    const employees = await employeeRepository.getAll();
    const employee = employees[0] || INITIAL_EMPLOYEES[0];
    const originalPhone = employee.phone;
    const proposedPhone = '+234 809 777 4321';

    // 1. Employee submits protected update -> creates PENDING_HR_APPROVAL request
    const request = createProfileChangeRequest({
      employee,
      actorRole: 'EMPLOYEE',
      actorName: employee.fullName,
      proposedChanges: { phone: proposedPhone, address: '22 Allen Avenue, Ikeja, Lagos' },
      reason: 'Relocated to Ikeja and updated mobile number',
    });

    const saved = await governanceRepository.createProfileChangeRequest(request);
    expect(saved.status).toBe('PENDING_HR_APPROVAL');

    // Authoritative record MUST remain unchanged while pending
    const beforeApproval = await employeeRepository.getById(employee.id);
    expect(beforeApproval?.phone).toBe(originalPhone);

    // 2. HR approves request and commits authoritative patch
    const approved = reviewProfileChangeRequest({
      request: saved,
      reviewerRole: 'SUPER_ADMIN_HR',
      reviewerName: 'Kemi Adebayo (HR)',
      decision: 'APPROVED',
      comments: 'Verified ID & utility bill',
    });
    await governanceRepository.reviewProfileChangeRequest(
      saved.id,
      'APPROVED',
      'Verified ID & utility bill',
      approved
    );

    const patch = buildEmployeePatchFromProfileChanges(beforeApproval!, saved.proposedChanges);
    await employeeRepository.update(employee.id, patch);

    const afterApproval = await employeeRepository.getById(employee.id);
    expect(afterApproval?.phone).toBe(proposedPhone);
    expect(afterApproval?.address).toBe('22 Allen Avenue, Ikeja, Lagos');
  });
});
