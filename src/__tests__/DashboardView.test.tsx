import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardView } from '../components/views/DashboardView';
import { AuthProvider } from '../context/AuthContext';

describe('DashboardView Component', () => {
  it('renders greeting header and live KPI strip without placeholder mock figures', async () => {
    render(
      <AuthProvider>
        <DashboardView
          onNavigate={vi.fn()}
          onOpenLeaveModal={vi.fn()}
          onOpenAddEmployee={vi.fn()}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Good Morning|Good Afternoon|Good Evening/)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
    });

    expect(screen.getByText('Stage 2 HR Approvals')).toBeInTheDocument();
    expect(screen.getByText('Today Attendance')).toBeInTheDocument();
    expect(screen.getByText('On Leave Today')).toBeInTheDocument();
    expect(screen.queryByText('Mia Anderson')).not.toBeInTheDocument();
    expect(screen.queryByText('Rest API Endpoint')).not.toBeInTheDocument();
  });

  it('renders live personal leave quota card and leave requests panel', async () => {
    render(
      <AuthProvider>
        <DashboardView
          onNavigate={vi.fn()}
          onOpenLeaveModal={vi.fn()}
          onOpenAddEmployee={vi.fn()}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('leave-balance-card')).toBeInTheDocument();
    });
    expect(screen.getByText('Personal Leave Balance')).toBeInTheDocument();
  });

  it('routes Open Projects button to the projects module', async () => {
    const onNavigate = vi.fn();
    render(
      <AuthProvider>
        <DashboardView
          onNavigate={onNavigate}
          onOpenLeaveModal={vi.fn()}
          onOpenAddEmployee={vi.fn()}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('projects-view-all')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('projects-view-all'));
    expect(onNavigate).toHaveBeenCalledWith('projects');
  });

  it('opens and closes Quick Actions modal via Escape', async () => {
    render(
      <AuthProvider>
        <DashboardView
          onNavigate={vi.fn()}
          onOpenLeaveModal={vi.fn()}
          onOpenAddEmployee={vi.fn()}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('quick-actions-btn')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('quick-actions-btn'));

    const modal = screen.getByTestId('quick-actions-modal');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText('Citadel People Hub — Quick Actions')).toBeInTheDocument();

    fireEvent.keyDown(modal, { key: 'Escape' });
    expect(screen.queryByTestId('quick-actions-modal')).not.toBeInTheDocument();
  });
});
