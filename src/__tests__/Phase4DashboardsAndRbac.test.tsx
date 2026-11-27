import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthContext } from '../context/AuthContext';
import { DashboardView } from '../components/views/DashboardView';
import { ReportsView } from '../components/views/ReportsView';
import {
  filterEmployeesForUser,
  filterAttendanceForUser,
  canAccessModule,
  checkRouteAccess,
  isBusinessHeadUser,
  isDepartmentHeadUser,
  getRolePermissions,
  isManagerUser,
} from '../utils/rbac';
import { INITIAL_EMPLOYEES } from '../data/mockData';
import { AttendanceRecord, User } from '../types';
import { governanceRepository } from '../services/governanceRepository';

function renderWithUser(user: User, ui: React.ReactElement) {
  const permissions = getRolePermissions(user.role);
  const isManager = isManagerUser(user);
  return render(
    <AuthContext.Provider
      value={{
        currentUser: user,
        currentRole: user.role,
        currentPersona: {
          user,
          badgeLabel: user.role,
          description: user.jobTitle,
        },
        selectedEntityFilter: 'all',
        setSelectedEntityFilter: vi.fn(),
        switchPersona: vi.fn(() => true),
        backendEnabled: false,
        isAuthenticated: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        permissions,
        canViewSensitiveData: permissions.canViewSensitiveData,
        canAccessAuditLogs: permissions.canViewAuditLogs,
        canManageEntities: permissions.canManageEntitiesAndDepts,
        canApproveLeave: permissions.canApproveLeave || isManager,
        canManageSettings: permissions.canManageSettings,
        isReadOnly: permissions.isReadOnly,
        isManager,
        refreshUser: vi.fn(),
        updateProfile: vi.fn(),
      }}
    >
      {ui}
    </AuthContext.Provider>
  );
}

const cgccBizHead: User = {
  id: 'emp-0',
  employeeId: 'emp-0',
  staffId: 'CGCC/000',
  name: 'Pastor Tunde Bakare',
  email: 'pastor.bakare@citadel.ng',
  role: 'BUSINESS_HEAD',
  entityId: 'entity-cgcc',
  entityName: 'Citadel Global Community Church (CGCC)',
  departmentId: 'dept-cgcc-so',
  departmentName: "S.O.'s Office / Admin",
  jobTitle: 'President & General Overseer',
  avatarUrl: '',
  isSupervisor: true,
  permissions: ['*'],
};

const csogDeptHead: User = {
  id: 'emp-5',
  employeeId: 'emp-5',
  staffId: 'CSOG/001',
  name: 'Dr. Chidi Nwosu',
  email: 'chidi.nwosu@csog.ng',
  role: 'DEPARTMENT_HEAD',
  entityId: 'entity-csog',
  entityName: 'Citadel School of Government',
  departmentId: 'dept-csog-fac',
  departmentName: 'Faculty & Academic Programs',
  jobTitle: 'Provost & Lead Faculty',
  avatarUrl: '',
  isSupervisor: true,
  permissions: ['manage_team', 'approve_leave'],
};

const techEmployee: User = {
  id: 'emp-4',
  employeeId: 'emp-4',
  staffId: 'CGCC/004',
  name: 'Bayu Wirawan',
  email: 'bayu@citadel.ng',
  role: 'EMPLOYEE',
  entityId: 'entity-cgcc',
  entityName: 'Citadel Global Community Church (CGCC)',
  departmentId: 'dept-cgcc-ict',
  departmentName: 'ICT',
  jobTitle: 'Senior Android Engineer',
  avatarUrl: '',
  permissions: ['self_service'],
};

const ictManager: User = {
  id: 'emp-2',
  employeeId: 'emp-2',
  staffId: 'CGCC/002',
  name: 'Engr. Femi Olatunji',
  email: 'femi.olatunji@citadel.ng',
  role: 'MANAGER',
  entityId: 'entity-cgcc',
  entityName: 'Citadel Global Community Church (CGCC)',
  departmentId: 'dept-cgcc-ict',
  departmentName: 'ICT',
  jobTitle: 'Head of Technology',
  avatarUrl: '',
  isSupervisor: true,
  permissions: ['manage_team', 'approve_leave'],
};

