import { evaluateAttendancePunch } from '../domain/workbook';
import type { AttendanceEvaluationResult } from '../domain/workbook';
import type {
  Employee,
  EmployeeDeduction,
  EmployeeLoan,
  EmployeeSalaryAssignment,
  PayrollItem,
  SalaryTemplate,
} from '../types';

export interface PayrollItemDraftPreview {
  employee_id: string;
  employee: NonNullable<PayrollItem['employee']>;
  basic_salary: number;
  allowance_total: number;
  gross_salary: number;
  tax_amount: number;
  provident_fund_amount: number;
  loan_repayment_amount: number;
  other_deduction: number;
  total_deduction: number;
  net_salary: number;
}

export interface PayrollDraftSummary {
  eligibleCount: number;
  unassignedCount: number;
  activeLoanCount: number;
  totalBasic: number;
  totalAllowances: number;
  totalGross: number;
  totalStatutoryDeductions: number;
  totalTaxDeductions: number;
  totalPensionDeductions: number;
  totalLoanDeductions: number;
  totalOtherDeductions: number;
  totalDeductions: number;
  totalNet: number;
  items: PayrollItemDraftPreview[];
}

function findMatchingEmployee(
  employees: Employee[],
  params: { employeeId?: string; staffId?: string; name?: string }
): Employee | undefined {
  const normId = params.employeeId?.trim();
  const normStaff = params.staffId?.trim().toLowerCase();
  const normName = params.name?.trim().toLowerCase();

  return (
    employees.find((e) => normId && e.id === normId) ||
    employees.find((e) => normStaff && e.staffId?.trim().toLowerCase() === normStaff) ||
    employees.find((e) => normName && e.fullName?.trim().toLowerCase() === normName)
  );
}

export function resolveEmployeeBankDetails(
  itemEmployee: PayrollItem['employee'] | undefined,
  employees: Employee[] = [],
  employeeId?: string
): { bankName: string; accountNumber: string; hasBankDetails: boolean } {
  const matched = findMatchingEmployee(employees, {
    employeeId: employeeId || itemEmployee?.id,
    staffId: itemEmployee?.staff_id,
    name: itemEmployee?.full_name || itemEmployee?.name,
  });

  const bankName =
    itemEmployee?.bank_name?.trim() ||
    matched?.bankPayroll?.bankName?.trim() ||
    '';
  const accountNumber =
    itemEmployee?.account_number?.trim() ||
    matched?.bankPayroll?.accountNumber?.trim() ||
    '';

  return {
    bankName: bankName || 'Not provided',
    accountNumber: accountNumber || '—',
    hasBankDetails: Boolean(bankName && accountNumber),
  };
}

