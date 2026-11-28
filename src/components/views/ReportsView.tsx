import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  PieChart,
  Users,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  X,
  Building2,
  Shield,
  AlertCircle,
} from 'lucide-react';
import {
  auditRepository,
  employeeRepository,
  organizationRepository,
  leaveRepository,
  reportRepository,
} from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import {
  filterEmployeesForUser,
  filterLeaveRequestsForUser,
  isBusinessHeadUser,
  isDepartmentMatch,
  isEntityMatchForUser,
  isHrOrAdminUser,
  isManagerUser,
  maskSensitiveEmployeeData,
} from '../../utils/rbac';
import {
  buildEmployeeMasterCsv,
  entitiesMatch,
} from '../../utils/orgMatcher';
import { Employee, CitadelEntity, CitadelDepartment, LeaveRequest } from '../../types';

export const ReportsView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entities, setEntities] = useState<CitadelEntity[]>([]);
  const [departments, setDepartments] = useState<CitadelDepartment[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [workforceSummary, setWorkforceSummary] = useState<Record<string, any> | null>(null);
  const [leaveSummary, setLeaveSummary] = useState<Record<string, any> | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const isHrOrAdmin = isHrOrAdminUser(currentUser);
  const isBizHead = isBusinessHeadUser(currentUser);
  const isMgr = isManagerUser(currentUser);
  const isViewer = currentRole === 'VIEWER';
  const canViewReports = isHrOrAdmin || isBizHead || isMgr || isViewer;

  const fetchData = React.useCallback(async () => {
    setReportError(null);
    if (!canViewReports) {
      setReportError('Forbidden: Elevated HR, Business Head, or Manager privileges are required to view reports.');
      setLoading(false);
      return;
    }

    try {
      const [empList, entList, deptList, leaveList, wfRep, lvRep] = await Promise.all([
        employeeRepository.getAll(),
        organizationRepository.getEntities(),
        organizationRepository.getDepartments(),
        leaveRepository.getAll(),
        reportRepository.getWorkforceReport().catch(() => null),
        reportRepository.getLeaveReport().catch(() => null),
      ]);

      const scopedEmployees = filterEmployeesForUser(currentUser, empList).map((emp) =>
        maskSensitiveEmployeeData(currentUser, emp)
      );
      const scopedLeaves = filterLeaveRequestsForUser(currentUser, leaveList);
      const scopedEntities = isBizHead
        ? entList.filter((ent) =>
            isEntityMatchForUser(currentUser, { entityId: ent.id, entityName: ent.name })
          )
        : isMgr && !isHrOrAdmin
        ? entList.filter((ent) =>
            scopedEmployees.some(
              (e) =>
                entitiesMatch(e.entityId, ent.id) ||
                entitiesMatch(e.entityName, ent.shortCode) ||
                entitiesMatch(e.entityName, ent.name)
            )
          )
        : entList;
      const scopedDepartments = isBizHead
        ? deptList.filter((d) => isEntityMatchForUser(currentUser, d))
        : isMgr && !isHrOrAdmin
        ? deptList.filter(
            (d) =>
              scopedEmployees.some(
                (e) =>
                  e.departmentId === d.id || isDepartmentMatch(e.departmentName, d.name)
              ) || isDepartmentMatch(currentUser.departmentName, d.name)
          )
        : deptList;

      setEmployees(scopedEmployees);
      setEntities(scopedEntities);
      setDepartments(scopedDepartments);
      setLeaves(scopedLeaves);
      setWorkforceSummary(wfRep);
      setLeaveSummary(lvRep);
    } catch (err: any) {
      setReportError(err?.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }, [canViewReports, currentUser, isBizHead, isHrOrAdmin, isMgr]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useRealtimeTable('employees', () => {
    void fetchData();
  });

  useRealtimeTable('leave_requests', () => {
    void fetchData();
  });

  const matchEntity = (emp: { entityId?: string; entityName?: string }, ent: CitadelEntity) =>
    entitiesMatch(emp.entityId, ent.id) ||
    entitiesMatch(emp.entityName, ent.shortCode) ||
    entitiesMatch(emp.entityName, ent.name);

  // Compute live breakdown statistics
  const totalStaff = employees.length;

  const activeLeaves = leaves.filter((l) => l.status === 'Approved');
  const pendingLeaves = leaves.filter(
    (l) => l.status === 'Submitted' || l.status === 'Pending Review'
  );

  // Formula-safe RFC 4180 CSV Generator
  const handleExportCSV = async () => {
    const csvContent = buildEmployeeMasterCsv(employees, { includeSensitive: isHrOrAdmin });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `Citadel_Workforce_Census_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Reports & Analytics',
      action: 'Exported CSV Workforce Census',
      recordAffectedId: `rep-${Date.now()}`,
      recordAffectedTitle: `Citadel Workforce Census (${employees.length} records)`,
      previousValue: 'None',
      newValue: 'Exported CSV file',
      severity: 'Info',
    });

    setExportNotice(`Generated and downloaded CSV census for ${employees.length} staff records.`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handlePrintPDF = async () => {
    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Reports & Analytics',
      action: 'Generated Executive PDF Report',
      recordAffectedId: `rep-${Date.now()}`,
      recordAffectedTitle: `Citadel Executive Workforce Dossier`,
      previousValue: 'None',
      newValue: 'Printed / PDF export',
      severity: 'Info',
    });

    setShowPrintModal(true);
  };

  return (
    <div className="space-y-5">
      {reportError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{reportError}</span>
        </div>
      )}

      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportNotice}</span>
          </div>
          <button onClick={() => setExportNotice(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#174EA6]" />
            <span>
              {isBizHead
                ? `${currentUser.entityName || 'Entity'} HR Reports`
                : isMgr && !isHrOrAdmin
                ? `${currentUser.departmentName || 'Team'} HR Reports`
                : 'Reports & Analytics'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isBizHead
              ? `Workforce breakdown, leave utilization, and department metrics scoped to ${currentUser.entityName}.`
              : isMgr && !isHrOrAdmin
              ? `Direct report & departmental workforce analytics scoped to ${currentUser.departmentName || 'your reporting team'}.`
              : 'Headcount breakdown, attendance adherence, and leave usage.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs transition cursor-pointer min-h-[38px]"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#174EA6]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-2 rounded-xl bg-[#174EA6] text-white hover:bg-[#0B1F3A] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 min-h-[38px]"
          >
            <Printer className="w-4 h-4 text-white stroke-[2.25]" />
            <span className="font-semibold">Print Report</span>
          </button>
        </div>
      </div>

      {/* Dynamic Entity Cards */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          entities.length === 1
            ? 'md:grid-cols-1'
            : entities.length === 2
            ? 'md:grid-cols-2'
            : 'md:grid-cols-3'
        }`}
      >
        {entities.length > 0 ? (
          entities.map((ent) => {
            const entStaff = employees.filter((e) => matchEntity(e, ent));
            const entLeaves = leaves.filter(
              (l) =>
                (l.entityName || '').toLowerCase().includes(ent.shortCode.toLowerCase()) ||
                (l.entityName || '').toLowerCase() === ent.name.toLowerCase()
            );
            const entPending = entLeaves.filter(
              (l) => l.status === 'Submitted' || l.status === 'Pending Review'
            );
            return (
              <div key={ent.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {ent.name} ({ent.shortCode})
                </span>
                <div className="mt-2 flex items-baseline justify-between tabular-nums">
                  <span className="text-2xl font-extrabold text-slate-900">{entStaff.length} Staff</span>
                  <span className="text-xs font-semibold text-slate-600">
                    {totalStaff > 0 ? ((entStaff.length / totalStaff) * 100).toFixed(1) : '0'}% of Total
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-700 font-medium space-y-1.5 tabular-nums">
                  <div className="flex justify-between">
                    <span>Active Personnel:</span>
                    <span className="font-bold text-emerald-700">
                      {entStaff.filter((e) => e.status === 'Active' || e.status === 'Confirmed').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Leave Requests:</span>
                    <span className="font-bold text-slate-900">{entLeaves.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pending Leave Requests:</span>
                    <span className="font-bold text-[#D97706] bg-[#FAF5EB] border border-[#F2E4B8] px-2 py-0.5 rounded-full text-[11px]">
                      {entPending.length} pending
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-3 bg-white rounded-xl border border-slate-200 p-5 text-xs text-slate-500">
            {loading ? 'Loading organizational report breakdown...' : 'No entity data available.'}
          </div>
        )}
      </div>

      {/* Live Report Summary Strip */}
      {(workforceSummary || leaveSummary || !isHrOrAdmin) && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">
              {isHrOrAdmin ? 'Backend Staff Total' : 'Scoped Staff Total'}
            </span>
            <span className="text-base font-black text-slate-900">
              {isHrOrAdmin
                ? workforceSummary?.totalEmployees ?? workforceSummary?.totalStaff ?? totalStaff
                : totalStaff}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Total Leave Requests</span>
            <span className="text-base font-black text-slate-900">
              {isHrOrAdmin && leaveSummary?.requestsByStatus
                ? Object.values(leaveSummary.requestsByStatus as Record<string, number>).reduce(
                    (sum, count) => sum + Number(count || 0),
                    0
                  )
                : isHrOrAdmin
                ? leaveSummary?.totalRequests ?? leaves.length
                : leaves.length}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Pending Two-Stage</span>
            <span className="text-base font-black text-amber-700">
              {pendingLeaves.length}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Approved Requests</span>
            <span className="text-base font-black text-emerald-700">
              {activeLeaves.length}
            </span>
          </div>
        </div>
      )}

      {/* Department Headcount Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Departmental Distribution & Staff Ratio
          </h3>
          <span className="text-xs text-slate-500 font-bold">
            {departments.length} Active Departments
          </span>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-black uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Department</th>
                <th className="py-3 px-4 whitespace-nowrap">Entity</th>
                <th className="py-3 px-4 whitespace-nowrap">Head of Department</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Headcount</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.slice(0, 10).map((d) => {
                const count = employees.filter((e) => e.departmentId === d.id || e.departmentName === d.name).length;
                const pct = totalStaff > 0 ? ((count / totalStaff) * 100).toFixed(1) : '0';
                return (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{d.name}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{d.entityName}</td>
                    <td className="py-3 px-4 text-slate-800 font-semibold">{d.headOfDepartment || d.headOfDepartmentName || 'To Be Appointed'}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">{count}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#174EA6]">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Executive Dossier Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-fade-in print:p-0 print:bg-white">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col print:shadow-none print:border-none print:m-0">
            <div className="bg-[#0B1F3A] text-white p-4 sm:p-6 relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:bg-slate-900 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-slate-300 font-bold uppercase tracking-wider block">
                  Citadel People Hub • PCCM Executive Dossier
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  Comprehensive Workforce Analytics & Census Report
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Generated on {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} • Authorized by {currentUser.name}
                </p>
              </div>

              <div className="flex items-center gap-2 print:hidden shrink-0">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-[#174EA6] text-white font-semibold text-xs rounded-xl hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6 text-xs text-slate-800 print:text-black overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 border-b pb-5 border-slate-200">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Headcount</span>
                  <span className="text-2xl font-bold text-slate-900">{totalStaff} Personnel</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Entities</span>
                  <span className="text-2xl font-bold text-slate-900">{entities.length} Group Entities</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Active On-Leave</span>
                  <span className="text-2xl font-bold text-amber-600">{activeLeaves.length} Staff</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-3">
                  1. {isBizHead ? 'Business Entity Distribution' : 'Organizational Distribution'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {entities.map((ent) => {
                    const count = employees.filter((e) => matchEntity(e, ent)).length;
                    return (
                      <div key={ent.id} className="border border-slate-200 rounded-lg p-3">
                        <span className="font-semibold text-slate-900 block text-xs">{ent.shortCode}</span>
                        <span className="text-sm font-bold text-[#174EA6] mt-1 block">{count} Staff</span>
                        <span className="text-[10px] text-slate-500">{ent.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-3">
                  2. Personnel Census Snapshot (Top Records)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border border-slate-200 min-w-[550px]">
                    <thead className="bg-slate-100 font-bold">
                      <tr>
                        <th className="p-2 border">Staff ID</th>
                        <th className="p-2 border">Full Name</th>
                        <th className="p-2 border">Entity</th>
                        <th className="p-2 border">Department</th>
                        <th className="p-2 border">Role</th>
                        <th className="p-2 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.slice(0, 8).map((e) => (
                        <tr key={e.id} className="border-b">
                          <td className="p-2 border font-mono">{e.staffId}</td>
                          <td className="p-2 border font-medium">{e.fullName}</td>
                          <td className="p-2 border">{e.entityName}</td>
                          <td className="p-2 border">{e.departmentName}</td>
                          <td className="p-2 border">{e.jobTitle}</td>
                          <td className="p-2 border">{e.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
                <span>Citadel People Hub • Confidential HR Document</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
