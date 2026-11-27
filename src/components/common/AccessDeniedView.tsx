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
        <div className="h-1.5 bg-[#0B1F3A]" />

        <div className="p-6 sm:p-10 space-y-6">
          {/* Header Icon & Status */}
          <div className="flex items-start justify-between gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F5F7FA] border border-[#E5E7EB] text-[#111827] flex items-center justify-center shrink-0">
              {status === 401 ? <Lock className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>

            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider bg-[#111827] text-white border border-[#111827]">
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
            <div className="pt-5 border-t border-slate-100 space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Current Session Profile
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <dt className="text-slate-500 text-[11px]">Signed in as</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{currentUser.name}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-[11px]">Assigned Role</dt>
                  <dd className="font-semibold text-[#174EA6] mt-0.5">
                    {canonical || currentRole}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-[11px]">Department</dt>
                  <dd className="font-semibold text-slate-700 truncate mt-0.5">
                    {currentUser.departmentName || 'Citadel Community'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Policy Notice */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-slate-900">
              <Building className="w-3.5 h-3.5 text-[#174EA6]" />
              <span>Role-Based Access Policy</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Citadel People Hub enforces strict security boundaries. HR records and system settings
              are restricted to authorized administrative personnel. Employee accounts are scoped
              exclusively to personal self-service and department views.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onNavigateHome}
              data-testid="access-denied-home-btn"
              className="px-4 py-2.5 rounded-lg bg-[#174EA6] hover:bg-[#0B1F3A] text-white text-xs font-semibold flex items-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>

            {status === 401 && onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
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
