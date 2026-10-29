/**
 * Payroll Domain Types
 * Citadel People Hub
 *
 * Types for salary structures, employee assignments, pay runs,
 * payslips, loan management, deductions, and provident fund tracking.
 */

export interface SalaryStructureAllowance {
  name: string;
  amount: number;
  is_percentage?: boolean;
}

export interface SalaryStructureDeduction {
  name: string;
  amount: number;
  is_percentage?: boolean;
}

export interface SalaryTemplate {
  id: string;
  name: string;
  basic_salary: number;
  allowances: SalaryStructureAllowance[];
  deductions: SalaryStructureDeduction[];
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeSalaryAssignment {
  id: string;
  employee_id: string;
  salary_template_id: string;
  salary_template?: SalaryTemplate;
  employee?: {
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    staff_id?: string;
    email?: string;
    job_title?: string;
    department?: string;
    department_name?: string;
  };
  effective_date: string;
  override_basic_salary?: number | null;
  custom_allowances?: SalaryStructureAllowance[] | null;
  custom_deductions?: SalaryStructureDeduction[] | null;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type PayrollRunStatus = 'draft' | 'approved' | 'paid' | 'cancelled';

export interface PayrollRun {
  id: string;
  run_number: string;
  title: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: PayrollRunStatus;
  currency: string;
  total_basic: number;
  total_allowance: number;
  total_gross: number;
  total_deduction: number;
  total_net: number;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  items?: PayrollItem[];
  created_at?: string;
  updated_at?: string;
}

export interface PayrollItemDeduction {
  id?: string;
  payroll_item_id?: string;
  name: string;
  type: 'tax' | 'loan' | 'provident_fund' | 'other';
  amount: number;
  reference_id?: string | null;
}

export interface PayrollItem {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  employee?: {
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    staff_id?: string;
    email?: string;
    department_name?: string;
    position?: string;
    bank_name?: string;
    account_number?: string;
  };
  basic_salary: number;
  allowance_total: number;
  gross_salary: number;
  deduction_total: number;
  net_salary: number;
  tax_amount: number;
  provident_fund_amount: number;
  loan_repayment_amount: number;
  payment_status: 'unpaid' | 'paid';
  payment_method?: string;
  deductions?: PayrollItemDeduction[];
  created_at?: string;
  updated_at?: string;
}

export type LoanStatus = 'pending' | 'approved' | 'active' | 'completed' | 'rejected';

export interface LoanInstallment {
  id: string;
  employee_loan_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid';
  paid_at?: string | null;
}

export interface EmployeeLoan {
  id: string;
  employee_id: string;
  employee?: {
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    staff_id?: string;
    department_name?: string;
  };
  loan_number: string;
  loan_type: string;
  principal_amount: number;
  interest_rate: number;
  total_payable: number;
  monthly_installment: number;
  total_installments: number;
  paid_installments: number;
  remaining_balance: number;
  status: LoanStatus;
  disbursed_at?: string | null;
  notes?: string;
  installments?: LoanInstallment[];
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeDeduction {
  id: string;
  employee_id: string;
  employee?: {
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    staff_id?: string;
  };
  title: string;
  deduction_type: string;
  amount: number;
  is_percentage: boolean;
  start_date: string;
  end_date?: string | null;
  is_recurring: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProvidentFundTransaction {
  id: string;
  employee_provident_fund_id: string;
  transaction_type: 'contribution' | 'withdrawal' | 'interest';
  employee_amount: number;
  employer_amount: number;
  total_amount: number;
  running_balance: number;
  notes?: string;
  created_at: string;
}

export interface EmployeeProvidentFund {
  id: string;
  employee_id: string;
  employee?: {
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    staff_id?: string;
    department_name?: string;
  };
  employee_rate: number;
  employer_rate: number;
  total_employee_contribution: number;
  total_employer_contribution: number;
  current_balance: number;
  status: 'active' | 'inactive';
  transactions?: ProvidentFundTransaction[];
  created_at?: string;
  updated_at?: string;
}

export interface PayrollOverviewStats {
  totalGrossYtd: number;
  monthlyNetDisbursement: number;
  activeSalaryStructures: number;
  activeAssignedEmployees: number;
  activeLoansCount: number;
  totalOutstandingLoanBalance: number;
  providentFundReservePool: number;
}