describe('Phase 4: Dashboards, User Roles & Access Control', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('Role Helpers & Entity/Team Data Isolation', () => {
    it('identifies Business Head and Department Head distinctions cleanly', () => {
      expect(isBusinessHeadUser(cgccBizHead)).toBe(true);
      expect(isDepartmentHeadUser(cgccBizHead)).toBe(false);

      expect(isDepartmentHeadUser(csogDeptHead)).toBe(true);
      expect(isBusinessHeadUser(csogDeptHead)).toBe(false);
    });

    it('strictly scopes employees to assigned entity for Business Head', () => {
      const scoped = filterEmployeesForUser(cgccBizHead, INITIAL_EMPLOYEES);
      expect(scoped.length).toBeGreaterThan(0);
      expect(scoped.every((e) => e.entityId === 'entity-cgcc')).toBe(true);
      expect(scoped.some((e) => e.entityId === 'entity-csog')).toBe(false);
      expect(scoped.some((e) => e.entityId === 'entity-holdings')).toBe(false);
    });

    it('strictly scopes attendance logs to self for EMPLOYEE, team for Dept Head, and entity for Business Head', () => {
      const sampleLogs: AttendanceRecord[] = [
        {
          id: 'att-1',
          employeeId: 'emp-4',
          employeeStaffId: 'CGCC/004',
          employeeName: 'Bayu Wirawan',
          entityName: 'Citadel Global Community Church (CGCC)',
          departmentName: 'ICT',
          date: '2026-11-20',
          clockInTime: '08:55',
          status: 'Present',
          verificationSource: 'Biometric_ZKTeco',
        },
        {
          id: 'att-2',
          employeeId: 'emp-3',
          employeeStaffId: 'CGCC/003',
          employeeName: 'Nadia Safitri',
          entityName: 'Citadel Global Community Church (CGCC)',
          departmentName: 'ICT',
          date: '2026-11-20',
          clockInTime: '09:05',
          status: 'Present',
          verificationSource: 'Biometric_ZKTeco',
        },
        {
          id: 'att-3',
          employeeId: 'emp-5',
          employeeStaffId: 'CSOG/001',
          employeeName: 'Dr. Chidi Nwosu',
          entityName: 'Citadel School of Government',
          departmentName: 'Faculty & Academic Programs',
          date: '2026-11-20',
          clockInTime: '09:15',
          status: 'Late',
          verificationSource: 'Biometric_ZKTeco',
        },
      ];

      const empLogs = filterAttendanceForUser(techEmployee, sampleLogs);
      expect(empLogs.map((l) => l.id)).toEqual(['att-1']);

      const mgrLogs = filterAttendanceForUser(ictManager, sampleLogs);
      expect(mgrLogs.map((l) => l.id)).toEqual(['att-1', 'att-2']);

      const deptHeadLogs = filterAttendanceForUser(csogDeptHead, sampleLogs);
      expect(deptHeadLogs.map((l) => l.id)).toEqual(['att-3']);

      const bizHeadLogs = filterAttendanceForUser(cgccBizHead, sampleLogs);
      expect(bizHeadLogs.map((l) => l.id)).toEqual(['att-1', 'att-2']);
    });

    it('grants Business Head & Department Head access to reports and employees while keeping Employee restricted', () => {
      expect(canAccessModule(cgccBizHead, 'reports')).toBe(true);
      expect(canAccessModule(cgccBizHead, 'employees')).toBe(true);
      expect(canAccessModule(csogDeptHead, 'reports')).toBe(true);
      expect(canAccessModule(csogDeptHead, 'employees')).toBe(true);
      expect(canAccessModule(techEmployee, 'reports')).toBe(false);
      expect(checkRouteAccess(techEmployee, 'settings').allowed).toBe(false);
    });
  });

  describe('Role-Based Dashboard Routing & Capabilities', () => {
    it('routes BUSINESS_HEAD persona to BusinessHeadDashboard with entity isolation & HR change proposal', async () => {
      const submitSpy = vi.spyOn(governanceRepository, 'createProfileChangeRequest');

      renderWithUser(
        cgccBizHead,
        <DashboardView
          onNavigate={vi.fn()}
          onOpenLeaveModal={vi.fn()}
          onOpenAddEmployee={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('business-head-departments-grid')).toBeInTheDocument();
      });

      // Entity isolation: CSOG staff should NOT appear on CGCC Business Head dashboard
      expect(screen.queryByTestId('business-head-emp-row-CSOG/001')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('business-head-emp-row-CGCC/004')).toBeInTheDocument();
      });

      // Open permitted change request modal and submit to HR approval queue
      fireEvent.click(screen.getByTestId('propose-change-CGCC/004'));
      const reasonBox = await screen.findByPlaceholderText(/Explain the operational reason/i);
      fireEvent.change(reasonBox, { target: { value: 'Updated official work phone for PCCM lead' } });
      fireEvent.change(screen.getByDisplayValue('+234 803 445 6789'), {
        target: { value: '+234 803 445 9999' },
      });
      fireEvent.click(screen.getByTestId('submit-business-head-change-btn'));

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalledTimes(1);
      });
      const submittedPayload = submitSpy.mock.calls[0][0];
      expect(submittedPayload.status).toBe('PENDING_HR_APPROVAL');
      expect(submittedPayload.proposedChanges.phone).toBe('+234 803 445 9999');
      submitSpy.mockRestore();
    });

    it('routes MANAGER persona to DepartmentHeadDashboard with direct report dossier, attendance monitoring, and team reports', async () => {
      const onNavigate = vi.fn();

      renderWithUser(
        ictManager,
        <DashboardView
          onNavigate={onNavigate}
          onOpenLeaveModal={vi.fn()}
          onOpenAddEmployee={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('manager-team-attendance-card')).toBeInTheDocument();
      });

      expect(screen.getByTestId('manager-team-reports-btn')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('manager-team-reports-btn'));
      expect(onNavigate).toHaveBeenCalledWith('reports');

      // Direct report dossier button opens modal (emp-7 Taiwo Adeyemi CGCC/094 reports to emp-2)
      const dossierBtn = await screen.findByTestId('manager-dossier-btn-CGCC/094');
      fireEvent.click(dossierBtn);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('routes EMPLOYEE persona to EmployeeDashboard with self profile/documents modal, attendance, and onboarding tasks', async () => {
      renderWithUser(
        techEmployee,
        <DashboardView
          onNavigate={vi.fn()}
          onOpenLeaveModal={vi.fn()}
          onOpenAddEmployee={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('employee-open-profile-btn')).toBeInTheDocument();
      });

      expect(screen.getByTestId('employee-attendance-card')).toBeInTheDocument();
      expect(screen.getByTestId('employee-onboarding-card')).toBeInTheDocument();

      // Clicking "My Profile & Documents" opens EmployeeProfileModal for Bayu Wirawan (not CH/001)
      fireEvent.click(screen.getByTestId('employee-open-profile-btn'));
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /Bayu Wirawan/i })).toBeInTheDocument();
      });
      expect(screen.getByTestId('request-self-service-update-btn')).toBeInTheDocument();
    });

    it('allows BUSINESS_HEAD and MANAGER to access scoped ReportsView while blocking EMPLOYEE', async () => {
      const { unmount } = renderWithUser(cgccBizHead, <ReportsView />);

      await waitFor(() => {
        expect(
          screen.getByText(/Citadel Global Community Church \(CGCC\) HR Reports/i)
        ).toBeInTheDocument();
      });
      expect(screen.queryByText(/Forbidden/i)).not.toBeInTheDocument();
      unmount();

      renderWithUser(techEmployee, <ReportsView />);

      await waitFor(() => {
        expect(screen.getByText(/Forbidden/i)).toBeInTheDocument();
      });
    });
  });
});
