import React, { useState, useEffect, useMemo } from 'react';
import {
  ReceiptText,
  Plus,
  Search,
  Filter,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Building,
  User,
  Trash2,
  Eye,
  Check,
  X,
  ArrowRight,
  ShieldAlert,
  Send,
  Download,
  FileText,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { claimRepository, employeeRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  ClaimRequest,
  ClaimEvent,
  ExpenseType,
  ClaimExpense,
  ClaimStatus,
  Employee,
} from '../../types';

export const ClaimManagementView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();

  // Tab State
  type TabKey = 'all' | 'my-claims' | 'pending' | 'approved' | 'paid' | 'events-types';
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  // Core Data State
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [events, setEvents] = useState<ClaimEvent[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');

  // Modals & Drawers
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRequest | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Form State for New Claim
  const [claimForm, setClaimForm] = useState({
    employee_id: '',
    claim_event_id: '',
    currency: 'NGN',
    description: '',
    remarks: '',
    expenses: [
      {
        expense_type_id: '',
        expense_date: new Date().toISOString().split('T')[0],
        amount: 25000,
        note: '',
        receipt_url: '',
      },
    ],
  });

  // Form State for Claim Event & Expense Type
  const [eventForm, setEventForm] = useState({ name: '', code: '', description: '' });
  const [typeForm, setTypeForm] = useState({ name: '', code: '', description: '' });

  // Notifications
  const showToast = (msg: string) => {
    setErrorBanner(null);
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorBanner(msg);
  };

  // Money Formatter
  const formatMoney = (val?: number | null) => {
    const num = val || 0;
    return `₦${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch all claim data
  const loadData = async () => {
    setLoading(true);
    try {
      const [cList, eList, tList, empList] = await Promise.allSettled([
        claimRepository.getClaims(),
        claimRepository.getClaimEvents(false),
        claimRepository.getExpenseTypes(false),
        employeeRepository.getAll(),
      ]);

      if (cList.status === 'fulfilled') setClaims(cList.value);
      if (eList.status === 'fulfilled') setEvents(eList.value);
      if (tList.status === 'fulfilled') setExpenseTypes(tList.value);
      if (empList.status === 'fulfilled') setEmployees(empList.value);
    } catch (err) {
      console.error('Failed to load claim data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Summary KPI Metrics
  const metrics = useMemo(() => {
    const totalVolume = claims.reduce((acc, c) => acc + (c.total_amount ?? c.totalAmount ?? 0), 0);
    const pendingClaims = claims.filter((c) => c.status === 'SUBMITTED');
    const pendingTotal = pendingClaims.reduce((acc, c) => acc + (c.total_amount ?? c.totalAmount ?? 0), 0);
    const approvedClaims = claims.filter((c) => c.status === 'APPROVED');
    const approvedTotal = approvedClaims.reduce((acc, c) => acc + (c.total_amount ?? c.totalAmount ?? 0), 0);
    const paidClaims = claims.filter((c) => c.status === 'PAID');
    const paidTotal = paidClaims.reduce((acc, c) => acc + (c.total_amount ?? c.totalAmount ?? 0), 0);

    return {
      totalCount: claims.length,
      totalVolume,
      pendingCount: pendingClaims.length,
      pendingTotal,
      approvedCount: approvedClaims.length,
      approvedTotal,
      paidCount: paidClaims.length,
      paidTotal,
    };
  }, [claims]);

  // Filtered Claims List
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      // Tab filter
      if (activeTab === 'pending' && claim.status !== 'SUBMITTED') return false;
      if (activeTab === 'approved' && claim.status !== 'APPROVED') return false;
      if (activeTab === 'paid' && claim.status !== 'PAID') return false;
      if (activeTab === 'my-claims') {
        const staffId = currentUser?.staffId;
        const empId = claim.employee_id ?? claim.employeeId;
        const matchesStaff =
          String(empId) === String(currentUser?.id) ||
          claim.employee?.staff_id === staffId ||
          claim.employee?.staffId === staffId;
        if (!matchesStaff) return false;
      }

      // Event filter
      const eventId = claim.claim_event_id ?? claim.claimEventId;
      if (selectedEventFilter !== 'all' && String(eventId) !== selectedEventFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const claimNum = (claim.claim_number || claim.claimNumber || '').toLowerCase();
        const numMatch = claimNum.includes(q);
        const descMatch = (claim.description || '').toLowerCase().includes(q);
        const staffMatch =
          (claim.employee?.name || '').toLowerCase().includes(q) ||
          (claim.employee?.full_name || '').toLowerCase().includes(q) ||
          (claim.employee?.fullName || '').toLowerCase().includes(q) ||
          (claim.employee?.staff_id || '').toLowerCase().includes(q) ||
          (claim.employee?.staffId || '').toLowerCase().includes(q);
        return numMatch || descMatch || staffMatch;
      }

      return true;
    });
  }, [claims, activeTab, selectedEventFilter, searchQuery, currentUser]);

  // Handle Form Expense Line Add/Remove
  const handleAddExpenseRow = () => {
    setClaimForm((prev) => ({
      ...prev,
      expenses: [
        ...prev.expenses,
        {
          expense_type_id: expenseTypes[0]?.id ? String(expenseTypes[0].id) : '',
          expense_date: new Date().toISOString().split('T')[0],
          amount: 10000,
          note: '',
          receipt_url: '',
        },
      ],
    }));
  };

  const handleRemoveExpenseRow = (idx: number) => {
    if (claimForm.expenses.length <= 1) return;
    setClaimForm((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((_, i) => i !== idx),
    }));
  };

  // Submit Claim Request Handler
  const handleSaveClaim = async (status: 'INITIATED' | 'SUBMITTED') => {
    setErrorBanner(null);
    if (!claimForm.claim_event_id && events.length > 0) {
      showError('Please select a claim event/purpose before submitting.');
      return;
    }
    if (claimForm.expenses.length === 0) {
      showError('Please include at least one expense line item.');
      return;
    }

    try {
      const resolvedEmpId =
        claimForm.employee_id ||
        (employees.find((e) => e.staffId === currentUser?.staffId)?.id ?? employees[0]?.id ?? 1);

      const created = await claimRepository.createClaim({
        employee_id: resolvedEmpId,
        claim_event_id: claimForm.claim_event_id || events[0]?.id || 1,
        currency: claimForm.currency,
        description: claimForm.description,
        remarks: claimForm.remarks,
        status,
        expenses: claimForm.expenses.map((e) => ({
          expense_type_id: e.expense_type_id || expenseTypes[0]?.id || 1,
          expense_date: e.expense_date,
          amount: Number(e.amount),
          note: e.note,
          receipt_url: e.receipt_url,
        })),
      });

      await auditRepository.logAction({
        userId: currentUser?.id || 'sys-admin',
        userName: currentUser?.name || 'Administrator',
        userRole: (currentUser?.role as any) || 'EMPLOYEE',
        module: 'Claims',
        action: status === 'SUBMITTED' ? 'SUBMIT_CLAIM' : 'INITIATE_CLAIM',
        recordAffectedId: String(created.id),
        recordAffectedTitle: `${created.claim_number} - ${created.description || 'Expense Claim'}`,
        severity: 'Info',
      });

      setIsSubmitModalOpen(false);
      showToast(`Claim ${created.claim_number} successfully ${status === 'SUBMITTED' ? 'submitted' : 'drafted'}!`);
      loadData();
    } catch (err: any) {
      showError(`Error submitting claim: ${err.message}`);
    }
  };

  // Perform Workflow Action (Approve, Reject, Cancel, Pay)
  const handleWorkflowAction = async (action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'PAY') => {
    if (!selectedClaim) return;
    setErrorBanner(null);
    if (action === 'REJECT' && !rejectionReasonInput.trim()) {
      showError('Please provide a reason for rejecting this claim.');
      return;
    }

    try {
      const updated = await claimRepository.performAction(
        selectedClaim.id,
        action,
        rejectionReasonInput.trim() || undefined
      );

      await auditRepository.logAction({
        userId: currentUser?.id || 'sys-admin',
        userName: currentUser?.name || 'Administrator',
        userRole: (currentUser?.role as any) || 'ADMIN',
        module: 'Claims',
        action: `CLAIM_ACTION_${action}`,
        recordAffectedId: String(updated.id),
        recordAffectedTitle: `Claim ${updated.claim_number} -> ${updated.status}`,
        severity: 'Info',
      });

      setSelectedClaim(updated);
      setIsRejecting(false);
      setRejectionReasonInput('');
      showToast(`Claim ${updated.claim_number} marked as ${updated.status}.`);
      loadData();
    } catch (err: any) {
      showError(`Failed to perform ${action}: ${err.message}`);
    }
  };

  // Create Claim Event Handler
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.name.trim()) return;
    setErrorBanner(null);
    try {
      const created = await claimRepository.createClaimEvent({
        name: eventForm.name.trim(),
        code: eventForm.code.trim() || undefined,
        description: eventForm.description.trim() || undefined,
        status: 'Active',
      });
      setIsAddEventModalOpen(false);
      setEventForm({ name: '', code: '', description: '' });
      showToast(`Claim event "${created.name}" created.`);
      loadData();
    } catch (err: any) {
      showError(`Failed to create event: ${err.message}`);
    }
  };

  // Create Expense Type Handler
  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.name.trim()) return;
    setErrorBanner(null);
    try {
      const created = await claimRepository.createExpenseType({
        name: typeForm.name.trim(),
        code: typeForm.code.trim() || undefined,
        description: typeForm.description.trim() || undefined,
        status: 'Active',
      });
      setIsAddTypeModalOpen(false);
      setTypeForm({ name: '', code: '', description: '' });
      showToast(`Expense type "${created.name}" created.`);
      loadData();
    } catch (err: any) {
      showError(`Failed to create expense type: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Toast Notification */}
      {successToast && (
        <div role="status" className="fixed top-5 right-5 z-[60] flex items-center gap-3 bg-[#083E34] text-white px-5 py-3 rounded-xl shadow-xl border border-[#D4AF37]/40 animate-slide-in">
          <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0" />
          <span className="text-sm font-semibold">{successToast}</span>
          <button type="button" onClick={() => setSuccessToast(null)} className="text-white/60 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error / Validation Alert Banner (replaces window.alert) */}
      {errorBanner && (
        <div
          role="alert"
          data-testid="claim-error-banner"
          className="fixed top-5 right-5 z-[70] flex items-center gap-3 bg-rose-900 text-white px-5 py-3 rounded-xl shadow-xl border border-rose-400/40 max-w-md animate-slide-in"
        >
          <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
          <span className="text-xs font-semibold leading-snug">{errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            aria-label="Dismiss error"
            className="text-white/70 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-slate-950 flex items-center justify-center shadow-md border border-[#C59B27]">
              <ReceiptText className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Claims &amp; Expense Reimbursements
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Employee expense claims, pastoral travel disbursements, medical reimbursements, and settlement approvals.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => {
              setClaimForm({
                employee_id: '',
                claim_event_id: events[0]?.id ? String(events[0].id) : '',
                currency: 'NGN',
                description: '',
                remarks: '',
                expenses: [
                  {
                    expense_type_id: expenseTypes[0]?.id ? String(expenseTypes[0].id) : '',
                    expense_date: new Date().toISOString().split('T')[0],
                    amount: 25000,
                    note: '',
                    receipt_url: '',
                  },
                ],
              });
              setIsSubmitModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 px-4 py-2 rounded-xl text-xs font-bold shadow-xs border border-[#C59B27] transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>Submit Claim</span>
          </button>

          <button
            onClick={() => setIsAddEventModalOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>New Event</span>
          </button>

          <button
            onClick={() => setIsAddTypeModalOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <span>New Expense Type</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Claims Volume */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Total Claims YTD</span>
            <ReceiptText className="w-4 h-4 text-[#083E34]" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {formatMoney(metrics.totalVolume)}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <span className="text-[#083E34] font-bold">{metrics.totalCount} total claims</span>
            <span>recorded</span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">
            {formatMoney(metrics.pendingTotal)}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <span className="text-amber-600 font-bold">{metrics.pendingCount} claims</span>
            <span>awaiting line sign-off</span>
          </div>
        </div>

        {/* Approved / Awaiting Settlement */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Approved for Pay</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600">
            {formatMoney(metrics.approvedTotal)}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <span className="text-blue-600 font-bold">{metrics.approvedCount} claims</span>
            <span>ready for disbursement</span>
          </div>
        </div>

        {/* Settled & Paid */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Settled / Paid</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">
            {formatMoney(metrics.paidTotal)}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <span className="text-emerald-600 font-bold">{metrics.paidCount} claims</span>
            <span>disbursed to staff</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-xl px-2 pt-2 shadow-xs">
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto no-scrollbar">
          {[
            { key: 'all', label: 'All Claim Requests', count: claims.length },
            { key: 'my-claims', label: 'My Claims' },
            { key: 'pending', label: 'Pending Review', count: metrics.pendingCount },
            { key: 'approved', label: 'Approved & Unsettled', count: metrics.approvedCount },
            { key: 'paid', label: 'Settled / Paid', count: metrics.paidCount },
            { key: 'events-types', label: 'Events & Expense Categories' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`py-3 px-3 sm:px-4 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#D4AF37] text-slate-950 shadow-xs border border-[#C59B27]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isActive ? 'bg-slate-950/15 text-slate-950' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB CONTENT: CLAIMS LIST TABLE */}
      {activeTab !== 'events-types' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search claim number, description, staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 font-medium focus:outline-none"
              >
                <option value="all">All Events / Purposes</option>
                {events.map((ev) => (
                  <option key={ev.id} value={String(ev.id)}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Claim Code & Staff</th>
                    <th className="py-3.5 px-4">Claim Event / Purpose</th>
                    <th className="py-3.5 px-4">Description / Notes</th>
                    <th className="py-3.5 px-4 text-center">Items</th>
                    <th className="py-3.5 px-4 text-right">Claim Amount</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClaims.length > 0 ? (
                    filteredClaims.map((claim) => (
                      <tr
                        key={claim.id}
                        onClick={() => {
                          setSelectedClaim(claim);
                          setIsDetailDrawerOpen(true);
                        }}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{claim.claim_number || claim.claimNumber}</div>
                          <div className="text-[11px] text-slate-500">
                            {claim.employee?.name || claim.employee?.full_name || claim.employee?.fullName || 'Staff Member'} ·{' '}
                            {claim.employee?.department_name || claim.employee?.departmentName || 'CGCC'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">
                            {claim.claim_event?.name || claim.claimEvent?.name || 'General Expense'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {claim.description || claim.remarks || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                          {claim.expenses?.length || 0}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">
                          {formatMoney(claim.total_amount ?? claim.totalAmount ?? 0)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              claim.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : claim.status === 'APPROVED'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : claim.status === 'SUBMITTED'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : claim.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {claim.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClaim(claim);
                                setIsDetailDrawerOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-[#D4AF37] hover:text-slate-950 text-slate-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <ReceiptText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <span className="font-semibold text-xs block text-slate-600">No claims match the filter criteria</span>
                        <span className="text-[11px] text-slate-400">Click "+ Submit Claim" to initiate an expense reimbursement.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CLAIM EVENTS & EXPENSE TYPES CONFIGURATION */}
      {activeTab === 'events-types' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Claim Events Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Claim Events &amp; Purposes</h3>
                <p className="text-xs text-slate-500">Business activities that qualify for expense reimbursement.</p>
              </div>
              <button
                onClick={() => setIsAddEventModalOpen(true)}
                className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                + Add Event
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
                  <tr>
                    <th className="p-2.5">Event Name</th>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{ev.name}</div>
                        <div className="text-[10px] text-slate-400">{ev.description}</div>
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">{ev.code || '—'}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          {ev.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense Types Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Standard Expense Types</h3>
                <p className="text-xs text-slate-500">Itemized line item expense categories.</p>
              </div>
              <button
                onClick={() => setIsAddTypeModalOpen(true)}
                className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                + Add Type
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
                  <tr>
                    <th className="p-2.5">Expense Category</th>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenseTypes.map((t) => (
                    <tr key={t.id}>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{t.name}</div>
                        <div className="text-[10px] text-slate-400">{t.description}</div>
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">{t.code || '—'}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: SUBMIT NEW CLAIM
         ========================================================================= */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Submit Expense Claim Request</h2>
                <p className="text-xs text-slate-500">
                  Record out-of-pocket expenses and attach itemized receipts for manager approval.
                </p>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employee / Claimant</label>
                  <select
                    value={claimForm.employee_id}
                    onChange={(e) => setClaimForm({ ...claimForm, employee_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  >
                    <option value="">-- Choose Claimant (Defaults to You) --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.staffId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Claim Event / Purpose *</label>
                  <select
                    required
                    value={claimForm.claim_event_id}
                    onChange={(e) => setClaimForm({ ...claimForm, claim_event_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  >
                    <option value="">-- Choose Event --</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Claim Description / Business Justification</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Outreach trip fueling, emergency clinic consultation, or switch hardware purchase"
                  value={claimForm.description}
                  onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              {/* Itemized Expenses Table */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">Itemized Expenses ({claimForm.expenses.length})</span>
                  <button
                    type="button"
                    onClick={handleAddExpenseRow}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#D4AF37] hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Expense Line</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {claimForm.expenses.map((row, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-4">
                        <select
                          value={row.expense_type_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClaimForm((prev) => ({
                              ...prev,
                              expenses: prev.expenses.map((item, i) => (i === idx ? { ...item, expense_type_id: val } : item)),
                            }));
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="">Select Expense Type</option>
                          {expenseTypes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <input
                          type="date"
                          value={row.expense_date}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClaimForm((prev) => ({
                              ...prev,
                              expenses: prev.expenses.map((item, i) => (i === idx ? { ...item, expense_date: val } : item)),
                            }));
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <input
                          type="number"
                          placeholder="Amount ₦"
                          value={row.amount}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setClaimForm((prev) => ({
                              ...prev,
                              expenses: prev.expenses.map((item, i) => (i === idx ? { ...item, amount: val } : item)),
                            }));
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveExpenseRow(idx)}
                          disabled={claimForm.expenses.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="sm:col-span-12">
                        <input
                          type="text"
                          placeholder="Note or Receipt reference / vendor description"
                          value={row.note}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClaimForm((prev) => ({
                              ...prev,
                              expenses: prev.expenses.map((item, i) => (i === idx ? { ...item, note: val } : item)),
                            }));
                          }}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Claim Calculation */}
                <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">Calculated Total Claim</span>
                  <span className="text-base font-black text-[#083E34]">
                    {formatMoney(claimForm.expenses.reduce((acc, item) => acc + Number(item.amount || 0), 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveClaim('INITIATED')}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveClaim('SUBMITTED')}
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold border border-[#C59B27] rounded-xl text-xs shadow-xs"
                >
                  Submit for Approval
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAWER: CLAIM DETAIL & ACTION REVIEW
         ========================================================================= */}
      {isDetailDrawerOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto space-y-5 animate-slide-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Claim File
                </span>
                <h2 className="text-lg font-bold text-slate-900">{selectedClaim.claim_number || selectedClaim.claimNumber}</h2>
              </div>
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status & Claimant Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Claimant
                  </span>
                  <span className="font-bold text-sm text-slate-900">
                    {selectedClaim.employee?.name || selectedClaim.employee?.full_name || selectedClaim.employee?.fullName || 'Staff Member'}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    {selectedClaim.employee?.staff_id || selectedClaim.employee?.staffId} · {selectedClaim.employee?.department_name || selectedClaim.employee?.departmentName || 'CGCC'}
                  </span>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      selectedClaim.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedClaim.status === 'APPROVED'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedClaim.status === 'SUBMITTED'
                        ? 'bg-amber-100 text-amber-800'
                        : selectedClaim.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {selectedClaim.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Event / Purpose</span>
                  <span className="font-semibold text-slate-800">{selectedClaim.claim_event?.name || selectedClaim.claimEvent?.name || 'General'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Amount</span>
                  <span className="font-black text-slate-900 text-sm">{formatMoney(selectedClaim.total_amount ?? selectedClaim.totalAmount ?? 0)}</span>
                </div>
              </div>

              {selectedClaim.description && (
                <div className="pt-2 border-t border-slate-200 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Justification</span>
                  <p className="text-slate-700 mt-0.5">{selectedClaim.description}</p>
                </div>
              )}

              {selectedClaim.rejection_reason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                  <span className="font-bold block">Rejection Justification:</span>
                  <p className="mt-0.5">{selectedClaim.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Itemized Expenses ({selectedClaim.expenses?.length || 0})
              </h3>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="p-2.5">Expense Type</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedClaim.expenses?.map((exp) => (
                      <tr key={exp.id}>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{exp.expense_type?.name || exp.expenseType?.name || 'Expense'}</div>
                          {exp.note && <div className="text-[11px] text-slate-500">{exp.note}</div>}
                        </td>
                        <td className="p-2.5 text-slate-600 font-mono text-[11px]">{exp.expense_date || exp.expenseDate}</td>
                        <td className="p-2.5 text-right font-black text-slate-900">{formatMoney(exp.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rejection Input Box if triggered */}
            {isRejecting && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-fade-in text-xs">
                <label className="block font-bold text-rose-900">Reason for Rejection *</label>
                <textarea
                  rows={2}
                  placeholder="Explain why this claim cannot be approved (required)"
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  className="w-full p-2 bg-white border border-rose-300 rounded-lg text-xs"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsRejecting(false)}
                    className="px-3 py-1 bg-white text-slate-700 font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleWorkflowAction('REJECT')}
                    className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}

            {/* Workflow Action Controls */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Workflow Actions
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedClaim.status === 'INITIATED' && (
                  <button
                    onClick={() => handleWorkflowAction('SUBMIT')}
                    className="px-4 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Claim for Review</span>
                  </button>
                )}

                {selectedClaim.status === 'SUBMITTED' && (
                  <>
                    <button
                      onClick={() => handleWorkflowAction('APPROVE')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Claim</span>
                    </button>
                    <button
                      onClick={() => setIsRejecting(true)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject Claim</span>
                    </button>
                  </>
                )}

                {selectedClaim.status === 'APPROVED' && (
                  <button
                    onClick={() => handleWorkflowAction('PAY')}
                    className="px-5 py-2.5 bg-[#083E34] hover:bg-[#062c25] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md border border-[#D4AF37]/50"
                  >
                    <DollarSign className="w-4 h-4 text-[#D4AF37]" />
                    <span>Mark as Paid / Settled</span>
                  </button>
                )}

                {(selectedClaim.status === 'INITIATED' || selectedClaim.status === 'SUBMITTED') && (
                  <button
                    onClick={() => handleWorkflowAction('CANCEL')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs ml-auto"
                  >
                    Cancel Claim
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADD CLAIM EVENT
         ========================================================================= */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Create Claim Event</h2>
              <button onClick={() => setIsAddEventModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Event Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Media Production Field Shoot"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Event Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. EVT-MEDIA-01"
                  value={eventForm.code}
                  onChange={(e) => setEventForm({ ...eventForm, code: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Scope or policy guideline"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEventModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold rounded-xl"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ADD EXPENSE TYPE
         ========================================================================= */}
      {isAddTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Create Expense Type</h2>
              <button onClick={() => setIsAddTypeModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateType} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Type Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flight &amp; Airfare"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. EXP-AIR"
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Itemized expense notes"
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTypeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold rounded-xl"
                >
                  Save Expense Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
