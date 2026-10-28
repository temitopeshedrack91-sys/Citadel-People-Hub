import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderTree,
  Search,
  Building2,
  Mail,
  Phone,
  User,
  Shield,
  ExternalLink,
  Calendar,
  Clock,
  FileText,
  MapPin,
  CheckCircle2,
  Briefcase,
  Download,
  Send,
  MessageSquare,
} from 'lucide-react';
import { Employee, CitadelEntity, CitadelDepartment } from '../../types';
import { employeeRepository, organizationRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { ListDetailLayout, ListItem } from '../common/ListDetailLayout';
import { StatusPill } from '../common/StatusPill';
import { ProgressRing } from '../common/ProgressRing';
import { Card } from '../common/Card';

export const DirectoryView: React.FC = () => {
  const { selectedEntityFilter } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entities, setEntities] = useState<CitadelEntity[]>([]);
  const [departments, setDepartments] = useState<CitadelDepartment[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
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
      if (empList.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(empList[0].id);
      }
    };
    fetchData();
  }, [selectedEntityFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Tab filter
      if (activeTab === 'cgcc' && emp.entityId !== 'entity-cgcc') return false;
      if (activeTab === 'csog' && emp.entityId !== 'entity-csog') return false;
      if (activeTab === 'holdings' && emp.entityId !== 'entity-holdings') return false;
      if (activeTab === 'full-time' && emp.employmentType !== 'Full-Time') return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = emp.fullName.toLowerCase().includes(q);
        const matchTitle = emp.jobTitle.toLowerCase().includes(q);
        const matchDept = emp.departmentName.toLowerCase().includes(q);
        const matchStaffId = emp.staffId.toLowerCase().includes(q);
        return matchName || matchTitle || matchDept || matchStaffId;
      }
      return true;
    });
  }, [employees, activeTab, search]);

  const filterTabs = [
    { id: 'all', label: 'All Staff', count: employees.length },
    {
      id: 'cgcc',
      label: 'CGCC',
      count: employees.filter((e) => e.entityId === 'entity-cgcc').length,
    },
    {
      id: 'csog',
      label: 'CSOG',
      count: employees.filter((e) => e.entityId === 'entity-csog').length,
    },
    {
      id: 'holdings',
      label: 'Holdings',
      count: employees.filter((e) => e.entityId === 'entity-holdings').length,
    },
  ];

  // Convert employees to ListItem format for Pillio layout
  const listItems: ListItem<Employee>[] = filteredEmployees.map((emp) => ({
    id: emp.id,
    title: emp.fullName,
    subtitle: `${emp.jobTitle} • ${emp.departmentName}`,
    timestamp: emp.staffId,
    avatar: (
      <div className="w-10 h-10 rounded-full bg-[#083E34] text-white font-extrabold flex items-center justify-center text-xs shadow-xs shrink-0">
        {emp.firstName[0]}
        {emp.lastName[0]}
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
          {emp.entityName.includes('Church')
            ? 'CGCC'
            : emp.entityName.includes('School')
            ? 'CSOG'
            : 'Holdings'}
        </span>
      </div>
    ),
    data: emp,
  }));

  const selectedEmployee =
    employees.find((e) => e.id === selectedEmployeeId) || (employees.length > 0 ? employees[0] : null);

  const renderDetail = (item: ListItem<Employee>) => {
    const emp = item.data;
    if (!emp) return null;

    return (
      <div className="space-y-6 animate-fade-in" data-testid="employee-detail-panel">
        {/* Sticky-Style Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-[#083E34] text-white font-black text-xl flex items-center justify-center shadow-md">
                {emp.firstName[0]}
                {emp.lastName[0]}
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {emp.fullName}
                </h3>
                <StatusPill
                  status={emp.status === 'Active' ? 'confirmed' : 'neutral'}
                  label={emp.status}
                  showDot
                  size="sm"
                />
              </div>
              <p className="text-xs font-bold text-[#083E34] mt-0.5">
                {emp.jobTitle}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                <span>{emp.staffId}</span>
                <span>•</span>
                <span>{emp.departmentName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`mailto:${emp.email}`}
              onClick={() => showToast(`Opening email client to ${emp.email}...`)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </a>
            <button
              onClick={() => showToast(`Workforce Dossier for ${emp.fullName} generated (PDF).`)}
              className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-xs border border-[#C59B27] transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
              <span className="font-bold">Export Dossier</span>
            </button>
          </div>
        </div>

        {/* 2-Column Attributes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Contact Information */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Contact & Connectivity</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Official Email:</span>
                <a
                  href={`mailto:${emp.email}`}
                  className="font-bold text-slate-900 hover:text-[#083E34] underline"
                >
                  {emp.email}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Direct Telephone:</span>
                <span className="font-mono font-bold text-slate-900">{emp.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Work Location:</span>
                <span className="font-bold text-slate-800">
                  {emp.entityName.includes('Church')
                    ? 'Citadel Main Campus, Oregun'
                    : emp.entityName.includes('School')
                    ? 'CSOG Academic Wing'
                    : 'Citadel Commercial Complex'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Employment Profile */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              <span>Employment Governance</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Entity Scope:</span>
                <span className="font-bold text-slate-900">{emp.entityName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Department:</span>
                <span className="font-bold text-slate-900">{emp.departmentName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Employment Type:</span>
                <span className="font-bold text-slate-900">{emp.employmentType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Date Onboarded:</span>
                <span className="font-bold text-slate-900">{emp.employmentDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Quota & Attendance Snapshot */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Leave Allocation & Balance</span>
            </h4>
            <StatusPill status="confirmed" label="In Good Standing" size="sm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="flex flex-col items-center sm:items-start">
              <ProgressRing
                value={18}
                max={24}
                label="18d"
                subtext="Remaining"
                type="circle"
              />
            </div>
            <div className="sm:col-span-2 space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Annual Leave:</span>
                <span className="font-bold text-slate-900">18 / 24 Days Available</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Casual Leave:</span>
                <span className="font-bold text-slate-900">5 / 7 Days Available</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Biometric Adherence:</span>
                <span className="font-bold text-emerald-600">96.8% (Gatehouse 01)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attached Verification Documents matching Pillio Detail Pattern */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Personnel Dossier Documents</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Employment Contract</p>
                  <span className="text-[10px] text-slate-500">PDF • 1.4 MB</span>
                </div>
              </div>
              <button
                onClick={() => showToast('Opening Employment Contract preview...')}
                className="text-xs text-[#083E34] hover:underline font-bold"
              >
                View
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">NYSC Discharge / Exemption</p>
                  <span className="text-[10px] text-slate-500">Verified • 850 KB</span>
                </div>
              </div>
              <button
                onClick={() => showToast('Opening NYSC Certificate preview...')}
                className="text-xs text-[#083E34] hover:underline font-bold"
              >
                View
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#083E34] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Title */}
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FolderTree className="w-5 h-5 sm:w-6 sm:h-6 text-[#083E34] shrink-0" />
          <span>Staff Directory</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Find and view staff profiles across Church, School of Government, and Holdings.
        </p>
      </div>

      {/* Reusable ListDetailLayout */}
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
