/**
 * Auth Context & Persona Switcher
 * Citadel People Hub
 * 
 * Allows instant simulation and testing of the 5 distinct roles and
 * verifies Role-Based Access Control (RBAC) across all Citadel entities.
 */

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { User, UserRole, RolePermissions } from '../types';
import { isLaravelApiConfigured, requestLaravel, setLaravelAccessToken } from '../services/laravelClient';

export interface PersonaOption {
  user: User;
  badgeLabel: string;
  description: string;
}

export const PRESET_PERSONAS: PersonaOption[] = [
  // 1. PCCM Super Admin (GEC Member / Primary HR Admin)
  {
    user: {
      id: 'emp-1',
      staffId: 'CGCC/004',
      name: 'Dr. Bukola Adeleke',
      email: 'b.adeleke@citadelcommunity.org',
      role: 'PCCM_SUPER_ADMIN',
      entityId: 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentId: 'dept-cgcc-pccm',
      departmentName: 'People, Culture & Change',
      jobTitle: 'People, Culture & Change Manager (PCCM)',
      avatarUrl: '',
      permissions: ['*'],
    },
    badgeLabel: 'PCCM Super Admin',
    description: 'Primary HR Admin & GEC custodian with cross-entity governance across CGCC, CSOG, and Holdings.',
  },

  // 2. Business Heads (GEC Members listed in Excel sheet)
  {
    user: {
      id: 'emp-ike',
      staffId: 'CGCC/001',
      name: 'Pastor Christian Ike',
      email: 'c.ike@thecitadelglobal.org',
      role: 'BUSINESS_HEAD',
      entityId: 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentId: 'dept-cgcc-fac',
      departmentName: 'Operations & Services Portfolio',
      jobTitle: 'Executive Pastor / Business Head (Operations)',
      avatarUrl: '',
      permissions: ['view:entity_employees', 'approve:entity_workflows', 'view:entity_reports'],
    },
    badgeLabel: 'Business Head (Operations)',
    description: 'CGCC Business Head (Excel structure): Facilities, Logistics, and Security managers report to him.',
  },
  {
    user: {
      id: 'emp-biola',
      staffId: 'CGCC/002',
      name: 'Pastor Biola Adeyoola',
      email: 'b.adeyoola@thecitadelglobal.org',
      role: 'BUSINESS_HEAD',
      entityId: 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentId: 'dept-cgcc-so',
      departmentName: 'Admin, Protocol & Governance',
      jobTitle: 'Pastor & Head of Administration / Business Head',
      avatarUrl: '',
      permissions: ['view:entity_employees', 'approve:entity_workflows', 'view:entity_reports'],
    },
    badgeLabel: 'Business Head (Admin & Protocol)',
    description: "CGCC Business Head (Excel structure): Church Admin & Operations, S.O.'s office, Protocol officers report to her.",
  },
  {
    user: {
      id: 'emp-segun',
      staffId: 'CGCC/003',
      name: 'Pastor Segun Bakare',
      email: 's.bakare@thecitadelglobal.org',
      role: 'BUSINESS_HEAD',
      entityId: 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentId: 'dept-cgcc-ict',
      departmentName: 'ICT & Shared Tech',
      jobTitle: 'Executive Pastor & ICT Director / Business Head',
      avatarUrl: '',
      permissions: ['view:entity_employees', 'approve:entity_workflows', 'view:entity_reports'],
    },
    badgeLabel: 'Business Head (ICT & Tech)',
    description: 'CGCC & Shared Tech Business Head (Excel structure): ICT Manager reports directly to him.',
  },
  {
    user: {
      id: 'emp-omoaholo',
      staffId: 'CSOG/001',
      name: 'Mr. Omoaholo Omoakhalen',
      email: 'o.omoakhalen@citadelschoolofgovernment.org',
      role: 'BUSINESS_HEAD',
      entityId: 'entity-csog',
      entityName: 'Citadel School of Government',
      departmentId: 'dept-csog-ops',
      departmentName: 'Executive Leadership & Governance',
      jobTitle: 'Executive Director / Business Head (CSOG)',
      avatarUrl: '',
      permissions: ['view:entity_employees', 'approve:entity_workflows', 'view:entity_reports'],
    },
    badgeLabel: 'Business Head (CSOG Director)',
    description: 'CSOG Business Head (Excel structure): Admin/Operations and Academic Liaison report directly to him.',
  },
  {
    user: {
      id: 'emp-fisayo',
      staffId: 'CH/001',
      name: 'Ms. Olufisayo Bakare',
      email: 'o.bakare@citadelholdings.ng',
      role: 'BUSINESS_HEAD',
      entityId: 'entity-holdings',
      entityName: 'Citadel Holdings',
      departmentId: 'dept-ch-book',
      departmentName: 'Commercial Operations & Ventures',
      jobTitle: 'Managing Director / Business Head (CEO_Holdings)',
      avatarUrl: '',
      permissions: ['view:entity_employees', 'approve:entity_workflows', 'view:entity_reports'],
    },
    badgeLabel: 'Business Head (Holdings CEO)',
    description: 'Citadel Holdings Business Head (Excel structure): Commercial Business Managers (Bookshop, Cafe, Workstation) report to her.',
  },

  // 3. Departmental Heads (HODs listed in Excel sheet)
  {
    user: {
      id: 'emp-2',
      staffId: 'CGCC/015',
      name: 'Femi Olatunji',
      email: 'f.olatunji@citadelcommunity.org',
      role: 'DEPARTMENT_HEAD',
      entityId: 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentId: 'dept-cgcc-ict',
      departmentName: 'ICT',
      jobTitle: 'Head of ICT & Digital Infrastructure',
      avatarUrl: '',
      permissions: ['view:dept_team', 'review:leave', 'manage:onboarding_tasks'],
    },
    badgeLabel: 'Dept Head (ICT)',
    description: 'Department Head for ICT. Reports to Pastor Segun Bakare. Reviews team leave, onboarding, and attendance.',
  },
  {
    user: {
      id: 'emp-anuforo',
      staffId: 'CGCC/008',
      name: 'Stephen Anuforo',
      email: 's.anuforo@thecitadelglobal.org',
      role: 'DEPARTMENT_HEAD',
      entityId: 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentId: 'dept-cgcc-fin',
      departmentName: 'Finance',
      jobTitle: 'Finance & Accounts Manager / Department Head',
      avatarUrl: '',
      permissions: ['view:dept_team', 'review:leave', 'manage:onboarding_tasks'],
    },
    badgeLabel: 'Dept Head (Finance)',
    description: 'Department Head for Finance (Excel structure): Accountants and Finance Officers report directly to him.',
  },
  {
    user: {
      id: 'emp-martins',
      staffId: 'CGCC/031',
      name: 'Engr. Segun Martins',
      email: 's.martins@thecitadelglobal.org',
      role: 'DEPARTMENT_HEAD',
      entityId: 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentId: 'dept-cgcc-fac',
      departmentName: 'Facilities',
      jobTitle: 'Head of Facilities & Maintenance',
      avatarUrl: '',
      permissions: ['view:dept_team', 'review:leave', 'manage:onboarding_tasks'],
    },
    badgeLabel: 'Dept Head (Facilities)',
    description: 'Department Head for Facilities. Reports to Pastor Christian Ike. Manages campus maintenance crew.',
  },
  {
    user: {
      id: 'emp-6',
      staffId: 'CH/018',
      name: 'Chef Kolawole Briggs',
      email: 'k.briggs@citadelholdings.ng',
      role: 'DEPARTMENT_HEAD',
      entityId: 'entity-holdings',
      entityName: 'Citadel Holdings',
      departmentId: 'dept-ch-cafe',
      departmentName: 'Cafe',
      jobTitle: 'Head of Cafe Operations & Hospitality',
      avatarUrl: '',
      permissions: ['view:dept_team', 'review:leave', 'manage:onboarding_tasks'],
    },
    badgeLabel: 'Dept Head (Cafe, Holdings)',
    description: 'Department Head for Citadel Holdings Cafe. Reports to Ms. Olufisayo Bakare (CEO Holdings).',
  },

  // 4. Employees (Self-Service Staff)
  {
    user: {
      id: 'emp-3',
      staffId: 'CGCC/072',
      name: 'Blessing Okafor',
      email: 'b.okafor@citadelcommunity.org',
      role: 'EMPLOYEE',
      entityId: 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentId: 'dept-cgcc-pccm',
      departmentName: 'People, Culture & Change',
      jobTitle: 'People & Culture Officer',
      avatarUrl: '',
      permissions: ['self:profile', 'self:leave', 'self:attendance', 'self:documents'],
    },
    badgeLabel: 'Employee (PCCM Officer)',
    description: 'Self-service employee in PCCM. Can apply for leave, clock in/out, view policies, and track approvals.',
  },
  {
    user: {
      id: 'emp-david',
      staffId: 'CGCC/088',
      name: 'David Adeleke',
      email: 'd.adeleke@thecitadelglobal.org',
      role: 'EMPLOYEE',
      entityId: 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentId: 'dept-cgcc-ict',
      departmentName: 'ICT',
      jobTitle: 'Senior Software Engineer / Team Lead',
      avatarUrl: '',
      permissions: ['self:profile', 'self:leave', 'self:attendance', 'self:documents'],
    },
    badgeLabel: 'Employee (Software Engineer)',
    description: 'Self-service employee in ICT team under Femi Olatunji. Can submit leave, view personal timesheet.',
  },
  {
    user: {
      id: 'emp-grace',
      staffId: 'CGCC/064',
      name: 'Grace Adekunle',
      email: 'g.adekunle@thecitadelglobal.org',
      role: 'EMPLOYEE',
      entityId: 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentId: 'dept-cgcc-fac',
      departmentName: 'Facilities',
      jobTitle: 'Facility Maintenance Officer',
      avatarUrl: '',
      permissions: ['self:profile', 'self:leave', 'self:attendance', 'self:documents'],
    },
    badgeLabel: 'Employee (Facility Officer)',
    description: 'Self-service employee in Facilities under Engr. Segun Martins. Can apply for leave and clock in.',
  },

  // 5. System Administrator
  {
    user: {
      id: 'emp-7',
      staffId: 'CGCC/094',
      name: 'Taiwo Adeyemi',
      email: 't.adeyemi@citadelcommunity.org',
      role: 'SYSTEM_ADMIN',
      entityId: 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentId: 'dept-cgcc-ict',
      departmentName: 'ICT',
      jobTitle: 'Senior Systems & Cloud Administrator',
      avatarUrl: '',
      permissions: ['system:config', 'system:integrations', 'system:logs'],
    },
    badgeLabel: 'System Administrator',
    description: 'Technical admin for hardware, Azure/M365, and Cloud Run. Restricted from sensitive HR salaries.',
  },
];

