/**
 * Auth Context & Persona Switcher
 * Citadel People Hub
 * 
 * Allows instant simulation and testing of the 5 distinct roles and
 * verifies Role-Based Access Control (RBAC) across all Citadel entities.
 */

import React, { createContext, useContext, useState, useMemo } from 'react';
import { User, UserRole, RolePermissions } from '../types';

export interface PersonaOption {
  user: User;
  badgeLabel: string;
  description: string;
}

export const PRESET_PERSONAS: PersonaOption[] = [
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
    badgeLabel: 'PCCM (Super Admin)',
    description: 'Primary HR Admin with cross-entity governance across CGCC, CSOG, and Holdings.',
  },
  {
    user: {
      id: 'emp-4',
      staffId: 'CH/001',
      name: 'Pastor Emmanuel Durojaiye',
      email: 'e.durojaiye@citadelholdings.ng',
      role: 'BUSINESS_HEAD',
      entityId: 'entity-holdings',
      entityName: 'Citadel Holdings',
      departmentId: 'dept-ch-sales',
      departmentName: 'Sales & Business Development',
      jobTitle: 'Business Head / Group MD',
      avatarUrl: '',
      permissions: ['view:entity_employees', 'approve:entity_workflows', 'view:entity_reports'],
    },
    badgeLabel: 'Business Head',
    description: 'Entity-scoped leadership for Citadel Holdings (Bookshop, Cafe, Workstation, Asabi Aladire, Sales).',
  },
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
    badgeLabel: 'Dept Head (CGCC ICT)',
    description: 'Department-level leader reviewing ICT staff leaves, team performance, and onboarding.',
  },
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
    badgeLabel: 'Employee (Self-Service)',
    description: 'Standard employee with self-service leave requests, profile updates, and personal attendance.',
  },
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
  switchPersona: (role: UserRole) => void;
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

  const switchPersona = (role: UserRole) => {
    const found = PRESET_PERSONAS.find((p) => p.user.role === role);
    if (found) {
      setCurrentPersona(found);
    }
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
