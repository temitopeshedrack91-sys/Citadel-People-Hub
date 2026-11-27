import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Clock,
  Eye,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useRealtimeTable } from '../../../hooks/useRealtimeTable';
import { NavModule } from '../../layout/Sidebar';
import {
  leaveRepository,
  employeeRepository,
  auditRepository,
  offboardingRepository,
  performanceRepository,
  attendanceRepository,
} from '../../../services';
import { attendanceImportService } from '../../../features/attendance-import';
import { maskSensitiveEmployeeData } from '../../../utils/rbac';
import { classifyDailySummaryStatus } from '../../../utils/hrisHelpers';
import { EmployeeProfileModal } from '../../employee/EmployeeProfileModal';
import {
  LeaveRequest,
  LeaveBalanceRecord,
  TeamCalendarLeaveEvent,
  EmployeeHierarchy,
  Employee,
  ExitRequest,
  PerformanceReview,
  AttendanceRecord,
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
  const [selectedReport, setSelectedReport] = useState<Employee | null>(null);
  const [teamAttendanceStats, setTeamAttendanceStats] = useState<{
    onTime: number;
    late: number;
    total: number;
    recentLogs: { name: string; staffId: string; status: string; checkIn: string }[];
  }>({ onTime: 0, late: 0, total: 0, recentLogs: [] });

  const actorEmployeeId = String(currentUser.employeeId || currentUser.id || '');

  const loadData = useCallback(async () => {
    try {
      const [hierData, allEmps, allLeaves, balData, calData, allExits, allReviews, recentAttLogs] =
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
          attendanceRepository.getRecentLogs().catch(() => [] as AttendanceRecord[]),
        ]);

      setHierarchy(hierData);

      // Prefer Phase 1 hierarchy downward direct reports, fall back to managerId/name match
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
          if (
            userNameLower &&
            (e.managerName || '').toLowerCase().includes(userNameLower)
          ) {
            return true;
          }
          return false;
        });
      }

      const maskedReports = reports.map((r) => maskSensitiveEmployeeData(currentUser, r));
      setDirectReports(maskedReports);
      setMyBalances(balData);

      const reportIdSet = new Set(maskedReports.map((r) => String(r.id)));
      const reportStaffSet = new Set(maskedReports.map((r) => r.staffId));
      const userDeptLower = (currentUser.departmentName || '').trim().toLowerCase();
      const deptTeamEmps = allEmps.filter(
        (e) =>
          reportIdSet.has(String(e.id)) ||
          (currentUser.departmentId && e.departmentId === currentUser.departmentId) ||
          (userDeptLower && (e.departmentName || '').trim().toLowerCase() === userDeptLower)
      );
      const teamIdSet = new Set(deptTeamEmps.map((e) => String(e.id)));
      const teamStaffSet = new Set(deptTeamEmps.map((e) => e.staffId.toLowerCase()));
      const teamNameSet = new Set(deptTeamEmps.map((e) => e.fullName.toLowerCase()));

      const scopedCalendar = calData.filter(
        (ev) =>
          (ev.employeeId && teamIdSet.has(String(ev.employeeId))) ||
          (ev.employeeName && teamNameSet.has(ev.employeeName.toLowerCase())) ||
          (userDeptLower && (ev.departmentName || '').trim().toLowerCase() === userDeptLower)
      );
      setCalendarEvents(scopedCalendar);

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

      // Team attendance logs from repository or biometric snapshot (direct reports + department team)
      const scopedAttLogs = recentAttLogs.filter(
        (log) =>
          teamIdSet.has(String(log.employeeId)) ||
          (log.employeeStaffId && teamStaffSet.has(log.employeeStaffId.toLowerCase())) ||
          (userDeptLower && (log.departmentName || '').trim().toLowerCase() === userDeptLower)
      );

      if (scopedAttLogs.length > 0) {
        setTeamAttendanceStats({
          onTime: scopedAttLogs.filter((l) => l.status === 'Present').length,
          late: scopedAttLogs.filter((l) => l.status === 'Late').length,
          total: scopedAttLogs.length,
          recentLogs: scopedAttLogs.slice(0, 4).map((l) => ({
            name: l.employeeName,
            staffId: l.employeeStaffId || '',
            status: l.status,
            checkIn: l.clockInTime || l.date,
          })),
        });
      } else if (!import.meta.env.PROD && deptTeamEmps.length > 0) {
        const snap = attendanceImportService.getSnapshot(deptTeamEmps);
        const presentCount = snap.summaries.filter(
          (s) => classifyDailySummaryStatus(s).dashboardStatus === 'Present'
        ).length;
        setTeamAttendanceStats({
          onTime: presentCount,
          late: snap.summaries.length - presentCount,
          total: snap.summaries.length,
          recentLogs: snap.summaries.slice(0, 4).map((s) => ({
            name: s.employeeName,
            staffId: s.employeeStaffId,
            status: classifyDailySummaryStatus(s).dashboardStatus,
            checkIn: s.clockInTime || s.date,
          })),
        });
      } else {
        setTeamAttendanceStats({ onTime: 0, late: 0, total: 0, recentLogs: [] });
      }
    } catch (err: any) {
      setActionError(err?.message || 'Unable to load manager workspace.');
    }
  }, [actorEmployeeId, currentUser]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useRealtimeTable('leave_requests', () => {
    void loadData();
  });

  useRealtimeTable('leave_balances', () => {
    void loadData();
  });

  useRealtimeTable('employees', () => {
    void loadData();
  });

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
        (l) =>
          l.status === 'Submitted' &&
          isStageManager(l.approvalStage || 'MANAGER')
      ),
    [teamLeaves]
  );

  const ownAnnualBalance = useMemo(() => {
    const own = myBalances.filter(
      (b) =>
        (actorEmployeeId && String(b.employee_id) === actorEmployeeId) ||
        (currentUser.staffId && b.employee?.staff_id === currentUser.staffId)
    );
    return (
      own.find((b) => (b.category?.name || '').toLowerCase().includes('annual')) || own[0] || null
    );
  }, [actorEmployeeId, currentUser.staffId, myBalances]);

  const supervisorName =
    hierarchy?.supervisorChain?.[0]?.fullName ||
    currentUser.managerName ||
    'Executive Leadership (Direct to HR)';

  return (
    <div className="space-y-6 animate-fade-in" data-testid="manager-dashboard">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Manager Workspace · {currentUser.entityName} · {currentUser.departmentName}
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-[#083E34] shrink-0" />
              <span>
                {currentUser.jobTitle} · Reports to:{' '}
                <strong className="font-semibold text-slate-800">{supervisorName}</strong>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={onOpenLeaveModal}
              id="hod-apply-leave-btn"
              className="px-4 py-2 rounded-lg bg-[#083E34] hover:bg-[#062E27] text-white font-semibold text-xs shadow-2xs transition flex items-center gap-2 active:scale-[0.98] cursor-pointer min-h-[38px]"
            >
              <CalendarDays className="w-4 h-4 text-white" />
              <span>Apply for Leave</span>
            </button>
            <button
              onClick={() => onNavigate('reports')}
              data-testid="manager-team-reports-btn"
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition flex items-center gap-1.5 cursor-pointer min-h-[38px]"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#083E34]" />
              <span>Team Reports</span>
            </button>
            <button
              onClick={() => onNavigate('leave')}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition flex items-center gap-1.5 cursor-pointer min-h-[38px]"
            >
              <span>All Team Requests</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {actionFeedback && (
          <div className="mt-4 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {actionError && (
          <div className="mt-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* 2. Manager KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Direct Reports</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="font-display text-2xl font-bold text-slate-900">{directReports.length}</span>
            <span className="text-xs text-slate-500">reporting to you</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pending Approvals</span>
            <CalendarDays className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="font-display text-2xl font-bold text-rose-600">{pendingQueue.length}</span>
            <span className="text-xs text-slate-500">awaiting Stage 1</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Team Calendar</span>
            <CalendarDays className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="font-display text-2xl font-bold text-slate-900">{calendarEvents.length}</span>
            <span className="text-xs text-slate-500">scheduled leaves</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">My Annual Quota</span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="font-display text-2xl font-bold text-slate-900">
              {ownAnnualBalance ? Number(ownAnnualBalance.remaining_days) : 0}
            </span>
            <span className="text-xs text-slate-500">
              / {ownAnnualBalance ? Number(ownAnnualBalance.total_days) : 0} days left
            </span>
          </div>
        </div>
      </div>

      {/* 3. Stage 1 Team Pending Approvals */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#083E34]" />
              <span>Stage 1 Team Leave Approval Queue ({pendingQueue.length})</span>
            </h3>
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
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{req.employeeName}</span>
                    <span className="text-xs font-mono text-slate-500">{req.employeeStaffId}</span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/70">
                      {req.leaveType}
                    </span>
                    <span className="text-xs font-medium text-slate-700 tabular-nums">
                      {req.totalDays} days ({req.startDate} to {req.endDate})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong className="font-semibold text-slate-800">Reason:</strong> {req.reason}
                  </p>
                  <input
                    type="text"
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
                    onClick={() => handleManagerReject(req)}
                    disabled={processingId === req.id}
                    className="px-3.5 py-2 rounded-lg border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleManagerApprove(req)}
                    disabled={processingId === req.id}
                    className="px-4 py-2 rounded-lg bg-[#083E34] text-white hover:bg-[#062E27] font-semibold text-xs shadow-2xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Approve &amp; Forward to HR</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-1.5">
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-900">No Pending Team Leave Approvals</h4>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Calendar */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#083E34]" />
                <span>Team Leave Calendar</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upcoming and active leaves across your reporting line.
              </p>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-xs font-semibold text-[#083E34] hover:text-[#062E27] flex items-center gap-1 cursor-pointer"
            >
              <span>Full Calendar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {calendarEvents.length > 0 ? (
              calendarEvents.map((ev) => (
                <div
                  key={String(ev.id)}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 block truncate">{ev.employeeName}</span>
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {ev.leaveType} · {ev.startDate} → {ev.endDate} ({ev.totalDays}d)
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0 ${
                      ev.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                        : 'bg-amber-50 text-amber-800 border border-amber-200/70'
                    }`}
                  >
                    {ev.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 p-6 text-center">
                No scheduled leaves for your team in this window.
              </p>
            )}
          </div>
        </div>

        {/* Direct Reports Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#083E34]" />
                <span>Direct Reports &amp; Team Activities ({directReports.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Employees reporting directly to you — review info, set KPI goals, or conduct appraisals.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigate('performance')}
                data-testid="manager-team-performance-btn"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-[#083E34] hover:bg-emerald-100 border border-emerald-200/70 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Goals &amp; Appraisals</span>
              </button>
              <button
                onClick={() => onNavigate('directory')}
                className="text-xs font-semibold text-[#083E34] hover:text-[#062E27] flex items-center gap-1 cursor-pointer"
              >
                <span>Directory</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {directReports.length > 0 ? (
              directReports.map((member) => {
                const latestReview = teamReviews.find(
                  (r) => String(r.employeeId) === String(member.id)
                );
                return (
                  <div
                    key={member.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 truncate">{member.fullName}</span>
                        <span className="font-mono text-[10px] text-slate-500">{member.staffId}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 truncate block">
                        {member.jobTitle} · {member.departmentName}
                      </span>
                      {member.email && (
                        <span className="text-[10px] text-slate-400 truncate block">
                          {member.email} {member.phone ? `· ${member.phone}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {latestReview?.finalRating ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                          KPI: {Number(latestReview.finalRating).toFixed(2)}/5
                        </span>
                      ) : null}
                      <button
                        type="button"
                        data-testid={`manager-dossier-btn-${member.staffId}`}
                        onClick={() => setSelectedReport(member)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:border-[#083E34] hover:text-[#083E34] cursor-pointer transition flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Dossier</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('performance')}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:border-[#083E34] hover:text-[#083E34] cursor-pointer transition"
                      >
                        Appraise
                      </button>
                    </div>
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

      {/* 5. Team Attendance Monitoring Card */}
      <div
        data-testid="manager-team-attendance-card"
        className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#083E34]" />
              <span>Team Attendance Monitoring ({teamAttendanceStats.total} logs)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Punctuality and check-in status across your direct reports and department team.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            data-testid="manager-team-attendance-btn"
            className="text-xs font-semibold text-[#083E34] hover:text-[#062E27] flex items-center gap-1 cursor-pointer"
          >
            <span>Monitor Team Attendance</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 text-xs">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/70">
            <span className="text-[10px] font-bold uppercase text-emerald-700 block">On Time / Present</span>
            <span className="text-xl font-black text-emerald-900 tabular-nums">{teamAttendanceStats.onTime}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/70">
            <span className="text-[10px] font-bold uppercase text-amber-700 block">Late Check-Ins</span>
            <span className="text-xl font-black text-amber-900 tabular-nums">{teamAttendanceStats.late}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase text-slate-600 block">Tracked Team Logs</span>
            <span className="text-xl font-black text-slate-900 tabular-nums">{teamAttendanceStats.total}</span>
          </div>
        </div>

        {teamAttendanceStats.recentLogs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {teamAttendanceStats.recentLogs.map((log, idx) => (
              <div key={`${log.staffId}-${idx}`} className="px-5 py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-900">{log.name}</span>
                  {log.staffId && <span className="ml-2 font-mono text-[10px] text-slate-500">{log.staffId}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-600">{log.checkIn}</span>
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
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 p-5 text-center">
            No team attendance clock-ins recorded yet. Open Attendance to review timesheets or biometric logs.
          </p>
        )}
      </div>

      {/* Direct Report Dossier Modal (Sensitive payroll fields automatically masked) */}
      <EmployeeProfileModal
        employee={selectedReport}
        onClose={() => setSelectedReport(null)}
        onNavigateLeave={() => {
          setSelectedReport(null);
          onNavigate('leave');
        }}
      />
    </div>
  );
};

export default DepartmentHeadDashboard;
