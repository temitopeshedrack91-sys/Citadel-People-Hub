import React, { useState } from 'react';
import { Shield, UserCheck, CheckCircle2, Lock, X, Building, ArrowRight, Sparkles, UserPlus, LogIn } from 'lucide-react';
import { useAuth, PRESET_PERSONAS } from '../../context/AuthContext';
import { CitadelLogo } from '../brand/CitadelLogo';
import { UserRole } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  required?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, required = false }) => {
  const { currentPersona, switchPersona, isAuthenticated, login, register, logout } = useAuth();
  const [tab, setTab] = useState<'signin' | 'register' | 'personas'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await login(email, password);
      setPassword('');
      setSuccessMessage('Successfully signed in to Supabase!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in. Please verify your credentials.');
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
      await register(email, password, name, role);
      setPassword('');
      setSuccessMessage('Account registered successfully on Supabase!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registration failed. Please try again.');
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

  const handleSelectPersona = (persona: (typeof PRESET_PERSONAS)[0]) => {
    switchPersona(persona.user.id);
    setSuccessMessage(`Switched to ${persona.user.name}`);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04241e]/80 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Branded Header */}
        <div className="bg-[#083E34] text-white p-6 relative border-b border-emerald-900/30">
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
          <div className="flex justify-center mb-3">
            <CitadelLogo variant="hub" colorMode="dark" className="h-10" />
          </div>

          <div className="text-center max-w-md mx-auto">
            <h2 className="text-lg font-bold text-white tracking-wide">
              Citadel People Hub
            </h2>
            <p className="text-xs text-amber-200/80 mt-0.5 font-medium">
              Connected to Supabase PostgreSQL & Auth
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-center gap-1.5 mt-4 bg-[#052C25] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setTab('signin'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'signin' ? 'bg-[#083E34] text-amber-300 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'register' ? 'bg-[#083E34] text-amber-300 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('personas'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'personas' ? 'bg-[#083E34] text-amber-300 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Demo Roles</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {successMessage && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
              {errorMessage}
            </div>
          )}

          {/* SIGN IN TAB */}
          {tab === 'signin' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. b.adeleke@citadelcommunity.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#083E34] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#083E34] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#083E34] px-4 py-2.5 text-sm font-bold text-amber-300 hover:bg-[#062f28] disabled:opacity-60 cursor-pointer transition shadow-xs"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In with Supabase'}
              </button>
            </form>
          )}

          {/* REGISTER TAB */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pastor David Adeleke"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#083E34] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. d.adeleke@citadelcommunity.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#083E34] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#083E34] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#083E34] focus:outline-none cursor-pointer"
                >
                  <option value="EMPLOYEE">Employee / Staff Member</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="BUSINESS_HEAD">Business Head</option>
                  <option value="PCCM_SUPER_ADMIN">PCCM Super Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#083E34] px-4 py-2.5 text-sm font-bold text-amber-300 hover:bg-[#062f28] disabled:opacity-60 cursor-pointer transition shadow-xs"
              >
                {isSubmitting ? 'Registering...' : 'Create Account on Supabase'}
              </button>
            </form>
          )}

          {/* DEMO PERSONAS TAB */}
          {tab === 'personas' && (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {PRESET_PERSONAS.map((persona) => {
                const isSelected = currentPersona.user.id === persona.user.id;
                return (
                  <button
                    key={persona.user.id}
                    type="button"
                    onClick={() => handleSelectPersona(persona)}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50/70 ring-1 ring-amber-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 bg-[#083E34] text-amber-300">
                        {persona.user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {persona.user.name}
                          </span>
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                            {persona.badgeLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{persona.user.jobTitle}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Current Status Footer Info */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium truncate max-w-[260px]">
              Active: <strong className="text-slate-800">{currentPersona.user.name}</strong> ({currentPersona.badgeLabel})
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
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono">
            czbwedtrnzlfpdbzlnim.supabase.co
          </span>
          {!required && (
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-[#083E34] text-white text-xs font-semibold rounded-xl hover:bg-[#062f28] transition cursor-pointer shadow-xs"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
