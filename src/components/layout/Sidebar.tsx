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
  | 'audit-logs';

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
  const { currentRole, permissions, currentPersona } = useAuth();

  const isPCCM = currentRole === 'PCCM_SUPER_ADMIN';
  const isBizHead = currentRole === 'BUSINESS_HEAD';
  const isDeptHead = currentRole === 'DEPARTMENT_HEAD';
  const isEmployee = currentRole === 'EMPLOYEE';

  // Navigation structured into MENU, OPERATIONS, and SUPPORT matching reference designs
  const navSections = [
    {
      label: 'MENU',
      items: [
        {
          id: 'dashboard' as NavModule,
          label: 'Dashboard',
          icon: LayoutDashboard,
          visible: true,
        },
        {
          id: 'employees' as NavModule,
          label: 'Employees',
          icon: Users,
          visible: true,
        },
        {
          id: 'attendance' as NavModule,
          label: 'Attendance',
          icon: Clock,
          visible: true,
          badge: 'Live',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        },
        {
          id: 'leave' as NavModule,
          label: 'Leave',
          icon: CalendarDays,
          visible: true,
          badge: '2',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        },
        {
          id: 'projects' as NavModule,
          label: 'Projects',
          icon: FolderTree,
          visible: true,
          badge: 'v3.2',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
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
          visible: true,
        },
        {
          id: 'team-notes' as NavModule,
          label: 'Team Notes',
          icon: StickyNote,
          visible: true,
        },
        {
          id: 'directory' as NavModule,
          label: 'Directory',
          icon: Contact,
          visible: true,
        },
        {
          id: 'onboarding' as NavModule,
          label: 'Onboarding',
          icon: UserPlus,
          visible: true,
        },
        {
          id: 'documents' as NavModule,
          label: 'Documents',
          icon: FileText,
          visible: true,
        },
        {
          id: 'performance' as NavModule,
          label: 'Performance',
          icon: Award,
          visible: true,
        },
        {
          id: 'reports' as NavModule,
          label: 'Reports',
          icon: BarChart3,
          visible: true,
        },
      ],
    },
    {
      label: 'SUPPORT',
      items: [
        {
          id: 'settings' as NavModule,
          label: 'Settings',
          icon: Settings,
          visible: true,
        },
        {
          id: 'ai-assistant' as NavModule,
          label: 'Help & Assistant',
          icon: HelpCircle,
          visible: true,
        },
        {
          id: 'audit-logs' as NavModule,
          label: 'Audit Trail',
          icon: ShieldCheck,
          visible: true,
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
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Dark Sidebar Container */}
      <aside
        id="citadel-hub-sidebar"
        data-testid="citadel-sidebar"
        className={`bg-[#06241E] border-r border-[#0D342C] text-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          isOpenMobile
            ? 'fixed inset-y-0 left-0 z-50 w-64 shadow-2xl flex translate-x-0 overflow-hidden'
            : 'hidden lg:flex lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-hidden'
        }`}
      >
        {/* Mobile Header */}
        <div className="h-16 px-4 border-b border-[#0D342C] flex items-center justify-between bg-[#06241E] shrink-0 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 ring-1 ring-white/10">
              <CitadelLogo variant="mark" colorMode="dark" className="h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-tight leading-none">
                Citadel People Hub
              </span>
              <span className="text-[10px] text-emerald-300/70 font-medium mt-0.5">
                Workforce Management
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Quick Collapse Bar */}
        <div
          className={`hidden lg:flex items-center border-b border-[#0D342C] shrink-0 ${
            isCollapsed ? 'py-3 px-2 justify-center' : 'py-2.5 px-4 justify-between'
          }`}
        >
          {!isCollapsed ? (
            <>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Workforce Management
              </span>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
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
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition group cursor-pointer"
              title="Expand Sidebar (Ctrl+B)"
              aria-label="Expand Sidebar"
            >
              <ChevronsRight className="w-4 h-4 text-slate-300 group-hover:text-white transition" />
            </button>
          )}
        </div>

        {/* Navigation List with Sleek Custom Scrollbar */}
        <nav className={`flex-1 overflow-y-auto custom-scrollbar min-h-0 space-y-4 py-3 ${isCollapsed ? 'px-2' : 'px-3.5'}`}>
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter((item) => item.visible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {!isCollapsed ? (
                  <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {section.label}
                  </div>
                ) : (
                  <div className="my-1 border-t border-white/10" />
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
                          ? 'bg-white/12 text-white font-bold ring-1 ring-white/15 shadow-2xs'
                          : 'text-slate-300 font-medium hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
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
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          )}
                        </div>
                      )}

                      {/* Collapsed View Dot for Badges */}
                      {isCollapsed && item.badge && !isActive && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#06241E]" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Bottom Actions Area */}
        <div className={`border-t border-[#0D342C] bg-[#06241E] space-y-2 shrink-0 ${isCollapsed ? 'p-2' : 'p-3.5'}`}>
          {/* Prominent + Add New Employee Button */}
          {isPCCM && (
            <button
              onClick={() => {
                onOpenAddEmployee?.();
                onCloseMobile();
              }}
              data-testid="sidebar-add-employee-btn"
              title="Add New Employee"
              className={`w-full bg-[#0A473C] hover:bg-[#0d594b] text-white rounded-xl font-bold flex items-center justify-center gap-2 border border-emerald-500/20 shadow-xs transition active:scale-[0.98] min-h-[42px] ${
                isCollapsed ? 'w-10 h-10 mx-auto p-0' : 'py-2 px-3 text-xs'
              }`}
            >
              <Plus className="w-4 h-4" />
              {!isCollapsed && <span>Add Employee</span>}
            </button>
          )}

          {/* Persona Switcher / Role Chip */}
          <button
            onClick={() => {
              onOpenLoginModal?.();
              onCloseMobile();
            }}
            data-testid="sidebar-switch-role-btn"
            className={`w-full flex items-center text-xs text-slate-300 font-medium hover:text-white hover:bg-white/5 rounded-xl transition border border-white/10 min-h-[40px] ${
              isCollapsed ? 'w-10 h-10 mx-auto justify-center p-0' : 'justify-between px-3 py-2'
            }`}
            title={`Switch Role: ${currentPersona.badgeLabel}`}
          >
            <div className="flex items-center gap-2 truncate">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {!isCollapsed && (
                <span className="truncate text-[11px] font-semibold text-slate-300">
                  {currentPersona.badgeLabel}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] text-slate-400 font-medium">Switch</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
