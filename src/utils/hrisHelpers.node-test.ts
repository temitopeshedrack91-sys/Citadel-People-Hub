import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePayrollDraftSummary,
  classifyDailySummaryStatus,
  matchesDocumentCategoryFilter,
  resolveEmployeeBankDetails,
} from './hrisHelpers';
import { normalizeLaravelApiBaseUrl } from '../services/laravelClient';
import { isApiDataModeForced, shouldUseLaravelBackend } from './authMode';
import type {
  Employee,
  EmployeeDeduction,
  EmployeeLoan,
  EmployeeSalaryAssignment,
  SalaryTemplate,
} from '../types';

const sampleTemplateExec: SalaryTemplate = {
  id: 'st-1',
  name: 'Executive',
  basic_salary: 800000,
  allowances: [
    { name: 'Housing', amount: 300000 },
    { name: 'Transport', amount: 100000 },
  ],
  deductions: [
    { name: 'Statutory PAYE Tax', amount: 150000 },
    { name: 'Pension Contribution (8%)', amount: 64000 },
  ],
  is_active: true,
};

const sampleTemplateOps: SalaryTemplate = {
  id: 'st-2',
  name: 'Operations',
  basic_salary: 300000,
  allowances: [{ name: 'Housing', amount: 100000 }],
  deductions: [
    { name: 'PAYE Tax', amount: 30000 },
    { name: 'Pension (8%)', amount: 24000 },
  ],
  is_active: true,
};

const sampleEmployees: Employee[] = [
  {
    id: 'emp-1',
    staffId: 'CGCC/001',
    fullName: 'Adaeze Obi',
    firstName: 'Adaeze',
    lastName: 'Obi',
    dateOfBirth: '1985-01-01',
    gender: 'Female',
    phone: '+2348000000001',
    email: 'a.obi@citadel.ng',
    address: 'Lagos',
    emergencyContact: { name: 'Chidi Obi', relationship: 'Spouse', phone: '+2348000000002' },
    nextOfKin: { name: 'Chidi Obi', relationship: 'Spouse', phone: '+2348000000002', address: 'Lagos' },
    entityId: 'entity-cgcc',
    entityName: 'Citadel Global Community Church (CGCC)',
    departmentId: 'dept-pccm',
    departmentName: 'People, Culture & Change',
    jobTitle: 'HR Manager',
    gradeLevel: 'M1',
    employmentType: 'Full-Time',
    employmentDate: '2020-01-01',
    contractStatus: 'Permanent',
    yearsOfService: 6,
    qualifications: [],
    certifications: [],
    bankPayroll: {
      bankName: 'Access Bank PLC',
      accountNumber: '0011223344',
      accountName: 'Adaeze Obi',
      salaryGrade: 'M1',
      currency: 'NGN',
    },
    pensionHmo: {
      pfaName: 'Stanbic IBTC',
      rsaPin: 'PEN001',
      hmoProvider: 'Reliance HMO',
      hmoPlan: 'Gold',
      hmoIdNumber: 'REL-001',
    },
    status: 'Active',
  },
  {
    id: 'emp-2',
    staffId: 'CGCC/002',
    fullName: 'Tunde Bello',
    firstName: 'Tunde',
    lastName: 'Bello',
    dateOfBirth: '1990-05-10',
    gender: 'Male',
    phone: '+2348000000003',
    email: 't.bello@citadel.ng',
    address: 'Lagos',
    emergencyContact: { name: 'Sola Bello', relationship: 'Sibling', phone: '+2348000000004' },
    nextOfKin: { name: 'Sola Bello', relationship: 'Sibling', phone: '+2348000000004', address: 'Lagos' },
    entityId: 'entity-cgcc',
    entityName: 'Citadel Global Community Church (CGCC)',
    departmentId: 'dept-fac',
    departmentName: 'Facilities',
    jobTitle: 'Maintenance Officer',
    gradeLevel: 'S1',
    employmentType: 'Full-Time',
    employmentDate: '2022-03-01',
    contractStatus: 'Permanent',
    yearsOfService: 4,
    qualifications: [],
    certifications: [],
    bankPayroll: {
      bankName: '',
      accountNumber: '',
      accountName: 'Tunde Bello',
      salaryGrade: 'S1',
      currency: 'NGN',
    },
    pensionHmo: {
      pfaName: 'Stanbic IBTC',
      rsaPin: 'PEN002',
      hmoProvider: 'Reliance HMO',
      hmoPlan: 'Silver',
      hmoIdNumber: 'REL-002',
    },
    status: 'Active',
  },
];

