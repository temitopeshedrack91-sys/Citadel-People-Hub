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
import { authService } from '../services/supabaseService';

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
  register: (email: string, password: string, name?: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  permissions: RolePermissions;
  canViewSensitiveData: boolean;
  canAccessAuditLogs: boolean;
  canManageEntities: boolean;
  canApproveLeave: boolean;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'email' | 'phone' | 'location' | 'bio' | 'avatarUrl'>>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPersona, setCurrentPersona] = useState<PersonaOption>(() => {
    // Load any persisted profile updates
    try {
      const stored = JSON.parse(localStorage.getItem('citadel_profile_updates') || '{}');
      if (Object.keys(stored).length > 0) {
        return {
          ...PRESET_PERSONAS[0],
          user: { ...PRESET_PERSONAS[0].user, ...stored },
        };
      }
    } catch {}
    return PRESET_PERSONAS[0];
  });
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('all');
  const backendEnabled = isLaravelApiConfigured();
  const [isAuthenticated, setIsAuthenticated] = useState(!backendEnabled);

  // Check Supabase session on mount
  useEffect(() => {
    let isMounted = true;
    authService.getCurrentUser().then((user) => {
      if (isMounted && user) {
        const matchingPersona = PRESET_PERSONAS.find((p) => p.user.email === user.email);
        if (matchingPersona) {
          setCurrentPersona(matchingPersona);
        } else {
          setCurrentPersona({
            user: {
              id: user.id,
              staffId: 'CGCC-APP',
              name: user.fullName || user.email.split('@')[0],
              email: user.email,
              role: (user.role as UserRole) || 'EMPLOYEE',
              entityId: 'entity-cgcc',
              entityName: 'Citadel Global Community Church (CGCC)',
              departmentId: 'dept-cgcc-pccm',
              departmentName: 'People, Culture & Change',
              jobTitle: user.role || 'Citadel Staff',
              avatarUrl: '',
              permissions: ['*'],
            },
            badgeLabel: user.role || 'Staff Member',
            description: `Authenticated user (${user.email}) via Supabase`,
          });
        }
        setIsAuthenticated(true);
      }
    });

    const { data: authListener } = authService.onAuthStateChange((user) => {
      if (user) {
        setIsAuthenticated(true);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

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

  const register = async (email: string, password: string, name?: string, role: string = 'EMPLOYEE') => {
    await authService.signUp(email, password, name, role);
    const user: User = {
      id: `usr-${Date.now()}`,
      staffId: 'CGCC-NEW',
      name: name || email.split('@')[0],
      email,
      role: (role as UserRole) || 'EMPLOYEE',
      entityId: 'entity-cgcc',
      entityName: 'Citadel Global Community Church (CGCC)',
      departmentId: 'dept-cgcc-pccm',
      departmentName: 'People, Culture & Change',
      jobTitle: role,
      permissions: ['*'],
    };
    setCurrentPersona({
      user,
      badgeLabel: role.replaceAll('_', ' '),
      description: `Registered Supabase account: ${email}`,
    });
    setIsAuthenticated(true);
  };

  const login = async (email: string, password: string) => {
    // Try Supabase Auth first
    try {
      const { user: supaUser } = await authService.signIn(email, password);
      if (supaUser) {
        const matching = PRESET_PERSONAS.find((p) => p.user.email === email);
        if (matching) {
          setCurrentPersona(matching);
        } else {
          const user: User = {
            id: supaUser.id,
            staffId: 'CGCC-APP',
            name: supaUser.user_metadata?.full_name || email.split('@')[0],
            email: supaUser.email || email,
            role: supaUser.user_metadata?.role || 'EMPLOYEE',
            entityId: 'entity-cgcc',
            entityName: 'Citadel Global Community Church (CGCC)',
            departmentId: 'dept-cgcc-pccm',
            departmentName: 'People, Culture & Change',
            jobTitle: supaUser.user_metadata?.role || 'Citadel Staff',
            permissions: [],
          };
          setCurrentPersona({
            user,
            badgeLabel: (supaUser.user_metadata?.role || 'EMPLOYEE').replaceAll('_', ' '),
            description: `Authenticated Supabase account: ${email}`,
          });
        }
        setIsAuthenticated(true);
        return;
      }
    } catch (supaErr: any) {
      if (!backendEnabled) {
        throw supaErr;
      }
    }

    // Fallback to Laravel backend if configured
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
    try {
      await authService.signOut();
    } catch {}
    if (backendEnabled) {
      try {
        await requestLaravel('/auth/logout', { method: 'POST' });
        setLaravelAccessToken(null);
      } catch {}
    }
    setIsAuthenticated(false);
    setCurrentPersona(PRESET_PERSONAS[0]);
  };

  const updateProfile = (updates: Partial<Pick<User, 'name' | 'email' | 'phone' | 'location' | 'bio' | 'avatarUrl'>>) => {
    setCurrentPersona((prev) => ({
      ...prev,
      user: { ...prev.user, ...updates },
    }));
    // Persist to localStorage so updates survive refreshes
    try {
      const stored = JSON.parse(localStorage.getItem('citadel_profile_updates') || '{}');
      const merged = { ...stored, ...updates };
      localStorage.setItem('citadel_profile_updates', JSON.stringify(merged));
    } catch {}
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
    register,
    logout,
    selectedEntityFilter,
    setSelectedEntityFilter,
    switchPersona,
    permissions,
    canViewSensitiveData: permissions.canViewSensitiveData,
    canAccessAuditLogs: permissions.canViewAuditLogs,
    canManageEntities: permissions.canManageEntitiesAndDepts,
    canApproveLeave: permissions.canApproveLeave,
    updateProfile,
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
