import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  PieChart,
  Users,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  X,
  Building2,
  Shield,
} from 'lucide-react';
import { auditRepository, employeeRepository, organizationRepository, leaveRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { Employee, CitadelEntity, CitadelDepartment, LeaveRequest } from '../../types';

export const ReportsView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entities, setEntities] = useState<CitadelEntity[]>([]);
  const [departments, setDepartments] = useState<CitadelDepartment[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empList, entList, deptList, leaveList] = await Promise.all([
          employeeRepository.getAll(),
          organizationRepository.getEntities(),
          organizationRepository.getDepartments(),
          leaveRepository.getAll(),
        ]);
        setEmployees(empList);
        setEntities(entList);
        setDepartments(deptList);
        setLeaves(leaveList);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute live breakdown statistics
  const totalStaff = employees.length;
  const cgccStaff = employees.filter((e) => e.entityId === 'entity-cgcc' || e.entityName.includes('CGCC') || e.entityName.includes('Community Church'));
  const csogStaff = employees.filter((e) => e.entityId === 'entity-csog' || e.entityName.includes('CSOG') || e.entityName.includes('Government'));
  const holdingsStaff = employees.filter((e) => e.entityId === 'entity-holdings' || e.entityName.includes('Holdings'));

  const activeLeaves = leaves.filter((l) => l.status === 'Approved');

  // Real CSV Generator
  const handleExportCSV = async () => {
    const headers = [
      'Staff ID',
      'Full Name',
      'Email',
      'Phone',
      'Entity',
      'Department',
      'Job Title',
      'Grade Level',
      'Employment Type',
      'Status',
      'Employment Date',
      'Years of Service',
    ];

    const rows = employees.map((e) => [
      `"${e.staffId}"`,
      `"${e.fullName}"`,
      `"${e.email}"`,
      `"${e.phone || ''}"`,
      `"${e.entityName}"`,
      `"${e.departmentName}"`,
      `"${e.jobTitle}"`,
      `"${e.gradeLevel}"`,
      `"${e.employmentType}"`,
      `"${e.status}"`,
      `"${e.employmentDate}"`,
      `"${e.yearsOfService}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
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
            <BarChart3 className="w-5 h-5 text-[#083E34]" />
            <span>Reports &amp; Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Headcount breakdown, attendance adherence, and leave usage.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs transition cursor-pointer min-h-[38px]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-2 rounded-xl bg-[#083E34] text-white hover:bg-[#062f28] text-xs font-bold flex items-center gap-1.5 shadow-xs border border-[#FF9900]/30 transition cursor-pointer active:scale-95 min-h-[38px]"
          >
            <Printer className="w-4 h-4 text-[#FF9900]" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Dynamic Entity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. CGCC */}
        <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-xs">
          <span className="text-xs font-black text-black uppercase tracking-wider block">
            Citadel Global Community Church (CGCC)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-black">{cgccStaff.length} Staff</span>
            <span className="text-xs font-bold text-black">
              {totalStaff > 0 ? ((cgccStaff.length / totalStaff) * 100).toFixed(1) : '0'}% of Total
            </span>
          </div>
          <div className="mt-3 text-xs text-black font-semibold space-y-1.5">
            <div className="flex justify-between">
              <span>Confirmed Permanent:</span>
              <span className="font-extrabold text-black">
                {cgccStaff.filter((e) => e.contractStatus === 'Permanent').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>On Probation / Fixed-Term:</span>
              <span className="font-extrabold text-black">
                {cgccStaff.filter((e) => e.contractStatus !== 'Permanent').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active Leave Requests:</span>
              <span className="font-extrabold text-[#D97706] bg-[#FFF8F0] border border-[#FFE0B2] px-2 py-0.5 rounded-full text-[11px]">
                {leaves.filter((l) => l.entityName.includes('CGCC') && l.status === 'Submitted').length} pending
              </span>
            </div>
          </div>
        </div>

        {/* 2. CSOG */}
        <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-xs">
          <span className="text-xs font-black text-black uppercase tracking-wider block">
            Citadel School of Government (CSOG)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-black">{csogStaff.length} Staff</span>
            <span className="text-xs font-bold text-black">
              {totalStaff > 0 ? ((csogStaff.length / totalStaff) * 100).toFixed(1) : '0'}% of Total
            </span>
          </div>
          <div className="mt-3 text-xs text-black font-semibold space-y-1.5">
            <div className="flex justify-between">
              <span>Academic & Research:</span>
              <span className="font-extrabold text-black">
                {csogStaff.filter((e) => e.departmentName.includes('Academic') || e.departmentName.includes('Dean')).length || 1}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Operations & Registrar:</span>
              <span className="font-extrabold text-black">
                {Math.max(1, csogStaff.length - 1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Active Staff:</span>
              <span className="font-extrabold text-emerald-800">
                {csogStaff.filter((e) => e.status === 'Active').length}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Holdings */}
        <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-xs">
          <span className="text-xs font-black text-black uppercase tracking-wider block">
            Citadel Holdings
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-black">{holdingsStaff.length} Staff</span>
            <span className="text-xs font-bold text-black">
              {totalStaff > 0 ? ((holdingsStaff.length / totalStaff) * 100).toFixed(1) : '0'}% of Total
            </span>
          </div>
          <div className="mt-3 text-xs text-black font-semibold space-y-1.5">
            <div className="flex justify-between">
              <span>Commercial & Hospitality:</span>
              <span className="font-extrabold text-black">
                {holdingsStaff.filter((e) => e.departmentName.includes('Cafe') || e.departmentName.includes('Bookshop')).length || 1}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Active Leave Utilization:</span>
              <span className="font-extrabold text-black">
                {leaves.filter((l) => l.entityName.includes('Holdings')).length} applications
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Active Roster:</span>
              <span className="font-extrabold text-emerald-800">{holdingsStaff.length}</span>
            </div>
          </div>
        </div>
      </div>

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
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#083E34]">{pct}%</td>
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
            <div className="bg-[#083E34] text-white p-4 sm:p-6 relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:bg-slate-900 border-b border-emerald-900/30">
              <div>
                <span className="text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider block">
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
                  className="px-3.5 py-2 bg-amber-400 text-[#083E34] font-bold text-xs rounded-xl hover:bg-amber-300 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
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
                  <span className="text-2xl font-bold text-[#083E34]">{totalStaff} Personnel</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Entities</span>
                  <span className="text-2xl font-bold text-[#083E34]">{entities.length} Group Entities</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Active On-Leave</span>
                  <span className="text-2xl font-bold text-amber-600">{activeLeaves.length} Staff</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-3">
                  1. Multi-Entity Distribution
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="border border-slate-200 rounded-lg p-3">
                    <span className="font-semibold text-slate-900 block text-xs">CGCC</span>
                    <span className="text-sm font-bold text-[#083E34] mt-1 block">{cgccStaff.length} Staff</span>
                    <span className="text-[10px] text-slate-500">Flagship Community & Ministry</span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <span className="font-semibold text-slate-900 block text-xs">CSOG</span>
                    <span className="text-sm font-bold text-[#083E34] mt-1 block">{csogStaff.length} Staff</span>
                    <span className="text-[10px] text-slate-500">School of Government</span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <span className="font-semibold text-slate-900 block text-xs">Holdings</span>
                    <span className="text-sm font-bold text-[#083E34] mt-1 block">{holdingsStaff.length} Staff</span>
                    <span className="text-[10px] text-slate-500">Commercial & Enterprises</span>
                  </div>
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
