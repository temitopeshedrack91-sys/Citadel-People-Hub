import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockLeaveRepository } from '../services/mockRepository';
import { WorkbookHubView } from '../components/views/WorkbookHubView';
import { LeaveManagementView } from '../components/views/LeaveManagementView';
import { AuthContext } from '../context/AuthContext';
import { User, RolePermissions } from '../types';
import { getRolePermissions } from '../utils/rbac';

function makeAuthContext(role: string, overrides?: Partial<User>) {
  const user: User = {
    id: overrides?.id || 'emp-3',
    employeeId: overrides?.employeeId || overrides?.id || 'emp-3',
    staffId: overrides?.staffId || 'CGCC-004',
    name: overrides?.name || 'Tunde Bakare',
    email: overrides?.email || 'tunde.bakare@citadel.ng',
    role: role as User['role'],
    entityId: overrides?.entityId || 'CGCC',
    entityName: overrides?.entityName || 'Citadel Global Community Church',
    departmentId: overrides?.departmentId || 'dept-media',
    departmentName: overrides?.departmentName || 'Media & ICT',
    jobTitle: overrides?.jobTitle || 'Media & ICT Engineer',
    avatarUrl: '',
    permissions: ['all'],
    ...overrides,
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
    backendEnabled: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    permissions,
    canViewSensitiveData: permissions.canViewSensitiveData,
    canAccessAuditLogs: permissions.canViewAuditLogs,
    canManageEntities: permissions.canManageEntitiesAndDepts,
    canApproveLeave: permissions.canApproveLeave,
    canManageSettings: permissions.canManageSettings,
    isReadOnly: permissions.isReadOnly,
    isManager: role === 'MANAGER' || role === 'DEPARTMENT_HEAD' || role === 'BUSINESS_HEAD',
    refreshUser: vi.fn(),
    updateProfile: vi.fn(),
  };
}

