import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ShieldCheck,
  Download,
  X,
  MessageSquare,
  Ban,
  GitBranch,
} from 'lucide-react';
import {
  LeaveRequest,
  LeaveType,
  LeaveBalanceRecord,
  LeaveCategoryRecord,
  WorkflowStatus,
  Employee,
} from '../../types';
import { leaveRepository, employeeRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { isHrOrAdminUser, isManagerUser } from '../../utils/rbac';
import { ListDetailLayout, ListItem } from '../common/ListDetailLayout';
import { StatusPill } from '../common/StatusPill';
import { ProgressRing } from '../common/ProgressRing';

interface LeaveManagementViewProps {
  isApplyModalOpen?: boolean;
  onCloseApplyModal?: () => void;
}

const DEFAULT_LEAVE_TYPES: LeaveType[] = [
  'Annual Leave',
  'Casual Leave',
  'Sick Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Compassionate Leave',
  'Exam Leave',
];

const isStageManager = (stage?: string | null): boolean =>
  stage === 'MANAGER' ||
  stage === 'LINE_MANAGER' ||
  stage === 'DEPARTMENT_HEAD' ||
  stage === 'BUSINESS_HEAD';

const formatStageLabel = (stage?: string | null): string => {
  if (!stage) return 'Review';
  if (isStageManager(stage)) return 'Stage 1 — Direct Supervisor';
  if (stage === 'HR') return 'Stage 2 — HR Final Review';
  if (stage === 'COMPLETE') return 'Completed';
  return stage;
};

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

export const LeaveManagementView: React.FC<LeaveManagementViewProps> = ({
  isApplyModalOpen = false,
  onCloseApplyModal,
}) => {
  const { currentUser, currentRole, isManager } = useAuth();

  const isHrOrAdmin = isHrOrAdminUser(currentUser);
  const hasManagerCapability = isManager || isManagerUser(currentUser);
  const currentActorId = String(currentUser.employeeId || currentUser.id || '');

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceRecord[]>([]);
  const [categories, setCategories] = useState<LeaveCategoryRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(isApplyModalOpen);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Form state
  const [leaveType, setLeaveType] = useState<LeaveType>('Annual Leave');
  const [startDate, setStartDate] = useState('2026-12-07');
  const [endDate, setEndDate] = useState('2026-12-11');
  const [daysRequested, setDaysRequested] = useState(5);
  const [reason, setReason] = useState('');
  const [handoverColleague, setHandoverColleague] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
      setDaysRequested(diffDays);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    setShowApplyModal(isApplyModalOpen);
    if (isApplyModalOpen) {
      setSubmitError(null);
    }
  }, [isApplyModalOpen]);

  const loadData = useCallback(async () => {
    const [reqData, balData, catData, empData] = await Promise.all([
      leaveRepository.getAll().catch(() => [] as LeaveRequest[]),
      leaveRepository.getBalances().catch(() => [] as LeaveBalanceRecord[]),
      leaveRepository.getCategories().catch(() => [] as LeaveCategoryRecord[]),
      employeeRepository.getAll().catch(() => [] as Employee[]),
    ]);
    setRequests(reqData);
    setBalances(balData);
    setCategories(catData);
    setEmployees(empData);

    setSelectedRequestId((prev) => {
      if (prev && reqData.some((r) => r.id === prev)) return prev;
      return reqData.length > 0 ? reqData[0].id : null;
    });
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useRealtimeTable('leave_requests', () => {
    void loadData();
  });

  useRealtimeTable('leave_balances', () => {
    void loadData();
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Resolve current employee's Phase 1 supervisor directly from directory/user
  const selfEmployee = useMemo(
    () =>
      employees.find(
        (e) =>
          (currentUser.employeeId && e.id === currentUser.employeeId) ||
          (currentUser.id && e.id === currentUser.id) ||
          (currentUser.staffId && e.staffId === currentUser.staffId)
      ),
    [employees, currentUser]
  );

  const directSupervisorId = selfEmployee?.managerId || currentUser.managerId || '';
  const directSupervisorName = selfEmployee?.managerName || currentUser.managerName || '';

  const personalBalances = useMemo(() => {
    const own = balances.filter(
      (b) =>
        (currentActorId && String(b.employee_id) === currentActorId) ||
        (currentUser.staffId && b.employee?.staff_id === currentUser.staffId)
    );
    return own.length > 0 ? own : isHrOrAdmin ? [] : balances;
  }, [balances, currentActorId, currentUser.staffId, isHrOrAdmin]);

  const primaryAnnualBalance = useMemo(() => {
    const annual = personalBalances.find((b) =>
      (b.category?.name || '').toLowerCase().includes('annual')
    );
    return annual || personalBalances[0] || null;
  }, [personalBalances]);

  const gaugeTotal = primaryAnnualBalance ? Number(primaryAnnualBalance.total_days) || 0 : 20;
  const gaugeRemaining = primaryAnnualBalance
    ? Math.max(0, Number(primaryAnnualBalance.remaining_days) || 0)
    : 13;
  const gaugePct =
    gaugeTotal > 0 ? Math.min(100, Math.round((gaugeRemaining / gaugeTotal) * 100)) : 0;

  const categoryOptions = useMemo(() => {
    const names = categories.filter((c) => c.is_active !== false).map((c) => c.name as LeaveType);
    return names.length > 0 ? names : DEFAULT_LEAVE_TYPES;
  }, [categories]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!reason.trim()) {
      setSubmitError('Please provide a reason for your leave request.');
      return;
    }
    if (startDate > endDate) {
      setSubmitError('End date must be on or after the start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await leaveRepository.submitRequest({
        employeeId: currentUser.employeeId || currentUser.id,
        employeeName: currentUser.name,
        employeeStaffId: currentUser.staffId,
        departmentName: currentUser.departmentName,
        entityName: currentUser.entityName,
        leaveType,
        startDate,
        endDate,
        totalDays: daysRequested,
        daysRequested,
        managerId: directSupervisorId || undefined,
        managerName: directSupervisorName || undefined,
        reason: reason.trim(),
        handoverColleague: handoverColleague.trim() || undefined,
      });

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Leave Management',
        action: 'Submitted Leave Request',
        recordAffectedId: created.id,
        recordAffectedTitle: `${leaveType} for ${currentUser.name} (${daysRequested} days)`,
        previousValue: 'Draft',
        newValue: created.status,
        severity: 'Info',
      });

      setShowApplyModal(false);
      onCloseApplyModal?.();
      setReason('');
      setHandoverColleague('');
      await loadData();
      setSelectedRequestId(created.id);
      const routedTarget = created.managerName || directSupervisorName || 'HR Final Review';
      showToast(`Leave request submitted and routed to ${routedTarget}.`);
    } catch (err: any) {
      const msg = err?.message || 'Unable to submit leave request.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canActOnRequest = (req: LeaveRequest): { canAct: boolean; stageLabel: string; waitingReason?: string } => {
    const pending = isRequestPending(req.status);
    if (!pending) return { canAct: false, stageLabel: '' };

    const stage = req.approvalStage || (req.status === 'Pending Review' ? 'HR' : 'MANAGER');
    const isDirectSupervisor =
      Boolean(req.managerId && currentActorId && String(req.managerId) === currentActorId) ||
      Boolean(
        req.managerName &&
          currentUser.name &&
          req.managerName.toLowerCase().includes(currentUser.name.toLowerCase())
      );

    if (stage === 'HR') {
      if (isHrOrAdmin) {
        return { canAct: true, stageLabel: 'HR Final Approve' };
      }
      return {
        canAct: false,
        stageLabel: '',
        waitingReason: 'Stage 1 approved. Awaiting HR final decision.',
      };
    }

    if (isStageManager(stage)) {
      if (isDirectSupervisor || (hasManagerCapability && !isHrOrAdmin) || currentRole === 'ADMIN' || currentRole === 'SYSTEM_ADMIN') {
        return { canAct: true, stageLabel: 'Approve & Forward to HR' };
      }
      return {
        canAct: false,
        stageLabel: '',
        waitingReason: `Awaiting Stage 1 review by direct supervisor (${req.managerName || 'Assigned Manager'}) before HR final approval.`,
      };
    }

    return { canAct: false, stageLabel: '' };
  };

  const handleApprove = async (req: LeaveRequest) => {
    setActionError(null);
    setProcessingId(req.id);
    try {
      const stage = req.approvalStage || (req.status === 'Pending Review' ? 'HR' : 'MANAGER');
      const customNote = (reviewComments[req.id] || '').trim();
      const comments =
        customNote ||
        (stage === 'HR'
          ? `Final HR approval confirmed by ${currentUser.name}.`
          : `Stage 1 direct supervisor approval granted by ${currentUser.name}. Forwarded to HR.`);

      // Backend strictly expects 'Approved' and handles MANAGER -> HR -> COMPLETE state transitions
      const updated = await leaveRepository.updateStatus(
        req.id,
        'Approved',
        currentUser.name,
        comments
      );

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Leave Management',
        action: stage === 'HR' ? 'Approved Leave Request (HR)' : 'Approved Leave Request (Manager)',
        recordAffectedId: req.id,
        recordAffectedTitle: `Leave for ${req.employeeName}`,
        previousValue: req.status,
        newValue: updated.status,
        severity: 'Info',
      });

      setReviewComments((prev) => ({ ...prev, [req.id]: '' }));
      await loadData();
      showToast(
        updated.status === 'Pending Review'
          ? `Manager approved leave for ${req.employeeName}; forwarded to HR for final approval.`
          : `Leave request for ${req.employeeName} approved.`
      );
    } catch (err: any) {
      const msg = err?.message || 'Unable to approve leave request.';
      setActionError(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: LeaveRequest) => {
    setActionError(null);
    setProcessingId(req.id);
    try {
      const customNote = (reviewComments[req.id] || '').trim();
      const comments =
        customNote || `Rejected at ${formatStageLabel(req.approvalStage)} by ${currentUser.name}.`;

      const updated = await leaveRepository.updateStatus(
        req.id,
        'Rejected',
        currentUser.name,
        comments
      );

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Leave Management',
        action: 'Rejected Leave Request',
        recordAffectedId: req.id,
        recordAffectedTitle: `Leave for ${req.employeeName}`,
        previousValue: req.status,
        newValue: 'Rejected',
        severity: 'Warning',
      });

      setReviewComments((prev) => ({ ...prev, [req.id]: '' }));
      await loadData();
      showToast(
        `Leave request for ${req.employeeName} rejected at ${formatStageLabel(
          updated.stoppedAtStage || updated.approvalStage
        )}.`
      );
    } catch (err: any) {
      const msg = err?.message || 'Unable to reject leave request.';
      setActionError(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (req: LeaveRequest) => {
    setActionError(null);
    setProcessingId(req.id);
    try {
      await leaveRepository.updateStatus(
        req.id,
        'Cancelled',
        currentUser.name,
        'Cancelled by requester.'
      );
      await loadData();
      showToast(`Leave request #${req.id} cancelled.`);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to cancel leave request.');
    } finally {
      setProcessingId(null);
    }
  };

  const isRequestPending = (status: WorkflowStatus | string) =>
    status === 'Pending Review' || status === 'Submitted';

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (activeTab === 'pending' && !isRequestPending(r.status)) return false;
      if (activeTab === 'manager_stage' && !(isRequestPending(r.status) && isStageManager(r.approvalStage))) {
        return false;
      }
      if (activeTab === 'hr_stage' && !(isRequestPending(r.status) && r.approvalStage === 'HR')) {
        return false;
      }
      if (activeTab === 'approved' && r.status !== 'Approved') return false;
      if (activeTab === 'rejected' && r.status !== 'Rejected') return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.employeeName.toLowerCase().includes(q) ||
          r.leaveType.toLowerCase().includes(q) ||
          r.departmentName?.toLowerCase().includes(q) ||
          (r.employeeStaffId || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [requests, activeTab, search]);

  const filterTabs = [
    { id: 'all', label: 'All Requests', count: requests.length },
    {
      id: 'pending',
      label: 'In Progress',
      count: requests.filter((r) => isRequestPending(r.status)).length,
    },
    {
      id: 'manager_stage',
      label: 'Stage 1: Manager',
      count: requests.filter((r) => isRequestPending(r.status) && isStageManager(r.approvalStage)).length,
    },
    {
      id: 'hr_stage',
      label: 'Stage 2: HR',
      count: requests.filter((r) => isRequestPending(r.status) && r.approvalStage === 'HR').length,
    },
    {
      id: 'approved',
      label: 'Approved',
      count: requests.filter((r) => r.status === 'Approved').length,
    },
    {
      id: 'rejected',
      label: 'Rejected',
      count: requests.filter((r) => r.status === 'Rejected').length,
    },
  ];

  const listItems: ListItem<LeaveRequest>[] = filteredRequests.map((req) => ({
    id: req.id,
    title: req.employeeName,
    subtitle: `${req.leaveType} • ${req.totalDays || req.daysRequested} Days (${req.startDate} to ${req.endDate})`,
    timestamp: req.appliedDate || 'Recent',
    avatar: (
      <div className="w-10 h-10 rounded-full bg-[#083E34] text-white font-extrabold flex items-center justify-center text-xs shadow-xs shrink-0">
        {req.employeeName
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')}
      </div>
    ),
    badge: (
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusPill
          status={
            req.status === 'Approved'
              ? 'confirmed'
              : req.status === 'Rejected'
              ? 'rejected'
              : req.status === 'Cancelled'
              ? 'cancelled'
              : 'pending'
          }
          label={
            req.status === 'Rejected' && req.stoppedAtStage
              ? `Rejected (${req.stoppedAtStage})`
              : req.status
          }
          showDot
          size="sm"
        />
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
          {req.departmentName || 'Citadel'}
        </span>
      </div>
    ),
    data: req,
  }));

  const renderDetail = (item: ListItem<LeaveRequest>) => {
    const req = item.data;
    if (!req) return null;

    const isPending = isRequestPending(req.status);
    const { canAct, stageLabel, waitingReason } = canActOnRequest(req);
    const isRequester =
      (currentActorId && String(req.employeeId) === currentActorId) ||
      (currentUser.staffId && req.employeeStaffId === currentUser.staffId);

    const stoppedStage = req.stoppedAtStage || (req.status === 'Rejected' ? req.approvalStage : null);
    const rejectedAtManager =
      req.status === 'Rejected' && isStageManager(stoppedStage || req.approvalStage);
    const rejectedAtHr = req.status === 'Rejected' && stoppedStage === 'HR';
    const managerApproved =
      Boolean(req.managerActedAt && !rejectedAtManager) ||
      req.approvalStage === 'HR' ||
      req.approvalStage === 'COMPLETE' ||
      req.status === 'Approved';
    const hrApproved = req.status === 'Approved' || req.approvalStage === 'COMPLETE';
    const isProcessing = processingId === req.id;

    return (
      <div className="space-y-6 animate-fade-in" data-testid="leave-detail-panel">
        {/* Sticky Header with Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#083E34] text-white font-black text-xl flex items-center justify-center shadow-xs">
              {req.employeeName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {req.employeeName}
                </h3>
                <StatusPill
                  status={
                    req.status === 'Approved'
                      ? 'confirmed'
                      : req.status === 'Rejected'
                      ? 'rejected'
                      : req.status === 'Cancelled'
                      ? 'cancelled'
                      : 'pending'
                  }
                  label={req.status}
                  showDot
                  size="sm"
                />
              </div>
              <p className="text-xs font-bold text-[#083E34] mt-0.5">{req.leaveType}</p>
              <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                {req.employeeStaffId} • {req.departmentName} • {req.entityName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {canAct && (
              <>
                <button
                  onClick={() => handleReject(req)}
                  disabled={isProcessing}
                  data-testid="leave-reject-btn"
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Decline Request</span>
                </button>
                <button
                  onClick={() => handleApprove(req)}
                  disabled={isProcessing}
                  data-testid="leave-approve-btn"
                  className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-xs border border-[#C59B27] transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>{stageLabel}</span>
                </button>
              </>
            )}

            {isRequester && isPending && (
              <button
                onClick={() => handleCancel(req)}
                disabled={isProcessing}
                data-testid="leave-cancel-btn"
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Request</span>
              </button>
            )}
          </div>
        </div>

        {/* Review Comments & Feedback */}
        {actionError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
        )}

        {canAct && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="block text-[11px] font-bold text-slate-700">
              Reviewer Comment / Decision Note (Optional)
            </label>
            <input
              type="text"
              value={reviewComments[req.id] || ''}
              onChange={(e) =>
                setReviewComments((prev) => ({ ...prev, [req.id]: e.target.value }))
              }
              placeholder="Add operational handover notes or rejection reason..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#083E34]"
            />
          </div>
        )}

        {!canAct && waitingReason && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{waitingReason}</span>
          </div>
        )}

        {/* Rejection Stop Alert */}
        {req.status === 'Rejected' && (
          <div
            data-testid="leave-rejection-banner"
            className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1"
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Stopped at {formatStageLabel(stoppedStage)}</span>
            </div>
            {req.approverComments && (
              <p className="text-xs text-rose-800">Reason: {req.approverComments}</p>
            )}
          </div>
        )}

        {/* Two-Stage Approval Lifecycle Tracker */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#083E34]" />
              <span>Two-Stage Approval Workflow</span>
            </h4>
            <span className="text-[10px] font-mono text-slate-500 font-bold">
              Employee → Direct Supervisor ({req.managerName || 'None'}) → HR Final Approval
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Step 1: Submission */}
            <div className="p-3 rounded-lg border bg-emerald-50/70 border-emerald-200">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                <span>1. Submitted</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[10px] text-emerald-800 font-medium mt-1">
                {req.employeeName}
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5">{req.appliedDate}</p>
            </div>

            {/* Step 2: Stage 1 Direct Supervisor */}
            <div
              className={`p-3 rounded-lg border ${
                rejectedAtManager
                  ? 'bg-rose-50/80 border-rose-200'
                  : managerApproved
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-amber-50/70 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-900">
                <span>2. Stage 1: Manager</span>
                {rejectedAtManager ? (
                  <XCircle className="w-4 h-4 text-rose-600" />
                ) : managerApproved ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <p className="text-[10px] text-slate-700 font-medium mt-1">
                {req.managerActorName || req.managerName || 'Direct to HR (Top-Level)'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {rejectedAtManager
                  ? `Rejected ${req.managerActedAt ? `(${formatDateTime(req.managerActedAt)})` : ''}`
                  : req.managerActedAt
                  ? `Approved ${formatDateTime(req.managerActedAt)}`
                  : managerApproved
                  ? 'Cleared to HR'
                  : 'Awaiting Supervisor Action'}
              </p>
            </div>

            {/* Step 3: Stage 2 HR Final Approval */}
            <div
              className={`p-3 rounded-lg border ${
                rejectedAtHr
                  ? 'bg-rose-50/80 border-rose-200'
                  : hrApproved
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : req.approvalStage === 'HR' && isPending
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-900">
                <span>3. Stage 2: HR Final</span>
                {rejectedAtHr ? (
                  <XCircle className="w-4 h-4 text-rose-600" />
                ) : hrApproved ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : req.approvalStage === 'HR' && isPending ? (
                  <Clock className="w-4 h-4 text-amber-600" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <p className="text-[10px] text-slate-700 font-medium mt-1">
                {req.hrActorName || 'HR Review Desk'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {rejectedAtHr
                  ? `Rejected ${req.hrActedAt ? `(${formatDateTime(req.hrActedAt)})` : ''}`
                  : rejectedAtManager
                  ? 'Stopped at Stage 1'
                  : hrApproved
                  ? `Final Approved ${req.hrActedAt ? `(${formatDateTime(req.hrActedAt)})` : ''}`
                  : req.approvalStage === 'HR' && isPending
                  ? 'Awaiting HR Final Decision'
                  : 'Queued after Manager approval'}
              </p>
            </div>
          </div>

          {req.approvalHistory && req.approvalHistory.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Stage Action Log
              </span>
              {req.approvalHistory.map((entry, idx) => (
                <div
                  key={`${entry.stage}-${idx}`}
                  className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-slate-900">{entry.actor}</span>{' '}
                    <span className="text-slate-500">
                      ({entry.stage}) — {entry.decision || entry.status}
                    </span>
                    {entry.comments && (
                      <span className="block text-slate-600 mt-0.5">{entry.comments}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatDateTime(entry.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2-Column Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
              <span>Leave Application Dates</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Start Date:</span>
                <span className="font-bold text-slate-900">{req.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">End Date:</span>
                <span className="font-bold text-slate-900">{req.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Duration:</span>
                <span className="font-black text-[#083E34]">
                  {req.totalDays || req.daysRequested} Working Days
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Handover &amp; Coverage</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Designated Cover:</span>
                <span className="font-bold text-slate-900">
                  {req.handoverColleague || req.relievingStaffName || 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Direct Supervisor:</span>
                <span className="font-bold text-slate-800">
                  {req.managerName || 'Direct HR Route'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Current Stage:</span>
                <span className="font-bold text-slate-900">
                  {req.status === 'Rejected'
                    ? `Stopped at ${req.stoppedAtStage || req.approvalStage}`
                    : formatStageLabel(req.approvalStage)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reason for Leave */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Stated Justification &amp; Reason
          </h4>
          <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
            {req.reason}
          </p>
        </div>

        {/* Summary download */}
        <div className="space-y-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Leave Authorization Record</p>
                <span className="text-[10px] text-slate-500 font-medium">
                  Ref #{req.id} • {req.status}
                </span>
              </div>
            </div>
            <button
              onClick={() => showToast(`Exported leave summary for #${req.id}.`)}
              className="text-xs text-[#083E34] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0A1E3F] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-slide-up border border-blue-900/40">
          <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: Leave Balance & Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-8 space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#083E34] shrink-0" />
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                Leave Requests &amp; Two-Stage Approvals
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              {isHrOrAdmin
                ? 'HR oversees all leave requests across Stage 1 (Direct Supervisor) and Stage 2 (HR Final Approval).'
                : hasManagerCapability
                ? 'Review team leave requests awaiting Stage 1 Manager approval, and track your own leave balances.'
                : 'Submit leave requests to your direct supervisor, track two-stage approval progress, and monitor your balances.'}
            </p>
          </div>

          <div className="lg:col-span-4 flex items-center justify-start lg:justify-end gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <ProgressRing
                value={gaugePct}
                max={100}
                label={`${gaugePct}%`}
                subtext={`${gaugeRemaining} of ${gaugeTotal} days`}
                type="semicircle"
              />
            </div>
            {currentRole !== 'VIEWER' && (
              <button
                onClick={() => {
                  setSubmitError(null);
                  setShowApplyModal(true);
                }}
                data-testid="leave-apply-btn"
                className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-xs border border-[#C59B27] transition active:scale-[0.98] shrink-0 min-h-[40px] cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span className="font-bold">Apply for Leave</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Balance Breakdown */}
        {personalBalances.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            {personalBalances.map((bal) => (
              <div
                key={String(bal.id)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] flex items-center gap-2"
              >
                <span className="font-bold text-slate-800">{bal.category?.name || 'Leave'}:</span>
                <span className="font-mono font-bold text-[#083E34]">
                  {Number(bal.remaining_days)} / {Number(bal.total_days)} days left
                </span>
                {Number(bal.pending_days) > 0 && (
                  <span className="text-[10px] text-amber-700 font-semibold">
                    ({Number(bal.pending_days)} pending)
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ListDetailLayout<LeaveRequest>
        items={listItems}
        selectedId={selectedRequestId}
        onSelectItem={(item) => {
          setActionError(null);
          setSelectedRequestId(item.id);
        }}
        renderDetail={renderDetail}
        searchPlaceholder="Search requests by employee name, type, or department..."
        searchValue={search}
        onSearchChange={setSearch}
        filterTabs={filterTabs}
        activeFilterTab={activeTab}
        onFilterTabChange={setActiveTab}
      />

      {/* Apply for Leave Modal */}
      {showApplyModal && (
        <div
          data-testid="leave-apply-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="bg-[#0A1E3F] text-white p-5 relative border-b border-blue-900/30 shrink-0">
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  onCloseApplyModal?.();
                }}
                className="absolute top-4 right-4 text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#D4AF37]" />
                <span>Submit Leave Application</span>
              </h3>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Staff: {currentUser.name} ({currentUser.staffId}) • {currentUser.departmentName}
              </p>
            </div>

            <form onSubmit={handleApply} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {submitError && (
                <div
                  data-testid="leave-submit-error"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{submitError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-800 font-bold mb-1">Leave Category *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  data-testid="leave-type-select"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold focus:outline-none focus:border-[#083E34]"
                >
                  {categoryOptions.map((catName) => {
                    const matchBal = personalBalances.find(
                      (b) => (b.category?.name || '').toLowerCase() === catName.toLowerCase()
                    );
                    const suffix = matchBal
                      ? ` (${Number(matchBal.remaining_days)} / ${Number(matchBal.total_days)} days available)`
                      : '';
                    return (
                      <option key={catName} value={catName}>
                        {catName}
                        {suffix}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="leave-start-date"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-[#083E34]"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="leave-end-date"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-[#083E34]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <span className="font-bold text-[#083E34] flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5" />
                  Approval Route (From Phase 1 Reporting Hierarchy)
                </span>
                <p className="text-[11px] text-slate-700">
                  {directSupervisorName
                    ? `Stage 1: ${directSupervisorName} (Direct Supervisor) → Stage 2: HR Final Approval`
                    : 'No direct supervisor assigned — routes directly to HR Final Approval.'}
                </p>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Handover Colleague (Optional)
                </label>
                <input
                  type="text"
                  value={handoverColleague}
                  onChange={(e) => setHandoverColleague(e.target.value)}
                  placeholder="Colleague who will cover responsibilities"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-[#083E34]"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Reason for Leave *</label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please state details regarding your leave request..."
                  data-testid="leave-reason-input"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-[#083E34]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplyModal(false);
                    onCloseApplyModal?.();
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="leave-submit-btn"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : `Submit (${daysRequested} day${daysRequested === 1 ? '' : 's'})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagementView;
