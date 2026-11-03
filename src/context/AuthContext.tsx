/**
 * Authentication Context & Session State Manager
 *
 * Coordinates user session state, Laravel Sanctum Bearer token synchronization,
 * persona switching in local development, and real-time permission derivation
 * across all Citadel entities and departments.
 */

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { User, UserRole, RolePermissions } from '../types';
import { getLaravelAccessToken, isLaravelApiConfigured, requestLaravel, requestLaravelData, setLaravelAccessToken } from '../services/laravelClient';
import { authService, type AuthUser } from '../services/supabaseService';
import { getRolePermissions } from '../utils/rbac';
import { canUseLocalPersonaAuthentication, canUseSupabaseDirectAccess, shouldUseLaravelBackend } from '../utils/authMode';

export interface PersonaOption {
  user: User;
  badgeLabel: string;
  description: string;
}

export const PRESET_PERSONAS: PersonaOption[] = import.meta.env.DEV ? [
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
] : [];

const DEFAULT_PERSONA: PersonaOption = {
  user: {
    id: '',
    staffId: '',
    name: 'Staff Member',
    email: '',
    role: 'EMPLOYEE',
    entityId: '',
    entityName: '',
    departmentId: '',
    departmentName: '',
    jobTitle: 'Employee',
    avatarUrl: '',
    permissions: ['self_service'],
  },
  badgeLabel: 'Employee',
  description: 'Employee self-service account.',
};

const SUPPORTED_ROLES: UserRole[] = [
  'ADMIN',
  'HR_STAFF',
  'EMPLOYEE',
  'VIEWER',
  'PCCM_SUPER_ADMIN',
  'BUSINESS_HEAD',
  'DEPARTMENT_HEAD',
  'SYSTEM_ADMIN',
];

function resolveSupabaseRole(role?: string | null): UserRole {
  const normalizedRole = role?.trim().toUpperCase();
  return normalizedRole && SUPPORTED_ROLES.includes(normalizedRole as UserRole)
    ? normalizedRole as UserRole
    : 'EMPLOYEE';
}

function createSupabasePersona(authUser: AuthUser): PersonaOption {
  const role = resolveSupabaseRole(authUser.role);
  return {
    user: {
      ...DEFAULT_PERSONA.user,
      id: authUser.id,
      name: authUser.fullName || authUser.email.split('@')[0],
      email: authUser.email,
      role,
      jobTitle: role === 'EMPLOYEE' ? 'Employee' : role.replaceAll('_', ' '),
    },
    badgeLabel: role.replaceAll('_', ' '),
    description: `Authenticated Supabase account: ${authUser.email}`,
  };
}

function createLaravelPersona(user: {
  id: string;
  userId?: string;
  employeeId?: string | null;
  staffId: string | null;
  name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  role: UserRole;
  entityId: string | null;
  entityName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  jobTitle: string | null;
}): PersonaOption {
  return {
    user: {
      id: user.id,
      userId: user.userId,
      employeeId: user.employeeId || undefined,
      staffId: user.staffId || '',
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      location: user.location || undefined,
      role: user.role,
      entityId: user.entityId || '',
      entityName: user.entityName || '',
      departmentId: user.departmentId || '',
      departmentName: user.departmentName || '',
      jobTitle: user.jobTitle || '',
      avatarUrl: '',
      permissions: [],
    },
    badgeLabel: user.role.replaceAll('_', ' '),
    description: `Authenticated account: ${user.email}`,
  };
}

function sanitizeProfileUpdates(value: unknown): Partial<Pick<User, 'name' | 'email' | 'phone' | 'location' | 'bio' | 'avatarUrl'>> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const stored = value as Record<string, unknown>;
  const allowedFields = ['name', 'email', 'phone', 'location', 'bio', 'avatarUrl'] as const;
  return Object.fromEntries(
    allowedFields.flatMap((field) => typeof stored[field] === 'string' ? [[field, stored[field]]] : [])
  ) as Partial<Pick<User, 'name' | 'email' | 'phone' | 'location' | 'bio' | 'avatarUrl'>>;
}

