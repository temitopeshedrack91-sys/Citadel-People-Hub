import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Building,
  FileText,
  Filter,
} from 'lucide-react';
import { LeaveRequest, LeaveType, WorkflowStatus, WorkflowActionType } from '../../types';
import { leaveRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { WorkflowActionModal } from '../common/WorkflowActionModal';

interface LeaveManagementViewProps {
  isApplyModalOpen?: boolean;
  onCloseApplyModal?: () => void;
}

export const LeaveManagementView: React.FC<LeaveManagementViewProps> = ({
  isApplyModalOpen = false,
  onCloseApplyModal,
}) => {
  const { currentUser, currentRole, canApproveLeave } = useAuth();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showApplyModal, setShowApplyModal] = useState(isApplyModalOpen);
  const [activeWorkflowItem, setActiveWorkflowItem] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    setShowApplyModal(isApplyModalOpen);
  }, [isApplyModalOpen]);

  const loadRequests = async () => {
    const data = await leaveRepository.getAll();
    setRequests(data);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Form state
  const [leaveType, setLeaveType] = useState<LeaveType>('Annual Leave');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-05');
  const [daysRequested, setDaysRequested] = useState(5);
  const [reason, setReason] = useState('');
  const [handoverColleague, setHandoverColleague] = useState('Femi Olatunji');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await leaveRepository.submitRequest({
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        employeeStaffId: currentUser.staffId,
        departmentName: currentUser.departmentName,
        entityName: currentUser.entityName,
        leaveType,
        startDate,
        endDate,
        totalDays: daysRequested,
        daysRequested,
        reason,
        handoverColleague,
      });

      // Audit log
      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Leave Management',
        action: 'Submitted Leave Request',
        recordAffectedId: created.id,
        recordAffectedTitle: `${leaveType} for ${currentUser.name} (${daysRequested} days)`,
        previousValue: 'Draft',
        newValue: 'Submitted',
        severity: 'Info',
      });

      await loadRequests();
      setShowApplyModal(false);
      onCloseApplyModal?.();
      setReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteWorkflow = async (
    action: WorkflowActionType,
    comments: string,
    newStatus: WorkflowStatus
  ) => {
    if (!activeWorkflowItem) return;

    await leaveRepository.updateStatus(activeWorkflowItem.id, newStatus, currentUser.name, comments);

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Leave Management',
      action: `Executed ${action} on Leave Application`,
      recordAffectedId: activeWorkflowItem.id,
      recordAffectedTitle: `${activeWorkflowItem.leaveType} for ${activeWorkflowItem.employeeName}`,
      previousValue: activeWorkflowItem.status,
      newValue: newStatus,
      severity: action === 'Reject' ? 'Warning' : 'Info',
    });

    await loadRequests();
    setActiveWorkflowItem(null);
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'All') return true;
    return r.status === statusFilter;
  });

  const getStatusBadgeVariant = (st: WorkflowStatus) => {
    switch (st) {
      case 'Approved':
        return 'success';
      case 'Rejected':
        return 'danger';
      case 'Submitted':
      case 'Pending Review':
        return 'warning';
      case 'Requires Correction':
        return 'info';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#0A1E3F]" />
            <span>Leave Management & Approvals</span>
          </h2>
          <p className="text-xs text-slate-500">
            Multi-tier leave requests with policy balance checks and supervisor/PCCM workflow governance.
          </p>
        </div>

        <button
          id="btn-apply-leave-main"
          onClick={() => setShowApplyModal(true)}
          className="px-3.5 py-2 rounded-lg bg-[#0A1E3F] text-amber-300 hover:bg-[#152B52] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Leave Entitlement Overview (User Balance Card) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Annual Leave
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">15 / 20</span>
            <span className="text-xs text-emerald-600 font-medium">Days remaining</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-[#0A1E3F] h-1.5 rounded-full w-3/4"></div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Casual Leave
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">3 / 5</span>
            <span className="text-xs text-slate-500 font-medium">Days remaining</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-[#C5A059] h-1.5 rounded-full w-3/5"></div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Sick Leave
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">10 / 10</span>
            <span className="text-xs text-emerald-600 font-medium">Full quota</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full w-full"></div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Compassionate / Study
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">5 Days</span>
            <span className="text-xs text-slate-500 font-medium">Subject to approval</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-slate-300 h-1.5 rounded-full w-1/2"></div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 text-xs">
        {['All', 'Submitted', 'Pending Review', 'Approved', 'Rejected'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === st
                ? 'bg-[#0A1E3F] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Dates & Duration</th>
                <th className="py-3 px-4">Reason & Handover</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Workflow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{req.employeeName}</p>
                    <p className="text-[11px] text-slate-500">
                      {req.employeeStaffId} • {req.departmentName}
                    </p>
                    <span className="text-[10px] text-slate-400">{req.entityName}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">{req.leaveType}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block">
                      {req.daysRequested} Days
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {req.startDate} to {req.endDate}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <p className="text-slate-700 truncate">{req.reason}</p>
                    {req.handoverColleague && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Handover: {req.handoverColleague}
                      </p>
                    )}
                    {req.approverComments && (
                      <p className="text-[10px] text-amber-800 font-mono bg-amber-50 p-1 rounded mt-1">
                        Note: {req.approverComments}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={getStatusBadgeVariant(req.status)}>{req.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {canApproveLeave && (req.status === 'Submitted' || req.status === 'Pending Review') ? (
                      <button
                        onClick={() => setActiveWorkflowItem(req)}
                        className="px-3 py-1.5 bg-[#0A1E3F] text-amber-300 hover:bg-[#152B52] rounded-lg text-xs font-semibold shadow-xs transition"
                      >
                        Action Request
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">
                        {req.status === 'Approved' ? 'Finalized' : 'Read-only'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow Action Modal */}
      {activeWorkflowItem && (
        <WorkflowActionModal
          isOpen={Boolean(activeWorkflowItem)}
          onClose={() => setActiveWorkflowItem(null)}
          title={`Review ${activeWorkflowItem.leaveType}`}
          itemDescription={`${activeWorkflowItem.employeeName} (${activeWorkflowItem.employeeStaffId}) requests ${activeWorkflowItem.daysRequested} days from ${activeWorkflowItem.startDate} to ${activeWorkflowItem.endDate}. Reason: "${activeWorkflowItem.reason}"`}
          currentStatus={activeWorkflowItem.status}
          allowedActions={['Approve', 'Reject', 'Request Correction']}
          onExecuteAction={handleExecuteWorkflow}
        />
      )}

      {/* Apply for Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0A1E3F] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Apply for Leave</h3>
                <p className="text-xs text-amber-300">PCCM Citadel Self-Service Portal</p>
              </div>
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  onCloseApplyModal?.();
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApply} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Leave Category</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#0A1E3F] outline-none"
                >
                  <option>Annual Leave</option>
                  <option>Casual Leave</option>
                  <option>Sick Leave</option>
                  <option>Maternity Leave</option>
                  <option>Paternity Leave</option>
                  <option>Study Leave</option>
                  <option>Compassionate Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#0A1E3F] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#0A1E3F] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Working Days</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={daysRequested}
                    onChange={(e) => setDaysRequested(Number(e.target.value))}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#0A1E3F] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Handover Colleague</label>
                  <input
                    type="text"
                    value={handoverColleague}
                    onChange={(e) => setHandoverColleague(e.target.value)}
                    placeholder="Colleague taking coverage"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#0A1E3F] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Leave</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Provide context for your leave request..."
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#0A1E3F] outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplyModal(false);
                    onCloseApplyModal?.();
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#0A1E3F] text-amber-300 rounded-lg hover:bg-[#152B52] font-semibold transition"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
