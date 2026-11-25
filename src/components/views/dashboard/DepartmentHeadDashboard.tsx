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
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useRealtimeTable } from '../../../hooks/useRealtimeTable';
import { NavModule } from '../../layout/Sidebar';
import { leaveRepository, employeeRepository, auditRepository } from '../../../services';
import {
  LeaveRequest,
  LeaveBalanceRecord,
  TeamCalendarLeaveEvent,
  EmployeeHierarchy,
  Employee,
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
  const [myBalances, setMyBalances] = useState<LeaveBalanceRecord[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<TeamCalendarLeaveEvent[]>([]);
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const actorEmployeeId = String(currentUser.employeeId || currentUser.id || '');

  const loadData = useCallback(async () => {
    try {
      const [hierData, allEmps, allLeaves, balData, calData] = await Promise.all([
        actorEmployeeId
          ? employeeRepository.getHierarchy(actorEmployeeId).catch(() => null)
          : Promise.resolve(null),
        employeeRepository.getAll().catch(() => [] as Employee[]),
        leaveRepository.getAll().catch(() => [] as LeaveRequest[]),
        leaveRepository.getBalances().catch(() => [] as LeaveBalanceRecord[]),
        leaveRepository.getTeamCalendar().catch(() => [] as TeamCalendarLeaveEvent[]),
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
          if (e.id === actorEmployeeId) return false;
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

      setDirectReports(reports);
      setMyBalances(balData);
      setCalendarEvents(calData);

      const reportIdSet = new Set(reports.map((r) => String(r.id)));
      const reportStaffSet = new Set(reports.map((r) => r.staffId));
      const filteredLeaves = allLeaves.filter((l) => {
        if (actorEmployeeId && String(l.employeeId) === actorEmployeeId) return false;
        return (
          reportIdSet.has(String(l.employeeId)) ||
          (l.employeeStaffId && reportStaffSet.has(l.employeeStaffId)) ||
          (actorEmployeeId && String(l.managerId || '') === actorEmployeeId)
        );
      });
      setTeamLeaves(filteredLeaves);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to load manager workspace.');
    }
  }, [actorEmployeeId, currentUser.name]);

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
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                Manager Workspace · Stage 1 Leave Approvals
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                {currentUser.entityName} · {currentUser.departmentName}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {currentUser.name} — Team &amp; Approval Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-[#083E34]" />
              <span>
                {currentUser.jobTitle} • Reports to:{' '}
                <strong className="text-slate-800">{supervisorName}</strong>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={onOpenLeaveModal}
              id="hod-apply-leave-btn"
              className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold text-xs shadow-xs transition flex items-center gap-2 active:scale-95 cursor-pointer min-h-[38px] border border-[#C59B27]"
            >
              <CalendarDays className="w-4 h-4 text-slate-950" />
              <span>Apply for Leave</span>
            </button>
            <button
              onClick={() => onNavigate('leave')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs border border-slate-200 transition flex items-center gap-2 cursor-pointer min-h-[38px]"
            >
              <span>All Team Requests</span>
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {actionFeedback && (
          <div className="mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {actionError && (
          <div className="mt-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* 2. Manager KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Direct Reports</span>
            <div className="w-8 h-8 rounded-xl bg-[#EBF5F2] text-[#083E34] flex items-center justify-center border border-[#A3D4C7]/50">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-extrabold text-[#083E34]">{directReports.length}</span>
            <span className="text-xs text-slate-500 font-semibold">reporting to you</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Pending Approvals</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-extrabold text-rose-600">{pendingQueue.length}</span>
            <span className="text-xs text-slate-500 font-semibold">awaiting Stage 1</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Team Calendar</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-extrabold text-[#083E34]">{calendarEvents.length}</span>
            <span className="text-xs text-slate-500 font-semibold">scheduled leaves</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">My Annual Quota</span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF5EB] text-[#B45309] flex items-center justify-center border border-[#F2E4B8]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-extrabold text-[#083E34]">
              {ownAnnualBalance ? Number(ownAnnualBalance.remaining_days) : 0}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              / {ownAnnualBalance ? Number(ownAnnualBalance.total_days) : 0} days left
            </span>
          </div>
        </div>
      </div>

      {/* 3. Stage 1 Team Pending Approvals */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#083E34]" />
              <span>Stage 1 Team Leave Approval Queue ({pendingQueue.length})</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
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
                    <span className="text-sm font-black text-slate-900">{req.employeeName}</span>
                    <span className="text-xs font-mono text-slate-500">({req.employeeStaffId})</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      {req.leaveType}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {req.totalDays} days ({req.startDate} to {req.endDate})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-800">Reason:</strong> {req.reason}
                  </p>
                  <input
                    type="text"
                    value={reviewComments[req.id] || ''}
                    onChange={(e) =>
                      setReviewComments((prev) => ({ ...prev, [req.id]: e.target.value }))
                    }
                    placeholder="Optional comment for employee & HR..."
                    className="mt-1 w-full max-w-md px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#083E34]"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleManagerReject(req)}
                    disabled={processingId === req.id}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleManagerApprove(req)}
                    disabled={processingId === req.id}
                    className="px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 hover:bg-[#C59B27] font-bold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer border border-[#C59B27] disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>Approve &amp; Forward to HR</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">No Pending Team Leave Approvals</h4>
            <p className="text-xs text-slate-500">
              All leave requests submitted by your direct reports have been processed.
            </p>
          </div>
        )}
      </div>

      {/* 4. Team Leave Calendar & Direct Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Calendar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#083E34]" />
                <span>Team Leave Calendar</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Upcoming and active leaves across your reporting line.
              </p>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-xs font-bold text-[#083E34] hover:text-amber-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Calendar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-2.5">
            {calendarEvents.length > 0 ? (
              calendarEvents.map((ev) => (
                <div
                  key={String(ev.id)}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{ev.employeeName}</span>
                    <span className="text-[11px] text-slate-600">
                      {ev.leaveType} · {ev.startDate} → {ev.endDate} ({ev.totalDays}d)
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ev.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {ev.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">
                No scheduled leaves for your team in this window.
              </p>
            )}
          </div>
        </div>

        {/* Direct Reports Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#083E34]" />
                <span>Direct Reports ({directReports.length})</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Employees reporting directly to you in the hierarchy.
              </p>
            </div>
            <button
              onClick={() => onNavigate('directory')}
              className="text-xs font-bold text-[#083E34] hover:text-amber-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Directory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {directReports.length > 0 ? (
              directReports.map((member) => (
                <div
                  key={member.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{member.fullName}</span>
                    <span className="text-[11px] text-slate-500">
                      {member.jobTitle} · {member.departmentName}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">{member.staffId}</span>
                </div>
              ))
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
