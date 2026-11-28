import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  ArrowUpRight,
  Calendar,
  FileText,
  Users,
  Plus,
  ShieldCheck,
  Check,
  XCircle,
  GitBranch,
  AlertCircle,
  Award,
  LogOut,
  Video,
  MapPin,
  X,
  CheckCircle2,
  UserCheck,
  ClipboardCheck,
  Send,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useRealtimeTable } from '../../../hooks/useRealtimeTable';
import { NavModule } from '../../layout/Sidebar';
import {
  leaveRepository,
  employeeRepository,
  offboardingRepository,
  performanceRepository,
  attendanceRepository,
  talentRepository,
  auditRepository,
} from '../../../services';
import { attendanceImportService } from '../../../features/attendance-import';
import { maskSensitiveEmployeeData } from '../../../utils/rbac';
import { classifyDailySummaryStatus } from '../../../utils/hrisHelpers';
import { EmployeeProfileModal } from '../../employee/EmployeeProfileModal';
import { LoadingSkeleton } from '../../common/LoadingSkeleton';
import {
  LeaveRequest,
  LeaveBalanceRecord,
  Employee,
  EmployeeHierarchy,
  ExitRequest,
  PerformanceReview,
  AttendanceRecord,
  OnboardingJourney,
} from '../../../types';

interface EmployeeDashboardProps {
  onNavigate: (module: NavModule) => void;
  onOpenLeaveModal: () => void;
}

