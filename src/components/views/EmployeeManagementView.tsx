import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Building2,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  Shield,
  Eye,
  Edit,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MoreVertical,
  CalendarDays,
  Sparkles,
  Download,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  Employee,
  CitadelEntity,
  CitadelDepartment,
  EmployeeStatus,
  EmploymentType,
} from '../../types';
import { employeeRepository, organizationRepository, auditRepository } from '../../services';
import { governanceRepository } from '../../services/governanceRepository';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { Badge } from '../common/Badge';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { EmployeeProfileModal } from '../employee/EmployeeProfileModal';
import { CreateEmployeeModal } from '../employee/CreateEmployeeModal';
import { NavModule } from '../layout/Sidebar';
import {
  filterEmployeesForUser,
  maskSensitiveEmployeeData,
  canPerformAction,
} from '../../utils/rbac';
import {
  buildEmployeesCsv,
  filterDepartmentsByEntity,
  isSafeImageUrl,
  matchesEntityId,
} from '../../utils/orgHelpers';
import {
  buildEmployeePatchFromProfileChanges,
  resolveEntityOptionValue,
} from '../../utils/orgMatcher';
import { isLaravelApiConfigured } from '../../services/laravelClient';
import type { ProfileChangeRequest } from '../../domain/workbook';

interface EmployeeManagementViewProps {
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
  onNavigate?: (module: NavModule) => void;
}

