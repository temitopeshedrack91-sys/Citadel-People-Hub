import React, { useState } from 'react';
import {
  Smartphone,
  LayoutGrid,
  List,
  CalendarRange,
  FileText,
  Paperclip,
  ChevronDown,
  Share2,
  Plus,
  Inbox,
  CheckSquare,
  UserCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useTrellis } from './TrellisContext';
import { ViewTab } from './types';

export const TrellisHeader: React.FC = () => {
  const {
    tasks,
    activeTab,
    setActiveTab,
    myTasksMode,
    setMyTasksMode,
    selectedGroupFilter,
    setSelectedGroupFilter,
    selectedAssigneeFilter,
    setSelectedAssigneeFilter,
    selectedLabelFilter,
    setSelectedLabelFilter,
    teamMembers,
    currentUser,
    switchUser,
    unreadNotificationCount,
    setIsInboxOpen,
    setIsNewTaskModalOpen,
  } = useTrellis();

  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);

  const openCount = tasks.filter((t) => t.status !== 'Done').length;
  const doneCount = tasks.filter((t) => t.status === 'Done').length;
  const myTasksCount = tasks.filter(
    (t) =>
      (t.assigneeId === currentUser.id ||
        (currentUser.supabaseId && String(t.assigneeId) === String(currentUser.supabaseId))) &&
      t.status !== 'Done'
  ).length;

  const tabs: { key: ViewTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'board', label: 'Board', icon: LayoutGrid },
    { key: 'list', label: 'List', icon: List },
    { key: 'timeline', label: 'Timeline', icon: CalendarRange },
    { key: 'docs', label: 'Docs', icon: FileText },
    { key: 'files', label: 'Files', icon: Paperclip },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] p-5 space-y-4">
      {/* Top Utility Bar: Breadcrumb & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium overflow-x-auto no-scrollbar">
          <span>Citadel People Hub</span>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Projects</span>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-bold text-slate-900 shrink-0">Citadel People Hub</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Team Avatar Stack */}
          <div className="flex -space-x-1.5 overflow-hidden items-center mr-1">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                title={`${member.name} (${member.role})`}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] ring-2 ring-white select-none ${member.avatarBg} ${member.avatarText} shrink-0`}
              >
                {member.initials}
              </div>
            ))}
          </div>

          {/* User Persona Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setIsUserSwitcherOpen((prev) => !prev)}
              data-testid="trellis-user-switcher-btn"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <span className="text-[10px] text-slate-400">Acting as:</span>
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] ${currentUser.avatarBg} ${currentUser.avatarText}`}
              >
                {currentUser.initials}
              </span>
              <span className="font-bold">{currentUser.name.split(' ')[0]}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isUserSwitcherOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-slate-200 shadow-xl p-1 z-50 space-y-0.5 animate-fade-in">
                <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Switch User</span>
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                </div>
                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      switchUser(member.id);
                      setIsUserSwitcherOpen(false);
                    }}
                    data-testid={`trellis-switch-to-${member.id}`}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition cursor-pointer ${member.id === currentUser.id
                      ? 'bg-slate-100 font-bold text-slate-950'
                      : 'hover:bg-slate-50 text-slate-700'
                      }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${member.avatarBg} ${member.avatarText}`}
                    >
                      {member.initials}
                    </span>
                    <span className="truncate">{member.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Inbox Button */}
          <button
            onClick={() => setIsInboxOpen(true)}
            data-testid="trellis-nav-inbox"
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer"
            title="Notifications Inbox"
          >
            <Inbox className="w-3.5 h-3.5 text-slate-500" />
            <span>Inbox</span>
            {unreadNotificationCount > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Share Button */}
          <button
            onClick={() => alert('Project share link copied to clipboard!')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Share</span>
          </button>

          {/* + New task Button */}
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            data-testid="trellis-new-task-btn"
            className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-xs border border-[#C59B27] transition active:scale-95 cursor-pointer min-h-[40px] sm:min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
            <span className="font-bold">New task</span>
          </button>
        </div>
      </div>

      {/* Project Title, Subtitle, Sprint chip, & Key Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[#D4AF37] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(212, 175, 55,0.25)] mt-0.5 sm:mt-0">
            <Smartphone className="w-5 h-5 text-slate-900" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
                {myTasksMode ? 'My Assigned Tasks' : 'Citadel People Hub'}
              </h1>
              <span className="text-[11px] font-bold text-[#D97706] bg-[#FAF5EB] border border-[#F2E4B8] px-2 py-0.5 rounded-full shrink-0">
                Sprint 14 • Ends Oct 30
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
              Workforce Management &amp; Self-Service • iOS &amp; Android • ships Oct 30
            </p>
          </div>
        </div>

        {/* Project Metrics */}
        <div className="flex items-center gap-6 text-center text-xs self-start md:self-center bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Open
            </span>
            <span className="text-base font-black text-slate-900 leading-none">{openCount}</span>
          </div>
          <div className="w-[1px] h-6 bg-slate-200" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Done
            </span>
            <span className="text-base font-black text-slate-900 leading-none">{doneCount}</span>
          </div>
          <div className="w-[1px] h-6 bg-slate-200" />
          <div>
            <span className="text-[10px] uppercase font-bold text-rose-500 block tracking-wider">
              Overdue
            </span>
            <span className="text-base font-black text-rose-600 leading-none">1</span>
          </div>
        </div>
      </div>

      {/* Navigation View Tabs & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
        {/* View Tabs & Scope Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Scope Toggle: All Tasks vs My Tasks */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold mr-2">
            <button
              onClick={() => setMyTasksMode(false)}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${!myTasksMode ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setMyTasksMode(true)}
              data-testid="trellis-nav-my-tasks"
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${myTasksMode ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <span>My Tasks</span>
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded-full font-bold">
                {myTasksCount}
              </span>
            </button>
          </div>

          {/* View Tabs */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  data-testid={`trellis-tab-${tab.key}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${isActive
                    ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Group & Filter Dropdowns */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs w-full md:w-auto">
          {/* Group Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value as any)}
              className="w-full sm:w-auto min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 pr-8 appearance-none cursor-pointer"
            >
              <option value="Status">Group: Status</option>
              <option value="Assignee">Group: Assignee</option>
              <option value="Priority">Group: Priority</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Assignee Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedAssigneeFilter}
              onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
              data-testid="trellis-filter-assignee"
              className="w-full sm:w-auto min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 pr-8 appearance-none cursor-pointer"
            >
              <option value="All">Assignee: All</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Label Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedLabelFilter}
              onChange={(e) => setSelectedLabelFilter(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 pr-8 appearance-none cursor-pointer"
            >
              <option value="All">Label: All</option>
              <option value="Feature">Feature</option>
              <option value="Bug">Bug</option>
              <option value="Design">Design</option>
              <option value="Tech">Tech</option>
              <option value="Onboarding">Onboarding</option>
              <option value="Marketing">Marketing</option>
              <option value="Design system">Design system</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
