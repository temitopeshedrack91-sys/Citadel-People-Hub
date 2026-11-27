import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Building2,
  ChevronDown,
  Search,
  Menu,
  MessageSquare,
  Command,
  ChevronsRight,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { notificationRepository } from '../../services';
import { SystemNotification } from '../../types';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { CITADEL_BRAND } from '../../theme/branding';
import { CitadelLogo } from '../brand/CitadelLogo';
import { ProfileEditModal } from '../profile/ProfileEditModal';
import { NavModule } from './Sidebar';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeModuleTitle: string;
  activeModuleId: NavModule;
  onNavigate: (module: NavModule) => void;
  onOpenNewTask?: () => void;
  onOpenLoginModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  isSidebarCollapsed = false,
  onToggleCollapse,
  activeModuleTitle,
  activeModuleId,
  onNavigate,
  onOpenNewTask,
  onOpenLoginModal,
}) => {
  const {
    currentUser,
    currentRole,
    currentPersona,
    selectedEntityFilter,
    setSelectedEntityFilter,
    logout,
  } = useAuth();

  const [isEntityMenuOpen, setIsEntityMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rightActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (rightActionsRef.current && !rightActionsRef.current.contains(event.target as Node)) {
        setIsEntityMenuOpen(false);
        setIsNotificationsOpen(false);
        setIsProfileMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEntityMenuOpen(false);
        setIsNotificationsOpen(false);
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const loadNotifications = React.useCallback(async () => {
    try {
      const items = await notificationRepository.getAll();
      setNotifications(items);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications, currentUser.id]);

  useRealtimeTable('notifications', () => {
    void loadNotifications();
  });

  useRealtimeTable('leave_requests', () => {
    void loadNotifications();
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const entities = [
    { id: 'all', name: 'All Citadel Entities', shortCode: 'All Entities' },
    ...CITADEL_BRAND.entities,
  ];

  const currentEntityName =
    selectedEntityFilter === 'all'
      ? 'All Citadel Entities'
      : entities.find((e) => e.id === selectedEntityFilter)?.name || 'Citadel';

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
    const q = searchQuery.trim();
    if (q) {
      try {
        sessionStorage.setItem('citadel_pending_search', q);
      } catch {}
      window.dispatchEvent(new CustomEvent('citadel:global-search', { detail: q }));
      onNavigate('directory');
    }
  };

  return (
    <>
      <header
        id="citadel-hub-header"
        data-testid="citadel-header"
        className="w-full bg-white/95 backdrop-blur-sm border-b border-slate-200/80 sticky top-0 z-40"
      >
        <div className="w-full px-3.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-6">
          {/* Left: Mobile Toggle & Brand Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083E34]/30"
              title="Toggle Navigation Menu"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo & Name */}
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="cursor-pointer hover:opacity-90 transition flex items-center gap-2.5 shrink-0 text-left rounded-lg py-1 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083E34]/30"
              title="Citadel People Hub Dashboard"
              aria-label="Go to Citadel People Hub Dashboard"
            >
              <img
                src="/citadel-logo.png"
                alt="The Citadel Global Community Church"
                className="h-7 w-7 object-contain rounded"
              />
              <div className="hidden min-[420px]:flex flex-col">
                <span className="font-display text-[13px] font-bold text-slate-900 tracking-tight leading-none">
                  Citadel
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
                  People Hub
                </span>
              </div>
            </button>
          </div>

          {/* Center: Global Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1 max-w-md hidden sm:block mx-auto"
          >
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              data-testid="header-search-input"
              aria-label="Search employees, documents or resources"
              placeholder="Search employees, documents, or records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-14 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/90 rounded-lg text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#083E34] focus:bg-white focus:ring-2 focus:ring-[#083E34]/12 transition"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-white border border-slate-200/90 px-1.5 py-0.5 rounded pointer-events-none">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </form>

          {/* Right Group: Entity Selector + Action Icons + Profile Pill */}
          <div ref={rightActionsRef} className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Entity Selector Filter */}
            <div className="hidden md:flex items-center relative">
              <button
                id="btn-entity-scope-filter"
                type="button"
                aria-expanded={isEntityMenuOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setIsEntityMenuOpen(!isEntityMenuOpen);
                  setIsNotificationsOpen(false);
                  setIsProfileMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/90 hover:border-slate-300 text-xs text-slate-700 font-medium transition cursor-pointer whitespace-nowrap"
              >
                <Building2 className="w-3.5 h-3.5 text-[#083E34] shrink-0" />
                <span className="truncate max-w-[140px] text-xs font-semibold">{currentEntityName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isEntityMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-fade-in"
                  onClick={() => setIsEntityMenuOpen(false)}
                >
                  <div className="px-3.5 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Select Citadel Entity Scope
                  </div>
                  {entities.map((ent) => (
                    <button
                      type="button"
                      role="menuitem"
                      key={ent.id}
                      onClick={() => setSelectedEntityFilter(ent.id)}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
                        selectedEntityFilter === ent.id
                          ? 'bg-[#EBF5F2] font-bold text-[#083E34]'
                          : 'text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold">{ent.name}</span>
                        {'shortCode' in ent && (
                          <span className="text-[10px] text-slate-500">{ent.shortCode}</span>
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

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                id="btn-header-notifications"
                data-testid="header-notifications-btn"
                aria-expanded={isNotificationsOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsEntityMenuOpen(false);
                  setIsProfileMenuOpen(false);
                }}
                className="w-9 h-9 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center relative transition cursor-pointer"
                title="Notifications"
                aria-label={`View notifications (${unreadCount} unread)`}
              >
                <Bell className="w-4 h-4 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#B45309] ring-2 ring-white" />
                )}
              </button>

              {isNotificationsOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in"
                  onClick={() => setIsNotificationsOpen(false)}
                >
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">Notifications</span>
                    <span className="text-[11px] font-semibold text-[#B45309] tabular-nums">
                      {unreadCount} unread
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 6).map((n) => (
                        <button
                          type="button"
                          key={n.id}
                          onClick={async () => {
                            if (!n.isRead) {
                              await notificationRepository.markAsRead(n.id).catch(() => undefined);
                              void loadNotifications();
                            }
                            onNavigate(
                              (n.category || '').toLowerCase().includes('leave')
                                ? 'leave'
                                : 'notifications'
                            );
                          }}
                          className={`w-full text-left p-3.5 text-xs hover:bg-slate-50 cursor-pointer transition block ${
                            !n.isRead ? 'bg-amber-50/35' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900">{n.title}</span>
                            <span className="text-[10px] text-slate-500 shrink-0 tabular-nums">{n.timestamp}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                        </button>
                      ))
                    ) : (
                      <div className="p-5 text-xs text-slate-500 text-center">
                        No notifications right now.
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 text-center">
                    <button
                      type="button"
                      onClick={() => onNavigate('notifications')}
                      className="text-xs text-[#083E34] hover:text-[#052C25] hover:underline font-semibold cursor-pointer"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Team Notes Button */}
            <button
              type="button"
              onClick={() => onNavigate('team-notes')}
              className="w-9 h-9 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 hidden sm:flex items-center justify-center transition cursor-pointer"
              title="Team Notes & Discussions"
              aria-label="Team Notes"
            >
              <MessageSquare className="w-4 h-4 text-slate-600" />
            </button>

            {/* User Profile Trigger */}
            <div className="relative">
              <button
                type="button"
                data-testid="header-user-profile-pill"
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
                aria-label="Account Options"
                onClick={() => {
                  setIsProfileMenuOpen(!isProfileMenuOpen);
                  setIsEntityMenuOpen(false);
                  setIsNotificationsOpen(false);
                }}
                className="flex items-center gap-2 sm:gap-2.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200/90 hover:bg-slate-50 cursor-pointer transition select-none bg-white"
                title="Account Options"
              >
                <div className="shrink-0">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#083E34] text-white font-semibold flex items-center justify-center text-[11px]">
                      {currentUser.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-900 leading-tight flex items-center gap-1">
                    <span className="truncate max-w-[130px]">{currentUser.name}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">
                    {currentUser.jobTitle || 'PCCM Super Admin'}
                  </div>
                </div>
              </button>

              {/* Account Dropdown Menu */}
              {isProfileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-[16rem] sm:w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 animate-fade-in"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  <div className="p-3 border-b border-slate-100 mb-1">
                    <p className="text-xs font-semibold text-slate-900 leading-none">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500 mt-1 truncate font-mono">{currentUser.email}</p>
                    <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#083E34]">
                      {currentPersona.badgeLabel}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setIsProfileOpen(true)}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>Edit Profile Details</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => logout()}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  >
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Secondary Header Utility Action: New Task */}
            <button
              type="button"
              onClick={() => {
                if (onOpenNewTask) {
                  onOpenNewTask();
                } else {
                  onNavigate('projects');
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('trellis-open-new-task'));
                  }, 50);
                }
              }}
              data-testid="header-new-task-btn"
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-[#EBF5F2] hover:bg-[#DCEEE8] text-[#083E34] text-xs font-semibold flex items-center gap-1.5 border border-[#083E34]/20 transition active:scale-[0.98] cursor-pointer shrink-0 whitespace-nowrap min-h-[36px]"
              title="Create New Task"
            >
              <Plus className="w-3.5 h-3.5 text-[#083E34] stroke-[2.25] shrink-0" />
              <span className="hidden sm:inline">New task</span>
            </button>
          </div>
        </div>
      </header>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
};

export default Header;
