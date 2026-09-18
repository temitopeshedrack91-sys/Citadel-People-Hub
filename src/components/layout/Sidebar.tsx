import React from 'react';
import {
  LayoutDashboard,
  Users,
  FolderTree,
  CalendarDays,
  Clock,
  Briefcase,
  UserPlus,
  Award,
  FileText,
  Calendar,
  BarChart3,
  Bell,
  Cpu,
  Settings,
  History,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CitadelLogo } from '../brand/CitadelLogo';

export type NavModule =
  | 'dashboard'
  | 'employees'
  | 'directory'
  | 'leave'
  | 'attendance'
  | 'recruitment'
  | 'onboarding'
  | 'performance'
  | 'documents'
  | 'calendar'
  | 'reports'
  | 'notifications'
  | 'integrations'
  | 'settings'
  | 'audit-logs';

interface SidebarProps {
  currentModule: NavModule;
  onSelectModule: (mod: NavModule) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentRole, permissions } = useAuth();

  const isPCCM = currentRole === 'PCCM_SUPER_ADMIN';
  const isEmployee = currentRole === 'EMPLOYEE';

  // Role-aware navigation definitions
  const navSections = [
    {
      label: 'Main',
      items: [
        {
          id: 'dashboard' as NavModule,
          label: 'PCCM Dashboard',
          icon: LayoutDashboard,
          visible: true,
        },
      ],
    },
    {
      label: 'People & Personnel',
      items: [
        {
          id: 'employees' as NavModule,
          label: isEmployee ? 'My Profile & Team' : 'Employee Records',
          icon: Users,
          visible: true,
        },
        {
          id: 'directory' as NavModule,
          label: 'Citadel Directory',
          icon: FolderTree,
          visible: true,
        },
      ],
    },
    {
      label: 'Time & Attendance',
      items: [
        {
          id: 'leave' as NavModule,
          label: isEmployee ? 'My Leave Requests' : 'Leave Management',
          icon: CalendarDays,
          visible: true,
        },
        {
          id: 'attendance' as NavModule,
          label: 'Attendance & Biometrics',
          icon: Clock,
          visible: true,
        },
      ],
    },
    {
      label: 'Talent & Culture',
      items: [
        {
          id: 'recruitment' as NavModule,
          label: 'Recruitment & Pre-Onboarding',
          icon: Briefcase,
          visible: !isEmployee,
        },
        {
          id: 'onboarding' as NavModule,
          label: 'Onboarding Journeys',
          icon: UserPlus,
          visible: true,
        },
        {
          id: 'performance' as NavModule,
          label: 'Performance & Appraisals',
          icon: Award,
          visible: true,
        },
      ],
    },
    {
      label: 'Operations & Records',
      items: [
        {
          id: 'documents' as NavModule,
          label: 'Documents & Policies',
          icon: FileText,
          visible: true,
        },
        {
          id: 'calendar' as NavModule,
          label: 'Citadel Master Calendar',
          icon: Calendar,
          visible: true,
        },
        {
          id: 'reports' as NavModule,
          label: 'Reports & Workforce Stats',
          icon: BarChart3,
          visible: !isEmployee,
        },
        {
          id: 'notifications' as NavModule,
          label: 'Notifications',
          icon: Bell,
          visible: true,
        },
      ],
    },
    {
      label: 'Governance & Settings',
      items: [
        {
          id: 'integrations' as NavModule,
          label: 'Cloud & Biometric Sync',
          icon: Cpu,
          visible: permissions.canConfigureIntegrations,
        },
        {
          id: 'settings' as NavModule,
          label: 'Entity & Dept Settings',
          icon: Settings,
          visible: permissions.canManageEntitiesAndDepts,
        },
        {
          id: 'audit-logs' as NavModule,
          label: 'Compliance Audit Trail',
          icon: History,
          visible: permissions.canViewAuditLogs,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="citadel-hub-sidebar"
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Mini Brand Identity in Sidebar */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <CitadelLogo variant="mark" colorMode="light" className="h-6" />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#0A1E3F] tracking-wide uppercase font-serif">
                Citadel Hub
              </span>
              <span className="text-[9px] text-[#C59B27] font-mono font-semibold">
                PCCM Division
              </span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
            CGCC
          </span>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter((item) => item.visible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {section.label}
                </div>
                {visibleItems.map((item) => {
                  const isActive = currentModule === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      onClick={() => {
                        onSelectModule(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                        isActive
                          ? 'bg-[#0A1E3F] text-white shadow-xs font-semibold'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-[#C59B27]' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#C59B27] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer info: Role badge & PCCM notice */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/80 text-[11px] text-slate-500">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>PCCM Governance</span>
            </div>
            <span className="text-[9px] font-mono font-bold text-[#C59B27] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
              Active
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            People • Culture • Performance • Growth
          </p>
        </div>
      </aside>
    </>
  );
};
