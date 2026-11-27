import { describe, it, expect, beforeEach } from 'vitest';
import { MockEmployeeRepository, MockOrganizationRepository } from './mockRepository';
import {
  applyApprovedChangeRequest,
  createProfileChangeRequest,
  reviewProfileChangeRequest,
} from '../domain/workbook';

describe('Phase 3: Organisation Structure, Dropdown Normalization & Employee Master Data', () => {
  let orgRepo: MockOrganizationRepository;
  let empRepo: MockEmployeeRepository;

  beforeEach(() => {
    window.localStorage.clear();
    orgRepo = new MockOrganizationRepository();
    empRepo = new MockEmployeeRepository();
  });

  it('loads all 3 distinct Citadel business entities without flattening and populates Business Heads', async () => {
    const entities = await orgRepo.getEntities();
    expect(entities.length).toBeGreaterThanOrEqual(3);

    const shortCodes = entities.map((e) => e.shortCode);
    expect(shortCodes).toContain('CGCC');
    expect(shortCodes).toContain('CSOG');
    expect(shortCodes).toContain('HOLDINGS');

    for (const ent of entities) {
      expect(ent.headOfEntity).toBeTruthy();
      expect((ent.departmentCount ?? 0)).toBeGreaterThan(0);
    }
  });

  it('loads all 15 workbook departments and filters accurately across slug & shortCode entity IDs', async () => {
    const allDepts = await orgRepo.getDepartments();
    expect(allDepts.length).toBeGreaterThanOrEqual(15);

    const cgccBySlug = await orgRepo.getDepartments('entity-cgcc');
    const cgccByCode = await orgRepo.getDepartments('CGCC');
    expect(cgccBySlug.length).toBe(cgccByCode.length);
    expect(cgccBySlug.length).toBeGreaterThanOrEqual(8);

    const csogDepts = await orgRepo.getDepartments('CSOG');
    expect(csogDepts.length).toBeGreaterThanOrEqual(2);

    const holdingsDepts = await orgRepo.getDepartments('HOLDINGS');
    expect(holdingsDepts.length).toBeGreaterThanOrEqual(5);

    // Sentinel 'all' returns every department
    const allSentinel = await orgRepo.getDepartments('all');
    expect(allSentinel.length).toBe(allDepts.length);

    // Every department exposes a head label on both properties
    for (const d of allDepts) {
      expect(d.headOfDepartment || d.headOfDepartmentName).toBeTruthy();
    }
  });

  it('creates and edits a complete Sheet 5 employee master record and persists all fields', async () => {
    const cgccDepts = await orgRepo.getDepartments('CGCC');
    const ictDept = cgccDepts[0];
    expect(ictDept).toBeDefined();

    const created = await empRepo.create({
      staffId: 'CGCC/901',
      firstName: 'Tunde',
      lastName: 'Balogun',
      fullName: 'Tunde Balogun',
      profilePhoto: 'https://citadel.org/photos/tunde.jpg',
      dateOfBirth: '1990-04-12',
      gender: 'Male',
      phone: '+2348035559901',
      email: 'tunde.balogun@thecitadelglobal.org',
      address: '10 Kudirat Abiola Way, Oregun',
      entityId: 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentId: ictDept.id,
      departmentName: ictDept.name,
      jobTitle: 'Network Architect',
      gradeLevel: 'Grade 3',
      employmentType: 'Full-Time',
      employmentDate: '2024-01-15',
      confirmationDate: '2024-07-15',
      managerName: 'ICT Manager',
      contractStatus: 'Permanent',
      yearsOfService: 2,
      status: 'Confirmed',
      emergencyContact: { name: 'Bola Balogun', relationship: 'Spouse', phone: '+2348035559902' },
      nextOfKin: { name: 'Bola Balogun', relationship: 'Spouse', phone: '+2348035559902', address: '10 Kudirat Abiola Way' },
      qualifications: [{ id: 'q-1', degree: 'B.Sc Computer Engineering', institution: 'UNILAG', fieldOfStudy: 'Engineering', yearCompleted: 2014 }],
      certifications: [{ id: 'c-1', name: 'CCNP', issuingBody: 'Cisco', yearObtained: 2021 }],
      bankPayroll: {
        bankName: 'GTBank',
        accountNumber: '0123456789',
        accountName: 'Tunde Balogun',
        bvn: '22233344455',
        salaryGrade: 'Grade 3',
        basicSalary: 620000,
        currency: 'NGN',
      },
      pensionHmo: {
        pfaName: 'ARM Pension',
        rsaPin: 'PEN100999888',
        hmoProvider: 'AXA Mansard',
        hmoPlan: 'Gold',
        hmoIdNumber: 'AXA-901',
      },
    });

    expect(created.id).toBeTruthy();
    expect(created.confirmationDate).toBe('2024-07-15');
    expect(created.profilePhoto).toBe('https://citadel.org/photos/tunde.jpg');
    expect(created.bankPayroll.bvn).toBe('22233344455');

    // Edit record across personal, placement, emergency, and payroll fields
    const updated = await empRepo.update(created.id, {
      jobTitle: 'Principal Network Architect',
      confirmationDate: '2024-08-01',
      contractStatus: 'Permanent',
      emergencyContact: { name: 'Seyi Balogun', relationship: 'Brother', phone: '+2348035559903' },
      pensionHmo: { ...created.pensionHmo, hmoPlan: 'Platinum' },
    });

    expect(updated.jobTitle).toBe('Principal Network Architect');
    expect(updated.confirmationDate).toBe('2024-08-01');
    expect(updated.emergencyContact.name).toBe('Seyi Balogun');
    expect(updated.pensionHmo.hmoPlan).toBe('Platinum');

    // Employee filter by 'CGCC' finds employee stored under 'entity-cgcc'
    const cgccStaff = await empRepo.getAll({ entityId: 'CGCC' });
    expect(cgccStaff.some((e) => e.id === created.id)).toBe(true);
  });

  it('stages employee self-service updates as PENDING_HR_APPROVAL and commits only after HR approval', async () => {
    const employees = await empRepo.getAll();
    const employee = employees[0];
    expect(employee).toBeDefined();

    // Non-HR employee cannot directly edit HR-only fields like jobTitle
    expect(() =>
      createProfileChangeRequest({
        employee,
        actorRole: 'EMPLOYEE',
        actorName: employee.fullName,
        proposedChanges: { jobTitle: 'CEO' },
        reason: 'Self promotion attempt',
      })
    ).toThrow(/HR \/ Super Admin/i);

    // Employee can submit permitted Sheet 5 fields, staged as PENDING_HR_APPROVAL
    const request = createProfileChangeRequest({
      employee,
      actorRole: 'EMPLOYEE',
      actorName: employee.fullName,
      proposedChanges: {
        phone: '+2348091234567',
        address: '42 Awolowo Road, Ikoyi, Lagos',
        emergencyContact: 'Grace Ade | Sister | +2348097654321',
        nextOfKin: 'Grace Ade | Sister | +2348097654321 | 42 Awolowo Road',
      },
      reason: 'Relocated residential address and updated emergency contact',
    });

    expect(request.status).toBe('PENDING_HR_APPROVAL');

    // Non-HR cannot approve their own request
    expect(() =>
      reviewProfileChangeRequest({
        request,
        reviewerRole: 'EMPLOYEE',
        reviewerName: employee.fullName,
        decision: 'APPROVED',
      })
    ).toThrow(/Only Super Admin \/ HR/i);

    // HR approves and commits to authoritative employee record
    const approved = reviewProfileChangeRequest({
      request,
      reviewerRole: 'SUPER_ADMIN_HR',
      reviewerName: 'Sussan Afuwape',
      decision: 'APPROVED',
      comments: 'Verified updated contact details.',
    });

    const patched = applyApprovedChangeRequest(employee, approved);
    const persisted = await empRepo.update(employee.id, patched);

    expect(persisted.phone).toBe('+2348091234567');
    expect(persisted.address).toBe('42 Awolowo Road, Ikoyi, Lagos');
    expect(persisted.emergencyContact.name).toBe('Grace Ade');
    expect(persisted.emergencyContact.phone).toBe('+2348097654321');
    expect(persisted.nextOfKin.name).toBe('Grace Ade');
    expect(persisted.nextOfKin.address).toBe('42 Awolowo Road');
  });
});
