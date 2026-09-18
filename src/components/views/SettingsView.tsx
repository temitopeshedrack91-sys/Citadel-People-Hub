import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  FolderTree,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Shield,
  Save,
  X,
} from 'lucide-react';
import { CitadelEntity, CitadelDepartment } from '../../types';
import { organizationRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const SettingsView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [entities, setEntities] = useState<CitadelEntity[]>([]);
  const [departments, setDepartments] = useState<CitadelDepartment[]>([]);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);

  // New dept form
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptEntityId, setDeptEntityId] = useState('entity-cgcc');
  const [deptHeadName, setDeptHeadName] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    const [ents, depts] = await Promise.all([
      organizationRepository.getEntities(),
      organizationRepository.getDepartments(),
    ]);
    setEntities(ents);
    setDepartments(depts);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleDeptStatus = async (dept: CitadelDepartment) => {
    const updated = await organizationRepository.toggleDepartmentStatus(dept.id, !dept.isActive);
    setDepartments(departments.map((d) => (d.id === dept.id ? updated : d)));

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Organization Settings',
      action: !dept.isActive ? 'Activated Department' : 'Deactivated Department',
      recordAffectedId: dept.id,
      recordAffectedTitle: dept.name,
      previousValue: dept.isActive ? 'Active' : 'Inactive',
      newValue: !dept.isActive ? 'Active' : 'Inactive',
      severity: 'Warning',
    });
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName || !deptCode) return;

    setIsSubmitting(true);
    try {
      const ent = entities.find((e) => e.id === deptEntityId);
      const created = await organizationRepository.createDepartment({
        name: deptName,
        code: deptCode.toUpperCase(),
        entityId: deptEntityId,
        entityName: ent?.name || 'Citadel',
        headOfDepartmentName: deptHeadName || 'To Be Appointed',
        description: deptDescription,
        isActive: true,
      });

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Organization Settings',
        action: 'Created New Department',
        recordAffectedId: created.id,
        recordAffectedTitle: `${created.name} (${created.code})`,
        previousValue: 'None',
        newValue: `Created in ${created.entityName}`,
        severity: 'Info',
      });

      await loadData();
      setShowAddDeptModal(false);
      setDeptName('');
      setDeptCode('');
      setDeptHeadName('');
      setDeptDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#0A1E3F]" />
            <span>Organization Settings & Entity Governance</span>
          </h2>
          <p className="text-xs text-slate-500">
            Configure Citadel corporate entities, subsidiaries, operational departments, and organizational units.
          </p>
        </div>

        <button
          onClick={() => setShowAddDeptModal(true)}
          className="px-3.5 py-2 rounded-lg bg-[#0A1E3F] text-amber-300 hover:bg-[#152B52] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* 3 Core Entities Display */}
      <div>
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Citadel Corporate Entities & Subsidiaries
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {entities.map((ent) => (
            <div
              key={ent.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-[#0A1E3F]/10 text-[#0A1E3F]">
                    {ent.shortCode}
                  </span>
                  <Badge variant={ent.isActive ? 'success' : 'neutral'}>
                    {ent.isActive ? 'Active Entity' : 'Inactive'}
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-2">{ent.name}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ent.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Code: {ent.code}</span>
                <span className="font-semibold text-slate-700">
                  {departments.filter((d) => d.entityId === ent.id).length} Departments
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Departments Master List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Departments & Divisions Master Table
          </h3>
          <span className="text-[11px] text-slate-500">
            {departments.length} registered operational units
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Parent Entity</th>
                <th className="py-3 px-4">Head of Department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{dept.name}</p>
                    <p className="text-[11px] text-slate-400">{dept.description}</p>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{dept.code}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{dept.entityName}</td>
                  <td className="py-3 px-4 text-slate-700">{dept.headOfDepartmentName}</td>
                  <td className="py-3 px-4">
                    <Badge variant={dept.isActive ? 'success' : 'neutral'}>
                      {dept.isActive ? 'Active' : 'Archived'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleDeptStatus(dept)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded transition ${
                        dept.isActive
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {dept.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0A1E3F] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Create Department</h3>
                <p className="text-xs text-amber-300">PCCM Organizational Structure</p>
              </div>
              <button
                onClick={() => setShowAddDeptModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Parent Entity</label>
                <select
                  value={deptEntityId}
                  onChange={(e) => setDeptEntityId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#0A1E3F] outline-none"
                >
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Department Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Media Production"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#0A1E3F] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. MEDIA"
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase focus:border-[#0A1E3F] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Head of Department / Lead
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pastor David Adeleke"
                  value={deptHeadName}
                  onChange={(e) => setDeptHeadName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#0A1E3F] outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  placeholder="Scope of work and responsibilities..."
                  value={deptDescription}
                  onChange={(e) => setDeptDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#0A1E3F] outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#0A1E3F] text-amber-300 rounded-lg hover:bg-[#152B52] font-semibold transition"
                >
                  {isSubmitting ? 'Saving...' : 'Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
