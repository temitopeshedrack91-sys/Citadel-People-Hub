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
  Users,
  ShieldCheck,
  Mail,
  Network,
  ArrowUpRight,
  Award,
  Lock,
  Key,
  Info,
  Layers,
  Clock,
  FileText,
} from 'lucide-react';
import { CitadelEntity, CitadelDepartment } from '../../types';
import { organizationRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useOrganizationCatalog } from '../../hooks/useOrganizationCatalog';
import { filterDepartmentsByEntity, findMatchingEntity } from '../../utils/orgMatcher';
import { Badge } from '../common/Badge';
import { CITADEL_GEC_ROSTER, CITADEL_ROLES_MATRIX, CITADEL_V1_REQUIREMENTS_FORM } from '../../data/mockData';

export const SettingsView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'entities_depts' | 'gec_roster' | 'roles_matrix' | 'requirements_form'>('entities_depts');
  const {
    entities,
    departments,
    loading: catalogLoading,
    error: catalogError,
    reload: reloadCatalog,
  } = useOrganizationCatalog();

  const [entityTableFilter, setEntityTableFilter] = useState<string>('all');
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<CitadelDepartment | null>(null);

  // Create / Edit dept form
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptEntityId, setDeptEntityId] = useState('');
  const [deptHeadName, setDeptHeadName] = useState('');
  const [deptBusinessHead, setDeptBusinessHead] = useState('');
  const [deptHeadEmail, setDeptHeadEmail] = useState('');
  const [deptReportsTo, setDeptReportsTo] = useState('');
  const [deptIsGecShared, setDeptIsGecShared] = useState(false);
  const [deptDescription, setDeptDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (entities.length > 0) {
      setDeptEntityId((prev) =>
        prev && findMatchingEntity(entities, prev) ? prev : String(entities[0].id)
      );
    }
  }, [entities]);

  const visibleDepartments = React.useMemo(
    () =>
      entityTableFilter === 'all'
        ? departments
        : filterDepartmentsByEntity(departments, entityTableFilter),
    [departments, entityTableFilter]
  );

  const openCreateDepartmentModal = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptCode('');
    setDeptEntityId(
      entityTableFilter !== 'all'
        ? entityTableFilter
        : entities[0]?.id
        ? String(entities[0].id)
        : ''
    );
    setDeptHeadName('');
    setDeptBusinessHead('');
    setDeptHeadEmail('');
    setDeptReportsTo('');
    setDeptIsGecShared(false);
    setDeptDescription('');
    setFormError(null);
    setShowDeptModal(true);
  };

  const openEditDepartmentModal = (dept: CitadelDepartment) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    const matchedEntity = findMatchingEntity(entities, dept.entityId);
    setDeptEntityId(matchedEntity ? String(matchedEntity.id) : String(dept.entityId));
    setDeptHeadName(dept.headOfDepartmentName || dept.headOfDepartment || '');
    setDeptBusinessHead(dept.businessHeadName || '');
    setDeptHeadEmail(dept.headEmail || '');
    setDeptReportsTo(dept.reportsTo || '');
    setDeptIsGecShared(Boolean(dept.isGecSharedService));
    setDeptDescription(dept.description || '');
    setFormError(null);
    setShowDeptModal(true);
  };

  const handleToggleDeptStatus = async (dept: CitadelDepartment) => {
    await organizationRepository.toggleDepartmentStatus(dept.id, !dept.isActive);
    await reloadCatalog();

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

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!deptName.trim() || !deptCode.trim() || !deptEntityId) {
      setFormError('Parent entity, department name, and code are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ent = findMatchingEntity(entities, deptEntityId);
      const payload = {
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        entityId: ent ? String(ent.id) : deptEntityId,
        entityName: ent?.name || 'Citadel',
        headOfDepartment: deptHeadName.trim() || 'To Be Appointed',
        headOfDepartmentName: deptHeadName.trim() || 'To Be Appointed',
        businessHeadName: deptBusinessHead.trim() || ent?.headOfEntity || undefined,
        headEmail: deptHeadEmail.trim() || null,
        reportsTo: deptReportsTo.trim() || undefined,
        isGecSharedService: deptIsGecShared,
        description: deptDescription.trim(),
      };

      if (editingDept) {
        const updated = await organizationRepository.updateDepartment(editingDept.id, payload);
        await auditRepository.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentRole,
          module: 'Organization Settings',
          action: 'Updated Department',
          recordAffectedId: updated.id,
          recordAffectedTitle: `${updated.name} (${updated.code})`,
          previousValue: `${editingDept.name} (${editingDept.code})`,
          newValue: `${updated.name} · Head: ${updated.headOfDepartmentName || 'TBD'}`,
          severity: 'Info',
        });
      } else {
        const created = await organizationRepository.createDepartment({
          ...payload,
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
      }

      await reloadCatalog();
      setShowDeptModal(false);
      setEditingDept(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save department.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-black tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#083E34]" />
            <span>Organization Settings &amp; Entity Governance</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Citadel institutional hierarchy across CGCC, Citadel School of Government, and Citadel Holdings.
          </p>
        </div>

        {activeTab === 'entities_depts' && (
          <button
            type="button"
            onClick={openCreateDepartmentModal}
            className="px-3.5 py-2 rounded-xl bg-[#D4AF37] text-slate-950 hover:bg-[#C59B27] text-xs font-bold flex items-center gap-1.5 shadow-xs border border-[#C59B27] transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span className="font-bold">Add Department</span>
          </button>
        )}
      </div>

      {/* Main Settings Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar scroll-smooth" role="tablist">
        <button
          onClick={() => setActiveTab('entities_depts')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'entities_depts'
              ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Entities &amp; Departments</span>
        </button>

        <button
          onClick={() => setActiveTab('gec_roster')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'gec_roster'
              ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
          }`}
        >
          <Users className={`w-3.5 h-3.5 ${activeTab === 'gec_roster' ? 'text-slate-950' : 'text-[#D4AF37]'}`} />
          <span>Group Executive Council (GEC) &amp; Shared Services (Sheet 3)</span>
        </button>

        <button
          onClick={() => setActiveTab('roles_matrix')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'roles_matrix'
              ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
          }`}
        >
          <ShieldCheck className={`w-3.5 h-3.5 ${activeTab === 'roles_matrix' ? 'text-slate-950' : 'text-emerald-500'}`} />
          <span>Roles &amp; Permissions Governance Matrix (Sheet 4)</span>
        </button>

        <button
          onClick={() => setActiveTab('requirements_form')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'requirements_form'
              ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
          }`}
        >
          <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === 'requirements_form' ? 'text-slate-950' : 'text-[#D4AF37]'}`} />
          <span>V1 Requirements</span>
        </button>
      </div>

      {activeTab === 'entities_depts' && (
        <div className="space-y-5">
          {catalogError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
              <span className="font-semibold">{catalogError}</span>
              <button
                type="button"
                onClick={() => void reloadCatalog()}
                className="px-3 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 font-bold hover:bg-rose-100 transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* 3 Core Entities Display */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Citadel Corporate Entities &amp; Subsidiaries ({entities.length})
              </h3>
              {entityTableFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setEntityTableFilter('all')}
                  className="text-xs font-bold text-[#083E34] hover:underline cursor-pointer"
                >
                  Show all entities
                </button>
              )}
            </div>

            {catalogLoading && entities.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
                ))}
              </div>
            ) : entities.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500">
                No organizational entities found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {entities.map((ent) => {
                  const entDeptCount = filterDepartmentsByEntity(departments, ent.id).length;
                  const isSelected = entityTableFilter !== 'all' && String(entityTableFilter) === String(ent.id);
                  return (
                    <button
                      type="button"
                      key={ent.id}
                      onClick={() =>
                        setEntityTableFilter((prev) =>
                          String(prev) === String(ent.id) ? 'all' : String(ent.id)
                        )
                      }
                      className={`text-left bg-white rounded-2xl border p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex flex-col justify-between transition cursor-pointer ${
                        isSelected
                          ? 'border-[#083E34] ring-2 ring-[#083E34]/15'
                          : 'border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold bg-[#083E34]/10 text-[#083E34]">
                            {ent.shortCode || ent.id}
                          </span>
                          <Badge variant={ent.isActive ? 'success' : 'neutral'}>
                            {ent.isActive ? 'Active Entity' : 'Inactive'}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-2.5">{ent.name}</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">{ent.description}</p>
                        {ent.headOfEntity && (
                          <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
                            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">
                              Business Head(s)
                            </span>
                            <span className="font-bold text-slate-800">{ent.headOfEntity}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs w-full">
                        <span className="font-semibold text-slate-500">
                          {ent.employeeCount !== undefined ? `${ent.employeeCount} Staff` : ent.shortCode}
                        </span>
                        <span className="font-bold text-[#083E34]">
                          {entDeptCount} {entDeptCount === 1 ? 'Department' : 'Departments'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Departments Master List */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Departments &amp; Reporting Lines Master Table
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Organizational units, department heads, business heads, and GEC shared services across all 3 entities
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <select
                  aria-label="Filter departments by entity"
                  value={entityTableFilter}
                  onChange={(e) => setEntityTableFilter(e.target.value)}
                  disabled={catalogLoading}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-[#083E34] cursor-pointer"
                >
                  <option value="all">All Entities ({departments.length})</option>
                  {entities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name} ({filterDepartmentsByEntity(departments, ent.id).length})
                    </option>
                  ))}
                </select>
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                  {visibleDepartments.length} shown
                </span>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[880px]">
                <thead className="bg-slate-50/90 text-slate-500 border-b border-slate-200/80 uppercase tracking-wider text-[11px] font-black">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Department &amp; Code</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Parent Entity</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Department Head</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Business Head &amp; Reporting Line</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {catalogLoading && visibleDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Loading organizational departments...
                      </td>
                    </tr>
                  ) : visibleDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No departments found for the selected entity.
                      </td>
                    </tr>
                  ) : (
                    visibleDepartments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">{dept.name}</p>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {dept.code}
                            </span>
                            {dept.isGecSharedService && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                GEC Shared
                              </span>
                            )}
                          </div>
                          {dept.description && (
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">{dept.description}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{dept.entityName}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">
                            {dept.headOfDepartmentName || dept.headOfDepartment || 'To Be Appointed'}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {dept.headEmail ? dept.headEmail : 'Head email: TBD'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">
                            {dept.businessHeadName || 'Entity Business Head'}
                          </p>
                          {dept.reportsTo && (
                            <p className="text-[11px] text-slate-500 mt-0.5">Reports to: {dept.reportsTo}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant={dept.isActive ? 'success' : 'neutral'}>
                              {dept.isActive ? 'Active' : 'Archived'}
                            </Badge>
                            {dept.employeeCount !== undefined && (
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {dept.employeeCount} staff
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditDepartmentModal(dept)}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer inline-flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDeptStatus(dept)}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                dept.isActive
                                  ? 'border-slate-200 text-slate-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {dept.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GEC & Shared Services Tab (Extracted from Workbook Sheet 3) */}
      {activeTab === 'gec_roster' && (
        <div className="space-y-5">
          {/* Highlights Info Banner */}
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                Citadel Group Executive Council (GEC) &amp; Shared Services Governance
              </h3>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed font-medium">
                The Group Executive Council oversees strategic alignment across CGCC, CSOG, and Citadel Holdings. Central Shared Services—including <span className="font-bold text-amber-950">People, Culture &amp; Change Management (PCCM)</span>, <span className="font-bold text-amber-950">Campus Security</span>, <span className="font-bold text-amber-950">Administration &amp; Protocol</span>, <span className="font-bold text-amber-950">ICT</span>, and <span className="font-bold text-amber-950">Transport &amp; Logistics</span>—operate across all Citadel entities under designated GEC reporting lines.
              </p>
            </div>
          </div>

          {/* GEC Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CITADEL_GEC_ROSTER.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          member.roleType === 'Business Head'
                            ? 'bg-[#083E34] text-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          {member.roleType}
                        </span>
                        {member.roleType === 'Business Head' && (
                          <span className="text-[10px] font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-300">
                            GEC Member
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-900 mt-2">{member.name}</h4>
                      <p className="text-xs font-bold text-[#083E34]">{member.title}</p>
                    </div>
                  </div>

                  <div className="mt-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                    <div>
                      <span className="text-slate-500 font-semibold block text-[10px]">Governance Portfolio:</span>
                      <span className="font-bold text-slate-800">{member.portfolio}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block text-[10px]">Entity Jurisdiction:</span>
                      <span className="font-semibold text-slate-700">{member.entityScope}</span>
                    </div>
                    {member.reportingLine && (
                      <div>
                        <span className="text-slate-500 font-semibold block text-[10px]">Reporting Structure:</span>
                        <span className="font-semibold text-slate-700">{member.reportingLine}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <a
                    href={`mailto:${member.email}`}
                    className="inline-flex items-center gap-1.5 font-bold text-[#083E34] hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{member.email}</span>
                  </a>
                  <span className="text-[10px] text-slate-400 font-medium">Citadel Official</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5-Tier Roles & Permissions Governance Matrix (Extracted from Workbook Sheet 4) */}
      {activeTab === 'roles_matrix' && (
        <div className="space-y-5">
          {/* Matrix Header Banner */}
          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-3 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-blue-800 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
                Citadel 5-Tier Role &amp; Permission Governance Charter (Workbook Sheet 4)
              </h3>
              <p className="text-xs text-blue-900 mt-1 leading-relaxed font-medium">
                Access to Citadel People Hub is strictly partitioned into 5 hierarchical tiers. PCCM Super Admin maintains full multi-entity oversight; Business Heads govern entity subsidiaries; HODs manage departmental leaves and team attendance; Employees utilize self-service; and System Admins manage technical biometrics infrastructure without sensitive HR payroll access.
              </p>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  5-Tier Access &amp; Authorization Permissions Matrix
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Cross-cutting permission rules from Super Admin to Self-Service Employee</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-[#083E34] text-[#D4AF37] rounded-lg shadow-xs">
                5 Standard Tiers
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[900px]">
                <thead className="bg-[#083E34] text-white uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">Tier</th>
                    <th className="py-3.5 px-4">Role Title &amp; Code</th>
                    <th className="py-3.5 px-4">GEC Governance Status</th>
                    <th className="py-3.5 px-4">Platform Scope</th>
                    <th className="py-3.5 px-4">Leave Approval Authority</th>
                    <th className="py-3.5 px-4">Attendance &amp; Biometrics Visibility</th>
                    <th className="py-3.5 px-4">Audit Trail Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CITADEL_ROLES_MATRIX.map((tier) => (
                    <tr key={tier.tierNumber} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 text-center">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-black text-xs inline-flex items-center justify-center border border-slate-200">
                          {tier.tierNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        <span>{tier.roleName}</span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          Code: {tier.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          tier.gecStatus.includes('GEC')
                            ? 'bg-[#FAF5EB] text-[#B45309] border border-[#F2E4B8]'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {tier.gecStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 text-[11px] max-w-xs">
                        {tier.scopeOfAccess}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] font-medium leading-relaxed max-w-xs">
                        {tier.leaveApprovalAuthority}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] font-medium leading-relaxed max-w-xs">
                        {tier.attendanceAccess}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] font-medium leading-relaxed max-w-xs">
                        {tier.auditTrailAccess}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {activeTab === 'requirements_form' && (
        <div className="space-y-5">
          <div className="p-5 bg-[#083E34] border border-[#06241E] rounded-2xl flex items-start gap-3 text-white shadow-xs">
            <Info className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                V1 Requirement Capture &amp; Operational Workflow Summary
              </h3>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed font-medium">
                This summary translates the onboarding and governance responses captured in the requirements form into the Citadel People Hub operating model.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Approval structure</p>
              <p className="mt-2 text-sm font-black text-slate-900">{CITADEL_V1_REQUIREMENTS_FORM.approvalStructure}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">HR-managed recruitment</p>
              <p className="mt-2 text-sm font-black text-slate-900">{CITADEL_V1_REQUIREMENTS_FORM.hrManagedRecruitment}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Microsoft 365 authorization</p>
              <p className="mt-2 text-sm font-black text-slate-900">{CITADEL_V1_REQUIREMENTS_FORM.microsoft365Authorization}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Business head structure</h4>
              <ul className="mt-3 space-y-2 text-xs text-slate-700 font-medium">
                {CITADEL_V1_REQUIREMENTS_FORM.businessHeadStructure.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Shared service reporting</h4>
              <ul className="mt-3 space-y-2 text-xs text-slate-700 font-medium">
                {CITADEL_V1_REQUIREMENTS_FORM.sharedServices.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Network className="w-3.5 h-3.5 text-[#083E34] mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Required onboarding documents</h4>
              <ul className="mt-3 space-y-2 text-xs text-slate-700 font-medium">
                {CITADEL_V1_REQUIREMENTS_FORM.newEmployeeDocuments.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Attendance rules captured</h4>
              <ul className="mt-3 space-y-2 text-xs text-slate-700 font-medium">
                {CITADEL_V1_REQUIREMENTS_FORM.attendanceRules.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-700 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">HR-only information</h4>
              <ul className="mt-3 space-y-2 text-xs text-slate-700 font-medium">
                {CITADEL_V1_REQUIREMENTS_FORM.hrOnlyInformation.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Lock className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Document storage &amp; links</h4>
              <ul className="mt-3 space-y-3 text-xs text-slate-700 font-medium">
                <li className="flex items-start gap-2">
                  <FolderTree className="w-3.5 h-3.5 text-emerald-700 mt-0.5 shrink-0" />
                  <span><span className="font-black text-slate-900">Storage model:</span> {CITADEL_V1_REQUIREMENTS_FORM.employeeAndHrDocumentStorage}</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="w-3.5 h-3.5 text-violet-700 mt-0.5 shrink-0" />
                  <span><span className="font-black text-slate-900">Template upload:</span> {CITADEL_V1_REQUIREMENTS_FORM.templateUploadLink}</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpRight className="w-3.5 h-3.5 text-violet-700 mt-0.5 shrink-0" />
                  <span><span className="font-black text-slate-900">Onboarding process:</span> {CITADEL_V1_REQUIREMENTS_FORM.onboardingProcessLink}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">V1 feature priority mapping</h3>
                <p className="text-[11px] text-slate-500 font-medium">Must-have, can-late, and future-phase requirement cycle</p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 bg-[#083E34] text-amber-300 rounded-lg shadow-xs">V1 Release Priority</span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-[#083E34] text-white uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Feature</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CITADEL_V1_REQUIREMENTS_FORM.featurePriorities.map((feature) => (
                    <tr key={feature.feature} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-black text-slate-900">{feature.feature}</td>
                      <td className="py-3 px-4 font-bold text-slate-700">{feature.priority}</td>
                      <td className="py-3 px-4 font-mono text-[11px]">{feature.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4.5 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-amber-700" />
              <span className="font-black uppercase tracking-wider">Additional note</span>
            </div>
            <p className="font-medium leading-relaxed">{CITADEL_V1_REQUIREMENTS_FORM.additionalRequirements}</p>
            <p className="mt-2 font-black">Confirmation: {CITADEL_V1_REQUIREMENTS_FORM.confirmation}</p>
          </div>
        </div>
      )}

      {/* Add / Edit Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="bg-[#083E34] text-white p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingDept ? 'Edit Department & Governance' : 'Create Department'}
                </h3>
                <p className="text-xs text-amber-300 font-medium">PCCM Organizational Structure (Sheet 3)</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeptModal(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg transition cursor-pointer"
                aria-label="Close department modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Parent Entity *</label>
                <select
                  value={deptEntityId}
                  onChange={(e) => setDeptEntityId(e.target.value)}
                  disabled={entities.length === 0}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:border-[#083E34] focus:ring-1 focus:ring-[#083E34] outline-none text-slate-900 bg-white"
                >
                  {entities.length === 0 ? (
                    <option value="">No entities available</option>
                  ) : (
                    entities.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.shortCode})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Media Production"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:border-[#083E34] focus:ring-1 focus:ring-[#083E34] outline-none text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. CGCC-MED"
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono uppercase focus:border-[#083E34] focus:ring-1 focus:ring-[#083E34] outline-none text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Head of Department / Lead
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pastor David Adeleke"
                    value={deptHeadName}
                    onChange={(e) => setDeptHeadName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:border-[#083E34] focus:ring-1 focus:ring-[#083E34] outline-none text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Head Official Email
                  </label>
                  <input
                    type="email"
                    placeholder="head@thecitadelglobal.org"
                    value={deptHeadEmail}
                    onChange={(e) => setDeptHeadEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:border-[#083E34] focus:ring-1 focus:ring-[#083E34] outline-none text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Business Head (GEC)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pastor Christian Ike"
                    value={deptBusinessHead}
                    onChange={(e) => setDeptBusinessHead(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:border-[#083E34] focus:ring-1 focus:ring-[#083E34] outline-none text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Reports To
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Group Executive Council (GEC)"
                    value={deptReportsTo}
                    onChange={(e) => setDeptReportsTo(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:border-[#083E34] focus:ring-1 focus:ring-[#083E34] outline-none text-slate-900 bg-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deptIsGecShared}
                  onChange={(e) => setDeptIsGecShared(e.target.checked)}
                  className="rounded border-slate-300 text-[#083E34] focus:ring-[#083E34]"
                />
                <span className="font-semibold text-slate-700">
                  Operates as a Group Executive Council (GEC) Shared Service
                </span>
              </label>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  placeholder="Scope of work and responsibilities..."
                  value={deptDescription}
                  onChange={(e) => setDeptDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:border-[#083E34] focus:ring-1 focus:ring-[#083E34] outline-none text-slate-900 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#D4AF37] text-slate-950 rounded-xl hover:bg-[#C59B27] font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingDept ? 'Save Changes' : 'Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
