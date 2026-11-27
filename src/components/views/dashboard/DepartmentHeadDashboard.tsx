import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users,
  CheckCircle2,
  CalendarDays,
  Check,
  X,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  GitBranch,
  Award,
  LogOut,
  Send,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useRealtimeTable } from '../../../hooks/useRealtimeTable';
import { NavModule } from '../../layout/Sidebar';
import { leaveRepository, employeeRepository, auditRepository } from '../../../services';
import { StatusPill } from '../../common/StatusPill';
import {
  LeaveRequest,
  LeaveBalanceRecord,
  TeamCalendarLeaveEvent,
  EmployeeHierarchy,
  Employee,
  ExitRequest,
  PerformanceReview,
} from '../../../types';

interface DepartmentHeadDashboardProps {
  onNavigate: (module: NavModule) => void;
  onOpenLeaveModal: () => void;
}

const isStageManager = (stage?: string | null): boolean =>
  stage === 'MANAGER' ||
  stage === 'LINE_MANAGER' ||
  stage === 'DEPARTMENT_HEAD' ||
  stage === 'BUSINESS_HEAD';

export const DepartmentHeadDashboard: React.FC<DepartmentHeadDashboardProps> = ({
  onNavigate,
  onOpenLeaveModal,
}) => {
  const { currentUser, currentRole } = useAuth();

  const [directReports, setDirectReports] = useState<Employee[]>([]);
  const [hierarchy, setHierarchy] = useState<EmployeeHierarchy | null>(null);
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequest[]>([]);
  const [teamExits, setTeamExits] = useState<ExitRequest[]>([]);
  const [teamReviews, setTeamReviews] = useState<PerformanceReview[]>([]);
  const [myBalances, setMyBalances] = useState<LeaveBalanceRecord[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<TeamCalendarLeaveEvent[]>([]);
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [exitComments, setExitComments] = useState<Record<string, string>>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const actorEmployeeId = String(currentUser.employeeId || currentUser.id || '');

  const loadData = useCallback(async () => {
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = null;
    }
    try {
      const [hierData, allEmps, allLeaves, balData, calData, allExits, allReviews] =
        await Promise.all([
          actorEmployeeId
            ? employeeRepository.getHierarchy(actorEmployeeId).catch(() => null)
            : Promise.resolve(null),
          employeeRepository.getAll().catch(() => [] as Employee[]),
          leaveRepository.getAll().catch(() => [] as LeaveRequest[]),
          leaveRepository.getBalances(actorEmployeeId || undefined).catch(() => [] as LeaveBalanceRecord[]),
          leaveRepository.getTeamCalendar().catch(() => [] as TeamCalendarLeaveEvent[]),
          offboardingRepository.getAll().catch(() => [] as ExitRequest[]),
          performanceRepository.getReviews().catch(() => [] as PerformanceReview[]),
        ]);

      setHierarchy(hierData);

      let reports: Employee[] = [];
      if (hierData?.directReports && hierData.directReports.length > 0) {
        const directIds = new Set(hierData.directReports.map((d) => String(d.id)));
        reports = allEmps.filter((e) => directIds.has(String(e.id)));
        if (reports.length === 0) {
          reports = hierData.directReports.map((d) => ({
            id: String(d.id),
            staffId: d.staffId,
            fullName: d.fullName,
            firstName: d.firstName,
            lastName: d.lastName,
            dateOfBirth: '',
            gender: 'Male',
            phone: d.phone || '',
            email: d.email || '',
            address: '',
            emergencyContact: { name: '', relationship: '', phone: '' },
            nextOfKin: { name: '', relationship: '', phone: '', address: '' },
            entityId: String(d.entityId || ''),
            entityName: d.entityName || '',
            departmentId: String(d.departmentId || ''),
            departmentName: d.departmentName || '',
            jobTitle: d.jobTitle,
            gradeLevel: '',
            employmentType: 'Full-Time',
            employmentDate: '',
            managerId: d.managerId ? String(d.managerId) : undefined,
            managerName: d.managerName || undefined,
            contractStatus: 'Permanent',
            yearsOfService: 0,
            qualifications: [],
            certifications: [],
            bankPayroll: {
              bankName: '',
              accountNumber: '',
              accountName: '',
              salaryGrade: '',
              currency: 'NGN',
            },
            pensionHmo: {
              pfaName: '',
              rsaPin: '',
              hmoProvider: '',
              hmoPlan: '',
              hmoIdNumber: '',
            },
            status: (d.status as any) || 'Active',
          }));
        }
      } else {
        const userNameLower = (currentUser.name || '').toLowerCase();
        reports = allEmps.filter((e) => {
          if (actorEmployeeId && String(e.id) === actorEmployeeId) return false;
          if (actorEmployeeId && String(e.managerId || '') === actorEmployeeId) return true;
          if (userNameLower && (e.managerName || '').toLowerCase().includes(userNameLower)) {
            return true;
          }
          return false;
        });
      }

      setDirectReports(reports);
      setMyBalances(balData);
      setCalendarEvents(calData);

      const reportIdSet = new Set(reports.map((r) => String(r.id)));
      const reportStaffSet = new Set(reports.map((r) => r.staffId));
      const userNameLower = (currentUser.name || '').toLowerCase();

      const filteredLeaves = allLeaves.filter((l) => {
        if (actorEmployeeId && String(l.employeeId) === actorEmployeeId) return false;
        return (
          reportIdSet.has(String(l.employeeId)) ||
          (l.employeeStaffId && reportStaffSet.has(l.employeeStaffId)) ||
          (actorEmployeeId && String(l.managerId || '') === actorEmployeeId) ||
          (userNameLower && (l.managerName || '').toLowerCase().includes(userNameLower))
        );
      });
      setTeamLeaves(filteredLeaves);

      const filteredExits = allExits.filter((ex) => {
        if (actorEmployeeId && String(ex.employeeId) === actorEmployeeId) return false;
        return (
          reportIdSet.has(String(ex.employeeId)) ||
          (ex.staffId && reportStaffSet.has(ex.staffId)) ||
          (actorEmployeeId && String(ex.managerId || '') === actorEmployeeId) ||
          (userNameLower && (ex.managerName || '').toLowerCase().includes(userNameLower))
        );
      });
      setTeamExits(filteredExits);
      setTeamReviews(
        allReviews.filter(
          (rev) =>
            reportIdSet.has(String(rev.employeeId)) ||
            (actorEmployeeId && String(rev.reviewerId || '') === actorEmployeeId)
        )
      );
    } catch (err: any) {
      setActionError(err?.message || 'Unable to load manager workspace.');
    }
  }, [actorEmployeeId, currentUser.name]);

  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null;
      void loadData();
    }, 150);
  }, [loadData]);

  useEffect(() => {
    void loadData();
    return () => {
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
    };
  }, [loadData]);

  useRealtimeTable('leave_requests', scheduleReload);
  useRealtimeTable('leave_balances', scheduleReload);
  useRealtimeTable('employees', scheduleReload);

  useRealtimeTable('offboarding_requests', () => {
    void loadData();
  });

  useRealtimeTable('performance_reviews', () => {
    void loadData();
  });

  const handleForwardResignationToHr = async (exitReq: ExitRequest) => {
    setActionError(null);
    setProcessingId(exitReq.id);
    try {
      const comment =
        (exitComments[exitReq.id] || '').trim() ||
        `Reviewed and endorsed by line manager (${currentUser.name}). Forwarded to HR for contract & notice verification.`;
      await offboardingRepository.endorseByManager(exitReq.id, {
        comments: comment,
        version: exitReq.version,
      });
      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Offboarding',
        action: 'Manager Forwarded Resignation to HR',
        recordAffectedId: exitReq.id,
        recordAffectedTitle: `Resignation of ${exitReq.employeeName}`,
        previousValue: 'SUBMITTED',
        newValue: 'MANAGER_REVIEWED',
        severity: 'Info',
      });
      setExitComments((prev) => ({ ...prev, [exitReq.id]: '' }));
      setActionFeedback(
        `Forwarded ${exitReq.employeeName}'s resignation to HR for contract verification and exit interview scheduling.`
      );
      setTimeout(() => setActionFeedback(null), 5000);
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || 'Unable to forward resignation to HR.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleManagerApprove = async (leave: LeaveRequest) => {
    setActionError(null);
    setProcessingId(leave.id);
    try {
      const comment =
        (reviewComments[leave.id] || '').trim() ||
        `Stage 1 Direct Supervisor approval granted by ${currentUser.name}. Forwarded to HR for final decision.`;

      const updated = await leaveRepository.updateStatus(
        leave.id,
        'Approved',
        currentUser.name,
        comment
      );

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Leave Management',
        action: 'Manager Approved Leave (Stage 1)',
        recordAffectedId: leave.id,
        recordAffectedTitle: `${leave.leaveType} for ${leave.employeeName}`,
        previousValue: leave.status,
        newValue: updated.status,
        severity: 'Info',
      });

      setReviewComments((prev) => ({ ...prev, [leave.id]: '' }));
      setActionFeedback(
        `Approved ${leave.leaveType} for ${leave.employeeName}. Forwarded to HR for Stage 2 final approval.`
      );
      setTimeout(() => setActionFeedback(null), 4000);
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || 'Unable to approve request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleManagerReject = async (leave: LeaveRequest) => {
    setActionError(null);
    setProcessingId(leave.id);
    try {
      const comment =
        (reviewComments[leave.id] || '').trim() ||
        `Declined at Stage 1 by direct supervisor (${currentUser.name}).`;

      await leaveRepository.updateStatus(leave.id, 'Rejected', currentUser.name, comment);

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Leave Management',
        action: 'Manager Rejected Leave (Stage 1)',
        recordAffectedId: leave.id,
        recordAffectedTitle: `${leave.leaveType} for ${leave.employeeName}`,
        previousValue: leave.status,
        newValue: 'Rejected',
        severity: 'Warning',
      });

      setReviewComments((prev) => ({ ...prev, [leave.id]: '' }));
      setActionFeedback(`Request for ${leave.employeeName} rejected at Stage 1 (Manager).`);
      setTimeout(() => setActionFeedback(null), 4000);
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || 'Unable to reject request.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingQueue = useMemo(
    () =>
      teamLeaves.filter(
        (l) => l.status === 'Submitted' && isStageManager(l.approvalStage || 'MANAGER')
      ),
    [teamLeaves]
  );

  const ownAnnualBalance = useMemo(() => {
    const own = myBalances.filter(
      (b) =>
        (actorEmployeeId && String(b.employee_id) === actorEmployeeId) ||
        (currentUser.staffId && b.employee?.staff_id === currentUser.staffId)
    );
    return own.find((b) => (b.category?.name || '').toLowerCase().includes('annual')) || own[0] || null;
  }, [actorEmployeeId, currentUser.staffId, myBalances]);

  const supervisorName =
    hierarchy?.supervisorChain?.[0]?.fullName ||
    currentUser.managerName ||
    'Executive Leadership (Direct to HR)';

  return (
    <div className="space-y-5 animate-fade-in" data-testid="manager-dashboard">
      {/* 1. Manager Workspace Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span className="uppercase tracking-wider text-[#083E34]">Manager Workspace</span>
              <span aria-hidden="true">·</span>
              <span>{currentUser.entityName}</span>
              <span aria-hidden="true">·</span>
              <span>{currentUser.departmentName}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {currentUser.name} — Team &amp; Approval Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-[#083E34]" aria-hidden="true" />
              <span>
                {currentUser.jobTitle} · Reports to{' '}
                <strong className="font-semibold text-slate-800">{supervisorName}</strong>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onOpenLeaveModal}
              id="hod-apply-leave-btn"
              className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-semibold text-xs shadow-2xs transition flex items-center gap-2 cursor-pointer min-h-[38px] border border-[#C59B27]"
            >
              <CalendarDays className="w-4 h-4 text-slate-950" aria-hidden="true" />
              <span>Apply for Leave</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('leave')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition flex items-center gap-1.5 cursor-pointer min-h-[38px]"
            >
              <span>All Team Requests</span>
              <ArrowUpRight className="w-4 h-4 text-slate-500" aria-hidden="true" />
            </button>
          </div>
        </div>

        {actionFeedback && (
          <div role="status" className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {actionError && (
          <div role="alert" className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* 2. Manager KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600">Direct Reports</span>
            <div className="w-8 h-8 rounded-lg bg-[#EBF5F2] text-[#083E34] flex items-center justify-center border border-[#A3D4C7]/50">
              <Users className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-bold text-slate-900">{directReports.length}</span>
            <span className="text-xs text-slate-500 font-medium">reporting to you</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600">Pending Approvals</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
              <CalendarDays className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className={`text-2xl font-bold ${pendingQueue.length > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {pendingQueue.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">awaiting Stage 1</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600">Team Calendar</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <CalendarDays className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-bold text-slate-900">{calendarEvents.length}</span>
            <span className="text-xs text-slate-500 font-medium">scheduled leaves</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600">My Annual Quota</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] text-[#B45309] flex items-center justify-center border border-[#F2E4B8]">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-bold text-slate-900">
              {ownAnnualBalance ? Number(ownAnnualBalance.remaining_days) : 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              / {ownAnnualBalance ? Number(ownAnnualBalance.total_days) : 0} days left
            </span>
          </div>
        </div>
      </div>

      {/* 3. Stage 1 Team Pending Approvals */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
              <span>Stage 1 Team Leave Approval Queue ({pendingQueue.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Approve direct reports to forward to HR for final approval, or reject to stop at Stage 1.
            </p>
          </div>
        </div>

        {pendingQueue.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {pendingQueue.map((req) => (
              <div
                key={req.id}
                data-testid={`manager-pending-leave-${req.id}`}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{req.employeeName}</span>
                    <span className="text-xs font-mono text-slate-500">({req.employeeStaffId})</span>
                    <StatusPill status="pending" label={req.leaveType} size="sm" />
                    <span className="text-xs font-medium text-slate-700 tabular-nums">
                      {req.totalDays} days ({req.startDate} to {req.endDate})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong className="font-semibold text-slate-800">Reason:</strong> {req.reason}
                  </p>
                  <input
                    type="text"
                    aria-label={`Review note for ${req.employeeName}`}
                    value={reviewComments[req.id] || ''}
                    onChange={(e) =>
                      setReviewComments((prev) => ({ ...prev, [req.id]: e.target.value }))
                    }
                    placeholder="Optional comment for employee & HR..."
                    className="mt-1 w-full max-w-md px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083E34] focus:ring-2 focus:ring-[#083E34]/15"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleManagerReject(req)}
                    disabled={processingId === req.id}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleManagerApprove(req)}
                    disabled={processingId === req.id}
                    className="px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 hover:bg-[#C59B27] font-semibold text-xs shadow-2xs flex items-center gap-1.5 transition cursor-pointer border border-[#C59B27] disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-slate-950" aria-hidden="true" />
                    <span>Approve &amp; Forward to HR</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center space-y-1.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" aria-hidden="true" />
            <h3 className="text-xs font-semibold text-slate-900">No Pending Team Leave Approvals</h3>
            <p className="text-xs text-slate-500">
              All leave requests submitted by your direct reports have been processed.
            </p>
          </div>
        )}
      </div>

      {/* 3b. Team Resignations Awaiting Manager Forward to HR */}
      {teamExits.filter((ex) => ex.status === 'SUBMITTED').length > 0 && (
        <div
          data-testid="manager-pending-resignations"
          className="bg-white rounded-xl border border-amber-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/40 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <LogOut className="w-4 h-4 text-amber-700" />
                <span>
                  Team Resignations Awaiting Manager Endorsement (
                  {teamExits.filter((ex) => ex.status === 'SUBMITTED').length})
                </span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Review handover plans and forward direct reports&apos; resignations to HR for notice verification and exit interview scheduling.
              </p>
            </div>
            <button
              onClick={() => onNavigate('offboarding')}
              className="text-xs font-semibold text-[#083E34] hover:text-[#062E27] flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>All Offboarding</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {teamExits
              .filter((ex) => ex.status === 'SUBMITTED')
              .map((exitReq) => (
                <div
                  key={exitReq.id}
                  data-testid={`manager-pending-exit-${exitReq.id}`}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">{exitReq.employeeName}</span>
                      <span className="text-xs font-mono text-slate-500">{exitReq.staffId}</span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/70">
                        Last Day: {exitReq.proposedLastDay} ({exitReq.noticePeriodDays}d notice)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong className="font-semibold text-slate-800">Reason:</strong> {exitReq.reason}
                    </p>
                    <input
                      type="text"
                      value={exitComments[exitReq.id] || ''}
                      onChange={(e) =>
                        setExitComments((prev) => ({ ...prev, [exitReq.id]: e.target.value }))
                      }
                      placeholder="Manager handover notes for HR..."
                      className="mt-1 w-full max-w-md px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083E34]"
                    />
                  </div>
                  <button
                    onClick={() => handleForwardResignationToHr(exitReq)}
                    disabled={processingId === exitReq.id}
                    data-testid={`manager-forward-exit-btn-${exitReq.id}`}
                    className="px-4 py-2 rounded-lg bg-[#083E34] text-white hover:bg-[#062E27] font-semibold text-xs shadow-2xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Forward Resignation to HR</span>
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 4. Team Leave Calendar & Direct Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
                <span>Team Leave Calendar</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upcoming and active leaves across your reporting line.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="text-xs font-semibold text-[#083E34] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Calendar</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {calendarEvents.length > 0 ? (
              calendarEvents.map((ev) => (
                <div
                  key={String(ev.id)}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900 block">{ev.employeeName}</span>
                    <span className="text-[11px] text-slate-600 tabular-nums">
                      {ev.leaveType} · {ev.startDate} → {ev.endDate} ({ev.totalDays}d)
                    </span>
                  </div>
                  <StatusPill
                    status={ev.status === 'Approved' ? 'confirmed' : 'pending'}
                    label={ev.status}
                    size="sm"
                  />
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 p-6 text-center">
                No scheduled leaves for your team in this window.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
                <span>Direct Reports ({directReports.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Employees reporting directly to you — review info, set KPI goals, or conduct appraisals.
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

          <div className="divide-y divide-slate-100">
            {directReports.length > 0 ? (
              directReports.map((member) => (
                <div
                  key={member.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900 block">{member.fullName}</span>
                    <span className="text-[11px] text-slate-500">
                      {member.jobTitle} · {member.departmentName}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 p-6 text-center">
                No direct reports assigned yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentHeadDashboard;
