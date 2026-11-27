import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FolderTree,
  Mail,
  Briefcase,
  ArrowUp,
  ArrowDown,
  GitBranch,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Building2,
} from 'lucide-react';
import { Employee, EmployeeHierarchy, CitadelEntity, CitadelDepartment } from '../../types';
import { employeeRepository, organizationRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { ListDetailLayout, ListItem } from '../common/ListDetailLayout';
import { StatusPill } from '../common/StatusPill';
import { filterEmployeesForUser, maskSensitiveEmployeeData } from '../../utils/rbac';

export const DirectoryView: React.FC = () => {
  const { currentUser, selectedEntityFilter } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entities, setEntities] = useState<CitadelEntity[]>([]);
  const [departments, setDepartments] = useState<CitadelDepartment[]>([]);
  const [search, setSearch] = useState(() => {
    try {
      const pending = sessionStorage.getItem('citadel_pending_search') || '';
      if (pending) sessionStorage.removeItem('citadel_pending_search');
      return pending;
    } catch {
      return '';
    }
  });
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const onGlobalSearch = (ev: Event) => {
      const detail = (ev as CustomEvent<string>).detail;
      if (typeof detail === 'string') {
        setSearch(detail);
        try {
          sessionStorage.removeItem('citadel_pending_search');
        } catch {}
      }
    };
    window.addEventListener('citadel:global-search', onGlobalSearch);
    return () => window.removeEventListener('citadel:global-search', onGlobalSearch);
  }, []);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [hierarchy, setHierarchy] = useState<EmployeeHierarchy | null>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [empList, entList, deptList] = await Promise.all([
        employeeRepository.getAll({
          entityId: selectedEntityFilter === 'all' ? undefined : selectedEntityFilter,
        }),
        organizationRepository.getEntities(),
        organizationRepository.getDepartments(),
      ]);
      const scopedEmps = filterEmployeesForUser(currentUser, empList).map((emp) =>
        maskSensitiveEmployeeData(currentUser, emp)
      );
      setEmployees(scopedEmps);
      setEntities(entList);
      setDepartments(deptList);
      setSelectedEmployeeId((prev) => {
        if (prev && scopedEmps.some((e) => String(e.id) === String(prev))) {
          return prev;
        }
        return scopedEmps.length > 0 ? String(scopedEmps[0].id) : null;
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to load directory records.');
    }
  }, [currentUser, selectedEntityFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const loadHierarchy = useCallback(async (employeeId: string | null) => {
    if (!employeeId || !employeeRepository.getHierarchy) {
      setHierarchy(null);
      return;
    }
    setHierarchyLoading(true);
    try {
      const data = await employeeRepository.getHierarchy(String(employeeId));
      setHierarchy(data);
    } catch {
      setHierarchy(null);
    } finally {
      setHierarchyLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHierarchy(selectedEmployeeId);
  }, [selectedEmployeeId, loadHierarchy]);

  useRealtimeTable('employees', () => {
    void fetchData();
    if (selectedEmployeeId) {
      void loadHierarchy(selectedEmployeeId);
    }
  });

  useRealtimeTable('departments', () => {
    void fetchData();
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (activeTab !== 'all') {
        const empEnt = String(emp.entityId || '').toLowerCase();
        const tabLower = activeTab.toLowerCase();
        if (empEnt !== tabLower && !empEnt.includes(tabLower) && !tabLower.includes(empEnt)) {
          return false;
        }
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          emp.fullName.toLowerCase().includes(q) ||
          emp.jobTitle.toLowerCase().includes(q) ||
          (emp.departmentName || '').toLowerCase().includes(q) ||
          emp.staffId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, activeTab, search]);

  const filterTabs = useMemo(() => {
    const base = [{ id: 'all', label: 'All Staff', count: employees.length }];
    const entityTabs = entities.map((ent) => {
      const entLower = String(ent.id).toLowerCase();
      const count = employees.filter((e) => {
        const ee = String(e.entityId || '').toLowerCase();
        return ee === entLower || ee.includes(entLower) || entLower.includes(ee);
      }).length;
      return {
        id: String(ent.id),
        label: ent.shortCode || ent.name,
        count,
      };
    });
    return [...base, ...entityTabs];
  }, [employees, entities]);

  const resolveEntityCode = useCallback(
    (emp: Employee): string => {
      const match = entities.find(
        (ent) =>
          String(ent.id).toLowerCase() === String(emp.entityId || '').toLowerCase()
      );
      if (match?.shortCode) return match.shortCode;
      if (match?.name) return match.name;
      const raw = String(emp.entityId || '').toLowerCase();
      if (raw.includes('cgcc')) return 'CGCC';
      if (raw.includes('csog')) return 'CSOG';
      if (raw.includes('holding')) return 'Holdings';
      return emp.entityName || 'Citadel';
    },
    [entities]
  );

  const listItems: ListItem<Employee>[] = filteredEmployees.map((emp) => ({
    id: String(emp.id),
    title: emp.fullName,
    subtitle: `${emp.jobTitle} · ${emp.departmentName || 'Unassigned'}`,
    timestamp: emp.staffId,
    avatar: (
      <div className="w-9 h-9 rounded-full bg-[#174EA6] text-white font-semibold flex items-center justify-center text-xs shrink-0">
        {(emp.firstName?.[0] || emp.fullName?.[0] || 'C')}
        {(emp.lastName?.[0] || '')}
      </div>
    ),
    badge: (
      <div className="flex items-center gap-2 flex-wrap">
        <StatusPill
          status={emp.status === 'Active' ? 'online' : 'neutral'}
          label={emp.status}
          showDot
          size="sm"
        />
        <span className="text-[11px] font-medium text-slate-500">
          &middot; {resolveEntityCode(emp)}
        </span>
      </div>
    ),
    data: emp,
  }));

  const jumpToEmployee = (targetId: string) => {
    const inList = employees.some((e) => String(e.id) === String(targetId));
    if (inList) {
      setActiveTab('all');
      setSelectedEmployeeId(String(targetId));
    } else {
      showToast('That supervisor is outside your scoped directory view.');
    }
  };

  const renderDetail = (item: ListItem<Employee>) => {
    const emp = item.data;
    if (!emp) return null;

    const supervisorChain = hierarchy?.supervisorChain || [];
    const directReports = hierarchy?.directReports || [];
    const deptMeta = departments.find((d) => String(d.id) === String(emp.departmentId));

    return (
      <div className="space-y-6 animate-fade-in" data-testid="employee-detail-panel">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-[#174EA6] text-white font-display font-bold text-lg flex items-center justify-center shrink-0">
              {(emp.firstName?.[0] || emp.fullName?.[0] || 'C')}
              {(emp.lastName?.[0] || '')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-lg font-bold text-slate-900 tracking-tight">{emp.fullName}</h3>
                <StatusPill
                  status={emp.status === 'Active' ? 'confirmed' : 'neutral'}
                  label={emp.status}
                  showDot
                  size="sm"
                />
              </div>
              <p className="text-xs font-semibold text-[#174EA6] mt-0.5">{emp.jobTitle}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="font-mono">{emp.staffId}</span>
                <span>&middot;</span>
                <span>{emp.departmentName}</span>
                <span>&middot;</span>
                <span>{resolveEntityCode(emp)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {emp.email && (
              <a
                href={`mailto:${emp.email}`}
                onClick={() => showToast(`Opening email client to ${emp.email}...`)}
                className="px-3.5 py-2 rounded-lg bg-[#174EA6] hover:bg-[#0B1F3A] text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send Email</span>
              </a>
            )}
          </div>
        </div>

        {/* Reporting Hierarchy: Upward Supervisor Chain & Downward Direct Reports */}
        <div className="space-y-4" data-testid="directory-hierarchy-card">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-[#174EA6]" />
              <span>Reporting Hierarchy</span>
            </h4>
            {hierarchyLoading && (
              <span className="text-[11px] text-slate-400">Loading chain...</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            {/* Upward: Supervisor Chain */}
            <div className="space-y-2.5" data-testid="supervisor-chain-section">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                <ArrowUp className="w-3.5 h-3.5 text-[#174EA6]" />
                <span>Supervisor Chain ({supervisorChain.length})</span>
              </div>
              {supervisorChain.length === 0 ? (
                <p className="text-xs text-slate-500 py-1">
                  Top-level role &mdash; no direct supervisor assigned.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {supervisorChain.map((sup, idx) => (
                    <button
                      key={sup.id}
                      type="button"
                      onClick={() => jumpToEmployee(sup.id)}
                      className="w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-semibold text-[#B45309]">
                            {idx === 0 ? 'Direct Supervisor' : `Level +${idx + 1}`}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 truncate">{sup.fullName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {sup.jobTitle} &middot; {sup.departmentName || sup.entityName}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{sup.staffId}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Downward: Direct Reports */}
            <div className="space-y-2.5" data-testid="direct-reports-section">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                <ArrowDown className="w-3.5 h-3.5 text-[#174EA6]" />
                <span>Direct Reports ({directReports.length})</span>
              </div>
              {directReports.length === 0 ? (
                <p className="text-xs text-slate-500 py-1">No direct reports assigned.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {directReports.map((rep) => (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => jumpToEmployee(rep.id)}
                      className="w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-900 block truncate">{rep.fullName}</span>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {rep.jobTitle} &middot; {rep.departmentName || rep.entityName}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{rep.staffId}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact & Placement — clean stacked <dl> avoids label wrapping and premature email truncation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-slate-100">
          <div className="space-y-3">
            <h4 className="font-display text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#174EA6]" />
              <span>Contact &amp; Connectivity</span>
            </h4>
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-[11px] text-slate-500">Official Email</dt>
                <dd className="font-medium text-slate-900 mt-0.5 break-all">{emp.email || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Direct Telephone</dt>
                <dd className="font-mono font-medium text-slate-900 mt-0.5">{emp.phone || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Direct Supervisor</dt>
                <dd className="font-medium text-slate-900 mt-0.5">
                  {supervisorChain[0]?.fullName || emp.managerName || 'None (Top Level)'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3">
            <h4 className="font-display text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#174EA6]" />
              <span>Employment Placement</span>
            </h4>
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-[11px] text-slate-500">Entity</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{emp.entityName}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Department</dt>
                <dd className="font-medium text-slate-900 mt-0.5">
                  {emp.departmentName}{deptMeta?.code ? ` (${deptMeta.code})` : ''}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[11px] text-slate-500">Employment Type</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">{emp.employmentType || 'Full-Time'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">Date Onboarded</dt>
                  <dd className="font-mono font-medium text-slate-900 mt-0.5 tabular-nums">{emp.employmentDate || 'Not recorded'}</dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#174EA6] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-blue-100" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#111827]/25 text-[#111827] text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Staff Directory &amp; Reporting Hierarchy
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Explore employee profiles, upward supervisor chains, and downward direct reports across entities.
        </p>
      </div>

      <ListDetailLayout<Employee>
        items={listItems}
        selectedId={selectedEmployeeId}
        onSelectItem={(item) => setSelectedEmployeeId(item.id)}
        renderDetail={renderDetail}
        searchPlaceholder="Search employees by name, role, department or staff ID..."
        searchValue={search}
        onSearchChange={setSearch}
        filterTabs={filterTabs}
        activeFilterTab={activeTab}
        onFilterTabChange={setActiveTab}
      />
    </div>
  );
};

export default DirectoryView;
