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
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CitadelLogo } from '../brand/CitadelLogo';
import { canAccessModule, canPerformAction } from '../../utils/rbac';

export type NavModule =
  | 'dashboard'
  | 'employees'
  | 'directory'
  | 'leave'
  | 'attendance'
  | 'projects'
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
  const { currentRole, currentUser, currentPersona, logout } = useAuth();

  const canManageEmployees = canPerformAction(currentUser, 'manage_employees').allowed;

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
          badge: 'Live',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        },
        {
          id: 'leave' as NavModule,
          label: 'Leave',
          icon: CalendarDays,
          visible: canAccessModule(currentUser || currentRole, 'leave'),
          badge: '2',
          badgeColor: 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40',
        },
        {
          id: 'projects' as NavModule,
          label: 'Projects',
          icon: FolderTree,
          visible: canAccessModule(currentUser || currentRole, 'projects'),
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
        <div className="h-16 px-4 border-b border-zinc-800 flex items-center justify-between bg-black shrink-0 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 ring-1 ring-zinc-700">
              <CitadelLogo variant="mark" colorMode="dark" className="h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-tight leading-none">
                Citadel People Hub
              </span>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
                Workforce Management
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Quick Collapse Bar */}
        <div
          className={`hidden lg:flex items-center border-b border-zinc-800 bg-black shrink-0 ${
            isCollapsed ? 'py-3 px-2 justify-center' : 'py-2.5 px-4 justify-between'
          }`}
        >
          {!isCollapsed ? (
            <>
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                Workforce Management
              </span>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
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
              className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition group cursor-pointer"
              title="Expand Sidebar (Ctrl+B)"
              aria-label="Expand Sidebar"
            >
              <ChevronsRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
            </button>
          )}
        </div>

        {/* Navigation List with Sleek Custom Scrollbar */}
        <nav className={`flex-1 overflow-y-auto custom-scrollbar min-h-0 space-y-4 py-3 bg-black ${isCollapsed ? 'px-2' : 'px-3.5'}`}>
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter((item) => item.visible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {!isCollapsed ? (
                  <div className="px-3 pb-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {section.label}
                  </div>
                ) : (
                  <div className="my-1 border-t border-zinc-800" />
                )}

                {visibleItems.map((item) => {
                  const isActive = currentModule === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      data-testid={`nav-item-${item.id}`}
                      title={isCollapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
                      onClick={() => {
                        onSelectModule(item.id);
                        onCloseMobile();
                      }}
                      className={`relative w-full flex items-center rounded-xl text-xs transition-all duration-150 group cursor-pointer min-h-[40px] ${
                        isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                      } ${
                        isActive
                          ? 'bg-zinc-900 text-white font-bold ring-1 ring-[#D4AF37]/40 shadow-2xs border-l-2 border-[#D4AF37]'
                          : 'text-zinc-400 font-medium hover:bg-zinc-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-[#D4AF37]' : 'text-zinc-500 group-hover:text-white'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {/* Expanded View Badges */}
                      {!isCollapsed && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badge && !isActive && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${item.badgeColor}`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_6px_#D4AF37]" />
                          )}
                        </div>
                      )}

                      {/* Collapsed View Dot for Badges */}
                      {isCollapsed && item.badge && !isActive && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D4AF37] ring-2 ring-black" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Bottom Actions Area */}
        <div className={`border-t border-zinc-800 bg-black space-y-2 shrink-0 ${isCollapsed ? 'p-2' : 'p-3.5'}`}>
          {/* Prominent + Add New Employee Button (Restricted to Admin & HR Staff) */}
          {canManageEmployees && (
            <button
              onClick={() => {
                onOpenAddEmployee?.();
                onCloseMobile();
              }}
              data-testid="sidebar-add-employee-btn"
              title="Add New Employee"
              className={`w-full bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.98] min-h-[42px] ${
                isCollapsed ? 'w-10 h-10 mx-auto p-0' : 'py-2 px-3 text-xs'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              {!isCollapsed && <span>Add Employee</span>}
            </button>
          )}

          {/* Logout Button */}
          <button
            onClick={async () => {
              onCloseMobile();
              await logout();
            }}
            data-testid="sidebar-logout-btn"
            className={`w-full flex items-center text-xs font-semibold rounded-xl transition border min-h-[40px] group cursor-pointer ${
              isCollapsed
                ? 'w-10 h-10 mx-auto justify-center p-0 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border-zinc-800 hover:border-rose-500/30'
                : 'justify-between px-3 py-2 text-zinc-300 hover:text-rose-300 hover:bg-rose-500/10 border-zinc-800 hover:border-rose-500/30'
            }`}
            title="Log out of Citadel People Hub"
          >
            <div className="flex items-center gap-2.5 truncate">
              <LogOut className="w-4 h-4 text-zinc-500 group-hover:text-rose-400 shrink-0 transition-colors" />
              {!isCollapsed && (
                <span className="truncate text-xs font-bold text-zinc-200 group-hover:text-rose-200 transition-colors">
                  Logout
                </span>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] text-zinc-500 group-hover:text-rose-300 font-medium transition-colors">
                Sign out
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
