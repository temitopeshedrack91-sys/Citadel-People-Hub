import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  CheckCircle2,
  Circle,
  Clock,
  Laptop,
  Building2,
  Calendar,
  FileText,
  ShieldCheck,
  Users,
  Briefcase,
  ChevronRight,
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
  Send,
  Plus,
  Bell,
  Table as TableIcon,
  LayoutGrid,
  AlertTriangle,
  Printer,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  OnboardingJourney,
  OnboardingDepartment,
  OnboardingTimeline,
  OnboardingTask,
} from '../../types';
import { talentRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';

export const OnboardingView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [journeys, setJourneys] = useState<OnboardingJourney[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('onboard-1');
  const [activeTab, setActiveTab] = useState<
    'schedule' | 'milestones' | 'documents' | 'orientation' | 'accountability' | 'welcome-email'
  >('schedule');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [departmentFilter, setDepartmentFilter] = useState<'All' | OnboardingDepartment>('All');
  const [timelineFilter, setTimelineFilter] = useState<'All' | string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed' | 'Flagged'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSopModalOpen, setIsSopModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDept, setNewTaskDept] = useState<OnboardingDepartment>('PCCM');
  const [newTaskTimeline, setNewTaskTimeline] = useState<OnboardingTimeline>('Week 1');
  const [newTaskRole, setNewTaskRole] = useState<'PCCM' | 'Department Head' | 'Employee' | 'ICT' | 'Finance' | 'Mentor'>('PCCM');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskIsConditional, setNewTaskIsConditional] = useState(false);
  const [newTaskConditionNote, setNewTaskConditionNote] = useState('');
  const [newTaskRequiresHr, setNewTaskRequiresHr] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

    showToast(!currentVal ? 'Task confirmed as completed.' : 'Task reverted to pending.');
  };

  const handleToggleDocument = async (docId: string, currentVal: boolean) => {
    if (!currentJourney) return;
    if (talentRepository.toggleDocumentSubmission) {
      const updated = await talentRepository.toggleDocumentSubmission(currentJourney.id, docId, !currentVal);
      setJourneys(journeys.map((j) => (j.id === currentJourney.id ? updated : j)));
    } else {
      const updatedDocs = (currentJourney.requiredDocuments || []).map((d) =>
        d.id === docId ? { ...d, isSubmitted: !currentVal, submittedAt: !currentVal ? new Date().toISOString().split('T')[0] : undefined } : d
      );
      const updated = { ...currentJourney, requiredDocuments: updatedDocs };
      setJourneys(journeys.map((j) => (j.id === currentJourney.id ? updated : j)));
    }
    showToast(!currentVal ? 'Document marked as received.' : 'Document marked as pending.');
  };

  const handleToggleOrientation = async (itemId: string, currentVal: boolean) => {
    if (!currentJourney) return;
    if (talentRepository.toggleOrientationItem) {
      const updated = await talentRepository.toggleOrientationItem(currentJourney.id, itemId, !currentVal);
      setJourneys(journeys.map((j) => (j.id === currentJourney.id ? updated : j)));
    } else {
      const updatedItems = (currentJourney.orientationItems || []).map((i) =>
        i.id === itemId ? { ...i, isCompleted: !currentVal } : i
      );
      const updated = { ...currentJourney, orientationItems: updatedItems };
      setJourneys(journeys.map((j) => (j.id === currentJourney.id ? updated : j)));
    }
    showToast(!currentVal ? 'Orientation step verified.' : 'Orientation step reverted.');
  };

  const handleSendReminder = async (task: OnboardingTask) => {
    if (!currentJourney) return;
    if (talentRepository.sendTaskReminder) {
      await talentRepository.sendTaskReminder(currentJourney.id, task.id);
    }
    const updatedTasks = currentJourney.tasks.map((t) =>
      t.id === task.id ? { ...t, reminderSentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } : t
    );
    setJourneys(journeys.map((j) => (j.id === currentJourney.id ? { ...j, tasks: updatedTasks } : j)));
    showToast(`Reminder sent to ${task.assignedToName || task.assignedRole} for "${task.title}".`);
  };

  const handleSendBulkReminders = () => {
    if (!currentJourney) return;
    const pendingTasks = currentJourney.tasks.filter((t) => !t.isCompleted);
    showToast(`Sent reminders for ${pendingTasks.length} pending onboarding items.`);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !currentJourney) return;

    const taskPayload: Omit<OnboardingTask, 'id' | 'isCompleted'> = {
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || 'Onboarding obligation per Citadel induction procedure.',
      department: newTaskDept,
      timeline: newTaskTimeline,
      assignedRole: newTaskRole,
      assignedToName: newTaskAssignee.trim() || undefined,
      dueDate: newTaskDueDate.trim() || newTaskTimeline,
      isConditional: newTaskIsConditional,
      conditionNote: newTaskConditionNote.trim() || undefined,
      requiresHrConfirmation: newTaskRequiresHr,
    };

    if (talentRepository.createOnboardingTask) {
      const updated = await talentRepository.createOnboardingTask(currentJourney.id, taskPayload);
      setJourneys(journeys.map((j) => (j.id === currentJourney.id ? updated : j)));
    } else {
      const newTask: OnboardingTask = {
        ...taskPayload,
        id: `task-custom-${Date.now()}`,
        isCompleted: false,
      };
      const updated = { ...currentJourney, tasks: [...currentJourney.tasks, newTask] };
      setJourneys(journeys.map((j) => (j.id === currentJourney.id ? updated : j)));
    }

    // Reset form
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskAssignee('');
    setNewTaskDueDate('');
    setNewTaskIsConditional(false);
    setNewTaskConditionNote('');
    setNewTaskRequiresHr(false);
    setIsNewTaskModalOpen(false);
    showToast('New onboarding task created successfully.');
  };

  // Filter tasks based on Department, Timeline, Status, and Search
  const filteredTasks = (currentJourney?.tasks || []).filter((task) => {
    if (departmentFilter !== 'All' && task.department !== departmentFilter) return false;
    if (timelineFilter !== 'All' && task.timeline !== timelineFilter) return false;
    if (statusFilter === 'Pending' && task.isCompleted) return false;
    if (statusFilter === 'Completed' && !task.isCompleted) return false;
    if (statusFilter === 'Flagged' && !task.requiresHrConfirmation && !task.isConditional) return false;
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

  const deptConfigs: { id: OnboardingDepartment; label: string; icon: any }[] = [
    { id: 'IT', label: 'IT Checklist', icon: Laptop },
    { id: 'Manager', label: 'Unit Manager', icon: Briefcase },
    { id: 'PCCM', label: 'People, Culture & Change', icon: ShieldCheck },
    { id: 'Finance', label: 'Finance & Account', icon: CreditCard },
    { id: 'Mentor', label: 'Mentor / Buddy', icon: HeartHandshake },
  ];

  const welcomeEmailTemplate = currentJourney
    ? `Dear ${currentJourney.employeeName},\n\nCongratulations!\n\nWe are pleased to inform you that after successfully completing all phases of our recruitment and selection process, you have been selected for the role of ${currentJourney.jobTitle} at The Citadel Global Community Church.\n\nAttached to this email is a tentative letter of offer outlining the terms of employment. Kindly review it carefully and confirm your acceptance or rejection of the offer within 72 hours of receipt.\n\nShould you accept, also attached is a copy of the Job Description for your attention.\n\nAdditionally, as part of our onboarding process, we have attached a list of required documents. You are required to provide:\n\n● Two (2) financial guarantors\n● Three (3) references (two professional references and one character reference. The character reference should be a letter written and typed by the referee)\n● Copies of all relevant credentials, including:\n  ○ Academic certificates\n  ○ Professional certifications\n  ○ Training certificates\n  ○ Birth certificate\n  ○ NYSC certificate (where applicable)\n  ○ Etc\n\nPlease note that all submitted documents will undergo a verification process in line with our policy. Upon successful verification of documents and acceptance of tentative letter of offer, an official letter with the same provisions as the tentative will be issued.\n\nTo facilitate a smooth onboarding, we kindly request that you submit all required documents within two weeks of receipt of this email.\n\nWe look forward to your response and to welcoming you to our team. If you have any questions or require further clarification, please do not hesitate to reach out.\n\nOnce again, congratulations!\n\nBest regards,\nPeople, Culture & Change Management (PCCM)\nThe Citadel Global Community Church\n30 March 2024 Onboarding SOP Framework`
    : '';

  const handleCopyWelcomeEmail = async () => {
    if (!welcomeEmailTemplate) return;
    try {
      await navigator.clipboard.writeText(welcomeEmailTemplate);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
      showToast('Welcome email template copied to clipboard.');
    } catch {
      setCopiedEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#1E1E1E] text-white px-4 py-2.5 rounded-xl shadow-lg border border-[#D4AF37]/40 flex items-center gap-2 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Official CGCC Brand Banner: Pure Black & Citadel Classic Gold (#D4AF37) */}
      <div className="bg-[#111111] text-white rounded-2xl p-5 border-2 border-black shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        {/* Subtle Gold Glow Accent */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#D4AF37]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37] text-white flex items-center justify-center font-black shrink-0 shadow-md">
            <FileCheck2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-black font-black bg-[#D4AF37] px-2.5 py-0.5 rounded shadow-xs">
                CGCC Standard Operating Procedure
              </span>
              <span className="text-xs text-slate-300 font-semibold">• Dated 30 March 2024</span>
              <span className="text-xs text-[#D4AF37] font-bold">• 3-Month Probation Cycle</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1">
              The Citadel Global Community Church — Onboarding Checklist &amp; Schedule
            </h1>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl font-medium">
              Three-month structured induction across Unit Managers, People, Culture &amp; Change (HR), IT, Finance &amp; Accounts, and Onboarding Buddies. Prepared by Sussan Afuwape.
            </p>
          </div>
        </div>

        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center gap-2 relative z-10">
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#DFC15D] text-black font-black text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 min-h-[38px]"
            title="Create an onboarding task from the checklist"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Task</span>
          </button>

          <button
            onClick={handleSendBulkReminders}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95 min-h-[38px]"
            title="Send reminders for pending onboarding obligations"
          >
            <Bell className="w-4 h-4 text-[#D4AF37]" />
            <span>Send Reminders</span>
          </button>

          <button
            onClick={() => setIsSopModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#D4AF37] font-bold text-xs border border-[#D4AF37]/40 transition flex items-center gap-1.5 cursor-pointer active:scale-95 min-h-[38px]"
            title="View original 30 March 2024 SOP document"
          >
            <Eye className="w-4 h-4" />
            <span>View SOP Guide</span>
          </button>
        </div>
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
                  ? 'bg-white border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300 opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-black truncate">{j.employeeName}</h3>
                    <span className="text-[10px] font-mono text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {j.staffId}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">{j.jobTitle}</p>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{j.entityName}</p>
                </div>
                <span className="text-xs font-black text-black bg-[#D4AF37]/20 px-2 py-0.5 rounded-full border border-[#D4AF37]/40 shrink-0">
                  {j.overallProgressPercent}%
                </span>
              </div>

              {/* Progress Bar with Brand Colors */}
              <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-[#D4AF37] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${j.overallProgressPercent}%` }}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                <span>Start: <strong>{j.startDate}</strong></span>
                <span className="text-slate-900 font-bold truncate max-w-[150px]">
                  Buddy: {j.mentorBuddyName || j.mentorName}
                </span>
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
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-black text-black">{currentJourney.employeeName}</h2>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                  {currentJourney.staffId}
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  {currentJourney.status}
                </span>
                <span className="text-[11px] font-bold text-black bg-[#D4AF37]/20 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40">
                  3-Month Induction (90 Days)
                </span>
              </div>

              <p className="text-xs font-bold text-slate-800 mt-1">
                {currentJourney.jobTitle} • {currentJourney.departmentName} ({currentJourney.entityName})
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 font-semibold mt-2">
                <span>Resumption Date: <strong className="text-black">{currentJourney.startDate}</strong></span>
                <span>•</span>
                <span>Unit Manager: <strong className="text-black">{currentJourney.teamRoster?.managerName || 'Assigned Lead'}</strong></span>
                <span>•</span>
                <span>Assigned Buddy: <strong className="text-black">{currentJourney.mentorBuddyName || currentJourney.mentorName}</strong></span>
              </div>
            </div>

            {/* Total Completion Progress Gauge */}
            <div className="lg:text-right min-w-[220px] bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-baseline justify-between lg:justify-end gap-2">
                <span className="text-xs font-bold text-black">Overall Induction Progress:</span>
                <span className="text-xl font-black text-black">{currentJourney.overallProgressPercent}%</span>
              </div>
              <div className="mt-1.5 w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#D4AF37] h-2.5 rounded-full transition-all duration-300"
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
                    setActiveTab('schedule');
                    setDepartmentFilter(departmentFilter === dept.id ? 'All' : dept.id);
                  }}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                    departmentFilter === dept.id
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37] ring-1 ring-[#D4AF37]'
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
                  <div className="mt-1 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#D4AF37] h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs matching CGCC brand hierarchy */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-black text-[#D4AF37] shadow-xs'
              : 'text-black hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Checklist &amp; Schedule ({currentJourney?.tasks?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('milestones')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'milestones'
              ? 'bg-black text-[#D4AF37] shadow-xs'
              : 'text-black hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>90-Day Probation &amp; Milestones</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'documents'
              ? 'bg-black text-[#D4AF37] shadow-xs'
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
              ? 'bg-black text-[#D4AF37] shadow-xs'
              : 'text-black hover:bg-slate-100'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>On-Site Orientation &amp; Facilities</span>
        </button>

        <button
          onClick={() => setActiveTab('accountability')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'accountability'
              ? 'bg-black text-[#D4AF37] shadow-xs'
              : 'text-black hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Accountability &amp; Assessment</span>
        </button>

        <button
          onClick={() => setActiveTab('welcome-email')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'welcome-email'
              ? 'bg-black text-[#D4AF37] shadow-xs'
              : 'text-black hover:bg-slate-100'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Welcome Email Template</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: ONBOARDING CHECKLIST & MASTER SCHEDULE (TABLE / CARDS)
         ========================================================================= */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Filters Bar: Team, Timeline, Status, View Mode, Search */}
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
                  <option value="All">All Roles ({currentJourney?.tasks?.length || 0})</option>
                  <option value="IT">IT Checklist (3)</option>
                  <option value="Manager">Unit Manager (7)</option>
                  <option value="PCCM">People, Culture &amp; Change (8)</option>
                  <option value="Finance">Finance &amp; Account (2)</option>
                  <option value="Mentor">Mentor / Buddy (4)</option>
                </select>
              </div>

              {/* Timeline Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-300">
                <Clock className="w-3.5 h-3.5 text-black" />
                <span className="font-black text-black">Timeline:</span>
                <select
                  value={timelineFilter}
                  onChange={(e) => setTimelineFilter(e.target.value)}
                  className="bg-transparent font-bold text-black focus:outline-none cursor-pointer"
                >
                  <option value="All">All Timelines</option>
                  <option value="Before Resumption">Before Resumption</option>
                  <option value="Day 1">Day 1</option>
                  <option value="Day 2">Day 2</option>
                  <option value="Week 1">Week 1</option>
                  <option value="1st Two Weeks">1st Two Weeks</option>
                  <option value="1st Three Weeks">1st Three Weeks</option>
                  <option value="1st Month">1st Month (30 Days)</option>
                  <option value="90 Days">90 Days (Probation End)</option>
                  <option value="Post-3-Months">Post-3-Months Continuous</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-300">
                <span className="font-black text-black">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-transparent font-bold text-black focus:outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending Only</option>
                  <option value="Completed">Completed Only</option>
                  <option value="Flagged">Conditional / Flagged</option>
                </select>
              </div>

              {(departmentFilter !== 'All' || timelineFilter !== 'All' || statusFilter !== 'All' || searchQuery) && (
                <button
                  onClick={() => {
                    setDepartmentFilter('All');
                    setTimelineFilter('All');
                    setStatusFilter('All');
                    setSearchQuery('');
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-black hover:bg-slate-100 rounded-lg transition"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* View Mode Toggle & Search */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
                    viewMode === 'table' ? 'bg-black text-[#D4AF37] shadow-xs' : 'text-slate-600 hover:text-black'
                  }`}
                  title="Official SOP Table View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
                    viewMode === 'cards' ? 'bg-black text-[#D4AF37] shadow-xs' : 'text-slate-600 hover:text-black'
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>

              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-black" />
                <input
                  type="text"
                  placeholder="Search checklist tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs text-black font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#D4AF37] focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* TABLE VIEW (Matches official PDF layout with Gold Headers & Black Accents) */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#D4AF37] text-black">
                      <th className="py-3 px-4 font-black text-xs uppercase tracking-wider w-12 text-center">Status</th>
                      <th className="py-3 px-4 font-black text-xs uppercase tracking-wider w-40">Role &amp; Team</th>
                      <th className="py-3 px-4 font-black text-xs uppercase tracking-wider">Onboarding Action Item &amp; Details</th>
                      <th className="py-3 px-4 font-black text-xs uppercase tracking-wider w-36">Timeline</th>
                      <th className="py-3 px-4 font-black text-xs uppercase tracking-wider w-40">Owner / Assignee</th>
                      <th className="py-3 px-4 font-black text-xs uppercase tracking-wider w-24 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                    {filteredTasks.map((task) => (
                      <tr
                        key={task.id}
                        className={`hover:bg-amber-50/40 transition ${
                          task.isCompleted ? 'bg-slate-50/50' : 'bg-white'
                        }`}
                      >
                        {/* Status Checkbox */}
                        <td className="py-3.5 px-4 text-center align-top">
                          <button
                            type="button"
                            onClick={() => handleToggleTask(currentJourney.id, task.id, task.isCompleted)}
                            className="cursor-pointer text-slate-400 hover:text-black transition"
                            title={task.isCompleted ? 'Mark as pending' : 'Mark as completed'}
                          >
                            {task.isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-400 hover:text-[#D4AF37]" />
                            )}
                          </button>
                        </td>

                        {/* Team / Role */}
                        <td className="py-3.5 px-4 font-bold align-top">
                          <span className="text-black block">{task.department}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{task.assignedRole}</span>
                        </td>

                        {/* Task Title & Details */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-black text-sm leading-snug ${
                                task.isCompleted ? 'line-through text-slate-500' : 'text-black'
                              }`}
                            >
                              {task.title}
                            </span>

                            {/* Conditional Role-Dependent Badge */}
                            {task.isConditional && (
                              <span
                                className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1"
                                title={task.conditionNote || 'Role dependent requirement'}
                              >
                                <Info className="w-3 h-3 text-amber-700" /> Role Dependent
                              </span>
                            )}

                            {/* HR Confirmation Flag */}
                            {task.requiresHrConfirmation && (
                              <span
                                className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1"
                                title={task.conditionNote || 'Flagged for HR confirmation'}
                              >
                                <AlertTriangle className="w-3 h-3 text-[#B8860B]" /> HR Confirmation Required
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                            {task.description}
                          </p>

                          {task.conditionNote && (
                            <div className="mt-1.5 text-[11px] text-amber-800 bg-amber-50/80 p-1.5 rounded border border-amber-200 font-semibold">
                              <strong>Note:</strong> {task.conditionNote}
                            </div>
                          )}
                        </td>

                        {/* Timeline */}
                        <td className="py-3.5 px-4 align-top">
                          <span className="text-[11px] font-bold text-black bg-[#D4AF37]/15 px-2 py-1 rounded border border-[#D4AF37]/30 whitespace-nowrap block text-center">
                            {task.timeline}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold block text-center mt-1">
                            Due: {task.dueDate}
                          </span>
                        </td>

                        {/* Owner / Assignee */}
                        <td className="py-3.5 px-4 align-top">
                          <span className="font-bold text-black block truncate max-w-[150px]">
                            {task.assignedToName || task.assignedRole}
                          </span>
                          {task.completedAt ? (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                              <Check className="w-3 h-3" /> Done {task.completedAt}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                              Pending action
                            </span>
                          )}
                        </td>

                        {/* Reminder Action */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <button
                            type="button"
                            onClick={() => handleSendReminder(task)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-black hover:bg-slate-100 transition cursor-pointer border border-slate-200"
                            title={task.reminderSentAt ? `Reminder sent at ${task.reminderSentAt}` : 'Send reminder notification'}
                          >
                            <Bell className={`w-4 h-4 ${task.reminderSentAt ? 'text-[#D4AF37] fill-[#D4AF37]/20' : ''}`} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CARDS VIEW */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border text-xs transition flex items-start gap-3 shadow-2xs ${
                    task.isCompleted
                      ? 'bg-slate-50/70 border-emerald-300 text-slate-800'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTask(currentJourney.id, task.id, task.isCompleted)}
                    className="mt-0.5 shrink-0 text-slate-400 hover:text-black transition cursor-pointer"
                    title={task.isCompleted ? 'Mark as pending' : 'Mark as completed'}
                  >
                    {task.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 hover:text-[#D4AF37]" />
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
                      <span className="text-[10px] font-bold text-black bg-[#D4AF37]/20 px-2 py-0.5 rounded border border-[#D4AF37]/40 shrink-0">
                        {task.timeline}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                      {task.description}
                    </p>

                    {/* Conditional & Flag Badges */}
                    {(task.isConditional || task.requiresHrConfirmation) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {task.isConditional && (
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Info className="w-3 h-3 text-amber-700" /> Role Dependent
                          </span>
                        )}
                        {task.requiresHrConfirmation && (
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#B8860B]" /> HR Confirmation Flag
                          </span>
                        )}
                      </div>
                    )}

                    {task.conditionNote && (
                      <p className="mt-1.5 text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200 font-semibold">
                        {task.conditionNote}
                      </p>
                    )}

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-black text-black">{task.department}: </span>
                        <span className="text-slate-700 font-bold">{task.assignedToName || task.assignedRole}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {task.completedAt ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Done {task.completedAt}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendReminder(task)}
                            className="text-xs font-bold text-black hover:text-[#D4AF37] flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition"
                          >
                            <Bell className="w-3 h-3" />
                            <span>Remind</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredTasks.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-bold text-black">No onboarding tasks match your filter.</p>
              <p className="text-xs text-slate-600 mt-1">Try resetting the team, timeline, or status filters.</p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: 90-DAY PROBATION & MILESTONES TIMELINE
         ========================================================================= */}
      {activeTab === 'milestones' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D4AF37]" />
              <span>90-Day Probation &amp; Milestone Roadmap</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Scheduled milestone reviews during the three-month probationary period per Citadel Church SOP.
            </p>
          </div>

          <div className="space-y-4">
            {/* Phase 0: Before Resumption */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-black text-[#D4AF37] text-xs font-black flex items-center justify-center">
                    0
                  </span>
                  <h3 className="text-sm font-black text-black">Pre-Boarding: Before Resumption</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  IT &amp; Systems Setup
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Create official @citadel.ng email address for new hire
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Set up account permissions for all required platforms and software
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Prepare computer, phone equipment, and necessary tech accessories
                </li>
              </ul>
            </div>

            {/* Phase 1: Day 1 & Day 2 */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black text-xs font-black flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-black text-black">Day 1 &amp; Day 2: Welcome, Orientation &amp; Role Alignment</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Manager &amp; HR &amp; Buddy
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Manager sends departmental welcome email introducing new hire
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Host welcome meeting to kick off first day and introduce team
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Formally assign and introduce mentor/onboarding buddy
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Prioritize intro calls with close collaborating colleagues
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Day 2: Ministry introduction, role fit, and performance expectations walk-through
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> PCCM transmits new hire welcome packet and essential policies (handbook, hours, SOPs)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Buddy gives comprehensive tour of office, parking spots, break room, and chapel
                </li>
              </ul>
            </div>

            {/* Phase 2: Week 1 & Week 2 */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-black flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-black text-black">Week 1 &amp; Week 2: HRIS Records, Payroll &amp; Regular Check-ins</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Finance &amp; PCCM &amp; Buddy
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Document role and compensation details in Citadel HRIS system
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Finance adds new employee to payroll ledger and confirms bank/tax/RSA info
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Buddy conducts regular daily/weekly check-ins across the first two weeks
                </li>
              </ul>
            </div>

            {/* Phase 3: First Three Weeks */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black text-xs font-black flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-black text-black">1st Three Weeks: Policy &amp; KPI Understanding Review</h3>
                </div>
                <span className="text-[10px] font-bold text-black bg-[#D4AF37]/20 px-2 py-0.5 rounded border border-[#D4AF37]/40">
                  Mandatory Review
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-700 font-medium">
                Formal review meeting scheduled by PCCM to evaluate new hire's clear comprehension of ministry policies, detailed Job Description, and departmental Key Performance Indicators (KPIs).
              </p>
            </div>

            {/* Phase 4: Month 1 (30 Days) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-black flex items-center justify-center">
                    4
                  </span>
                  <h3 className="text-sm font-black text-black">1st Month (30 Days): Background Checks &amp; 30-Day Milestone Review</h3>
                </div>
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  Role-Dependent Items
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-700" /> Complete employee background verification (Guarantors, Reference checks, Certificates)
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span>30-Day Milestone Check: Ascertain progress and identify early difficulties before first performance review</span>
                </li>
              </ul>
            </div>

            {/* Phase 5: Month 2 (60 Days) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black text-xs font-black flex items-center justify-center">
                    5
                  </span>
                  <h3 className="text-sm font-black text-black">2nd Month (60 Days): Mid-Probation Tools &amp; Difficulties Review</h3>
                </div>
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  ⚠️ Flagged for HR
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-700 font-medium">
                "All resource or tool required for success in the role should be provided to the new hire." — Intermediate review with Manager and HR to verify tools readiness and address operational roadblocks.
              </p>
            </div>

            {/* Phase 6: Month 3 / 90 Days */}
            <div className="border-2 border-black rounded-xl p-4 bg-amber-50/40">
              <div className="flex items-center justify-between gap-2 border-b border-slate-300 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-black text-[#D4AF37] text-xs font-black flex items-center justify-center">
                    6
                  </span>
                  <h3 className="text-sm font-black text-black">End of Probation (90 Days): Joint Evaluation &amp; Confirmation</h3>
                </div>
                <span className="text-[10px] font-black text-black bg-[#D4AF37] px-2.5 py-0.5 rounded">
                  Probation Confirmation
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-800 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Formal evaluation with Unit Manager and PCCM for permanent appointment
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Issuance of official confirmation letter of employment
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" /> Onboarding team members assessment on execution of induction duties
                </li>
              </ul>
            </div>

            {/* Phase 7: Post-Three-Month Continuous Assimilation */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-300 text-black text-xs font-black flex items-center justify-center">
                    7
                  </span>
                  <h3 className="text-sm font-black text-black">Post-Three-Month: Continuous Assimilation</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Continuous Review
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-700 font-medium leading-relaxed">
                "While this is a three months onboarding schedule, the onboarding and assimilation process of new employees is continuous and should be reviewed periodically to ascertain the progress of the new employee and areas of difficulty before the employee's first performance review." — Closing Clause.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: REQUIRED COMPLIANCE DOCUMENTS VAULT
         ========================================================================= */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#D4AF37]" />
                <span>Required Onboarding Documents for New Hires</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Mandated compliance and statutory documents per CGCC 30 March 2024 Onboarding SOP.
              </p>
            </div>
            <span className="text-xs font-bold text-black bg-slate-100 px-3 py-1 rounded-full border border-slate-300 self-start sm:self-auto">
              {(currentJourney.requiredDocuments || []).filter((d) => d.isSubmitted).length} of{' '}
              {(currentJourney.requiredDocuments || []).length} Received
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {(currentJourney.requiredDocuments || []).map((doc, idx) => (
              <div key={doc.id || idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-black text-[#D4AF37] font-black text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs font-black text-black">{doc.name}</h3>
                      {doc.isConditional && (
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                          Conditional (Where Relevant)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                      {doc.conditionNote || 'Mandatory compliance pack for personnel vault.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleToggleDocument(doc.id, doc.isSubmitted)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer transition ${
                      doc.isSubmitted
                        ? 'text-emerald-800 bg-emerald-100 border border-emerald-300'
                        : 'text-rose-800 bg-rose-100 border border-rose-300 hover:bg-rose-200'
                    }`}
                  >
                    {doc.isSubmitted ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Received ({doc.submittedAt || 'Active'})</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-rose-700" />
                        <span>Pending Submission</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: ON-SITE ORIENTATION & FACILITIES
         ========================================================================= */}
      {activeTab === 'orientation' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#D4AF37]" />
                <span>New Hire On-Site Orientation Checklist</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Physical workstation staging, facility tours, identity credentials, and welcome gift reception.
              </p>
            </div>
            <span className="text-xs font-bold text-black bg-slate-100 px-3 py-1 rounded-full border border-slate-300 self-start sm:self-auto">
              {(currentJourney.orientationItems || []).filter((i) => i.isCompleted).length} of{' '}
              {(currentJourney.orientationItems || []).length} Verified
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {(currentJourney.orientationItems || []).map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => handleToggleOrientation(item.id, item.isCompleted)}
                className={`p-4 rounded-xl border text-xs cursor-pointer transition flex items-start gap-3 shadow-2xs ${
                  item.isCompleted
                    ? 'bg-emerald-50/30 border-emerald-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-black text-[#D4AF37] flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-black text-black">{item.name}</h3>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 font-bold">Facility Induction Step</span>
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

      {/* =========================================================================
          TAB 5: ONBOARDING TEAM ACCOUNTABILITY & ROSTER
         ========================================================================= */}
      {activeTab === 'accountability' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#D4AF37]" />
              <span>Assigned Onboarding Team Roster &amp; Responsibility Assessment</span>
            </h2>
            <p className="text-xs text-slate-700 mt-1 font-semibold bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              "Every member of the onboarding team will also be assessed on their responsible task through the onboarding process and period." — The Citadel Global Community Church Onboarding SOP (30 March 2024).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Unit Manager */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black text-black bg-[#D4AF37]/20 p-2 rounded-lg border border-[#D4AF37]/40">
                <Briefcase className="w-4 h-4 text-black" />
                <span>Department / Unit Manager</span>
              </div>
              <h3 className="text-sm font-black text-black mt-3">
                {currentJourney.teamRoster?.managerName || 'Assigned Department Head'}
              </h3>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                Responsible for welcome email, kick-off meeting, mentor pairing, role alignment, and recurring 1-on-1s.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-slate-800">
                Performance: {getDeptStats('Manager').completed} of {getDeptStats('Manager').total} tasks done ({getDeptStats('Manager').pct}%)
              </div>
            </div>

            {/* 2. PCCM Division */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black text-white bg-black p-2 rounded-lg border border-black">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                <span>People, Culture &amp; Change (HR)</span>
              </div>
              <h3 className="text-sm font-black text-black mt-3">
                {currentJourney.teamRoster?.pccmOfficerName || 'Dr. Bukola Adeleke / Sussan Afuwape'}
              </h3>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                Responsible for welcome packets, policy briefings, background checks, milestone tracking, and 90-day confirmation.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-slate-800">
                Performance: {getDeptStats('PCCM').completed} of {getDeptStats('PCCM').total} tasks done ({getDeptStats('PCCM').pct}%)
              </div>
            </div>

            {/* 3. IT Team */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black text-blue-900 bg-blue-50 p-2 rounded-lg border border-blue-200">
                <Laptop className="w-4 h-4 text-blue-700" />
                <span>IT &amp; Digital Infrastructure</span>
              </div>
              <h3 className="text-sm font-black text-black mt-3">
                {currentJourney.teamRoster?.itLeadName || 'Femi Olatunji'}
              </h3>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                Responsible for @citadel.ng email provisioning, application permissions, and workstation hardware staging.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-slate-800">
                Performance: {getDeptStats('IT').completed} of {getDeptStats('IT').total} tasks done ({getDeptStats('IT').pct}%)
              </div>
            </div>

            {/* 4. Finance & Accounts */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-900 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span>Finance &amp; Account Team</span>
              </div>
              <h3 className="text-sm font-black text-black mt-3">
                {currentJourney.teamRoster?.financeLeadName || 'Kemi Adebayo (Finance Lead)'}
              </h3>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                Responsible for enrollment in monthly payroll ledger and verification of bank details, tax ID, and RSA PIN.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-slate-800">
                Performance: {getDeptStats('Finance').completed} of {getDeptStats('Finance').total} tasks done ({getDeptStats('Finance').pct}%)
              </div>
            </div>

            {/* 5. Mentor / Buddy */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black text-rose-900 bg-rose-50 p-2 rounded-lg border border-rose-200">
                <HeartHandshake className="w-4 h-4 text-rose-700" />
                <span>Mentor or Onboarding Buddy</span>
              </div>
              <h3 className="text-sm font-black text-black mt-3">
                {currentJourney.teamRoster?.mentorBuddyName || currentJourney.mentorBuddyName || 'Assigned Buddy'}
              </h3>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                Responsible for facility tours, 2-week check-ins, meeting shadowing opportunities, and daily ad-hoc Q&amp;A.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-slate-800">
                Performance: {getDeptStats('Mentor').completed} of {getDeptStats('Mentor').total} tasks done ({getDeptStats('Mentor').pct}%)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: WELCOME EMAIL TEMPLATE
         ========================================================================= */}
      {activeTab === 'welcome-email' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-black">
                Citadel New Hire Offer &amp; Welcome Email Template
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Outlines 72-hour offer acceptance, Job Description, 2 financial guarantors, 3 references, and 2-week credential deadline.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyWelcomeEmail}
              className="px-3.5 py-2 rounded-xl bg-black text-[#D4AF37] hover:bg-slate-900 text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-600 border-b border-slate-200 pb-3 gap-2">
              <span><span className="font-bold text-black">To:</span> {currentJourney?.employeeName || 'New Employee'}</span>
              <span><span className="font-bold text-black">Subject:</span> Offer of Employment &amp; Onboarding Requirements — The Citadel Global Community Church</span>
            </div>

            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800 font-medium">
              {welcomeEmailTemplate || 'No template available.'}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE ONBOARDING TASK
         ========================================================================= */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-black text-white flex items-center justify-between border-b border-[#D4AF37]/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37] text-black flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Create Onboarding Task</h3>
                  <p className="text-[11px] text-slate-300">Add an induction task to {currentJourney?.employeeName}'s journey</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTask} className="p-6 overflow-y-auto space-y-4 text-xs text-slate-800 custom-scrollbar">
              <div>
                <label className="block text-xs font-black text-black mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule 30-day progress and difficulty review"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-black border border-slate-300 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide guidance on obligations, meeting participants, or documentation requirements..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-black border border-slate-300 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-black mb-1">Responsible Team *</label>
                  <select
                    value={newTaskDept}
                    onChange={(e) => setNewTaskDept(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs text-black border border-slate-300 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Manager">Unit Manager</option>
                    <option value="PCCM">People, Culture &amp; Change</option>
                    <option value="IT">IT &amp; Systems</option>
                    <option value="Finance">Finance &amp; Account</option>
                    <option value="Mentor">Mentor / Buddy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-black mb-1">Due Timeline *</label>
                  <select
                    value={newTaskTimeline}
                    onChange={(e) => setNewTaskTimeline(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs text-black border border-slate-300 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Before Resumption">Before Resumption</option>
                    <option value="Day 1">Day 1</option>
                    <option value="Day 2">Day 2</option>
                    <option value="Week 1">Week 1</option>
                    <option value="1st Two Weeks">1st Two Weeks</option>
                    <option value="1st Three Weeks">1st Three Weeks</option>
                    <option value="1st Month">1st Month (30 Days)</option>
                    <option value="60 Days">60 Days (Mid-Probation)</option>
                    <option value="90 Days">90 Days (End of Probation)</option>
                    <option value="Post-3-Months">Post-3-Months Continuous</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-black mb-1">Assignee Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Bukola Adeleke"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-black border border-slate-300 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-black mb-1">Due Date / Timeframe</label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Month / Day 30"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-black border border-slate-300 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Conditional & Flag Toggles */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTaskIsConditional}
                    onChange={(e) => setNewTaskIsConditional(e.target.checked)}
                    className="rounded text-[#D4AF37] focus:ring-[#D4AF37]"
                  />
                  <span className="font-bold text-black text-xs">Role-Dependent / Conditional Task</span>
                </label>

                {newTaskIsConditional && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Condition Details</label>
                    <input
                      type="text"
                      placeholder="e.g. Role dependent: background checks or confidential NDA where relevant"
                      value={newTaskConditionNote}
                      onChange={(e) => setNewTaskConditionNote(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs text-black border border-slate-300 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTaskRequiresHr}
                    onChange={(e) => setNewTaskRequiresHr(e.target.checked)}
                    className="rounded text-[#D4AF37] focus:ring-[#D4AF37]"
                  />
                  <span className="font-bold text-black text-xs">Flag for HR Confirmation (Dates / Milestones)</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] text-black font-black rounded-xl text-xs hover:bg-[#DFC15D] transition cursor-pointer shadow-xs"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: OFFICIAL CITADEL SOP VIEWER (Full Document Presentation)
         ========================================================================= */}
      {isSopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-black bg-black text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">The Citadel Global Community Church</h3>
                  <p className="text-xs text-[#D4AF37] font-mono font-bold">
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
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-black text-black text-sm uppercase tracking-wider">Introduction</h4>
                  <span className="text-[11px] font-bold text-black bg-[#D4AF37]/20 px-2 py-0.5 rounded">Dated 30 March 2024</span>
                </div>
                <p className="text-slate-700 leading-relaxed font-medium">
                  The onboarding checklist and schedule is designed to serve as a guide on the induction and on-boarding process for new employees with the aim to help them settle properly into the ministry. This is a breakdown of activities and task that is coordinated by the onboarding team to help the new joiner learn about the ministry, organization structure, her policies and culture, values and people as well as to understand their job expectations and KPI's.
                </p>
                <div className="pt-2">
                  <strong className="text-black block mb-1">Onboarding Team:</strong>
                  <ul className="grid grid-cols-2 gap-1 text-slate-700 font-semibold list-disc list-inside">
                    <li>Department or Unit Manager/Supervisor</li>
                    <li>People, Culture &amp; Change (Human Resources)</li>
                    <li>IT</li>
                    <li>Finance &amp; Account</li>
                    <li className="col-span-2">Mentor or Onboarding Buddy</li>
                  </ul>
                </div>
              </div>

              {/* Task Allocation Breakdown Table (Matching PDF Structure) */}
              <div className="space-y-3">
                <h4 className="font-black text-black text-sm uppercase tracking-wider border-b-2 border-[#D4AF37] pb-1">
                  New Hire Onboarding Task Allocation
                </h4>

                <div className="overflow-x-auto custom-scrollbar border border-slate-300 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#D4AF37] text-black font-black">
                        <th className="p-2.5 border-b border-black">Team / Role</th>
                        <th className="p-2.5 border-b border-black">Tasks &amp; Action Obligations</th>
                        <th className="p-2.5 border-b border-black w-36">Timeline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                      <tr>
                        <td className="p-2.5 font-bold bg-slate-50 border-r border-slate-200" rowSpan={6}>Tasks for Managers</td>
                        <td className="p-2.5">Send a welcome email introducing your new hire.</td>
                        <td className="p-2.5 font-bold">Day 1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Coordinate a welcome meeting to kick off your new hire's first day and introduce the new hire to the team.</td>
                        <td className="p-2.5 font-bold">Day 1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Assign your new hire a mentor and/or onboarding buddy.</td>
                        <td className="p-2.5 font-bold">Day 1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Schedule your new hire’s first day meetings, prioritizing intro calls with colleagues who will work closely with the new hire.</td>
                        <td className="p-2.5 font-bold">Day 1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Give the new employee an introduction to the ministry, including how their roles fits in and any performance expectations you'll have.</td>
                        <td className="p-2.5 font-bold">Day 2</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Invite your new employee to recurring one-on-one meetings to provide regular check-ins.</td>
                        <td className="p-2.5 font-bold">1st Three Months of Resumption</td>
                      </tr>

                      {/* PCCM */}
                      <tr className="border-t-2 border-slate-300">
                        <td className="p-2.5 font-bold bg-slate-50 border-r border-slate-200" rowSpan={6}>Tasks for People, Culture &amp; Change Team</td>
                        <td className="p-2.5">Send out a new hire welcome packet that includes the forms and documents new hires must complete.</td>
                        <td className="p-2.5 font-bold">Day 1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Share essential ministry policies (e.g., hours of operation, dress code, employee handbook, SOPs, etc.)</td>
                        <td className="p-2.5 font-bold">Day 1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Document the new hire's role and compensation information in your HRIS system or records.</td>
                        <td className="p-2.5 font-bold">Week 1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Complete background check of new hire (Employee verification, Guarantors verification, Reference checks, etc) - <em>Role dependent</em>.</td>
                        <td className="p-2.5 font-bold">Within the first month of resumption</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Schedule a meeting to review the new hire's understanding of ministry’s policies (same as above), Job Description &amp; KPI's.</td>
                        <td className="p-2.5 font-bold">1st Three weeks of Resumption</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Schedule periodic reviews of important milestones during 90-day probationary period with new hire and the new hire's manager; evaluation and confirmation.</td>
                        <td className="p-2.5 font-bold">1st three Months / End of probation</td>
                      </tr>

                      {/* Finance */}
                      <tr className="border-t-2 border-slate-300">
                        <td className="p-2.5 font-bold bg-slate-50 border-r border-slate-200" rowSpan={2}>Tasks for Finance &amp; Account Team</td>
                        <td className="p-2.5">Add the new employee to the payroll.</td>
                        <td className="p-2.5 font-bold">Week 1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Confirm employee financial details.</td>
                        <td className="p-2.5 font-bold">Week 1</td>
                      </tr>

                      {/* IT */}
                      <tr className="border-t-2 border-slate-300">
                        <td className="p-2.5 font-bold bg-slate-50 border-r border-slate-200" rowSpan={3}>IT Onboarding Checklist</td>
                        <td className="p-2.5">Create an email address for the new hire.</td>
                        <td className="p-2.5 font-bold">Before Resumption</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Set up account permissions for any platforms or software the role requires.</td>
                        <td className="p-2.5 font-bold">Before Resumption</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Prepare a computer and any phone equipment or tech accessories a new hire may need.</td>
                        <td className="p-2.5 font-bold">Before Resumption</td>
                      </tr>

                      {/* Mentor / Buddy */}
                      <tr className="border-t-2 border-slate-300">
                        <td className="p-2.5 font-bold bg-slate-50 border-r border-slate-200" rowSpan={4}>Mentor or Onboarding Buddy Checklist</td>
                        <td className="p-2.5">Take your new hire on a tour of the office.</td>
                        <td className="p-2.5 font-bold">Day 1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Schedule regular check-ins throughout the first two weeks.</td>
                        <td className="p-2.5 font-bold">1st Two Weeks</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Invite new hires to shadow relevant meetings or projects.</td>
                        <td className="p-2.5 font-bold">Through Probationary period</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">Be responsive to ad hoc questions throughout the day!</td>
                        <td className="p-2.5 font-bold">Through Probationary period</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Required Documents Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black text-black text-sm uppercase tracking-wider">Required Onboarding Documents for New Hires</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700 font-semibold list-disc list-inside">
                  <li>Benefits enrollment paperwork</li>
                  <li>Emergency contact information</li>
                  <li>Employee handbook featuring all company policies</li>
                  <li>Standard Operating Procedure manual</li>
                  <li>Payroll information</li>
                  <li>Employee Bio-data form</li>
                  <li className="sm:col-span-2">Non-disclosure agreement, non-compete, or confidentiality agreement (if applicable)</li>
                </ul>
              </div>

              {/* On-Site Orientation */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black text-black text-sm uppercase tracking-wider">On-Site Orientation Checklist</h4>
                <ul className="space-y-1 text-xs text-slate-700 font-medium list-disc list-inside">
                  <li>Show new hires their new office space, including important areas such as parking spots, break room.</li>
                  <li>Create employee ID.</li>
                  <li>Set up the new hire's work space, including any equipment they may need (e.g., computer, phone, business cards, office supplies, etc.).</li>
                  <li>Place a welcome gift on the new hire’s desk (typically company swag such as a mug, t-shirt, or stationery).</li>
                </ul>
              </div>

              {/* Closing Principles */}
              <div className="p-4 rounded-xl bg-[#111111] text-white border-2 border-black space-y-2">
                <h4 className="font-black text-[#D4AF37] text-sm uppercase tracking-wider">Closing Operational Principle</h4>
                <p className="text-slate-300 leading-relaxed font-medium">
                  While this is a three months onboarding schedule, the onboarding and assimilation process of new employees is continuous and should be reviewed periodically to ascertain the progress of the new employee and areas of difficulty before the employee’s first performance review. All resource or tool required for success in the role should be provided to the new hire.
                </p>
                <p className="text-[#D4AF37] font-bold text-xs pt-1">
                  Every member of the onboarding team will also be assessed on their responsible task through the onboarding process and period.
                </p>
              </div>

              {/* Document Sign-off Footer */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between text-xs gap-2">
                <div>
                  <span className="font-bold text-black">Prepared By: </span>
                  <strong className="text-black">Sussan Afuwape</strong>
                  <span className="mx-2">•</span>
                  <span className="font-bold text-black">For: </span>
                  <strong className="text-black">The Citadel Global Community Church</strong>
                </div>
                <span className="font-mono font-bold text-slate-700">Date: 30th March, 2024</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setIsSopModalOpen(false)}
                className="px-5 py-2 bg-black text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
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
