import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardView } from '../components/views/DashboardView';
import { AuthProvider } from '../context/AuthContext';

describe('DashboardView Component (Hrivio Reference Visuals)', () => {
  it('renders greeting header and 3 core summary stat cards', async () => {
    render(
      <AuthProvider>
        <DashboardView
          onNavigate={vi.fn()}
          onOpenLeaveModal={vi.fn()}
          onOpenAddEmployee={vi.fn()}
        />
      </AuthProvider>
    );

    // Wait for greeting to show up
    await waitFor(() => {
      expect(screen.getByText(/Good Morning|Good Afternoon|Good Evening/)).toBeInTheDocument();
    });

    expect(screen.getByText('Total employees')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.getByText('Active Staff')).toBeInTheDocument();
  });

  it('renders Leave Balance card with progress gauge and status pills', async () => {
    render(
      <AuthProvider>
        <DashboardView
          onNavigate={vi.fn()}
          onOpenLeaveModal={vi.fn()}
          onOpenAddEmployee={vi.fn()}
        />
      </AuthProvider>
    );

    expect(screen.getByTestId('leave-balance-card')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('13 out of 20')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('renders Active Projects cards with High/Medium priority tags and team avatars', async () => {
    render(
      <AuthProvider>
        <DashboardView
          onNavigate={vi.fn()}
          onOpenLeaveModal={vi.fn()}
          onOpenAddEmployee={vi.fn()}
        />
      </AuthProvider>
    );

    expect(screen.getByText('Rest API Endpoint')).toBeInTheDocument();
    expect(screen.getByText('UI System Planning')).toBeInTheDocument();
    expect(screen.getByText('Visual Style Guide')).toBeInTheDocument();
  });

  it('opens Quick Actions modal when Quick Actions button is clicked', async () => {
    render(
      <AuthProvider>
        <DashboardView
          onNavigate={vi.fn()}
          onOpenLeaveModal={vi.fn()}
          onOpenAddEmployee={vi.fn()}
        />
      </AuthProvider>
    );

    const quickActionsBtn = screen.getByTestId('quick-actions-btn');
    fireEvent.click(quickActionsBtn);

    expect(screen.getByTestId('quick-actions-modal')).toBeInTheDocument();
    expect(screen.getByText('Citadel People Hub — Quick Actions')).toBeInTheDocument();
  });
});