export function calculatePayrollDraftSummary(params: {
  employees?: Employee[];
  assignments?: EmployeeSalaryAssignment[];
  templates?: SalaryTemplate[];
  loans?: EmployeeLoan[];
  deductions?: EmployeeDeduction[];
}): PayrollDraftSummary {
  const employees = params.employees ?? [];
  const assignments = (params.assignments ?? []).filter((a) => a.is_active !== false);
  const templates = params.templates ?? [];
  const loans = params.loans ?? [];
  const deductions = (params.deductions ?? []).filter((d) => d.is_active !== false);

  const activeLoans = loans.filter(
    (l) =>
      (l.status === 'active' || l.status === 'approved') &&
      Number(l.remaining_balance ?? l.principal_amount ?? 0) > 0
  );

  const assignedEmployeeIds = new Set<string>();
  const items: PayrollItemDraftPreview[] = [];

  let totalBasic = 0;
  let totalAllowances = 0;
  let totalStatutoryDeductions = 0;
  let totalTaxDeductions = 0;
  let totalPensionDeductions = 0;
  let totalLoanDeductions = 0;
  let totalOtherDeductions = 0;

  for (const assignment of assignments) {
    assignedEmployeeIds.add(assignment.employee_id);
    const tpl =
      assignment.salary_template ??
      templates.find((t) => t.id === assignment.salary_template_id);
    const matchedEmp = findMatchingEmployee(employees, {
      employeeId: assignment.employee_id,
      staffId: assignment.employee?.staff_id,
      name: assignment.employee?.full_name || assignment.employee?.name,
    });

    const basic = Number(
      assignment.override_basic_salary ??
        assignment.basic_salary ??
        tpl?.basic_salary ??
        0
    );

    const allowanceList =
      assignment.custom_allowances && assignment.custom_allowances.length > 0
        ? assignment.custom_allowances
        : tpl?.allowances ?? [];

    const allowanceTotal =
      allowanceList.length > 0
        ? allowanceList.reduce((sum, a) => {
            const raw = Number(a.amount) || 0;
            return sum + (a.is_percentage ? Math.round((basic * raw) / 100) : raw);
          }, 0)
        : Number(assignment.house_rent || 0) +
          Number(assignment.medical_allowance || 0) +
          Number(assignment.conveyance_allowance || 0) +
          Number(assignment.other_allowance || 0);

    const gross = basic + allowanceTotal;

    const templateDeductions =
      assignment.custom_deductions && assignment.custom_deductions.length > 0
        ? assignment.custom_deductions
        : tpl?.deductions ?? [];

    let taxAmount = 0;
    let pensionAmount = 0;
    let templateOtherStatutory = 0;

    for (const d of templateDeductions) {
      const raw = Number(d.amount) || 0;
      const amt = d.is_percentage ? Math.round((basic * raw) / 100) : raw;
      const lower = (d.name || '').toLowerCase();
      if (lower.includes('tax') || lower.includes('paye')) {
        taxAmount += amt;
      } else if (lower.includes('pension') || lower.includes('provident') || lower.includes('pf')) {
        pensionAmount += amt;
      } else {
        templateOtherStatutory += amt;
      }
    }

    const empLoans = activeLoans.filter((l) => l.employee_id === assignment.employee_id);
    const loanRepayment = empLoans.reduce((sum, l) => {
      const installment = Number(l.monthly_installment ?? l.installment_amount ?? 0);
      const remaining = Number(l.remaining_balance ?? l.principal_amount ?? 0);
      return sum + Math.min(installment, remaining);
    }, 0);

    const empCustomDeductions = deductions.filter((d) => d.employee_id === assignment.employee_id);
    const customDeductionTotal = empCustomDeductions.reduce((sum, d) => {
      const raw = Number(d.amount) || 0;
      const isPercent = d.is_percentage || d.calculation_type === 'percent';
      return sum + (isPercent ? Math.round((basic * raw) / 100) : raw);
    }, 0);

    const statutoryForEmp = taxAmount + pensionAmount + templateOtherStatutory;
    const totalDeductionForEmp = statutoryForEmp + loanRepayment + customDeductionTotal;
    const netForEmp = Math.max(0, gross - totalDeductionForEmp);

    totalBasic += basic;
    totalAllowances += allowanceTotal;
    totalTaxDeductions += taxAmount;
    totalPensionDeductions += pensionAmount;
    totalStatutoryDeductions += statutoryForEmp;
    totalLoanDeductions += loanRepayment;
    totalOtherDeductions += customDeductionTotal;

    const fullName =
      matchedEmp?.fullName ||
      assignment.employee?.full_name ||
      assignment.employee?.name ||
      assignment.employee_id;

    items.push({
      employee_id: assignment.employee_id,
      employee: {
        id: matchedEmp?.id || assignment.employee_id,
        name: fullName,
        full_name: fullName,
        staff_id: matchedEmp?.staffId || assignment.employee?.staff_id,
        department_name: matchedEmp?.departmentName || assignment.employee?.department_name,
        position: matchedEmp?.jobTitle || assignment.employee?.job_title,
        bank_name: matchedEmp?.bankPayroll?.bankName?.trim() || undefined,
        account_number: matchedEmp?.bankPayroll?.accountNumber?.trim() || undefined,
      },
      basic_salary: basic,
      allowance_total: allowanceTotal,
      gross_salary: gross,
      tax_amount: taxAmount,
      provident_fund_amount: pensionAmount,
      loan_repayment_amount: loanRepayment,
      other_deduction: templateOtherStatutory + customDeductionTotal,
      total_deduction: totalDeductionForEmp,
      net_salary: netForEmp,
    });
  }

  const totalGross = totalBasic + totalAllowances;
  const totalDeductions = totalStatutoryDeductions + totalLoanDeductions + totalOtherDeductions;
  const totalNet = Math.max(0, totalGross - totalDeductions);
  const activeEmployees = employees.filter((e) => e.status !== 'Inactive');
  const unassignedCount = activeEmployees.filter((e) => !assignedEmployeeIds.has(e.id)).length;

  return {
    eligibleCount: assignments.length,
    unassignedCount,
    activeLoanCount: activeLoans.length,
    totalBasic,
    totalAllowances,
    totalGross,
    totalStatutoryDeductions,
    totalTaxDeductions,
    totalPensionDeductions,
    totalLoanDeductions,
    totalOtherDeductions,
    totalDeductions,
    totalNet,
    items,
  };
}

