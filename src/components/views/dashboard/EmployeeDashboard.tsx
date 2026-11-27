import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useRealtimeTable } from '../../../hooks/useRealtimeTable';
import { NavModule } from '../../layout/Sidebar';
import {
  leaveRepository,
  employeeRepository,
  offboardingRepository,
  performanceRepository,
  auditRepository,
} from '../../../services';
import { LoadingSkeleton } from '../../common/LoadingSkeleton';
import { StatusPill } from '../../common/StatusPill';
import {
  LeaveRequest,
  LeaveBalanceRecord,
  Employee,
  EmployeeHierarchy,
  ExitRequest,
  PerformanceReview,
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = null;
    }
    setLoadError(null);
    try {
      const [allLeaves, balData, empData, allEmpData, hierData, allExits, allReviews] =
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

      setMyLeaves(ownLeaves);
      setMyBalances(balData);
      setHierarchy(hierData);
      setAllEmployees(allEmpData);
      setMyExitRequest(ownExit);
      setMyReviews(ownReviews);
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

  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null;
      void loadEmployeeData();
    }, 150);
  }, [loadEmployeeData]);

  useEffect(() => {
    void loadEmployeeData();
    return () => {
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
    };
  }, [loadEmployeeData]);

  useRealtimeTable('leave_requests', scheduleReload);
  useRealtimeTable('leave_balances', scheduleReload);

  useRealtimeTable('offboarding_requests', () => {
    void loadEmployeeData();
  });

  useRealtimeTable('performance_reviews', () => {
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

  return (
    <div className="space-y-5 animate-fade-in" data-testid="employee-dashboard">
      {loadError && (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" aria-hidden="true" />
          <span>{loadError}</span>
        </div>
      )}

      {/* 1. Employee Welcome & Reporting Context */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span className="uppercase tracking-wider text-[#083E34]">
                {currentUser.role === 'VIEWER' ? 'Read-Only Profile' : 'Employee Self-Service'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-600">Staff ID: {currentUser.staffId}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {currentUser.jobTitle} · {currentUser.departmentName} · {currentUser.entityName}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-[#083E34]" aria-hidden="true" />
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
                onClick={onOpenLeaveModal}
                id="employee-apply-leave-btn"
                className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-semibold text-xs shadow-2xs transition flex items-center gap-2 cursor-pointer min-h-[38px] border border-[#C59B27]"
              >
                <CalendarDays className="w-4 h-4 text-slate-950" aria-hidden="true" />
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
              type="button"
              onClick={() => onNavigate('leave')}
              className="px-3.5 py-2 rounded-xl font-semibold text-xs transition border flex items-center gap-1.5 cursor-pointer min-h-[38px] bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              <span>All My Requests</span>
              <ArrowUpRight className="w-4 h-4 text-slate-500" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Leave Balances Row */}
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
                  className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-600">
                      {bal.category?.name || 'Leave Quota'}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] text-[#B45309] border border-[#F2E4B8] flex items-center justify-center">
                      <CalendarDays className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5 tabular-nums">
                    <span className="text-2xl font-bold text-[#083E34]">{remaining}</span>
                    <span className="text-xs text-slate-500 font-medium">/ {total} days left</span>
                  </div>
                  <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#083E34] h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2 font-medium tabular-nums">
                    Used: {used}d {pending > 0 ? `· Pending: ${pending}d` : ''}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="sm:col-span-2 lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 text-xs text-slate-500">
              Leave balance records will appear once annual allocations are initialized by HR.
            </div>
          )}
        </div>
      )}

      {/* 3. Latest Request Two-Stage Progress & History */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
              <span>My Leave Requests &amp; Two-Stage Status</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Requests pass through Stage 1 (Direct Supervisor) and Stage 2 (HR Final Approval).
            </p>
          </div>
          {currentUser.role !== 'VIEWER' && (
            <button
              type="button"
              onClick={onOpenLeaveModal}
              className="px-3 py-1.5 rounded-xl bg-[#D4AF37] text-slate-950 hover:bg-[#C59B27] font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs border border-[#C59B27]"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>New Request</span>
            </button>
          )}
        </div>

        {latestLeave ? (
          <div className="p-5 space-y-5">
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
                        <span className="text-sm font-semibold text-[#083E34]">
                          {latestLeave.leaveType}
                        </span>
                        <StatusPill
                          status={
                            latestLeave.status === 'Approved'
                              ? 'confirmed'
                              : latestLeave.status === 'Rejected'
                              ? 'rejected'
                              : 'pending'
                          }
                          label={`${latestLeave.status}${
                            latestLeave.status === 'Rejected' && stoppedStage
                              ? ` (Stopped at ${stoppedStage})`
                              : ''
                          }`}
                          size="sm"
                        />
                      </div>
                      <p className="text-xs text-slate-700 tabular-nums">
                        <strong className="font-semibold">Dates:</strong> {latestLeave.startDate} to {latestLeave.endDate} (
                        {latestLeave.totalDays} days)
                      </p>
                      <p className="text-xs text-slate-600">
                        <strong className="font-semibold">Reason:</strong> {latestLeave.reason}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      Ref #{latestLeave.id} · {latestLeave.appliedDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-emerald-800 block">
                          Submitted
                        </span>
                        <span className="text-xs font-semibold text-slate-900 block">
                          {latestLeave.appliedDate}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                        rejectedAtMgr
                          ? 'border-rose-200 bg-rose-50/60'
                          : mgrApproved
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-amber-200 bg-amber-50/60'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white ${
                          rejectedAtMgr
                            ? 'bg-rose-600'
                            : mgrApproved
                            ? 'bg-emerald-700'
                            : 'bg-amber-600'
                        }`}
                      >
                        {rejectedAtMgr ? (
                          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : mgrApproved ? (
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-700 block">
                          Stage 1: Manager
                        </span>
                        <span className="text-xs font-semibold text-slate-900 block">
                          {latestLeave.managerActorName || latestLeave.managerName || 'Direct HR'}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
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
                          ? 'border-rose-200 bg-rose-50/60'
                          : hrApproved
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : latestLeave.approvalStage === 'HR' && latestLeave.status !== 'Rejected'
                          ? 'border-amber-200 bg-amber-50/60'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white ${
                          rejectedAtHr
                            ? 'bg-rose-600'
                            : hrApproved
                            ? 'bg-emerald-700'
                            : latestLeave.approvalStage === 'HR' && latestLeave.status !== 'Rejected'
                            ? 'bg-amber-600'
                            : 'bg-slate-400'
                        }`}
                      >
                        {rejectedAtHr ? (
                          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : hrApproved ? (
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-700 block">
                          Stage 2: HR Final
                        </span>
                        <span className="text-xs font-semibold text-slate-900 block">
                          {latestLeave.hrActorName || 'HR Team'}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
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

            {myLeaves.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Request History ({myLeaves.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-200">
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
                        <tr key={lv.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 pr-3 font-semibold text-slate-900">
                            {lv.leaveType}
                          </td>
                          <td className="py-2.5 pr-3 text-slate-600 tabular-nums">
                            {lv.startDate} → {lv.endDate}
                          </td>
                          <td className="py-2.5 pr-3 font-mono font-semibold text-slate-800 tabular-nums">
                            {lv.totalDays}
                          </td>
                          <td className="py-2.5 pr-3">
                            <StatusPill
                              status={
                                lv.status === 'Approved'
                                  ? 'confirmed'
                                  : lv.status === 'Rejected'
                                  ? 'rejected'
                                  : 'pending'
                              }
                              label={`${lv.status}${
                                lv.status === 'Rejected' && lv.stoppedAtStage
                                  ? ` @ ${lv.stoppedAtStage}`
                                  : ''
                              }`}
                              size="sm"
                            />
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
          <div className="p-6 text-center space-y-2.5">
            <CalendarDays className="w-6 h-6 text-amber-600 mx-auto" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-slate-900">No Leave Applications Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto tabular-nums">
              You have {annualRemaining} of {annualTotal} annual leave days remaining.
            </p>
            {currentUser.role !== 'VIEWER' && (
              <button
                type="button"
                onClick={onOpenLeaveModal}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 font-semibold text-xs hover:bg-[#C59B27] transition shadow-2xs cursor-pointer border border-[#C59B27]"
              >
                Apply for Leave
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Department Teammates & Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
                <span>Department Teammates ({currentUser.departmentName})</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Colleagues in your department directory.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('directory')}
              className="text-xs font-semibold text-[#083E34] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Directory</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-2">
            {deptTeammates.length > 0 ? (
              deptTeammates.slice(0, 5).map((mate) => (
                <div
                  key={mate.id}
                  className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900 block">{mate.fullName}</span>
                    <span className="text-[11px] text-slate-500">{mate.jobTitle}</span>
                  </div>
                  <StatusPill status="active" label={mate.status} size="sm" />
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 p-6 text-center">No other teammates in this department.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
              <span>Quick Shortcuts</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Jump directly to your leave schedule or HR policies.
            </p>
          </div>

          {myReviews.length > 0 ? (
            <div className="space-y-2.5" data-testid="employee-performance-card">
              {myReviews.slice(0, 3).map((rev) => (
                <div
                  key={rev.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-1.5 text-xs"
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
                    {rev.ratings && rev.ratings.length > 0 ? ` · ${rev.ratings.length} KPIs assessed` : ''}
                  </p>
                  {rev.reviewerComments && (
                    <p className="text-[11px] text-slate-700 italic bg-white p-2 rounded-lg border border-slate-100">
                      &ldquo;{rev.reviewerComments}&rdquo;
                    </p>
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
              type="button"
              onClick={() => onNavigate('calendar')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34]/40 hover:bg-slate-50 text-left space-y-1 transition cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
              <span className="font-semibold text-slate-900 block">My Calendar</span>
              <span className="text-[11px] text-slate-500 block">Holidays &amp; leave dates</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('documents')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34]/40 hover:bg-slate-50 text-left space-y-1 transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
              <span className="font-semibold text-slate-900 block">Documents</span>
              <span className="text-[11px] text-slate-500 block">HR policies &amp; files</span>
            </button>
          </div>
        </div>
      </div>

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
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:border-[#083E34]"
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
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#083E34]"
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
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#083E34]"
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
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#083E34]"
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
                  className="px-5 py-2 bg-[#083E34] hover:bg-[#062E27] text-white font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
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
