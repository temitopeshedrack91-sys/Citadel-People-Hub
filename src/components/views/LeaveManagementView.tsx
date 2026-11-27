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
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (startDate && endDate) {
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const [ey, em, ed] = endDate.split('-').map(Number);
      if (sy && sm && sd && ey && em && ed) {
        const startUtc = Date.UTC(sy, sm - 1, sd);
        const endUtc = Date.UTC(ey, em - 1, ed);
        const diffDays = Math.max(1, Math.round((endUtc - startUtc) / 86400000) + 1);
        setDaysRequested(diffDays);
      }
    }
  }, [startDate, endDate]);

  useEffect(() => {
    setShowApplyModal(isApplyModalOpen);
    if (isApplyModalOpen) {
      setSubmitError(null);
    }
  }, [isApplyModalOpen]);

  const reloadTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = null;
    }
    try {
      const [reqData, balData, catData, empData] = await Promise.all([
        leaveRepository.getAll(),
        leaveRepository.getBalances(currentActorId || undefined).catch(() => [] as LeaveBalanceRecord[]),
        leaveRepository.getCategories().catch(() => [] as LeaveCategoryRecord[]),
        employeeRepository.getAll().catch(() => [] as Employee[]),
      ]);
      setRequests(reqData);
      setBalances(balData);
      setCategories(catData);
      setEmployees(empData);

      setSelectedRequestId((prev) => {
        if (prev && reqData.some((r) => String(r.id) === String(prev))) return String(prev);
        return reqData.length > 0 ? String(reqData[0].id) : null;
      });
    } catch (err: any) {
      setActionError(err?.message || 'Unable to load leave requests.');
    }
  }, []);

  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
    }
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

  useRealtimeTable('leave_requests', () => {
    scheduleReload();
  });

  useRealtimeTable('leave_balances', () => {
    scheduleReload();
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
          (currentUser.employeeId && String(e.id) === String(currentUser.employeeId)) ||
          (currentUser.id && String(e.id) === String(currentUser.id)) ||
          (currentUser.staffId && e.staffId === currentUser.staffId)
      ),
    [employees, currentUser]
  );

  const directSupervisorId = selfEmployee?.managerId || currentUser.managerId || '';
  const directSupervisorName = selfEmployee?.managerName || currentUser.managerName || '';

  const availableManagers = useMemo(
    () =>
      employees.filter(
        (e) =>
          String(e.id) !== String(currentActorId) &&
          (!currentUser.staffId || e.staffId !== currentUser.staffId)
      ),
    [employees, currentActorId, currentUser.staffId]
  );

  // Sync default selected manager to direct supervisor when modal opens
  useEffect(() => {
    if (showApplyModal && !selectedManagerId && directSupervisorId) {
      setSelectedManagerId(String(directSupervisorId));
    }
  }, [showApplyModal, directSupervisorId, selectedManagerId]);

  const effectiveManager = useMemo(() => {
    if (selectedManagerId) {
      return availableManagers.find((m) => String(m.id) === String(selectedManagerId)) || null;
    }
    return null;
  }, [selectedManagerId, availableManagers]);

  const effectiveManagerId = selectedManagerId || directSupervisorId || '';
  const effectiveManagerName =
    effectiveManager?.fullName ||
    (selectedManagerId === String(directSupervisorId) ? directSupervisorName : '') ||
    (!selectedManagerId ? directSupervisorName : '');

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

  const gaugeTotal = primaryAnnualBalance ? Number(primaryAnnualBalance.total_days) || 0 : 0;
  const gaugeRemaining = primaryAnnualBalance
    ? Math.max(0, Number(primaryAnnualBalance.remaining_days) || 0)
    : 0;
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
        managerId: effectiveManagerId || undefined,
        managerName: effectiveManagerName || undefined,
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
      const routedTarget = created.managerName || effectiveManagerName || 'HR Final Review';
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
    const isRequester =
      (currentActorId && String(req.employeeId) === currentActorId) ||
      (currentUser.staffId && req.employeeStaffId === currentUser.staffId);
    const isDirectSupervisor =
      !isRequester &&
      (Boolean(req.managerId && currentActorId && String(req.managerId) === currentActorId) ||
        Boolean(
          !req.managerId &&
            req.managerName &&
            currentUser.name &&
            req.managerName.toLowerCase().includes(currentUser.name.toLowerCase())
        ));

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
      if (isDirectSupervisor) {
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
    status === 'Pending' || status === 'Pending Review' || status === 'Submitted';

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
    id: String(req.id),
    title: req.employeeName,
    subtitle: `${req.leaveType} • ${req.totalDays || req.daysRequested} Days (${req.startDate} to ${req.endDate})`,
    timestamp: req.appliedDate || 'Recent',
    avatar: (
      <div className="w-9 h-9 rounded-lg bg-[#083E34] text-white font-semibold flex items-center justify-center text-xs shrink-0">
        {req.employeeName
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')}
      </div>
    ),
    badge: (
      <div className="flex items-center gap-2 flex-wrap">
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
        <span className="text-[11px] font-medium text-slate-500">
          · {req.departmentName || 'Citadel'}
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
    const isProcessing = processingId !== null && String(processingId) === String(req.id);

    return (
      <div className="space-y-6 animate-fade-in" data-testid="leave-detail-panel">
        {/* Header with Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#083E34] text-white font-display font-bold text-base flex items-center justify-center shrink-0">
              {req.employeeName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-lg font-bold text-slate-900 tracking-tight">
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
              <p className="text-xs font-semibold text-[#083E34] mt-0.5">{req.leaveType}</p>
              <span className="text-xs text-slate-500 font-mono mt-0.5 block truncate">
                {req.employeeStaffId} · {req.departmentName} · {req.entityName}
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
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Decline</span>
                </button>
                <button
                  onClick={() => handleApprove(req)}
                  disabled={isProcessing}
                  data-testid="leave-approve-btn"
                  className="px-4 py-2 rounded-lg bg-[#083E34] hover:bg-[#062E27] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>{stageLabel}</span>
                </button>
              </>
            )}

            {isRequester && isPending && (
              <button
                onClick={() => handleCancel(req)}
                disabled={isProcessing}
                data-testid="leave-cancel-btn"
                className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Request</span>
              </button>
            )}
          </div>
        </div>

        {/* Review Comments & Feedback */}
        {actionError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
        )}

        {canAct && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Reviewer Comment / Decision Note (Optional)
            </label>
            <input
              type="text"
              value={reviewComments[req.id] || ''}
              onChange={(e) =>
                setReviewComments((prev) => ({ ...prev, [req.id]: e.target.value }))
              }
              placeholder="Add operational handover notes or rejection reason..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083E34] focus:ring-2 focus:ring-[#083E34]/15"
            />
          </div>
        )}

        {!canAct && waitingReason && (
          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs font-medium flex items-center gap-2">
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
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#083E34]" />
              <span>Two-Stage Approval Workflow</span>
            </h4>
            <span className="text-[11px] text-slate-500">
              Employee → {req.managerName || 'Direct HR'} → HR Final
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Step 1: Submission */}
            <div className="p-3 rounded-lg border bg-emerald-50/50 border-emerald-200/80">
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-900">
                <span>1. Submitted</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-800 font-medium mt-1 truncate">
                {req.employeeName}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">{req.appliedDate}</p>
            </div>

            {/* Step 2: Stage 1 Direct Supervisor */}
            <div
              className={`p-3 rounded-lg border ${
                rejectedAtManager
                  ? 'bg-rose-50/60 border-rose-200/80'
                  : managerApproved
                  ? 'bg-emerald-50/50 border-emerald-200/80'
                  : 'bg-amber-50/50 border-amber-200/80'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-900">
                <span>2. Stage 1: Manager</span>
                {rejectedAtManager ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                ) : managerApproved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                )}
              </div>
              <p className="text-xs text-slate-800 font-medium mt-1 truncate">
                {req.managerActorName || req.managerName || 'Direct to HR (Top-Level)'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
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
                  ? 'bg-rose-50/60 border-rose-200/80'
                  : hrApproved
                  ? 'bg-emerald-50/50 border-emerald-200/80'
                  : req.approvalStage === 'HR' && isPending
                  ? 'bg-amber-50/50 border-amber-200/80'
                  : 'bg-slate-50/70 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-900">
                <span>3. Stage 2: HR Final</span>
                {rejectedAtHr ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                ) : hrApproved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : req.approvalStage === 'HR' && isPending ? (
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <p className="text-xs text-slate-800 font-medium mt-1 truncate">
                {req.hrActorName || 'HR Review Desk'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
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
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Stage Action Log
              </span>
              <div className="divide-y divide-slate-100">
                {req.approvalHistory.map((entry, idx) => (
                  <div
                    key={`${entry.stage}-${idx}`}
                    className="py-2 text-xs flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{entry.actor}</span>{' '}
                      <span className="text-slate-500">
                        ({entry.stage}) — {entry.decision || entry.status}
                      </span>
                      {entry.comments && (
                        <span className="block text-slate-600 mt-0.5">{entry.comments}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {formatDateTime(entry.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dates & Handover Metadata */}
        <div className="pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              <span>Leave Application Dates</span>
            </h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              <div>
                <dt className="text-slate-500 font-medium">Start Date</dt>
                <dd className="font-semibold text-slate-900 tabular-nums mt-0.5">{req.startDate}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">End Date</dt>
                <dd className="font-semibold text-slate-900 tabular-nums mt-0.5">{req.endDate}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500 font-medium">Total Duration</dt>
                <dd className="font-bold text-[#083E34] tabular-nums mt-0.5">
                  {req.totalDays || req.daysRequested} Working Days
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Handover &amp; Coverage</span>
            </h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              <div>
                <dt className="text-slate-500 font-medium">Designated Cover</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">
                  {req.handoverColleague || req.relievingStaffName || 'Not specified'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Direct Supervisor</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">
                  {req.managerName || 'Direct HR Route'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500 font-medium">Current Stage</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">
                  {req.status === 'Rejected'
                    ? `Stopped at ${req.stoppedAtStage || req.approvalStage}`
                    : formatStageLabel(req.approvalStage)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Reason for Leave */}
        <div className="pt-5 border-t border-slate-100 space-y-2">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Stated Justification &amp; Reason
          </h4>
          <p className="text-[13px] text-slate-700 leading-relaxed">
            {req.reason}
          </p>
        </div>

        {/* Summary download */}
        <div className="pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-900">Leave Authorization Record</p>
              <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                Ref #{req.id} · {req.status}
              </span>
            </div>
          </div>
          <button
            onClick={() => showToast(`Exported leave summary for #${req.id}.`)}
            className="text-xs text-[#083E34] hover:text-[#062E27] hover:underline font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-50 bg-[#083E34] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-slide-up border border-emerald-900/40">
          <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: Leave Balance & Actions */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1 min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              Leave Requests &amp; Two-Stage Approvals
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              {isHrOrAdmin
                ? 'HR oversees all leave requests across Stage 1 (Direct Supervisor) and Stage 2 (HR Final Approval).'
                : hasManagerCapability
                ? 'Review team leave requests awaiting Stage 1 Manager approval, and track your own leave balances.'
                : 'Submit leave requests to your direct supervisor, track two-stage approval progress, and monitor your balances.'}
            </p>
          </div>

          <div className="flex items-center gap-5 shrink-0 flex-wrap">
            <ProgressRing
              value={gaugePct}
              max={100}
              label={`${gaugePct}%`}
              subtext={`${gaugeRemaining} of ${gaugeTotal} days`}
              type="semicircle"
            />
            {currentRole !== 'VIEWER' && (
              <button
                onClick={() => {
                  setSubmitError(null);
                  setShowApplyModal(true);
                }}
                data-testid="leave-apply-btn"
                className="px-4 py-2.5 rounded-lg bg-[#083E34] hover:bg-[#062E27] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition active:scale-[0.98] shrink-0 min-h-[40px] cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white stroke-[2.25]" />
                <span>Apply for Leave</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Balance Breakdown */}
        {personalBalances.length > 0 && (
          <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs tabular-nums">
            {personalBalances.map((bal) => (
              <div key={String(bal.id)} className="flex items-baseline gap-1.5">
                <span className="font-medium text-slate-600">{bal.category?.name || 'Leave'}</span>
                <span className="font-mono font-semibold text-[#083E34]">
                  {Number(bal.remaining_days)}/{Number(bal.total_days)}d
                </span>
                {Number(bal.pending_days) > 0 && (
                  <span className="text-[11px] text-amber-700 font-medium">
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
          setSelectedRequestId(String(item.id));
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
          role="dialog"
          aria-modal="true"
          aria-label="Submit Leave Application"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowApplyModal(false);
              onCloseApplyModal?.();
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="bg-[#083E34] text-white p-5 relative border-b border-emerald-950/30 shrink-0">
              <button
                type="button"
                aria-label="Close leave modal"
                onClick={() => {
                  setShowApplyModal(false);
                  onCloseApplyModal?.();
                }}
                className="absolute top-4 right-4 text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#D4AF37]" />
                <span>Submit Leave Application</span>
              </h3>
              <p className="text-xs text-emerald-100/85 mt-0.5">
                Staff: {currentUser.name} ({currentUser.staffId}) · {currentUser.departmentName}
              </p>
            </div>

            <form onSubmit={handleApply} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {submitError && (
                <div
                  data-testid="leave-submit-error"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{submitError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-800 font-semibold mb-1.5">Leave Category *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  data-testid="leave-type-select"
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:border-[#083E34] focus:ring-2 focus:ring-[#083E34]/15"
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
                  <label className="block text-slate-800 font-semibold mb-1.5">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="leave-start-date"
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#083E34] focus:ring-2 focus:ring-[#083E34]/15"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-semibold mb-1.5">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="leave-end-date"
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#083E34] focus:ring-2 focus:ring-[#083E34]/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-800 font-semibold mb-1.5">
                  Select Reviewing Manager (Stage 1 Approver)
                </label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  data-testid="leave-manager-select"
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:border-[#083E34] focus:ring-2 focus:ring-[#083E34]/15"
                >
                  <option value="">
                    {directSupervisorName
                      ? `Default Line Manager (${directSupervisorName})`
                      : 'Route directly to HR Final Review'}
                  </option>
                  {availableManagers.map((mgr) => (
                    <option key={mgr.id} value={String(mgr.id)}>
                      {mgr.fullName} — {mgr.jobTitle} ({mgr.departmentName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                <span className="font-semibold text-[#083E34] flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5" />
                  Approval Route (Two-Stage Workflow)
                </span>
                <p className="text-[11px] text-slate-700">
                  {effectiveManagerName
                    ? `Stage 1: ${effectiveManagerName} (Manager Review) → Stage 2: HR Final Approval`
                    : 'No line manager selected — routes directly to HR Final Approval.'}
                </p>
              </div>

              <div>
                <label className="block text-slate-800 font-semibold mb-1.5">
                  Handover Colleague (Optional)
                </label>
                <input
                  type="text"
                  value={handoverColleague}
                  onChange={(e) => setHandoverColleague(e.target.value)}
                  placeholder="Colleague who will cover responsibilities"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#083E34] focus:ring-2 focus:ring-[#083E34]/15"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-semibold mb-1.5">Reason for Leave *</label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please state details regarding your leave request..."
                  data-testid="leave-reason-input"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#083E34] focus:ring-2 focus:ring-[#083E34]/15"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplyModal(false);
                    onCloseApplyModal?.();
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="leave-submit-btn"
                  className="px-5 py-2 bg-[#083E34] hover:bg-[#062E27] text-white font-semibold rounded-lg transition shadow-2xs cursor-pointer disabled:opacity-50"
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
