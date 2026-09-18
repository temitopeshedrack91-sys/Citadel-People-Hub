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
} from 'lucide-react';
import {
  Employee,
  CitadelEntity,
  CitadelDepartment,
  EmployeeStatus,
  EmploymentType,
} from '../../types';
import { employeeRepository, organizationRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { EmployeeProfileModal } from '../employee/EmployeeProfileModal';
import { CreateEmployeeModal } from '../employee/CreateEmployeeModal';
import { NavModule } from '../layout/Sidebar';

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
  const { currentUser, currentRole, selectedEntityFilter } = useAuth();
  const isPCCM = currentRole === 'PCCM_SUPER_ADMIN';

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entities, setEntities] = useState<CitadelEntity[]>([]);
  const [departments, setDepartments] = useState<CitadelDepartment[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Add Employee Modal state
  const [showAddModal, setShowAddModal] = useState(isAddModalOpen);

  useEffect(() => {
    setShowAddModal(isAddModalOpen);
  }, [isAddModalOpen]);

  useEffect(() => {
    if (selectedEntityFilter !== 'all') {
      setEntityFilter(selectedEntityFilter);
    } else {
      setEntityFilter('');
    }
  }, [selectedEntityFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empList, entList, deptList] = await Promise.all([
        employeeRepository.getAll(),
        organizationRepository.getEntities(),
        organizationRepository.getDepartments(),
      ]);
      setEmployees(empList);
      setEntities(entList);
      setDepartments(deptList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter and Sort Pipeline
  const filteredAndSortedEmployees = useMemo(() => {
    let result = [...employees];

    // 1. Entity Filter
    if (entityFilter) {
      result = result.filter((e) => e.entityId === entityFilter);
    }

    // 2. Department Filter
    if (deptFilter) {
      result = result.filter((e) => e.departmentId === deptFilter);
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

  const availableDepartments = useMemo(() => {
    if (!entityFilter) return departments;
    return departments.filter((d) => d.entityId === entityFilter);
  }, [departments, entityFilter]);

  return (
    <div className="space-y-5">
      {/* 1. Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-serif text-slate-900 tracking-tight">
              Citadel Employee Records
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-[#C59B27] border border-amber-200/60 font-mono text-[11px] font-bold">
              {totalItems} Personnel
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized workforce database across Citadel Global Community Church, CSOG, and Holdings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'table'
                  ? 'bg-white text-[#0A1E3F] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'card'
                  ? 'bg-white text-[#0A1E3F] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Add Employee (PCCM / Admin authorized) */}
          {isPCCM && (
            <button
              id="btn-add-employee-trigger"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-lg bg-[#0A1E3F] hover:bg-[#152B52] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4 text-[#C59B27]" />
              <span>Enroll Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Comprehensive Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Box */}
          <div className="relative lg:col-span-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, title..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-[#0A1E3F] outline-none"
            />
          </div>

          {/* Entity Filter */}
          <div>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setDeptFilter('');
                setCurrentPage(1);
              }}
              className="w-full py-2 px-2.5 text-xs border border-slate-200 rounded-lg focus:border-[#0A1E3F] outline-none bg-white text-slate-700 font-medium"
            >
              <option value="">All Citadel Entities</option>
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
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-2.5 text-xs border border-slate-200 rounded-lg focus:border-[#0A1E3F] outline-none bg-white text-slate-700 font-medium"
            >
              <option value="">All Departments</option>
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
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-2.5 text-xs border border-slate-200 rounded-lg focus:border-[#0A1E3F] outline-none bg-white text-slate-700 font-medium"
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
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-2.5 text-xs border border-slate-200 rounded-lg focus:border-[#0A1E3F] outline-none bg-white text-slate-700 font-medium"
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
                onClick={handleResetFilters}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
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
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
          Loading Citadel personnel master records...
        </div>
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
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th
                    onClick={() => handleSort('staffId')}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Staff ID</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Full Name & Role</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Entity & Department</th>
                  <th className="py-3 px-4">Manager / Head</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Type</th>
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Joined</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    className="hover:bg-amber-50/40 cursor-pointer transition group"
                  >
                    {/* Staff ID */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 group-hover:text-[#0A1E3F]">
                      {emp.staffId}
                    </td>

                    {/* Full Name & Job Title */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#0A1E3F] text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                          {emp.firstName[0]}
                          {emp.lastName[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-[#0A1E3F]">
                            {emp.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500">{emp.jobTitle}</div>
                        </div>
                      </div>
                    </td>

                    {/* Entity & Department */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{emp.entityName}</div>
                      <div className="text-[11px] text-slate-500">{emp.departmentName}</div>
                    </td>

                    {/* Manager / Supervisor */}
                    <td className="py-3 px-4 text-slate-600">
                      {emp.managerName || 'PCCM Head'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          emp.status === 'Active'
                            ? 'success'
                            : emp.status === 'On Leave'
                            ? 'warning'
                            : emp.status === 'Probation'
                            ? 'neutral'
                            : 'neutral'
                        }
                      >
                        {emp.status}
                      </Badge>
                    </td>

                    {/* Employment Type */}
                    <td className="py-3 px-4 text-slate-600">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {emp.employmentType}
                      </span>
                    </td>

                    {/* Employment Date */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {emp.employmentDate}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedEmployee(emp)}
                          className="px-2.5 py-1 rounded bg-[#0A1E3F] text-white hover:bg-[#152B52] text-[11px] font-semibold transition flex items-center gap-1"
                          title="View complete employee dossier"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Dossier</span>
                        </button>

                        {isPCCM && (
                          <button
                            onClick={() => {
                              setSelectedEmployee(emp);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
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
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0A1E3F] to-[#152B52] text-amber-300 font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
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
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#0A1E3F] transition line-clamp-1">
                    {emp.fullName}
                  </h3>
                  <p className="text-xs text-[#0A1E3F] font-medium line-clamp-1 mt-0.5">
                    {emp.jobTitle}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {emp.departmentName}
                  </p>
                  <p className="text-[10px] text-slate-400 line-clamp-1">
                    {emp.entityName}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">
                  {emp.employmentType}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEmployee(emp);
                  }}
                  className="text-[#0A1E3F] font-bold hover:underline flex items-center gap-1"
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

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }).map((_, i) => {
            const pNum = i + 1;
            return (
              <button
                key={pNum}
                onClick={() => setCurrentPage(pNum)}
                className={`w-7 h-7 rounded text-xs font-semibold transition ${
                  currentPage === pNum
                    ? 'bg-[#0A1E3F] text-white shadow-xs'
                    : 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                {pNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
        onNavigateLeave={() => {
          setSelectedEmployee(null);
          if (onNavigate) onNavigate('leave');
        }}
      />

      {/* 6. Sectioned 5-Step Create Employee Modal */}
      <CreateEmployeeModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          if (onCloseAddModal) onCloseAddModal();
        }}
        onSuccess={() => {
          loadData();
        }}
        entities={entities}
        departments={departments}
      />
    </div>
  );
};