/**
 * Contract exposing current session identity, permissions, and authentication operations.
 */
interface AuthContextType {
  currentUser: User;
  currentRole: UserRole;
  currentPersona: PersonaOption;
  selectedEntityFilter: string; // 'all' or entityId
  setSelectedEntityFilter: (entityId: string) => void;
  switchPersona: (roleOrId: UserRole | string) => boolean;
  backendEnabled: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  permissions: RolePermissions;
  canViewSensitiveData: boolean;
  canAccessAuditLogs: boolean;
  canManageEntities: boolean;
  canApproveLeave: boolean;
  canManageSettings: boolean;
  isReadOnly: boolean;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'email' | 'phone' | 'location' | 'bio' | 'avatarUrl'>>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * React Provider wrapping the application to manage session tokens,
 * user persona hydration from Laravel or Supabase, and dynamic RBAC evaluation.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const backendEnabled = shouldUseLaravelBackend(import.meta.env.PROD, isLaravelApiConfigured());
  const supabaseAuthEnabled = canUseSupabaseDirectAccess(
    import.meta.env.DEV,
    backendEnabled,
    import.meta.env.VITE_ENABLE_SUPABASE_DIRECT_DEV_ACCESS === 'true'
  );
  const localPersonaAuthenticationEnabled = canUseLocalPersonaAuthentication(
    import.meta.env.DEV,
    backendEnabled,
    import.meta.env.VITE_ENABLE_LOCAL_DEMO_AUTH === 'true'
  );
  const defaultPersona = localPersonaAuthenticationEnabled ? PRESET_PERSONAS[0] || DEFAULT_PERSONA : DEFAULT_PERSONA;
  const [currentPersona, setCurrentPersona] = useState<PersonaOption>(() => {
    const basePersona = localPersonaAuthenticationEnabled ? PRESET_PERSONAS[0] || DEFAULT_PERSONA : DEFAULT_PERSONA;
    try {
      const stored = sanitizeProfileUpdates(JSON.parse(localStorage.getItem('citadel_profile_updates') || '{}'));
      if (Object.keys(stored).length > 0) {
        return {
          ...basePersona,
          user: { ...basePersona.user, ...stored },
        };
      }
    } catch {}
    return basePersona;
  });
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('all');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (!localPersonaAuthenticationEnabled) {
      return false;
    }
    try {
      if (localStorage.getItem('citadel_logged_out') === 'true') {
        return false;
      }
      const stored = localStorage.getItem('citadel_authenticated');
      if (stored === 'true') {
        return true;
      }
      if (stored === 'false') {
        return false;
      }
    } catch {}
    return false;
  });

  // Laravel is the canonical auth provider when configured. A Supabase session
  // cannot authenticate requests to the Sanctum-protected API.
  useEffect(() => {
    let isMounted = true;

    const storedAuth = localStorage.getItem('citadel_authenticated');

    // If user is already marked as authenticated in localStorage, preserve that state
    // and only set up the auth listener without overriding the stored state
    if (storedAuth === 'true') {
      // Set up auth state listener but don't override the authenticated state
      const { data: authListener } = authService.onAuthStateChange((user) => {
        if (user) {
          setCurrentPersona(createSupabasePersona(user));
          try {
            localStorage.setItem('citadel_authenticated', 'true');
            localStorage.removeItem('citadel_logged_out');
          } catch {}
          setIsAuthenticated(true);
        } else if (!localPersonaAuthenticationEnabled) {
          setCurrentPersona(DEFAULT_PERSONA);
          setIsAuthenticated(false);
        }
      });

      return () => {
        isMounted = false;
        authListener?.subscription.unsubscribe();
      };
    }

    // Only run auth backend checks if not already authenticated from storage
    if (backendEnabled) {
      const token = getLaravelAccessToken();
      if (!token) {
        setIsAuthenticated(false);
        return () => { isMounted = false; };
      }

      requestLaravel<{ user: Parameters<typeof createLaravelPersona>[0] }>('/auth/user')
        .then(({ user }) => {
          if (!isMounted) return;
          setCurrentPersona(createLaravelPersona(user));
          setSelectedEntityFilter(user.entityId || 'all');
          setIsAuthenticated(true);
          try {
            localStorage.setItem('citadel_authenticated', 'true');
            localStorage.removeItem('citadel_logged_out');
          } catch {}
        })
        .catch(() => {
          if (!isMounted) return;
          setLaravelAccessToken(null);
          setCurrentPersona(defaultPersona);
          setIsAuthenticated(false);
        });

      return () => { isMounted = false; };
    }

    if (!supabaseAuthEnabled) {
      setIsAuthenticated(false);
      return () => { isMounted = false; };
    }

    authService.getCurrentUser().then((user) => {
      try {
        if (localStorage.getItem('citadel_logged_out') === 'true') {
          return;
        }
      } catch {}
      if (isMounted && user) {
        setCurrentPersona(createSupabasePersona(user));
        try {
          localStorage.setItem('citadel_authenticated', 'true');
          localStorage.removeItem('citadel_logged_out');
        } catch {}
        setIsAuthenticated(true);
      } else if (isMounted && !localPersonaAuthenticationEnabled) {
        setIsAuthenticated(false);
      }
    });

    const { data: authListener } = authService.onAuthStateChange((user) => {
      if (user) {
        setCurrentPersona(createSupabasePersona(user));
        try {
          localStorage.setItem('citadel_authenticated', 'true');
          localStorage.removeItem('citadel_logged_out');
        } catch {}
        setIsAuthenticated(true);
      } else if (!localPersonaAuthenticationEnabled) {
        setCurrentPersona(DEFAULT_PERSONA);
        setIsAuthenticated(false);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [backendEnabled, defaultPersona, localPersonaAuthenticationEnabled, supabaseAuthEnabled]);

  useEffect(() => {
    if (!backendEnabled) return;
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setCurrentPersona(defaultPersona);
    };
    window.addEventListener('citadel:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('citadel:unauthorized', handleUnauthorized);
  }, [backendEnabled, defaultPersona]);

  const switchPersona = (roleOrId: UserRole | string): boolean => {
    if (!localPersonaAuthenticationEnabled) {
      return false;
    }

    // Search first by user ID, then by role
    const found =
      PRESET_PERSONAS.find((p) => p.user.id === roleOrId) ||
      PRESET_PERSONAS.find((p) => p.user.role === roleOrId);
    if (!found) {
      return false;
    }

    setCurrentPersona(found);
    if (found.user.role === 'PCCM_SUPER_ADMIN') {
      setSelectedEntityFilter('all');
    } else if (found.user.entityId) {
      setSelectedEntityFilter(found.user.entityId);
    }
    try {
      localStorage.removeItem('citadel_logged_out');
      localStorage.setItem('citadel_authenticated', 'true');
    } catch {}
    setIsAuthenticated(true);
    return true;
  };

  const register = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ requiresEmailConfirmation: boolean }> => {
    if (backendEnabled) {
      throw new Error('New accounts must be provisioned by an administrator while the Laravel API is active.');
    }

    if (!supabaseAuthEnabled) {
      throw new Error('Account registration requires the Laravel API or explicit local Supabase development access.');
    }

    const signupData = await authService.signUp(email, password, name);
    if (!signupData.user) {
      throw new Error('Account registration did not return a user. Please try again.');
    }

    if (!signupData.session) {
      return { requiresEmailConfirmation: true };
    }

    const authenticatedUser = await authService.getCurrentUser();
    if (!authenticatedUser) {
      throw new Error('The new account is not available yet. Confirm your work email, then sign in.');
    }

    setCurrentPersona(createSupabasePersona(authenticatedUser));
    try {
      localStorage.removeItem('citadel_logged_out');
      localStorage.setItem('citadel_authenticated', 'true');
    } catch {}
    setIsAuthenticated(true);
    return { requiresEmailConfirmation: false };
  };

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (backendEnabled) {
      const response = await requestLaravel<{
        token: string;
        user: Parameters<typeof createLaravelPersona>[0];
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password, device_name: 'Citadel People Hub Web' }),
      });

      if (!SUPPORTED_ROLES.includes(response.user.role)) {
        throw new Error('Your account has an unsupported role. Contact the system administrator.');
      }

      setLaravelAccessToken(response.token);
      setCurrentPersona(createLaravelPersona(response.user));
      setSelectedEntityFilter(response.user.entityId || 'all');
      try {
        localStorage.removeItem('citadel_logged_out');
        localStorage.setItem('citadel_authenticated', 'true');
      } catch {}
      setIsAuthenticated(true);
      return;
    }

    if (!supabaseAuthEnabled) {
      throw new Error('Sign-in requires the Laravel API or explicit local Supabase development access.');
    }

    const { user: supabaseUser } = await authService.signIn(cleanEmail, password);
    if (!supabaseUser) {
      throw new Error('Sign-in failed. Please check your credentials and try again.');
    }
    const authenticatedUser = await authService.getCurrentUser();
    if (!authenticatedUser) {
      throw new Error('Your account profile could not be loaded. Please contact the system administrator.');
    }

    const persona = createSupabasePersona(authenticatedUser);
    setCurrentPersona(persona);
    if (persona.user.role === 'PCCM_SUPER_ADMIN') {
      setSelectedEntityFilter('all');
    }
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
    if (supabaseAuthEnabled) {
      try {
        await authService.signOut();
      } catch {}
    }
    if (backendEnabled) {
      try {
        await requestLaravel('/auth/logout', { method: 'POST' });
      } catch {}
      setLaravelAccessToken(null);
    }
    setIsAuthenticated(false);
    setCurrentPersona(defaultPersona);
  };

  const updateProfile = async (updates: Partial<Pick<User, 'name' | 'email' | 'phone' | 'location' | 'bio' | 'avatarUrl'>>) => {
    const safeUpdates = sanitizeProfileUpdates(updates);
    if (backendEnabled) {
      const unsupportedFieldChanged = (
        safeUpdates.name !== undefined && safeUpdates.name !== currentPersona.user.name
      ) || (
        safeUpdates.email !== undefined && safeUpdates.email !== currentPersona.user.email
      ) || safeUpdates.bio !== undefined || safeUpdates.avatarUrl !== undefined;
      if (unsupportedFieldChanged) {
        throw new Error('Name, work email, bio, and profile photo changes require an approved HR account workflow.');
      }
      const profile = await requestLaravelData<{ phone: string | null; location: string | null }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          phone: safeUpdates.phone ?? null,
          location: safeUpdates.location ?? null,
        }),
      });
      setCurrentPersona((previous) => ({
        ...previous,
        user: {
          ...previous.user,
          phone: profile.phone || undefined,
          location: profile.location || undefined,
        },
      }));
      return;
    }

    if (supabaseAuthEnabled) {
      throw new Error('Profile updates are not configured for the Supabase development adapter.');
    }

    setCurrentPersona((prev) => ({
      ...prev,
      user: { ...prev.user, ...safeUpdates },
    }));
    // Persist to localStorage so updates survive refreshes
    try {
      const stored = JSON.parse(localStorage.getItem('citadel_profile_updates') || '{}');
      const merged = { ...sanitizeProfileUpdates(stored), ...safeUpdates };
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

/**
 * React hook to consume authentication state, active user profile, and RBAC permissions.
 *
 * @throws {Error} If consumed outside of an `AuthProvider` tree.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
