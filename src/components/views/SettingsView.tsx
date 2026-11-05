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
import { Badge } from '../common/Badge';
import { CITADEL_GEC_ROSTER, CITADEL_ROLES_MATRIX, CITADEL_V1_REQUIREMENTS_FORM } from '../../data/mockData';

export const SettingsView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'entities_depts' | 'gec_roster' | 'roles_matrix' | 'requirements_form'>('entities_depts');
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
          <h2 className="text-lg font-black text-black tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#083E34]" />
            <span>Organization Settings & Entity Governance</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Citadel institutional hierarchy, Group Executive Council (GEC) leadership, and 5-tier role governance.
          </p>
        </div>

        {activeTab === 'entities_depts' && (
          <button
            onClick={() => setShowAddDeptModal(true)}
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
          {/* 3 Core Entities Display */}
          <div>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
              Citadel Corporate Entities &amp; Subsidiaries
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {entities.map((ent) => (
                <div
                  key={ent.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold bg-[#083E34]/10 text-[#083E34]">
                        {ent.shortCode || 'CGCC'}
                      </span>
                      <Badge variant={ent.isActive ? 'success' : 'neutral'}>
                        {ent.isActive ? 'Active Entity' : 'Inactive'}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-2.5">{ent.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">{ent.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400 font-bold">{ent.shortCode || 'CGCC'}</span>
                    <span className="font-bold text-slate-800">
                      {departments.filter((d) => d.entityId === ent.id).length} Operational Departments
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Departments Master List */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Departments &amp; Divisions Master Table
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Organizational units across Citadel Global Community Church, CSOG, and Citadel Holdings
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {departments.length} registered operational units
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50/90 text-slate-500 border-b border-slate-200/80 uppercase tracking-wider text-[11px] font-black">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Department Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Code</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Parent Entity</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Head of Department / Lead</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{dept.name}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{dept.description}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{dept.code}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{dept.entityName}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{dept.headOfDepartment || dept.headOfDepartmentName || 'To Be Appointed'}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant={dept.isActive ? 'success' : 'neutral'}>
                          {dept.isActive ? 'Active' : 'Archived'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleToggleDeptStatus(dept)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                            dept.isActive
                              ? 'border-slate-200 text-slate-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
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
              <span className="text-xs font-black px-2.5 py-1 bg-[#0A1E3F] text-[#D4AF37] rounded-lg shadow-xs">
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
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
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

      {/* Add Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="bg-[#083E34] text-white p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Create Department</h3>
                <p className="text-xs text-amber-300 font-medium">PCCM Organizational Structure</p>
              </div>
              <button
                onClick={() => setShowAddDeptModal(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Parent Entity</label>
                <select
                  value={deptEntityId}
                  onChange={(e) => setDeptEntityId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:border-[#083E34] focus:ring-1 focus:ring-[#083E34] outline-none text-slate-900 bg-white"
                >
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:border-[#083E34] focus:ring-1 focus:ring-[#083E34] outline-none text-slate-900 bg-white"
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
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono uppercase focus:border-[#083E34] focus:ring-1 focus:ring-[#083E34] outline-none text-slate-900 bg-white"
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
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:border-[#083E34] focus:ring-1 focus:ring-[#083E34] outline-none text-slate-900 bg-white"
                />
              </div>

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
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#D4AF37] text-slate-950 rounded-xl hover:bg-[#C59B27] font-bold shadow-xs transition active:scale-95 cursor-pointer"
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
