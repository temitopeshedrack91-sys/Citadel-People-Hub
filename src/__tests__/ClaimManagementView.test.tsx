import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClaimManagementView } from '../components/views/ClaimManagementView';
import { claimRepository, employeeRepository } from '../services';

const mockClaims = [
  {
    id: 1,
    claim_number: 'CLM-2026-0001',
    claimNumber: 'CLM-2026-0001',
    employee_id: 10,
    employeeId: 10,
    employee: { id: 10, name: 'Grace Hopper', fullName: 'Grace Hopper', staff_id: 'CGCC-0010', staffId: 'CGCC-0010', department_name: 'ICT' },
    claim_event_id: 1,
    claimEventId: 1,
    claim_event: { id: 1, name: 'Abuja Annual Church Summit' },
    claimEvent: { id: 1, name: 'Abuja Annual Church Summit' },
    currency: 'NGN',
    status: 'SUBMITTED',
    total_amount: 75000,
    totalAmount: 75000,
    description: 'Travel and logistics for annual summit',
    remarks: 'Receipts included',
    created_at: '2026-11-20T10:00:00Z',
    expenses: [
      {
        id: 1,
        claim_request_id: 1,
        expense_type_id: 1,
        expenseTypeId: 1,
        expense_type: { id: 1, name: 'Flight / Interstate Transport' },
        expenseType: { id: 1, name: 'Flight / Interstate Transport' },
        expense_date: '2026-11-20',
        amount: 75000,
        currency: 'NGN',
      },
    ],
  },
  {
    id: 2,
    claim_number: 'CLM-2026-0002',
    claimNumber: 'CLM-2026-0002',
    employee_id: 12,
    employeeId: 12,
    employee: { id: 12, name: 'David Adeleke', fullName: 'David Adeleke', staff_id: 'CGCC-0012', staffId: 'CGCC-0012', department_name: 'Pastoral' },
    claim_event_id: 2,
    claimEventId: 2,
    claim_event: { id: 2, name: 'Leadership Retreat' },
    claimEvent: { id: 2, name: 'Leadership Retreat' },
    currency: 'NGN',
    status: 'APPROVED',
    total_amount: 25000,
    totalAmount: 25000,
    description: 'Hotel accommodation',
    created_at: '2026-11-21T12:00:00Z',
    expenses: [],
  },
];

const mockEvents = [
  { id: 1, name: 'Abuja Annual Church Summit', code: 'CONF-ABJ', isActive: true },
  { id: 2, name: 'Leadership Retreat', code: 'CONF-RET', isActive: true },
];

const mockExpenseTypes = [
  { id: 1, name: 'Flight / Interstate Transport', code: 'EXP-TRV', isActive: true },
  { id: 2, name: 'Hotel Accommodation', code: 'EXP-HOTEL', isActive: true },
];

vi.mock('../services', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    claimRepository: {
      getClaims: vi.fn().mockImplementation(() => Promise.resolve(mockClaims)),
      getClaimEvents: vi.fn().mockImplementation(() => Promise.resolve(mockEvents)),
      getExpenseTypes: vi.fn().mockImplementation(() => Promise.resolve(mockExpenseTypes)),
      createClaim: vi.fn().mockImplementation((payload) =>
        Promise.resolve({
          ...payload,
          id: 3,
          claim_number: 'CLM-2026-0003',
          claimNumber: 'CLM-2026-0003',
          total_amount: 12000,
          totalAmount: 12000,
          status: 'SUBMITTED',
          expenses: [],
        })
      ),
      performAction: vi.fn().mockImplementation((id, action, reason) =>
        Promise.resolve({
          id,
          claim_number: 'CLM-2026-0001',
          claimNumber: 'CLM-2026-0001',
          status: action === 'APPROVE' ? 'APPROVED' : action === 'PAY' ? 'PAID' : 'REJECTED',
          rejectionReason: reason,
        })
      ),
      createClaimEvent: vi.fn().mockResolvedValue({ id: 10, name: 'New Event' }),
      createExpenseType: vi.fn().mockResolvedValue({ id: 20, name: 'New Type' }),
      addExpense: vi.fn().mockResolvedValue({}),
      deleteExpense: vi.fn().mockResolvedValue({}),
    },
    employeeRepository: {
      ...actual.employeeRepository,
      getAll: vi.fn().mockResolvedValue([
        { id: 10, fullName: 'Grace Hopper', staffId: 'CGCC-0010' },
        { id: 12, fullName: 'David Adeleke', staffId: 'CGCC-0012' },
      ]),
      getEmployees: vi.fn().mockResolvedValue([
        { id: 10, fullName: 'Grace Hopper', staffId: 'CGCC-0010' },
        { id: 12, fullName: 'David Adeleke', staffId: 'CGCC-0012' },
      ]),
    },
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 1, email: 'admin@citadel.ng', name: 'System Admin', staffId: 'CGCC-0001', role: 'ADMIN' },
    currentRole: 'ADMIN',
  }),
}));

