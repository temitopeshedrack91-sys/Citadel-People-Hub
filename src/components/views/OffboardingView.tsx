import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  FileText,
  ShieldCheck,
  UserRoundX,
  Plus,
  Calendar,
  Clock,
  User,
  Building,
  Check,
  X,
  AlertCircle,
  FileCheck2,
  HelpCircle,
  ExternalLink,
  Laptop,
  CreditCard,
  Key,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { Employee } from '../../types';
import { employeeRepository, auditRepository } from '../../services';

export interface ExitRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  staffId: string;
  departmentName: string;
  entityName: string;
  resignationDate: string;
  proposedLastDay: string;
  noticePeriodDays: number;
  noticeCompliant: boolean;
  reason: string;
  managerName: string;
  managerEndorsed: boolean;
  managerComments?: string;
  hrVerified: boolean;
  status:
    | 'SUBMITTED'
    | 'MANAGER_REVIEWED'
    | 'NOTICE_VERIFIED'
    | 'INTERVIEW_SCHEDULED'
    | 'CLEARANCE_IN_PROGRESS'
    | 'OFFBOARDED';
  exitInterview?: {
    date: string;
    time: string;
    interviewer: string;
    mode: 'In-Person' | 'MS Teams';
    feedback?: string;
  };
  clearances: {
    it: boolean;
    facilities: boolean;
    finance: boolean;
    hr: boolean;
  };
}

const DEFAULT_EXIT_REQUESTS: ExitRequest[] = [
  {
    id: 'exit-101',
    employeeId: 'emp-pastor-adeyoola',
    employeeName: 'Engr. Femi Olatunji',
    staffId: 'CGCC/008',
    departmentName: 'Transport & Logistics',
    entityName: 'Citadel Global Community Church (CGCC)',
    resignationDate: '2026-11-01',
    proposedLastDay: '2026-11-30',
    noticePeriodDays: 30,
    noticeCompliant: true,
    reason: 'Pursuing higher academic research fellowship at CSOG partner university.',
    managerName: 'Pastor Christian Ike (Executive Pastor)',
    managerEndorsed: true,
    managerComments: 'Handover of logistics schedules and fleet inventory completed. Warmly endorsed for fellowship.',
    hrVerified: true,
    status: 'INTERVIEW_SCHEDULED',
    exitInterview: {
      date: '2026-11-28',
      time: '11:00 AM',
      interviewer: 'Sussan Afuwape (PCCM Manager)',
      mode: 'In-Person',
      feedback: 'Excellent contributor to church operations over 3 years.',
    },
    clearances: {
      it: true,
      facilities: false,
      finance: true,
      hr: false,
    },
  },
  {
    id: 'exit-102',
    employeeId: 'emp-associate-1',
    employeeName: 'Kemi Adebayo',
    staffId: 'CGCC/024',
    departmentName: 'Media & Communications',
    entityName: 'Citadel Global Community Church (CGCC)',
    resignationDate: '2026-11-10',
    proposedLastDay: '2026-12-10',
    noticePeriodDays: 30,
    noticeCompliant: true,
    reason: 'Relocating to the United Kingdom for postgraduate studies.',
    managerName: 'Pastor Segun Bakare (ICT Director)',
    managerEndorsed: true,
    managerComments: 'Camera equipment and video archives handed over to unit lead.',
    hrVerified: true,
    status: 'NOTICE_VERIFIED',
    clearances: {
      it: false,
      facilities: false,
      finance: false,
      hr: false,
    },
  },
];

