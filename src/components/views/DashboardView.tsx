import React, { useState, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Users,
  UserCheck,
  CalendarDays,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Plus,
  Building2,
  Calendar,
  Download,
  Zap,
  MoreHorizontal,
  Paperclip,
  MessageSquare,
  StickyNote,
  X,
  Briefcase,
  FileSpreadsheet,
  Cake,
  ShieldCheck,
  Activity,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavModule } from '../layout/Sidebar';
import {
  employeeRepository,
  leaveRepository,
  talentRepository,
  attendanceRepository,
} from '../../services';
import { Employee, LeaveRequest, OnboardingJourney, AttendanceRecord } from '../../types';
import { StatCard } from '../common/StatCard';
import { StatusPill } from '../common/StatusPill';
import { ProgressRing } from '../common/ProgressRing';
import { ScheduleCalendar } from '../common/ScheduleCalendar';
import { Card } from '../common/Card';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface DashboardViewProps {
  onNavigate: (module: NavModule) => void;
  onOpenLeaveModal: () => void;
  onOpenAddEmployee: () => void;
}

interface TeamNote {
  id: string;
  title: string;
  category: 'Incoming' | 'Ongoing' | 'In Progress';
  description: string;
  collaborators: string;
  avatars: { initials: string; bg: string; name: string }[];
}

