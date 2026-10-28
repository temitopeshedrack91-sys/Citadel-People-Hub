import React, { useState, useEffect, useMemo } from 'react';
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
  ShieldCheck,
  Paperclip,
  Info,
  BookOpen,
  Download,
  Check,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { LeaveRequest, LeaveType, WorkflowStatus } from '../../types';
import { leaveRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { ListDetailLayout, ListItem } from '../common/ListDetailLayout';
import { StatusPill } from '../common/StatusPill';
import { ProgressRing } from '../common/ProgressRing';
import { Card } from '../common/Card';
import { CITADEL_LEAVE_POLICY_RULES } from '../../data/mockData';

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
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(isApplyModalOpen);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state
  const [leaveType, setLeaveType] = useState<LeaveType>('Annual Leave');
  const [startDate, setStartDate] = useState('2026-11-02');
  const [endDate, setEndDate] = useState('2026-11-06');
  const [daysRequested, setDaysRequested] = useState(5);
  const [reason, setReason] = useState('');
  const [handoverColleague, setHandoverColleague] = useState('Engr. Femi Olatunji');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setShowApplyModal(isApplyModalOpen);
  }, [isApplyModalOpen]);

  const loadRequests = async () => {
    const data = await leaveRepository.getAll();
    setRequests(data);
    if (data.length > 0 && !selectedRequestId) {
      setSelectedRequestId(data[0].id);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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

      setShowApplyModal(false);
      onCloseApplyModal?.();
      setReason('');
      await loadRequests();
      setSelectedRequestId(created.id);
      showToast(`Leave request for ${leaveType} submitted successfully.`);
    } catch (err: any) {
      showToast(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string, name: string) => {
    try {
      await leaveRepository.updateStatus(id, 'Approved', 'Approved via Citadel Governance Sign-Off');
      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Leave Management',
        action: 'Approved Leave Request',
        recordAffectedId: id,
        recordAffectedTitle: `Leave for ${name}`,
        previousValue: 'Pending',
        newValue: 'Approved',
        severity: 'Info',
      });
      await loadRequests();
      showToast(`Leave request for ${name} marked as Approved.`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleReject = async (id: string, name: string) => {
    try {
      await leaveRepository.updateStatus(id, 'Rejected', 'Rejected based on operational capacity requirements');
      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Leave Management',
        action: 'Rejected Leave Request',
        recordAffectedId: id,
        recordAffectedTitle: `Leave for ${name}`,
        previousValue: 'Pending',
        newValue: 'Rejected',
        severity: 'Warning',
      });
      await loadRequests();
      showToast(`Leave request for ${name} marked as Rejected.`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Filter requests
  const isRequestPending = (status: WorkflowStatus | string) =>
    status === 'Pending Review' || status === 'Submitted' || status === 'Pending';

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (activeTab === 'pending' && !isRequestPending(r.status)) return false;
      if (activeTab === 'approved' && r.status !== 'Approved') return false;
      if (activeTab === 'rejected' && r.status !== 'Rejected') return false;
      if (activeTab === 'casual' && !r.leaveType.toLowerCase().includes('casual')) return false;
      if (activeTab === 'annual' && !r.leaveType.toLowerCase().includes('annual')) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.employeeName.toLowerCase().includes(q) ||
          r.leaveType.toLowerCase().includes(q) ||
          r.departmentName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [requests, activeTab, search]);

  const filterTabs = [
    { id: 'all', label: 'All Requests', count: requests.length },
    {
      id: 'pending',
      label: 'Pending',
      count: requests.filter((r) => isRequestPending(r.status)).length,
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

  // Convert requests to ListItem format for Pillio list-detail
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
              : 'pending'
          }
          label={req.status}
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
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {req.employeeName}
                </h3>
                <StatusPill
                  status={
                    req.status === 'Approved'
                      ? 'confirmed'
                      : req.status === 'Rejected'
                      ? 'rejected'
                      : 'pending'
                  }
                  label={req.status}
                  showDot
                  size="sm"
                />
              </div>
              <p className="text-xs font-bold text-[#083E34] mt-0.5">
                {req.leaveType}
              </p>
              <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                {req.employeeStaffId} • {req.departmentName}
              </span>
            </div>
          </div>

          {/* Action Buttons for Managers / Admins */}
          {canApproveLeave && isPending && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleReject(req.id, req.employeeName)}
                data-testid="leave-reject-btn"
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Reject</span>
              </button>
              <button
                onClick={() => handleApprove(req.id, req.employeeName)}
                data-testid="leave-approve-btn"
                className="px-4 py-2 rounded-xl bg-[#083E34] hover:bg-[#052C25] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Approve Request</span>
              </button>
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
              <span>Handover & Coverage</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Designated Cover:</span>
                <span className="font-bold text-slate-900">
                  {req.handoverColleague || 'Assigned to Unit Lead'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Approval Routing:</span>
                <span className="font-bold text-slate-800">HOD → PCCM Super Admin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Handover Note:</span>
                <span className="font-bold text-emerald-700">Acknowledged</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reason for Leave */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Stated Justification & Reason
          </h4>
          <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
            {req.reason || 'Annual vacation schedule in alignment with department roster.'}
          </p>
        </div>

        {/* Verification Attachment matching Pillio Prescription Card */}
        <div className="space-y-2">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Supporting Documentation & Forms
          </h4>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Citadel Leave Authorization Form
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  Signed PDF • 1.2 MB
                </span>
              </div>
            </div>
            <button
              onClick={() => showToast('Downloading Leave Form PDF...')}
              className="text-xs text-[#083E34] hover:underline font-bold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#083E34] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: Leave Balance Semicircular Gauge & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="lg:col-span-8 space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#083E34] shrink-0" />
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              Leave Requests &amp; Allowances
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium max-w-2xl">
            Review leave applications, track remaining allowances, and manage team coverage.
          </p>
        </div>

        <div className="lg:col-span-4 flex items-center justify-start lg:justify-end gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <ProgressRing
              value={65}
              max={100}
              label="65%"
              subtext="13 of 20 days"
              type="semicircle"
            />
          </div>
          <button
            onClick={() => setShowApplyModal(true)}
            data-testid="leave-apply-btn"
            className="px-4 py-2.5 rounded-xl bg-[#083E34] hover:bg-[#062f28] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs border border-[#FF9900]/30 transition active:scale-[0.98] shrink-0 min-h-[40px]"
          >
            <Plus className="w-4 h-4 text-[#FF9900]" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* Pillio List-Detail Layout */}
      <ListDetailLayout<LeaveRequest>
        items={listItems}
        selectedId={selectedRequestId}
        onSelectItem={(item) => setSelectedRequestId(item.id)}
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
            <div className="bg-[#083E34] text-white p-5 relative border-b border-emerald-800 shrink-0">
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  onCloseApplyModal?.();
                }}
                className="absolute top-4 right-4 text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#FF9900]" />
                <span>Submit Leave Application</span>
              </h3>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Staff: {currentUser.name} ({currentUser.staffId}) • {currentUser.departmentName}
              </p>
            </div>

            <form onSubmit={handleApply} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-800 font-bold mb-1">Leave Category *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold focus:outline-none focus:border-[#083E34]"
                >
                  <option value="Annual Leave">Annual Leave (24 days quota)</option>
                  <option value="Casual Leave">Casual Leave (7 days quota)</option>
                  <option value="Sick Leave">Sick Leave (Medical cert required after 2 days)</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Compassionate Leave">Compassionate Leave</option>
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
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-[#083E34]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Handover Colleague</label>
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
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#083E34] hover:bg-[#052C25] text-white font-bold rounded-xl transition shadow-xs"
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

export default LeaveManagementView;
