import React, { useState } from 'react';
import {
  Bell,
  Building2,
  ChevronDown,
  UserCheck,
  Shield,
  Menu,
  X,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  LogIn,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth, PRESET_PERSONAS } from '../../context/AuthContext';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { CITADEL_BRAND } from '../../theme/branding';
import { CitadelLogo } from '../brand/CitadelLogo';
import { LoginModal } from '../auth/LoginModal';
import { NavModule } from './Sidebar';

interface HeaderProps {
  onToggleSidebar?: () => void;
  activeModuleTitle: string;
  activeModuleId: NavModule;
  onNavigate: (module: NavModule) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
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

  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [isEntityMenuOpen, setIsEntityMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
      time: '10 mins ago',
      unread: true,
      module: 'leave' as NavModule,
    },
    {
      id: 'notif-2',
      title: 'Attendance Anomaly',
      desc: '3 staff members flagged late at Citadel Gatehouse biometrics.',
      time: '45 mins ago',
      unread: true,
      module: 'attendance' as NavModule,
    },
    {
      id: 'notif-3',
      title: 'Onboarding Milestone',
      desc: 'Engr. Daniel Alabi completed IT asset setup.',
      time: '2 hours ago',
      unread: false,
      module: 'onboarding' as NavModule,
    },
  ];

  return (
    <>
      <header
        id="citadel-hub-header"
        className="bg-[#0A1E3F] text-white border-b border-slate-800 sticky top-0 z-40 shadow-md"
      >
        <div className="px-3 sm:px-5 lg:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Mobile Toggle & Official Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Official Citadel Logo Component */}
            <div
              onClick={() => onNavigate('dashboard')}
              className="cursor-pointer hover:opacity-95 transition"
              title="Citadel People Hub Dashboard"
            >
              <CitadelLogo variant="hub" colorMode="dark" className="h-9 sm:h-10" />
            </div>

            {/* Breadcrumb Separator on Large screens */}
            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-slate-700/80 text-xs text-slate-400">
              <span className="text-slate-400 font-medium">Workspace</span>
              <span>/</span>
              <span className="text-amber-300 font-semibold">{activeModuleTitle}</span>
            </div>
          </div>

          {/* Center: Organization Entity Switcher */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <button
                id="btn-entity-scope-filter"
                type="button"
                onClick={() => setIsEntityMenuOpen(!isEntityMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-[#C59B27] text-xs text-slate-200 transition shadow-inner"
              >
                <Building2 className="w-3.5 h-3.5 text-[#C59B27]" />
                <span className="truncate max-w-[190px] font-medium">{currentEntityName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isEntityMenuOpen && (
                <div
                  className="absolute left-0 mt-1.5 w-72 rounded-xl bg-white text-slate-900 shadow-2xl border border-slate-200 py-1.5 z-50 animate-fade-in"
                  onClick={() => setIsEntityMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Citadel Entity Scope
                  </div>
                  {entities.map((ent) => (
                    <button
                      key={ent.id}
                      onClick={() => setSelectedEntityFilter(ent.id)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                        selectedEntityFilter === ent.id
                          ? 'bg-amber-50 font-semibold text-[#0A1E3F]'
                          : 'text-slate-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{ent.name}</span>
                        {'shortCode' in ent && (
                          <span className="text-[10px] text-slate-400">{ent.shortCode}</span>
                        )}
                      </div>
                      {selectedEntityFilter === ent.id && (
                        <span className="w-2 h-2 rounded-full bg-[#C59B27]"></span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick Search, Notifications, Persona / Auth Switcher, User Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Quick Search Shortcut */}
            <button
              onClick={() => onNavigate('employees')}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 transition"
              title="Search Personnel"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline text-[11px]">Search personnel...</span>
            </button>

            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* Notifications Popover Trigger */}
            <div className="relative">
              <button
                id="btn-header-notifications"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 relative transition"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C59B27] ring-2 ring-[#0A1E3F]"></span>
              </button>

              {isNotificationsOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 rounded-xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden z-50 animate-fade-in"
                  onClick={() => setIsNotificationsOpen(false)}
                >
                  <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
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
                          <span className="font-semibold text-slate-800">{n.title}</span>
                          <span className="text-[10px] text-slate-400">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                    <button
                      onClick={() => onNavigate('notifications')}
                      className="text-xs text-[#0A1E3F] hover:text-[#152B52] font-semibold"
                    >
                      View All Notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Persona Switcher / Sign-In Modal Trigger */}
            <button
              id="btn-header-auth-switch"
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#C59B27]/15 hover:bg-[#C59B27]/25 border border-[#C59B27]/40 text-xs text-amber-300 transition"
              title="Click to authenticate or test role permissions"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#C59B27]" />
              <span className="hidden sm:inline font-medium">{currentPersona.badgeLabel}</span>
              <SlidersHorizontal className="w-3 h-3 text-amber-300/80" />
            </button>

            {/* User Profile Mini Badge */}
            <div
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-2 pl-2 border-l border-slate-700 cursor-pointer hover:opacity-90 transition"
              title="Click to view authenticated user profile or switch"
            >
              <div className="w-8 h-8 rounded-full bg-[#C59B27] text-slate-950 font-extrabold flex items-center justify-center text-xs shadow-xs">
                {currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="hidden xl:block text-left">
                <div className="text-xs font-semibold text-white leading-none">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {currentUser.staffId}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Branded Authentication & Role Switcher Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
};
