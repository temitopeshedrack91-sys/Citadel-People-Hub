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

export const DirectoryView: React.FC = () => {
  const { selectedEntityFilter } = useAuth();
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
      setEmployees(empList);
      setEntities(entList);
      setDepartments(deptList);
      setSelectedEmployeeId((prev) => {
        if (prev && empList.some((e) => String(e.id) === String(prev))) {
          return prev;
        }
        return empList.length > 0 ? String(empList[0].id) : null;
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to load directory records.');
    }
  }, [selectedEntityFilter]);

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

  const listItems: ListItem<Employee>[] = filteredEmployees.map((emp) => ({
    id: String(emp.id),
    title: emp.fullName,
    subtitle: `${emp.jobTitle} • ${emp.departmentName || 'Unassigned'}`,
    timestamp: emp.staffId,
    avatar: (
      <div className="w-10 h-10 rounded-full bg-[#083E34] text-white font-extrabold flex items-center justify-center text-xs shadow-xs shrink-0">
        {(emp.firstName?.[0] || emp.fullName?.[0] || 'C')}
        {(emp.lastName?.[0] || '')}
      </div>
    ),
    badge: (
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusPill
          status={emp.status === 'Active' ? 'online' : 'neutral'}
          label={emp.status}
          showDot
          size="sm"
        />
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
          {emp.entityId || 'Citadel'}
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
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#083E34] text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
              {(emp.firstName?.[0] || emp.fullName?.[0] || 'C')}
              {(emp.lastName?.[0] || '')}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">{emp.fullName}</h3>
                <StatusPill
                  status={emp.status === 'Active' ? 'confirmed' : 'neutral'}
                  label={emp.status}
                  showDot
                  size="sm"
                />
              </div>
              <p className="text-xs font-bold text-[#083E34] mt-0.5">{emp.jobTitle}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                <span>{emp.staffId}</span>
                <span>•</span>
                <span>{emp.departmentName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {emp.email && (
              <a
                href={`mailto:${emp.email}`}
                onClick={() => showToast(`Opening email client to ${emp.email}...`)}
                className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </a>
            )}
          </div>
        </div>

        {/* Reporting Hierarchy: Upward Supervisor Chain & Downward Direct Reports */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4" data-testid="directory-hierarchy-card">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-[#083E34]" />
              <span>Reporting Hierarchy</span>
            </h4>
            {hierarchyLoading && (
              <span className="text-[11px] text-slate-400 font-medium">Loading chain...</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upward: Supervisor Chain */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5" data-testid="supervisor-chain-section">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700">
                <ArrowUp className="w-3.5 h-3.5 text-[#083E34]" />
                <span>Supervisor Chain Upward ({supervisorChain.length})</span>
              </div>
              {supervisorChain.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  Top-level role (no direct supervisor assigned).
                </p>
              ) : (
                <div className="space-y-2">
                  {supervisorChain.map((sup, idx) => (
                    <button
                      key={sup.id}
                      type="button"
                      onClick={() => jumpToEmployee(sup.id)}
                      className="w-full text-left p-2.5 rounded-lg bg-white border border-slate-200 hover:border-[#D4AF37] transition flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            {idx === 0 ? 'Direct Supervisor' : `Level +${idx + 1}`}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">{sup.fullName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {sup.jobTitle} • {sup.departmentName || sup.entityName}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{sup.staffId}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Downward: Direct Reports */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5" data-testid="direct-reports-section">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700">
                <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                <span>Direct Reports Downward ({directReports.length})</span>
              </div>
              {directReports.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No direct reports assigned.</p>
              ) : (
                <div className="space-y-2">
                  {directReports.map((rep) => (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => jumpToEmployee(rep.id)}
                      className="w-full text-left p-2.5 rounded-lg bg-white border border-slate-200 hover:border-[#083E34] transition flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">{rep.fullName}</span>
                        <p className="text-[11px] text-slate-500 truncate">
                          {rep.jobTitle} • {rep.departmentName || rep.entityName}
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

        {/* Contact & Placement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Contact &amp; Connectivity</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 font-medium">Official Email:</span>
                <span className="font-bold text-slate-900 truncate">{emp.email || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 font-medium">Direct Telephone:</span>
                <span className="font-mono font-bold text-slate-900">{emp.phone || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 font-medium">Direct Supervisor:</span>
                <span className="font-bold text-slate-800">
                  {supervisorChain[0]?.fullName || emp.managerName || 'None (Top Level)'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              <span>Employment Placement</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 font-medium">Entity:</span>
                <span className="font-bold text-slate-900 text-right">{emp.entityName}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 font-medium">Department:</span>
                <span className="font-bold text-slate-900 text-right">
                  {emp.departmentName}{deptMeta?.code ? ` (${deptMeta.code})` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 font-medium">Employment Type:</span>
                <span className="font-bold text-slate-900">{emp.employmentType || 'Full-Time'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 font-medium">Date Onboarded:</span>
                <span className="font-bold text-slate-900 font-mono">{emp.employmentDate || 'Not recorded'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#083E34] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FolderTree className="w-5 h-5 sm:w-6 sm:h-6 text-[#083E34] shrink-0" />
          <span>Staff Directory &amp; Reporting Hierarchy</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
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