interface AuthContextType {
  currentUser: User;
  currentRole: UserRole;
  currentPersona: PersonaOption;
  selectedEntityFilter: string; // 'all' or entityId
  setSelectedEntityFilter: (entityId: string) => void;
  switchPersona: (roleOrId: UserRole | string) => void;
  backendEnabled: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  permissions: RolePermissions;
  canViewSensitiveData: boolean;
  canAccessAuditLogs: boolean;
  canManageEntities: boolean;
  canApproveLeave: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPersona, setCurrentPersona] = useState<PersonaOption>(PRESET_PERSONAS[0]);
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('all');
  const backendEnabled = isLaravelApiConfigured();
  const [isAuthenticated, setIsAuthenticated] = useState(!backendEnabled);

  useEffect(() => {
    if (!backendEnabled) return;
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setCurrentPersona(PRESET_PERSONAS[0]);
    };
    window.addEventListener('citadel:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('citadel:unauthorized', handleUnauthorized);
  }, [backendEnabled]);

  const switchPersona = (roleOrId: UserRole | string) => {
    if (backendEnabled) return;
    // Search first by user ID, then by role
    const found =
      PRESET_PERSONAS.find((p) => p.user.id === roleOrId) ||
      PRESET_PERSONAS.find((p) => p.user.role === roleOrId);
    if (found) {
      setCurrentPersona(found);
      if (found.user.role === 'PCCM_SUPER_ADMIN') {
        setSelectedEntityFilter('all');
      } else if (found.user.entityId) {
        setSelectedEntityFilter(found.user.entityId);
      }
    }
  };

  const login = async (email: string, password: string) => {
    const response = await requestLaravel<{
      token: string;
      user: {
        id: string;
        staffId: string | null;
        name: string;
        email: string;
        role: UserRole;
        entityId: string | null;
        entityName: string | null;
        departmentId: string | null;
        departmentName: string | null;
        jobTitle: string | null;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, device_name: 'Citadel People Hub Web' }),
    });
    if (!['PCCM_SUPER_ADMIN', 'BUSINESS_HEAD', 'DEPARTMENT_HEAD', 'EMPLOYEE', 'SYSTEM_ADMIN'].includes(response.user.role)) {
      throw new Error('Your account has an unsupported role. Contact the system administrator.');
    }

    setLaravelAccessToken(response.token);
    const user: User = {
      id: response.user.id,
      staffId: response.user.staffId || '',
      name: response.user.name,
      email: response.user.email,
      role: response.user.role,
      entityId: response.user.entityId || '',
      entityName: response.user.entityName || '',
      departmentId: response.user.departmentId || '',
      departmentName: response.user.departmentName || '',
      jobTitle: response.user.jobTitle || '',
      permissions: [],
    };
    setCurrentPersona({
      user,
      badgeLabel: response.user.role.replaceAll('_', ' '),
      description: `Authenticated account: ${response.user.email}`,
    });
    setSelectedEntityFilter(response.user.entityId || 'all');
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await requestLaravel('/auth/logout', { method: 'POST' });
    setLaravelAccessToken(null);
    setIsAuthenticated(false);
    setCurrentPersona(PRESET_PERSONAS[0]);
  };

  const permissions = useMemo<RolePermissions>(() => {
    const role = currentPersona.user.role;
    return {
      canManageEmployees: role === 'PCCM_SUPER_ADMIN',
      canViewAllEmployees: role === 'PCCM_SUPER_ADMIN' || role === 'SYSTEM_ADMIN',
      canViewSensitiveData: role === 'PCCM_SUPER_ADMIN', // Sensitive salaries/bank accounts strictly restricted to PCCM!
      canManageEntitiesAndDepts: role === 'PCCM_SUPER_ADMIN',
      canApproveLeave: role === 'PCCM_SUPER_ADMIN' || role === 'BUSINESS_HEAD' || role === 'DEPARTMENT_HEAD',
      canManageLeavePolicies: role === 'PCCM_SUPER_ADMIN',
      canViewAuditLogs: role === 'PCCM_SUPER_ADMIN' || role === 'SYSTEM_ADMIN',
      canManageOnboarding: role === 'PCCM_SUPER_ADMIN' || role === 'DEPARTMENT_HEAD',
      canManagePerformance: role === 'PCCM_SUPER_ADMIN' || role === 'BUSINESS_HEAD' || role === 'DEPARTMENT_HEAD',
      canManageDocuments: role === 'PCCM_SUPER_ADMIN',
      canConfigureIntegrations: role === 'PCCM_SUPER_ADMIN' || role === 'SYSTEM_ADMIN',
      canExportReports: role === 'PCCM_SUPER_ADMIN' || role === 'BUSINESS_HEAD',
    };
  }, [currentPersona.user.role]);

  const value = {
    currentUser: currentPersona.user,
    currentRole: currentPersona.user.role,
    currentPersona,
    backendEnabled,
    isAuthenticated,
    login,
    logout,
    selectedEntityFilter,
    setSelectedEntityFilter,
    switchPersona,
    permissions,
    canViewSensitiveData: permissions.canViewSensitiveData,
    canAccessAuditLogs: permissions.canViewAuditLogs,
    canManageEntities: permissions.canManageEntitiesAndDepts,
    canApproveLeave: permissions.canApproveLeave,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
