/**
 * Payroll Domain Types
 * Citadel People Hub
 *
 * Types for salary structures, employee assignments, pay runs,
 * payslips, loan management, deductions, provident fund tracking,
 * Excel payroll import, proration calculations, attendance penalties,
 * and manual adjustments.
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
  code?: string;
  pay_frequency?: 'monthly' | 'weekly';
  basic_salary: number;
  house_rent?: number;
  medical_allowance?: number;
  conveyance_allowance?: number;
  other_allowance?: number;
  provident_fund_percent?: number;
  tax_percent?: number;
  allowances: SalaryStructureAllowance[];
  deductions: SalaryStructureDeduction[];
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
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
  pay_frequency?: 'monthly' | 'weekly';
  basic_salary: number;
  house_rent?: number;
  medical_allowance?: number;
  conveyance_allowance?: number;
  other_allowance?: number;
  gross_salary?: number;
  provident_fund_percent?: number;
  tax_percent?: number;
  ctc_amount?: number | null;
  effective_date: string;
  effective_to?: string | null;
  override_basic_salary?: number | null;
  custom_allowances?: SalaryStructureAllowance[] | null;
  custom_deductions?: SalaryStructureDeduction[] | null;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type PayrollRunStatus = 'draft' | 'approved' | 'paid' | 'cancelled' | 'processed';

export interface PayrollRun {
  id: string;
  run_number?: string;
  title?: string;
  pay_frequency?: 'monthly' | 'weekly';
  payroll_year?: number;
  payroll_month?: number;
  payroll_week?: number;
  period_label?: string;
  period_start: string;
  period_end: string;
  pay_date?: string;
  status: PayrollRunStatus;
  currency?: string;
  total_basic?: number;
  total_allowance?: number;
  total_gross: number;
  total_deduction: number;
  total_net: number;
  gross_total?: number;
  deduction_total?: number;
  net_total?: number;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  items?: PayrollItem[];
  processor?: {
    id: string;
    name: string;
    email: string;
  };
  processed_by?: string;
  processed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollItemDeduction {
  id?: string;
  payroll_item_id?: string;
  employee_deduction_id?: string;
  name?: string;
  deduction_type: 'tax' | 'loan' | 'provident_fund' | 'other';
  amount: number;
  reason?: string;
  comments?: string;
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
    entity_id?: string;
    entity_name?: string;
    hired_at?: string | null;
    termination_date?: string | null;
  };
  pay_frequency?: 'monthly' | 'weekly';
  basic_salary: number;
  allowance_total: number;
  gross_salary?: number;
  bonus_total?: number;
  loan_deduction?: number;
  other_deduction?: number;
  provident_fund_deduction?: number;
  employer_pf_contribution?: number;
  tax_deduction?: number;
  total_deduction: number;
  deduction_total?: number;
  net_payable?: number;
  net_salary: number;
  tax_amount?: number;
  provident_fund_amount?: number;
  loan_repayment_amount?: number;
  attendance_penalty?: number;
  payment_status: 'unpaid' | 'paid' | 'pending';
  payment_method?: string;
  payment_reference?: string | null;
  deductions?: PayrollItemDeduction[];
  proration_record?: EmployeeProrationRecord;
  adjustments?: PayrollAdjustment[];
  created_at?: string;
  updated_at?: string;
}

export type LoanStatus = 'pending' | 'approved' | 'active' | 'completed' | 'rejected' | 'pending_supervisor' | 'pending_final';

export interface LoanInstallment {
  id: string;
  employee_loan_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount?: number;
  paid_date?: string | null;
  payroll_item_id?: string | null;
  status: 'pending' | 'paid';
  created_at?: string;
  updated_at?: string;
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
  loan_number?: string;
  loan_reference?: string;
  loan_type: string;
  principal_amount: number;
  interest_rate?: number;
  interest_rate_percent?: number;
  total_payable?: number;
  installment_amount?: number;
  monthly_installment: number;
  total_installments: number;
  installment_count?: number;
  paid_installments: number;
  remaining_balance: number;
  status: LoanStatus;
  disbursed_at?: string | null;
  issued_date?: string;
  first_installment_date?: string | null;
  notes?: string;
  remarks?: string;
  installments?: LoanInstallment[];
  applied_by?: string;
  supervisor_approved_by?: string | null;
  supervisor_approved_at?: string | null;
  final_approved_by?: string | null;
  final_approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
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
  calculation_type: 'fixed' | 'percent';
  amount: number;
  start_date: string;
  end_date?: string | null;
  effective_from?: string;
  effective_to?: string | null;
  frequency: 'monthly' | 'weekly' | 'one_time';
  is_percentage?: boolean;
  is_recurring?: boolean;
  is_active: boolean;
  reason?: string;
  comments?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProvidentFundTransaction {
  id: string;
  employee_provident_fund_id?: string;
  employee_id?: string;
  payroll_run_id?: string | null;
  reference_no?: string;
  transaction_date?: string;
  transaction_type: 'contribution' | 'withdrawal' | 'interest' | 'adjustment';
  employee_contribution: number;
  employer_contribution: number;
  employee_amount?: number;
  employer_amount?: number;
  total_amount?: number;
  adjustment_amount?: number;
  withdrawal_amount?: number;
  running_balance?: number;
  balance_after?: number;
  reason?: string;
  recorded_by?: string | null;
  created_at: string;
  updated_at?: string;
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
  employee_rate?: number;
  employer_rate?: number;
  employee_contribution_percent?: number;
  employer_contribution_percent?: number;
  total_employee_contribution: number;
  total_employer_contribution: number;
  current_balance: number;
  opening_balance?: number;
  status: 'active' | 'inactive';
  effective_from?: string | null;
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

// ==================== NEW TYPES FOR EXCEL PAYROLL ====================

export interface PayrollExcelMapping {
  id: string;
  template_id: string;
  excel_column: string;
  payroll_field: string;
  field_type: 'earning' | 'deduction' | 'identifier' | 'info';
  calculation_type?: 'fixed' | 'percentage' | 'formula' | null;
  default_value?: number | null;
  is_required: boolean;
  is_identifier: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollExcelTemplate {
  id: string;
  name: string;
  description?: string | null;
  original_filename?: string | null;
  created_by?: string | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  columns: string[];
  mappings: PayrollExcelMapping[];
  sample_data?: any[] | null;
  is_active: boolean;
  is_default: boolean;
  entity_id?: string | null;
  entity?: {
    id: string;
    name: string;
    short_code: string;
  };
  import_batches?: PayrollImportBatch[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface PayrollImportBatch {
  id: string;
  template_id?: string | null;
  template?: PayrollExcelTemplate | null;
  original_filename: string;
  uploaded_by: string;
  uploader?: {
    id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'preview' | 'validating' | 'validated' | 'processing' | 'completed' | 'failed';
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  warning_rows: number;
  validation_errors?: Array<{ row: number; errors: string[] }> | null;
  validation_warnings?: Array<{ row: number; warnings: string[] }> | null;
  import_options?: {
    proration_method?: 'calendar_days' | 'working_days';
    apply_attendance_penalties?: boolean;
    create_payroll_run?: boolean;
    period_start?: string;
    period_end?: string;
    pay_date?: string;
    pay_frequency?: 'monthly' | 'weekly';
  } | null;
  payroll_run_id?: string | null;
  payroll_run?: PayrollRun | null;
  processed_at?: string | null;
  rows?: PayrollImportRow[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface PayrollImportRow {
  id: string;
  batch_id: string;
  row_number: number;
  raw_data: Record<string, any>;
  mapped_data?: Record<string, any> | null;
  employee_id?: string | null;
  employee?: {
    id: string;
    staff_id: string;
    full_name: string;
    email: string;
    department_name?: string;
  } | null;
  match_method?: string | null;
  match_confidence?: 'high' | 'medium' | 'low' | 'none' | null;
  status: 'pending' | 'matched' | 'unmatched' | 'error' | 'warning';
  errors?: string[] | null;
  warnings?: string[] | null;
  calculated_fields?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollAdjustment {
  id: string;
  payroll_item_id: string;
  payroll_run_id: string;
  employee_id: string;
  employee?: {
    id: string;
    staff_id: string;
    full_name: string;
  };
  field_name: string;
  field_category: 'earning' | 'deduction' | 'other';
  original_value: number;
  adjusted_value: number;
  difference: number;
  reason: string;
  adjusted_by: string;
  adjuster?: {
    id: string;
    name: string;
    email: string;
  };
  adjusted_at: string;
  is_system_generated: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AttendancePenaltyRule {
  id: string;
  name: string;
  description?: string | null;
  entity_id?: string | null;
  entity?: {
    id: string;
    name: string;
    short_code: string;
  };
  penalty_type: 'lateness' | 'unapproved_absence' | 'unpaid_leave';
  calculation_method: 'fixed_per_incident' | 'percentage_of_daily_rate' | 'tiered';
  amount_per_incident: number;
  percentage_of_daily_rate: number;
  tiered_rules?: Array<{ threshold_minutes: number; amount: number }> | null;
  grace_period_minutes: number;
  max_incidents_per_period?: number | null;
  apply_to_gross: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeProrationRecord {
  id: string;
  payroll_item_id: string;
  payroll_run_id: string;
  employee_id: string;
  employee?: {
    id: string;
    staff_id: string;
    full_name: string;
  };
  proration_reason: 'mid_month_join' | 'mid_month_leave' | 'unpaid_leave' | 'mid_month_termination' | 'mid_month_join';
  period_start: string;
  period_end: string;
  effective_start?: string | null;
  effective_end?: string | null;
  calendar_days_in_period: number;
  working_days_in_period: number;
  eligible_days: number;
  calculation_method: 'calendar_days' | 'working_days';
  full_basic_salary: number;
  prorated_basic_salary: number;
  proration_factor: number;
  affected_allowances?: Record<string, number> | null;
  affected_deductions?: Record<string, number> | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Excel upload preview types
export interface ExcelPreviewResponse {
  headers: string[];
  total_rows: number;
  preview_rows: Record<string, any>[];
  suggested_mappings: Array<{
    excel_column: string;
    suggested_field: string | null;
    confidence: 'high' | 'medium' | 'low';
  }>;
  template?: PayrollExcelTemplate | null;
}

// Payroll field definitions for mapping
export const PAYROLL_FIELDS = {
  identifiers: [
    { key: 'staff_id', label: 'Staff ID', description: 'Unique employee identifier (e.g., CGCC-001)' },
    { key: 'employee_id', label: 'Employee ID', description: 'Internal database ID' },
    { key: 'email', label: 'Email', description: 'Work email address' },
    { key: 'full_name', label: 'Full Name', description: 'Employee full name' },
  ],
  earnings: [
    { key: 'basic_salary', label: 'Basic Salary', description: 'Base monthly salary' },
    { key: 'house_rent', label: 'Housing Allowance', description: 'House rent allowance (HRA)' },
    { key: 'medical_allowance', label: 'Medical Allowance', description: 'Medical/health allowance' },
    { key: 'conveyance_allowance', label: 'Transport Allowance', description: 'Conveyance/transport allowance' },
    { key: 'other_allowance', label: 'Other Allowance', description: 'Miscellaneous allowance' },
    { key: 'leave_allowance', label: 'Leave Allowance', description: 'Leave encashment/allowance' },
    { key: 'bonus', label: 'Bonus', description: 'Performance or other bonus' },
    { key: 'overtime', label: 'Overtime Pay', description: 'Overtime compensation' },
  ],
  deductions: [
    { key: 'tax_deduction', label: 'PAYE Tax', description: 'Income tax deduction' },
    { key: 'provident_fund_deduction', label: 'Provident Fund', description: 'PF/Pension contribution' },
    { key: 'loan_deduction', label: 'Loan Repayment', description: 'Staff loan installment' },
    { key: 'other_deduction', label: 'Other Deduction', description: 'Miscellaneous deduction' },
    { key: 'attendance_penalty', label: 'Attendance Penalty', description: 'Lateness/absence penalty' },
  ],
} as const;

export type PayrollFieldKey = 
  | 'staff_id' | 'employee_id' | 'email' | 'full_name'
  | 'basic_salary' | 'house_rent' | 'medical_allowance' | 'conveyance_allowance' | 'other_allowance' | 'leave_allowance' | 'bonus' | 'overtime'
  | 'tax_deduction' | 'provident_fund_deduction' | 'loan_deduction' | 'other_deduction' | 'attendance_penalty';