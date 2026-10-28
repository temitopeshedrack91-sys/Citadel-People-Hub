import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  CheckCircle2,
  Circle,
  Clock,
  Laptop,
  Building2,
  Calendar,
  Sparkles,
  FileText,
  ShieldCheck,
  Users,
  Briefcase,
  ChevronRight,
  Download,
  Eye,
  X,
  Filter,
  Search,
  Check,
  AlertCircle,
  Gift,
  CreditCard,
  HeartHandshake,
  FileCheck2,
  HelpCircle,
  Send,
} from 'lucide-react';
import { OnboardingJourney, OnboardingDepartment, OnboardingTimeline } from '../../types';
import { talentRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const OnboardingView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [journeys, setJourneys] = useState<OnboardingJourney[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('onboard-1');
  const [activeTab, setActiveTab] = useState<'tasks' | 'documents' | 'orientation' | 'accountability' | 'welcome-email'>('tasks');
  const [departmentFilter, setDepartmentFilter] = useState<'All' | OnboardingDepartment>('All');
  const [timelineFilter, setTimelineFilter] = useState<'All' | OnboardingTimeline>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSopModalOpen, setIsSopModalOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const loadData = async () => {
    const list = await talentRepository.getOnboardingJourneys();
    setJourneys(list);
    if (list.length > 0 && !list.find((j) => j.id === selectedJourneyId)) {
      setSelectedJourneyId(list[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentJourney = journeys.find((j) => j.id === selectedJourneyId) || journeys[0];

  const handleToggleTask = async (journeyId: string, taskId: string, currentVal: boolean) => {
    const updated = await talentRepository.toggleTaskCompletion(journeyId, taskId, !currentVal);
    setJourneys(journeys.map((j) => (j.id === journeyId ? updated : j)));

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Talent & Onboarding',
      action: !currentVal ? 'Completed Onboarding Task' : 'Unchecked Onboarding Task',
      recordAffectedId: journeyId,
      recordAffectedTitle: `Journey for ${updated.employeeName}`,
      previousValue: currentVal ? 'Done' : 'Pending',
      newValue: !currentVal ? 'Done' : 'Pending',
      severity: 'Info',
    });
  };

  // Filter tasks based on Department, Timeline, and Search
  const filteredTasks = (currentJourney?.tasks || []).filter((task) => {
    if (departmentFilter !== 'All' && task.department !== departmentFilter) return false;
    if (timelineFilter !== 'All' && task.timeline !== timelineFilter) return false;
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !task.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Calculate task counts per department for current journey
  const getDeptStats = (dept: OnboardingDepartment) => {
    const deptTasks = (currentJourney?.tasks || []).filter((t) => t.department === dept);
    const completed = deptTasks.filter((t) => t.isCompleted).length;
    const total = deptTasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, pct };
  };

  const deptConfigs: { id: OnboardingDepartment; label: string; icon: any; color: string }[] = [
    { id: 'IT', label: 'IT Checklist', icon: Laptop, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { id: 'Manager', label: 'Unit Manager', icon: Briefcase, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { id: 'PCCM', label: 'People, Culture & Change', icon: ShieldCheck, color: 'text-[#083E34] bg-amber-50 border-amber-200' },
    { id: 'Finance', label: 'Finance & Accounts', icon: CreditCard, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { id: 'Mentor', label: 'Mentor / Buddy', icon: HeartHandshake, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  ];

  const welcomeEmailTemplate = currentJourney
    ? `Dear ${currentJourney.employeeName},\n\nCongratulations!\n\nWe are pleased to inform you that after successfully completing all phases of our recruitment and selection process, you have been selected for the role of the ${currentJourney.jobTitle} at Citadel Global Community Church.\n\nAttached to this email is a tentative letter of offer outlining the terms of employment. Kindly review it carefully and confirm your acceptance or rejection of the offer within 72 hours of receipt.\n\nShould you accept, also attached is a copy of the Job Description for your attention.\n\nAdditionally, as part of our onboarding process, we have attached a list of required documents. You are required to provide:\n\n● Two (2) financial guarantors\n● Three (3) references (two professional references and one character reference. The character reference should be a letter written and typed by the referee)\n● Copies of all relevant credentials, including:\n  ○ Academic certificates\n  ○ Professional certifications\n  ○ Training certificates\n  ○ Birth certificate\n  ○ NYSC certificate (where applicable)\n  ○ Etc\n\nPlease note that all submitted documents will undergo a verification process in line with our policy. Upon successful verification of documents and acceptance of tentative letter of offer, an official letter with the same provisions as the tentative will be issued.\n\nTo facilitate a smooth onboarding, we kindly request that you submit all required documents within two weeks of receipt of this email.\n\nWe look forward to your response and to welcoming you to our team. If you have any questions or require further clarification, please do not hesitate to reach out.\n\nOnce again, congratulations!\n\nBest regards,\nPeople, Culture & Change Management (PCCM)\nCitadel Global Community Church`
    : '';

  const handleCopyWelcomeEmail = async () => {
    if (!welcomeEmailTemplate) return;

    try {
      await navigator.clipboard.writeText(welcomeEmailTemplate);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      setCopiedEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Church SOP Reference Banner */}
      <div className="bg-[#083E34] text-white rounded-2xl p-4 sm:p-5 border border-[#06241E] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold bg-white/10 px-2 py-0.5 rounded border border-white/10">
                Staff Onboarding SOP
              </span>
              <span className="text-xs text-slate-300 hidden sm:inline">• 90-Day Induction</span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
              Citadel New Hire Onboarding &amp; Induction Guide
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Task checklists and milestone handovers across Unit Leads, PCCM, IT, and Finance.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSopModalOpen(true)}
          className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#083E34] font-bold text-xs transition flex items-center gap-2 shrink-0 shadow-xs cursor-pointer active:scale-95 min-h-[38px]"
        >
          <Eye className="w-4 h-4" />
          <span>View SOP guide</span>
        </button>
      </div>

      {/* New Hire Journey Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {journeys.map((j) => {
          const isSelected = j.id === currentJourney?.id;
          return (
            <div
              key={j.id}
              onClick={() => setSelectedJourneyId(j.id)}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition shadow-2xs ${
                isSelected
                  ? 'bg-white border-[#083E34] ring-2 ring-[#083E34]/15 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-black truncate">{j.employeeName}</h3>
                    <span className="text-[10px] font-mono text-slate-600 font-bold">{j.staffId}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">{j.jobTitle}</p>
                  <p className="text-[11px] text-slate-600 font-medium truncate">{j.entityName}</p>
                </div>
                <span className="text-xs font-black text-[#083E34] bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 shrink-0">
                  {j.overallProgressPercent}%
                </span>
              </div>

              {/* Mini Progress Bar */}
              <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                <div
                  className="bg-[#083E34] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${j.overallProgressPercent}%` }}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                <span>Started: {j.startDate}</span>
                <span className="text-slate-900 font-bold">Buddy: {j.mentorBuddyName || j.mentorName}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Employee Summary Bar */}
      {currentJourney && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-black text-black ">{currentJourney.employeeName}</h3>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                  {currentJourney.staffId}
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  {currentJourney.status}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 mt-1">
                {currentJourney.jobTitle} • {currentJourney.departmentName} ({currentJourney.entityName})
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 font-semibold mt-2">
                <span>Resumption Date: <strong className="text-black">{currentJourney.startDate}</strong></span>
                <span>•</span>
                <span>Mentor / Buddy: <strong className="text-black">{currentJourney.mentorBuddyName || currentJourney.mentorName}</strong></span>
                <span>•</span>
                <span>Probation Cycle: <strong className="text-black">3-Month (90 Days)</strong></span>
              </div>
            </div>

            {/* Total Completion Progress Gauge */}
            <div className="lg:text-right min-w-[200px] bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-baseline justify-between lg:justify-end gap-2">
                <span className="text-xs font-bold text-black">Onboarding Progress:</span>
                <span className="text-xl font-black text-[#083E34]">{currentJourney.overallProgressPercent}%</span>
              </div>
              <div className="mt-1.5 w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#083E34] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${currentJourney.overallProgressPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-600 font-bold mt-1 text-right">
                {currentJourney.tasks.filter((t) => t.isCompleted).length} of {currentJourney.tasks.length} tasks confirmed
              </div>
            </div>
          </div>

          {/* Departmental Progress Cards */}
          <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {deptConfigs.map((dept) => {
              const stats = getDeptStats(dept.id);
              const Icon = dept.icon;
              return (
                <div
                  key={dept.id}
                  onClick={() => {
                    setActiveTab('tasks');
                    setDepartmentFilter(departmentFilter === dept.id ? 'All' : dept.id);
                  }}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                    departmentFilter === dept.id
                      ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-black">
                    <span className="truncate">{dept.label}</span>
                    <Icon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between text-xs">
                    <span className="text-[11px] font-bold text-slate-700">
                      {stats.completed}/{stats.total} done
                    </span>
                    <span className="font-black text-black">{stats.pct}%</span>
                  </div>
                  <div className="mt-1 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-[#083E34] h-1 rounded-full transition-all duration-300"
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'tasks'
              ? 'bg-[#083E34] text-white shadow-xs'
              : 'text-black hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Onboarding Checklist ({currentJourney?.tasks?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('welcome-email')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'welcome-email'
              ? 'bg-[#083E34] text-white shadow-xs'
              : 'text-black hover:bg-slate-100'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Welcome Email Template</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'documents'
              ? 'bg-[#083E34] text-white shadow-xs'
              : 'text-black hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Required Compliance Documents ({currentJourney?.requiredDocuments?.length || 7})</span>
        </button>

        <button
          onClick={() => setActiveTab('orientation')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'orientation'
              ? 'bg-[#083E34] text-white shadow-xs'
              : 'text-black hover:bg-slate-100'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>On-Site Orientation & Facilities</span>
        </button>

        <button
          onClick={() => setActiveTab('accountability')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'accountability'
              ? 'bg-[#083E34] text-white shadow-xs'
              : 'text-black hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Onboarding Team Roster</span>
        </button>
      </div>

      {activeTab === 'welcome-email' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-black">Welcome Email Template</h3>
              <p className="text-xs text-slate-600 mt-1">Applied from the Citadel HR onboarding mail template for {currentJourney?.employeeName || 'new employee'}.</p>
            </div>
            <button
              type="button"
              onClick={handleCopyWelcomeEmail}
              className="px-3.5 py-2 rounded-xl bg-[#083E34] text-amber-300 hover:bg-[#062f28] text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{copiedEmail ? 'Copied' : 'Copy email'}</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between text-[11px] text-slate-600 border-b border-slate-200 pb-3">
              <span><span className="font-bold text-black">To:</span> {currentJourney?.employeeName || 'Employee Name'}</span>
              <span><span className="font-bold text-black">Subject:</span> Offer and Onboarding Next Steps</span>
            </div>

            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800 font-medium">
              {welcomeEmailTemplate || 'No template available.'}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: ONBOARDING CHECKLIST TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Filters Bar: Department, Timeline, Search */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Department Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-300">
                <Filter className="w-3.5 h-3.5 text-black" />
                <span className="font-black text-black">Team:</span>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value as any)}
                  className="bg-transparent font-bold text-black focus:outline-none cursor-pointer"
                >
                  <option value="All">All Teams (22)</option>
                  <option value="IT">IT Checklist (3)</option>
                  <option value="Manager">Unit Manager (6)</option>
                  <option value="PCCM">PCCM Division (7)</option>
                  <option value="Finance">Finance & Accounts (2)</option>
                  <option value="Mentor">Mentor / Buddy (4)</option>
                </select>
              </div>

              {/* Timeline Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-300">
                <Clock className="w-3.5 h-3.5 text-black" />
                <span className="font-black text-black">Timeline:</span>
                <select
                  value={timelineFilter}
                  onChange={(e) => setTimelineFilter(e.target.value as any)}
                  className="bg-transparent font-bold text-black focus:outline-none cursor-pointer"
                >
                  <option value="All">All Timelines</option>
                  <option value="Before Resumption">Before Resumption</option>
                  <option value="Day 1">Day 1</option>
                  <option value="Day 2">Day 2</option>
                  <option value="Week 1">Week 1</option>
                  <option value="1st Month">1st Month (30 Days)</option>
                  <option value="90 Days">90 Days (Probation End)</option>
                </select>
              </div>

              {(departmentFilter !== 'All' || timelineFilter !== 'All' || searchQuery) && (
                <button
                  onClick={() => {
                    setDepartmentFilter('All');
                    setTimelineFilter('All');
                    setSearchQuery('');
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-[#083E34] hover:bg-slate-100 rounded-lg transition"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-black" />
              <input
                type="text"
                placeholder="Search checklist tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs text-black font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#083E34] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Tasks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleToggleTask(currentJourney.id, task.id, task.isCompleted)}
                className={`p-4 rounded-xl border text-xs cursor-pointer transition flex items-start gap-3 shadow-2xs ${
                  task.isCompleted
                    ? 'bg-emerald-50/40 border-emerald-300 text-slate-800'
                    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  className="mt-0.5 shrink-0 text-emerald-700"
                  title={task.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {task.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 fill-emerald-100" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400 hover:text-slate-600 transition" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`font-black text-sm leading-snug ${
                        task.isCompleted ? 'line-through text-slate-500' : 'text-black'
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      {task.timeline}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-black">
                        {task.department}: <strong className="text-slate-700 font-semibold">{task.assignedToName || task.assignedRole}</strong>
                      </span>
                    </div>

                    {task.completedAt ? (
                      <span className="text-emerald-800 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-700" /> Verified {task.completedAt}
                      </span>
                    ) : (
                      <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Due: {task.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-bold text-black">No tasks match your selected filter.</p>
              <p className="text-xs text-slate-600 mt-1">Try resetting the department or timeline filters.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REQUIRED ONBOARDING DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#083E34]" />
              <span>Required Onboarding Documents for New Hires</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Statutory and institutional documentation mandated by The Citadel Global Community Church Onboarding SOP.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {(currentJourney.requiredDocuments || []).map((doc, idx) => (
              <div key={doc.id || idx} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-black font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-black">{doc.name}</h4>
                    <p className="text-[11px] text-slate-600 font-medium">
                      PCCM Mandatory Compliance Pack • Retained in Citadel Personnel Vault
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {doc.isSubmitted ? (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-700" /> Received ({doc.submittedAt || 'Active'})
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-700" /> Pending Submission
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ON-SITE ORIENTATION CHECKLIST */}
      {activeTab === 'orientation' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#083E34]" />
              <span>New Hire On-Site Orientation Checklist</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Physical workstation setup, facility tours, identity credentials, and welcome gift reception.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {(currentJourney.orientationItems || []).map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-black font-black text-xs shrink-0 shadow-2xs">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black text-black">{item.name}</h4>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 font-bold">Physical Facility Verification</span>
                    {item.isCompleted ? (
                      <span className="text-emerald-800 font-bold flex items-center gap-1 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3 text-emerald-700" /> Completed
                      </span>
                    ) : (
                      <span className="text-amber-800 font-bold bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TEAM ACCOUNTABILITY & ROSTER */}
      {activeTab === 'accountability' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#083E34]" />
              <span>Assigned Onboarding Team Roster & Assessment</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              "Every member of the onboarding team will also be assessed on their responsible task through the onboarding process and period." — Citadel SOP Closing Principle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Unit Manager */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black text-purple-900 bg-purple-50 p-2 rounded-lg border border-purple-200">
                <Briefcase className="w-4 h-4 text-purple-700" />
                <span>Unit Manager / Supervisor</span>
              </div>
              <h4 className="text-sm font-black text-black mt-3">
                {currentJourney.teamRoster?.managerName || 'Assigned Department Head'}
              </h4>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                Responsible for welcome meetings, mentor pairing, role alignment, and recurring 1-on-1s.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-slate-700">
                Status: {getDeptStats('Manager').completed} of {getDeptStats('Manager').total} tasks completed ({getDeptStats('Manager').pct}%)
              </div>
            </div>

            {/* 2. PCCM Division */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black text-[#083E34] bg-amber-50 p-2 rounded-lg border border-amber-300">
                <ShieldCheck className="w-4 h-4 text-[#C59B27]" />
                <span>People, Culture & Change (HR)</span>
              </div>
              <h4 className="text-sm font-black text-black mt-3">
                {currentJourney.teamRoster?.pccmOfficerName || 'Dr. Bukola Adeleke / Blessing Okafor'}
              </h4>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                Responsible for welcome packets, policy briefings, background checks, and 90-day confirmation.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-slate-700">
                Status: {getDeptStats('PCCM').completed} of {getDeptStats('PCCM').total} tasks completed ({getDeptStats('PCCM').pct}%)
              </div>
            </div>

            {/* 3. IT Team */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black text-blue-900 bg-blue-50 p-2 rounded-lg border border-blue-200">
                <Laptop className="w-4 h-4 text-blue-700" />
                <span>IT & Digital Infrastructure</span>
              </div>
              <h4 className="text-sm font-black text-black mt-3">
                {currentJourney.teamRoster?.itLeadName || 'Femi Olatunji / Taiwo Adeyemi'}
              </h4>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                Responsible for email provisioning, application permissions, and workstation hardware setup.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-slate-700">
                Status: {getDeptStats('IT').completed} of {getDeptStats('IT').total} tasks completed ({getDeptStats('IT').pct}%)
              </div>
            </div>

            {/* 4. Finance & Accounts */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-900 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span>Finance & Account Team</span>
              </div>
              <h4 className="text-sm font-black text-black mt-3">
                {currentJourney.teamRoster?.financeLeadName || 'Kemi Adebayo (Finance Lead)'}
              </h4>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                Responsible for adding to payroll ledger and verifying bank details, tax ID, and RSA PIN.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-slate-700">
                Status: {getDeptStats('Finance').completed} of {getDeptStats('Finance').total} tasks completed ({getDeptStats('Finance').pct}%)
              </div>
            </div>

            {/* 5. Mentor / Buddy */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black text-rose-900 bg-rose-50 p-2 rounded-lg border border-rose-200">
                <HeartHandshake className="w-4 h-4 text-rose-700" />
                <span>Mentor or Onboarding Buddy</span>
              </div>
              <h4 className="text-sm font-black text-black mt-3">
                {currentJourney.teamRoster?.mentorBuddyName || currentJourney.mentorBuddyName || 'Assigned Buddy'}
              </h4>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                Responsible for facility tours, regular check-ins, shadowing opportunities, and daily questions.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-slate-700">
                Status: {getDeptStats('Mentor').completed} of {getDeptStats('Mentor').total} tasks completed ({getDeptStats('Mentor').pct}%)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL CITADEL SOP VIEWER */}
      {isSopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-emerald-900/20 bg-[#083E34] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-[#083E34] flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white ">
                    The Citadel Global Community Church
                  </h3>
                  <p className="text-xs text-amber-300 font-mono font-bold">
                    ONBOARDING CHECKLIST AND SCHEDULE (SOP)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSopModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Document Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800 custom-scrollbar">
              {/* Introduction Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black text-black text-sm uppercase tracking-wider">Introduction</h4>
                <p className="text-slate-700 leading-relaxed font-medium">
                  The onboarding checklist and schedule is designed to serve as a guide on the induction and on-boarding process for new employees with the aim to help them settle properly into the ministry. This is a breakdown of activities and task that is coordinated by the onboarding team to help the new joiner learn about the ministry, organization structure, her policies and culture, values and people as well as to understand their job expectations and KPI's.
                </p>
                <div className="pt-2">
                  <strong className="text-black">The Onboarding Team:</strong>
                  <ul className="list-disc list-inside mt-1 text-slate-700 space-y-0.5">
                    <li>Department or Unit Manager/Supervisor</li>
                    <li>People, Culture & Change (Human Resources)</li>
                    <li>IT</li>
                    <li>Finance & Account</li>
                    <li>Mentor or Onboarding Buddy</li>
                  </ul>
                </div>
              </div>

              {/* Task Allocation Breakdown */}
              <div className="space-y-3">
                <h4 className="font-black text-black text-sm uppercase tracking-wider border-b border-slate-200 pb-1">
                  New Hire Onboarding Task Allocation
                </h4>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse border border-slate-200 rounded-lg">
                    <thead>
                      <tr className="bg-amber-100 text-black font-black">
                        <th className="p-2.5 border border-slate-200">Role & Responsibility</th>
                        <th className="p-2.5 border border-slate-200">Action Items</th>
                        <th className="p-2.5 border border-slate-200 w-36">Timeline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                      <tr>
                        <td className="p-2.5 border border-slate-200 font-bold bg-slate-50">Unit Manager</td>
                        <td className="p-2.5 border border-slate-200">Send welcome email; welcome meeting; assign mentor/buddy; schedule 1st day intro calls.</td>
                        <td className="p-2.5 border border-slate-200 font-bold">Day 1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border border-slate-200 font-bold bg-slate-50">Unit Manager</td>
                        <td className="p-2.5 border border-slate-200">Introduction to the ministry, role alignment & performance expectations.</td>
                        <td className="p-2.5 border border-slate-200 font-bold">Day 2</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border border-slate-200 font-bold bg-slate-50">Unit Manager</td>
                        <td className="p-2.5 border border-slate-200">Recurring 1-on-1 meetings to provide regular check-ins.</td>
                        <td className="p-2.5 border border-slate-200 font-bold">1st Three Months</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border border-slate-200 font-bold bg-slate-50">People, Culture & Change</td>
                        <td className="p-2.5 border border-slate-200">Send welcome packet with mandatory forms; share essential ministry policies (hours, dress code, handbook, SOPs).</td>
                        <td className="p-2.5 border border-slate-200 font-bold">Day 1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border border-slate-200 font-bold bg-slate-50">People, Culture & Change</td>
                        <td className="p-2.5 border border-slate-200">Document role and compensation in HRIS system; verify staff data.</td>
                        <td className="p-2.5 border border-slate-200 font-bold">Week 1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border border-slate-200 font-bold bg-slate-50">People, Culture & Change</td>
                        <td className="p-2.5 border border-slate-200">Background check (Employee verification, Guarantors verification, Reference checks).</td>
                        <td className="p-2.5 border border-slate-200 font-bold">Within 1st Month</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border border-slate-200 font-bold bg-slate-50">People, Culture & Change</td>
                        <td className="p-2.5 border border-slate-200">Periodic milestone reviews during 90-day probation; new hire evaluation & confirmation.</td>
                        <td className="p-2.5 border border-slate-200 font-bold">End of Probation</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border border-slate-200 font-bold bg-slate-50">Finance & Accounts</td>
                        <td className="p-2.5 border border-slate-200">Add new employee to payroll ledger; confirm employee financial details.</td>
                        <td className="p-2.5 border border-slate-200 font-bold">Week 1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border border-slate-200 font-bold bg-slate-50">IT Team</td>
                        <td className="p-2.5 border border-slate-200">Create official email; set up platform permissions; prepare computer, phone, tech accessories.</td>
                        <td className="p-2.5 border border-slate-200 font-bold">Before Resumption</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 border border-slate-200 font-bold bg-slate-50">Mentor / Buddy</td>
                        <td className="p-2.5 border border-slate-200">Facility tour (parking, break room); 2-week check-ins; shadow meetings/projects; ad-hoc Q&A.</td>
                        <td className="p-2.5 border border-slate-200 font-bold">Day 1 & Throughout</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Document Sign-off Footer */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-black">Prepared By: </span>
                  <strong className="text-black">Sussan Afuwape</strong>
                  <span className="mx-2">•</span>
                  <span className="font-bold text-black">Organization: </span>
                  <strong className="text-black">The Citadel Global Community Church</strong>
                </div>
                <span className="font-mono font-bold text-slate-700">Date: 30th March, 2024</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setIsSopModalOpen(false)}
                className="px-4 py-2 bg-[#083E34] text-white rounded-xl text-xs font-bold hover:bg-[#062f28] transition cursor-pointer"
              >
                Close Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
