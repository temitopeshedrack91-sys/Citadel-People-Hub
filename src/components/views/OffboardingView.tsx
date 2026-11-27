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
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { Employee, ExitRequest } from '../../types';
import { employeeRepository, offboardingRepository } from '../../services';
import { isHrOrAdminUser } from '../../utils/rbac';

export type { ExitRequest };

export const OffboardingView: React.FC = () => {
  const { currentUser } = useAuth();
  const [exitRequests, setExitRequests] = useState<ExitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
  const [resignationManagerId, setResignationManagerId] = useState('');

  // Exit Interview Form state
  const [interviewDate, setInterviewDate] = useState('2026-12-15');
  const [interviewTime, setInterviewTime] = useState('10:00 AM');
  const [interviewMode, setInterviewMode] = useState<'In-Person' | 'MS Teams'>('In-Person');
  const [interviewerName, setInterviewerName] = useState('Sussan Afuwape (PCCM Manager)');
  const [interviewFeedbackNotes, setInterviewFeedbackNotes] = useState('');

  // Manager Review Form state
  const [managerRemarks, setManagerRemarks] = useState('');

  const isHrOrAdmin = isHrOrAdminUser(currentUser);

  const loadOffboardingData = React.useCallback(async () => {
    try {
      const [exitList, empList] = await Promise.all([
        offboardingRepository.getAll(),
        employeeRepository.getAll(),
      ]);
      setExitRequests(exitList);
      setEmployees(empList);
      setSelectedExitForClearance((prev) =>
        prev ? exitList.find((r) => r.id === prev.id) ?? null : null
      );
      if (empList.length > 0 && !resignationEmpId) {
        const selfMatch =
          empList.find((e) => String(e.id) === String(currentUser.id) || e.staffId === currentUser.staffId) ??
          empList[0];
        setResignationEmpId(selfMatch.id);
        if (selfMatch.managerId) {
          setResignationManagerId(String(selfMatch.managerId));
        }
      }
      setActionError(null);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to load offboarding records.');
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, currentUser.staffId, resignationEmpId]);

  useEffect(() => {
    void loadOffboardingData();
  }, [loadOffboardingData]);

  useRealtimeTable('offboarding_requests', () => {
    void loadOffboardingData();
  });

  useRealtimeTable('employees', () => {
    void loadOffboardingData();
  });

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Submit Resignation
  const handleSubmitResignation = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((item) => String(item.id) === String(resignationEmpId));
    if (!emp) return;

    setSubmitting(true);
    setActionError(null);
    try {
      const created = await offboardingRepository.create({
        employeeId: emp.id,
        resignationDate: resignationNoticeDate,
        proposedLastDay: resignationLastDay,
        reason: resignationReason,
        ...(resignationManagerId ? { managerId: resignationManagerId } : {}),
      });
      setExitRequests((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
      setIsSubmitModalOpen(false);
      setResignationReason('');
      showToast(`Resignation submitted for ${created.employeeName} and routed to ${created.managerName}.`);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to submit resignation.');
    } finally {
      setSubmitting(false);
    }
  };

  // Manager Forwards to HR
  const handleManagerEndorse = async (exit: ExitRequest) => {
    setSubmitting(true);
    setActionError(null);
    try {
      const updated = await offboardingRepository.endorseByManager(exit.id, {
        comments: managerRemarks || 'Handover plan verified by manager and recommended to HR.',
        version: exit.version,
      });
      setExitRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedExitForReview(null);
      setManagerRemarks('');
      showToast(`Resignation for ${updated.employeeName} endorsed and forwarded to PCCM HR.`);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to endorse offboarding request.');
    } finally {
      setSubmitting(false);
    }
  };

  // HR Verifies Contract & Notice Period
  const handleHrVerifyNotice = async (exit: ExitRequest) => {
    setActionError(null);
    try {
      const updated = await offboardingRepository.verifyNotice(exit.id, {
        noticeCompliant: exit.noticeCompliant,
        version: exit.version,
      });
      setExitRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast(`Contract and notice period verified for ${updated.employeeName}. Ready for exit interview scheduling.`);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to verify notice compliance.');
    }
  };

  // HR Schedules Exit Interview
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExitForInterview) return;

    setSubmitting(true);
    setActionError(null);
    try {
      const updated = await offboardingRepository.scheduleInterview(selectedExitForInterview.id, {
        date: interviewDate,
        time: interviewTime,
        interviewer: interviewerName,
        mode: interviewMode,
        feedback: interviewFeedbackNotes || undefined,
        version: selectedExitForInterview.version,
      });
      setExitRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedExitForInterview(null);
      showToast(`Exit interview scheduled for ${updated.employeeName} on ${interviewDate} at ${interviewTime}.`);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to schedule exit interview.');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Department Clearance
  const handleToggleClearance = async (exitId: string, departmentKey: keyof ExitRequest['clearances']) => {
    const target =
      exitRequests.find((r) => r.id === exitId) ??
      (selectedExitForClearance?.id === exitId ? selectedExitForClearance : undefined);
    if (!target) return;

    setActionError(null);
    try {
      const updated = await offboardingRepository.updateClearance(
        exitId,
        departmentKey,
        !target.clearances[departmentKey],
        { version: target.version }
      );
      setExitRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedExitForClearance((prev) => (prev && prev.id === updated.id ? updated : prev));
      showToast('Department clearance sign-off updated.');
    } catch (err: any) {
      setActionError(err?.message || 'Unable to update clearance sign-off.');
    }
  };

  // Finalize Offboarding
  const handleFinalizeExit = async (exit: ExitRequest) => {
    setActionError(null);
    try {
      const updated = await offboardingRepository.finalize(exit.id, { version: exit.version });
      setExitRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast(`Offboarding finalized for ${updated.employeeName}.`);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to finalize offboarding.');
    }
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
            <UserRoundX className="w-5 h-5 text-[#174EA6]" />
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
            className="px-3.5 py-2 rounded-xl bg-[#174EA6] hover:bg-[#0B1F3A] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Resignation</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#174EA6] text-xs font-medium flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#174EA6] shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#111827]/25 text-[#111827] text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#111827] shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-[#111827] hover:text-[#111827]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
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
          <div className="mt-2 text-2xl font-black text-[#174EA6]">{scheduledInterviewsCount}</div>
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
                <ShieldCheck className="w-4 h-4 text-[#174EA6]" />
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
                            ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]'
                            : 'bg-[#FAF5EB] text-[#B88A24] border-[#E9D59A]'
                        }`}
                      >
                        Notice: {req.noticePeriodDays} Days ({req.noticeCompliant ? 'Compliant' : 'Short Notice'})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Assigned Manager: <strong className="text-slate-800 font-semibold">{req.managerName}</strong> • Stated Last Day:{' '}
                      <strong className="text-[#174EA6] font-bold">{req.proposedLastDay}</strong>
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
                    <div className="p-2 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#174EA6] font-bold flex items-center justify-between">
                      <span>1. Resignation</span>
                      <Check className="w-3.5 h-3.5 text-[#174EA6]" />
                    </div>
                    <div
                      className={`p-2 rounded-lg border font-bold flex items-center justify-between ${
                        req.managerEndorsed ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#174EA6]' : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span>2. Manager Review</span>
                      {req.managerEndorsed ? <Check className="w-3.5 h-3.5 text-[#174EA6]" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <div
                      className={`p-2 rounded-lg border font-bold flex items-center justify-between ${
                        req.hrVerified ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#174EA6]' : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span>3. Contract Check</span>
                      {req.hrVerified ? <Check className="w-3.5 h-3.5 text-[#174EA6]" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <div
                      className={`p-2 rounded-lg border font-bold flex items-center justify-between ${
                        req.exitInterview ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#174EA6]' : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span>4. Exit Interview</span>
                      {req.exitInterview ? <Check className="w-3.5 h-3.5 text-[#174EA6]" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <div
                      className={`p-2 rounded-lg border font-bold flex items-center justify-between ${
                        req.status === 'OFFBOARDED' ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#174EA6]' : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span>5. Final Clearance</span>
                      {req.status === 'OFFBOARDED' ? <Check className="w-3.5 h-3.5 text-[#174EA6]" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </div>
                </div>

                {/* Workflow Action Buttons */}
                <div className="pt-2 flex items-center justify-between gap-2 flex-wrap text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">Exit ID: {req.id}</span>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Stage 1 action for direct Supervisor / HR */}
                    {!req.managerEndorsed &&
                      (isHrOrAdmin ||
                        String(currentUser.id) === String(req.managerId || '') ||
                        employees.some(
                          (e) =>
                            String(e.id) === String(req.employeeId) &&
                            String(e.managerId || '') === String(currentUser.id)
                        )) && (
                      <button
                        onClick={() => {
                          setSelectedExitForReview(req);
                          setManagerRemarks('Handover verified and recommended to HR.');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#174EA6] hover:bg-[#0B1F3A] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                      >
                        <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Manager Forward to HR</span>
                      </button>
                    )}

                    {/* Stage 2 action for HR: verify notice */}
                    {req.managerEndorsed && !req.hrVerified && isHrOrAdmin && (
                      <button
                        onClick={() => void handleHrVerifyNotice(req)}
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
                      <FileCheck2 className="w-3.5 h-3.5 text-[#174EA6]" />
                      <span>Clearance Checklist ({Object.values(req.clearances).filter(Boolean).length}/4)</span>
                    </button>

                    {/* Stage 5 action for HR: finalize offboarding once interview and all clearances complete */}
                    {req.hrVerified &&
                      req.exitInterview &&
                      Object.values(req.clearances).every(Boolean) &&
                      req.status !== 'OFFBOARDED' &&
                      isHrOrAdmin && (
                        <button
                          onClick={() => void handleFinalizeExit(req)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#174EA6] hover:bg-[#174EA6] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Finalize Offboarding</span>
                        </button>
                      )}
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
                <FileCheck2 className="w-4 h-4 text-[#174EA6]" />
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
                    <td className="p-3 font-mono font-bold text-[#174EA6]">{r.proposedLastDay}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleClearance(r.id, 'it')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer transition ${
                          r.clearances.it
                            ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]'
                            : 'bg-[#F5F7FA] text-[#111827] border-[#111827]/25'
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
                            ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]'
                            : 'bg-[#F5F7FA] text-[#111827] border-[#111827]/25'
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
                            ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]'
                            : 'bg-[#F5F7FA] text-[#111827] border-[#111827]/25'
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
                            ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]'
                            : 'bg-[#F5F7FA] text-[#111827] border-[#111827]/25'
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
              <ShieldCheck className="w-4 h-4 text-[#174EA6]" />
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
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Submit Employee Resignation"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsSubmitModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 bg-[#174EA6] text-white flex items-center justify-between border-b border-[#BFDBFE]">
              <div>
                <h3 className="text-base font-bold text-white">Submit Employee Resignation</h3>
                <p className="text-xs text-blue-100">Initiate formal exit notice and route to designated manager.</p>
              </div>
              <button
                type="button"
                aria-label="Close resignation modal"
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitResignation} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-bold mb-1">Select Employee *</label>
                <select
                  value={resignationEmpId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setResignationEmpId(nextId);
                    const matched = employees.find((item) => String(item.id) === String(nextId));
                    setResignationManagerId(matched?.managerId ? String(matched.managerId) : '');
                  }}
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
                <label className="block text-slate-800 font-bold mb-1">Designated Reviewing Manager</label>
                <select
                  value={resignationManagerId}
                  onChange={(e) => setResignationManagerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900"
                >
                  <option value="">Employee Direct Supervisor / PCCM HR</option>
                  {employees
                    .filter((emp) => String(emp.id) !== String(resignationEmpId))
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.jobTitle || emp.departmentName})
                      </option>
                    ))}
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#174EA6]"
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
                  className="px-5 py-2 bg-[#174EA6] hover:bg-[#0B1F3A] text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
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
            <div className="p-5 bg-[#174EA6] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Line Manager Review</h3>
                <p className="text-xs text-blue-100">Staff: {selectedExitForReview.employeeName}</p>
              </div>
              <button onClick={() => setSelectedExitForReview(null)} className="text-slate-300 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Resignation Notice:</span>
                <p className="text-slate-800 font-semibold">{selectedExitForReview.reason}</p>
                <span className="text-[10px] text-[#174EA6] font-bold block">
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-[#174EA6]"
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
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Schedule Exit Interview"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSelectedExitForInterview(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-[#174EA6] text-white flex items-center justify-between border-b border-[#BFDBFE]">
              <div>
                <h3 className="text-base font-bold text-white">Schedule Exit Interview</h3>
                <p className="text-xs text-blue-100">
                  Staff: {selectedExitForInterview.employeeName} ({selectedExitForInterview.staffId})
                </p>
              </div>
              <button
                type="button"
                aria-label="Close interview modal"
                onClick={() => setSelectedExitForInterview(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-[#174EA6]"
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
            <div className="p-5 bg-[#174EA6] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Department Clearance Sign-off</h3>
                <p className="text-xs text-blue-100">{selectedExitForClearance.employeeName} ({selectedExitForClearance.staffId})</p>
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
                        ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]'
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
                        ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]'
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
                        ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]'
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
                        ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]'
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