describe('ClaimManagementView Component (OrangeHRM Parity)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Claims & Expenses header, metrics cards, and claim rows', async () => {
    render(<ClaimManagementView />);

    await waitFor(() => {
      expect(screen.getByText('Claims & Expense Reimbursements')).toBeInTheDocument();
    });

    // Check KPI Stat cards
    expect(screen.getByText('Total Claims YTD')).toBeInTheDocument();
    expect(screen.getAllByText('Pending Review').length).toBeGreaterThan(0);
    expect(screen.getByText('Approved for Pay')).toBeInTheDocument();
    expect(screen.getAllByText('Settled / Paid').length).toBeGreaterThan(0);

    // Check Claims table items
    expect(screen.getByText('CLM-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('CLM-2026-0002')).toBeInTheDocument();
    expect(screen.getByText(/Grace Hopper/)).toBeInTheDocument();
    expect(screen.getByText(/David Adeleke/)).toBeInTheDocument();
  });

  it('filters claims when changing status tabs', async () => {
    render(<ClaimManagementView />);

    await waitFor(() => {
      expect(screen.getByText('CLM-2026-0001')).toBeInTheDocument();
    });

    // Switch to "Pending Review" tab
    const pendingTab = screen.getByRole('button', { name: /Pending Review/i });
    fireEvent.click(pendingTab);

    // Only SUBMITTED claim should be visible
    expect(screen.getByText('CLM-2026-0001')).toBeInTheDocument();
    expect(screen.queryByText('CLM-2026-0002')).not.toBeInTheDocument();

    // Switch to "Approved & Unsettled" tab
    const approvedTab = screen.getByRole('button', { name: /Approved & Unsettled/i });
    fireEvent.click(approvedTab);

    // Only APPROVED claim should be visible
    expect(screen.queryByText('CLM-2026-0001')).not.toBeInTheDocument();
    expect(screen.getByText('CLM-2026-0002')).toBeInTheDocument();
  });

  it('opens Submit Claim Modal when clicking "Submit Claim"', async () => {
    render(<ClaimManagementView />);

    await waitFor(() => {
      expect(screen.getByText('Claims & Expense Reimbursements')).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Submit Claim/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Submit Expense Claim Request')).toBeInTheDocument();
    expect(screen.getAllByText(/Claim Event \/ Purpose/i).length).toBeGreaterThan(1);
    expect(screen.getByText(/Calculated Total Claim/i)).toBeInTheDocument();
  });

  it('opens detail drawer and handles approval action', async () => {
    render(<ClaimManagementView />);

    await waitFor(() => {
      expect(screen.getByText('CLM-2026-0001')).toBeInTheDocument();
    });

    // Click on row for CLM-2026-0001
    const row = screen.getByText('CLM-2026-0001');
    fireEvent.click(row);

    // Drawer should open showing details
    await waitFor(() => {
      expect(screen.getByText('Claim File')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Abuja Annual Church Summit').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Flight / Interstate Transport')).toBeInTheDocument();

    // Admin should see Approve Claim button
    const approveBtn = screen.getByRole('button', { name: /Approve Claim/i });
    expect(approveBtn).toBeInTheDocument();

    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(claimRepository.performAction).toHaveBeenCalledWith(1, 'APPROVE', undefined);
    });
  });
});
