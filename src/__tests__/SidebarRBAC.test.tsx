import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar, { NavModule } from '../components/layout/Sidebar';
import { AuthContext } from '../context/AuthContext';
import { User, RolePermissions } from '../types';
import { getRolePermissions } from '../utils/rbac';

describe('Sidebar RBAC & Visual Hierarchy (<Sidebar />)', () => {
  const mockLogout = vi.fn();
  const mockSelectModule = vi.fn();
  const mockOpenAddEmployee = vi.fn();

  const createMockAuthContext = (role: string, department: string = 'Technology & Systems') => {
    const user: User = {
      id: 'mock-user-1',
      staffId: 'CGCC-999',
      name: 'Test Staff',
      email: 'test.staff@citadel.ng',
      role: role as any,
      entityId: 'CGCC',
      entityName: 'Citadel Global Community Church',
      departmentId: 'dept-mock',
      departmentName: department,
      jobTitle: 'Specialist',
      avatarUrl: '',
      permissions: ['test'],
    };

    const permissions: RolePermissions = getRolePermissions(role);

    return {
      currentUser: user,
      currentRole: role as any,
      currentPersona: {
        user,
        badgeLabel: role,
        description: 'Test Persona',
      },
      selectedEntityFilter: 'all',
      setSelectedEntityFilter: vi.fn(),
      switchPersona: vi.fn(),
      backendEnabled: true,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      permissions,
      canViewSensitiveData: permissions.canViewSensitiveData,
      canAccessAuditLogs: permissions.canViewAuditLogs,
      canManageEntities: permissions.canManageEntitiesAndDepts,
      canApproveLeave: permissions.canApproveLeave,
      canManageSettings: permissions.canManageSettings,
      isReadOnly: permissions.isReadOnly,
      updateProfile: vi.fn(),
    };
  };

  const renderSidebarWithRole = (role: string, currentModule: NavModule = 'dashboard') => {
    const authValue = createMockAuthContext(role);
    return render(
      <AuthContext.Provider value={authValue}>
        <Sidebar
          currentModule={currentModule}
          onSelectModule={mockSelectModule}
          isCollapsed={false}
          onToggleCollapse={vi.fn()}
          isOpenMobile={false}
          onCloseMobile={vi.fn()}
          onOpenAddEmployee={mockOpenAddEmployee}
        />
      </AuthContext.Provider>
    );
  };

  // 1. Pure Black Background & Readable Contrast
  describe('1. Sidebar Black Background & Contrast Styling', () => {
    it('renders sidebar with pure black background class (bg-black) and zinc borders', () => {
      renderSidebarWithRole('ADMIN');
      const aside = screen.getByTestId('citadel-sidebar');
      expect(aside).toHaveClass('bg-black');
      expect(aside).toHaveClass('border-zinc-800');
    });

    it('applies high-contrast active styling with orange accent (#FF9900) to current item', () => {
      renderSidebarWithRole('ADMIN', 'dashboard');
      const dashboardBtn = screen.getByTestId('nav-item-dashboard');
      expect(dashboardBtn).toHaveClass('bg-zinc-900');
      expect(dashboardBtn).toHaveClass('text-white');
      expect(dashboardBtn).toHaveClass('border-[#FF9900]');
    });

    it('renders the logout button at the bottom and calls logout when clicked', () => {
      renderSidebarWithRole('ADMIN');
      const logoutBtn = screen.getByTestId('sidebar-logout-btn');
      expect(logoutBtn).toBeInTheDocument();
      fireEvent.click(logoutBtn);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  // 2. ADMIN Role Visibility
  describe('2. ADMIN Role Visibility', () => {
    it('renders all nav items including system-level settings, integrations, and audit trail', () => {
      renderSidebarWithRole('ADMIN');

      // Core Workforce
      expect(screen.getByTestId('nav-item-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-employees')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-attendance')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-leave')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-projects')).toBeInTheDocument();

      // Talent & Governance
      expect(screen.getByTestId('nav-item-recruitment')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-onboarding')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-performance')).toBeInTheDocument();

      // System Administration
      expect(screen.getByTestId('nav-item-settings')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-integrations')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-audit-logs')).toBeInTheDocument();

      // Add Employee Button
      expect(screen.getByTestId('sidebar-add-employee-btn')).toBeInTheDocument();
    });
  });

  // 3. HR STAFF Role Visibility
  describe('3. HR_STAFF Role Visibility', () => {
    it('renders HR records across all departments but hides system-level settings', () => {
      renderSidebarWithRole('HR_STAFF');

      // Allowed HR items
      expect(screen.getByTestId('nav-item-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-employees')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-recruitment')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-onboarding')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-offboarding')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-performance')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-reports')).toBeInTheDocument();

      // Strictly hidden system-level items
      expect(screen.queryByTestId('nav-item-settings')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-integrations')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-audit-logs')).not.toBeInTheDocument();

      // Add Employee CTA visible for HR staff
      expect(screen.getByTestId('sidebar-add-employee-btn')).toBeInTheDocument();
    });
  });

  // 4. EMPLOYEE Role Visibility (Department Scoped)
  describe('4. EMPLOYEE Role Visibility (Self-Service Scoped)', () => {
    it('renders only self-service modules and hides management, recruitment, and settings', () => {
      renderSidebarWithRole('EMPLOYEE');

      // Allowed self-service modules
      expect(screen.getByTestId('nav-item-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-attendance')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-leave')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-projects')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-team-notes')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-directory')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-documents')).toBeInTheDocument();

      // Strictly blocked management & system modules
      expect(screen.queryByTestId('nav-item-employees')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-recruitment')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-onboarding')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-offboarding')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-performance')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-reports')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-settings')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-integrations')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-audit-logs')).not.toBeInTheDocument();

      // Add Employee Button must be hidden for Employee
      expect(screen.queryByTestId('sidebar-add-employee-btn')).not.toBeInTheDocument();
    });
  });

  // 5. VIEWER Role Visibility (Read-Only)
  describe('5. VIEWER Role Visibility (Read-Only)', () => {
    it('renders only read-only modules and hides all administrative and mutation actions', () => {
      renderSidebarWithRole('VIEWER');

      // Allowed read-only modules
      expect(screen.getByTestId('nav-item-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-directory')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-team-notes')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-documents')).toBeInTheDocument();
      expect(screen.getByTestId('nav-item-reports')).toBeInTheDocument();

      // Strictly hidden management modules
      expect(screen.queryByTestId('nav-item-employees')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-recruitment')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-onboarding')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-settings')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-integrations')).not.toBeInTheDocument();
      expect(screen.queryByTestId('nav-item-audit-logs')).not.toBeInTheDocument();

      // Add Employee CTA must NOT be present
      expect(screen.queryByTestId('sidebar-add-employee-btn')).not.toBeInTheDocument();
    });
  });
});