// User Initials Avatar
const InitialsAvatar: React.FC<{
  initials: string;
  name: string;
  bgClass?: string;
  sizeClass?: string;
}> = ({ initials, name, bgClass = 'bg-[#083E34]', sizeClass = 'w-6 h-6 text-[10px]' }) => (
  <div
    title={name}
    className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white ring-2 ring-white select-none ${bgClass} shrink-0`}
  >
    {initials}
  </div>
);

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenLeaveModal,
  onOpenAddEmployee,
}) => {
  const { currentUser, currentRole, selectedEntityFilter } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Repository live data
  const [liveEmployees, setLiveEmployees] = useState<Employee[]>([]);
  const [liveLeaves, setLiveLeaves] = useState<LeaveRequest[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);

  // Interactive UI states
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Resolved actions & birthdays
  const [resolvedActions, setResolvedActions] = useState<Record<string, boolean>>({});
  const [wishedBirthday, setWishedBirthday] = useState<Record<string, boolean>>({});
  const [activeAttendanceDay, setActiveAttendanceDay] = useState<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'>('Wed');

  // New Note Form State
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<'Incoming' | 'Ongoing' | 'In Progress'>('Incoming');
  const [newNoteDesc, setNewNoteDesc] = useState('');
  const [newNoteCollab, setNewNoteCollab] = useState('Mia, Harper');

  // Team notes matching reference design
  const [teamNotes, setTeamNotes] = useState<TeamNote[]>([
    {
      id: 'note-1',
      title: 'Employee Onboarding',
      category: 'Incoming',
      description: 'Prepare onboarding access and HR documents for new employees.',
      collaborators: 'Collaborate with Mia, Harper',
      avatars: [
        { initials: 'MA', bg: 'bg-emerald-600', name: 'Mia Anderson' },
        { initials: 'HL', bg: 'bg-indigo-600', name: 'Harper Lee' },
      ],
    },
    {
      id: 'note-2',
      title: 'Performance Review',
      category: 'Ongoing',
      description: 'Review employee progress and attendance performance.',
      collaborators: 'Collaborate with Chloe, Ethan',
      avatars: [
        { initials: 'CM', bg: 'bg-rose-600', name: 'Chloe Martin' },
        { initials: 'EB', bg: 'bg-amber-600', name: 'Ethan Brooks' },
      ],
    },
    {
      id: 'note-3',
      title: 'Design system V2',
      category: 'In Progress',
      description: 'Standardize brand components and responsive tokens across all modules.',
      collaborators: 'Collaborate with Femi, Blessing',
      avatars: [
        { initials: 'FO', bg: 'bg-[#083E34]', name: 'Engr. Femi Olatunji' },
        { initials: 'BO', bg: 'bg-teal-600', name: 'Blessing Okafor' },
      ],
    },
  ]);

  // Load repositories
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [emp, lvs, att] = await Promise.all([
          employeeRepository.getAll({
            entityId: selectedEntityFilter === 'all' ? undefined : selectedEntityFilter,
          }),
          leaveRepository.getAll(),
          attendanceRepository.getRecentLogs(),
        ]);
        if (isMounted) {
          setLiveEmployees(emp);
          setLiveLeaves(lvs);
          setAttendanceLogs(att);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedEntityFilter]);

  // Dynamic Greeting matching reference ("Good Morning John")
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const greetingName = useMemo(() => {
    if (!currentUser?.name) return 'Team';
    const parts = currentUser.name.trim().split(/\s+/);
    const titles = ['Dr.', 'Dr', 'Prof.', 'Prof', 'Pastor', 'Rev.', 'Rev', 'Mr.', 'Mr', 'Mrs.', 'Mrs', 'Ms.', 'Ms', 'Engr.', 'Engr'];
    if (titles.includes(parts[0]) && parts.length > 1) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0] || 'Team';
  }, [currentUser?.name]);

  // Summary Metrics calculations
  const totalEmployeesDisplay = liveEmployees.length > 0 ? liveEmployees.length : 482;
  const activeStaffDisplay = liveEmployees.length > 0 ? liveEmployees.filter((e) => e.status === 'Active').length : 142;
  const onlineStaffCount = 8;
  const newHiresCount = 2;

  // Active Projects matching reference design
  const activeProjects = [
    {
      id: 'proj-1',
      title: 'Rest API Endpoint',
      subtitle: 'Define and manage secure API connections for payroll and biometrics...',
      dueDate: 'Mon, Feb 4',
      priority: 'High' as const,
      commentsCount: 4,
      attachmentsCount: 2,
      assignees: [
        { initials: 'FO', bg: 'bg-[#083E34]', name: 'Engr. Femi Olatunji' },
        { initials: 'MA', bg: 'bg-emerald-600', name: 'Mia Anderson' },
        { initials: 'CM', bg: 'bg-rose-600', name: 'Chloe Martin' },
      ],
    },
    {
      id: 'proj-2',
      title: 'UI System Planning',
      subtitle: 'Create structured UI patterns for consistent enterprise accessibility...',
      dueDate: 'Tue, Feb 6',
      priority: 'Medium' as const,
      commentsCount: 6,
      attachmentsCount: 3,
      assignees: [
        { initials: 'NB', bg: 'bg-amber-600', name: 'Noah Bennett' },
        { initials: 'BA', bg: 'bg-indigo-600', name: 'Dr. Bukola Adeleke' },
      ],
    },
    {
      id: 'proj-3',
      title: 'Visual Style Guide',
      subtitle: 'Define visual standards for a unified design and brand language...',
      dueDate: 'Sat, Feb 9',
      priority: 'High' as const,
      commentsCount: 5,
      attachmentsCount: 4,
      assignees: [
        { initials: 'MA', bg: 'bg-emerald-600', name: 'Mia Anderson' },
        { initials: 'HL', bg: 'bg-indigo-600', name: 'Harper Lee' },
        { initials: 'EB', bg: 'bg-teal-600', name: 'Ethan Brooks' },
      ],
    },
  ];

  // Presence Members matching reference design
  const presenceMembers = [
    {
      name: 'Daniel Carter',
      role: 'Coverage assigned to Olivia M.',
      status: 'On Leave',
      initials: 'DC',
      bg: 'bg-slate-700',
    },
    {
      name: 'Mia Anderson',
      role: 'Design Team',
      status: '22 min',
      initials: 'MA',
      bg: 'bg-emerald-600',
    },
    {
      name: 'Noah Bennett',
      role: 'Marketing Lead',
      status: '15 min',
      initials: 'NB',
      bg: 'bg-amber-600',
    },
    {
      name: 'Chloe Martin',
      role: 'Product Strategy',
      status: '9 min',
      initials: 'CM',
      bg: 'bg-rose-600',
    },
    {
      name: 'Mila Jackson',
      role: 'Product Strategy',
      status: '1 min',
      initials: 'MJ',
      bg: 'bg-indigo-600',
    },
  ];

  // Pending Governance Actions
  const pendingActions = [
    {
      id: 'act-1',
      title: 'Blessing Okafor - Casual Leave (2 Days)',
      subtitle: 'CGCC • People, Culture & Change Department',
      priority: 'High',
      module: 'leave' as NavModule,
    },
    {
      id: 'act-2',
      title: 'Review Staff Dossier: Michael Babatunde',
      subtitle: 'Citadel Holdings • Retail Store Assistant',
      priority: 'High',
      module: 'employees' as NavModule,
    },
    {
      id: 'act-3',
      title: 'Verify NYSC Discharge Certificate: Kelechi Eze',
      subtitle: 'CGCC • Media & Protocol Wing',
      priority: 'Medium',
      module: 'documents' as NavModule,
    },
  ];

  // Upcoming Birthdays
  const upcomingBirthdays = [
    {
      id: 'b-1',
      name: 'Blessing Okafor',
      dept: 'People, Culture & Change',
      date: 'Sep 28',
      milestone: '31st Birthday',
      initials: 'BO',
    },
    {
      id: 'b-2',
      name: 'Chef Kolawole Briggs',
      dept: 'Cafe & Culinary Services',
      date: 'Oct 04',
      milestone: '36th Birthday',
      initials: 'KB',
    },
    {
      id: 'b-3',
      name: 'Engr. Femi Olatunji',
      dept: 'ICT & Infrastructure',
      date: 'Nov 20',
      milestone: '39th Birthday',
      initials: 'FO',
    },
  ];

  const weeklyAttendanceData = [
    { day: 'Mon', rate: 92, isToday: false },
    { day: 'Tue', rate: 96, isToday: false },
    { day: 'Wed', rate: 94, isToday: true },
    { day: 'Thu', rate: 91, isToday: false },
    { day: 'Fri', rate: 89, isToday: false },
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResolveAction = (id: string, title: string) => {
    setResolvedActions((prev) => ({ ...prev, [id]: true }));
    showToast(`Action "${title}" marked as resolved.`);
  };

  const handleSendWish = (id: string, name: string) => {
    setWishedBirthday((prev) => ({ ...prev, [id]: true }));
    showToast(`Birthday greeting sent to ${name}!`);
  };

  const handleExportReport = () => {
    showToast('Workforce Executive Summary Report exported successfully (PDF/CSV).');
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    const newNote: TeamNote = {
      id: `note-${Date.now()}`,
      title: newNoteTitle,
      category: newNoteCategory,
      description: newNoteDesc || 'Operational task update.',
      collaborators: `Collaborate with ${newNoteCollab}`,
      avatars: [
        { initials: 'BA', bg: 'bg-[#083E34]', name: 'Dr. Bukola Adeleke' },
        { initials: 'PC', bg: 'bg-emerald-600', name: 'PCCM Team' },
      ],
    };

    setTeamNotes([newNote, ...teamNotes]);
    setIsAddNoteModalOpen(false);
    setNewNoteTitle('');
    setNewNoteDesc('');
    showToast('Team note successfully published.');
  };

  return (
    <ErrorBoundary fallbackTitle="Dashboard Unavailable">
      <div className="space-y-6 pb-12 font-sans antialiased text-slate-900" data-testid="dashboard-view">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#083E34] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-slide-up">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2-COLUMN ENTERPRISE DASHBOARD MATCHING HRIVIO REFERENCE   */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ======================================================== */}
          {/* LEFT MAJOR COLUMN (8 OF 12 COLS - ~67% WIDTH)            */}
          {/* ======================================================== */}
          <div className="lg:col-span-8 space-y-5">
            {/* Greeting Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {greeting}, {greetingName}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                People, Culture & Performance • Workforce Overview.
              </p>
            </div>

            {/* 3 Summary Stat Cards in a row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Total Employees */}
              <StatCard
                title="Total employees"
                value={totalEmployeesDisplay}
                icon={Users}
                trend={{ value: '+20%', isPositive: true, label: 'This Month' }}
                onClick={() => onNavigate('employees')}
                dataTestId="stat-total-employees"
              />

              {/* Card 2: Attendance */}
              <StatCard
                title="Attendance"
                value="94.2%"
                icon={Clock}
                trend={{ value: '-2%', isPositive: false, label: 'from yesterday' }}
                onClick={() => onNavigate('attendance')}
                dataTestId="stat-attendance"
              />

              {/* Card 3: Active Staff */}
              <StatCard
                title="Active Staff"
                value={activeStaffDisplay}
                icon={UserCheck}
                supportingText={
                  <>
                    <span className="font-black text-emerald-600 whitespace-nowrap">
                      {onlineStaffCount} Online
                    </span>
                    <span className="text-slate-400 font-medium">•</span>
                    <span className="text-slate-500 font-medium whitespace-nowrap">
                      {newHiresCount} New Hires
                    </span>
                  </>
                }
                onClick={() => onNavigate('directory')}
                dataTestId="stat-active-staff"
              />
            </div>

            {/* Active Projects Section matching reference cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Active Projects</h2>
                <button
                  onClick={() => onNavigate('performance')}
                  data-testid="projects-view-all"
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
                >
                  View All
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {activeProjects.map((proj) => (
                  <div
                    key={proj.id}
                    data-testid={`project-card-${proj.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigate('projects')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onNavigate('projects');
                      }
                    }}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)] hover:border-slate-300 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083E34] focus-visible:ring-offset-2 select-none"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#083E34] transition">
                          {proj.title}
                        </h3>
                        <button className="text-slate-400 hover:text-slate-700 p-0.5">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed line-clamp-2">
                        {proj.subtitle}
                      </p>

                      <div className="mt-3.5 flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{proj.dueDate}</span>
                        </div>
                        <StatusPill
                          status={proj.priority === 'High' ? 'high' : 'medium'}
                          label={proj.priority}
                          showDot
                          size="sm"
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {proj.assignees.map((asgn, idx) => (
                          <InitialsAvatar
                            key={idx}
                            initials={asgn.initials}
                            name={asgn.name}
                            bgClass={asgn.bg}
                            sizeClass="w-6 h-6 text-[10px]"
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2.5 text-xs text-slate-500 font-semibold">
                        <span className="flex items-center gap-1">
                          <span>{proj.commentsCount}</span>
                          <MessageSquare className="w-3 h-3 text-slate-400" />
                        </span>
                        <span className="flex items-center gap-1">
                          <span>{proj.attachmentsCount}</span>
                          <Paperclip className="w-3 h-3 text-slate-400" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Presence Tracker (Left) & Team Notes (Right) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Team Presence Tracker */}
              <div
                data-testid="team-presence-card"
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Team Presence Tracker</h2>
                  <button
                    onClick={() => onNavigate('attendance')}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      On Leave
                    </span>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <InitialsAvatar
                          initials="DC"
                          name="Daniel Carter"
                          bgClass="bg-slate-700"
                          sizeClass="w-8 h-8 text-xs"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Daniel Carter</h4>
                          <p className="text-[11px] text-slate-500 font-medium">Coverage assigned to Olivia M.</p>
                        </div>
                      </div>
                      <StatusPill status="on-leave" label="On Leave" showDot size="sm" />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      Away
                    </span>
                    <div className="space-y-1 divide-y divide-slate-100">
                      {presenceMembers.slice(1).map((mem, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 px-1 hover:bg-slate-50 rounded-lg transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <InitialsAvatar
                              initials={mem.initials}
                              name={mem.name}
                              bgClass={mem.bg}
                              sizeClass="w-7 h-7 text-[10px]"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 leading-none">{mem.name}</h4>
                              <p className="text-[11px] text-slate-500 font-medium mt-1">{mem.role}</p>
                            </div>
                          </div>
                          <StatusPill status="away" label={mem.status} showDot size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Notes */}
              <div
                data-testid="team-notes-card"
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-1">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">Team Notes</h2>
                    <button
                      onClick={() => setIsAddNoteModalOpen(true)}
                      data-testid="add-note-btn"
                      className="text-xs font-bold text-[#083E34] hover:underline flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Note</span>
                    </button>
                  </div>

                  <div className="space-y-3 mt-3">
                    {teamNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-white transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900">{note.title}</h4>
                          <StatusPill
                            status={
                              note.category === 'Incoming'
                                ? 'incoming'
                                : note.category === 'Ongoing'
                                ? 'ongoing'
                                : 'in-progress'
                            }
                            label={note.category}
                            size="sm"
                          />
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {note.description}
                        </p>
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {note.avatars.map((av, i) => (
                                <InitialsAvatar
                                  key={i}
                                  initials={av.initials}
                                  name={av.name}
                                  bgClass={av.bg}
                                  sizeClass="w-5 h-5 text-[9px]"
                                />
                              ))}
                            </div>
                            <span className="font-semibold text-slate-600 text-[11px]">
                              {note.collaborators}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Biometric Attendance Weekly Trends Bar Chart */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#083E34]" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Biometric Attendance Weekly Trends
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Gatehouse terminal check-in telemetry across Citadel units.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ZKTeco Gate 01 Online</span>
                  </span>
                  <button
                    onClick={() => onNavigate('attendance')}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-0.5"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 5-Day Columns */}
              <div className="grid grid-cols-5 gap-3 pt-3 pb-1">
                {weeklyAttendanceData.map((d) => {
                  const isActive = activeAttendanceDay === d.day;
                  return (
                    <button
                      key={d.day}
                      onClick={() => setActiveAttendanceDay(d.day as any)}
                      className={`flex flex-col items-center group cursor-pointer transition p-2 rounded-xl ${
                        isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-black text-slate-900 mb-1.5">
                        {d.rate}%
                      </span>

                      <div className="w-10 sm:w-12 h-24 bg-slate-100 rounded-xl overflow-hidden flex flex-col justify-end p-1 border border-slate-200/70">
                        <div
                          style={{ height: `${d.rate}%` }}
                          className={`w-full rounded-lg transition-all duration-500 ${
                            d.isToday ? 'bg-[#083E34]' : 'bg-emerald-600'
                          }`}
                        />
                      </div>

                      <div className="mt-2 text-center">
                        <span className="text-xs font-bold text-slate-700 block">{d.day}</span>
                        {d.isToday && (
                          <span className="text-[9px] font-black uppercase text-[#D97706] bg-[#FFF8F0] border border-[#FFE0B2] px-1 py-0.2 rounded">
                            Today
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workforce Distribution by Entity */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#083E34]" />
                    <span>Citadel Workforce Distribution</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Personnel distribution across Church, School of Government, and Commercial Holdings.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  Total: {totalEmployeesDisplay} Staff
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-700">Citadel Global Community Church (CGCC)</span>
                    <span className="font-mono font-bold text-slate-900">82 Staff (57.0%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#083E34] rounded-full" style={{ width: '57%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-700">Citadel School of Government (CSOG)</span>
                    <span className="font-mono font-bold text-slate-900">28 Staff (19.4%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#D97706] rounded-full" style={{ width: '19.4%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-700">Citadel Holdings (Commercial Units)</span>
                    <span className="font-mono font-bold text-slate-900">34 Staff (23.6%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: '23.6%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT MINOR COLUMN (4 OF 12 COLS - ~33% WIDTH)           */}
          {/* ======================================================== */}
          <div className="lg:col-span-4 space-y-5">
            {/* Top Action Buttons matching reference positioning */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={handleExportReport}
                data-testid="export-report-btn"
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export Report</span>
              </button>

              <button
                onClick={() => setIsQuickActionsOpen(true)}
                data-testid="quick-actions-btn"
                className="px-4 py-2 rounded-xl bg-[#FF9900] hover:bg-[#E68A00] text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-xs border border-[#E68A00] transition active:scale-[0.98]"
              >
                <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                <span className="font-bold">Quick Actions</span>
              </button>
            </div>

            {/* Leave Balance Card matching Hrivio reference design */}
            <div
              data-testid="leave-balance-card"
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] space-y-4"
            >
              <div className="flex items-center gap-2 pb-1">
                <FileText className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Leave Balance</h3>
              </div>

              {/* Semicircular Gauge Chart via ProgressRing component */}
              <div className="my-2 flex flex-col items-center justify-center">
                <ProgressRing
                  value={65}
                  max={100}
                  label="65%"
                  subtext="13 out of 20"
                  type="semicircle"
                  strokeColor="#083E34"
                />
              </div>

              {/* Recent Leave Requests List matching reference design */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
                {liveLeaves.length > 0 ? (
                  liveLeaves.slice(0, 3).map((lv) => {
                    const statusType = lv.status === 'Approved' ? 'confirmed' : lv.status === 'Rejected' ? 'rejected' : 'pending';
                    return (
                      <div
                        key={lv.id}
                        onClick={() => onNavigate('leave')}
                        className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition"
                      >
                        <span className="text-xs font-semibold text-slate-700">
                          {lv.startDate ? new Date(lv.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Oct 28'}, ({lv.leaveType})
                        </span>
                        <StatusPill status={statusType} label={lv.status} size="sm" />
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div
                      onClick={() => onNavigate('leave')}
                      className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition"
                    >
                      <span className="text-xs font-semibold text-slate-700">Oct 28, (Annual)</span>
                      <StatusPill status="pending" label="Pending" size="sm" />
                    </div>
                    <div
                      onClick={() => onNavigate('leave')}
                      className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition"
                    >
                      <span className="text-xs font-semibold text-slate-700">Oct 25, (Casual)</span>
                      <StatusPill status="confirmed" label="Confirmed" size="sm" />
                    </div>
                    <div
                      onClick={() => onNavigate('leave')}
                      className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition"
                    >
                      <span className="text-xs font-semibold text-slate-700">Oct 18, (Study)</span>
                      <StatusPill status="rejected" label="Rejected" size="sm" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Schedule Card via ScheduleCalendar component */}
            <ScheduleCalendar
              onViewAll={() => onNavigate('calendar')}
              onSelectEvent={(evt) => showToast(`Selected: ${evt.title} (${evt.time})`)}
            />

            {/* Upcoming Birthdays Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Cake className="w-4 h-4 text-[#FF9900]" />
                  <h3 className="text-sm font-bold text-slate-900">Upcoming Birthdays</h3>
                </div>
                <span className="text-[10px] font-bold text-[#D97706] bg-[#FFF8F0] px-2 py-0.5 rounded-full border border-[#FFE0B2]">
                  Citadel
                </span>
              </div>

              <div className="space-y-2 mt-2">
                {upcomingBirthdays.map((b) => {
                  const isWished = wishedBirthday[b.id];
                  return (
                    <div
                      key={b.id}
                      className="p-2.5 rounded-xl border border-[#FFE0B2]/60 bg-[#FFF8F0]/40 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#FFF3E0] text-[#D97706] font-bold flex items-center justify-center text-[10px] shrink-0 border border-[#FFE0B2]">
                          {b.initials}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{b.name}</p>
                          <span className="text-[10px] text-[#D97706] block">
                            {b.date} • {b.milestone}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSendWish(b.id, b.name)}
                        disabled={isWished}
                        className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition shrink-0 ${
                          isWished
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-white hover:bg-[#FFF3E0] text-[#D97706] border border-[#FFE0B2] shadow-2xs'
                        }`}
                      >
                        {isWished ? 'Wished' : 'Send Wish'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pending Approvals Queue */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#083E34]" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Pending Approvals Queue
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-[#D97706] bg-[#FFF8F0] border border-[#FFE0B2] px-2 py-0.5 rounded-full">
                  {pendingActions.filter((a) => !resolvedActions[a.id]).length} Actions
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {pendingActions.map((act) => {
                  const isResolved = resolvedActions[act.id];
                  return (
                    <div
                      key={act.id}
                      className={`py-3 flex items-center justify-between gap-3 text-xs ${
                        isResolved ? 'opacity-40 line-through' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{act.title}</span>
                          <StatusPill status="high" label={act.priority} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{act.subtitle}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleResolveAction(act.id, act.title)}
                          disabled={isResolved}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                            isResolved
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-[#083E34] text-white hover:bg-[#052C25]'
                          }`}
                        >
                          {isResolved ? 'Resolved' : 'Approve'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Drawer / Modal */}
        {isQuickActionsOpen && (
          <div
            data-testid="quick-actions-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in"
          >
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
              <div className="bg-[#083E34] text-white p-5 relative border-b border-emerald-800 shrink-0">
                <button
                  onClick={() => setIsQuickActionsOpen(false)}
                  className="absolute top-4 right-4 text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Citadel People Hub — Quick Actions</span>
                </h3>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  Frequently executed People, Culture & Operations administrative workflows.
                </p>
              </div>

              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs overflow-y-auto flex-1">
                <button
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    onOpenLeaveModal();
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34] hover:bg-slate-50 transition text-left space-y-1 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200 group-hover:bg-[#083E34] group-hover:text-white transition">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900">Apply for Leave</h4>
                  <p className="text-xs text-slate-500 font-medium">Casual, Annual or Sick leave application</p>
                </button>

                <button
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    onOpenAddEmployee();
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34] hover:bg-slate-50 transition text-left space-y-1 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200 group-hover:bg-[#083E34] group-hover:text-white transition">
                    <Users className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900">Add New Employee</h4>
                  <p className="text-xs text-slate-500 font-medium">PCCM 5-step personnel enrollment</p>
                </button>

                <button
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    onNavigate('attendance');
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34] hover:bg-slate-50 transition text-left space-y-1 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-800 flex items-center justify-center border border-sky-200 group-hover:bg-[#083E34] group-hover:text-white transition">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900">Attendance Telemetry</h4>
                  <p className="text-xs text-slate-500 font-medium">Biometric Gatehouse reader logs</p>
                </button>

                <button
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    onNavigate('documents');
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34] hover:bg-slate-50 transition text-left space-y-1 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200 group-hover:bg-[#083E34] group-hover:text-white transition">
                    <Download className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900">Upload Policy</h4>
                  <p className="text-xs text-slate-500 font-medium">Publish handbook or code of conduct</p>
                </button>

                <button
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    setIsAddNoteModalOpen(true);
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34] hover:bg-slate-50 transition text-left space-y-1 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-800 flex items-center justify-center border border-purple-200 group-hover:bg-[#083E34] group-hover:text-white transition">
                    <StickyNote className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900">Add Team Note</h4>
                  <p className="text-xs text-slate-500 font-medium">Share operational handover note</p>
                </button>

                <button
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    onNavigate('reports');
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34] hover:bg-slate-50 transition text-left space-y-1 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200 group-hover:bg-[#083E34] group-hover:text-white transition">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900">Workforce Census</h4>
                  <p className="text-xs text-slate-500 font-medium">Export census report in CSV/PDF</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Team Note Modal */}
        {isAddNoteModalOpen && (
          <div
            data-testid="add-note-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in"
          >
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
              <div className="bg-[#083E34] text-white p-5 relative border-b border-emerald-800 shrink-0">
                <button
                  onClick={() => setIsAddNoteModalOpen(false)}
                  className="absolute top-4 right-4 text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-amber-300" />
                  <span>Add Team Note</span>
                </h3>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  Share an operational update or handover task with the team.
                </p>
              </div>

              <form onSubmit={handleAddNoteSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Note Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Employee Onboarding"
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#083E34]"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">Status Category</label>
                  <select
                    value={newNoteCategory}
                    onChange={(e) => setNewNoteCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-[#083E34] bg-white"
                  >
                    <option value="Incoming">Incoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">Description</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe the operational action item..."
                    value={newNoteDesc}
                    onChange={(e) => setNewNoteDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#083E34]"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">Collaborators (Names)</label>
                  <input
                    type="text"
                    placeholder="e.g. Mia, Harper"
                    value={newNoteCollab}
                    onChange={(e) => setNewNoteCollab(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#083E34]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddNoteModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#FF9900] hover:bg-[#E68A00] text-slate-950 font-bold rounded-xl transition shadow-xs"
                  >
                    Save Note
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default DashboardView;
