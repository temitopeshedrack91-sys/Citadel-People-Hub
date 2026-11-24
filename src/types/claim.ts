export type ClaimStatus =
  | 'INITIATED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'PAID';

export type ClaimAction = 'SUBMIT' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'PAY';

export interface ClaimEvent {
  id: string | number;
  name: string;
  code?: string | null;
  description?: string | null;
  status: 'Active' | 'Inactive';
  is_active?: boolean;
}

export interface ExpenseType {
  id: string | number;
  name: string;
  code?: string | null;
  description?: string | null;
  status: 'Active' | 'Inactive';
  is_active?: boolean;
}

export interface ClaimExpense {
  id: string | number;
  claim_request_id?: string | number;
  expense_type_id: string | number;
  expense_type?: ExpenseType;
  expenseType?: ExpenseType;
  expense_date: string;
  expenseDate?: string;
  amount: number;
  currency?: string;
  note?: string | null;
  receipt_url?: string | null;
}

export interface ClaimRequest {
  id: string | number;
  claim_number: string;
  claimNumber?: string;
  employee_id: string | number;
  employeeId?: string | number;
  employee?: {
    id: string | number;
    name?: string;
    full_name?: string;
    fullName?: string;
    first_name?: string;
    last_name?: string;
    staff_id?: string;
    staffId?: string;
    department_name?: string;
    departmentName?: string;
    job_title?: string;
    jobTitle?: string;
  };
  claim_event_id: string | number;
  claimEventId?: string | number;
  claim_event?: ClaimEvent;
  claimEvent?: ClaimEvent;
  currency: string;
  description?: string | null;
  remarks?: string | null;
  status: ClaimStatus;
  total_amount: number;
  totalAmount?: number;
  submitted_at?: string | null;
  submittedAt?: string | null;
  approved_by?: string | number | null;
  approver?: {
    id: string | number;
    name: string;
    email: string;
  } | null;
  approved_at?: string | null;
  approvedAt?: string | null;
  paid_by?: string | number | null;
  payer?: {
    id: string | number;
    name: string;
    email: string;
  } | null;
  paid_at?: string | null;
  paidAt?: string | null;
  rejection_reason?: string | null;
  rejectionReason?: string | null;
  expenses: ClaimExpense[];
  created_at: string;
  createdAt?: string;
  updated_at?: string;
}

export interface CreateClaimRequestInput {
  employee_id?: string | number;
  employeeId?: string | number;
  claim_event_id?: string | number;
  claimEventId?: string | number;
  currency?: string;
  description?: string;
  remarks?: string;
  status?: 'INITIATED' | 'SUBMITTED';
  expenses?: Array<{
    expense_type_id?: string | number;
    expenseTypeId?: string | number;
    expense_date?: string;
    expenseDate?: string;
    amount: number;
    note?: string;
    receipt_url?: string;
  }>;
}

export interface CreateExpenseItemInput {
  expense_type_id?: string | number;
  expenseTypeId?: string | number;
  expense_date?: string;
  expenseDate?: string;
  amount: number;
  note?: string;
  receipt_url?: string;
}