export interface DailyAttendanceStatusResult {
  label: 'Single Punch' | 'On Time' | 'Late Arrival' | 'Half-Day' | 'Missing Punch' | 'Absent';
  dashboardStatus: AttendanceEvaluationResult['status'];
  badgeTone: 'slate' | 'emerald' | 'amber' | 'rose';
  evaluation: AttendanceEvaluationResult;
}

export function classifyDailySummaryStatus(
  summary: {
    entityName?: string;
    departmentName?: string;
    date: string;
    clockInTime?: string | null;
    clockOutTime?: string | null;
    punchCount?: number;
  },
  employee?: Pick<Employee, 'entityName' | 'departmentName'>
): DailyAttendanceStatusResult {
  const isSinglePunch = summary.punchCount === 1;
  const evaluation = evaluateAttendancePunch({
    entityName: summary.entityName || employee?.entityName || '',
    departmentName: summary.departmentName || employee?.departmentName || '',
    date: summary.date,
    clockInTime: summary.clockInTime || null,
    clockOutTime: isSinglePunch ? null : summary.clockOutTime || null,
    verificationSource: 'Biometric_ZKTeco',
    punchCount: summary.punchCount,
  });

  if (isSinglePunch) {
    return {
      label: 'Single Punch',
      dashboardStatus: evaluation.status,
      badgeTone: 'slate',
      evaluation,
    };
  }

  switch (evaluation.status) {
    case 'Present':
      return { label: 'On Time', dashboardStatus: 'Present', badgeTone: 'emerald', evaluation };
    case 'Late':
      return { label: 'Late Arrival', dashboardStatus: 'Late', badgeTone: 'amber', evaluation };
    case 'Half-Day':
      return { label: 'Half-Day', dashboardStatus: 'Half-Day', badgeTone: 'amber', evaluation };
    case 'Missing Punch':
      return { label: 'Missing Punch', dashboardStatus: 'Missing Punch', badgeTone: 'slate', evaluation };
    default:
      return { label: 'Absent', dashboardStatus: 'Absent', badgeTone: 'rose', evaluation };
  }
}

export const DOCUMENT_FILTER_OPTIONS = [
  'All',
  'Company Policy',
  'PCCM Form / Template',
  'Employee Contract',
  'Academic & Professional',
] as const;

const DOCUMENT_FILTER_ALIASES: Record<string, string[]> = {
  Policy: ['Company Policy'],
  Handbook: ['Company Policy'],
  Template: ['PCCM Form / Template'],
  Contract: ['Employee Contract', 'Employment Letter'],
  Academic: ['Academic & Professional', 'Educational Certificate', 'Professional Certification'],
};

export function matchesDocumentCategoryFilter(docCategory: string, filterValue: string): boolean {
  if (!filterValue || filterValue === 'All') return true;
  if (docCategory === filterValue) return true;
  const aliases = DOCUMENT_FILTER_ALIASES[filterValue];
  if (aliases) return aliases.includes(docCategory);
  return docCategory.toLowerCase().includes(filterValue.toLowerCase());
}