const isStageManager = (stage?: string | null): boolean =>
  stage === 'MANAGER' ||
  stage === 'LINE_MANAGER' ||
  stage === 'DEPARTMENT_HEAD' ||
  stage === 'BUSINESS_HEAD';

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
};

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  onNavigate,
  onOpenLeaveModal,
}) => {
  const { currentUser, currentRole } = useAuth();

  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [myBalances, setMyBalances] = useState<LeaveBalanceRecord[]>([]);
  const [hierarchy, setHierarchy] = useState<EmployeeHierarchy | null>(null);
  const [deptTeammates, setDeptTeammates] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [myExitRequest, setMyExitRequest] = useState<ExitRequest | null>(null);
  const [myReviews, setMyReviews] = useState<PerformanceReview[]>([]);
  const [myOnboarding, setMyOnboarding] = useState<OnboardingJourney | null>(null);
  const [myAttendanceLogs, setMyAttendanceLogs] = useState<
    { date: string; checkIn: string; status: string; source: string }[]
  >([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selfAppraisalComments, setSelfAppraisalComments] = useState<Record<number, string>>({});
  const [savingAppraisalId, setSavingAppraisalId] = useState<number | null>(null);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Resignation Modal state
  const [isResignModalOpen, setIsResignModalOpen] = useState(false);
  const [resignManagerId, setResignManagerId] = useState('');
  const [resignDate, setResignDate] = useState(new Date().toISOString().split('T')[0]);
  const [resignLastDay, setResignLastDay] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [resignReason, setResignReason] = useState('');
  const [resignError, setResignError] = useState<string | null>(null);
  const [isSubmittingResign, setIsSubmittingResign] = useState(false);

  const actorEmployeeId = String(currentUser.employeeId || currentUser.id || '');

  const loadEmployeeData = useCallback(async () => {
    setLoadError(null);
    try {
      const [allLeaves, balData, empData, allEmpData, hierData, allExits, allReviews, allOnboarding, recentAttLogs] =
        await Promise.all([
          leaveRepository.getAll().catch(() => [] as LeaveRequest[]),
          leaveRepository.getBalances(actorEmployeeId || undefined).catch(() => [] as LeaveBalanceRecord[]),
          employeeRepository
            .getAll(
              currentUser.departmentId ? { departmentId: currentUser.departmentId } : undefined
            )
            .catch(() => [] as Employee[]),
          employeeRepository.getAll().catch(() => [] as Employee[]),
          actorEmployeeId
            ? employeeRepository.getHierarchy(actorEmployeeId).catch(() => null)
            : Promise.resolve(null),
          offboardingRepository.getAll().catch(() => [] as ExitRequest[]),
          performanceRepository.getReviews().catch(() => [] as PerformanceReview[]),
          talentRepository.getOnboardingJourneys().catch(() => [] as OnboardingJourney[]),
          attendanceRepository.getRecentLogs().catch(() => [] as AttendanceRecord[]),
        ]);

      const ownLeaves = allLeaves.filter(
        (l) =>
          (actorEmployeeId && String(l.employeeId) === actorEmployeeId) ||
          (currentUser.staffId && l.employeeStaffId === currentUser.staffId) ||
          (currentUser.name && l.employeeName === currentUser.name)
      );

      const ownExit =
        allExits.find(
          (ex) =>
            (actorEmployeeId && String(ex.employeeId) === actorEmployeeId) ||
            (currentUser.staffId && ex.staffId === currentUser.staffId) ||
            (currentUser.name && ex.employeeName.toLowerCase() === currentUser.name.toLowerCase())
        ) || null;

      const ownReviews = allReviews.filter(
        (rev) =>
          (actorEmployeeId && String(rev.employeeId) === actorEmployeeId) ||
          (currentUser.staffId && rev.employeeStaffId === currentUser.staffId) ||
          (currentUser.name &&
            rev.employeeName &&
            rev.employeeName.toLowerCase() === currentUser.name.toLowerCase())
      );

      const ownOnboarding =
        allOnboarding.find(
          (j) =>
            (actorEmployeeId && String(j.employeeId) === actorEmployeeId) ||
            (currentUser.staffId && j.staffId?.toLowerCase() === currentUser.staffId.toLowerCase()) ||
            (currentUser.name && j.employeeName?.toLowerCase() === currentUser.name.toLowerCase())
        ) || null;

      const selfRec = allEmpData.find(
        (e) =>
          (actorEmployeeId && String(e.id) === actorEmployeeId) ||
          (currentUser.staffId && e.staffId === currentUser.staffId)
      );

      const ownLogs = recentAttLogs.filter(
        (rec) =>
          (actorEmployeeId && String(rec.employeeId) === actorEmployeeId) ||
          (currentUser.staffId && rec.employeeStaffId === currentUser.staffId)
      );

      if (ownLogs.length > 0) {
        setMyAttendanceLogs(
          ownLogs.slice(0, 5).map((r) => ({
            date: r.date,
            checkIn: r.clockInTime || 'Logged',
            status: r.status,
            source: r.verificationSource || 'Biometric',
          }))
        );
      } else if (!import.meta.env.PROD && selfRec) {
        const snap = attendanceImportService.getSnapshot([selfRec]);
        setMyAttendanceLogs(
          snap.summaries.slice(0, 5).map((s) => ({
            date: s.date,
            checkIn: s.clockInTime || '—',
            status: classifyDailySummaryStatus(s, selfRec).dashboardStatus,
            source: 'ZKTeco Biometric',
          }))
        );
      } else {
        setMyAttendanceLogs([]);
      }

      setMyLeaves(ownLeaves);
      setMyBalances(balData);
      setHierarchy(hierData);
      setAllEmployees(allEmpData);
      setMyExitRequest(ownExit);
      setMyReviews(ownReviews);
      setMyOnboarding(ownOnboarding);
      setDeptTeammates(
        empData.filter(
          (e) =>
            (!actorEmployeeId || String(e.id) !== actorEmployeeId) &&
            (!currentUser.staffId || e.staffId !== currentUser.staffId)
        )
      );
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [actorEmployeeId, currentUser.departmentId, currentUser.name, currentUser.staffId]);

  useEffect(() => {
    void loadEmployeeData();
  }, [loadEmployeeData]);

  useRealtimeTable('leave_requests', () => {
    void loadEmployeeData();
  });

  useRealtimeTable('leave_balances', () => {
    void loadEmployeeData();
  });

  useRealtimeTable('offboarding_requests', () => {
    void loadEmployeeData();
  });

  useRealtimeTable('performance_reviews', () => {
    void loadEmployeeData();
  });

  useRealtimeTable('onboarding_journeys', () => {
    void loadEmployeeData();
  });

  const annualBalance = useMemo(
    () => myBalances.find((b) => (b.category?.name || '').toLowerCase().includes('annual')) || myBalances[0],
    [myBalances]
  );

  const annualRemaining = annualBalance ? Number(annualBalance.remaining_days) : 0;
  const annualTotal = annualBalance ? Number(annualBalance.total_days) : 0;
  const latestLeave = myLeaves[0] || null;
  const directSupervisor =
    hierarchy?.supervisorChain?.[0]?.fullName || currentUser.managerName || 'Top-Level (Routes to HR)';
  const directSupervisorId =
    hierarchy?.supervisorChain?.[0]?.id || currentUser.managerId || '';

  const selectableManagers = useMemo(
    () =>
      allEmployees.filter(
        (e) =>
          String(e.id) !== actorEmployeeId &&
          (!currentUser.staffId || e.staffId !== currentUser.staffId)
      ),
    [allEmployees, actorEmployeeId, currentUser.staffId]
  );

  const calculatedNoticeDays = useMemo(() => {
    if (!resignDate || !resignLastDay) return 0;
    const diff = new Date(resignLastDay).getTime() - new Date(resignDate).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [resignDate, resignLastDay]);

  const handleSubmitResignation = async (e: React.FormEvent) => {
    e.preventDefault();
    setResignError(null);
    if (!resignReason.trim()) {
      setResignError('Please provide your resignation statement or reason.');
      return;
    }
    if (resignLastDay <= resignDate) {
      setResignError('Proposed last working day must be after the resignation submission date.');
      return;
    }

    setIsSubmittingResign(true);
    try {
      const targetMgrId = resignManagerId || directSupervisorId || undefined;
      const created = await offboardingRepository.create({
        employeeId: actorEmployeeId,
        resignationDate: resignDate,
        proposedLastDay: resignLastDay,
        reason: resignReason.trim(),
        managerId: targetMgrId ? String(targetMgrId) : undefined,
      });

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Offboarding',
        action: 'Submitted Resignation',
        recordAffectedId: created.id,
        recordAffectedTitle: `Resignation by ${currentUser.name} (Last Day: ${resignLastDay})`,
        previousValue: 'Active',
        newValue: 'SUBMITTED',
        severity: 'Warning',
      });

      setIsResignModalOpen(false);
      setResignReason('');
      setActionToast(`Resignation submitted and routed to ${created.managerName || 'your manager'} for endorsement.`);
      setTimeout(() => setActionToast(null), 5000);
      await loadEmployeeData();
    } catch (err: any) {
      setResignError(err?.message || 'Unable to submit resignation request.');
    } finally {
      setIsSubmittingResign(false);
    }
  };

  const selfEmployeeRecord: Employee | null = useMemo(() => {
    const normStaff = (val?: string | null) =>
      (val || '').trim().toLowerCase().replace(/[-/\s]/g, '');
    const userStaffNorm = normStaff(currentUser.staffId);
    const userEmailLower = (currentUser.email || '').trim().toLowerCase();
    const userNameLower = (currentUser.name || '').trim().toLowerCase();

    const matched =
      allEmployees.find((e) => userStaffNorm && normStaff(e.staffId) === userStaffNorm && (!userNameLower || e.fullName.toLowerCase() === userNameLower)) ||
      allEmployees.find((e) => userEmailLower && (e.email || '').trim().toLowerCase() === userEmailLower) ||
      allEmployees.find(
        (e) =>
          actorEmployeeId &&
          String(e.id) === actorEmployeeId &&
          (!userNameLower || e.fullName.toLowerCase() === userNameLower)
      );
    if (matched) return maskSensitiveEmployeeData(currentUser, matched);
    if (!currentUser.id && !currentUser.staffId) return null;
    const nameParts = (currentUser.name || 'Staff Member').trim().split(/\s+/);
    return {
      id: actorEmployeeId || currentUser.id,
      staffId: currentUser.staffId || 'STAFF',
      fullName: currentUser.name,
      firstName: nameParts[0] || currentUser.name,
      lastName: nameParts.slice(1).join(' ') || '',
      dateOfBirth: '',
      gender: 'Male',
      phone: currentUser.phone || '',
      email: currentUser.email || '',
      address: currentUser.location || '',
      emergencyContact: { name: '', relationship: '', phone: '' },
      nextOfKin: { name: '', relationship: '', phone: '', address: '' },
      entityId: currentUser.entityId || '',
      entityName: currentUser.entityName || '',
      departmentId: currentUser.departmentId || '',
      departmentName: currentUser.departmentName || '',
      jobTitle: currentUser.jobTitle || 'Employee',
      gradeLevel: '',
      employmentType: 'Full-Time',
      employmentDate: '',
      managerId: currentUser.managerId,
      managerName: currentUser.managerName,
      contractStatus: 'Permanent',
      yearsOfService: 0,
      qualifications: [],
      certifications: [],
      bankPayroll: { bankName: '', accountNumber: '', accountName: '', salaryGrade: '', currency: 'NGN' },
      pensionHmo: { pfaName: '', rsaPin: '', hmoProvider: '', hmoPlan: '', hmoIdNumber: '' },
      status: 'Active',
    };
  }, [actorEmployeeId, allEmployees, currentUser]);

  const handleToggleOnboardingTask = async (taskId: string, nextDone: boolean) => {
    if (!myOnboarding) return;
    setTogglingTaskId(taskId);
    try {
      const updated = await talentRepository.toggleTaskCompletion(
        myOnboarding.id,
        taskId,
        nextDone,
        myOnboarding.version
      );
      setMyOnboarding(updated);
      setActionToast(`Onboarding task ${nextDone ? 'completed' : 'reopened'}.`);
      setTimeout(() => setActionToast(null), 3500);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to update onboarding task.');
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleSubmitSelfAppraisal = async (rev: PerformanceReview) => {
    const comment = (selfAppraisalComments[rev.id] || '').trim();
    if (!comment) return;
    setSavingAppraisalId(rev.id);
    try {
      await performanceRepository.evaluateReview(rev.id, {
        ratings: rev.ratings || [],
        employeeComments: comment,
        reviewerComments: rev.reviewerComments || undefined,
        version: rev.version,
      });
      setSelfAppraisalComments((prev) => ({ ...prev, [rev.id]: '' }));
      setActionToast('Self-appraisal reflection submitted to your reviewer.');
      setTimeout(() => setActionToast(null), 4000);
      await loadEmployeeData();
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to submit self-appraisal notes.');
    } finally {
      setSavingAppraisalId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="employee-dashboard">
      {loadError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{loadError}</span>
        </div>
      )}

      {actionToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{actionToast}</span>
          </span>
          <button onClick={() => setActionToast(null)} className="text-emerald-700 hover:text-emerald-950 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Scheduled Exit Interview Banner (Visible immediately on Employee Dashboard once HR schedules it) */}
      {myExitRequest && (
        <div
          data-testid="employee-exit-interview-card"
          className={`rounded-xl border p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4 ${
            myExitRequest.exitInterview
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#0B1F3A] text-white shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-sm font-bold text-slate-900">
                    {myExitRequest.exitInterview
                      ? 'Scheduled Exit Interview & Separation Progress'
                      : 'Active Resignation & Exit Process'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    {myExitRequest.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Resigned: <strong className="font-mono">{myExitRequest.resignationDate}</strong> · Proposed Last Day:{' '}
                  <strong className="font-mono">{myExitRequest.proposedLastDay}</strong> ({myExitRequest.noticePeriodDays} days notice)
                </p>
              </div>
            </div>
          </div>

          {/* 5-Stage Exit Stepper */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
            {[
              { label: '1. Submitted', done: true },
              { label: '2. Manager Forwarded', done: myExitRequest.managerEndorsed },
              { label: '3. HR Notice Verified', done: myExitRequest.hrVerified },
              { label: '4. Exit Interview', done: Boolean(myExitRequest.exitInterview) },
              { label: '5. Settled', done: myExitRequest.status === 'OFFBOARDED' },
            ].map((stage) => (
              <div
                key={stage.label}
                className={`px-2.5 py-2 rounded-lg border font-semibold flex items-center gap-1.5 ${
                  stage.done
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-white/70 text-slate-500 border-slate-200'
                }`}
              >
                <Check className={`w-3.5 h-3.5 shrink-0 ${stage.done ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span className="truncate">{stage.label}</span>
              </div>
            ))}
          </div>

          {myExitRequest.exitInterview && (
            <div className="p-4 rounded-xl bg-white border border-amber-200/90 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Interview Date &amp; Time
                </span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-[#174EA6]" />
                  <span>
                    {myExitRequest.exitInterview.date} at {myExitRequest.exitInterview.time}
                  </span>
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Format &amp; Location
                </span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-1">
                  {myExitRequest.exitInterview.mode === 'MS Teams' ? (
                    <Video className="w-3.5 h-3.5 text-[#174EA6]" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5 text-[#174EA6]" />
                  )}
                  <span>{myExitRequest.exitInterview.mode}</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Assigned Interviewer
                </span>
                <span className="font-bold text-slate-900 block mt-1">
                  {myExitRequest.exitInterview.interviewer}
                </span>
              </div>
              {myExitRequest.exitInterview.feedback && (
                <div className="sm:col-span-3 pt-2 border-t border-slate-100 text-slate-700">
                  <strong className="text-slate-900">HR Notes:</strong> {myExitRequest.exitInterview.feedback}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 1. Employee Welcome & Profile Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {currentUser.role === 'VIEWER' ? 'Read-Only Profile' : 'Employee Self-Service'} · Staff ID{' '}
              <span className="font-mono">{currentUser.staffId}</span>
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-600">
              {currentUser.jobTitle} · {currentUser.departmentName} · {currentUser.entityName}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
              <GitBranch className="w-3.5 h-3.5 text-[#174EA6] shrink-0" />
              <span>
                Direct Supervisor:{' '}
                <strong className="font-semibold text-slate-800">{directSupervisor}</strong>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {currentUser.role !== 'VIEWER' && (
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                data-testid="employee-open-profile-btn"
                className="px-3.5 py-2 rounded-lg font-semibold text-xs transition border flex items-center gap-1.5 cursor-pointer min-h-[38px] bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#174EA6]" />
                <span>My Profile &amp; Documents</span>
              </button>
            )}
            {currentUser.role !== 'VIEWER' && (
              <button
                onClick={onOpenLeaveModal}
                id="employee-apply-leave-btn"
                className="px-4 py-2 rounded-lg bg-[#174EA6] hover:bg-[#0B1F3A] text-white font-semibold text-xs shadow-2xs transition flex items-center gap-2 active:scale-[0.98] cursor-pointer min-h-[38px]"
              >
                <CalendarDays className="w-4 h-4 text-white" />
                <span>Apply for Leave</span>
              </button>
            )}
            {currentUser.role !== 'VIEWER' && !myExitRequest && (
              <button
                onClick={() => {
                  setResignError(null);
                  setResignManagerId(directSupervisorId ? String(directSupervisorId) : '');
                  setIsResignModalOpen(true);
                }}
                data-testid="employee-submit-resignation-btn"
                className="px-3.5 py-2 rounded-lg font-semibold text-xs transition border flex items-center gap-1.5 cursor-pointer min-h-[38px] bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Submit Resignation</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('leave')}
              className="px-3.5 py-2 rounded-lg font-semibold text-xs transition border flex items-center gap-1.5 cursor-pointer min-h-[38px] bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              <span>All My Requests</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Real Leave Balances Row */}
      {loading && myBalances.length === 0 ? (
        <LoadingSkeleton type="stats" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {myBalances.length > 0 ? (
            myBalances.slice(0, 4).map((bal) => {
              const total = Number(bal.total_days) || 0;
              const remaining = Math.max(0, Number(bal.remaining_days) || 0);
              const used = Number(bal.used_days) || 0;
              const pending = Number(bal.pending_days) || 0;
              const pct = total > 0 ? Math.min(100, Math.round((remaining / total) * 100)) : 0;
              return (
                <div
                  key={String(bal.id)}
                  className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {bal.category?.name || 'Leave Quota'}
                    </span>
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline gap-1.5 tabular-nums">
                    <span className="font-display text-2xl font-bold text-slate-900">{remaining}</span>
                    <span className="text-xs text-slate-500">/ {total} days left</span>
                  </div>
                  <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#174EA6] h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 tabular-nums">
                    Used: {used}d {pending > 0 ? `· Pending: ${pending}d` : ''}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="sm:col-span-2 lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/80 text-xs text-slate-500">
              Leave balance records will populate once annual allocations are initialized.
            </div>
          )}
        </div>
      )}

      {/* 3. Latest Request Two-Stage Progress + Full Request History */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#174EA6]" />
              <span>My Leave Requests &amp; Two-Stage Status</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Requests pass through Stage 1 (Direct Supervisor) and Stage 2 (HR Final Approval).
            </p>
          </div>
          {currentUser.role !== 'VIEWER' && (
            <button
              onClick={onOpenLeaveModal}
              className="px-3.5 py-2 rounded-lg bg-[#174EA6] text-white hover:bg-[#0B1F3A] font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Request</span>
            </button>
          )}
        </div>

        {latestLeave ? (
          <div className="p-5 space-y-5">
            {/* Highlight Latest Request & Stage Tracker */}
            {(() => {
              const stoppedStage =
                latestLeave.stoppedAtStage ||
                (latestLeave.status === 'Rejected' ? latestLeave.approvalStage : null);
              const rejectedAtMgr =
                latestLeave.status === 'Rejected' &&
                isStageManager(stoppedStage || latestLeave.approvalStage);
              const rejectedAtHr = latestLeave.status === 'Rejected' && stoppedStage === 'HR';
              const mgrApproved =
                Boolean(latestLeave.managerActedAt && !rejectedAtMgr) ||
                latestLeave.approvalStage === 'HR' ||
                latestLeave.approvalStage === 'COMPLETE' ||
                latestLeave.status === 'Approved';
              const hrApproved =
                latestLeave.status === 'Approved' || latestLeave.approvalStage === 'COMPLETE';

              return (
                <div className="space-y-4">
                  <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-sm font-bold text-slate-900">
                          {latestLeave.leaveType}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            latestLeave.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                              : latestLeave.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200/70'
                              : 'bg-amber-50 text-amber-800 border-amber-200/70'
                          }`}
                        >
                          {latestLeave.status}
                          {latestLeave.status === 'Rejected' && stoppedStage
                            ? ` (Stopped at ${stoppedStage})`
                            : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 tabular-nums">
                        <strong className="font-semibold text-slate-900">Dates:</strong> {latestLeave.startDate} to {latestLeave.endDate} (
                        {latestLeave.totalDays} days)
                      </p>
                      <p className="text-xs text-slate-600">
                        <strong className="font-semibold text-slate-900">Reason:</strong> {latestLeave.reason}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                      Ref #{latestLeave.id} · {latestLeave.appliedDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                          Submitted
                        </span>
                        <span className="text-xs font-bold text-slate-900 block">
                          {latestLeave.appliedDate}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                        rejectedAtMgr
                          ? 'border-rose-200 bg-rose-50/70'
                          : mgrApproved
                          ? 'border-emerald-200 bg-emerald-50/60'
                          : 'border-amber-200 bg-amber-50/70'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white ${
                          rejectedAtMgr
                            ? 'bg-rose-600'
                            : mgrApproved
                            ? 'bg-emerald-600'
                            : 'bg-amber-500'
                        }`}
                      >
                        {rejectedAtMgr ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : mgrApproved ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-700 block">
                          Stage 1: Manager
                        </span>
                        <span className="text-xs font-bold text-slate-900 block">
                          {latestLeave.managerActorName || latestLeave.managerName || 'Direct HR'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {rejectedAtMgr
                            ? `Rejected ${formatDateTime(latestLeave.managerActedAt)}`
                            : mgrApproved
                            ? `Approved ${formatDateTime(latestLeave.managerActedAt)}`
                            : 'Awaiting Supervisor'}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                        rejectedAtHr
                          ? 'border-rose-200 bg-rose-50/70'
                          : hrApproved
                          ? 'border-emerald-200 bg-emerald-50/60'
                          : latestLeave.approvalStage === 'HR' && latestLeave.status !== 'Rejected'
                          ? 'border-amber-200 bg-amber-50/70'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white ${
                          rejectedAtHr
                            ? 'bg-rose-600'
                            : hrApproved
                            ? 'bg-emerald-600'
                            : latestLeave.approvalStage === 'HR' && latestLeave.status !== 'Rejected'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                      >
                        {rejectedAtHr ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : hrApproved ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-700 block">
                          Stage 2: HR Final
                        </span>
                        <span className="text-xs font-bold text-slate-900 block">
                          {latestLeave.hrActorName || 'HR Team'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {rejectedAtHr
                            ? `Rejected ${formatDateTime(latestLeave.hrActedAt)}`
                            : rejectedAtMgr
                            ? 'Stopped at Stage 1'
                            : hrApproved
                            ? `Final Approved ${formatDateTime(latestLeave.hrActedAt)}`
                            : latestLeave.approvalStage === 'HR'
                            ? 'Awaiting HR Final Decision'
                            : 'Queued after Manager'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Complete Request History Table */}
            {myLeaves.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Request History ({myLeaves.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 pr-3">Leave Type</th>
                        <th className="py-2 pr-3">Dates</th>
                        <th className="py-2 pr-3">Days</th>
                        <th className="py-2 pr-3">Status &amp; Stage</th>
                        <th className="py-2">Stage Actors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myLeaves.map((lv) => (
                        <tr key={lv.id} className="hover:bg-slate-50">
                          <td className="py-2.5 pr-3 font-semibold text-slate-900">
                            {lv.leaveType}
                          </td>
                          <td className="py-2.5 pr-3 text-slate-600">
                            {lv.startDate} → {lv.endDate}
                          </td>
                          <td className="py-2.5 pr-3 font-mono font-bold text-slate-800">
                            {lv.totalDays}
                          </td>
                          <td className="py-2.5 pr-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                lv.status === 'Approved'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                                  : lv.status === 'Rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200/70'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200/70'
                              }`}
                            >
                              {lv.status}
                              {lv.status === 'Rejected' && lv.stoppedAtStage
                                ? ` @ ${lv.stoppedAtStage}`
                                : ''}
                            </span>
                          </td>
                          <td className="py-2.5 text-[11px] text-slate-600">
                            {lv.managerActorName ? `Mgr: ${lv.managerActorName}` : 'Pending Mgr'}
                            {lv.hrActorName ? ` · HR: ${lv.hrActorName}` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center space-y-3">
            <CalendarDays className="w-9 h-9 text-slate-400 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-900">No Leave Applications Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              You have {annualRemaining} of {annualTotal} annual leave days remaining.
            </p>
            {currentUser.role !== 'VIEWER' && (
              <button
                onClick={onOpenLeaveModal}
                className="px-4 py-2 rounded-lg bg-[#174EA6] text-white font-semibold text-xs hover:bg-[#0B1F3A] transition shadow-2xs cursor-pointer"
              >
                + Apply for Leave Now
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Department Teammates & Calendar Shortcut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#174EA6]" />
                <span>Department Teammates ({currentUser.departmentName})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Colleagues in your department directory.
              </p>
            </div>
            <button
              onClick={() => onNavigate('directory')}
              className="text-xs font-semibold text-[#174EA6] hover:text-[#0B1F3A] flex items-center gap-1 cursor-pointer"
            >
              <span>Directory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {deptTeammates.length > 0 ? (
              deptTeammates.slice(0, 5).map((mate) => (
                <div
                  key={mate.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 block truncate">{mate.fullName}</span>
                    <span className="text-[11px] text-slate-500 block truncate">{mate.jobTitle}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0">
                    {mate.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 p-6 text-center">No other teammates in this department.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#174EA6]" />
              <span>My Performance &amp; KPI Appraisals ({myReviews.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Weighted appraisal scores and manager feedback recorded on your staff profile.
            </p>
          </div>

          {myReviews.length > 0 ? (
            <div className="space-y-2.5" data-testid="employee-performance-card">
              {myReviews.slice(0, 3).map((rev) => (
                <div
                  key={rev.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      {rev.reviewPeriodStart} → {rev.reviewPeriodEnd}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                      {rev.finalRating ? `${Number(rev.finalRating).toFixed(2)} / 5.00` : rev.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Reviewer: <strong className="text-slate-800">{rev.reviewerName || 'Line Manager'}</strong>
                    {rev.ratings && rev.ratings.length > 0 ? ` · ${rev.ratings.length} KPIs assigned` : ''}
                  </p>
                  {rev.ratings && rev.ratings.length > 0 && (
                    <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-100">
                      {rev.ratings.slice(0, 3).map((r, rIdx) => {
                        const ratingVal =
                          typeof r.rating === 'number'
                            ? r.rating
                            : (r as { score?: number }).score;
                        return (
                          <div key={`${rev.id}-kpi-${rIdx}`} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-700 truncate">{r.kpiTitle || `KPI #${r.kpiId}`}</span>
                            <span className="font-mono font-semibold text-[#174EA6] shrink-0">
                              {ratingVal ? `${ratingVal}/${r.maxRating || 5}` : `${r.weight || 0}% wt`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {rev.reviewerComments && (
                    <p className="text-[11px] text-slate-700 italic bg-white p-2 rounded-lg border border-slate-100">
                      &ldquo;{rev.reviewerComments}&rdquo;
                    </p>
                  )}
                  {rev.employeeComments && (
                    <p className="text-[11px] text-emerald-900 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                      <strong>Your Self-Appraisal:</strong> {rev.employeeComments}
                    </p>
                  )}
                  {currentUser.role !== 'VIEWER' && rev.status !== 'APPROVED' && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={selfAppraisalComments[rev.id] || ''}
                        onChange={(e) =>
                          setSelfAppraisalComments((prev) => ({ ...prev, [rev.id]: e.target.value }))
                        }
                        placeholder="Add self-appraisal note or goal update..."
                        aria-label="Self-appraisal reflection"
                        className="flex-1 px-2.5 py-1.5 text-[11px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#174EA6]"
                      />
                      <button
                        type="button"
                        disabled={savingAppraisalId === rev.id || !(selfAppraisalComments[rev.id] || '').trim()}
                        onClick={() => void handleSubmitSelfAppraisal(rev)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#174EA6] text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 text-center">
              No appraisal records yet. Once your manager sets KPI goals and evaluates your performance, your weighted score will appear here.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigate('calendar')}
              className="p-3.5 rounded-xl border border-slate-200/90 hover:border-[#174EA6] hover:bg-slate-50/70 text-left space-y-1 transition cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#174EA6]" />
              <span className="font-semibold text-slate-900 block pt-1">My Calendar</span>
              <span className="text-[11px] text-slate-500 block">Holidays &amp; leave dates</span>
            </button>
            <button
              onClick={() => onNavigate('documents')}
              className="p-3.5 rounded-xl border border-slate-200/90 hover:border-[#174EA6] hover:bg-slate-50/70 text-left space-y-1 transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#174EA6]" />
              <span className="font-semibold text-slate-900 block pt-1">Documents</span>
              <span className="text-[11px] text-slate-500 block">HR policies &amp; files</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. My Attendance & My Onboarding Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Attendance Summary */}
        <div
          data-testid="employee-attendance-card"
          className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#174EA6]" />
                <span>My Attendance Records ({myAttendanceLogs.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your personal biometric check-ins and shift punctuality.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-[#174EA6] hover:text-[#0B1F3A] flex items-center gap-1 cursor-pointer"
            >
              <span>Attendance</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {myAttendanceLogs.length > 0 ? (
              myAttendanceLogs.map((log, idx) => (
                <div key={`${log.date}-${idx}`} className="px-5 py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 block">{log.date}</span>
                    <span className="text-[11px] text-slate-500">{log.source}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-700">{log.checkIn}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        log.status === 'Late'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 p-6 text-center">
                No personal attendance check-ins recorded yet. Open Attendance to view your schedule or clock in.
              </p>
            )}
          </div>
        </div>

        {/* My Onboarding Tasks */}
        <div
          data-testid="employee-onboarding-card"
          className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#174EA6]" />
                <span>My Onboarding Tasks</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {myOnboarding
                  ? `${myOnboarding.tasks.filter((t) => t.isCompleted).length}/${myOnboarding.tasks.length} tasks completed (${myOnboarding.overallProgressPercent}%)`
                  : 'Checklist items assigned during employee onboarding.'}
              </p>
            </div>
            {myOnboarding && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {myOnboarding.overallProgressPercent}%
              </span>
            )}
          </div>

          {myOnboarding ? (
            <div className="p-4 space-y-2.5">
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#174EA6] h-full rounded-full transition-all duration-300"
                  style={{ width: `${myOnboarding.overallProgressPercent}%` }}
                />
              </div>
              <div className="divide-y divide-slate-100">
                {myOnboarding.tasks.slice(0, 5).map((task) => (
                  <label
                    key={task.id}
                    className="py-2.5 flex items-start gap-2.5 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      disabled={togglingTaskId === task.id || currentUser.role === 'VIEWER'}
                      onChange={(e) => void handleToggleOnboardingTask(task.id, e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-[#174EA6] focus:ring-[#174EA6]"
                    />
                    <div className="min-w-0 flex-1">
                      <span
                        className={`font-medium block ${
                          task.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Due: {task.dueDate} · {task.category}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 p-6 text-center">
              No active onboarding tasks pending for your profile.
            </p>
          )}
        </div>
      </div>

      {/* Self-Service Profile & Document Upload Modal */}
      {isProfileModalOpen && (
        <EmployeeProfileModal
          employee={selfEmployeeRecord}
          onClose={() => setIsProfileModalOpen(false)}
          onNavigateLeave={() => {
            setIsProfileModalOpen(false);
            onNavigate('leave');
          }}
        />
      )}

      {/* Resignation Submission Modal */}
      {isResignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200/90 shadow-xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">Submit Formal Resignation</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Routes to your line manager first, then forwards to HR for contract &amp; exit interview scheduling.
                </p>
              </div>
              <button
                onClick={() => setIsResignModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitResignation} className="p-6 space-y-4 text-xs">
              {resignError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{resignError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-800 font-semibold mb-1.5">
                  Select Line Manager (Receives Resignation First)
                </label>
                <select
                  value={resignManagerId}
                  onChange={(e) => setResignManagerId(e.target.value)}
                  data-testid="resignation-manager-select"
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:border-[#174EA6]"
                >
                  <option value="">
                    {directSupervisor !== 'Top-Level (Routes to HR)'
                      ? `Default Manager (${directSupervisor})`
                      : 'Select your line manager'}
                  </option>
                  {selectableManagers.map((mgr) => (
                    <option key={mgr.id} value={String(mgr.id)}>
                      {mgr.fullName} — {mgr.jobTitle} ({mgr.departmentName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-semibold mb-1.5">Resignation Date *</label>
                  <input
                    type="date"
                    required
                    value={resignDate}
                    onChange={(e) => setResignDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#174EA6]"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-semibold mb-1.5">Proposed Last Working Day *</label>
                  <input
                    type="date"
                    required
                    value={resignLastDay}
                    onChange={(e) => setResignLastDay(e.target.value)}
                    data-testid="resignation-last-day-input"
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#174EA6]"
                  />
                </div>
              </div>

              <div
                className={`p-3 rounded-lg border text-[11px] font-semibold ${
                  calculatedNoticeDays >= 30
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                Notice Period: {calculatedNoticeDays} day(s) —{' '}
                {calculatedNoticeDays >= 30
                  ? 'Meets standard 30-day CGCC contractual notice requirement.'
                  : 'Short notice (< 30 days) — HR will review against employment contract.'}
              </div>

              <div>
                <label className="block text-slate-800 font-semibold mb-1.5">Reason for Resignation *</label>
                <textarea
                  rows={3}
                  required
                  value={resignReason}
                  onChange={(e) => setResignReason(e.target.value)}
                  data-testid="resignation-reason-input"
                  placeholder="State your reason for leaving and handover availability..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#174EA6]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResignModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResign}
                  data-testid="resignation-submit-btn"
                  className="px-5 py-2 bg-[#174EA6] hover:bg-[#0B1F3A] text-white font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingResign ? 'Submitting...' : 'Submit Resignation to Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
