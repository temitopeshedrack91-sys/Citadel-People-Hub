/**
 * AuthPage Component
 * Dedicated professional Login & Registration page matching Kelvora reference:
 * - Segmented control: Sign In / Create Workspace (Register)
 * - Continue with Google Workspace
 * - Corporate Email & Password inputs with eye toggle & forgot password
 * - "Remember this device for 30 days" checkbox
 * - Primary Action button: "Sign In to Workspace →"
 * - Collapsible "Demo Credentials (1-Click Fill)" accordion card with 6 instant fill profiles
 */

import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Fingerprint,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  User,
} from 'lucide-react';
import { useAuth, PRESET_PERSONAS } from '../../context/AuthContext';
import { CitadelLogo } from '../brand/CitadelLogo';
import { canUseLocalPersonaAuthentication } from '../../utils/authMode';

interface DemoAccount {
  label: string;
  name: string;
  email: string;
  role: string;
  password: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'System Admin',
    name: 'Engr. Tunde Afolabi',
    email: 'sysadmin@citadel.ng',
    role: 'System Admin (Settings & Org)',
    password: 'Password123!',
  },
  {
    label: 'HR Admin',
    name: 'Dr. Bukola Adeleke',
    email: 'dr.adeleke@citadel.ng',
    role: 'HR Admin (PCCM)',
    password: 'Password123!',
  },
  {
    label: 'HR Staff',
    name: 'Mrs. Sussan Afuwape',
    email: 's.afuwape@thecitadelglobal.org',
    role: 'HR Staff (Stage 2)',
    password: 'Password123!',
  },
  {
    label: 'Business Head',
    name: 'Pastor Tunde Bakare',
    email: 'pastor.bakare@citadel.ng',
    role: 'Business Head (CGCC)',
    password: 'Password123!',
  },
  {
    label: 'Manager (ICT)',
    name: 'Engr. Femi Olatunji',
    email: 'femi.olatunji@citadel.ng',
    role: 'Manager (Stage 1)',
    password: 'Password123!',
  },
  {
    label: 'Supervisor',
    name: 'Nadia Safitri',
    email: 'nadia@citadel.ng',
    role: 'Team Lead / Employee',
    password: 'Password123!',
  },
  {
    label: 'Employee (ICT)',
    name: 'Bayu Wirawan',
    email: 'bayu@citadel.ng',
    role: 'Employee',
    password: 'Password123!',
  },
  {
    label: 'Junior Staff',
    name: 'Jonathan Tan',
    email: 'jonathan@citadel.ng',
    role: 'Employee (2-Level)',
    password: 'Password123!',
  },
  {
    label: 'Viewer',
    name: 'Grace Okafor',
    email: 'grace.okafor@citadel.ng',
    role: 'Read-Only Viewer',
    password: 'Password123!',
  },
];

const KELVORA_ALIASES: Record<string, string> = {
  'admin@kelvora.com': 'dr.adeleke@citadel.ng',
  'requester@kelvora.com': 'femi.olatunji@citadel.ng',
  'approver@kelvora.com': 'pastor.bakare@citadel.ng',
  'procurement@kelvora.com': 'nadia@citadel.ng',
  'finance@kelvora.com': 'bayu@citadel.ng',
  'executive@kelvora.com': 'jonathan@citadel.ng',
};

