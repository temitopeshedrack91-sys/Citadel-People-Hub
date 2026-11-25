import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Building2,
  Users,
  CheckCircle2,
  CalendarDays,
  Check,
  X,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useRealtimeTable } from '../../../hooks/useRealtimeTable';
import { NavModule } from '../../layout/Sidebar';
import { leaveRepository, employeeRepository, auditRepository } from '../../../services';
import { StatusPill } from '../../common/StatusPill';
import { LeaveRequest, Employee } from '../../../types';

interface BusinessHeadDashboardProps {
  onNavigate: (module: NavModule) => void;
  onOpenLeaveModal: () => void;
}

export const BusinessHeadDashboard: React.FC<BusinessHeadDashboardProps> = ({
  onNavigate,
  onOpenLeaveModal,
}) => {
  const { currentUser, currentRole } = useAuth();

  const [entityEmployees, setEntityEmployees] = useState<Employee[]>([]);
  const [executiveLeaves, setExecutiveLeaves] = useState<LeaveRequest[]>([]);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = null;
    }
    setActionError(null);
    try {
      const [allEmps, allLeaves] = await Promise.all([
        employeeRepository.getAll(
          currentUser.entityId ? { entityId: currentUser.entityId } : undefined
        ),
        leaveRepository.getAll(),
      ]);

      setEntityEmployees(allEmps);

      const empIds = new Set(allEmps.map((e) => String(e.id)));
      const selfId = String(currentUser.employeeId || currentUser.id || '');
      const entityLeaves = allLeaves.filter(
        (l) =>
          String(l.employeeId) !== selfId &&
          (empIds.has(String(l.employeeId)) || l.entityName === currentUser.entityName)
      );
      setExecutiveLeaves(entityLeaves);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to load divisional workspace.');
    }
  }, [currentUser.employeeId, currentUser.entityId, currentUser.entityName, currentUser.id]);

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
  useRealtimeTable('employees', scheduleReload);

  const handleExecutiveSignOff = async (leave: LeaveRequest) => {
    setActionError(null);
    setProcessingId(leave.id);
    try {
      const updated = await leaveRepository.updateStatus(
        leave.id,
        'Approved',
        currentUser.name,
        `Stage 1 divisional approval granted by ${currentUser.name}. Forwarded to HR for final validation.`
      );

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Leave Management',
        action: 'Divisional Leave Approval',
        recordAffectedId: leave.id,
        recordAffectedTitle: `${leave.leaveType} for ${leave.employeeName}`,
        previousValue: leave.status,
        newValue: updated.status,
        severity: 'Info',
      });

      setActionFeedback(`Approved ${leave.leaveType} for ${leave.employeeName}. Forwarded to HR.`);
      setTimeout(() => setActionFeedback(null), 4000);
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || 'Unable to approve request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleExecutiveDecline = async (leave: LeaveRequest) => {
    setActionError(null);
    setProcessingId(leave.id);
    try {
      await leaveRepository.updateStatus(
        leave.id,
        'Rejected',
        currentUser.name,
        `Request declined by divisional lead (${currentUser.name}).`
      );

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Leave Management',
        action: 'Divisional Leave Decline',
        recordAffectedId: leave.id,
        recordAffectedTitle: `${leave.leaveType} for ${leave.employeeName}`,
        previousValue: leave.status,
        newValue: 'Rejected',
        severity: 'Warning',
      });

      setActionFeedback(`Request for ${leave.employeeName} rejected.`);
      setTimeout(() => setActionFeedback(null), 4000);
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || 'Unable to reject request.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingExecutiveQueue = useMemo(
    () =>
      executiveLeaves.filter(
        (l) => l.status === 'Submitted' || l.status === 'Pending Review'
      ),
    [executiveLeaves]
  );

  const departmentBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; count: number; active: number }>();
    for (const emp of entityEmployees) {
      const dept = emp.departmentName || 'General';
      const entry = map.get(dept) || { name: dept, count: 0, active: 0 };
      entry.count += 1;
      if (emp.status === 'Active') entry.active += 1;
      map.set(dept, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [entityEmployees]);

  const approvedCount = executiveLeaves.filter((l) => l.status === 'Approved').length;

  return (
    <div className="space-y-5 animate-fade-in" data-testid="business-head-dashboard">
      {/* 1. Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span className="uppercase tracking-wider text-[#083E34]">Divisional Governance</span>
              <span aria-hidden="true">·</span>
              <span>{currentUser.entityName}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {currentUser.entityName} Leadership Overview
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {currentUser.name} ({currentUser.jobTitle}) · Real-time reporting scope across {departmentBreakdown.length} active units.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onOpenLeaveModal}
              id="business-head-apply-leave-btn"
              className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-semibold text-xs shadow-2xs transition flex items-center gap-2 cursor-pointer min-h-[38px] border border-[#C59B27]"
            >
              <CalendarDays className="w-4 h-4 text-slate-950" aria-hidden="true" />
              <span>Apply for Leave</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('directory')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition flex items-center gap-1.5 cursor-pointer min-h-[38px]"
            >
              <BarChart3 className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Division Directory</span>
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

      {/* 2. Live Divisional KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600">Scoped Headcount</span>
            <div className="w-8 h-8 rounded-lg bg-[#EBF5F2] text-[#083E34] flex items-center justify-center border border-[#A3D4C7]/50">
              <Users className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-bold text-slate-900">{entityEmployees.length}</span>
            <span className="text-xs text-slate-500 font-medium">staff in scope</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600">Departments</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <Building2 className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-bold text-slate-900">{departmentBreakdown.length}</span>
            <span className="text-xs text-slate-500 font-medium">active units</span>
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
            <span className={`text-2xl font-bold ${pendingExecutiveQueue.length > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {pendingExecutiveQueue.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">awaiting review</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600">Approved Leaves</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-bold text-slate-900">{approvedCount}</span>
            <span className="text-xs text-slate-500 font-medium">cleared requests</span>
          </div>
        </div>
      </div>

      {/* 3. Divisional Leave Approval Queue */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
              <span>Pending Divisional Leave Queue ({pendingExecutiveQueue.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Open leave requests within your supervised scope.
            </p>
          </div>
        </div>

        {pendingExecutiveQueue.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {pendingExecutiveQueue.map((req) => (
              <div
                key={req.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{req.employeeName}</span>
                    <span className="text-xs font-mono text-slate-500">({req.employeeStaffId})</span>
                    <StatusPill status="pending" label={req.leaveType} size="sm" />
                    <span className="text-xs font-medium text-slate-700 tabular-nums">
                      {req.departmentName} · {req.totalDays} days ({req.startDate} to {req.endDate})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong className="font-semibold text-slate-800">Reason:</strong> {req.reason}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={processingId === req.id}
                    onClick={() => handleExecutiveDecline(req)}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Decline</span>
                  </button>
                  <button
                    type="button"
                    disabled={processingId === req.id}
                    onClick={() => handleExecutiveSignOff(req)}
                    className="px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 hover:bg-[#C59B27] font-semibold text-xs shadow-2xs flex items-center gap-1.5 transition cursor-pointer border border-[#C59B27] disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-slate-950" aria-hidden="true" />
                    <span>Approve &amp; Forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center space-y-1.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" aria-hidden="true" />
            <h3 className="text-xs font-semibold text-slate-900">All Divisional Approvals Up to Date</h3>
            <p className="text-xs text-slate-500">
              No pending leave requests require review in your division right now.
            </p>
          </div>
        )}
      </div>

      {/* 4. Department Headcount Breakdown from Live Data */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
              <span>Departments Breakdown</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live headcount distribution across departments in your reporting line.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('directory')}
            className="text-xs font-semibold text-[#083E34] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Workforce</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {departmentBreakdown.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {departmentBreakdown.map((dept) => (
              <div
                key={dept.name}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 text-xs truncate">{dept.name}</span>
                  <StatusPill status="active" label="Active" size="sm" />
                </div>
                <div className="text-xs text-slate-600 tabular-nums flex items-center justify-between">
                  <span>Staff Count</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {dept.count} ({dept.active} active)
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-3">No department staff records loaded for this scope.</p>
        )}
      </div>
    </div>
  );
};

export default BusinessHeadDashboard;
