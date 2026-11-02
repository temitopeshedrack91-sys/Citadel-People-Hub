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
  MoreHorizontal,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Layers,
  ListChecks,
} from 'lucide-react';
import {
  OnboardingJourney,
  OnboardingDepartment,
  OnboardingTimeline,
  OnboardingTask,
  OnboardingChecklistTemplate,
  Employee,
} from '../../types';
import { talentRepository, employeeRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { ChevronStepper } from '../common/ChevronStepper';

export const OnboardingView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [journeys, setJourneys] = useState<OnboardingJourney[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    'schedule' | 'milestones' | 'documents' | 'orientation' | 'accountability' | 'welcome-email'
  >('schedule');
  const [mainTab, setMainTab] = useState<'employee_onboardings' | 'onboarding_checklists'>('employee_onboardings');
  const [onboardingViewMode, setOnboardingViewMode] = useState<'roster' | 'detail'>('roster');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [checklistFilter, setChecklistFilter] = useState<string>('All');
  const [checklistTemplates, setChecklistTemplates] = useState<OnboardingChecklistTemplate[]>([]);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartOnboardingModalOpen, setIsStartOnboardingModalOpen] = useState(false);
  const [isAddChecklistModalOpen, setIsAddChecklistModalOpen] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Start Onboarding Form state
  const [startEmployeeId, setStartEmployeeId] = useState('');
  const [startChecklistId, setStartChecklistId] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [startOnboardingStep, setStartOnboardingStep] = useState<number>(1);
  const [selectedMilestonePhase, setSelectedMilestonePhase] = useState<number>(0);

  // Add Checklist Template Form state
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistCategory, setNewChecklistCategory] = useState<OnboardingChecklistTemplate['category']>('General');
  const [newChecklistTarget, setNewChecklistTarget] = useState('');
  const [newChecklistDuration, setNewChecklistDuration] = useState('1 Month');
  const [newChecklistDesc, setNewChecklistDesc] = useState('');

  const [departmentFilter, setDepartmentFilter] = useState<'All' | OnboardingDepartment>('All');
  const [timelineFilter, setTimelineFilter] = useState<'All' | string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed' | 'Flagged'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSopModalOpen, setIsSopModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState(false);

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

  const showToast = (msg: string, isError = false) => {
    setToastIsError(isError);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'The request failed.';

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const loadData = async () => {
    setIsLoading(true);
    const results = await Promise.allSettled([
      talentRepository.getOnboardingJourneys(),
      employeeRepository.getAll(),
      talentRepository.getChecklistTemplates
        ? talentRepository.getChecklistTemplates()
        : Promise.reject(new Error('Checklist template persistence is unavailable.')),
    ]);
    const failures: string[] = [];
    const [journeyResult, employeeResult, templateResult] = results;
    if (journeyResult.status === 'fulfilled') {
      setJourneys(journeyResult.value);
      if (journeyResult.value.length > 0 && !journeyResult.value.some((journey) => journey.id === selectedJourneyId)) {
        setSelectedJourneyId(journeyResult.value[0].id);
      }
    } else failures.push(`Onboarding journeys: ${errorMessage(journeyResult.reason)}`);
    if (employeeResult.status === 'fulfilled') setEmployeesList(employeeResult.value);
    else failures.push(`Employees: ${errorMessage(employeeResult.reason)}`);
    if (templateResult.status === 'fulfilled') setChecklistTemplates(templateResult.value);
    else failures.push(`Checklist templates: ${errorMessage(templateResult.reason)}`);
    setLoadError(failures.length ? failures.join(' ') : null);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentJourney = journeys.find((j) => j.id === selectedJourneyId) || journeys[0];

  const handleToggleTask = async (journeyId: string, taskId: string, currentVal: boolean) => {
    try {
      const updated = await talentRepository.toggleTaskCompletion(journeyId, taskId, !currentVal);
      setJourneys((previous) => previous.map((journey) => journey.id === journeyId ? updated : journey));
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
    } catch (error) {
      showToast(`Task update failed: ${errorMessage(error)}`, true);
    }
  };

  const handleToggleDocument = async (docId: string, currentVal: boolean) => {
    if (!currentJourney) return;
    try {
      if (!talentRepository.toggleDocumentSubmission) throw new Error('Document status persistence is unavailable.');
      const updated = await talentRepository.toggleDocumentSubmission(currentJourney.id, docId, !currentVal);
      setJourneys((previous) => previous.map((journey) => journey.id === currentJourney.id ? updated : journey));
      showToast(!currentVal ? 'Document marked as received.' : 'Document marked as pending.');
    } catch (error) {
      showToast(`Document update failed: ${errorMessage(error)}`, true);
    }
  };

  const handleToggleOrientation = async (itemId: string, currentVal: boolean) => {
    if (!currentJourney) return;
    try {
      if (!talentRepository.toggleOrientationItem) throw new Error('Orientation status persistence is unavailable.');
      const updated = await talentRepository.toggleOrientationItem(currentJourney.id, itemId, !currentVal);
      setJourneys((previous) => previous.map((journey) => journey.id === currentJourney.id ? updated : journey));
      showToast(!currentVal ? 'Orientation step verified.' : 'Orientation step reverted.');
    } catch (error) {
      showToast(`Orientation update failed: ${errorMessage(error)}`, true);
    }
  };

  const handleSendReminder = async (task: OnboardingTask) => {
    if (!currentJourney) return;
    try {
      if (!talentRepository.sendTaskReminder) throw new Error('Reminder delivery is not configured. No reminder was sent.');
      const sent = await talentRepository.sendTaskReminder(currentJourney.id, task.id);
      if (!sent) throw new Error('The reminder service did not confirm delivery.');
      const updatedTasks = currentJourney.tasks.map((item) => item.id === task.id ? { ...item, reminderSentAt: new Date().toISOString() } : item);
      setJourneys((previous) => previous.map((journey) => journey.id === currentJourney.id ? { ...journey, tasks: updatedTasks } : journey));
      showToast(`Reminder sent to ${task.assignedToName || task.assignedRole} for "${task.title}".`);
    } catch (error) {
      showToast(`Reminder failed: ${errorMessage(error)}`, true);
    }
  };

  const handleSendBulkReminders = () => {
    showToast('Bulk reminder delivery is not configured. No reminders were sent.', true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !currentJourney) return;
    if (!newTaskDesc.trim() || !newTaskDueDate.trim()) {
      showToast('Enter a task description and due date before saving.', true);
      return;
    }

    const taskPayload: Omit<OnboardingTask, 'id' | 'isCompleted'> = {
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      department: newTaskDept,
      timeline: newTaskTimeline,
      assignedRole: newTaskRole,
      assignedToName: newTaskAssignee.trim() || undefined,
      dueDate: newTaskDueDate.trim(),
      isConditional: newTaskIsConditional,
      conditionNote: newTaskConditionNote.trim() || undefined,
      requiresHrConfirmation: newTaskRequiresHr,
    };

    try {
      if (!talentRepository.createOnboardingTask) throw new Error('Onboarding task persistence is unavailable.');
      const updated = await talentRepository.createOnboardingTask(currentJourney.id, taskPayload);
      setJourneys((previous) => previous.map((journey) => journey.id === currentJourney.id ? updated : journey));
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssignee('');
      setNewTaskDueDate('');
      setNewTaskIsConditional(false);
      setNewTaskConditionNote('');
      setNewTaskRequiresHr(false);
      setIsNewTaskModalOpen(false);
      showToast('New onboarding task saved.');
    } catch (error) {
      showToast(`Onboarding task could not be saved: ${errorMessage(error)}`, true);
    }
  };

  const handleSaveNewOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startEmployeeId) {
      showToast('Please select an employee to onboard.');
      return;
    }
    if (!startChecklistId) {
      showToast('Please select an onboarding checklist template.');
      return;
    }

    if (!startDateInput) {
      showToast('Select an onboarding start date.', true);
      return;
    }
    const employee = employeesList.find((item) => item.id === startEmployeeId);
    const template = checklistTemplates.find((item) => item.id === startChecklistId);
    if (!employee || !template) {
      showToast('Please select both a valid employee and checklist template.');
      return;
    }

    const journeyRequest: OnboardingJourney = {
      id: '',
      employeeId: employee.id,
      employeeName: employee.fullName,
      staffId: employee.staffId,
      jobTitle: employee.jobTitle,
      entityName: employee.entityName,
      departmentName: employee.departmentName,
      startDate: startDateInput,
      checklistId: template.id,
      checklistTitle: template.title,
      overallProgressPercent: 0,
      status: 'In Progress',
      avatarUrl: employee.profilePhoto,
      mentorName: employee.managerName || '',
      mentorBuddyName: '',
      teamRoster: {
        managerName: employee.managerName || '',
        pccmOfficerName: '',
        itLeadName: '',
        financeLeadName: '',
        mentorBuddyName: '',
      },
      requiredDocuments: [],
      orientationItems: [],
      tasks: template.tasks || [],
    };

    try {
      if (!talentRepository.createOnboardingJourney) throw new Error('Onboarding journey persistence is unavailable.');
      const newJourney = await talentRepository.createOnboardingJourney(journeyRequest);
      setJourneys((previous) => [newJourney, ...previous]);
      setSelectedJourneyId(newJourney.id);
      setIsStartOnboardingModalOpen(false);
      setStartEmployeeId('');
      setStartChecklistId('');
      setStartDateInput('');
      setMainTab('employee_onboardings');
      setOnboardingViewMode('roster');
      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Talent & Onboarding',
        action: 'Initiated Onboarding Journey',
        recordAffectedId: newJourney.id,
        recordAffectedTitle: `Onboarding for ${newJourney.employeeName} (${newJourney.checklistTitle})`,
        newValue: 'In Progress',
        severity: 'Info',
      });
      showToast(`Onboarding journey saved for ${newJourney.employeeName}.`);
    } catch (error) {
      showToast(`Onboarding journey could not be saved: ${errorMessage(error)}`, true);
    }
  };

  const handleSaveNewChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim() || !newChecklistTarget.trim() || !newChecklistDuration.trim()) {
      showToast('Enter a title, target audience, and duration for the checklist template.', true);
      return;
    }

    const templateRequest: OnboardingChecklistTemplate = {
      id: '',
      title: newChecklistTitle.trim(),
      category: newChecklistCategory,
      targetAudience: newChecklistTarget.trim(),
      duration: newChecklistDuration.trim(),
      taskCount: 0,
      description: newChecklistDesc.trim(),
      tasks: [],
    };

    try {
      if (!talentRepository.createChecklistTemplate) throw new Error('Checklist template persistence is unavailable.');
      const template = await talentRepository.createChecklistTemplate(templateRequest);
      setChecklistTemplates((previous) => [template, ...previous]);
      if (isStartOnboardingModalOpen) setStartChecklistId(template.id);
      setNewChecklistTitle('');
      setNewChecklistTarget('');
      setNewChecklistDesc('');
      setIsAddChecklistModalOpen(false);
      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Talent & Onboarding',
        action: 'Created Checklist Template',
        recordAffectedId: template.id,
        recordAffectedTitle: template.title,
        newValue: template.category,
        severity: 'Info',
      });
      showToast(`Checklist "${template.title}" saved.`);
    } catch (error) {
      showToast(`Checklist could not be saved: ${errorMessage(error)}`, true);
    }
  };

  const handleToggleJourneyStatus = (journeyId: string) => {
    void journeyId;
    showToast('Onboarding status changes require an approved completion rule and are not saved yet.', true);
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
        <div role={toastIsError ? 'alert' : 'status'} className={`fixed top-20 right-6 z-50 bg-[#1E1E1E] text-white px-4 py-2.5 rounded-xl shadow-lg border flex items-center gap-2 text-xs font-bold animate-fade-in ${toastIsError ? 'border-rose-500/70' : 'border-[#D4AF37]/40'}`}>
          {toastIsError ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />}
          <span>{toastMessage}</span>
        </div>
      )}

      {loadError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">Some onboarding data could not be loaded. {loadError}</div>}
      {isLoading && <div role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600">Loading onboarding data…</div>}

      {/* Top Navigation & Action Header (Matching Screenshot 2) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setStartEmployeeId('');
              setStartChecklistId('');
              setStartDateInput('');
              setStartOnboardingStep(1);
              setIsStartOnboardingModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#DFC15D] text-black font-black text-xs sm:text-sm transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
            title="Start new employee onboarding"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Start Onboarding</span>
          </button>

          <button
            onClick={() => {
              setMainTab('onboarding_checklists');
              setOnboardingViewMode('roster');
            }}
            className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer active:scale-95 ${
              mainTab === 'onboarding_checklists'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
            title="Manage onboarding checklist templates"
          >
            <ListChecks className="w-4 h-4 text-[#D4AF37]" />
            <span>Onboarding Checklists</span>
          </button>
        </div>

        {/* Segmented View Switcher (Screenshot 2 Top Right) */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => {
              setMainTab('employee_onboardings');
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              mainTab === 'employee_onboardings'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:text-black font-semibold'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Employee Onboardings</span>
          </button>
          <button
            onClick={() => {
              setMainTab('onboarding_checklists');
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              mainTab === 'onboarding_checklists'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-600 hover:text-black font-semibold'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Onboarding Checklists</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: EMPLOYEE ONBOARDINGS ROSTER TABLE & KPIS (Screenshot 2)
         ========================================================================= */}
      {mainTab === 'employee_onboardings' && onboardingViewMode === 'roster' && (
        <div className="space-y-6">
          {/* 4 Summary Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Onboardings */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  TOTAL ONBOARDINGS
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {journeys.length}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: In Progress */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  IN PROGRESS
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {journeys.filter((j) => j.status === 'In Progress').length}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37] text-white flex items-center justify-center font-bold shadow-xs">
                <RotateCw className="w-5 h-5 animate-spin-slow" />
              </div>
            </div>

            {/* Card 3: Completed */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  COMPLETED
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {journeys.filter((j) => j.status === 'Completed').length}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Onboarding Checklists */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  ONBOARDING CHECKLISTS
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {checklistTemplates.length}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
            </div>
          </div>

          {/* Employee Onboardings Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/60 text-slate-500 text-xs font-bold">
                    <th className="py-3.5 px-4 w-12 text-slate-400 font-semibold">#</th>
                    <th className="py-3.5 px-4 font-semibold">Employee</th>
                    <th className="py-3.5 px-4 font-semibold">Checklist</th>
                    <th className="py-3.5 px-4 font-semibold">Progress</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Start Date</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {journeys.map((j, idx) => {
                    const completedCount = (j.tasks || []).filter((t) => t.isCompleted).length;
                    const totalCount = (j.tasks || []).length || 1;
                    return (
                      <tr
                        key={j.id}
                        onClick={() => {
                          setSelectedJourneyId(j.id);
                          setOnboardingViewMode('detail');
                        }}
                        className="hover:bg-slate-50/70 transition cursor-pointer group"
                      >
                        {/* Column 1: Index */}
                        <td className="py-4 px-4 text-xs font-semibold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Column 2: Employee */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {j.avatarUrl ? (
                              <img
                                src={j.avatarUrl}
                                alt={j.employeeName}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                                <Users className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                            <div className="truncate">
                              <div className="font-bold text-slate-900 text-sm group-hover:text-[#D4AF37] transition truncate">
                                {j.employeeName}
                              </div>
                              {j.jobTitle && (
                                <div className="text-xs text-slate-500 font-medium truncate">
                                  {j.jobTitle}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 3: Checklist */}
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-slate-50 border border-slate-200/80 text-slate-700 shadow-2xs max-w-[300px] truncate">
                            <FileText className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                            <span className="truncate">{j.checklistTitle || 'CGCC Standard 3-Month Induction Checklist'}</span>
                          </span>
                        </td>

                        {/* Column 4: Progress */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3 min-w-[150px]">
                            <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200 shrink-0">
                              <div
                                className="bg-[#2563EB] h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${j.overallProgressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-600 shrink-0">
                              {completedCount}/{totalCount} ({j.overallProgressPercent}%)
                            </span>
                          </div>
                        </td>

                        {/* Column 5: Status */}
                        <td className="py-4 px-4">
                          {j.status === 'Completed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Completed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#0D9488] text-white shadow-2xs">
                              <RotateCw className="w-3 h-3 animate-spin-slow" />
                              <span>In Progress</span>
                            </span>
                          )}
                        </td>

                        {/* Column 6: Start Date */}
                        <td className="py-4 px-4 text-xs font-medium text-slate-700">
                          {formatDateDisplay(j.startDate)}
                        </td>

                        {/* Column 7: Action */}
                        <td className="py-4 px-4 text-right">
                          <div className="relative inline-block text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpenId(actionMenuOpenId === j.id ? null : j.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                              title="Actions"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {actionMenuOpenId === j.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-fade-in text-left"
                              >
                                <button
                                  onClick={() => {
                                    setSelectedJourneyId(j.id);
                                    setOnboardingViewMode('detail');
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  <span>View Detailed Schedule</span>
                                </button>
                                <button
                                  onClick={() => {
                                    showToast(`Reminders sent for ${j.employeeName}'s pending tasks.`);
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Bell className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Send Reminders</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleToggleJourneyStatus(j.id);
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{j.status === 'Completed' ? 'Mark as In Progress' : 'Mark as Completed'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: ONBOARDING CHECKLISTS TEMPLATES LIBRARY
         ========================================================================= */}
      {mainTab === 'onboarding_checklists' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-[#111111] text-white rounded-2xl p-5 border-2 border-black shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center font-bold shrink-0">
                <ListChecks className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Onboarding Checklist Templates</h2>
                <p className="text-xs text-slate-300">
                  Standardized induction workflows, statutory compliance packs, and departmental checklists.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAddChecklistModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#DFC15D] text-black font-black text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Checklist Template</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {['All', 'General', 'ICT & Systems', 'Legal & Corporate', 'Pastoral & Ministry', 'Operations & Facilities'].map((cat) => (
              <button
                key={cat}
                onClick={() => setChecklistFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                  checklistFilter === cat
                    ? 'bg-black text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checklistTemplates
              .filter((tpl) => checklistFilter === 'All' || tpl.category === checklistFilter)
              .map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-black px-2.5 py-0.5 rounded-md bg-[#D4AF37]/20 text-black border border-[#D4AF37]/40">
                        {tpl.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {tpl.duration}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 mt-3">{tpl.title}</h3>
                    <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed line-clamp-3">
                      {tpl.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Target:</span>
                        <strong className="text-black">{tpl.targetAudience}</strong>
                      </div>
                      <div className="flex items-center justify-between font-semibold">
                        <span>Induction Tasks:</span>
                        <strong className="text-black">{tpl.taskCount} tasks</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setStartChecklistId(tpl.id);
                        setStartEmployeeId('');
                        setStartDateInput('');
                        setStartOnboardingStep(1);
                        setIsStartOnboardingModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#DFC15D] text-black font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Use for Onboarding</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: DETAILED 30 MARCH 2024 CGCC ONBOARDING JOURNEY & SCHEDULE
         ========================================================================= */}
      {mainTab === 'employee_onboardings' && onboardingViewMode === 'detail' && (
        <div className="space-y-6">
          {/* Top Return Breadcrumb */}
          <div className="flex items-center justify-between pb-1">
            <button
              onClick={() => setOnboardingViewMode('roster')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Back to Employee Onboardings</span>
            </button>
            <div className="text-xs text-slate-500 font-semibold">
              Viewing induction journey for <strong className="text-black">{currentJourney.employeeName}</strong>
            </div>
          </div>

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
                <span>Unit Manager: <strong className="text-black">{currentJourney.teamRoster?.managerName || 'Not assigned'}</strong></span>
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

          {/* Horizontal Chevron Timeline Pipeline (User's Marked Concept) */}
          <div className="py-1">
            <ChevronStepper
              steps={[
                { id: 0, title: 'Pre-Boarding', subtitle: 'Before Resumption' },
                { id: 1, title: 'Day 1 & 2', subtitle: 'Welcome & Orientation' },
                { id: 2, title: 'Week 1', subtitle: 'Core Systems' },
                { id: 3, title: 'Month 1', subtitle: '30-Day Check-in' },
                { id: 4, title: 'Month 2', subtitle: '60-Day Progress' },
                { id: 5, title: 'Month 3', subtitle: '90-Day Confirmation' },
              ]}
              currentStep={selectedMilestonePhase + 1}
              onStepClick={(step) => setSelectedMilestonePhase(step - 1)}
              variant="numbered"
            />
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
        </div>
      )}

      {/* =========================================================================
          MODAL: START ONBOARDING WIZARD (Chevron Stepper: Select > Details > Verify > Finish)
         ========================================================================= */}
      {isStartOnboardingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#2563EB]" />
                  <span>Start Employee Onboarding</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Follow the 4-step wizard to assign a standardized induction checklist and support team.
                </p>
              </div>
              <button
                onClick={() => setIsStartOnboardingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chevron Stepper Nav */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 shrink-0">
              <ChevronStepper
                steps={[
                  { id: 1, title: 'Select', subtitle: 'Employee' },
                  { id: 2, title: 'Details', subtitle: 'Checklist' },
                  { id: 3, title: 'Verify', subtitle: 'Schedule & Team' },
                  { id: 4, title: 'Finish', subtitle: 'Review & Launch' },
                ]}
                currentStep={startOnboardingStep}
                onStepClick={(step) => {
                  if (step === 1) setStartOnboardingStep(1);
                  if (step === 2 && startEmployeeId) setStartOnboardingStep(2);
                  if (step === 3 && startEmployeeId && startChecklistId) setStartOnboardingStep(3);
                  if (step === 4 && startEmployeeId && startChecklistId) setStartOnboardingStep(4);
                }}
                variant="numbered"
              />
            </div>

            {/* Modal Wizard Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* STEP 1: SELECT EMPLOYEE */}
              {startOnboardingStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label htmlFor="start-employee-select" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Choose Employee to Onboard <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="start-employee-select"
                        name="employee"
                        value={startEmployeeId}
                        onChange={(e) => setStartEmployeeId(e.target.value)}
                        className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] bg-white cursor-pointer"
                        required
                      >
                        <option value="">-- Select Employee --</option>
                        {employeesList.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.fullName} ({emp.staffId} • {emp.jobTitle})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Selected Employee Preview Card */}
                  {(() => {
                    const selectedEmp = employeesList.find((e) => e.id === startEmployeeId);
                    if (!selectedEmp) {
                      return (
                        <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center bg-slate-50 text-slate-500">
                          <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="text-xs font-semibold">Select an employee from the dropdown above to view profile details.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center font-black text-slate-700 text-sm shrink-0">
                            {selectedEmp.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900">{selectedEmp.fullName}</h4>
                              <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {selectedEmp.staffId}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium">
                              {selectedEmp.jobTitle} &middot; {selectedEmp.departmentName}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                          <div>
                            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Entity</span>
                            <span className="text-slate-800 font-bold">{selectedEmp.entityName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Manager / Lead</span>
                            <span className="text-slate-800 font-bold">{selectedEmp.managerName || 'Not assigned'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* STEP 2: DETAILS (CHECKLIST TEMPLATE) */}
              {startOnboardingStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="start-checklist-select" className="text-xs font-bold text-slate-700">
                        Select Checklist Template <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddChecklistModalOpen(true)}
                        className="text-xs font-bold text-[#0284C7] hover:text-[#0369A1] flex items-center gap-1 cursor-pointer transition"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add Checklist</span>
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        id="start-checklist-select"
                        name="checklist"
                        value={startChecklistId}
                        onChange={(e) => setStartChecklistId(e.target.value)}
                        className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] bg-white cursor-pointer"
                        required
                      >
                        <option value="">-- Select Checklist --</option>
                        {checklistTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.title} ({tpl.duration})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Selected Checklist Template Preview */}
                  {(() => {
                    const selectedTpl = checklistTemplates.find((t) => t.id === startChecklistId);
                    if (!selectedTpl) {
                      return (
                        <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center bg-slate-50 text-slate-500">
                          <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="text-xs font-semibold">Choose an onboarding checklist template from the dropdown above.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] uppercase tracking-wider font-black px-2.5 py-0.5 rounded-md bg-[#D4AF37]/20 text-black border border-[#D4AF37]/40">
                            {selectedTpl.category}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {selectedTpl.duration}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-slate-900">{selectedTpl.title}</h4>
                          <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                            {selectedTpl.description}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                          <div>
                            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Target Audience</span>
                            <span className="text-slate-800 font-bold">{selectedTpl.targetAudience}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Induction Tasks</span>
                            <span className="text-slate-800 font-bold">{selectedTpl.taskCount || selectedTpl.tasks?.length || 6} Tasks Queued</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* STEP 3: VERIFY (SCHEDULE & TEAM) */}
              {startOnboardingStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label htmlFor="start-date-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Resumption / Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="start-date-input"
                      name="startDate"
                      type="date"
                      value={startDateInput}
                      onChange={(e) => setStartDateInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] bg-white"
                      required
                    />
                  </div>

                  {/* Team Roster Grid */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Assigned Induction Team
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-3 rounded-lg border border-slate-200 bg-white">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Unit Manager</span>
                        <span className="font-bold text-slate-900 block mt-0.5">
                          {employeesList.find((e) => e.id === startEmployeeId)?.managerName || 'Not assigned'}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg border border-slate-200 bg-white">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">PCCM (HR) Lead</span>
                        <span className="font-bold text-slate-900 block mt-0.5">Dr. Bukola Adeleke</span>
                      </div>
                      <div className="p-3 rounded-lg border border-slate-200 bg-white">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">ICT / Systems Lead</span>
                        <span className="font-bold text-slate-900 block mt-0.5">Engr. Femi Olatunji</span>
                      </div>
                      <div className="p-3 rounded-lg border border-slate-200 bg-white">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Buddy</span>
                        <span className="font-bold text-slate-900 block mt-0.5">Assigned Buddy</span>
                      </div>
                    </div>
                  </div>

                  {/* Compliance Documentation Notice */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#083E34] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-600 font-medium">
                      Standard statutory compliance forms (Bio-Data, Emergency Contacts, NDA, Employee Handbook, SOP Manual) will be queued automatically upon launch.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 4: FINISH (REVIEW & LAUNCH) */}
              {startOnboardingStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <div className="flex items-center gap-2 text-emerald-900 font-black text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ready to Initiate Onboarding</span>
                    </div>
                    <p className="text-xs text-emerald-800 font-medium mt-1">
                      Review the onboarding parameters below before launching the official 3-month induction schedule.
                    </p>
                  </div>

                  {(() => {
                    const emp = employeesList.find((e) => e.id === startEmployeeId);
                    const tpl = checklistTemplates.find((t) => t.id === startChecklistId);
                    return (
                      <div className="border border-slate-200 rounded-xl bg-white p-4 space-y-3 text-xs">
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Staff Member:</span>
                          <span className="font-bold text-slate-900">{emp?.fullName || '—'} ({emp?.staffId})</span>
                        </div>
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Entity & Department:</span>
                          <span className="font-bold text-slate-900">{emp?.entityName} &middot; {emp?.departmentName}</span>
                        </div>
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Induction Checklist:</span>
                          <span className="font-bold text-slate-900">{tpl?.title} ({tpl?.duration})</span>
                        </div>
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                          <span className="text-slate-500 font-semibold">Official Resumption Date:</span>
                          <span className="font-bold text-slate-900">{startDateInput}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold">Initial Tasks Queued:</span>
                          <span className="font-bold text-slate-900">{tpl?.taskCount || 6} Tasks</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Wizard Navigation Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (startOnboardingStep > 1) {
                    setStartOnboardingStep(startOnboardingStep - 1);
                  } else {
                    setIsStartOnboardingModalOpen(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{startOnboardingStep === 1 ? 'Cancel' : 'Back'}</span>
              </button>

              <div className="text-xs text-slate-500 font-bold">
                Step <span className="text-black font-black">{startOnboardingStep}</span> of 4
              </div>

              {startOnboardingStep < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (startOnboardingStep === 1) {
                      if (!startEmployeeId) {
                        showToast('Please select an employee first.');
                        return;
                      }
                      setStartOnboardingStep(2);
                    } else if (startOnboardingStep === 2) {
                      if (!startChecklistId) {
                        showToast('Please choose a checklist template.');
                        return;
                      }
                      setStartOnboardingStep(3);
                    } else if (startOnboardingStep === 3) {
                      setStartOnboardingStep(4);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 border border-[#C59B27] font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 transition"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveNewOnboarding}
                  className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 border border-[#C59B27] font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 transition"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Launch Onboarding Journey</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD ONBOARDING CHECKLIST TEMPLATE
         ========================================================================= */}
      {isAddChecklistModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add Onboarding Checklist</h3>
              <button
                onClick={() => setIsAddChecklistModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewChecklist} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Checklist Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  placeholder="e.g., Slack and Virtual Office Navigation"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newChecklistCategory}
                    onChange={(e) => setNewChecklistCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] bg-white cursor-pointer"
                  >
                    <option value="General">General</option>
                    <option value="ICT & Systems">ICT & Systems</option>
                    <option value="Legal & Corporate">Legal & Corporate</option>
                    <option value="Pastoral & Ministry">Pastoral & Ministry</option>
                    <option value="Operations & Facilities">Operations & Facilities</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newChecklistDuration}
                    onChange={(e) => setNewChecklistDuration(e.target.value)}
                    placeholder="e.g. 2 Weeks, 1 Month, 3 Months"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Audience <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newChecklistTarget}
                  onChange={(e) => setNewChecklistTarget(e.target.value)}
                  placeholder="e.g., Legal Associates, Hybrid & Remote Staff"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={newChecklistDesc}
                  onChange={(e) => setNewChecklistDesc(e.target.value)}
                  rows={3}
                  placeholder="Outline the scope and mandatory procedures in this induction checklist..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] bg-white resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-md bg-[#D4AF37] hover:bg-[#DFC15D] text-black font-black text-xs flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 transition"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Save Checklist</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddChecklistModalOpen(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 cursor-pointer transition"
                >
                  Cancel
                </button>
              </div>
            </form>
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