export const EmployeeManagementView: React.FC<EmployeeManagementViewProps> = ({
  isAddModalOpen = false,
  onCloseAddModal,
  onNavigate,
}) => {
  const { currentUser, currentRole, selectedEntityFilter, isAuthenticated, canViewSensitiveData } = useAuth();
  const isPCCM = currentRole === 'PCCM_SUPER_ADMIN';
  const canManageEmployees = canPerformAction(currentUser, 'manage_employees').allowed;

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entities, setEntities] = useState<CitadelEntity[]>([]);
  const [departments, setDepartments] = useState<CitadelDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileChangeRequests, setProfileChangeRequests] = useState<ProfileChangeRequest[]>([]);
  const [showChangeApprovalsPanel, setShowChangeApprovalsPanel] = useState(false);
  const [reviewCommentById, setReviewCommentById] = useState<Record<string, string>>({});
  const [reviewingReqId, setReviewingReqId] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const pendingProfileRequests = useMemo(
    () => profileChangeRequests.filter((r) => r.status === 'PENDING_HR_APPROVAL'),
    [profileChangeRequests]
  );
  const pendingProfileRequestsCount = pendingProfileRequests.length;

  // View Mode: 'table' or 'card'
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState(
    selectedEntityFilter === 'all' ? '' : selectedEntityFilter
  );
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'dept' | 'staffId'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Selected Employee for Dossier Profile Modal
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Add Employee Modal state
  const [showAddModal, setShowAddModal] = useState(isAddModalOpen);

  useEffect(() => {
    setShowAddModal(isAddModalOpen);
  }, [isAddModalOpen]);

  useEffect(() => {
    if (selectedEntityFilter !== 'all') {
      setEntityFilter(resolveEntityOptionValue(entities, selectedEntityFilter));
    } else {
      setEntityFilter('');
    }
  }, [selectedEntityFilter, entities]);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [empResult, entResult, deptResult, changeReqResult] = await Promise.allSettled([
        employeeRepository.getAll(),
        organizationRepository.getEntities(),
        organizationRepository.getDepartments(),
        governanceRepository.listProfileChangeRequests(),
      ]);

      const failures: string[] = [];

      if (empResult.status === 'fulfilled') {
        const scopedEmpList = filterEmployeesForUser(currentUser, empResult.value);
        const maskedEmpList = scopedEmpList.map((emp) => maskSensitiveEmployeeData(currentUser, emp));
        setEmployees(maskedEmpList);
      } else {
        failures.push(empResult.reason instanceof Error ? empResult.reason.message : 'Unable to load employees.');
      }

      if (entResult.status === 'fulfilled') {
        setEntities(entResult.value);
      } else {
        failures.push(entResult.reason instanceof Error ? entResult.reason.message : 'Unable to load entities.');
      }

      if (deptResult.status === 'fulfilled') {
        setDepartments(deptResult.value);
      } else {
        failures.push(deptResult.reason instanceof Error ? deptResult.reason.message : 'Unable to load departments.');
      }

      if (changeReqResult.status === 'fulfilled') {
        setProfileChangeRequests(changeReqResult.value);
      }

      if (failures.length > 0) {
        setLoadError(failures.join(' '));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load organizational and employee records.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewProfileChange = async (
    req: ProfileChangeRequest,
    decision: 'APPROVED' | 'REJECTED'
  ) => {
    const comment = (reviewCommentById[req.id] || '').trim();
    if (decision === 'REJECTED' && !comment) {
      setLoadError('Please provide a brief HR review note before rejecting a profile change request.');
      return;
    }

    setReviewingReqId(req.id);
    setLoadError(null);
    try {
      const updatedReq: ProfileChangeRequest = {
        ...req,
        status: decision,
        reviewedBy: currentUser.name,
        reviewedAt: new Date().toISOString(),
        reviewComments: comment || (decision === 'APPROVED' ? 'Verified and approved by HR / PCCM.' : ''),
      };

      await governanceRepository.reviewProfileChangeRequest(req.id, decision, updatedReq.reviewComments, updatedReq);

      // In local demo mode, commit approved changes to authoritative employee record
      if (decision === 'APPROVED' && !isLaravelApiConfigured()) {
        const allEmps = await employeeRepository.getAll();
        const target = allEmps.find(
          (e) =>
            (req.employeeStaffId && e.staffId.toLowerCase() === req.employeeStaffId.toLowerCase()) ||
            (String(e.id) === String(req.employeeId) &&
              (!req.employeeStaffId || !e.staffId || e.staffId.toLowerCase() === req.employeeStaffId.toLowerCase()))
        );
        if (target) {
          const patch = buildEmployeePatchFromProfileChanges(target, req.proposedChanges);
          if (Object.keys(patch).length > 0) {
            await employeeRepository.update(String(target.id), patch);
          }
        }
      }

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Employee Management',
        action: decision === 'APPROVED' ? 'Approved Employee Profile Change' : 'Rejected Employee Profile Change',
        recordAffectedId: req.id,
        recordAffectedTitle: `${req.employeeName} (${Object.keys(req.proposedChanges).join(', ')})`,
        previousValue: JSON.stringify(req.previousValues),
        newValue: decision === 'APPROVED' ? JSON.stringify(req.proposedChanges) : `Rejected: ${updatedReq.reviewComments}`,
        severity: 'Info',
      });

      setExportFeedback(
        decision === 'APPROVED'
          ? `Approved profile update for ${req.employeeName}. Authoritative record updated.`
          : `Rejected profile update request for ${req.employeeName}.`
      );
      setTimeout(() => setExportFeedback(null), 4000);
      await loadData();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to review profile change request.');
    } finally {
      setReviewingReqId(null);
    }
  };

  useEffect(() => {
    void loadData();
  }, [currentUser?.id, currentUser?.role, currentUser?.departmentName, isAuthenticated]);

  useEffect(() => {
    const onAuthChanged = () => {
      void loadData();
    };
    const onProfileChangeUpdated = () => {
      void loadData();
    };
    window.addEventListener('citadel:auth-changed', onAuthChanged);
    window.addEventListener('citadel:profile-change-updated', onProfileChangeUpdated);
    return () => {
      window.removeEventListener('citadel:auth-changed', onAuthChanged);
      window.removeEventListener('citadel:profile-change-updated', onProfileChangeUpdated);
    };
  }, []);

  useRealtimeTable('employees', () => {
    void loadData();
  });

  useRealtimeTable('departments', () => {
    void loadData();
  });

  useRealtimeTable('entities', () => {
    void loadData();
  });

  // Filter and Sort Pipeline
  const filteredAndSortedEmployees = useMemo(() => {
    let result = [...employees];

    // 1. Entity Filter
    if (entityFilter) {
      result = result.filter(
        (e) => matchesEntityId(e.entityId, entityFilter) || matchesEntityId(e.entityName, entityFilter)
      );
    }

    // 2. Department Filter
    if (deptFilter) {
      result = result.filter((e) => String(e.departmentId) === String(deptFilter));
    }

    // 3. Status Filter
    if (statusFilter) {
      result = result.filter((e) => e.status === statusFilter);
    }

    // 4. Employment Type Filter
    if (typeFilter) {
      result = result.filter((e) => e.employmentType === typeFilter);
    }

    // 5. Search Filter (by Name, Staff ID, Job Title)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.staffId.toLowerCase().includes(q) ||
          e.jobTitle.toLowerCase().includes(q) ||
          e.departmentName.toLowerCase().includes(q)
      );
    }

    // 6. Sorting
    result.sort((a, b) => {
      let comp = 0;
      if (sortBy === 'name') {
        comp = a.fullName.localeCompare(b.fullName);
      } else if (sortBy === 'date') {
        comp = new Date(a.employmentDate).getTime() - new Date(b.employmentDate).getTime();
      } else if (sortBy === 'dept') {
        comp = a.departmentName.localeCompare(b.departmentName);
      } else if (sortBy === 'staffId') {
        comp = a.staffId.localeCompare(b.staffId);
      }
      return sortOrder === 'asc' ? comp : -comp;
    });

    return result;
  }, [employees, entityFilter, deptFilter, statusFilter, typeFilter, searchQuery, sortBy, sortOrder]);

  // Pagination Slice
  const totalItems = filteredAndSortedEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedEmployees = filteredAndSortedEmployees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setEntityFilter('');
    setDeptFilter('');
    setStatusFilter('');
    setTypeFilter('');
    setCurrentPage(1);
  };

  const handleSort = (field: 'name' | 'date' | 'dept' | 'staffId') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const availableDepartments = useMemo(
    () => filterDepartmentsByEntity(departments, entityFilter, { includeInactive: true }),
    [departments, entityFilter]
  );

  const handleExportCsv = async () => {
    const csv = buildEmployeesCsv(filteredAndSortedEmployees, canViewSensitiveData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date().toISOString().split('T')[0];
    link.download = `citadel-employees-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportFeedback(`Exported ${filteredAndSortedEmployees.length} employee record${filteredAndSortedEmployees.length === 1 ? '' : 's'} to CSV.`);
    setTimeout(() => setExportFeedback(null), 3500);

    void auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Employee Management',
      action: 'Exported Employee Directory CSV',
      recordAffectedId: 'employee-export',
      recordAffectedTitle: `${filteredAndSortedEmployees.length} filtered staff records`,
      previousValue: 'N/A',
      newValue: canViewSensitiveData ? 'Full Sheet 5 Master Data CSV' : 'Directory CSV (Sensitive Masked)',
      severity: 'Info',
    });
  };

  return (
    <div className="space-y-5">
      {/* 1. Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div>
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Employees
            </h1>
            <span className="text-xs font-mono font-medium text-slate-500 tabular-nums">
              &middot; {totalItems} total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized staff records across Citadel Global Community Church (CGCC), Citadel School of Government (CSOG), and Citadel Holdings.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {canManageEmployees && pendingProfileRequestsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowChangeApprovalsPanel((prev) => !prev)}
              data-testid="pending-profile-approvals-btn"
              className="px-3 py-2 rounded-lg bg-[#FAF5EB] hover:bg-[#FAF5EB] text-[#B88A24] border border-[#E9D59A] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-[#B88A24]" />
              <span>{pendingProfileRequestsCount} Profile Change{pendingProfileRequestsCount === 1 ? '' : 's'} Pending HR</span>
            </button>
          )}

          {/* Export Filtered Records CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || filteredAndSortedEmployees.length === 0}
            data-testid="export-employees-csv-btn"
            className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            title="Export filtered employee records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80" role="group" aria-label="Employee view mode">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              aria-label="Table View"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              aria-pressed={viewMode === 'card'}
              aria-label="Card Grid View"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Add Employee (Admin & HR Staff authorized) */}
          {canManageEmployees && (
            <button
              type="button"
              id="btn-add-employee-trigger"
              onClick={() => {
                setEditingEmployee(null);
                setShowAddModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-[#174EA6] hover:bg-[#0B1F3A] text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[2.25]" />
              <span>Enroll Employee</span>
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          data-testid="employees-load-error"
          className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#111827]/25 text-[#111827] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#111827]" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#E5E7EB] text-[#111827] border border-[#111827]/25 font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {exportFeedback && (
        <div
          role="status"
          data-testid="employees-export-toast"
          className="p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#174EA6] text-xs font-medium flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-[#174EA6] shrink-0" />
          <span>{exportFeedback}</span>
        </div>
      )}

      {/* Inline HR Profile Change Approval Queue (Sheet 5) */}
      {canManageEmployees && showChangeApprovalsPanel && (
        <div
          data-testid="hr-profile-approvals-panel"
          className="bg-[#FAF5EB] border border-[#E9D59A] rounded-xl p-4 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-black text-[#B88A24] uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#174EA6]" />
                <span>Employee Personal Info Change Requests ({pendingProfileRequests.length} Pending)</span>
              </h2>
              <p className="text-[11px] text-[#B88A24] mt-0.5">
                Review and approve employee-submitted updates before committing them to authoritative records.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowChangeApprovalsPanel(false)}
              className="text-xs font-semibold text-[#B88A24] hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>

          {pendingProfileRequests.length === 0 ? (
            <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-[#E9D59A]">
              All employee profile update requests have been reviewed.
            </p>
          ) : (
            <div className="space-y-2.5">
              {pendingProfileRequests.map((req) => (
                <div
                  key={req.id}
                  data-testid={`profile-change-card-${req.id}`}
                  className="bg-white rounded-xl border border-[#E9D59A] p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{req.employeeName}</span>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {req.employeeStaffId}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Requested by {req.requestedByName} · Reason: {req.reason}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(req.proposedChanges).map(([fieldKey, newVal]) => (
                        <div
                          key={fieldKey}
                          className="text-[11px] px-2 py-1 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <span className="font-bold text-slate-700">{fieldKey}:</span>{' '}
                          <span className="line-through text-slate-400">
                            {req.previousValues[fieldKey] || 'empty'}
                          </span>{' '}
                          <span className="text-[#174EA6] font-bold">&rarr; {newVal}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <input
                      type="text"
                      placeholder="HR review note (required to reject)"
                      value={reviewCommentById[req.id] || ''}
                      onChange={(e) =>
                        setReviewCommentById((prev) => ({ ...prev, [req.id]: e.target.value }))
                      }
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-[#174EA6] min-w-[200px]"
                    />
                    <button
                      type="button"
                      disabled={reviewingReqId === req.id}
                      data-testid={`approve-profile-change-${req.id}`}
                      onClick={() => void handleReviewProfileChange(req, 'APPROVED')}
                      className="px-3 py-1.5 rounded-lg bg-[#174EA6] hover:bg-[#0B1F3A] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={reviewingReqId === req.id}
                      data-testid={`reject-profile-change-${req.id}`}
                      onClick={() => void handleReviewProfileChange(req, 'REJECTED')}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F5F7FA] text-[#111827] border border-[#111827]/25 text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Comprehensive Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Box */}
          <div className="relative lg:col-span-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              aria-label="Search employees by name, staff ID, or title"
              placeholder="Search by name, ID, title..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200/90 rounded-lg focus:border-[#174EA6] focus:ring-2 focus:ring-[#174EA6]/12 outline-none transition"
            />
          </div>

          {/* Entity Filter */}
          <div>
            <select
              aria-label="Filter by Citadel entity"
              data-testid="filter-entity-select"
              value={entityFilter}
              disabled={loading && entities.length === 0}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setDeptFilter('');
                setCurrentPage(1);
              }}
              className="w-full py-2 px-2.5 text-xs border border-slate-200/90 rounded-lg focus:border-[#174EA6] focus:ring-2 focus:ring-[#174EA6]/12 outline-none bg-white text-slate-700 font-medium transition disabled:bg-slate-50"
            >
              <option value="">
                {loading && entities.length === 0
                  ? 'Loading entities...'
                  : entities.length === 0
                  ? 'No entities available'
                  : 'All Citadel Entities'}
              </option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              aria-label="Filter by department"
              data-testid="filter-department-select"
              value={deptFilter}
              disabled={loading && departments.length === 0}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-2.5 text-xs border border-slate-200/90 rounded-lg focus:border-[#174EA6] focus:ring-2 focus:ring-[#174EA6]/12 outline-none bg-white text-slate-700 font-medium transition disabled:bg-slate-50"
            >
              <option value="">
                {loading && departments.length === 0
                  ? 'Loading departments...'
                  : availableDepartments.length === 0
                  ? 'No departments in selected entity'
                  : `All Departments (${availableDepartments.length})`}
              </option>
              {availableDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employment Status Filter */}
          <div>
            <select
              aria-label="Filter by lifecycle status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-2.5 text-xs border border-slate-200/90 rounded-lg focus:border-[#174EA6] focus:ring-2 focus:ring-[#174EA6]/12 outline-none bg-white text-slate-700 font-medium transition"
            >
              <option value="">All Lifecycle Statuses</option>
              <option value="Active">Active</option>
              <option value="Probation">Probation</option>
              <option value="Confirmed">Confirmed</option>
              <option value="On Leave">On Leave</option>
              <option value="Suspended">Suspended</option>
              <option value="Resigned">Resigned</option>
              <option value="Terminated">Terminated</option>
              <option value="Retired">Retired</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Employment Type Filter */}
          <div className="flex items-center gap-2">
            <select
              aria-label="Filter by contract type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-2.5 text-xs border border-slate-200/90 rounded-lg focus:border-[#174EA6] focus:ring-2 focus:ring-[#174EA6]/12 outline-none bg-white text-slate-700 font-medium transition"
            >
              <option value="">All Contract Types</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Contract">Contract</option>
              <option value="Intern">Intern</option>
              <option value="Probationary">Probationary</option>
            </select>

            {(searchQuery || entityFilter || deptFilter || statusFilter || typeFilter) && (
              <button
                type="button"
                onClick={handleResetFilters}
                aria-label="Reset all filters"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Employee List Representation: Table or Card View */}
      {loading ? (
        <LoadingSkeleton type="card" count={4} />
      ) : paginatedEmployees.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">No personnel records matched your filter criteria.</p>
          <p className="text-xs text-slate-400">
            Try adjusting your search query, department, or status selections.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW — compact 7-column layout prevents horizontal clipping at 1440px */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th
                    onClick={() => handleSort('staffId')}
                    className="py-3 px-3.5 cursor-pointer hover:text-slate-900 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Staff ID</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-3.5 cursor-pointer hover:text-slate-900 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Employee</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Entity &amp; Department</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Manager</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-3.5 cursor-pointer hover:text-slate-900 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Joined</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    className="hover:bg-slate-50/80 cursor-pointer transition group"
                  >
                    {/* Staff ID */}
                    <td className="py-3 px-3.5 font-mono font-semibold text-slate-700 group-hover:text-[#174EA6] whitespace-nowrap tabular-nums">
                      {emp.staffId}
                    </td>

                    {/* Full Name & Job Title */}
                    <td className="py-3 px-3.5 max-w-[230px]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSafeImageUrl(emp.profilePhoto) ? (
                          <img
                            src={emp.profilePhoto}
                            alt={emp.fullName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#174EA6] text-white font-semibold flex items-center justify-center text-[11px] shrink-0">
                            {emp.firstName?.[0] || emp.fullName?.[0] || 'C'}
                            {emp.lastName?.[0] || ''}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 group-hover:text-[#174EA6] truncate">
                            {emp.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate" title={emp.jobTitle}>
                            {emp.jobTitle}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Entity, Department & Contract Type inline */}
                    <td className="py-3 px-3.5 max-w-[240px]">
                      <div className="font-medium text-slate-900 leading-tight truncate" title={emp.entityName}>
                        {emp.entityName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate" title={`${emp.departmentName} · ${emp.employmentType}`}>
                        {emp.departmentName} &middot; {emp.employmentType}
                      </div>
                    </td>

                    {/* Manager / Supervisor */}
                    <td className="py-3 px-3.5 text-slate-600 text-xs max-w-[160px] truncate" title={emp.managerName || 'PCCM Head'}>
                      {emp.managerName || 'PCCM Head'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <Badge
                        variant={
                          emp.status === 'Active'
                            ? 'success'
                            : emp.status === 'On Leave'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {emp.status}
                      </Badge>
                    </td>

                    {/* Employment Date */}
                    <td className="py-3 px-3.5 font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                      {emp.employmentDate}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedEmployee(emp)}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-[#174EA6] text-slate-700 hover:text-white border border-slate-200/90 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                          title="View complete employee dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Dossier</span>
                        </button>

                        {canManageEmployees && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEmployee(emp);
                              setShowAddModal(true);
                            }}
                            data-testid={`edit-employee-${emp.staffId}`}
                            aria-label={`Edit ${emp.fullName}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                            title="Edit employee record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {paginatedEmployees.map((emp) => (
            <div
              key={emp.id}
              onClick={() => setSelectedEmployee(emp)}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="w-11 h-11 rounded-xl bg-[#174EA6] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {emp.firstName[0]}
                    {emp.lastName[0]}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      {emp.staffId}
                    </span>
                    <Badge
                      variant={
                        emp.status === 'Active'
                          ? 'success'
                          : emp.status === 'On Leave'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {emp.status}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#174EA6] transition line-clamp-1">
                    {emp.fullName}
                  </h3>
                  <p className="text-xs text-[#174EA6] font-semibold line-clamp-1 mt-0.5">
                    {emp.jobTitle}
                  </p>
                  <p className="text-xs text-slate-700 font-semibold mt-1 line-clamp-1">
                    {emp.departmentName}
                  </p>
                  <p className="text-xs text-slate-500 font-medium line-clamp-1">
                    {emp.entityName}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-700 font-semibold">
                  {emp.employmentType}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEmployee(emp);
                  }}
                  className="text-[#174EA6] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Dossier →</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Standard Pagination Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing{' '}
          <strong className="text-slate-900 font-mono">
            {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
          </strong>{' '}
          to{' '}
          <strong className="text-slate-900 font-mono">
            {Math.min(currentPage * pageSize, totalItems)}
          </strong>{' '}
          of <strong className="text-slate-900 font-mono">{totalItems}</strong> employees
        </div>

        <div className="flex items-center gap-1.5 tabular-nums">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }).map((_, i) => {
            const pNum = i + 1;
            return (
              <button
                type="button"
                key={pNum}
                onClick={() => setCurrentPage(pNum)}
                aria-current={currentPage === pNum ? 'page' : undefined}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  currentPage === pNum
                    ? 'bg-[#174EA6] text-white'
                    : 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                {pNum}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5. Comprehensive 9-Tab Employee Profile Dossier Modal */}
      <EmployeeProfileModal
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onEdit={(emp) => {
          setSelectedEmployee(null);
          setEditingEmployee(emp);
          setShowAddModal(true);
        }}
        onNavigateLeave={() => {
          setSelectedEmployee(null);
          if (onNavigate) onNavigate('leave');
        }}
      />

      {/* 6. Sectioned 5-Step Create / Edit Employee Modal */}
      <CreateEmployeeModal
        isOpen={showAddModal}
        editingEmployee={editingEmployee}
        onClose={() => {
          setShowAddModal(false);
          setEditingEmployee(null);
          if (onCloseAddModal) onCloseAddModal();
        }}
        onSuccess={() => {
          loadData();
        }}
        entities={entities}
        departments={departments}
        employees={employees}
      />
    </div>
  );
};