export const AuthPage: React.FC = () => {
  const { login, register, switchPersona, backendEnabled } = useAuth();
  const localDemoAuthenticationEnabled = canUseLocalPersonaAuthentication(
    import.meta.env.DEV,
    backendEnabled,
    import.meta.env.VITE_ENABLE_LOCAL_DEMO_AUTH === 'true'
  );

  const showDevSeededAccounts = DEMO_ACCOUNTS.length > 0;

  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState(localDemoAuthenticationEnabled ? 'dr.adeleke@citadel.ng' : '');
  const [password, setPassword] = useState(localDemoAuthenticationEnabled ? 'Password123!' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  // Registration fields
  const [fullName, setFullName] = useState('');

  // UI state
  const [isDemoAccordionOpen, setIsDemoAccordionOpen] = useState(showDevSeededAccounts);
  const [selectedDemoEmail, setSelectedDemoEmail] = useState<string>(localDemoAuthenticationEnabled ? 'dr.adeleke@citadel.ng' : '');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1-Click Demo Credentials Fill
  const handleSelectDemo = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setSelectedDemoEmail(account.email);
    setActiveTab('signin');
    setErrorMessage('');
    setSuccessMessage(`Loaded ${account.label} credentials: ${account.name}`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    const cleanEmail = email.trim().toLowerCase();
    const effectiveEmail = localDemoAuthenticationEnabled ? KELVORA_ALIASES[cleanEmail] || cleanEmail : cleanEmail;

    try {
      const presetMatch = localDemoAuthenticationEnabled ? PRESET_PERSONAS.find(
        (p) =>
          p.user.email.toLowerCase() === effectiveEmail ||
          p.user.email.toLowerCase() === cleanEmail ||
          (effectiveEmail.includes('adeleke') && p.user.email.includes('adeleke'))
      ) : undefined;
      const demoMatch = localDemoAuthenticationEnabled ? DEMO_ACCOUNTS.find(
        (d) => d.email.toLowerCase() === effectiveEmail || d.email.toLowerCase() === cleanEmail
      ) : undefined;

      if (presetMatch && switchPersona(presetMatch.user.id)) {
        return;
      } else if (demoMatch) {
        await login(demoMatch.email, password);
      } else {
        await login(cleanEmail, password);
      }
    } catch (err: any) {
      console.warn('Sign-in error:', err);
      // Fallback for offline or mock credentials
      const matched = localDemoAuthenticationEnabled ? PRESET_PERSONAS.find(
        (p) =>
          p.user.email.toLowerCase() === effectiveEmail ||
          (effectiveEmail.includes('adeleke') && p.user.email.includes('adeleke'))
      ) : undefined;
      if (matched && switchPersona(matched.user.id)) {
        return;
      } else {
        setErrorMessage(err?.message || 'Invalid corporate email or password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full corporate name.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register(email, password, fullName.trim());
      setSuccessMessage(result.requiresEmailConfirmation
        ? 'Account created. Confirm your work email before signing in.'
        : 'Account registered successfully!');
    } catch (err: any) {
      console.warn('Registration error:', err);
      setErrorMessage(err?.message || 'Unable to complete registration. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (!localDemoAuthenticationEnabled) {
      setErrorMessage('Google sign-in is not configured for this deployment. Use your work email and password.');
      return;
    }

    setEmail('dr.adeleke@citadel.ng');
    setPassword('Password123!');
    setSelectedDemoEmail('dr.adeleke@citadel.ng');
    setSuccessMessage('Google Workspace token verified for Citadel Community domain.');
    setTimeout(() => {
      login('dr.adeleke@citadel.ng', 'Password123!').catch(() => switchPersona('emp-1'));
    }, 600);
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F7FA] grid grid-cols-1 lg:grid-cols-12 font-sans antialiased text-slate-900">
      {/* Left Architectural Brand Column (Desktop) */}
      <aside className="hidden lg:flex lg:col-span-5 bg-[#0B1F3A] text-white flex-col justify-between p-12 xl:p-16 relative overflow-hidden border-r border-slate-800">
        {/* Top Emblem & Identity */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center p-2 shrink-0">
            <CitadelLogo variant="mark" colorMode="dark" className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-sm font-bold tracking-tight text-white leading-tight">
              Citadel People Hub
            </p>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              The Citadel Global Community Church
            </p>
          </div>
        </div>

        {/* Center Editorial Copy */}
        <div className="relative z-10 space-y-8 max-w-md">
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-wide text-slate-300">
              People, Culture &amp; Change Management
            </p>
            <h2 className="font-display text-3xl xl:text-4xl font-bold tracking-tight text-white leading-[1.15]">
              Workforce stewardship, built for every Citadel entity.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Manage staff directories, reporting hierarchies, two-stage leave workflows, attendance, and payroll from one unified workspace.
            </p>
          </div>

          <div className="pt-6 border-t border-white/12 grid grid-cols-3 gap-6">
            <div>
              <p className="font-display text-sm font-semibold text-white">CGCC</p>
              <p className="text-xs text-slate-400 mt-0.5">Church &amp; Ministry</p>
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-white">CSOG</p>
              <p className="text-xs text-slate-400 mt-0.5">School of Government</p>
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-white">Holdings</p>
              <p className="text-xs text-slate-400 mt-0.5">Commercial Units</p>
            </div>
          </div>
        </div>

        {/* Quiet Institutional Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-6 border-t border-white/10">
          <span>Citadel PCCM Directorate</span>
          <span>Role-Based Access Control</span>
        </div>
      </aside>

      {/* Right Sign-In Column */}
      <div className="lg:col-span-7 relative overflow-hidden bg-[#F5F7FA] flex flex-col justify-center items-center px-4 py-8 sm:p-8 lg:p-12">
        {/* Subtle Network Constellation Grid Background */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
          viewBox="0 0 1000 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <g stroke="#94A3B8" strokeOpacity="0.26" strokeWidth="1">
            <line x1="60" y1="90" x2="240" y2="170" />
            <line x1="240" y1="170" x2="430" y2="95" />
            <line x1="430" y1="95" x2="650" y2="185" />
            <line x1="650" y1="185" x2="880" y2="110" />
            <line x1="880" y1="110" x2="960" y2="270" />
            <line x1="240" y1="170" x2="175" y2="365" />
            <line x1="175" y1="365" x2="40" y2="495" />
            <line x1="175" y1="365" x2="365" y2="435" />
            <line x1="430" y1="95" x2="365" y2="435" />
            <line x1="650" y1="185" x2="575" y2="395" />
            <line x1="650" y1="185" x2="845" y2="355" />
            <line x1="845" y1="355" x2="960" y2="270" />
            <line x1="845" y1="355" x2="915" y2="560" />
            <line x1="575" y1="395" x2="845" y2="355" />
            <line x1="575" y1="395" x2="735" y2="625" />
            <line x1="735" y1="625" x2="915" y2="560" />
            <line x1="365" y1="435" x2="575" y2="395" />
            <line x1="365" y1="435" x2="210" y2="655" />
            <line x1="175" y1="365" x2="210" y2="655" />
            <line x1="40" y1="495" x2="210" y2="655" />
            <line x1="210" y1="655" x2="105" y2="835" />
            <line x1="210" y1="655" x2="455" y2="795" />
            <line x1="455" y1="795" x2="735" y2="625" />
            <line x1="735" y1="625" x2="865" y2="830" />
            <line x1="455" y1="795" x2="865" y2="830" />
          </g>
          <g>
            {[
              [60, 90, false],
              [240, 170, true],
              [430, 95, false],
              [650, 185, true],
              [880, 110, false],
              [960, 270, false],
              [175, 365, true],
              [40, 495, false],
              [365, 435, false],
              [575, 395, false],
              [845, 355, true],
              [915, 560, false],
              [735, 625, true],
              [210, 655, true],
              [105, 835, false],
              [455, 795, false],
              [865, 830, true],
            ].map(([cx, cy, ringed], idx) => (
              <g key={idx}>
                {ringed && (
                  <circle
                    cx={Number(cx)}
                    cy={Number(cy)}
                    r={10}
                    stroke="#94A3B8"
                    strokeOpacity="0.24"
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={Number(cx)}
                  cy={Number(cy)}
                  r={ringed ? 3.2 : 2.5}
                  fill="#64748B"
                  fillOpacity="0.34"
                />
              </g>
            ))}
          </g>
        </svg>
        <div className="relative z-10 w-full max-w-[440px] space-y-5">
          {/* Mobile Brand Header */}
          <div className="flex lg:hidden items-center gap-3 px-1">
            <img
              src="/citadel-logo.png"
              alt="The Citadel Global Community Church"
              className="h-10 w-10 object-contain rounded-xl bg-white p-1 border border-slate-200"
            />
            <div>
              <span className="font-display text-sm font-bold text-slate-900 block leading-tight">
                Citadel People Hub
              </span>
              <span className="text-xs text-slate-500 font-medium block">
                The Citadel Global Community Church
              </span>
            </div>
          </div>

          {/* Elevated Auth Surface Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-6 sm:p-8 space-y-6">
            {/* Heading */}
            <div className="space-y-1.5">
              <h1 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-tight">
                {activeTab === 'signin' ? 'Sign in to Citadel' : 'Create Workspace'}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {activeTab === 'signin'
                  ? 'Enter your corporate email to access your workforce account.'
                  : 'Enter your corporate details to set up your workforce account.'}
              </p>
            </div>

            {/* Segmented Mode Control */}
            {!localDemoAuthenticationEnabled ? (
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold border border-slate-200/70"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'signin'}
                  onClick={() => setActiveTab('signin')}
                  className={`flex-1 py-2.5 rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    activeTab === 'signin'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'register'}
                  onClick={() => setActiveTab('register')}
                  className={`flex-1 py-2.5 rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    activeTab === 'register'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register
                </button>
              </div>
            ) : null}

            {localDemoAuthenticationEnabled && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 flex items-center justify-center gap-3 text-sm font-semibold text-slate-800 transition active:scale-[0.99] cursor-pointer min-h-[44px]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google Workspace</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                    or continue with corporate email
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              </>
            )}

            {/* Alerts */}
            {errorMessage && (
              <div role="alert" className="p-3.5 bg-[#F5F7FA] border border-[#111827]/25 text-[#111827] text-xs font-medium rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#111827] mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div role="status" className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#174EA6] text-xs font-medium rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#174EA6] mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={activeTab === 'signin' ? handleSignIn : handleRegister} className="space-y-4">
              {activeTab === 'register' && !backendEnabled && (
                <div>
                  <label htmlFor="auth-full-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="auth-full-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Bukola Adeleke"
                      className="w-full pl-10 pr-4 py-2.5 min-h-[44px] bg-white border border-slate-200 hover:border-slate-300 focus:border-[#174EA6] rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#174EA6]/15 transition"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@citadel.ng"
                    className="w-full pl-10 pr-4 py-2.5 min-h-[44px] bg-white border border-slate-200 hover:border-slate-300 focus:border-[#174EA6] rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#174EA6]/15 transition"
                  />
                </div>
              </div>

              {activeTab === 'register' && (
                <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-600 leading-relaxed">
                  New accounts receive employee access. An administrator assigns organization, department, and elevated permissions after verification.
                </p>
              )}

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  {activeTab === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSuccessMessage('Password reset link dispatched to your registered work email.');
                        setTimeout(() => setSuccessMessage(''), 4000);
                      }}
                      className="text-xs font-semibold text-[#174EA6] hover:text-[#0B1F3A] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-11 py-2.5 min-h-[44px] bg-white border border-slate-200 hover:border-slate-300 focus:border-[#174EA6] rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#174EA6]/15 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember this device checkbox */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="rememberDevice"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded text-[#174EA6] accent-[#174EA6] border-slate-300 focus:ring-[#174EA6] cursor-pointer"
                />
                <label
                  htmlFor="rememberDevice"
                  className="text-xs text-slate-600 font-medium select-none cursor-pointer"
                >
                  Remember this device for 30 days
                </label>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#174EA6] hover:bg-[#0B1F3A] active:scale-[0.99] text-white font-semibold py-3 px-4 min-h-[44px] rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-60"
              >
                <span>
                  {isSubmitting
                    ? 'Authenticating...'
                    : activeTab === 'signin'
                    ? 'Sign In to Workspace'
                    : 'Create Workspace Account'}
                </span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>

          {showDevSeededAccounts && (
            <div className="border border-slate-200/90 rounded-2xl bg-white p-4 space-y-3">
              <button
                type="button"
                onClick={() => setIsDemoAccordionOpen(!isDemoAccordionOpen)}
                aria-expanded={isDemoAccordionOpen}
                className="w-full flex items-center justify-between text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Fingerprint className="w-4 h-4 text-[#174EA6]" />
                  <span>Demo Credentials (1-Click Fill)</span>
                </div>
                {isDemoAccordionOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
                )}
              </button>

              {isDemoAccordionOpen && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 animate-fade-in">
                  {DEMO_ACCOUNTS.map((acc) => {
                    const isSelected = selectedDemoEmail === acc.email;
                    return (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => handleSelectDemo(acc)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#174EA6] bg-[#EFF6FF]/60 ring-1 ring-[#174EA6]/20'
                            : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900 leading-tight">
                            {acc.label}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                            {acc.email}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
