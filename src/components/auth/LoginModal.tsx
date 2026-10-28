import React, { useState } from 'react';
import { Shield, UserCheck, CheckCircle2, Lock, X, Building, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth, PRESET_PERSONAS } from '../../context/AuthContext';
import { CitadelLogo } from '../brand/CitadelLogo';
import { UserRole } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  required?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, required = false }) => {
  const { currentPersona, switchPersona, backendEnabled, isAuthenticated, login, logout } = useAuth();
  const [personaFilter, setPersonaFilter] = useState<'ALL' | 'BUSINESS_HEAD' | 'DEPARTMENT_HEAD' | 'EMPLOYEE' | 'ADMIN'>('ALL');
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentPersona.user.role);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleBackendLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await login(email, password);
      setPassword('');
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackendLogout = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await logout();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign out. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAndLogin = (persona: (typeof PRESET_PERSONAS)[0]) => {
    setSelectedRole(persona.user.role);
    switchPersona(persona.user.id);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const filteredPersonas = PRESET_PERSONAS.filter((p) => {
    if (personaFilter === 'ALL') return true;
    if (personaFilter === 'BUSINESS_HEAD') return p.user.role === 'BUSINESS_HEAD';
    if (personaFilter === 'DEPARTMENT_HEAD') return p.user.role === 'DEPARTMENT_HEAD';
    if (personaFilter === 'EMPLOYEE') return p.user.role === 'EMPLOYEE';
    if (personaFilter === 'ADMIN') return p.user.role === 'PCCM_SUPER_ADMIN' || p.user.role === 'SYSTEM_ADMIN';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061328]/80 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Branded Header */}
        <div className="bg-[#0A1E3F] text-white p-6 sm:p-7 relative border-b border-amber-500/20">
          {!required && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          )}

          {/* Official Citadel Logo */}
          <div className="flex justify-center mb-4">
            <CitadelLogo variant="hub" colorMode="dark" className="h-12" />
          </div>

          <div className="text-center max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-bold font-serif text-white tracking-wide">
              Citadel People Hub Authentication
            </h2>
            <p className="text-xs text-amber-200/80 mt-1 font-medium">
              People, Culture & Change Management (PCCM) Platform
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[10px] font-mono">
              <Sparkles className="w-3 h-3" />
              <span>{backendEnabled ? 'Secure Laravel API Authentication' : 'Role-Based Access Control (RBAC) Simulation'}</span>
            </div>
          </div>
        </div>

        {backendEnabled ? (
          <div className="p-6">
            {isAuthenticated ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Signed in</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{currentPersona.user.name}</p>
                  <p className="text-xs text-slate-600">{currentPersona.user.email} · {currentPersona.badgeLabel}</p>
                </div>
                {errorMessage && <p role="alert" className="text-xs font-semibold text-rose-700">{errorMessage}</p>}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleBackendLogout}
                  className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {isSubmitting ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleBackendLogin} className="space-y-4">
                <div>
                  <label htmlFor="backend-login-email" className="mb-1 block text-xs font-bold text-slate-700">Work email</label>
                  <input
                    id="backend-login-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0A1E3F] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="backend-login-password" className="mb-1 block text-xs font-bold text-slate-700">Password</label>
                  <input
                    id="backend-login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0A1E3F] focus:outline-none"
                  />
                </div>
                {errorMessage && <p role="alert" className="text-xs font-semibold text-rose-700">{errorMessage}</p>}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-[#0A1E3F] px-4 py-2.5 text-sm font-bold text-amber-300 disabled:opacity-60"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in securely'}
                </button>
              </form>
            )}
          </div>
        ) : (
        <div className="p-6">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Select Official Profile to Authenticate:
            </span>
            <span className="text-[11px] font-mono text-slate-500 font-bold">
              {PRESET_PERSONAS.length} Profiles Available
            </span>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none text-xs">
            <button
              onClick={() => setPersonaFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                personaFilter === 'ALL'
                  ? 'bg-[#0A1E3F] text-amber-300 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All ({PRESET_PERSONAS.length})
            </button>
            <button
              onClick={() => setPersonaFilter('BUSINESS_HEAD')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                personaFilter === 'BUSINESS_HEAD'
                  ? 'bg-[#0A1E3F] text-amber-300 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Business Heads (5)
            </button>
            <button
              onClick={() => setPersonaFilter('DEPARTMENT_HEAD')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                personaFilter === 'DEPARTMENT_HEAD'
                  ? 'bg-[#0A1E3F] text-amber-300 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Dept Heads (4)
            </button>
            <button
              onClick={() => setPersonaFilter('EMPLOYEE')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                personaFilter === 'EMPLOYEE'
                  ? 'bg-[#0A1E3F] text-amber-300 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Employees (3)
            </button>
            <button
              onClick={() => setPersonaFilter('ADMIN')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                personaFilter === 'ADMIN'
                  ? 'bg-[#0A1E3F] text-amber-300 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Admin & Tech (2)
            </button>
          </div>

          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {filteredPersonas.map((persona) => {
              const isSelected = currentPersona.user.id === persona.user.id;
              return (
                <button
                  key={persona.user.id}
                  onClick={() => handleSelectAndLogin(persona)}
                  className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 group ${
                    isSelected
                      ? 'border-[#C59B27] bg-amber-50/60 shadow-xs ring-1 ring-amber-400/40'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-[#0A1E3F] text-amber-300'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                      }`}
                    >
                      {persona.user.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {persona.user.name}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            persona.user.role === 'PCCM_SUPER_ADMIN'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : persona.user.role === 'SYSTEM_ADMIN'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : persona.user.role === 'BUSINESS_HEAD'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : persona.user.role === 'DEPARTMENT_HEAD'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-800 border border-slate-300'
                          }`}
                        >
                          {persona.badgeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-[#0A1E3F] font-bold mt-0.5">
                        {persona.user.jobTitle}
                      </p>
                      <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                        {persona.user.entityName} • Staff ID: {persona.user.staffId}
                      </p>
                      <p className="text-[11px] text-slate-700 mt-1 leading-snug">
                        {persona.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 group-hover:text-[#0A1E3F]">
                        <span>Switch</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800 block">
                Security & Data Protection Notice:
              </span>
              Sensitive financial records, basic salary figures, BVN, and next-of-kin details are strictly audited and masked for unauthorized roles.
            </div>
          </div>
        </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            {backendEnabled ? 'Citadel People Hub · Secure API' : 'Citadel People Hub v1.2 (PCCM)'}
          </span>
          {!required && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0A1E3F] text-white text-xs font-semibold rounded-lg hover:bg-[#152B52] transition"
          >
            Done
          </button>
          )}
        </div>
      </div>
    </div>
  );
};
