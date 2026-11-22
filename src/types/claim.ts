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
  expense_date: string;
  amount: number;
  currency?: string;
  note?: string | null;
  receipt_url?: string | null;
}

export interface ClaimRequest {
  id: string | number;
  claim_number: string;
  employee_id: string | number;
  employee?: {
    id: string | number;
    name?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    staff_id?: string;
    department_name?: string;
    job_title?: string;
  };
  claim_event_id: string | number;
  claim_event?: ClaimEvent;
  currency: string;
  description?: string | null;
  remarks?: string | null;
  status: ClaimStatus;
  total_amount: number;
  submitted_at?: string | null;
  approved_by?: string | number | null;
  approver?: {
    id: string | number;
    name: string;
    email: string;
  } | null;
  approved_at?: string | null;
  paid_by?: string | number | null;
  payer?: {
    id: string | number;
    name: string;
    email: string;
  } | null;
  paid_at?: string | null;
  rejection_reason?: string | null;
  expenses: ClaimExpense[];
  created_at: string;
  updated_at?: string;
}

export interface CreateClaimRequestInput {
  employee_id?: string | number;
  claim_event_id: string | number;
  currency?: string;
  description?: string;
  remarks?: string;
  status?: 'INITIATED' | 'SUBMITTED';
  expenses?: Array<{
    expense_type_id: string | number;
    expense_date: string;
    amount: number;
    note?: string;
    receipt_url?: string;
  }>;
}

export interface CreateExpenseItemInput {
  expense_type_id: string | number;
  expense_date: string;
  amount: number;
  note?: string;
  receipt_url?: string;
}
