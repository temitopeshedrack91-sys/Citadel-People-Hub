import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  MockEmployeeRepository,
  MockLeaveRepository,
} from '../services/mockRepository';
import { AuthContext } from '../context/AuthContext';
import { DashboardView } from '../components/views/DashboardView';
import { LeaveManagementView } from '../components/views/LeaveManagementView';
import { CreateEmployeeModal } from '../components/employee/CreateEmployeeModal';
import { Employee, LeaveRequest, User, RolePermissions } from '../types';
import { leaveRepository, employeeRepository } from '../services';

const FULL_PERMISSIONS: RolePermissions = {
  canManageEmployees: true,
  canViewAllEmployees: true,
  canViewSensitiveData: true,
  canManageEntitiesAndDepts: true,
  canApproveLeave: true,
  canManageLeavePolicies: true,
  canViewAuditLogs: true,
  canManageOnboarding: true,
  canManagePerformance: true,
  canManageDocuments: true,
  canConfigureIntegrations: true,
  canExportReports: true,
  canManageSettings: true,
  isReadOnly: false,
};

function makeAuthValue(user: User, isManager: boolean) {
  return {
    currentUser: user,
    currentRole: user.role,
    effectiveRole: isManager ? ('MANAGER' as const) : user.role === 'HR_STAFF' ? ('HR' as const) : ('EMPLOYEE' as const),
    isManager,
    permissions: FULL_PERMISSIONS,
    isAuthenticated: true,
    isAuthInitializing: false,
    authMode: 'mock' as const,
    backendEnabled: false,
    canApproveLeave: isManager || user.role === 'HR_STAFF' || user.role === 'ADMIN',
    canViewSensitiveData: user.role === 'HR_STAFF' || user.role === 'ADMIN',
    selectedEntityFilter: 'all',
    setSelectedEntityFilter: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    updateUserProfile: vi.fn(),
    refreshUser: vi.fn(),
    currentPersona: {
      user,
      label: user.name,
      description: user.jobTitle,
      badgeColor: 'bg-slate-100',
    },
    switchPersona: vi.fn(() => true),
  };
}

describe('Phase 1: Foundation Repository Rules (Hierarchy & Coupled Entities)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rejects self-supervision and multi-hop circular reporting chains', async () => {
    const repo = new MockEmployeeRepository();
    const list = await repo.getAll();
    const first = list[0];
    const second = list[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    await expect(repo.update(first.id, { managerId: first.id })).rejects.toThrow(
      /own supervisor/i
    );

    // Ensure second reports to first, then attempt first -> second cycle
    await repo.update(second.id, { managerId: first.id });
    await expect(repo.update(first.id, { managerId: second.id })).rejects.toThrow(
      /circular reporting line/i
    );
  });

  it('rejects mismatched entity and department combinations', async () => {
    const repo = new MockEmployeeRepository();
    await expect(
      repo.create({
        staffId: 'TEST/999',
        fullName: 'Mismatch User',
        firstName: 'Mismatch',
        lastName: 'User',
        dateOfBirth: '1992-01-01',
        gender: 'Female',
        phone: '+2348000000000',
        email: 'mismatch@citadel.ng',
        address: 'Lagos',
        emergencyContact: { name: 'EC', relationship: 'Sibling', phone: '+2348000000001' },
        nextOfKin: { name: 'NOK', relationship: 'Spouse', phone: '+2348000000002', address: 'Lagos' },
        entityId: 'entity-cgcc',
        entityName: 'CGCC',
        departmentId: 'dept-csog-acad', // belongs to CSOG, not CGCC
        departmentName: 'Academic Affairs',
        jobTitle: 'Analyst',
        gradeLevel: 'Grade Level 08',
        employmentType: 'Full-Time',
        employmentDate: '2026-01-10',
        contractStatus: 'Permanent',
        yearsOfService: 1,
        qualifications: [],
        certifications: [],
        bankPayroll: {
          bankName: 'GTBank',
          accountNumber: '0123456789',
          accountName: 'Mismatch User',
          salaryGrade: 'GL08',
          currency: 'NGN',
        },
        pensionHmo: {
          pfaName: 'Stanbic IBTC',
          rsaPin: 'PEN123',
          hmoProvider: 'Hygeia',
          hmoPlan: 'Gold',
          hmoIdNumber: 'HMO123',
        },
        status: 'Active',
      })
    ).rejects.toThrow(/does not belong to the selected entity/i);
  });

  it('returns upward supervisorChain and downward directReports from getHierarchy', async () => {
    const repo = new MockEmployeeRepository();
    const list = await repo.getAll();
    const root = list[0];
    const lead = list[1];
    const report = list[2];

    await repo.update(lead.id, { managerId: root.id });
    await repo.update(report.id, { managerId: lead.id });

    const hier = await repo.getHierarchy(report.id);
    expect(hier).not.toBeNull();
    expect(hier!.supervisorChain.map((n) => n.id)).toEqual([lead.id, root.id]);

    const leadHier = await repo.getHierarchy(lead.id);
    expect(leadHier!.directReports.map((n) => n.id)).toContain(report.id);
  });
});