describe('hrisHelpers - calculatePayrollDraftSummary', () => {
  it('computes dynamic totals from active assignments, override basic salary, active loans, and recurring deductions', () => {
    const assignments: EmployeeSalaryAssignment[] = [
      {
        id: 'a-1',
        employee_id: 'emp-1',
        salary_template_id: 'st-1',
        salary_template: sampleTemplateExec,
        effective_date: '2026-01-01',
        basic_salary: 800000,
        is_active: true,
      },
      {
        id: 'a-2',
        employee_id: 'emp-2',
        salary_template_id: 'st-2',
        salary_template: sampleTemplateOps,
        effective_date: '2026-01-01',
        basic_salary: 350000,
        override_basic_salary: 350000,
        is_active: true,
      },
    ];

    const loans: EmployeeLoan[] = [
      {
        id: 'l-1',
        employee_id: 'emp-2',
        loan_type: 'Device Loan',
        principal_amount: 100000,
        monthly_installment: 25000,
        total_installments: 4,
        paid_installments: 3,
        remaining_balance: 15000, // caps installment to remaining balance
        status: 'active',
      },
      {
        id: 'l-2',
        employee_id: 'emp-1',
        loan_type: 'Pending Loan',
        principal_amount: 500000,
        monthly_installment: 50000,
        total_installments: 10,
        paid_installments: 0,
        remaining_balance: 500000,
        status: 'pending', // excluded until active
      },
    ];

    const deductions: EmployeeDeduction[] = [
      {
        id: 'd-1',
        employee_id: 'emp-1',
        title: 'Cooperative',
        deduction_type: 'Cooperative',
        calculation_type: 'fixed',
        amount: 10000,
        start_date: '2026-01-01',
        frequency: 'monthly',
        is_active: true,
      },
    ];

    const result = calculatePayrollDraftSummary({
      employees: sampleEmployees,
      assignments,
      templates: [sampleTemplateExec, sampleTemplateOps],
      loans,
      deductions,
    });

    assert.equal(result.eligibleCount, 2);
    assert.equal(result.unassignedCount, 0);
    assert.equal(result.activeLoanCount, 1);
    assert.equal(result.totalBasic, 1150000);
    assert.equal(result.totalAllowances, 500000);
    assert.equal(result.totalGross, 1650000);
    assert.equal(result.totalTaxDeductions, 180000);
    assert.equal(result.totalPensionDeductions, 88000);
    assert.equal(result.totalStatutoryDeductions, 268000);
    assert.equal(result.totalLoanDeductions, 15000);
    assert.equal(result.totalOtherDeductions, 10000);
    assert.equal(result.totalDeductions, 293000);
    assert.equal(result.totalNet, 1357000);
    assert.equal(result.items[0].employee.bank_name, 'Access Bank PLC');
    assert.equal(result.items[1].employee.bank_name, undefined);
  });

  it('resolves missing bank details without fabricating Zenith Bank', () => {
    const withEmp = resolveEmployeeBankDetails(
      { id: 'emp-1', name: 'Adaeze Obi' },
      sampleEmployees,
      'emp-1'
    );
    assert.equal(withEmp.bankName, 'Access Bank PLC');
    assert.equal(withEmp.accountNumber, '0011223344');

    const byNameFallback = resolveEmployeeBankDetails(
      { id: 'emp-001', staff_id: 'CIT-001', name: 'Adaeze Obi' },
      sampleEmployees,
      'emp-001'
    );
    assert.equal(byNameFallback.bankName, 'Access Bank PLC');
    assert.equal(byNameFallback.accountNumber, '0011223344');

    const withoutBank = resolveEmployeeBankDetails(
      { id: 'emp-2', name: 'Tunde Bello' },
      sampleEmployees,
      'emp-2'
    );
    assert.equal(withoutBank.bankName, 'Not provided');
    assert.equal(withoutBank.accountNumber, '—');
    assert.equal(withoutBank.hasBankDetails, false);
  });
});

