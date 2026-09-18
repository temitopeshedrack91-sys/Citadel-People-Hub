import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Search,
  Building2,
  Mail,
  Phone,
  User,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { Employee, CitadelEntity, CitadelDepartment } from '../../types';
import { employeeRepository, organizationRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const DirectoryView: React.FC = () => {
  const { selectedEntityFilter } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entities, setEntities] = useState<CitadelEntity[]>([]);
  const [departments, setDepartments] = useState<CitadelDepartment[]>([]);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState(selectedEntityFilter === 'all' ? '' : selectedEntityFilter);

  useEffect(() => {
    const fetchData = async () => {
      const [empList, entList, deptList] = await Promise.all([
        employeeRepository.getAll({
          entityId: entityFilter || undefined,
          search: search || undefined,
        }),
        organizationRepository.getEntities(),
        organizationRepository.getDepartments(),
      ]);
      setEmployees(empList);
      setEntities(entList);
      setDepartments(deptList);
    };
    fetchData();
  }, [entityFilter, search]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
          <FolderTree className="w-5 h-5 text-[#0A1E3F]" />
          <span>Citadel Employee Directory</span>
        </h2>
        <p className="text-xs text-slate-500">
          Internal corporate contact directory for cross-departmental collaboration across Citadel entities.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, job title, department, or staff ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0A1E3F]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Citadel Entities</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.shortCode} - {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0A1E3F] text-amber-300 font-bold flex items-center justify-center text-xs shadow-xs">
                    {emp.firstName[0]}
                    {emp.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{emp.fullName}</h3>
                    <p className="text-[11px] font-medium text-[#0A1E3F]">{emp.jobTitle}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{emp.staffId}</span>
                  </div>
                </div>
                <Badge
                  variant={
                    emp.entityId === 'entity-cgcc'
                      ? 'citadel'
                      : emp.entityId === 'entity-csog'
                      ? 'info'
                      : 'warning'
                  }
                >
                  {emp.entityName.includes('Church')
                    ? 'CGCC'
                    : emp.entityName.includes('School')
                    ? 'CSOG'
                    : 'Holdings'}
                </Badge>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] space-y-1.5 text-slate-600">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{emp.departmentName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a
                    href={`mailto:${emp.email}`}
                    className="text-slate-600 hover:text-[#0A1E3F] truncate hover:underline"
                  >
                    {emp.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a href={`tel:${emp.phone}`} className="text-slate-600 font-mono text-[10px]">
                    {emp.phone}
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400">
              <span>{emp.employmentType}</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                {emp.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
