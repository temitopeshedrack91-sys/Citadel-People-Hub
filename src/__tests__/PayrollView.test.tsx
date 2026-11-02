import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PayrollView } from '../components/views/PayrollView';
import { Sidebar } from '../components/layout/Sidebar';
import { AuthProvider } from '../context/AuthContext';
import { payrollRepository } from '../services';

// The UI workflow tests use the repository's local test fixtures. The direct
// Laravel repository contract is covered by the integration tests below.
vi.mock('../services/laravelClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/laravelClient')>();
  return { ...actual, isLaravelApiConfigured: () => false };
});

describe('Payroll Domain & Sidebar Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Payroll in the Sidebar under the MENU section', () => {
    const handleSelectModule = vi.fn();
    render(
      <AuthProvider>
        <Sidebar
          currentModule="dashboard"
          onSelectModule={handleSelectModule}
          isOpenMobile={false}
          onCloseMobile={vi.fn()}
        />
      </AuthProvider>
    );

    // Look for Payroll button in the navigation
    const payrollBtn = screen.getByRole('button', { name: /payroll/i });
    expect(payrollBtn).toBeDefined();

    fireEvent.click(payrollBtn);
    expect(handleSelectModule).toHaveBeenCalledWith('payroll');
  });

  it('renders PayrollView with overview stats, pay runs table, and tabs', async () => {
    render(
      <AuthProvider>
        <PayrollView />
      </AuthProvider>
    );

    // Header title
    expect(screen.getByText('Payroll & Compensation Management')).toBeDefined();

    // Summary cards
    expect(screen.getByText('YTD Payroll Volume')).toBeDefined();
    expect(screen.getByText('Latest Net Payout')).toBeDefined();
    expect(screen.getByText('Structure Coverage')).toBeDefined();
    expect(screen.getByText('Revolving Loans')).toBeDefined();

    // Tabs
    expect(screen.getByRole('button', { name: /pay runs & cycles/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /salary structures/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /staff assignments/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /loans & advances/i })).toBeDefined();

    // Pay run PR-2026-10 should be visible (in KPI summary card and table row)
    await waitFor(
      () => {
        const runTags = screen.getAllByText('PR-2026-10');
        expect(runTags.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 4000 }
    );
  });

  it('opens Pay Run Generation Wizard with Chevron Stepper and steps through', async () => {
    const generateSpy = vi.spyOn(payrollRepository, 'generatePayrollRun');

    render(
      <AuthProvider>
        <PayrollView />
      </AuthProvider>
    );

    // Click "Generate Pay Run" in header
    const generateBtn = screen.getByRole('button', { name: /generate pay run/i });
    fireEvent.click(generateBtn);

    // Modal opens with ChevronStepper
    expect(screen.getByText('Generate Pay Run Cycle')).toBeDefined();
    expect(screen.getByText('Select Period')).toBeDefined();
    expect(screen.getByText('Details')).toBeDefined();
    expect(screen.getByText('Verify')).toBeDefined();
    expect(screen.getByText('Review')).toBeDefined();
    expect(screen.getByText('Approval')).toBeDefined();

    // Advance to Step 2
    const nextBtn1 = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextBtn1);
    expect(screen.getByText('Active Staff Eligibility Check')).toBeDefined();

    // Advance to Step 3
    const nextBtn2 = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextBtn2);
    expect(screen.getByText('Estimated Baseline Basic Pay')).toBeDefined();

    // Advance to Step 4 (Review)
    const nextBtn3 = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextBtn3);
    expect(screen.getByText('Review Adjustments & Penalties')).toBeDefined();

    // Advance to Step 5 (Approval)
    const nextBtn4 = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextBtn4);
    expect(screen.getByText('Ready to Generate Draft Pay Run')).toBeDefined();

    // Finish & Generate
    const confirmBtn = screen.getByRole('button', { name: /generate pay run draft/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(generateSpy).toHaveBeenCalled();
    }, { timeout: 4000 });
  });

  it('allows switching to Salary Structures and Loans tabs', async () => {
    render(
      <AuthProvider>
        <PayrollView />
      </AuthProvider>
    );

    // Switch to Salary Structures tab
    const structuresTab = screen.getByRole('button', { name: /salary structures/i });
    fireEvent.click(structuresTab);

    await waitFor(() => {
      expect(screen.getByText('Executive & Pastoral Director Structure (Grade 1)')).toBeDefined();
    }, { timeout: 4000 });

    // Switch to Loans & Advances tab
    const loansTab = screen.getByRole('button', { name: /loans & advances/i });
    fireEvent.click(loansTab);

    await waitFor(() => {
      expect(screen.getByText('LN-2026-004')).toBeDefined();
      expect(screen.getByText('Home Appliance & Device Advance')).toBeDefined();
    }, { timeout: 4000 });
  });

  it('allows inspecting payslip and viewing earnings breakdown', async () => {
    render(
      <AuthProvider>
        <PayrollView />
      </AuthProvider>
    );

    // Switch to Payslips tab
    const payslipsTab = screen.getByRole('button', { name: /payslips & history/i });
    fireEvent.click(payslipsTab);

    await waitFor(() => {
      const inspectButtons = screen.getAllByRole('button', { name: /inspect slip/i });
      expect(inspectButtons.length).toBeGreaterThan(0);
      fireEvent.click(inspectButtons[0]);
    }, { timeout: 4000 });

    // Modal should show payslip breakdown
    await waitFor(() => {
      expect(screen.getByText('Citadel People Hub · Official Pay Slip')).toBeDefined();
      expect(screen.getByText('Gross Earnings')).toBeDefined();
      expect(screen.getByText('Statutory & Loan Deductions')).toBeDefined();
      expect(screen.getByText('Net Disbursable Take-Home')).toBeDefined();
    }, { timeout: 4000 });
  });

  describe('LaravelPayrollRepository API Integration', () => {
    it('calls /payroll/templates when fetching salary templates', async () => {
      const { LaravelPayrollRepository } = await import('../services/laravelAdapter');
      const repo = new LaravelPayrollRepository();

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 'st-live-1',
              name: 'Senior Leadership Structure',
              basic_salary: 750000,
              allowances: [],
              deductions: [],
              is_active: true,
            },
          ],
        }),
      } as any);

      const templates = await repo.getSalaryTemplates();
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/payroll/templates'),
        expect.any(Object)
      );
      expect(templates[0].name).toBe('Senior Leadership Structure');
      fetchSpy.mockRestore();
    });

    it('calls POST /payroll/runs when generating a pay run', async () => {
      const { LaravelPayrollRepository } = await import('../services/laravelAdapter');
      const repo = new LaravelPayrollRepository();

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: 'run-999',
            run_number: 'PR-2026-99',
            title: 'Live Backend Run',
            period_start: '2026-11-01',
            period_end: '2026-11-30',
            status: 'draft',
            total_gross: 5000000,
            total_net: 4200000,
          },
        }),
      } as any);

      const run = await repo.generatePayrollRun({
        title: 'Live Backend Run',
        period_start: '2026-11-01',
        period_end: '2026-11-30',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/payroll/runs'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(run.run_number).toBe('PR-2026-99');
      fetchSpy.mockRestore();
    });

    it('calls POST /payroll/runs/:id/finalize when finalizing a pay run', async () => {
      const { LaravelPayrollRepository } = await import('../services/laravelAdapter');
      const repo = new LaravelPayrollRepository();

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: 'run-999',
            run_number: 'PR-2026-99',
            status: 'approved',
          },
        }),
      } as any);

      const run = await repo.finalizePayrollRun('run-999');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/payroll/runs/run-999/finalize'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(run.status).toBe('approved');
      fetchSpy.mockRestore();
    });

    it('calls PATCH /payroll/loans/:id/approve when approving a loan', async () => {
      const { LaravelPayrollRepository } = await import('../services/laravelAdapter');
      const repo = new LaravelPayrollRepository();

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: 'loan-55',
            loan_number: 'LN-2026-55',
            status: 'active',
          },
        }),
      } as any);

      const loan = await repo.approveLoan('loan-55');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/payroll/loans/loan-55/approve'),
        expect.objectContaining({ method: 'PATCH' })
      );
      expect(loan.status).toBe('active');
      fetchSpy.mockRestore();
    });
  });
});
