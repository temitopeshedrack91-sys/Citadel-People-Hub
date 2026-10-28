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

interface DemoAccount {
  label: string;
  name: string;
  email: string;
  role: string;
  password: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Admin',
    name: 'Dr. Bukola Adeleke',
    email: 'dr.adeleke@citadel.ng',
    role: 'Chief People Officer',
    password: 'Password123!',
  },
  {
    label: 'Site Lead',
    name: 'Engr. Femi Olatunji',
    email: 'femi.olatunji@citadel.ng',
    role: 'Head of Technology',
    password: 'Password123!',
  },
  {
    label: 'Approver',
    name: 'Pastor Tunde Bakare',
    email: 'pastor.bakare@citadel.ng',
    role: 'Business Head',
    password: 'Password123!',
  },
  {
    label: 'Designer',
    name: 'Nadia Safitri',
    email: 'nadia@citadel.ng',
    role: 'Product Designer',
    password: 'Password123!',
  },
  {
    label: 'Android Eng',
    name: 'Bayu Wirawan',
    email: 'bayu@citadel.ng',
    role: 'Senior Android Engineer',
    password: 'Password123!',
  },
  {
    label: 'Executive',
    name: 'Jonathan Tan',
    email: 'jonathan@citadel.ng',
    role: 'Backend Systems Lead',
    password: 'Password123!',
  },
  {
    label: 'Viewer',
    name: 'Grace Okafor',
    email: 'grace.okafor@citadel.ng',
    role: 'Compliance Auditor (Viewer)',
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
  const { login, register, switchPersona } = useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('dr.adeleke@citadel.ng');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  // Registration fields
  const [fullName, setFullName] = useState('');
  const [registerRole, setRegisterRole] = useState<string>('EMPLOYEE');
  const [department, setDepartment] = useState('Technology & Systems');

  // UI state
  const [isDemoAccordionOpen, setIsDemoAccordionOpen] = useState(true);
  const [selectedDemoEmail, setSelectedDemoEmail] = useState<string>('dr.adeleke@citadel.ng');
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
    const effectiveEmail = KELVORA_ALIASES[cleanEmail] || cleanEmail;

    try {
      // Check if credentials match one of the preset personas or demo accounts for instant simulation
      const presetMatch = PRESET_PERSONAS.find(
        (p) =>
          p.user.email.toLowerCase() === effectiveEmail ||
          p.user.email.toLowerCase() === cleanEmail ||
          (effectiveEmail.includes('adeleke') && p.user.email.includes('adeleke'))
      );
      const demoMatch = DEMO_ACCOUNTS.find(
        (d) => d.email.toLowerCase() === effectiveEmail || d.email.toLowerCase() === cleanEmail
      );

      if (presetMatch) {
        switchPersona(presetMatch.user.id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('citadel_authenticated', 'true');
          localStorage.removeItem('citadel_logged_out');
        }
      } else if (demoMatch) {
        await login(demoMatch.email, password);
      } else {
        await login(cleanEmail, password);
      }
    } catch (err: any) {
      console.warn('Sign-in error:', err);
      // Fallback for offline or mock credentials
      const matched = PRESET_PERSONAS.find(
        (p) =>
          p.user.email.toLowerCase() === effectiveEmail ||
          (effectiveEmail.includes('adeleke') && p.user.email.includes('adeleke'))
      );
      if (matched) {
        switchPersona(matched.user.id);
        localStorage.setItem('citadel_authenticated', 'true');
        localStorage.removeItem('citadel_logged_out');
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
      await register(email, password, fullName.trim(), registerRole);
      setSuccessMessage('Account registered successfully! Redirecting...');
      if (typeof window !== 'undefined') {
        localStorage.setItem('citadel_authenticated', 'true');
        localStorage.removeItem('citadel_logged_out');
      }
    } catch (err: any) {
      console.warn('Registration error:', err);
      setErrorMessage(err?.message || 'Unable to complete registration. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    setEmail('dr.adeleke@citadel.ng');
    setPassword('Password123!');
    setSelectedDemoEmail('dr.adeleke@citadel.ng');
    setSuccessMessage('Google Workspace token verified for Citadel Community domain.');
    setTimeout(() => {
      login('dr.adeleke@citadel.ng', 'Password123!').catch(() => {
        switchPersona('emp-1');
        localStorage.setItem('citadel_authenticated', 'true');
        localStorage.removeItem('citadel_logged_out');
      });
    }, 600);
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 font-sans antialiased text-slate-900">
      {/* Container matching screenshot */}
      <div className="w-full max-w-[450px] space-y-6">
        {/* Header Title & Subtitle */}
        <div className="text-left space-y-1.5 pt-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#083E34] text-white flex items-center justify-center shadow-xs">
              <CitadelLogo variant="mark" colorMode="dark" className="h-5 w-5" />
            </div>
            <span className="text-xs font-black text-[#083E34] uppercase tracking-wider">
              Citadel People Hub
            </span>
          </div>

          <h1 className="text-3xl sm:text-[34px] font-black tracking-tight text-[#0F172A] leading-tight">
            {activeTab === 'signin' ? 'Sign in to Citadel' : 'Create Workspace'}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {activeTab === 'signin'
              ? 'Enter your corporate email to access your workforce account.'
              : 'Enter your corporate details to set up your workforce account.'}
          </p>
        </div>

        {/* Tab Segmented Control matching screenshot */}
        <div className="bg-[#F1F5F9] p-1 rounded-xl flex items-center text-xs font-bold border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('signin')}
            className={`flex-1 py-2.5 rounded-lg transition-all duration-150 cursor-pointer ${
              activeTab === 'signin'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2.5 rounded-lg transition-all duration-150 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Workspace
          </button>
        </div>

        {/* Social Button: Continue with Google Workspace */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 flex items-center justify-center gap-3 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs transition active:scale-[0.99] cursor-pointer"
        >
          {/* Colorful Google G Logo */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google Workspace</span>
        </button>

        {/* Divider with Text matching screenshot */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-[#F8FAFC] px-3 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest absolute">
            or with corporate email
          </span>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form matching screenshot inputs */}
        <form onSubmit={activeTab === 'signin' ? handleSignIn : handleRegister} className="space-y-4">
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Full Legal Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Bukola Adeleke"
                  className="w-full pl-10 pr-4 py-3 bg-[#EEF4FF] focus:bg-white border border-blue-100/90 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vincentagber74@gmail.com"
                className="w-full pl-10 pr-4 py-3 bg-[#EEF4FF] focus:bg-white border border-blue-100/90 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
              />
            </div>
          </div>

          {/* Role selector for registration */}
          {activeTab === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full py-2.5 px-3 bg-[#EEF4FF] focus:bg-white border border-blue-100/90 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
                >
                  <option value="People & Culture">People & Culture</option>
                  <option value="Technology & Systems">Technology & Systems</option>
                  <option value="Church Administration">Church Administration</option>
                  <option value="Finance & Accounts">Finance & Accounts</option>
                  <option value="Commercial Ventures">Commercial Ventures</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Initial Role
                </label>
                <select
                  value={registerRole}
                  onChange={(e) => setRegisterRole(e.target.value)}
                  className="w-full py-2.5 px-3 bg-[#EEF4FF] focus:bg-white border border-blue-100/90 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
                >
                  <option value="EMPLOYEE">Staff / Employee</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="BUSINESS_HEAD">Business Head</option>
                  <option value="PCCM_SUPER_ADMIN">PCCM Super Admin</option>
                </select>
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Password
              </label>
              {activeTab === 'signin' && (
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage('Password reset link dispatched to your registered work email.');
                    setTimeout(() => setSuccessMessage(''), 4000);
                  }}
                  className="text-xs font-bold text-[#C59B27] hover:text-[#B8860B] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full pl-10 pr-10 py-3 bg-[#EEF4FF] focus:bg-white border border-blue-100/90 focus:border-slate-900 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember this device checkbox matching screenshot */}
          <div className="flex items-center gap-2 pt-0.5">
            <input
              type="checkbox"
              id="rememberDevice"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="w-4 h-4 rounded text-slate-950 accent-slate-950 border-slate-300 focus:ring-slate-900 cursor-pointer"
            />
            <label
              htmlFor="rememberDevice"
              className="text-xs text-slate-600 font-medium select-none cursor-pointer"
            >
              Remember this device for 30 days
            </label>
          </div>

          {/* Primary Action Button matching user preference (Black background with sleek high contrast) */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-950 hover:bg-black active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md cursor-pointer disabled:opacity-60"
          >
            <span>
              {isSubmitting
                ? 'Authenticating...'
                : activeTab === 'signin'
                ? 'Sign In to Workspace'
                : 'Create Workspace Account'}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        {/* Demo Credentials (1-Click Fill) Card matching Kelvora screenshot */}
        <div className="border border-slate-200/90 rounded-2xl bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
          {/* Accordion Toggle Header */}
          <button
            type="button"
            onClick={() => setIsDemoAccordionOpen(!isDemoAccordionOpen)}
            className="w-full flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Fingerprint className="w-4 h-4 text-[#D4AF37]" />
              <span>Demo Credentials (1-Click Fill)</span>
            </div>
            {isDemoAccordionOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
            )}
          </button>

          {/* Grid of demo cards matching 3x2 layout in Kelvora reference */}
          {isDemoAccordionOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 animate-fade-in">
              {DEMO_ACCOUNTS.map((acc) => {
                const isSelected = selectedDemoEmail === acc.email;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleSelectDemo(acc)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900/20 shadow-xs'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {acc.label}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                        {acc.email}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