describe('hrisHelpers - classifyDailySummaryStatus', () => {
  it('treats 08:45 CGCC arrival as On Time (standard 09:00 + 10m grace)', () => {
    const res = classifyDailySummaryStatus({
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentName: 'People, Culture & Change',
      date: '2026-10-12',
      clockInTime: '08:45:00',
      clockOutTime: '16:05:00',
      punchCount: 2,
    });
    assert.equal(res.label, 'On Time');
    assert.equal(res.dashboardStatus, 'Present');
  });

  it('treats 07:15 Facilities arrival as Late Arrival (Facilities 07:00 + 10m grace)', () => {
    const res = classifyDailySummaryStatus({
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentName: 'Facilities',
      date: '2026-10-12',
      clockInTime: '07:15:00',
      clockOutTime: '16:00:00',
      punchCount: 2,
    });
    assert.equal(res.label, 'Late Arrival');
    assert.equal(res.dashboardStatus, 'Late');
  });

  it('treats 07:08 Facilities arrival as On Time', () => {
    const res = classifyDailySummaryStatus({
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentName: 'Facilities',
      date: '2026-10-12',
      clockInTime: '07:08:00',
      clockOutTime: '16:00:00',
      punchCount: 2,
    });
    assert.equal(res.label, 'On Time');
    assert.equal(res.dashboardStatus, 'Present');
  });

  it('treats single punch cleanly as Single Punch without mislabeling Half-Day', () => {
    const res = classifyDailySummaryStatus({
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentName: 'ICT',
      date: '2026-10-12',
      clockInTime: '09:05:00',
      clockOutTime: '09:05:00',
      punchCount: 1,
    });
    assert.equal(res.label, 'Single Punch');
    assert.equal(res.dashboardStatus, 'Present');
  });
});

describe('hrisHelpers - matchesDocumentCategoryFilter', () => {
  it('matches exact document category labels and legacy short filter aliases', () => {
    assert.equal(matchesDocumentCategoryFilter('Company Policy', 'All'), true);
    assert.equal(matchesDocumentCategoryFilter('Company Policy', 'Company Policy'), true);
    assert.equal(matchesDocumentCategoryFilter('Employee Contract', 'Employee Contract'), true);
    assert.equal(matchesDocumentCategoryFilter('PCCM Form / Template', 'Template'), true);
    assert.equal(matchesDocumentCategoryFilter('Company Policy', 'Policy'), true);
    assert.equal(matchesDocumentCategoryFilter('Employee Contract', 'Company Policy'), false);
  });
});

describe('production API URL normalization & VITE_DATA_MODE=api', () => {
  it('normalizes VITE_API_BASE_URL with or without trailing /api/v1 without duplicating /api/v1', () => {
    assert.equal(
      normalizeLaravelApiBaseUrl('https://api.africabroadcastingacademy.com/api/v1'),
      'https://api.africabroadcastingacademy.com'
    );
    assert.equal(
      normalizeLaravelApiBaseUrl('https://api.africabroadcastingacademy.com/api/v1/'),
      'https://api.africabroadcastingacademy.com'
    );
    assert.equal(
      normalizeLaravelApiBaseUrl('https://api.africabroadcastingacademy.com/'),
      'https://api.africabroadcastingacademy.com'
    );
    assert.equal(normalizeLaravelApiBaseUrl(''), '');
  });

  it('enforces Laravel API mode when VITE_DATA_MODE=api or in production', () => {
    assert.equal(isApiDataModeForced('api'), true);
    assert.equal(isApiDataModeForced('API'), true);
    assert.equal(isApiDataModeForced('mock'), false);
    assert.equal(shouldUseLaravelBackend(false, false, 'api'), true);
    assert.equal(shouldUseLaravelBackend(true, false, undefined), true);
    assert.equal(shouldUseLaravelBackend(false, true, undefined), true);
    assert.equal(shouldUseLaravelBackend(false, false, undefined), false);
  });
});

