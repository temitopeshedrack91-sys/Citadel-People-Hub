import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, LogIn, Building, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavModule } from '../layout/Sidebar';
import { normalizeRole } from '../../utils/rbac';

interface AccessDeniedViewProps {
  module: NavModule;
  status: 401 | 403;
  reason?: string;
  onNavigateHome: () => void;
  onOpenLogin?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  module,
  status,
  reason,
  onNavigateHome,
  onOpenLogin,
}) => {
  const { currentUser, currentRole } = useAuth();
  const canonical = normalizeRole(currentRole);

  const moduleName = module.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      data-testid="access-denied-view"
      className="p-4 sm:p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[60vh] animate-fade-in"
    >
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Top Accent Strip */}
        <div className="h-1.5 bg-[#083E34]" />

        <div className="p-6 sm:p-10 space-y-6">
          {/* Header Icon & Status Pill */}
          <div className="flex items-start justify-between gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
              {status === 401 ? <Lock className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>

            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
              HTTP {status} {status === 401 ? 'Unauthorized' : 'Forbidden'}
            </span>
          </div>

          {/* Heading and Reason */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {status === 401 ? 'Authentication Required' : `Access Restricted: ${moduleName}`}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              {reason ||
                (status === 401
                  ? 'Your active session has expired or authentication credentials are required to view this module.'
                  : `Your role does not have authorization to view or configure the ${moduleName} module.`)}
            </p>
          </div>

          {/* User Context Details */}
          {currentUser && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Your Current Session Profile
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Signed in as</span>
                  <span className="font-bold text-slate-900">{currentUser.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Assigned Role</span>
                  <span className="font-bold text-[#D97706]">
                    {canonical || currentRole}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Department</span>
                  <span className="font-bold text-slate-700 truncate block">
                    {currentUser.departmentName || 'Citadel Community'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Policy Notice Box */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <Building className="w-3.5 h-3.5" />
              <span>Role-Based Access Policy</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-normal">
              Citadel People Hub enforces strict security boundaries. HR records and system settings
              are restricted to authorized administrative personnel. Employee accounts are scoped
              exclusively to personal self-service and department views.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateHome}
              data-testid="access-denied-home-btn"
              className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 text-xs font-bold flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Return to Dashboard</span>
            </button>

            {status === 401 && onOpenLogin && (
              <button
                onClick={onOpenLogin}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In with Credentials</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