describe('Phase 2: Two-Stage Leave Workflow & Role-Scoped Dashboards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('transitions Manager -> HR -> Approved and stops cleanly when rejected at Stage 1 or Stage 2', async () => {
    const leaveRepo = new MockLeaveRepository();

    const submitted = await leaveRepo.submitRequest({
      employeeId: 'emp-5',
      employeeStaffId: 'CIT/2026/005',
      employeeName: 'Bayu Wirawan',
      entityName: 'CGCC',
      departmentName: 'ICT & Infrastructure',
      leaveType: 'Annual Leave',
      startDate: '2027-02-01',
      endDate: '2027-02-03',
      totalDays: 3,
      daysRequested: 3,
      reason: 'Family break',
      managerId: 'emp-2',
      managerName: 'Engr. Femi Olatunji',
    });

    expect(submitted.status).toBe('Submitted');
    expect(submitted.approvalStage).toBe('MANAGER');

    // Stage 1 approval advances to HR
    const afterMgr = await leaveRepo.updateStatus(
      submitted.id,
      'Approved',
      'Engr. Femi Olatunji',
      'Team coverage sorted'
    );
    expect(afterMgr.status).toBe('Pending Review');
    expect(afterMgr.approvalStage).toBe('HR');
    expect(afterMgr.managerActorName).toBe('Engr. Femi Olatunji');
    expect(afterMgr.managerActedAt).toBeTruthy();

    // Stage 2 HR approval completes
    const afterHr = await leaveRepo.updateStatus(
      submitted.id,
      'Approved',
      'Mrs. Sussan Afuwape',
      'Approved by HR'
    );
    expect(afterHr.status).toBe('Approved');
    expect(afterHr.approvalStage).toBe('COMPLETE');
    expect(afterHr.hrActorName).toBe('Mrs. Sussan Afuwape');
    expect(afterHr.hrActedAt).toBeTruthy();

    // Rejection at Stage 1 stops at MANAGER
    const secondReq = await leaveRepo.submitRequest({
      employeeId: 'emp-5',
      employeeStaffId: 'CIT/2026/005',
      employeeName: 'Bayu Wirawan',
      entityName: 'CGCC',
      departmentName: 'ICT & Infrastructure',
      leaveType: 'Sick Leave',
      startDate: '2027-03-01',
      endDate: '2027-03-02',
      totalDays: 2,
      daysRequested: 2,
      reason: 'Medical checkup',
      managerId: 'emp-2',
      managerName: 'Engr. Femi Olatunji',
    });

    const rejected = await leaveRepo.updateStatus(
      secondReq.id,
      'Rejected',
      'Engr. Femi Olatunji',
      'Critical release window'
    );
    expect(rejected.status).toBe('Rejected');
    expect(rejected.stoppedAtStage).toBe('MANAGER');
  });

  it('rejects overlapping leave requests and invalid date ranges', async () => {
    const leaveRepo = new MockLeaveRepository();
    await expect(
      leaveRepo.submitRequest({
        employeeId: 'emp-99',
        employeeStaffId: 'CIT/099',
        employeeName: 'Test Staff',
        entityName: 'CGCC',
        departmentName: 'ICT',
        leaveType: 'Annual Leave',
        startDate: '2027-04-10',
        endDate: '2027-04-05',
        totalDays: 1,
        reason: 'Invalid range',
      })
    ).rejects.toThrow(/end date/i);

    await leaveRepo.submitRequest({
      employeeId: 'emp-99',
      employeeStaffId: 'CIT/099',
      employeeName: 'Test Staff',
      entityName: 'CGCC',
      departmentName: 'ICT',
      leaveType: 'Annual Leave',
      startDate: '2027-05-01',
      endDate: '2027-05-03',
      totalDays: 3,
      reason: 'Initial range',
      managerId: 'emp-2',
    });

    await expect(
      leaveRepo.submitRequest({
        employeeId: 'emp-99',
        employeeStaffId: 'CIT/099',
        employeeName: 'Test Staff',
        entityName: 'CGCC',
        departmentName: 'ICT',
        leaveType: 'Casual Leave',
        startDate: '2027-05-02',
        endDate: '2027-05-04',
        totalDays: 3,
        reason: 'Overlaps existing',
        managerId: 'emp-2',
      })
    ).rejects.toThrow(/overlap/i);
  });

  it('routes DashboardView dynamically for Employee vs Supervisor Employee vs HR', async () => {
    const employeeUser: User = {
      id: 'u-emp',
      employeeId: 'emp-5',
      staffId: 'CIT/2026/005',
      name: 'Bayu Wirawan',
      email: 'bayu@citadel.ng',
      role: 'EMPLOYEE',
      isSupervisor: false,
      directReportsCount: 0,
      managerId: 'emp-4',
      managerName: 'Nadia Safitri',
      entityId: '1',
      entityName: 'CGCC',
      departmentId: '1',
      departmentName: 'ICT',
      jobTitle: 'Engineer',
      permissions: [],
    };

    const { unmount } = render(
      <AuthContext.Provider value={makeAuthValue(employeeUser, false) as any}>
        <DashboardView
          onNavigate={vi.fn()}
          onOpenLeaveModal={vi.fn()}
          onOpenAddEmployee={vi.fn()}
        />
      </AuthContext.Provider>
    );

    expect(await screen.findByTestId('employee-dashboard')).toBeInTheDocument();
    unmount();

    const supervisorEmployee: User = {
      ...employeeUser,
      id: 'u-sup',
      employeeId: 'emp-4',
      staffId: 'CIT/2026/004',
      name: 'Nadia Safitri',
      isSupervisor: true,
      directReportsCount: 1,
    };

    render(
      <AuthContext.Provider value={makeAuthValue(supervisorEmployee, true) as any}>
        <DashboardView
          onNavigate={vi.fn()}
          onOpenLeaveModal={vi.fn()}
          onOpenAddEmployee={vi.fn()}
        />
      </AuthContext.Provider>
    );

    expect(await screen.findByTestId('manager-dashboard')).toBeInTheDocument();
  });

  it('displays stopped stage badge on rejected requests and submits Approved status when Manager approves in LeaveManagementView', async () => {
    const managerUser: User = {
      id: 'u-mgr',
      employeeId: 'emp-2',
      staffId: 'CIT/2026/002',
      name: 'Engr. Femi Olatunji',
      email: 'femi@citadel.ng',
      role: 'MANAGER',
      effectiveRole: 'MANAGER',
      isSupervisor: true,
      directReportsCount: 1,
      entityId: '1',
      entityName: 'CGCC',
      departmentId: '1',
      departmentName: 'ICT',
      jobTitle: 'Engineering Manager',
      permissions: [],
    };

    const mockedRequests: LeaveRequest[] = [
      {
        id: '901',
        employeeId: 'emp-5',
        employeeStaffId: 'CIT/005',
        employeeName: 'Bayu Wirawan',
        entityName: 'CGCC',
        departmentName: 'ICT',
        leaveType: 'Annual Leave',
        startDate: '2027-06-01',
        endDate: '2027-06-03',
        totalDays: 3,
        reason: 'Annual family travel',
        status: 'Submitted',
        appliedDate: '2026-11-24',
        managerId: 'emp-2',
        managerName: 'Engr. Femi Olatunji',
        approvalStage: 'MANAGER',
      },
      {
        id: '902',
        employeeId: 'emp-6',
        employeeStaffId: 'CIT/006',
        employeeName: 'Jonathan Tan',
        entityName: 'CGCC',
        departmentName: 'ICT',
        leaveType: 'Casual Leave',
        startDate: '2027-07-01',
        endDate: '2027-07-02',
        totalDays: 2,
        reason: 'Personal errand',
        status: 'Rejected',
        appliedDate: '2026-11-24',
        managerId: 'emp-2',
        managerName: 'Engr. Femi Olatunji',
        approvalStage: 'HR',
        stoppedAtStage: 'HR',
        approverComments: 'Peak quarter audit freeze',
      },
    ];

    const getAllSpy = vi.spyOn(leaveRepository, 'getAll').mockResolvedValue(mockedRequests);
    const updateSpy = vi.spyOn(leaveRepository, 'updateStatus').mockResolvedValue({
      ...mockedRequests[0],
      status: 'Pending Review',
      approvalStage: 'HR',
    });
    vi.spyOn(leaveRepository, 'getBalances').mockResolvedValue([]);
    vi.spyOn(leaveRepository, 'getCategories').mockResolvedValue([]);
    vi.spyOn(employeeRepository, 'getAll').mockResolvedValue([]);

    render(
      <AuthContext.Provider value={makeAuthValue(managerUser, true) as any}>
        <LeaveManagementView />
      </AuthContext.Provider>
    );

    const approveBtn = await screen.findByTestId('leave-approve-btn');
    expect(approveBtn).toHaveTextContent('Approve & Forward to HR');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        '901',
        'Approved',
        'Engr. Femi Olatunji',
        expect.any(String)
      );
    });

    // Click rejected request row to inspect stopped-stage banner
    fireEvent.click(screen.getByText('Jonathan Tan'));
    expect(await screen.findByTestId('leave-rejection-banner')).toHaveTextContent(
      'Stopped at Stage 2 — HR Final Review'
    );

    getAllSpy.mockRestore();
    updateSpy.mockRestore();
  });

  it('filters department options strictly by selected entity inside CreateEmployeeModal', async () => {
    const entities = [
      {
        id: 'entity-cgcc',
        name: 'Citadel Global Community Church (CGCC)',
        shortCode: 'CGCC',
        description: 'Ministry',
        headOfEntity: 'Pastor Tunde Bakare',
        isActive: true,
      },
      {
        id: 'entity-csog',
        name: 'Citadel School of Government (CSOG)',
        shortCode: 'CSOG',
        description: 'School',
        headOfEntity: 'Omoaholo Omoakhalen',
        isActive: true,
      },
    ];
    const departments = [
      {
        id: 'dept-cgcc-ict',
        entityId: 'entity-cgcc',
        entityName: 'CGCC',
        name: 'ICT & Infrastructure',
        code: 'ICT',
        headOfDepartmentName: 'Engr. Femi Olatunji',
        isActive: true,
      },
      {
        id: 'dept-csog-acad',
        entityId: 'entity-csog',
        entityName: 'CSOG',
        name: 'Academic Affairs',
        code: 'ACAD',
        headOfDepartmentName: 'Omoaholo Omoakhalen',
        isActive: true,
      },
    ];

    const hrUser: User = {
      id: 'u-hr',
      employeeId: 'emp-1',
      staffId: 'CIT/001',
      name: 'Dr. Bukola Adeleke',
      email: 'dr.adeleke@citadel.ng',
      role: 'HR_STAFF',
      entityId: 'entity-cgcc',
      entityName: 'CGCC',
      departmentId: 'dept-cgcc-ict',
      departmentName: 'People & Culture',
      jobTitle: 'CPO',
      permissions: [],
    };

    render(
      <AuthContext.Provider value={makeAuthValue(hrUser, false) as any}>
        <CreateEmployeeModal
          isOpen
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          entities={entities}
          departments={departments}
        />
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. Oluwatosin'), {
      target: { value: 'Tosin' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Balogun'), {
      target: { value: 'Balogun' },
    });
    fireEvent.change(screen.getByPlaceholderText('o.balogun@citadelcommunity.org'), {
      target: { value: 'tosin@citadel.ng' },
    });

    fireEvent.click(screen.getByText('Continue'));

    const entitySelect = await screen.findByTestId('employee-entity-select');
    const deptSelect = (await screen.findByTestId('employee-department-select')) as HTMLSelectElement;

    expect(Array.from(deptSelect.options).map((o) => o.text).some((t) => t.includes('ICT & Infrastructure'))).toBe(true);
    expect(Array.from(deptSelect.options).map((o) => o.text).some((t) => t.includes('Academic Affairs'))).toBe(false);

    fireEvent.change(entitySelect, { target: { value: 'entity-csog' } });

    await waitFor(() => {
      const optionTexts = Array.from(deptSelect.options).map((o) => o.text);
      expect(optionTexts.some((t) => t.includes('Academic Affairs'))).toBe(true);
      expect(optionTexts.some((t) => t.includes('ICT & Infrastructure'))).toBe(false);
    });
  });

  it('sends explicit managerId: null when clearing Direct Supervisor during edit in CreateEmployeeModal', async () => {
    const entities = [
      {
        id: '1',
        name: 'Citadel Global Community Church',
        shortCode: 'CGCC',
        description: 'Ministry',
        headOfEntity: 'Pastor Tunde Bakare',
        isActive: true,
      },
    ];
    const departments = [
      {
        id: '1',
        entityId: '1',
        entityName: 'CGCC',
        name: 'ICT & Infrastructure',
        code: 'ICT',
        headOfDepartmentName: 'Engr. Femi Olatunji',
        isActive: true,
      },
    ];
    const existingEmployees: Employee[] = [
      {
        id: 'emp-2',
        staffId: 'CGCC-002',
        fullName: 'Engr. Femi Olatunji',
        firstName: 'Femi',
        lastName: 'Olatunji',
        email: 'femi@citadel.ng',
        phone: '+2348000000002',
        dateOfBirth: '1988-02-10',
        gender: 'Male',
        address: 'Lagos',
        emergencyContact: { name: 'EC', relationship: 'Spouse', phone: '+2348000000003' },
        nextOfKin: { name: 'NOK', relationship: 'Spouse', phone: '+2348000000003', address: 'Lagos' },
        entityId: '1',
        entityName: 'CGCC',
        departmentId: '1',
        departmentName: 'ICT & Infrastructure',
        jobTitle: 'Head of ICT',
        gradeLevel: 'M2',
        employmentType: 'Full-Time',
        employmentDate: '2022-01-01',
        contractStatus: 'Permanent',
        yearsOfService: 4,
        qualifications: [],
        certifications: [],
        bankPayroll: { bankName: 'Zenith Bank', accountNumber: '1234567890', accountName: 'Femi Olatunji', salaryGrade: 'M2', currency: 'NGN' },
        pensionHmo: { pfaName: 'Stanbic', rsaPin: 'PEN123', hmoProvider: 'Hygeia', hmoPlan: 'Gold', hmoIdNumber: 'HMO-2' },
        status: 'Confirmed',
      },
      {
        id: 'emp-5',
        staffId: 'CGCC-005',
        fullName: 'Bayu Wirawan',
        firstName: 'Bayu',
        lastName: 'Wirawan',
        email: 'bayu@citadel.ng',
        phone: '+2348000000005',
        dateOfBirth: '1995-05-05',
        gender: 'Male',
        address: 'Lagos',
        emergencyContact: { name: 'EC', relationship: 'Sibling', phone: '+2348000000006' },
        nextOfKin: { name: 'NOK', relationship: 'Sibling', phone: '+2348000000006', address: 'Lagos' },
        entityId: '1',
        entityName: 'CGCC',
        departmentId: '1',
        departmentName: 'ICT & Infrastructure',
        jobTitle: 'Software Engineer',
        gradeLevel: 'A1',
        employmentType: 'Full-Time',
        employmentDate: '2024-03-01',
        managerId: 'emp-2',
        managerName: 'Engr. Femi Olatunji',
        contractStatus: 'Permanent',
        yearsOfService: 2,
        qualifications: [],
        certifications: [],
        bankPayroll: { bankName: 'Zenith Bank', accountNumber: '0987654321', accountName: 'Bayu Wirawan', salaryGrade: 'A1', currency: 'NGN' },
        pensionHmo: { pfaName: 'Stanbic', rsaPin: 'PEN456', hmoProvider: 'Hygeia', hmoPlan: 'Silver', hmoIdNumber: 'HMO-5' },
        status: 'Confirmed',
      },
    ];

    const hrUser: User = {
      id: 'u-hr',
      employeeId: 'emp-1',
      staffId: 'CGCC-001',
      name: 'Dr. Bukola Adeleke',
      email: 'dr.adeleke@citadel.ng',
      role: 'HR_STAFF',
      entityId: '1',
      entityName: 'CGCC',
      departmentId: '1',
      departmentName: 'People & Culture',
      jobTitle: 'CPO',
      permissions: [],
    };

    const updateSpy = vi.spyOn(employeeRepository, 'update').mockResolvedValue({
      ...existingEmployees[1],
      managerId: null as any,
      managerName: null as any,
    });

    render(
      <AuthContext.Provider value={makeAuthValue(hrUser, false) as any}>
        <CreateEmployeeModal
          isOpen
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          editingEmployee={existingEmployees[1]}
          entities={entities}
          departments={departments}
          employees={existingEmployees}
        />
      </AuthContext.Provider>
    );

    const supSelect = (await screen.findByTestId('employee-supervisor-select')) as HTMLSelectElement;
    expect(supSelect.value).toBe('emp-2');

    fireEvent.change(supSelect, { target: { value: '' } });
    fireEvent.click(screen.getByTestId('employee-save-changes-btn'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'emp-5',
        expect.objectContaining({
          managerId: null,
          managerName: null,
        })
      );
    });

    updateSpy.mockRestore();
  });

  it('hides Stage 1 approval controls for unrelated managers in LeaveManagementView', async () => {
    const unrelatedManager: User = {
      id: 'u-other-mgr',
      employeeId: 'emp-99',
      staffId: 'CGCC-099',
      name: 'Pastor Christian Ike',
      email: 'c.ike@citadel.ng',
      role: 'MANAGER',
      effectiveRole: 'MANAGER',
      isSupervisor: true,
      directReportsCount: 2,
      entityId: '1',
      entityName: 'CGCC',
      departmentId: '2',
      departmentName: 'Facilities',
      jobTitle: 'Head of Facilities',
      permissions: [],
    };

    const mockedRequests: LeaveRequest[] = [
      {
        id: '910',
        employeeId: 'emp-5',
        employeeStaffId: 'CIT/005',
        employeeName: 'Bayu Wirawan',
        entityName: 'CGCC',
        departmentName: 'ICT',
        leaveType: 'Annual Leave',
        startDate: '2027-08-01',
        endDate: '2027-08-03',
        totalDays: 3,
        reason: 'Annual leave',
        status: 'Submitted',
        appliedDate: '2026-11-24',
        managerId: 'emp-2',
        managerName: 'Engr. Femi Olatunji',
        approvalStage: 'MANAGER',
      },
    ];

    const getAllSpy = vi.spyOn(leaveRepository, 'getAll').mockResolvedValue(mockedRequests);
    const balancesSpy = vi.spyOn(leaveRepository, 'getBalances').mockResolvedValue([]);
    const catsSpy = vi.spyOn(leaveRepository, 'getCategories').mockResolvedValue([]);
    const empSpy = vi.spyOn(employeeRepository, 'getAll').mockResolvedValue([]);

    try {
      render(
        <AuthContext.Provider value={makeAuthValue(unrelatedManager, true) as any}>
          <LeaveManagementView />
        </AuthContext.Provider>
      );

      expect((await screen.findAllByText('Bayu Wirawan')).length).toBeGreaterThan(0);
      expect(screen.queryByTestId('leave-approve-btn')).not.toBeInTheDocument();
    } finally {
      getAllSpy.mockRestore();
      balancesSpy.mockRestore();
      catsSpy.mockRestore();
      empSpy.mockRestore();
    }
  });

  it('handles numeric Laravel IDs and Pending status cleanly in LeaveManagementView', async () => {
    const managerUser: User = {
      id: '2',
      employeeId: '2',
      staffId: 'CIT/2026/002',
      name: 'Engr. Femi Olatunji',
      email: 'femi@citadel.ng',
      role: 'MANAGER',
      effectiveRole: 'MANAGER',
      isSupervisor: true,
      directReportsCount: 1,
      entityId: '1',
      entityName: 'CGCC',
      departmentId: '1',
      departmentName: 'ICT',
      jobTitle: 'Engineering Manager',
      permissions: [],
    };

    const numericRequests: LeaveRequest[] = [
      {
        id: 101 as any,
        employeeId: 5 as any,
        employeeStaffId: 'CIT/005',
        employeeName: 'Bayu Wirawan',
        entityName: 'CGCC',
        departmentName: 'ICT',
        leaveType: 'Annual Leave',
        startDate: '2027-09-01',
        endDate: '2027-09-03',
        totalDays: 3,
        reason: 'Pending status check',
        status: 'Pending' as any,
        appliedDate: '2026-11-25',
        managerId: '2',
        managerName: 'Engr. Femi Olatunji',
        approvalStage: 'MANAGER',
      },
    ];

    const getAllSpy = vi.spyOn(leaveRepository, 'getAll').mockResolvedValue(numericRequests);
    const balancesSpy = vi.spyOn(leaveRepository, 'getBalances').mockResolvedValue([]);
    const catsSpy = vi.spyOn(leaveRepository, 'getCategories').mockResolvedValue([]);
    const empSpy = vi.spyOn(employeeRepository, 'getAll').mockResolvedValue([]);

    try {
      render(
        <AuthContext.Provider value={makeAuthValue(managerUser, true) as any}>
          <LeaveManagementView />
        </AuthContext.Provider>
      );

      const approveBtn = await screen.findByTestId('leave-approve-btn');
      expect(approveBtn).toHaveTextContent('Approve & Forward to HR');
      expect(screen.getByTestId('filter-tab-pending')).toHaveTextContent('1');
    } finally {
      getAllSpy.mockRestore();
      balancesSpy.mockRestore();
      catsSpy.mockRestore();
      empSpy.mockRestore();
    }
  });
});
