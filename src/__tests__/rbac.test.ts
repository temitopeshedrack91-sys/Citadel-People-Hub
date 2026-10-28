import { describe, it, expect } from 'vitest';
import {
  normalizeRole,
  canAccessModule,
  checkRouteAccess,
  getRolePermissions,
  canPerformAction,
  filterEmployeesForUser,
  filterLeaveRequestsForUser,
  filterAttendanceForUser,
  maskSensitiveEmployeeData,
  authorizeApiRequest,
  CanonicalRole,
} from '../utils/rbac';
import { User } from '../types';

describe('RBAC Centralized Module (src/utils/rbac.ts)', () => {
  // Test mock users
  const adminUser: User = {
    id: 'emp-2',
    staffId: 'CGCC-002',
    name: 'Engr. Femi Olatunji',
    email: 'femi.olatunji@citadel.ng',
    role: 'SYSTEM_ADMIN',
    entityId: 'CGCC',
    entityName: 'Citadel Global Community Church',
    departmentId: 'dept-cgcc-tech',
    departmentName: 'Technology & Systems',
    jobTitle: 'Head of Technology',
    avatarUrl: '',
    permissions: ['all'],
  };

  const hrUser: User = {
    id: 'emp-1',
    staffId: 'CGCC-001',
    name: 'Dr. Bukola Adeleke',
    email: 'dr.adeleke@citadel.ng',
    role: 'PCCM_SUPER_ADMIN',
    entityId: 'CGCC',
    entityName: 'Citadel Global Community Church',
    departmentId: 'dept-cgcc-pccm',
    departmentName: 'People & Culture',
    jobTitle: 'Chief People Officer',
    avatarUrl: '',
    permissions: ['pccm_admin'],
  };

  const employeeTech: User = {
    id: 'emp-4',
    staffId: 'CGCC-004',
    name: 'Bayu Wirawan',
    email: 'bayu@citadel.ng',
    role: 'EMPLOYEE',
    entityId: 'CGCC',
    entityName: 'Citadel Global Community Church',
    departmentId: 'dept-cgcc-tech',
    departmentName: 'Technology & Systems',
    jobTitle: 'Senior Android Engineer',
    avatarUrl: '',
    permissions: ['self_service'],
  };

  const employeeHR: User = {
    id: 'emp-7',
    staffId: 'CGCC-007',
    name: 'Raka Aditya',
    email: 'raka@citadel.ng',
    role: 'EMPLOYEE',
    entityId: 'CGCC',
    entityName: 'Citadel Global Community Church',
    departmentId: 'dept-cgcc-pccm',
    departmentName: 'People & Culture',
    jobTitle: 'Data & Growth Analyst',
    avatarUrl: '',
    permissions: ['self_service'],
  };

  const viewerUser: User = {
    id: 'emp-8',
    staffId: 'CGCC-008',
    name: 'Grace Okafor',
    email: 'grace.okafor@citadel.ng',
    role: 'VIEWER',
    entityId: 'CGCC',
    entityName: 'Citadel Global Community Church',
    departmentId: 'dept-cgcc-audit',
    departmentName: 'Audit & Governance',
    jobTitle: 'Compliance Auditor (Viewer)',
    avatarUrl: '',
    permissions: ['read_only'],
  };

  // 1. Role Normalization
  describe('1. Role Normalization (normalizeRole)', () => {
    it('normalizes admin aliases to ADMIN', () => {
      expect(normalizeRole('ADMIN')).toBe('ADMIN');
      expect(normalizeRole('SYSTEM_ADMIN')).toBe('ADMIN');
      expect(normalizeRole('SYSADMIN')).toBe('ADMIN');
      expect(normalizeRole('SUPER_ADMIN')).toBe('ADMIN');
      expect(normalizeRole('admin')).toBe('ADMIN');
    });

    it('normalizes HR management aliases to HR_STAFF', () => {
      expect(normalizeRole('HR_STAFF')).toBe('HR_STAFF');
      expect(normalizeRole('PCCM_SUPER_ADMIN')).toBe('HR_STAFF');
      expect(normalizeRole('HR_MANAGER')).toBe('HR_STAFF');
      expect(normalizeRole('BUSINESS_HEAD')).toBe('HR_STAFF');
      expect(normalizeRole('DEPARTMENT_HEAD')).toBe('HR_STAFF');
      expect(normalizeRole('hr')).toBe('HR_STAFF');
    });

    it('normalizes employee aliases to EMPLOYEE', () => {
      expect(normalizeRole('EMPLOYEE')).toBe('EMPLOYEE');
      expect(normalizeRole('STAFF')).toBe('EMPLOYEE');
      expect(normalizeRole('USER')).toBe('EMPLOYEE');
      expect(normalizeRole('employee')).toBe('EMPLOYEE');
    });

    it('normalizes viewer aliases to VIEWER', () => {
      expect(normalizeRole('VIEWER')).toBe('VIEWER');
      expect(normalizeRole('AUDITOR')).toBe('VIEWER');
      expect(normalizeRole('READONLY')).toBe('VIEWER');
      expect(normalizeRole('GUEST')).toBe('VIEWER');
    });

    it('returns null for unknown or invalid roles', () => {
      expect(normalizeRole('HACKER')).toBeNull();
      expect(normalizeRole('')).toBeNull();
      expect(normalizeRole(null)).toBeNull();
      expect(normalizeRole(undefined)).toBeNull();
    });
  });

  // 2. Module Permissions & Route Access
  describe('2. Module Permissions & Route Access (checkRouteAccess / canAccessModule)', () => {
    it('grants ADMIN access to all 19 modules', () => {
      const allModules = [
        'dashboard',
        'employees',
        'directory',
        'leave',
        'attendance',
        'projects',
        'calendar',
        'team-notes',
        'recruitment',
        'onboarding',
        'offboarding',
        'performance',
        'documents',
        'reports',
        'notifications',
        'integrations',
        'ai-assistant',
        'settings',
        'audit-logs',
      ] as const;

      for (const mod of allModules) {
        expect(canAccessModule(adminUser, mod)).toBe(true);
        const routeCheck = checkRouteAccess(adminUser, mod);
        expect(routeCheck.allowed).toBe(true);
        expect(routeCheck.status).toBe(200);
      }
    });

    it('allows HR_STAFF HR modules but strictly blocks system settings & audit logs', () => {
      // Allowed HR modules
      expect(canAccessModule(hrUser, 'dashboard')).toBe(true);
      expect(canAccessModule(hrUser, 'employees')).toBe(true);
      expect(canAccessModule(hrUser, 'recruitment')).toBe(true);
      expect(canAccessModule(hrUser, 'onboarding')).toBe(true);
      expect(canAccessModule(hrUser, 'offboarding')).toBe(true);
      expect(canAccessModule(hrUser, 'performance')).toBe(true);
      expect(canAccessModule(hrUser, 'reports')).toBe(true);

      // Blocked System modules
      expect(canAccessModule(hrUser, 'settings')).toBe(false);
      expect(canAccessModule(hrUser, 'integrations')).toBe(false);
      expect(canAccessModule(hrUser, 'audit-logs')).toBe(false);

      const deniedRoute = checkRouteAccess(hrUser, 'settings');
      expect(deniedRoute.allowed).toBe(false);
      expect(deniedRoute.status).toBe(403);
      expect(deniedRoute.reason).toContain('restricted to Admin');
    });

    it('allows EMPLOYEE self-service modules and blocks administrative modules', () => {
      // Allowed self-service
      expect(canAccessModule(employeeTech, 'dashboard')).toBe(true);
      expect(canAccessModule(employeeTech, 'attendance')).toBe(true);
      expect(canAccessModule(employeeTech, 'leave')).toBe(true);
      expect(canAccessModule(employeeTech, 'projects')).toBe(true);
      expect(canAccessModule(employeeTech, 'calendar')).toBe(true);
      expect(canAccessModule(employeeTech, 'team-notes')).toBe(true);
      expect(canAccessModule(employeeTech, 'directory')).toBe(true);
      expect(canAccessModule(employeeTech, 'documents')).toBe(true);

      // Blocked management modules
      expect(canAccessModule(employeeTech, 'employees')).toBe(false);
      expect(canAccessModule(employeeTech, 'recruitment')).toBe(false);
      expect(canAccessModule(employeeTech, 'onboarding')).toBe(false);
      expect(canAccessModule(employeeTech, 'offboarding')).toBe(false);
      expect(canAccessModule(employeeTech, 'performance')).toBe(false);
      expect(canAccessModule(employeeTech, 'reports')).toBe(false);
      expect(canAccessModule(employeeTech, 'settings')).toBe(false);
      expect(canAccessModule(employeeTech, 'audit-logs')).toBe(false);

      const deniedCheck = checkRouteAccess(employeeTech, 'recruitment');
      expect(deniedCheck.allowed).toBe(false);
      expect(deniedCheck.status).toBe(403);
      expect(deniedCheck.reason).toContain('Employee access is restricted to self-service');
    });

    it('allows VIEWER read-only modules and blocks mutation & management modules', () => {
      expect(canAccessModule(viewerUser, 'dashboard')).toBe(true);
      expect(canAccessModule(viewerUser, 'directory')).toBe(true);
      expect(canAccessModule(viewerUser, 'calendar')).toBe(true);
      expect(canAccessModule(viewerUser, 'team-notes')).toBe(true);
      expect(canAccessModule(viewerUser, 'documents')).toBe(true);
      expect(canAccessModule(viewerUser, 'reports')).toBe(true);

      // Blocked
      expect(canAccessModule(viewerUser, 'employees')).toBe(false);
      expect(canAccessModule(viewerUser, 'recruitment')).toBe(false);
      expect(canAccessModule(viewerUser, 'settings')).toBe(false);

      const deniedViewer = checkRouteAccess(viewerUser, 'employees');
      expect(deniedViewer.allowed).toBe(false);
      expect(deniedViewer.status).toBe(403);
      expect(deniedViewer.reason).toContain('Viewer access is read-only');
    });

    it('returns 401 unauthenticated for missing user in checkRouteAccess', () => {
      const check = checkRouteAccess(null, 'dashboard');
      expect(check.allowed).toBe(false);
      expect(check.status).toBe(401);
      expect(check.error).toBe('Unauthenticated');
    });

    it('returns 403 forbidden for unrecognized role in checkRouteAccess', () => {
      const badUser = { ...employeeTech, role: 'SUSPICIOUS_ROLE' as any };
      const check = checkRouteAccess(badUser, 'dashboard');
      expect(check.allowed).toBe(false);
      expect(check.status).toBe(403);
      expect(check.error).toBe('Forbidden');
      expect(check.reason).toContain('unrecognized role');
    });
  });

  // 3. Action Authorization & Read-Only Enforcement
  describe('3. Action Authorization & Read-Only Enforcement (canPerformAction)', () => {
    it('grants ADMIN permission for all actions', () => {
      expect(canPerformAction(adminUser, 'manage_employees').allowed).toBe(true);
      expect(canPerformAction(adminUser, 'manage_settings').allowed).toBe(true);
      expect(canPerformAction(adminUser, 'view_audit_logs').allowed).toBe(true);
      expect(canPerformAction(adminUser, 'approve_leave').allowed).toBe(true);
    });

    it('grants HR_STAFF HR permissions but denies system-level settings', () => {
      expect(canPerformAction(hrUser, 'manage_employees').allowed).toBe(true);
      expect(canPerformAction(hrUser, 'approve_leave').allowed).toBe(true);
      expect(canPerformAction(hrUser, 'manage_onboarding').allowed).toBe(true);

      // Blocked system settings
      const settingsAction = canPerformAction(hrUser, 'manage_settings');
      expect(settingsAction.allowed).toBe(false);
      expect(settingsAction.status).toBe(403);
      expect(settingsAction.reason).toContain('cannot perform system-level administration');

      const auditAction = canPerformAction(hrUser, 'view_audit_logs');
      expect(auditAction.allowed).toBe(false);
      expect(auditAction.status).toBe(403);
    });

    it('blocks mutating actions for VIEWER', () => {
      const clockIn = canPerformAction(viewerUser, 'clock_in_out');
      expect(clockIn.allowed).toBe(false);
      expect(clockIn.status).toBe(403);
      expect(clockIn.reason).toContain('strictly read-only');

      const applyLeave = canPerformAction(viewerUser, 'apply_leave');
      expect(applyLeave.allowed).toBe(false);

      const createTask = canPerformAction(viewerUser, 'create_task');
      expect(createTask.allowed).toBe(false);

      // Allowed read-only exports
      const exportReports = canPerformAction(viewerUser, 'export_reports');
      expect(exportReports.allowed).toBe(true);
    });

    it('allows EMPLOYEE personal actions but denies management actions', () => {
      expect(canPerformAction(employeeTech, 'apply_leave').allowed).toBe(true);
      expect(canPerformAction(employeeTech, 'clock_in_out').allowed).toBe(true);
      expect(canPerformAction(employeeTech, 'create_task').allowed).toBe(true);

      // Denied
      expect(canPerformAction(employeeTech, 'manage_employees').allowed).toBe(false);
      expect(canPerformAction(employeeTech, 'approve_leave').allowed).toBe(false);
      expect(canPerformAction(employeeTech, 'manage_settings').allowed).toBe(false);
    });

    it('enforces department scope on Employee actions with department context', () => {
      // Accessing own department: allowed
      const ownDeptCheck = canPerformAction(employeeTech, 'create_task', {
        targetDepartmentName: 'Technology & Systems',
      });
      expect(ownDeptCheck.allowed).toBe(true);

      // Attempting to access another department: forbidden
      const foreignDeptCheck = canPerformAction(employeeTech, 'create_task', {
        targetDepartmentName: 'Finance & Treasury',
      });
      expect(foreignDeptCheck.allowed).toBe(false);
      expect(foreignDeptCheck.status).toBe(403);
      expect(foreignDeptCheck.reason).toContain('Department scoping violation');
    });
  });

  // 4. Department Scoping for Employee Views
  describe('4. Department Scoping for Employees (filterEmployeesForUser / filterLeaveRequestsForUser)', () => {
    const mockStaffList = [
      { id: '1', staffId: 'CGCC-001', name: 'Dr. Bukola Adeleke', departmentName: 'People & Culture' },
      { id: '2', staffId: 'CGCC-002', name: 'Engr. Femi Olatunji', departmentName: 'Technology & Systems' },
      { id: '4', staffId: 'CGCC-004', name: 'Bayu Wirawan', departmentName: 'Technology & Systems' },
      { id: '7', staffId: 'CGCC-007', name: 'Raka Aditya', departmentName: 'People & Culture' },
      { id: '9', staffId: 'CGCC-009', name: 'Mrs. Yewande Daniels', departmentName: 'Finance & Treasury' },
    ];

    it('allows ADMIN to see all employees across all departments', () => {
      const result = filterEmployeesForUser(adminUser, mockStaffList);
      expect(result).toHaveLength(mockStaffList.length);
    });

    it('allows HR_STAFF to see all employees across all departments', () => {
      const result = filterEmployeesForUser(hrUser, mockStaffList);
      expect(result).toHaveLength(mockStaffList.length);
    });

    it('allows VIEWER to see all employees in read-only directory', () => {
      const result = filterEmployeesForUser(viewerUser, mockStaffList);
      expect(result).toHaveLength(mockStaffList.length);
    });

    it('scopes EMPLOYEE strictly to their own department (Technology & Systems)', () => {
      const result = filterEmployeesForUser(employeeTech, mockStaffList);
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.staffId)).toEqual(['CGCC-002', 'CGCC-004']);
      expect(result.every((s) => s.departmentName === 'Technology & Systems')).toBe(true);
    });

    it('scopes EMPLOYEE in People & Culture strictly to their own department', () => {
      const result = filterEmployeesForUser(employeeHR, mockStaffList);
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.staffId)).toEqual(['CGCC-001', 'CGCC-007']);
      expect(result.every((s) => s.departmentName === 'People & Culture')).toBe(true);
    });

    it('scopes leave requests for EMPLOYEE to self and own department', () => {
      const mockLeaveRequests = [
        { id: 'lr-1', employeeId: 'emp-4', department: 'Technology & Systems', reason: 'Vacation' },
        { id: 'lr-2', employeeId: 'emp-2', department: 'Technology & Systems', reason: 'Conference' },
        { id: 'lr-3', employeeId: 'emp-1', department: 'People & Culture', reason: 'Medical' },
        { id: 'lr-4', employeeId: 'emp-9', department: 'Finance & Treasury', reason: 'Annual' },
      ];

      // Admin & HR see all
      expect(filterLeaveRequestsForUser(adminUser, mockLeaveRequests)).toHaveLength(4);
      expect(filterLeaveRequestsForUser(hrUser, mockLeaveRequests)).toHaveLength(4);

      // Tech employee sees only tech department requests
      const techLeaves = filterLeaveRequestsForUser(employeeTech, mockLeaveRequests);
      expect(techLeaves).toHaveLength(2);
      expect(techLeaves.map((l) => l.id)).toEqual(['lr-1', 'lr-2']);
    });
  });

  // 5. Sensitive Data Masking
  describe('5. Sensitive Data Masking (maskSensitiveEmployeeData)', () => {
    const rawPersonnelRecord: {
      id: string;
      fullName: string;
      departmentName: string;
      jobTitle: string;
      salary?: number;
      salaryFormatted?: string;
      bankAccountNumber?: string;
      bankName?: string;
      bvn?: string;
      nationalId?: string;
    } = {
      id: 'emp-1',
      fullName: 'Dr. Bukola Adeleke',
      departmentName: 'People & Culture',
      jobTitle: 'Chief People Officer',
      salary: 1500000,
      bankAccountNumber: '0123456789',
      bankName: 'Guaranty Trust Bank',
      bvn: '22334455667',
      nationalId: 'NIN-99887766',
    };

    it('keeps sensitive salary & banking visible for ADMIN', () => {
      const masked = maskSensitiveEmployeeData(adminUser, rawPersonnelRecord);
      expect(masked.salary).toBe(1500000);
      expect(masked.bankAccountNumber).toBe('0123456789');
      expect(masked.bvn).toBe('22334455667');
    });

    it('keeps sensitive salary & banking visible for HR_STAFF', () => {
      const masked = maskSensitiveEmployeeData(hrUser, rawPersonnelRecord);
      expect(masked.salary).toBe(1500000);
      expect(masked.bankAccountNumber).toBe('0123456789');
      expect(masked.bvn).toBe('22334455667');
    });

    it('masks sensitive salary & banking with confidential placeholder for EMPLOYEE', () => {
      const masked = maskSensitiveEmployeeData(employeeTech, rawPersonnelRecord);
      expect(masked.salary).toBeUndefined();
      expect(masked.salaryFormatted).toBe('[Confidential - PCCM Access Only]');
      expect(masked.bankAccountNumber).toBe('••••••••');
      expect(masked.bankName).toBe('••••••••');
      expect(masked.bvn).toBe('•••••••••••');
      expect(masked.nationalId).toBe('•••••••••••');
      // Public fields remain intact
      expect(masked.fullName).toBe('Dr. Bukola Adeleke');
      expect(masked.jobTitle).toBe('Chief People Officer');
    });

    it('masks sensitive salary & banking for VIEWER', () => {
      const masked = maskSensitiveEmployeeData(viewerUser, rawPersonnelRecord);
      expect(masked.salary).toBeUndefined();
      expect(masked.salaryFormatted).toBe('[Confidential - PCCM Access Only]');
      expect(masked.bvn).toBe('•••••••••••');
    });
  });

  // 6. Backend/API Authorization Guard
  describe('6. Backend/API Authorization Guard (authorizeApiRequest)', () => {
    it('returns 401 for unauthenticated API requests', () => {
      const res = authorizeApiRequest(null, { action: 'manage_employees' });
      expect(res.success).toBe(false);
      expect(res.status).toBe(401);
      expect(res.error).toContain('Unauthorized');
    });

    it('returns 403 for unknown roles in API requests', () => {
      const res = authorizeApiRequest({ ...employeeTech, role: 'INTRUDER' as any }, { action: 'apply_leave' });
      expect(res.success).toBe(false);
      expect(res.status).toBe(403);
      expect(res.error).toContain('Forbidden: Unknown user role');
    });

    it('returns 403 when Employee attempts protected management endpoint', () => {
      const res = authorizeApiRequest(employeeTech, { module: 'recruitment', action: 'manage_recruitment' });
      expect(res.success).toBe(false);
      expect(res.status).toBe(403);
      expect(res.error).toBeDefined();
    });

    it('returns 403 when HR Staff attempts system-level settings API', () => {
      const res = authorizeApiRequest(hrUser, { module: 'settings', action: 'manage_settings' });
      expect(res.success).toBe(false);
      expect(res.status).toBe(403);
      expect(res.error).toContain('Admin personnel only');
    });

    it('returns 200 success for authorized Admin API requests', () => {
      const res = authorizeApiRequest(adminUser, { module: 'settings', action: 'manage_settings' });
      expect(res.success).toBe(true);
      expect(res.status).toBe(200);
    });

    it('returns 200 success for authorized Employee self-service API requests', () => {
      const res = authorizeApiRequest(employeeTech, { module: 'leave', action: 'apply_leave' });
      expect(res.success).toBe(true);
      expect(res.status).toBe(200);
    });
  });
});
