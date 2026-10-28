import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Building2,
  ChevronDown,
  Search,
  Menu,
  MessageSquare,
  HelpCircle,
  Command,
  ChevronsRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { CITADEL_BRAND } from '../../theme/branding';
import { CitadelLogo } from '../brand/CitadelLogo';
import { LoginModal } from '../auth/LoginModal';
import { NavModule } from './Sidebar';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeModuleTitle: string;
  activeModuleId: NavModule;
  onNavigate: (module: NavModule) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  isSidebarCollapsed = false,
  onToggleCollapse,
  activeModuleTitle,
  activeModuleId,
  onNavigate,
}) => {
  const {
    currentUser,
    currentRole,
    currentPersona,
    selectedEntityFilter,
    setSelectedEntityFilter,
  } = useAuth();

  const [isEntityMenuOpen, setIsEntityMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const entities = [
    { id: 'all', name: 'All Citadel Entities', shortCode: 'All Entities' },
    ...CITADEL_BRAND.entities,
  ];

  const currentEntityName =
    selectedEntityFilter === 'all'
      ? 'All Citadel Entities'
      : entities.find((e) => e.id === selectedEntityFilter)?.name || 'Citadel';

  const mockNotifications = [
    {
      id: 'notif-1',
      title: 'New Leave Application',
      desc: 'Blessing Okafor submitted Casual Leave for 2 days.',
      time: '10m ago',
      unread: true,
      module: 'leave' as NavModule,
    },
    {
      id: 'notif-2',
      title: 'Attendance Anomaly',
      desc: '3 staff members flagged at Citadel Gatehouse biometrics.',
      time: '45m ago',
      unread: true,
      module: 'attendance' as NavModule,
    },
    {
      id: 'notif-3',
      title: 'Onboarding Milestone',
      desc: 'Engr. Daniel Alabi completed IT asset setup.',
      time: '2h ago',
      unread: false,
      module: 'onboarding' as NavModule,
    },
  ];

  // Shortcut: Cmd+K or Ctrl+K focuses the search input matching Pillio reference
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('directory');
    }
  };

  return (
    <>
      <header
        id="citadel-hub-header"
        data-testid="citadel-header"
        className="w-full bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-[0_1px_3px_rgba(15,23,42,0.02)]"
      >
        <div className="w-full px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-6">
          {/* Left: Mobile Toggle & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition shrink-0"
              title="Toggle Navigation Menu"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Sidebar Collapse Toggle */}
            {onToggleCollapse && (
              <button
                type="button"
                id="btn-collapse-sidebar-header"
                onClick={onToggleCollapse}
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 transition shrink-0 cursor-pointer"
                title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
                aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isSidebarCollapsed ? (
                  <ChevronsRight className="w-4 h-4 text-slate-700" />
                ) : (
                  <Menu className="w-4 h-4 text-slate-700" />
                )}
              </button>
            )}

            {/* Brand Logo & Name */}
            <div
              onClick={() => onNavigate('dashboard')}
              className="cursor-pointer hover:opacity-95 transition flex items-center gap-2.5 shrink-0"
              title="Citadel People Hub Dashboard"
            >
              <div className="w-8 h-8 rounded-xl bg-[#083E34] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                <CitadelLogo variant="mark" colorMode="dark" className="h-4" />
              </div>
              <div className="hidden min-[420px]:flex flex-col">
                <span className="text-xs font-black text-slate-900 tracking-tight leading-none">
                  Citadel
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                  People Hub
                </span>
              </div>
            </div>
          </div>

          {/* Center: Global Search Bar matching Hrivio/Pillio layout */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1 max-w-md hidden sm:block mx-auto"
          >
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              data-testid="header-search-input"
              placeholder="Search for employees, documents or resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-14 py-2 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-full text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#083E34] focus:bg-white focus:ring-1 focus:ring-[#083E34]/20 transition"
            />
            <div className="absolute right-3 top-2 flex items-center gap-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md pointer-events-none">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </form>

          {/* Right Group: Entity Selector + Action Icons + Profile Pill */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Entity Selector Filter */}
            <div className="hidden md:flex items-center relative">
              <button
                id="btn-entity-scope-filter"
                type="button"
                onClick={() => setIsEntityMenuOpen(!isEntityMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs text-slate-700 font-semibold transition"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate max-w-[140px] text-xs font-bold">{currentEntityName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isEntityMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-fade-in"
                  onClick={() => setIsEntityMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Select Citadel Entity Scope
                  </div>
                  {entities.map((ent) => (
                    <button
                      key={ent.id}
                      onClick={() => setSelectedEntityFilter(ent.id)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                        selectedEntityFilter === ent.id
                          ? 'bg-emerald-50/60 font-bold text-[#083E34]'
                          : 'text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold">{ent.name}</span>
                        {'shortCode' in ent && (
                          <span className="text-[10px] text-slate-400">{ent.shortCode}</span>
                        )}
                      </div>
                      {selectedEntityFilter === ent.id && (
                        <span className="w-2 h-2 rounded-full bg-[#083E34]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* Notification Bell in Rounded Square Button matching Hrivio */}
            <div className="relative">
              <button
                id="btn-header-notifications"
                data-testid="header-notifications-btn"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center relative transition shadow-2xs"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
              </button>

              {isNotificationsOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in"
                  onClick={() => setIsNotificationsOpen(false)}
                >
                  <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      2 Unread
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {mockNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => onNavigate(n.module)}
                        className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition ${
                          n.unread ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{n.title}</span>
                          <span className="text-[10px] text-slate-400">{n.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                    <button
                      onClick={() => onNavigate('notifications')}
                      className="text-xs text-[#083E34] hover:underline font-bold"
                    >
                      View All Notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Chat / Messages Button matching Hrivio */}
            <button
              onClick={() => onNavigate('team-notes')}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hidden sm:flex items-center justify-center transition shadow-2xs"
              title="Team Notes & Discussions"
              aria-label="Team Notes"
            >
              <MessageSquare className="w-4 h-4 text-slate-600" />
            </button>

            {/* User Profile Pill matching Hrivio reference (Avatar + Name + Email + Chevron) */}
            <div
              data-testid="header-user-profile-pill"
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200 cursor-pointer hover:opacity-90 transition group"
              title="Switch role or manage session"
            >
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-[#083E34] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-400 font-medium truncate max-w-[150px]">
                  {currentUser.email}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition shrink-0" />
            </div>
          </div>
        </div>
      </header>

      {/* Role & Persona Switcher Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
};

export default Header;