export const OffboardingView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [exitRequests, setExitRequests] = useState<ExitRequest[]>(() => {
    try {
      const saved = localStorage.getItem('citadel_exit_requests');
      return saved ? JSON.parse(saved) : DEFAULT_EXIT_REQUESTS;
    } catch {
      return DEFAULT_EXIT_REQUESTS;
    }
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState<'requests' | 'clearance' | 'lifecycle'>('requests');
  const [notification, setNotification] = useState<string | null>(null);

  // Modals state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedExitForReview, setSelectedExitForReview] = useState<ExitRequest | null>(null);
  const [selectedExitForInterview, setSelectedExitForInterview] = useState<ExitRequest | null>(null);
  const [selectedExitForClearance, setSelectedExitForClearance] = useState<ExitRequest | null>(null);

  // Resignation Form state
  const [resignationEmpId, setResignationEmpId] = useState('');
  const [resignationNoticeDate, setResignationNoticeDate] = useState(new Date().toISOString().split('T')[0]);
  const [resignationLastDay, setResignationLastDay] = useState('2026-12-31');
  const [resignationReason, setResignationReason] = useState('');
  const [resignationManager, setResignationManager] = useState('Sussan Afuwape (PCCM Manager)');

  // Exit Interview Form state
  const [interviewDate, setInterviewDate] = useState('2026-12-15');
  const [interviewTime, setInterviewTime] = useState('10:00 AM');
  const [interviewMode, setInterviewMode] = useState<'In-Person' | 'MS Teams'>('In-Person');
  const [interviewerName, setInterviewerName] = useState('Sussan Afuwape (PCCM Manager)');
  const [interviewFeedbackNotes, setInterviewFeedbackNotes] = useState('');

  // Manager Review Form state
  const [managerRemarks, setManagerRemarks] = useState('');

  const isHrOrAdmin = currentRole === 'ADMIN' || currentRole === 'HR_STAFF' || currentRole === 'PCCM_SUPER_ADMIN';

  useEffect(() => {
    employeeRepository.getAll().then((list) => {
      setEmployees(list);
      if (list.length > 0 && !resignationEmpId) {
        setResignationEmpId(list[0].id);
      }
    });
  }, []);

  const saveRequests = (updated: ExitRequest[]) => {
    setExitRequests(updated);
    try {
      localStorage.setItem('citadel_exit_requests', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save exit requests:', e);
    }
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Submit Resignation
  const handleSubmitResignation = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === resignationEmpId);
    if (!emp) return;

    // Check notice period calculation
    const start = new Date(resignationNoticeDate);
    const end = new Date(resignationLastDay);
    const diffDays = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const noticeCompliant = diffDays >= 30;

    const newExit: ExitRequest = {
      id: `exit-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.fullName,
      staffId: emp.staffId,
      departmentName: emp.departmentName,
      entityName: emp.entityName,
      resignationDate: resignationNoticeDate,
      proposedLastDay: resignationLastDay,
      noticePeriodDays: diffDays,
      noticeCompliant,
      reason: resignationReason,
      managerName: resignationManager,
      managerEndorsed: false,
      hrVerified: false,
      status: 'SUBMITTED',
      clearances: {
        it: false,
        facilities: false,
        finance: false,
        hr: false,
      },
    };

    const updated = [newExit, ...exitRequests];
    saveRequests(updated);

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Offboarding',
      action: 'Submitted Resignation',
      recordAffectedId: newExit.id,
      recordAffectedTitle: `Exit for ${newExit.employeeName}`,
      previousValue: 'Active',
      newValue: 'Resignation Submitted',
      severity: 'Info',
    });

    setIsSubmitModalOpen(false);
    setResignationReason('');
    showToast(`Resignation submitted for ${emp.fullName} and forwarded to ${resignationManager}.`);
  };

  // Manager Forwards to HR
  const handleManagerEndorse = async (exit: ExitRequest) => {
    const updated = exitRequests.map((r) =>
      r.id === exit.id
        ? {
            ...r,
            managerEndorsed: true,
            managerComments: managerRemarks || 'Handover plan verified by manager and recommended to HR.',
            status: 'MANAGER_REVIEWED' as const,
          }
        : r
    );
    saveRequests(updated);

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Offboarding',
      action: 'Manager Endorsed Resignation',
      recordAffectedId: exit.id,
      recordAffectedTitle: `Resignation for ${exit.employeeName}`,
      previousValue: 'SUBMITTED',
      newValue: 'MANAGER_REVIEWED',
      severity: 'Info',
    });

    setSelectedExitForReview(null);
    setManagerRemarks('');
    showToast(`Resignation for ${exit.employeeName} endorsed and forwarded to PCCM HR.`);
  };

  // HR Verifies Contract & Notice Period
  const handleHrVerifyNotice = async (exit: ExitRequest) => {
    const updated = exitRequests.map((r) =>
      r.id === exit.id
        ? {
            ...r,
            hrVerified: true,
            status: 'NOTICE_VERIFIED' as const,
          }
        : r
    );
    saveRequests(updated);

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Offboarding',
      action: 'HR Verified Contract & Notice',
      recordAffectedId: exit.id,
      recordAffectedTitle: `Exit contract check for ${exit.employeeName}`,
      previousValue: exit.status,
      newValue: 'NOTICE_VERIFIED',
      severity: 'Info',
    });

    showToast(`Contract and notice period verified for ${exit.employeeName}. Ready for exit interview scheduling.`);
  };

  // HR Schedules Exit Interview
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExitForInterview) return;

    const updated = exitRequests.map((r) =>
      r.id === selectedExitForInterview.id
        ? {
            ...r,
            status: 'INTERVIEW_SCHEDULED' as const,
            exitInterview: {
              date: interviewDate,
              time: interviewTime,
              interviewer: interviewerName,
              mode: interviewMode,
              feedback: interviewFeedbackNotes,
            },
          }
        : r
    );
    saveRequests(updated);

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Offboarding',
      action: 'Scheduled Exit Interview',
      recordAffectedId: selectedExitForInterview.id,
      recordAffectedTitle: `Exit Interview for ${selectedExitForInterview.employeeName}`,
      previousValue: selectedExitForInterview.status,
      newValue: 'INTERVIEW_SCHEDULED',
      severity: 'Info',
    });

    setSelectedExitForInterview(null);
    showToast(`Exit interview scheduled for ${selectedExitForInterview.employeeName} on ${interviewDate} at ${interviewTime}. Visible on employee dashboard.`);
  };

  // Update Department Clearance
  const handleToggleClearance = (exitId: string, departmentKey: keyof ExitRequest['clearances']) => {
    const updated = exitRequests.map((r) => {
      if (r.id !== exitId) return r;
      const newClearances = { ...r.clearances, [departmentKey]: !r.clearances[departmentKey] };
      const allDone = Object.values(newClearances).every(Boolean);
      return {
        ...r,
        clearances: newClearances,
        status: allDone ? ('OFFBOARDED' as const) : ('CLEARANCE_IN_PROGRESS' as const),
      };
    });
    saveRequests(updated);
    showToast('Department clearance sign-off updated.');
  };

  const pendingExitsCount = exitRequests.filter((r) => r.status !== 'OFFBOARDED').length;
  const scheduledInterviewsCount = exitRequests.filter((r) => r.exitInterview).length;
  const fullyClearCount = exitRequests.filter((r) => r.status === 'OFFBOARDED').length;

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserRoundX className="w-5 h-5 text-[#083E34]" />
            <span>Offboarding &amp; Exit Management</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Resignation Submissions, Manager Endorsement, Contract &amp; Notice Verification, Exit Interviews &amp; Multi-Department Clearance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'requests' ? 'bg-[#D4AF37] text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Exits ({exitRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('clearance')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'clearance' ? 'bg-[#D4AF37] text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Department Clearances
            </button>
            <button
              onClick={() => setActiveTab('lifecycle')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'lifecycle' ? 'bg-[#D4AF37] text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SOP Policy Charter
            </button>
          </div>

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#083E34] hover:bg-[#062c25] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Resignation</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Active Exit Processes</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{pendingExitsCount}</div>
          <Badge variant="warning" className="mt-3">
            In Workflow
          </Badge>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Exit Interviews Scheduled</div>
          <div className="mt-2 text-2xl font-black text-[#083E34]">{scheduledInterviewsCount}</div>
          <Badge variant="info" className="mt-3">
            Dashboard Synced
          </Badge>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Notice Compliant (30 Days)</div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {exitRequests.filter((r) => r.noticeCompliant).length} / {exitRequests.length}
          </div>
          <Badge variant="success" className="mt-3">
            Contract Verified
          </Badge>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Completed Clearances</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{fullyClearCount}</div>
          <Badge variant="citadel" className="mt-3">
            Certificates Issued
          </Badge>
        </div>
      </div>

      {/* TAB 1: ACTIVE EXIT REQUESTS WORKFLOW */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#083E34]" />
                <span>CGCC 5-Stage Resignation &amp; Offboarding Workflow</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sequential progression: Employee Resignation → Manager Endorsement → HR Notice Check → Exit Interview → Multi-Dept Clearance.
              </p>
            </div>
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Initiate Exit</span>
            </button>
          </div>

          <div className="space-y-4">
            {exitRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 hover:border-slate-300 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{req.employeeName}</span>
                      <span className="font-mono text-[10px] text-slate-500 px-2 py-0.5 rounded bg-slate-100 font-bold">
                        {req.staffId} • {req.departmentName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          req.noticeCompliant
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        Notice: {req.noticePeriodDays} Days ({req.noticeCompliant ? 'Compliant' : 'Short Notice'})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Assigned Manager: <strong className="text-slate-800 font-semibold">{req.managerName}</strong> • Stated Last Day:{' '}
                      <strong className="text-[#083E34] font-bold">{req.proposedLastDay}</strong>
                    </p>
                  </div>

                  <Badge
                    variant={
                      req.status === 'OFFBOARDED'
                        ? 'success'
                        : req.status === 'INTERVIEW_SCHEDULED'
                        ? 'info'
                        : req.status === 'NOTICE_VERIFIED'
                        ? 'citadel'
                        : 'warning'
                    }
                  >
                    {req.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                {/* Stated Reason & Manager Endorsement */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Stated Reason for Resignation:</span>
                    <p className="text-slate-700 mt-1 italic leading-relaxed">"{req.reason}"</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Line Manager Endorsement &amp; Handover:</span>
                    <p className="text-slate-700 mt-1 leading-relaxed">
                      {req.managerComments || (req.managerEndorsed ? 'Manager endorsed handover plan.' : 'Awaiting line manager review.')}
                    </p>
                  </div>
                </div>

                {/* Exit Interview Banner if Scheduled */}
                {req.exitInterview && (
                  <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-700 shrink-0" />
                      <div>
                        <span className="font-bold text-blue-950">Scheduled Exit Interview:</span>{' '}
                        <span className="text-blue-900 font-medium">
                          {req.exitInterview.date} at {req.exitInterview.time} ({req.exitInterview.mode}) with {req.exitInterview.interviewer}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold border border-blue-300 self-start sm:self-auto">
                      Dashboard Synced
                    </span>
                  </div>
                )}

                {/* 5-Stage Stepper Progress Tracker */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold flex items-center justify-between">
                      <span>1. Resignation</span>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div
                      className={`p-2 rounded-lg border font-bold flex items-center justify-between ${
                        req.managerEndorsed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span>2. Manager Review</span>
                      {req.managerEndorsed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <div
                      className={`p-2 rounded-lg border font-bold flex items-center justify-between ${
                        req.hrVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span>3. Contract Check</span>
                      {req.hrVerified ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <div
                      className={`p-2 rounded-lg border font-bold flex items-center justify-between ${
                        req.exitInterview ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span>4. Exit Interview</span>
                      {req.exitInterview ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <div
                      className={`p-2 rounded-lg border font-bold flex items-center justify-between ${
                        req.status === 'OFFBOARDED' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span>5. Final Clearance</span>
                      {req.status === 'OFFBOARDED' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </div>
                </div>

                {/* Workflow Action Buttons */}
                <div className="pt-2 flex items-center justify-between gap-2 flex-wrap text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">Exit ID: {req.id}</span>

                  <div className="flex items-center gap-2">
                    {/* Stage 1 action for Managers */}
                    {!req.managerEndorsed && (
                      <button
                        onClick={() => {
                          setSelectedExitForReview(req);
                          setManagerRemarks('Handover verified and recommended to HR.');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#083E34] hover:bg-[#062c25] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                      >
                        <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Manager Forward to HR</span>
                      </button>
                    )}

                    {/* Stage 2 action for HR: verify notice */}
                    {req.managerEndorsed && !req.hrVerified && isHrOrAdmin && (
                      <button
                        onClick={() => handleHrVerifyNotice(req)}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>HR Verify Contract &amp; Notice</span>
                      </button>
                    )}

                    {/* Stage 3 action for HR: schedule interview */}
                    {req.hrVerified && !req.exitInterview && isHrOrAdmin && (
                      <button
                        onClick={() => {
                          setSelectedExitForInterview(req);
                          setInterviewFeedbackNotes('');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Schedule Exit Interview</span>
                      </button>
                    )}

                    {/* Stage 4 action: manage department clearances */}
                    <button
                      onClick={() => setSelectedExitForClearance(req)}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-[#083E34]" />
                      <span>Clearance Checklist ({Object.values(req.clearances).filter(Boolean).length}/4)</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-DEPARTMENT CLEARANCE DASHBOARD */}
      {activeTab === 'clearance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#083E34]" />
                <span>Inter-Departmental Asset &amp; Access Clearance Sign-Off</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Each unit signs off on hardware returns, credential deactivation, finance audits, and certificate issuance.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Last Working Day</th>
                  <th className="p-3 text-center">IT Hardware &amp; Email</th>
                  <th className="p-3 text-center">Facilities &amp; ID Card</th>
                  <th className="p-3 text-center">Finance &amp; Loans</th>
                  <th className="p-3 text-center">HR Service Letter</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {exitRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-bold text-slate-900">
                      {r.employeeName}
                      <span className="block text-[10px] text-slate-500 font-mono">{r.staffId}</span>
                    </td>
                    <td className="p-3">{r.departmentName}</td>
                    <td className="p-3 font-mono font-bold text-[#083E34]">{r.proposedLastDay}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleClearance(r.id, 'it')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer transition ${
                          r.clearances.it
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {r.clearances.it ? '✓ Returned' : 'Pending'}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleClearance(r.id, 'facilities')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer transition ${
                          r.clearances.facilities
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {r.clearances.facilities ? '✓ Returned' : 'Pending'}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleClearance(r.id, 'finance')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer transition ${
                          r.clearances.finance
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {r.clearances.finance ? '✓ Settled' : 'Pending'}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleClearance(r.id, 'hr')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer transition ${
                          r.clearances.hr
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {r.clearances.hr ? '✓ Completed' : 'Pending'}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <Badge variant={r.status === 'OFFBOARDED' ? 'success' : 'warning'}>
                        {r.status === 'OFFBOARDED' ? 'Fully Cleared' : 'In Progress'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LIFECYCLE SOP POLICY CHARTER */}
      {activeTab === 'lifecycle' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#083E34]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Citadel Global Community Church — Personnel Lifecycle SOP Charter
              </h3>
            </div>
          </div>

          <div className="p-5 text-xs text-slate-700 leading-relaxed space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm mb-1">Standard Resignation &amp; Exit SOP</h4>
              <p className="text-slate-600">
                1. <strong>Submission:</strong> Employee files written notice with proposed effective date via Citadel People Hub and selects direct Line Manager.<br />
                2. <strong>Manager Review:</strong> Direct Manager conducts initial discussion, reviews handover deliverables, and forwards with notes to PCCM within 48 hours.<br />
                3. <strong>Contract &amp; Notice Verification:</strong> PCCM verifies contractual notice obligations (minimum 1 month for confirmed staff, 2 weeks for probationers).<br />
                4. <strong>Exit Interview:</strong> PCCM schedules formal exit interview, visible directly on the employee's personal dashboard.<br />
                5. <strong>Multi-Tier Clearance:</strong> IT revokes digital credentials, Facilities reclaims access badges/property, Finance certifies loan clearances, and HR issues Service Certificate.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SUBMIT RESIGNATION */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 bg-[#0A1E3F] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Submit Employee Resignation</h3>
                <p className="text-xs text-blue-200">Initiate formal exit notice and route to designated manager.</p>
              </div>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-slate-300 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitResignation} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-bold mb-1">Select Employee *</label>
                <select
                  value={resignationEmpId}
                  onChange={(e) => setResignationEmpId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.staffId}) • {emp.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Date of Notice *</label>
                  <input
                    type="date"
                    required
                    value={resignationNoticeDate}
                    onChange={(e) => setResignationNoticeDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Proposed Last Working Day *</label>
                  <input
                    type="date"
                    required
                    value={resignationLastDay}
                    onChange={(e) => setResignationLastDay(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Designated Reviewing Manager *</label>
                <select
                  value={resignationManager}
                  onChange={(e) => setResignationManager(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                >
                  <option value="Sussan Afuwape (PCCM Manager)">Sussan Afuwape (PCCM Manager)</option>
                  <option value="Pastor Christian Ike (Executive Pastor / Facilities)">Pastor Christian Ike (Executive Pastor / Facilities)</option>
                  <option value="Pastor Biola Adeyoola (Admin & Operations)">Pastor Biola Adeyoola (Admin & Operations)</option>
                  <option value="Pastor Segun Bakare (Executive Pastor / ICT)">Pastor Segun Bakare (Executive Pastor / ICT)</option>
                  <option value="Stephen Anuforo (Finance & Accounts Manager)">Stephen Anuforo (Finance & Accounts Manager)</option>
                  <option value="Olubunmi Ojo-John (Chief Security Officer)">Olubunmi Ojo-John (Chief Security Officer)</option>
                  <option value="Omoaholo Omoakhalen (Director CSG)">Omoaholo Omoakhalen (Director CSG)</option>
                  <option value="Olufisayo Bakare (CEO Holdings)">Olufisayo Bakare (CEO Holdings)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Stated Reason for Resignation *</label>
                <textarea
                  rows={3}
                  required
                  value={resignationReason}
                  onChange={(e) => setResignationReason(e.target.value)}
                  placeholder="Outline reasons for leaving and handover commitments..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#083E34]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#083E34] hover:bg-[#062c25] text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-[#D4AF37]" />
                  <span>Submit &amp; Route to Manager</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANAGER REVIEW & FORWARD TO HR */}
      {selectedExitForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-[#083E34] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Line Manager Review</h3>
                <p className="text-xs text-emerald-100">Staff: {selectedExitForReview.employeeName}</p>
              </div>
              <button onClick={() => setSelectedExitForReview(null)} className="text-slate-300 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Resignation Notice:</span>
                <p className="text-slate-800 font-semibold">{selectedExitForReview.reason}</p>
                <span className="text-[10px] text-[#083E34] font-bold block">
                  Proposed Last Day: {selectedExitForReview.proposedLastDay}
                </span>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Manager Handover Remarks &amp; Recommendations *</label>
                <textarea
                  rows={3}
                  value={managerRemarks}
                  onChange={(e) => setManagerRemarks(e.target.value)}
                  placeholder="Note status of ongoing tasks, handover colleague, and team coverage plan..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-[#083E34]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedExitForReview(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleManagerEndorse(selectedExitForReview)}
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Forward Resignation to HR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SCHEDULE EXIT INTERVIEW (HR) */}
      {selectedExitForInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-[#0A1E3F] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Schedule Exit Interview</h3>
                <p className="text-xs text-blue-200">
                  Staff: {selectedExitForInterview.employeeName} ({selectedExitForInterview.staffId})
                </p>
              </div>
              <button onClick={() => setSelectedExitForInterview(null)} className="text-slate-300 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleInterview} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Interview Date *</label>
                  <input
                    type="date"
                    required
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Interview Time *</label>
                  <input
                    type="text"
                    required
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    placeholder="e.g. 11:00 AM"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Interview Mode</label>
                  <select
                    value={interviewMode}
                    onChange={(e) => setInterviewMode(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    <option value="In-Person">In-Person (Citadel Campus)</option>
                    <option value="MS Teams">MS Teams (Video)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Interviewer (PCCM / HR)</label>
                  <input
                    type="text"
                    required
                    value={interviewerName}
                    onChange={(e) => setInterviewerName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Interview Agenda / Focus Notes</label>
                <textarea
                  rows={2}
                  value={interviewFeedbackNotes}
                  onChange={(e) => setInterviewFeedbackNotes(e.target.value)}
                  placeholder="Key areas for feedback: team culture, leadership, systems, growth..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-[#083E34]"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Interview invitation will be displayed on the employee's personal dashboard immediately.</span>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedExitForInterview(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold rounded-xl transition shadow-xs"
                >
                  Confirm &amp; Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DEPARTMENT CLEARANCE SIGN-OFF */}
      {selectedExitForClearance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 bg-[#083E34] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Department Clearance Sign-off</h3>
                <p className="text-xs text-emerald-100">{selectedExitForClearance.employeeName} ({selectedExitForClearance.staffId})</p>
              </div>
              <button onClick={() => setSelectedExitForClearance(null)} className="text-slate-300 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-3">
                {/* IT */}
                <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-4 h-4 text-slate-700" />
                    <div>
                      <span className="font-bold text-slate-900 block">IT Systems &amp; Hardware</span>
                      <span className="text-[11px] text-slate-500">Laptop, accessories, Microsoft 365 deactivation</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleClearance(selectedExitForClearance.id, 'it')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition ${
                      selectedExitForClearance.clearances.it
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {selectedExitForClearance.clearances.it ? '✓ Cleared' : 'Sign Off'}
                  </button>
                </div>

                {/* Facilities */}
                <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="w-4 h-4 text-slate-700" />
                    <div>
                      <span className="font-bold text-slate-900 block">Facilities &amp; Security</span>
                      <span className="text-[11px] text-slate-500">ID badge surrender, campus keys, parking tag</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleClearance(selectedExitForClearance.id, 'facilities')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition ${
                      selectedExitForClearance.clearances.facilities
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {selectedExitForClearance.clearances.facilities ? '✓ Cleared' : 'Sign Off'}
                  </button>
                </div>

                {/* Finance */}
                <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-slate-700" />
                    <div>
                      <span className="font-bold text-slate-900 block">Finance &amp; Accounts</span>
                      <span className="text-[11px] text-slate-500">Staff loan reconciliation, final payroll proration</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleClearance(selectedExitForClearance.id, 'finance')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition ${
                      selectedExitForClearance.clearances.finance
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {selectedExitForClearance.clearances.finance ? '✓ Cleared' : 'Sign Off'}
                  </button>
                </div>

                {/* HR */}
                <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileCheck2 className="w-4 h-4 text-slate-700" />
                    <div>
                      <span className="font-bold text-slate-900 block">People, Culture &amp; Change</span>
                      <span className="text-[11px] text-slate-500">Exit interview complete, Certificate of Service</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleClearance(selectedExitForClearance.id, 'hr')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition ${
                      selectedExitForClearance.clearances.hr
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {selectedExitForClearance.clearances.hr ? '✓ Cleared' : 'Sign Off'}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedExitForClearance(null)}
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffboardingView;
