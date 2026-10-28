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
import { getRolePermissions } from '../utils/rbac';

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
      permissions: ['*'],
    },
    badgeLabel: 'PCCM Super Admin',
    description: 'Primary HR Admin & GEC custodian with cross-entity governance across CGCC, CSOG, and Holdings.',
  },

  // 2. Head of Technology & Systems (Line Manager / System Admin)
  {
    user: {
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
      permissions: ['*'],
    },
    badgeLabel: 'Head of Technology',
    description: 'Technical Systems Administrator and Line Manager. Biometric hardware sync, API gateways, and department approvals.',
  },

  // 3. Business Head (Group Executive Council / Leadership)
  {
    user: {
      id: 'emp-0',
      staffId: 'CGCC-000',
      name: 'Pastor Tunde Bakare',
      email: 'pastor.bakare@citadel.ng',
      role: 'BUSINESS_HEAD',
      entityId: 'CGCC',
      entityName: 'Citadel Global Community Church',
      departmentId: 'dept-cgcc-pastoral',
      departmentName: 'Pastoral & Ministry Operations',
      jobTitle: 'President & General Overseer',
      avatarUrl: '',
      permissions: ['*'],
    },
    badgeLabel: 'Business Head',
    description: 'Group Executive Council leadership. High-level entity oversight, strategic report exports, and executive sign-offs.',
  },

  // 4. Lead Product Designer (Kanban Team Lead)
  {
    user: {
      id: 'emp-3',
      staffId: 'CGCC-003',
      name: 'Nadia Safitri',
      email: 'nadia@citadel.ng',
      role: 'EMPLOYEE',
      entityId: 'CGCC',
      entityName: 'Citadel Global Community Church',
      departmentId: 'dept-cgcc-tech',
      departmentName: 'Technology & Systems',
      jobTitle: 'Lead Product Designer',
      avatarUrl: '',
      permissions: ['self_service'],
    },
    badgeLabel: 'Product Designer',
    description: 'UI/UX design lead for Citadel People Hub. Project board collaborator, tasks management, and employee self-service.',
  },

  // 5. Senior Android Engineer (Sprint Engineer)
  {
    user: {
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
    },
    badgeLabel: 'Senior Android Engineer',
    description: 'Mobile platform engineer. Sprint task tracking, shift check-ins, and leave requests.',
  },

  // 6. QA & Review Lead (Quality Assurance)
  {
    user: {
      id: 'emp-5',
      staffId: 'CGCC-005',
      name: 'Sinta Lubis',
      email: 'sinta@citadel.ng',
      role: 'EMPLOYEE',
      entityId: 'CGCC',
      entityName: 'Citadel Global Community Church',
      departmentId: 'dept-cgcc-tech',
      departmentName: 'Technology & Systems',
      jobTitle: 'QA & Review Lead',
      avatarUrl: '',
      permissions: ['self_service'],
    },
    badgeLabel: 'QA & Review Lead',
    description: 'Quality assurance and review lead. Sprint task verification, bug reporting, and leave management.',
  },

  // 7. Backend & Offline Systems Lead (Architecture)
  {
    user: {
      id: 'emp-6',
      staffId: 'CGCC-006',
      name: 'Jonathan Tan',
      email: 'jonathan@citadel.ng',
      role: 'EMPLOYEE',
      entityId: 'CGCC',
      entityName: 'Citadel Global Community Church',
      departmentId: 'dept-cgcc-tech',
      departmentName: 'Technology & Systems',
      jobTitle: 'Backend & Offline Systems Lead',
      avatarUrl: '',
      permissions: ['self_service'],
    },
    badgeLabel: 'Backend Lead',
    description: 'Core platform architect for Supabase PostgreSQL syncing, offline cache, and API resilience.',
  },

  // 8. Data & Growth Analyst (People & Culture Intelligence)
  {
    user: {
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
    },
    badgeLabel: 'Data Analyst',
    description: 'Workforce analytics, headcount telemetry, and employee self-service.',
  },

  // 9. Read-Only Viewer / External Auditor
  {
    user: {
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
    },
    badgeLabel: 'Read-Only Viewer',
    description: 'Read-only compliance auditor. Public directory, documents, reports, and calendar with zero mutation privileges.',
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
  canManageSettings: boolean;
  isReadOnly: boolean;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'email' | 'phone' | 'location' | 'bio' | 'avatarUrl'>>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      if (localStorage.getItem('citadel_logged_out') === 'true') {
        return false;
      }
      return localStorage.getItem('citadel_authenticated') === 'true';
    } catch {}
    return false;
  });

  // Check Supabase session on mount
  useEffect(() => {
    let isMounted = true;
    authService.getCurrentUser().then((user) => {
      try {
        if (localStorage.getItem('citadel_logged_out') === 'true') {
          return;
        }
      } catch {}
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
        try {
          localStorage.setItem('citadel_authenticated', 'true');
          localStorage.removeItem('citadel_logged_out');
        } catch {}
        setIsAuthenticated(true);
      }
    });

    const { data: authListener } = authService.onAuthStateChange((user) => {
      if (user) {
        try {
          localStorage.setItem('citadel_authenticated', 'true');
          localStorage.removeItem('citadel_logged_out');
        } catch {}
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
    try {
      localStorage.removeItem('citadel_logged_out');
      localStorage.setItem('citadel_authenticated', 'true');
    } catch {}
    setIsAuthenticated(true);
  };

  const register = async (email: string, password: string, name?: string, role: string = 'EMPLOYEE') => {
    const signupData = await authService.signUp(email, password, name, role);
    const userId = signupData?.user?.id || `usr-${Date.now()}`;
    const user: User = {
      id: userId,
      staffId: 'CGCC-NEW',
      name: name || email.split('@')[0],
      email: email.trim().toLowerCase(),
      role: (role as UserRole) || 'EMPLOYEE',
      entityId: 'CGCC',
      entityName: 'Citadel Global Community Church',
      departmentId: 'dept-cgcc-pccm',
      departmentName: 'People & Culture',
      jobTitle: role.replaceAll('_', ' '),
      permissions: ['*'],
    };
    setCurrentPersona({
      user,
      badgeLabel: role.replaceAll('_', ' '),
      description: `Registered Supabase account: ${email}`,
    });
    try {
      localStorage.removeItem('citadel_logged_out');
      localStorage.setItem('citadel_authenticated', 'true');
    } catch {}
    setIsAuthenticated(true);
  };

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    // Try Supabase Auth first
    try {
      const { user: supaUser } = await authService.signIn(cleanEmail, password);
      if (supaUser) {
        const matching = PRESET_PERSONAS.find(
          (p) =>
            p.user.email.toLowerCase() === cleanEmail ||
            (cleanEmail === 'dr.adeleke@citadel.ng' && p.user.email.includes('adeleke')) ||
            (cleanEmail.startsWith('b.adeleke') && p.user.email.includes('adeleke'))
        );
        if (matching) {
          setCurrentPersona(matching);
          if (matching.user.role === 'PCCM_SUPER_ADMIN') {
            setSelectedEntityFilter('all');
          } else if (matching.user.entityId) {
            setSelectedEntityFilter(matching.user.entityId);
          }
        } else {
          const userMeta = supaUser.user_metadata || {};
          const user: User = {
            id: supaUser.id,
            staffId: userMeta.staff_id || 'CGCC-APP',
            name: userMeta.full_name || email.split('@')[0],
            email: supaUser.email || cleanEmail,
            role: (userMeta.role as UserRole) || 'EMPLOYEE',
            entityId: userMeta.entity_id || 'CGCC',
            entityName: userMeta.entity_name || 'Citadel Global Community Church',
            departmentId: userMeta.department || 'People & Culture',
            departmentName: userMeta.department || 'People & Culture',
            jobTitle: userMeta.job_title || userMeta.role || 'Citadel Staff',
            permissions: [],
          };
          setCurrentPersona({
            user,
            badgeLabel: (userMeta.role || 'EMPLOYEE').replaceAll('_', ' '),
            description: `Authenticated Supabase account: ${cleanEmail}`,
          });
        }
        try {
          localStorage.removeItem('citadel_logged_out');
          localStorage.setItem('citadel_authenticated', 'true');
        } catch {}
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
    try {
      localStorage.removeItem('citadel_logged_out');
      localStorage.setItem('citadel_authenticated', 'true');
    } catch {}
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      localStorage.setItem('citadel_logged_out', 'true');
      localStorage.removeItem('citadel_authenticated');
    } catch {}
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
    return getRolePermissions(currentPersona.user.role);
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
    canManageSettings: permissions.canManageSettings,
    isReadOnly: permissions.isReadOnly,
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
