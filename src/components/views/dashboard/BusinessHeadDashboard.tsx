import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  CalendarDays,
  Check,
  X,
  ArrowUpRight,
  ShieldCheck,
  BarChart3,
  Eye,
  FileEdit,
  AlertCircle,
  Search,
  Send,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useRealtimeTable } from '../../../hooks/useRealtimeTable';
import { NavModule } from '../../layout/Sidebar';
import {
  leaveRepository,
  employeeRepository,
  organizationRepository,
  offboardingRepository,
  attendanceRepository,
  auditRepository,
} from '../../../services';
import { governanceRepository } from '../../../services/governanceRepository';
import { attendanceImportService } from '../../../features/attendance-import';
import {
  LeaveRequest,
  Employee,
  CitadelDepartment,
  ExitRequest,
  AttendanceRecord,
} from '../../../types';
import {
  isEntityMatchForUser,
  maskSensitiveEmployeeData,
} from '../../../utils/rbac';
import { classifyDailySummaryStatus } from '../../../utils/hrisHelpers';
import { EmployeeProfileModal } from '../../employee/EmployeeProfileModal';
import {
  createProfileChangeRequest,
  mapAppRoleToWorkbookRole,
  type ProfileChangeRequest,
} from '../../../domain/workbook';

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
  const [entityDepartments, setEntityDepartments] = useState<CitadelDepartment[]>([]);
  const [entityLeaves, setEntityLeaves] = useState<LeaveRequest[]>([]);
  const [entityExits, setEntityExits] = useState<ExitRequest[]>([]);
  const [entityChangeRequests, setEntityChangeRequests] = useState<ProfileChangeRequest[]>([]);
  const [attendanceRate, setAttendanceRate] = useState<{ pct: number | null; presentCount: number; sampleSize: number }>({
    pct: null,
    presentCount: 0,
    sampleSize: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [changeTargetEmp, setChangeTargetEmp] = useState<Employee | null>(null);
  const [proposedPhone, setProposedPhone] = useState('');
  const [proposedEmail, setProposedEmail] = useState('');
  const [proposedAddress, setProposedAddress] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);
  const [processingLeaveId, setProcessingLeaveId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const actorEmployeeId = String(currentUser.employeeId || currentUser.id || '');

  const loadData = useCallback(async () => {
    try {
      setActionError(null);
      const [allEmps, allDepts, allLeaves, allExits, recentLogs, allChangeReqs] = await Promise.all([
        employeeRepository.getAll({ entityId: currentUser.entityId || undefined }).catch(() => [] as Employee[]),
        organizationRepository.getDepartments().catch(() => [] as CitadelDepartment[]),
        leaveRepository.getAll().catch(() => [] as LeaveRequest[]),
        offboardingRepository.getAll().catch(() => [] as ExitRequest[]),
        attendanceRepository.getRecentLogs().catch(() => [] as AttendanceRecord[]),
        governanceRepository.listProfileChangeRequests().catch(() => [] as ProfileChangeRequest[]),
      ]);

      const scopedEmps = allEmps
        .filter((emp) => isEntityMatchForUser(currentUser, emp))
        .map((emp) => maskSensitiveEmployeeData(currentUser, emp));

      const scopedDepts = allDepts.filter((dept) => isEntityMatchForUser(currentUser, dept));
      const empIdSet = new Set(scopedEmps.map((e) => String(e.id)));
      const staffIdSet = new Set(scopedEmps.map((e) => (e.staffId || '').toLowerCase()).filter(Boolean));

      const scopedLeaves = allLeaves.filter((l) => {
        if (actorEmployeeId && String(l.employeeId) === actorEmployeeId) return false;
        return (
          isEntityMatchForUser(currentUser, l) ||
          empIdSet.has(String(l.employeeId)) ||
          (l.employeeStaffId && staffIdSet.has(l.employeeStaffId.toLowerCase()))
        );
      });

      const scopedExits = allExits.filter(
        (ex) =>
          empIdSet.has(String(ex.employeeId)) ||
          (ex.staffId && staffIdSet.has(ex.staffId.toLowerCase())) ||
          isEntityMatchForUser(currentUser, ex)
      );

      const scopedReqs = allChangeReqs.filter(
        (req) =>
          empIdSet.has(String(req.employeeId)) ||
          staffIdSet.has((req.employeeStaffId || '').toLowerCase())
      );

      // Compute live attendance adherence for entity staff from attendance logs or biometric snapshot
      const entityLogs = recentLogs.filter(
        (log) =>
          empIdSet.has(String(log.employeeId)) ||
          (log.employeeStaffId && staffIdSet.has(log.employeeStaffId.toLowerCase()))
      );

      if (entityLogs.length > 0) {
        const compliant = entityLogs.filter((l) => l.status === 'Present').length;
        setAttendanceRate({
          pct: Math.round((compliant / entityLogs.length) * 1000) / 10,
          presentCount: compliant,
          sampleSize: entityLogs.length,
        });
      } else if (!import.meta.env.PROD && scopedEmps.length > 0) {
        const bioSnap = attendanceImportService.getSnapshot(scopedEmps);
        if (bioSnap.summaries.length > 0) {
          const onTime = bioSnap.summaries.filter(
            (s) => classifyDailySummaryStatus(s).dashboardStatus === 'Present'
          ).length;
          setAttendanceRate({
            pct: Math.round((onTime / bioSnap.summaries.length) * 1000) / 10,
            presentCount: onTime,
            sampleSize: bioSnap.summaries.length,
          });
        } else {
          setAttendanceRate({ pct: null, presentCount: 0, sampleSize: 0 });
        }
      } else {
        setAttendanceRate({ pct: null, presentCount: 0, sampleSize: 0 });
      }

      setEntityEmployees(scopedEmps);
      setEntityDepartments(scopedDepts);
      setEntityLeaves(scopedLeaves);
      setEntityExits(scopedExits);
      setEntityChangeRequests(scopedReqs);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to load Business Head workspace.');
    }
  }, [actorEmployeeId, currentUser]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useRealtimeTable('employees', () => void loadData());
  useRealtimeTable('departments', () => void loadData());
  useRealtimeTable('leave_requests', () => void loadData());
  useRealtimeTable('offboarding_requests', () => void loadData());

  const pendingLeaveQueue = useMemo(
    () =>
      entityLeaves.filter(
        (l) => l.status === 'Pending Review' || l.status === 'Submitted'
      ),
    [entityLeaves]
  );

  const activeExitRequests = useMemo(
    () =>
      entityExits.filter(
        (ex) => ex.status === 'SUBMITTED' || ex.status === 'MANAGER_REVIEWED'
      ),
    [entityExits]
  );

  const pendingHrChangeRequests = useMemo(
    () => entityChangeRequests.filter((r) => r.status === 'PENDING_HR_APPROVAL'),
    [entityChangeRequests]
  );

  const filteredEntityEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entityEmployees;
    return entityEmployees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.staffId.toLowerCase().includes(q) ||
        (e.departmentName || '').toLowerCase().includes(q) ||
        (e.jobTitle || '').toLowerCase().includes(q)
    );
  }, [entityEmployees, searchQuery]);

  const handleLeaveEndorse = async (leave: LeaveRequest) => {
    setActionError(null);
    setProcessingLeaveId(leave.id);
    try {
      const comment = `Reviewed by Business Head (${currentUser.name}) for ${currentUser.entityName}.`;
      if (leave.status === 'Submitted') {
        await leaveRepository.updateStatus(leave.id, 'Pending Review', currentUser.name, comment);
      } else {
        await leaveRepository.updateStatus(leave.id, 'Approved', currentUser.name, comment);
      }
      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Leave Management',
        action: 'Business Head Reviewed Leave Request',
        recordAffectedId: leave.id,
        recordAffectedTitle: `${leave.leaveType} for ${leave.employeeName}`,
        previousValue: leave.status,
        newValue: leave.status === 'Submitted' ? 'Pending Review (HR)' : 'Approved',
        severity: 'Info',
      });
      setActionFeedback(`Reviewed leave request for ${leave.employeeName}.`);
      setTimeout(() => setActionFeedback(null), 4000);
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || 'Unable to process leave review.');
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleLeaveDecline = async (leave: LeaveRequest) => {
    setActionError(null);
    setProcessingLeaveId(leave.id);
    try {
      const reason = `Declined by Business Head (${currentUser.name}) based on entity operational needs.`;
      await leaveRepository.updateStatus(leave.id, 'Rejected', currentUser.name, reason);
      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Leave Management',
        action: 'Business Head Declined Leave Request',
        recordAffectedId: leave.id,
        recordAffectedTitle: `${leave.leaveType} for ${leave.employeeName}`,
        previousValue: leave.status,
        newValue: 'Rejected',
        severity: 'Warning',
      });
      setActionFeedback(`Declined leave request for ${leave.employeeName}.`);
      setTimeout(() => setActionFeedback(null), 4000);
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || 'Unable to decline leave request.');
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const openChangeModalForEmployee = (emp: Employee) => {
    setChangeTargetEmp(emp);
    setProposedPhone(emp.phone || '');
    setProposedEmail(emp.email || '');
    setProposedAddress(emp.address || '');
    setChangeReason('');
  };

  const handleSubmitPermittedChangeForHr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeTargetEmp || !changeReason.trim()) return;

    const proposed: Record<string, string> = {};
    if (proposedPhone.trim() && proposedPhone.trim() !== (changeTargetEmp.phone || '')) {
      proposed.phone = proposedPhone.trim();
    }
    if (proposedEmail.trim() && proposedEmail.trim() !== (changeTargetEmp.email || '')) {
      proposed.email = proposedEmail.trim();
    }
    if (proposedAddress.trim() && proposedAddress.trim() !== (changeTargetEmp.address || '')) {
      proposed.address = proposedAddress.trim();
    }

    if (Object.keys(proposed).length === 0) {
      setActionError('Modify at least one field before submitting a change request for HR approval.');
      return;
    }

    setIsSubmittingChange(true);
    setActionError(null);
    try {
      const request = createProfileChangeRequest({
        employee: changeTargetEmp,
        actorRole: mapAppRoleToWorkbookRole(currentRole),
        actorName: currentUser.name,
        proposedChanges: proposed,
        reason: changeReason.trim(),
      });

      await governanceRepository.createProfileChangeRequest(request);
      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Employee Governance',
        action: 'Business Head Submitted Staff Change for HR Approval',
        recordAffectedId: request.id,
        recordAffectedTitle: `${changeTargetEmp.fullName} (${Object.keys(proposed).join(', ')})`,
        previousValue: JSON.stringify(request.previousValues),
        newValue: JSON.stringify(request.proposedChanges),
        severity: 'Info',
      });

      setChangeTargetEmp(null);
      setActionFeedback(
        `Submitted proposed change for ${changeTargetEmp.fullName} to PCCM HR for formal approval.`
      );
      setTimeout(() => setActionFeedback(null), 5000);
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || 'Unable to submit change request for HR approval.');
    } finally {
      setIsSubmittingChange(false);
    }
  };

  const activeStaffCount = entityEmployees.filter(
    (e) => e.status === 'Active' || e.status === 'Confirmed'
  ).length;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="business-head-dashboard">
      {/* 1. Business Head Executive Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">
                Business Head · Entity Scoped
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-[#EFF6FF] text-[#174EA6] text-[11px] font-semibold border border-blue-200">
                {currentUser.entityName || 'Assigned Business Entity'}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {currentUser.entityName || 'Business Entity'} Executive Overview
            </h1>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              Executive: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.jobTitle}) · Strictly scoped to {currentUser.entityName || 'your assigned entity'}. Protected employee changes route to HR for approval.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onOpenLeaveModal}
              id="business-head-apply-leave-btn"
              className="px-3.5 py-2 rounded-xl bg-[#174EA6] hover:bg-[#0B1F3A] text-white font-semibold text-xs shadow-xs transition flex items-center gap-2 active:scale-95 cursor-pointer min-h-[38px]"
            >
              <CalendarDays className="w-4 h-4 text-white" />
              <span>Apply for Leave</span>
            </button>
            <button
              type="button"
              data-testid="business-head-reports-btn"
              onClick={() => onNavigate('reports')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs transition flex items-center gap-2 cursor-pointer min-h-[38px]"
            >
              <BarChart3 className="w-4 h-4 text-[#174EA6]" />
              <span>Entity HR Reports</span>
            </button>
          </div>
        </div>

        {actionFeedback && (
          <div role="status" className="mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {actionError && (
          <div role="alert" className="mt-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* 2. Live Entity KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Entity Workforce</span>
            <div className="w-8 h-8 rounded-xl bg-[#0B1F3A] text-white flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-black text-slate-900">{entityEmployees.length}</span>
            <span className="text-xs text-slate-500 font-bold">personnel in entity</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-2 font-medium">
            {activeStaffCount} active / confirmed staff
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Departments</span>
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#174EA6] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-black text-slate-900">{entityDepartments.length}</span>
            <span className="text-xs text-slate-500 font-bold">entity units</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-2 font-medium truncate">
            {entityDepartments.map((d) => d.name).join(', ') || 'No departments mapped'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Pending Requests</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-black text-slate-900">
              {pendingLeaveQueue.length + activeExitRequests.length}
            </span>
            <span className="text-xs text-slate-500 font-bold">open leave &amp; exit items</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            {pendingHrChangeRequests.length} change request(s) awaiting HR
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Entity Attendance</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl font-black text-slate-900">
              {attendanceRate.pct !== null ? `${attendanceRate.pct}%` : 'No Logs'}
            </span>
            <span className="text-xs text-slate-500 font-bold">
              {attendanceRate.sampleSize > 0 ? `(${attendanceRate.presentCount}/${attendanceRate.sampleSize})` : 'yet'}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-2 font-semibold">
            {attendanceRate.sampleSize > 0 ? 'Live shift adherence across entity' : 'Awaiting biometric / clock-in logs'}
          </p>
        </div>
      </div>

      {/* 3. Entity Leave & Offboarding Review Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#174EA6]" />
              <span>Entity Leave &amp; Exit Review Queue ({pendingLeaveQueue.length + activeExitRequests.length})</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Relevant leave and exit requests strictly within {currentUser.entityName}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('leave')}
            className="text-xs font-bold text-[#174EA6] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open Leave Module</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingLeaveQueue.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {pendingLeaveQueue.map((req) => (
              <div key={req.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-slate-900">{req.employeeName}</span>
                    <span className="text-xs font-mono text-slate-500">({req.employeeStaffId})</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      {req.leaveType}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {req.departmentName} · {req.totalDays} days ({req.startDate} to {req.endDate})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-800">Reason:</strong> {req.reason}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={processingLeaveId === req.id}
                    onClick={() => handleLeaveDecline(req)}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                  <button
                    type="button"
                    disabled={processingLeaveId === req.id}
                    onClick={() => handleLeaveEndorse(req)}
                    className="px-4 py-2 rounded-xl bg-[#174EA6] text-white hover:bg-[#0B1F3A] font-semibold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-white" />
                    <span>Endorse Request</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">All Entity Requests Reviewed</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are no open leave applications awaiting your review in {currentUser.entityName}.
            </p>
          </div>
        )}

        {activeExitRequests.length > 0 && (
          <div className="border-t border-slate-200 bg-amber-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5 text-amber-700" />
                <span>Entity Resignations / Exits in Progress ({activeExitRequests.length})</span>
              </span>
              <button
                type="button"
                onClick={() => onNavigate('offboarding')}
                className="text-xs font-bold text-[#174EA6] hover:underline cursor-pointer"
              >
                Review Offboarding →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {activeExitRequests.map((ex) => (
                <div key={ex.id} className="p-3 bg-white rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">{ex.employeeName} ({ex.staffId})</span>
                    <span className="text-[11px] text-slate-500">Last Day: {ex.proposedLastDay} · {ex.status.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Departmental Structures in Assigned Business Entity */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#174EA6]" />
              <span>Departmental Structures ({entityDepartments.length})</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Live departments, heads of department, and staff distribution within {currentUser.entityName}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('directory')}
            className="text-xs font-bold text-[#174EA6] hover:text-[#0B1F3A] flex items-center gap-1 cursor-pointer"
          >
            <span>Org Directory</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="business-head-departments-grid">
          {entityDepartments.map((dept) => {
            const deptStaff = entityEmployees.filter(
              (e) =>
                e.departmentId === dept.id ||
                (e.departmentName || '').toLowerCase() === dept.name.toLowerCase()
            );
            return (
              <div
                key={dept.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-xs truncate">{dept.name}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EFF6FF] text-[#174EA6] border border-blue-200 shrink-0">
                    {deptStaff.length} Staff
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <p>
                    <strong>HOD:</strong> {dept.headOfDepartmentName || dept.headOfDepartment || 'Assigned to Entity Lead'}
                  </p>
                  <p>
                    <strong>Code:</strong> <span className="font-mono">{dept.code}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Entity Employees & Permitted Change Requests for HR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#174EA6]" />
              <span>Entity Employees ({filteredEntityEmployees.length})</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Inspect authorised staff dossiers or submit permitted updates for HR approval.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entity staff..."
                aria-label="Search entity employees"
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#174EA6]"
              />
            </div>
            <button
              type="button"
              onClick={() => onNavigate('employees')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Full List
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredEntityEmployees.slice(0, 8).map((emp) => (
            <div
              key={emp.id}
              data-testid={`business-head-emp-row-${emp.staffId}`}
              className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition text-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900">{emp.fullName}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {emp.staffId}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {emp.status}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {emp.jobTitle} · {emp.departmentName}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedEmployee(emp)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#174EA6] text-slate-700 hover:text-[#174EA6] font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Dossier</span>
                </button>
                <button
                  type="button"
                  data-testid={`propose-change-${emp.staffId}`}
                  onClick={() => openChangeModalForEmployee(emp)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] hover:bg-blue-100 text-[#174EA6] border border-blue-200 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Propose Change (HR)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Dossier Modal */}
      <EmployeeProfileModal
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onNavigateLeave={() => {
          setSelectedEmployee(null);
          onNavigate('leave');
        }}
      />

      {/* Business Head Permitted Change Request Modal (routes to HR Approval) */}
      {changeTargetEmp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Submit Permitted Change for ${changeTargetEmp.fullName}`}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-5 py-4 bg-[#0B1F3A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Submit Change Request for HR Approval</h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {changeTargetEmp.fullName} ({changeTargetEmp.staffId})
                </p>
              </div>
              <button
                type="button"
                aria-label="Close change request modal"
                onClick={() => setChangeTargetEmp(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPermittedChangeForHr} className="p-5 space-y-3.5 text-xs">
              <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                Updates proposed by Business Heads enter the PCCM HR approval queue before updating authoritative personnel records.
              </p>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between gap-2">
                <span>Role: <strong className="text-slate-900">{changeTargetEmp.jobTitle}</strong></span>
                <span className="text-slate-500">{changeTargetEmp.departmentName}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Proposed Work Phone</label>
                <input
                  type="text"
                  value={proposedPhone}
                  onChange={(e) => setProposedPhone(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#174EA6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Proposed Corporate Email</label>
                <input
                  type="email"
                  value={proposedEmail}
                  onChange={(e) => setProposedEmail(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#174EA6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Proposed Office / Contact Address</label>
                <input
                  type="text"
                  value={proposedAddress}
                  onChange={(e) => setProposedAddress(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#174EA6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Justification for HR Review *</label>
                <textarea
                  rows={2}
                  required
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Explain the operational reason for this update..."
                  className="w-full p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#174EA6]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setChangeTargetEmp(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingChange}
                  data-testid="submit-business-head-change-btn"
                  className="px-4 py-2 rounded-lg bg-[#174EA6] text-white font-semibold hover:bg-[#0B1F3A] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingChange ? 'Submitting...' : 'Submit for HR Approval'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessHeadDashboard;