describe('Citadel Requirements Workbook Integration Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('Sheet 7: Leave Management Policies & Direct-HR Routing', () => {
    it('provisions exact workbook leave entitlements (21/10/90/14/21/5 days)', async () => {
      const repo = new MockLeaveRepository();
      const categories = await repo.getCategories();

      const byName = Object.fromEntries(
        categories.map((c) => [c.name, c.policies?.[0]?.days_allowed])
      );
      expect(byName['Annual Leave']).toBe(21);
      expect(byName['Sick Leave']).toBe(10);
      expect(byName['Maternity Leave']).toBe(90);
      expect(byName['Paternity Leave']).toBe(14);
      expect(byName['Exam Leave']).toBe(21);
      expect(byName['Compassionate Leave']).toBe(5);
    });

    it('routes Exam Leave and Compassionate Leave directly to Stage 2 HR approval, while Annual Leave routes to Stage 1 Manager', async () => {
      const repo = new MockLeaveRepository();

      const examReq = await repo.submitRequest({
        employeeId: 'emp-3',
        employeeStaffId: 'CGCC-004',
        employeeName: 'Tunde Bakare',
        departmentName: 'Media & ICT',
        entityName: 'Citadel Global Community Church',
        leaveType: 'Exam Leave',
        startDate: '2026-11-10',
        endDate: '2026-11-14',
        totalDays: 5,
        reason: 'Professional certification exam',
      });
      expect(examReq.approvalStage).toBe('HR');
      expect(examReq.status).toBe('Pending Review');

      const compassionateReq = await repo.submitRequest({
        employeeId: 'emp-3',
        employeeStaffId: 'CGCC-004',
        employeeName: 'Tunde Bakare',
        departmentName: 'Media & ICT',
        entityName: 'Citadel Global Community Church',
        leaveType: 'Compassionate Leave',
        startDate: '2026-12-01',
        endDate: '2026-12-03',
        totalDays: 3,
        reason: 'Family bereavement',
      });
      expect(compassionateReq.approvalStage).toBe('HR');

      const annualReq = await repo.submitRequest({
        employeeId: 'emp-3',
        employeeStaffId: 'CGCC-004',
        employeeName: 'Tunde Bakare',
        departmentName: 'Media & ICT',
        entityName: 'Citadel Global Community Church',
        managerId: 'emp-0',
        managerName: 'Pastor Christian Ike',
        leaveType: 'Annual Leave',
        startDate: '2026-12-15',
        endDate: '2026-12-18',
        totalDays: 4,
        reason: 'Planned annual rest',
      });
      expect(annualReq.approvalStage).toBe('MANAGER');
    });

    it('switches LeaveManagementView modal to Direct HR route for Exam Leave and enforces supporting attachment', async () => {
      const authValue = makeAuthContext('EMPLOYEE', { id: 'emp-3', employeeId: 'emp-3' });
      render(
        <AuthContext.Provider value={authValue}>
          <LeaveManagementView isApplyModalOpen={true} onCloseApplyModal={vi.fn()} />
        </AuthContext.Provider>
      );

      // Default Annual Leave shows 21-day Sheet 7 entitlement
      await waitFor(() => {
        expect(screen.getByTestId('leave-policy-summary')).toHaveTextContent(/21 days/i);
      });

      // Switch to Exam Leave
      const leaveTypeSelect = screen.getByTestId('leave-type-select');
      fireEvent.change(leaveTypeSelect, { target: { value: 'Exam Leave' } });

      // Direct HR route banner appears and Manager selector is hidden
      await waitFor(() => {
        expect(screen.getByText(/Direct HR Approval Route \(Sheet 7\)/i)).toBeInTheDocument();
        expect(screen.queryByTestId('leave-manager-select')).not.toBeInTheDocument();
      });

      // Set valid future dates & reason, omit attachment -> submit should surface attachment error
      fireEvent.change(screen.getByTestId('leave-start-date'), { target: { value: '2027-06-01' } });
      fireEvent.change(screen.getByTestId('leave-end-date'), { target: { value: '2027-06-03' } });
      fireEvent.change(screen.getByTestId('leave-reason-input'), { target: { value: 'ICAN Final Exam sitting' } });

      fireEvent.click(screen.getByTestId('leave-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('leave-submit-error')).toHaveTextContent(/School Note \/ Exam Timetable/i);
      });
    });
  });

  describe('Governance Hub (<WorkbookHubView />): Sheets 1-24 Interactive Controls', () => {
    it('allows an employee to submit a Profile Change Request and blocks forbidden credentials (Sheet 1 Rule 4)', async () => {
      const authValue = makeAuthContext('EMPLOYEE', { id: 'emp-3', employeeId: 'emp-3' });
      render(
        <AuthContext.Provider value={authValue}>
          <WorkbookHubView />
        </AuthContext.Provider>
      );

      // Wait for async employee repository load (Profile Score appears once selfEmployee is resolved)
      await waitFor(() => {
        expect(screen.getByText(/Profile Score/i)).toBeInTheDocument();
      });

      const proposedInput = screen.getByTestId('profile-change-value-input');
      const reasonInput = screen.getByTestId('profile-change-reason-input');
      const submitBtn = screen.getByTestId('profile-change-submit-btn');

      // Attempt forbidden credential payload -> blocked by Rule 4
      fireEvent.change(proposedInput, { target: { value: 'bank_pin: 4321' } });
      fireEvent.change(reasonInput, { target: { value: 'Testing security guard' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('workbook-hub-banner')).toHaveTextContent(/Rule 4|PIN|password|credential/i);
      });

      // Valid phone update -> staged for HR approval
      fireEvent.change(proposedInput, { target: { value: '+234 809 555 0199' } });
      fireEvent.change(reasonInput, { target: { value: 'Updated personal mobile line' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('pending-change-count')).toHaveTextContent('1 Request');
        expect(screen.getByText(/\+234 809 555 0199/)).toBeInTheDocument();
      });
    });

    it('maps ADMIN to Super Admin / HR and renders Org Structure, 10-Stage Recruitment, Migration Validator, and Ambiguities Register tabs', async () => {
      const authValue = makeAuthContext('ADMIN', {
        id: 'emp-admin',
        employeeId: 'emp-admin',
        name: 'Dr. Bukola Adeleke',
      });
      render(
        <AuthContext.Provider value={authValue}>
          <WorkbookHubView />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Super Admin \/ HR/i).length).toBeGreaterThan(0);
      });

      // Tab 2: Org Structure & Role Governance
      fireEvent.click(screen.getByTestId('gov-tab-org'));
      await waitFor(() => {
        expect(screen.getAllByText(/Pastor Christian Ike/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Mr\. Omoaholo Omoakhalen/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Ms\. Olufisayo Bakare/i).length).toBeGreaterThan(0);
      });

      // Tab 3: 10-Stage Recruitment & Interviews
      fireEvent.click(screen.getByTestId('gov-tab-recruitment'));
      await waitFor(() => {
        expect(screen.getAllByText(/Vacancy Identified/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Reference.*Background Checks/i).length).toBeGreaterThan(0);
      });

      // Tab 4: Migration, Docs & Reports
      fireEvent.click(screen.getByTestId('gov-tab-migration'));
      await waitFor(() => {
        expect(screen.getByText(/Legacy Bio-Data CSV Migration Validator/i)).toBeInTheDocument();
        expect(screen.getByTestId('migration-summary')).toHaveTextContent(/Valid Rows/i);
        expect(screen.getByTestId('workbook-export-csv-btn')).toBeInTheDocument();
      });

      // Tab 5: V1 Readiness & Workbook Audit
      fireEvent.click(screen.getByTestId('gov-tab-readiness'));
      await waitFor(() => {
        expect(
          screen.getByText(/Workbook Ambiguities, Contradictions & Blank-Sheet Decisions/i)
        ).toBeInTheDocument();
        expect(screen.getAllByText(/Needs HR Decision/i).length).toBeGreaterThan(0);
      });
    });
  });
});
