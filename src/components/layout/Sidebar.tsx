import React from 'react';
import {
  LayoutDashboard,
  Users,
  FolderTree,
  Banknote,
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
  ShieldCheck,
  Sparkles,
  UserRoundX,
  ChevronRight,
  ChevronsRight,
  ChevronsLeft,
  Contact,
  Plus,
  LogOut,
  SlidersHorizontal,
  StickyNote,
  HelpCircle,
  ReceiptText,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { leaveRepository } from '../../services';
import { CitadelLogo } from '../brand/CitadelLogo';
import { canAccessModule, canPerformAction, isHrOrAdminUser, isManagerUser } from '../../utils/rbac';

export type NavModule =
  | 'dashboard'
  | 'employees'
  | 'directory'
  | 'leave'
  | 'attendance'
  | 'projects'
  | 'payroll'
  | 'claims'
  | 'calendar'
  | 'team-notes'
  | 'recruitment'
  | 'onboarding'
  | 'offboarding'
  | 'performance'
  | 'documents'
  | 'reports'
  | 'notifications'
  | 'integrations'
  | 'ai-assistant'
  | 'settings'
  | 'audit-logs'
  | 'approvals'
  | 'birthdays';

interface SidebarProps {
  currentModule: NavModule;
  onSelectModule: (mod: NavModule) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenAddEmployee?: () => void;
  onOpenLoginModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  isOpenMobile,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
  onOpenAddEmployee,
  onOpenLoginModal,
}) => {
  const { currentRole, currentUser, logout } = useAuth();

  const canManageEmployees = canPerformAction(currentUser, 'manage_employees').allowed;
  const [pendingLeaveCount, setPendingLeaveCount] = React.useState<number>(0);

  const loadPendingLeaveCount = React.useCallback(async () => {
    if (import.meta.env.MODE === 'test') return;
    try {
      const list = await leaveRepository.getAll();
      const actorId = String(currentUser.employeeId || currentUser.id || '');
      const isHr = isHrOrAdminUser(currentUser);
      const isMgr = isManagerUser(currentUser);
      const actionable = list.filter((req) => {
        const isOpen = req.status === 'Submitted' || req.status === 'Pending Review';
        if (!isOpen) return false;
        const stage = req.approvalStage || (req.status === 'Pending Review' ? 'HR' : 'MANAGER');
        if (isHr) return stage === 'HR' || req.status === 'Pending Review';
        if (isMgr) {
          return (
            (stage === 'MANAGER' || stage === 'LINE_MANAGER') &&
            Boolean(actorId) &&
            String(req.employeeId) !== actorId
          );
        }
        return Boolean(actorId) && String(req.employeeId) === actorId;
      });
      setPendingLeaveCount(actionable.length);
    } catch {
      setPendingLeaveCount(0);
    }
  }, [currentUser]);

  React.useEffect(() => {
    void loadPendingLeaveCount();
  }, [loadPendingLeaveCount]);

  useRealtimeTable('leave_requests', () => {
    void loadPendingLeaveCount();
  });

  React.useEffect(() => {
    if (!isOpenMobile) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpenMobile, onCloseMobile]);

  // Navigation structured into MENU, OPERATIONS, and SUPPORT with centralized RBAC visibility
  const navSections = [
    {
      label: 'MENU',
      items: [
        {
          id: 'dashboard' as NavModule,
          label: 'Dashboard',
          icon: LayoutDashboard,
          visible: canAccessModule(currentUser || currentRole, 'dashboard'),
        },
        {
          id: 'employees' as NavModule,
          label: 'Employees',
          icon: Users,
          visible: canAccessModule(currentUser || currentRole, 'employees'),
        },
        {
          id: 'attendance' as NavModule,
          label: 'Attendance',
          icon: Clock,
          visible: canAccessModule(currentUser || currentRole, 'attendance'),
        },
        {
          id: 'leave' as NavModule,
          label: 'Leave',
          icon: CalendarDays,
          visible: canAccessModule(currentUser || currentRole, 'leave'),
          badge: pendingLeaveCount > 0 ? String(pendingLeaveCount) : undefined,
        },
        {
          id: 'projects' as NavModule,
          label: 'Projects',
          icon: FolderTree,
          visible: canAccessModule(currentUser || currentRole, 'projects'),
        },
        {
          id: 'payroll' as NavModule,
          label: 'Payroll',
          icon: Banknote,
          visible: canAccessModule(currentUser || currentRole, 'payroll'),
        },
        {
          id: 'claims' as NavModule,
          label: 'Claims & Expenses',
          icon: ReceiptText,
          visible: canAccessModule(currentUser || currentRole, 'claims'),
        },
      ],
    },
    {
      label: 'OPERATIONS',
      items: [
        {
          id: 'calendar' as NavModule,
          label: 'Calendar',
          icon: Calendar,
          visible: canAccessModule(currentUser || currentRole, 'calendar'),
        },
        {
          id: 'team-notes' as NavModule,
          label: 'Team Notes',
          icon: StickyNote,
          visible: canAccessModule(currentUser || currentRole, 'team-notes'),
        },
        {
          id: 'directory' as NavModule,
          label: 'Directory',
          icon: Contact,
          visible: canAccessModule(currentUser || currentRole, 'directory'),
        },
        {
          id: 'recruitment' as NavModule,
          label: 'Recruitment',
          icon: Briefcase,
          visible: canAccessModule(currentUser || currentRole, 'recruitment'),
        },
        {
          id: 'onboarding' as NavModule,
          label: 'Onboarding',
          icon: UserPlus,
          visible: canAccessModule(currentUser || currentRole, 'onboarding'),
        },
        {
          id: 'offboarding' as NavModule,
          label: 'Offboarding',
          icon: UserRoundX,
          visible: canAccessModule(currentUser || currentRole, 'offboarding'),
        },
        {
          id: 'documents' as NavModule,
          label: 'Documents',
          icon: FileText,
          visible: canAccessModule(currentUser || currentRole, 'documents'),
        },
        {
          id: 'performance' as NavModule,
          label: 'Performance',
          icon: Award,
          visible: canAccessModule(currentUser || currentRole, 'performance'),
        },
        {
          id: 'reports' as NavModule,
          label: 'Reports',
          icon: BarChart3,
          visible: canAccessModule(currentUser || currentRole, 'reports'),
        },
      ],
    },
    {
      label: 'SUPPORT & GOVERNANCE',
      items: [
        {
          id: 'settings' as NavModule,
          label: 'Settings',
          icon: Settings,
          visible: canAccessModule(currentUser || currentRole, 'settings'),
        },
        {
          id: 'integrations' as NavModule,
          label: 'Integrations',
          icon: SlidersHorizontal,
          visible: canAccessModule(currentUser || currentRole, 'integrations'),
        },
        {
          id: 'ai-assistant' as NavModule,
          label: 'Help & Assistant',
          icon: HelpCircle,
          visible: canAccessModule(currentUser || currentRole, 'ai-assistant'),
        },
        {
          id: 'audit-logs' as NavModule,
          label: 'Audit Trail',
          icon: ShieldCheck,
          visible: canAccessModule(currentUser || currentRole, 'audit-logs'),
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          data-testid="sidebar-mobile-backdrop"
          className="fixed inset-0 z-40 bg-black/80 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Black Sidebar Container */}
      <aside
        id="citadel-hub-sidebar"
        data-testid="citadel-sidebar"
        className={`bg-black border-r border-zinc-800 text-zinc-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          isOpenMobile
            ? 'fixed inset-y-0 left-0 z-50 w-64 shadow-2xl flex translate-x-0 overflow-hidden'
            : 'hidden lg:flex lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-hidden'
        }`}
      >
        {/* Mobile Header */}
        <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between shrink-0 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/10">
              <CitadelLogo variant="mark" colorMode="dark" className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xs font-bold text-white tracking-tight leading-none">
                Citadel People Hub
              </span>
              <span className="text-[10px] text-emerald-200/70 font-medium mt-0.5">
                Workforce Management
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Quick Collapse Bar */}
        <div
          className={`hidden lg:flex items-center border-b border-white/10 shrink-0 ${
            isCollapsed ? 'py-3 px-2 justify-center' : 'py-2.5 px-4 justify-between'
          }`}
        >
          {!isCollapsed ? (
            <>
              <span className="text-[10px] font-semibold uppercase text-emerald-100/55 tracking-widest">
                Workspace
              </span>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-emerald-100/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Collapse Sidebar (Ctrl+B)"
                aria-label="Collapse Sidebar"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-emerald-100/70 hover:text-white transition group cursor-pointer"
              title="Expand Sidebar (Ctrl+B)"
              aria-label="Expand Sidebar"
            >
              <ChevronsRight className="w-4 h-4 text-emerald-100/70 group-hover:text-white transition" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className={`flex-1 overflow-y-auto custom-scrollbar min-h-0 space-y-5 py-3.5 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter((item) => item.visible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-0.5">
                {!isCollapsed ? (
                  <div className="px-3 pb-1.5 text-[10px] font-semibold text-emerald-100/45 uppercase tracking-widest">
                    {section.label}
                  </div>
                ) : (
                  <div className="my-1.5 border-t border-white/10" />
                )}

                {visibleItems.map((item) => {
                  const isActive = currentModule === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      data-testid={`nav-item-${item.id}`}
                      aria-current={isActive ? 'page' : undefined}
                      title={isCollapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
                      onClick={() => {
                        onSelectModule(item.id);
                        onCloseMobile();
                      }}
                      className={`relative w-full flex items-center rounded-lg text-[13px] transition-all duration-150 group cursor-pointer min-h-[38px] ${
                        isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                      } ${
                        isActive
                          ? 'bg-zinc-900 text-white font-semibold border border-[#D4AF37]'
                          : 'text-emerald-100/70 font-medium border border-transparent hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-[#E5C76B]' : 'text-emerald-100/50 group-hover:text-emerald-100'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {/* Quiet Tabular Pending Count */}
                      {!isCollapsed && item.badge && (
                        <span className="text-[11px] font-mono font-semibold text-[#E5C76B] tabular-nums shrink-0 pl-2">
                          {item.badge}
                        </span>
                      )}

                      {/* Collapsed View Indicator for Pending Count */}
                      {isCollapsed && item.badge && !isActive && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#E5C76B]" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Bottom Actions Area */}
        <div className={`border-t border-white/10 space-y-2 shrink-0 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {/* Add Employee Action (Restricted to Admin & HR Staff) */}
          {canManageEmployees && (
            <button
              type="button"
              onClick={() => {
                onOpenAddEmployee?.();
                onCloseMobile();
              }}
              data-testid="sidebar-add-employee-btn"
              title="Add New Employee"
              className={`w-full bg-[#0E4F43] hover:bg-[#136153] text-white border border-emerald-400/20 rounded-lg font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer min-h-[40px] ${
                isCollapsed ? 'w-10 h-10 mx-auto p-0' : 'py-2 px-3 text-xs'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[2.25]" />
              {!isCollapsed && <span>Add Employee</span>}
            </button>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={async () => {
              onCloseMobile();
              await logout();
            }}
            data-testid="sidebar-logout-btn"
            className={`w-full flex items-center text-xs font-medium rounded-lg transition border min-h-[38px] group cursor-pointer ${
              isCollapsed
                ? 'w-10 h-10 mx-auto justify-center p-0 text-emerald-100/60 hover:text-rose-300 hover:bg-rose-500/10 border-white/10 hover:border-rose-500/30'
                : 'justify-between px-3 py-2 text-emerald-100/75 hover:text-rose-200 hover:bg-rose-500/10 border-white/10 hover:border-rose-500/30'
            }`}
            title="Log out of Citadel People Hub"
          >
            <div className="flex items-center gap-2.5 truncate">
              <LogOut className="w-4 h-4 text-emerald-100/50 group-hover:text-rose-300 shrink-0 transition-colors" />
              {!isCollapsed && (
                <span className="truncate text-xs font-semibold text-emerald-50/90 group-hover:text-rose-200 transition-colors">
                  Sign out
                </span>
              )}
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
