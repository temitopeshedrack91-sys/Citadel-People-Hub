import React, { useState } from 'react';
import { Shield, UserCheck, CheckCircle2, Lock, X, Building, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth, PRESET_PERSONAS } from '../../context/AuthContext';
import { CitadelLogo } from '../brand/CitadelLogo';
import { UserRole } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { currentPersona, switchPersona } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentPersona.user.role);

  if (!isOpen) return null;

  const handleSelectAndLogin = (role: UserRole) => {
    setSelectedRole(role);
    switchPersona(role);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061328]/80 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Branded Header */}
        <div className="bg-[#0A1E3F] text-white p-6 sm:p-7 relative border-b border-amber-500/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

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
              <span>Role-Based Access Control (RBAC) Simulation</span>
            </div>
          </div>
        </div>

        {/* Persona Selection List */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select an Official Profile to Authenticate:
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              5 Presets Available
            </span>
          </div>

          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {PRESET_PERSONAS.map((persona) => {
              const isSelected = currentPersona.user.role === persona.user.role;
              return (
                <button
                  key={persona.user.role}
                  onClick={() => handleSelectAndLogin(persona.user.role)}
                  className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 group ${
                    isSelected
                      ? 'border-[#C59B27] bg-amber-50/50 shadow-xs'
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
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {persona.user.name}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            persona.user.role === 'PCCM_SUPER_ADMIN'
                              ? 'bg-amber-100 text-amber-800'
                              : persona.user.role === 'SYSTEM_ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : persona.user.role === 'BUSINESS_HEAD'
                              ? 'bg-blue-100 text-blue-800'
                              : persona.user.role === 'DEPARTMENT_HEAD'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {persona.badgeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-[#0A1E3F] font-medium mt-0.5">
                        {persona.user.jobTitle}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {persona.user.entityName} • {persona.user.staffId}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                        {persona.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Current</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 group-hover:text-[#0A1E3F]">
                        <span>Select</span>
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

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            Citadel People Hub v1.2 (PCCM)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0A1E3F] text-white text-xs font-semibold rounded-lg hover:bg-[#152B52] transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
