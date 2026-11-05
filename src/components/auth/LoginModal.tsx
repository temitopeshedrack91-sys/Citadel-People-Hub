import React, { useState } from 'react';
import {
  Shield,
  UserCheck,
  CheckCircle2,
  Lock,
  X,
  Building,
  ArrowRight,
  Sparkles,
  UserPlus,
  LogIn,
  Copy,
  Check,
  Key,
  ShieldCheck,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth, PRESET_PERSONAS } from '../../context/AuthContext';
import { CitadelLogo } from '../brand/CitadelLogo';
import { UserRole } from '../../types';
import { canUseLocalPersonaAuthentication } from '../../utils/authMode';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  required?: boolean;
  initialTab?: 'signin' | 'register' | 'personas';
}

const DEMO_CREDENTIALS: {
  email: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  jobTitle: string;
  department: string;
  password: string;
  color: string;
  permissions: string[];
}[] = import.meta.env.DEV ? [
  {
    email: 'dr.adeleke@citadel.ng',
    name: 'Dr. Bukola Adeleke',
    role: 'PCCM_SUPER_ADMIN',
    roleLabel: 'PCCM Super Admin',
    jobTitle: 'Chief People Officer',
    department: 'People & Culture',
    password: 'Password123!',
    color: 'bg-[#083E34] text-amber-300',
    permissions: [
      'Full cross-entity administration',
      'Confidential salary & sensitive records',
      'Staff enrollment & dossier exports',
      'Leave policy rules & approvals',
      'Full compliance audit trail access',
    ],
  },
  {
    email: 'femi.olatunji@citadel.ng',
    name: 'Engr. Femi Olatunji',
    role: 'SYSTEM_ADMIN',
    roleLabel: 'Head of Technology',
    jobTitle: 'Head of Technology & Systems',
    department: 'Technology & Systems',
    password: 'Password123!',
    color: 'bg-blue-600 text-white',
    permissions: [
      'Biometric hardware & terminal telemetry',
      'API endpoints & integration nodes',
      'System & technical audit logs',
      'Technology department approvals',
    ],
  },
  {
    email: 'pastor.bakare@citadel.ng',
    name: 'Pastor Tunde Bakare',
    role: 'BUSINESS_HEAD',
    roleLabel: 'Business Head',
    jobTitle: 'President & General Overseer',
    department: 'Pastoral & Ministry Operations',
    password: 'Password123!',
    color: 'bg-[#D97706] text-white',
    permissions: [
      'Group Executive Council oversight',
      'Executive performance & board reviews',
      'Strategic workforce report exports',
      'Entity-level sign-offs',
    ],
  },
  {
    email: 'nadia@citadel.ng',
    name: 'Nadia Safitri',
    role: 'EMPLOYEE',
    roleLabel: 'Lead Product Designer',
    jobTitle: 'Lead Product Designer',
    department: 'Technology & Systems',
    password: 'Password123!',
    color: 'bg-amber-500 text-slate-900',
    permissions: [
      'Employee self-service portal',
      'Projects Kanban board collaboration',
      'Leave application submissions',
      'Attendance biometric daily summaries',
    ],
  },
  {
    email: 'bayu@citadel.ng',
    name: 'Bayu Wirawan',
    role: 'EMPLOYEE',
    roleLabel: 'Senior Android Engineer',
    jobTitle: 'Senior Android Engineer',
    department: 'Technology & Systems',
    password: 'Password123!',
    color: 'bg-emerald-600 text-white',
    permissions: [
      'Employee self-service portal',
      'Sprint 14 task ownership & updates',
      'Leave requests & balance tracking',
      'Gatehouse biometric check-ins',
    ],
  },
  {
    email: 'sinta@citadel.ng',
    name: 'Sinta Lubis',
    role: 'EMPLOYEE',
    roleLabel: 'QA & Review Lead',
    jobTitle: 'QA & Review Lead',
    department: 'Technology & Systems',
    password: 'Password123!',
    color: 'bg-purple-600 text-white',
    permissions: [
      'Employee self-service portal',
      'Task QA review & verification',
      'Bug reporting & project boards',
      'Attendance daily summaries & self-service',
    ],
  },
  {
    email: 'jonathan@citadel.ng',
    name: 'Jonathan Tan',
    role: 'EMPLOYEE',
    roleLabel: 'Backend Systems Lead',
    jobTitle: 'Backend & Offline Systems Lead',
    department: 'Technology & Systems',
    password: 'Password123!',
    color: 'bg-cyan-600 text-white',
    permissions: [
      'Employee self-service portal',
      'Supabase database tasks & syncing',
      'Shift schedules & leave requests',
      'Team notes & handovers',
    ],
  },
  {
    email: 'raka@citadel.ng',
    name: 'Raka Aditya',
    role: 'EMPLOYEE',
    roleLabel: 'Data & Growth Analyst',
    jobTitle: 'Data & Growth Analyst',
    department: 'People & Culture',
    password: 'Password123!',
    color: 'bg-[#D4AF37] text-slate-950 font-bold',
    permissions: [
      'Employee self-service portal',
      'People analytics & census reports',
      'Leave applications & balances',
      'Staff directory & presence monitoring',
    ],
  },
  {
    email: 'grace.okafor@citadel.ng',
    name: 'Grace Okafor',
    role: 'VIEWER',
    roleLabel: 'Read-Only Viewer',
    jobTitle: 'Compliance Auditor (Viewer)',
    department: 'Audit & Governance',
    password: 'Password123!',
    color: 'bg-zinc-800 text-zinc-100 font-bold',
    permissions: [
      'Read-only directory & documents',
      'Workforce & census reports inspection',
      'Shared calendar & announcement view',
      'Strictly zero mutation privileges',
    ],
  },
] : [];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  required = false,
  initialTab = 'signin',
}) => {
  const { currentPersona, switchPersona, isAuthenticated, login, register, logout, backendEnabled } = useAuth();
  const localDemoAuthenticationEnabled = canUseLocalPersonaAuthentication(
    import.meta.env.DEV,
    backendEnabled,
    import.meta.env.VITE_ENABLE_LOCAL_DEMO_AUTH === 'true'
  );
  const initialVisibleTab = (
    (backendEnabled && initialTab === 'register')
    || (!localDemoAuthenticationEnabled && initialTab === 'personas')
  ) ? 'signin' : initialTab;
  const [tab, setTab] = useState<'signin' | 'register' | 'personas'>(initialVisibleTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleQuickFill = (cred: (typeof DEMO_CREDENTIALS)[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setErrorMessage('');
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await login(email, password);
      setPassword('');
      setSuccessMessage(`Signed in as ${email}!`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to sign in. Please verify your email and password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const result = await register(email, password, name);
      setPassword('');
      if (result.requiresEmailConfirmation) {
        setSuccessMessage('Account created. Confirm your work email before signing in.');
      } else {
        setSuccessMessage(`Account created for ${name || email}!`);
        setTimeout(() => onClose(), 800);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Registration failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectDemoSignIn = async (cred: (typeof DEMO_CREDENTIALS)[0]) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await login(cred.email, cred.password);
      setSuccessMessage(`Signed in as ${cred.name} (${cred.roleLabel})!`);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (error) {
      if (localDemoAuthenticationEnabled && switchPersona(cred.role)) {
        setSuccessMessage(`Switched to ${cred.name} (${cred.roleLabel})`);
        setTimeout(() => onClose(), 600);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in with this demo account.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await logout();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-6 flex flex-col max-h-[92vh]">
        {/* Modal Branded Header */}
        <div className="bg-[#0A1E3F] text-white p-5 sm:p-6 relative border-b border-blue-900/40 shrink-0">
          {!required && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Official Citadel Logo */}
          <div className="flex justify-center mb-2.5">
            <CitadelLogo variant="hub" colorMode="dark" className="h-9 sm:h-10" />
          </div>

          <div className="text-center max-w-md mx-auto">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Citadel People Hub
            </h2>
            <p className="text-xs text-[#D4AF37] mt-0.5 font-medium">
              {backendEnabled ? 'Citadel API Authentication' : 'Employee Access & Role-Based Permissions'}
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-center gap-1.5 mt-4 bg-[#06152D] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              data-testid="auth-tab-signin"
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'signin'
                  ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              data-testid="auth-tab-register"
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'register'
                  ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
            {localDemoAuthenticationEnabled && <button
              type="button"
              onClick={() => {
                setTab('personas');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              data-testid="auth-tab-personas"
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'personas'
                  ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Demo Users &amp; Roles</span>
            </button>}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          {successMessage && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 animate-fade-in">
              {errorMessage}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: SIGN IN                                           */}
          {/* ======================================================== */}
          {tab === 'signin' && (
            <div className="space-y-5">
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Work Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. dr.adeleke@citadel.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Password</label>
                    {localDemoAuthenticationEnabled && <span className="text-[11px] text-slate-400">Default: Password123!</span>}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-10 text-xs sm:text-sm text-slate-900 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Toggle password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 border border-[#C59B27] disabled:opacity-60 cursor-pointer transition shadow-xs flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? 'Authenticating...' : `Sign In with ${backendEnabled ? 'Citadel' : 'Supabase'}`}</span>
                </button>
              </form>

              {/* Development-only demo credential fill selector */}
              {localDemoAuthenticationEnabled && (
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Quick Fill Demo Credentials</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Click to fill email &amp; password</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEMO_CREDENTIALS.map((cred) => (
                    <button
                      key={cred.email}
                      type="button"
                      onClick={() => handleQuickFill(cred)}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-[#D4AF37] hover:bg-[#FAF5EB]/40 text-left transition flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${cred.color}`}
                      >
                        {cred.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-900 text-xs truncate group-hover:text-[#083E34]">
                            {cred.name}
                          </span>
                          <span className="text-[9px] font-extrabold px-1 rounded bg-slate-100 text-slate-700 shrink-0">
                            {cred.roleLabel.split(' ')[0]}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{cred.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: REGISTER NEW USER                                  */}
          {/* ======================================================== */}
          {tab === 'register' && !backendEnabled && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pastor David Adeleke"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. david.adeleke@citadel.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none"
                />
              </div>

              <p className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
                New accounts receive employee access. An administrator assigns organization, department, and elevated permissions after verification.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 border border-[#C59B27] disabled:opacity-60 cursor-pointer transition shadow-xs flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Creating Account...' : 'Create Employee Account'}</span>
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 3: DEMO USERS (7+ ACCOUNTS WITH ROLE PERMISSIONS)    */}
          {/* ======================================================== */}
          {tab === 'personas' && localDemoAuthenticationEnabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Citadel People Hub Demo Accounts (All 7 Users)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pre-provisioned in Supabase PostgreSQL &bull; Click to sign in or copy credentials.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#FAF5EB] text-[#D97706] border border-[#F2E4B8] px-2 py-0.5 rounded-full">
                  Password: Password123!
                </span>
              </div>

              <div className="space-y-3">
                {DEMO_CREDENTIALS.map((cred) => {
                  const isCurrent = currentPersona.user.email.toLowerCase() === cred.email.toLowerCase();
                  return (
                    <div
                      key={cred.email}
                      className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                        isCurrent
                          ? 'border-[#D4AF37] bg-[#FAF5EB]/50 ring-1 ring-[#D4AF37]/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* User Top Row: Avatar, Name, Role & 1-Click Sign-In */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${cred.color}`}
                          >
                            {cred.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-900 leading-none">
                                {cred.name}
                              </h4>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                {cred.roleLabel}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                  Active Session
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">
                              {cred.jobTitle} &bull; {cred.department}
                            </p>
                          </div>
                        </div>

                        {/* Sign In Button */}
                        <button
                          type="button"
                          onClick={() => handleDirectDemoSignIn(cred)}
                          disabled={isSubmitting}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-2xs ${
                            isCurrent
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold border border-[#C59B27]'
                          }`}
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>{isCurrent ? 'Current User' : 'Sign In As'}</span>
                        </button>
                      </div>

                      {/* Credentials Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-slate-400">Email:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-800">{cred.email}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(cred.email, `${cred.email}-email`)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                              title="Copy email"
                            >
                              {copiedKey === `${cred.email}-email` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-slate-400">Password:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-800">{cred.password}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(cred.password, `${cred.email}-pwd`)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                              title="Copy password"
                            >
                              {copiedKey === `${cred.email}-pwd` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Role-Based Permissions Checklist */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Role-Based Access Permissions:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {cred.permissions.map((perm, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-[#083E34]" />
                              <span>{perm}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current Status Footer Info */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium truncate max-w-[280px]">
              Active: <strong className="text-slate-900">{currentPersona.user.name}</strong> (
              {currentPersona.badgeLabel})
            </span>
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSubmitting}
                className="text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
              >
                Sign out
              </button>
            )}
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-mono">
              czbwedtrnzlfpdbzlnim.supabase.co
            </span>
          </div>
          {!required && (
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#D4AF37] text-slate-950 text-xs font-bold rounded-xl hover:bg-[#C59B27] transition cursor-pointer shadow-xs"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
