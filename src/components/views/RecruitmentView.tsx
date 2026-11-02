import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  FileCheck2,
  Video,
  MapPin,
  Clock,
  ShieldCheck,
  Info,
  X,
} from 'lucide-react';
import { RecruitmentRequisition, CitadelEntity, CitadelDepartment, Employee } from '../../types';
import { talentRepository, organizationRepository, employeeRepository } from '../../services';
import { Badge } from '../common/Badge';
import {
  CITADEL_RECRUITMENT_STAGES,
} from '../../data/mockData';
import { CreateRequisitionModal } from '../recruitment/CreateRequisitionModal';

export const RecruitmentView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requisitions' | 'sop_stages'>('requisitions');
  const [requisitions, setRequisitions] = useState<RecruitmentRequisition[]>([]);
  const [entities, setEntities] = useState<CitadelEntity[]>([]);
  const [departments, setDepartments] = useState<CitadelDepartment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [reqList, entList, deptList, empList] = await Promise.all([
          talentRepository.getRequisitions(),
          organizationRepository.getEntities(),
          organizationRepository.getDepartments(),
          employeeRepository.getAll(),
        ]);

        if (!isMounted) return;
        setRequisitions(reqList);
        setEntities(entList);
        setDepartments(deptList);
        setEmployees(empList);
        setLoadError(null);
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load recruitment view data:', err);
          setLoadError(err instanceof Error ? err.message : 'Recruitment data could not be loaded.');
        }
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const handleRequisitionCreated = (newReq: RecruitmentRequisition) => {
    setRequisitions((prev) => [newReq, ...prev]);
    setActiveTab('requisitions');
    setSuccessBanner(
      `Requisition "${newReq.requisitionCode} - ${newReq.jobTitle}" was saved.`
    );
    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };

  const handleStatusChange = async (requisition: RecruitmentRequisition, status: RecruitmentRequisition['status']) => {
    if (status === requisition.status) return;
    try {
      if (!talentRepository.updateRequisitionStatus) {
        throw new Error('Requisition status updates are not supported by the configured data service.');
      }
      const saved = await talentRepository.updateRequisitionStatus(requisition.id, status);
      setRequisitions((previous) => previous.map((item) => item.id === saved.id ? saved : item));
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Requisition status could not be saved.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#083E34]" />
            <span>Recruitment</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Hiring requisitions, candidate interviews, and application stages.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-[#D4AF37] text-slate-950 hover:bg-[#C59B27] text-xs font-bold flex items-center gap-1.5 shadow-xs border border-[#C59B27] transition cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          <span className="font-bold">New Requisition</span>
        </button>
      </div>

      {loadError && (
        <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          Recruitment data could not be loaded: {loadError}
        </div>
      )}
      {actionError && (
        <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          Requisition status could not be saved: {actionError}
        </div>
      )}

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="p-1 text-emerald-600 hover:text-emerald-900 transition rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar scroll-smooth" role="tablist">
        <button
          onClick={() => setActiveTab('requisitions')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'requisitions'
              ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Active Requisitions ({requisitions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sop_stages')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'sop_stages'
              ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Official 10-Stage Recruitment Framework (Sheet 8)</span>
        </button>
      </div>

      {activeTab === 'requisitions' ? (
        requisitions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requisitions.map((req) => {
              const hiringMgr = req.hiringManager || 'Not assigned';
              const targetDt = req.targetDate || req.targetHiringDate || 'Not set';
              const candidates = req.candidates || [];

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex flex-col justify-between hover:border-slate-300 transition group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {req.requisitionCode}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {req.employmentType || 'Full-Time'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#083E34] transition mt-1">
                          {req.jobTitle}
                        </h3>
                        <p className="text-xs text-[#083E34] font-semibold mt-0.5">
                          {req.departmentName} ({req.entityName})
                        </p>
                      </div>
                      <Badge variant={req.status === 'Open' ? 'success' : req.status === 'Interviewing' ? 'warning' : 'neutral'}>
                        {req.status}
                      </Badge>
                    </div>

                    <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Requisition status
                      <select
                        aria-label={`Update status for ${req.jobTitle}`}
                        value={req.status}
                        onChange={(event) => void handleStatusChange(req, event.target.value as RecruitmentRequisition['status'])}
                        className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold normal-case tracking-normal text-slate-800"
                      >
                        {['Draft', 'Approved', 'Open', 'Interviewing', 'Filled', 'Closed'].map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Open Positions:</span>
                        <span className="font-bold text-slate-800">{req.openPositions} Opening(s)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Hiring Manager:</span>
                        <span className="font-bold text-slate-800">{hiringMgr}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Target Date:</span>
                        <span className="font-bold text-slate-800 font-mono">{targetDt}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Applicants:</span>
                        <span className="font-bold text-slate-800">{req.applicantsCount} in pipeline</span>
                      </div>
                    </div>

                    {/* Candidate Pipeline Tracker */}
                    <div className="mt-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                        Active Candidates in 10-Stage Pipeline
                      </span>
                      {candidates.length > 0 ? (
                        <div className="space-y-1.5">
                          {candidates.map((cand: any) => (
                            <div
                              key={cand.id}
                              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white text-xs hover:bg-slate-50 transition"
                            >
                              <div>
                                <span className="font-bold text-slate-900 block">{cand.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Applied: {cand.appliedDate}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  cand.stage === 'Pre-Onboarding'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : cand.stage === 'Offer Extended'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {cand.stage}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                            <span>Sourcing &amp; Screening Active</span>
                            <span className="text-emerald-700 font-bold">{req.applicantsCount} Resumes</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                            <div className="bg-[#083E34] h-full" style={{ width: '45%' }} />
                            <div className="bg-amber-500 h-full" style={{ width: '30%' }} />
                            <div className="bg-emerald-500 h-full" style={{ width: '15%' }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                            <span>Screening (60%)</span>
                            <span>Interviewing (30%)</span>
                            <span>Offer (10%)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">PCCM Recruitment Engine</span>
                    <button
                      onClick={() => alert(`Reviewing candidate profiles for ${req.jobTitle}`)}
                      className="text-xs font-bold text-[#083E34] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All Candidates</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">No Requisitions Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No active hiring requisitions currently match your criteria. Create a new requisition to start the hiring pipeline.
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#083E34] text-white hover:bg-[#062d26] text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Requisition</span>
            </button>
          </div>
        )
      ) : (
        /* 10-Stage Recruitment Framework from Sheet 8 */
        <div className="space-y-5">
          {/* Institutional Highlights Card */}
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                Citadel Standard Operating Procedure for Recruitment (Workbook Sheet 8)
              </h3>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed font-medium">
                Recruitment across all Citadel entities follows a rigid 10-stage sequential protocol. Vacancies require formal Manpower Requisitions with approved headcount and salary band validation. Stage 8 requires a <span className="font-black text-amber-950 underline">Two-Stage Interview Assessment</span> comprising <span className="font-bold text-amber-950">Stage 1: Physical Technical Interview</span> and <span className="font-bold text-amber-950">Stage 2: Virtual Competency-Based Assessment</span>.
              </p>
            </div>
          </div>

          {/* Stepper Timeline Visualizer */}
          <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-xs">
            <h3 className="text-xs font-black text-black uppercase tracking-wider mb-4">
              10-Stage Pipeline Overview &amp; SLA Sequence
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {CITADEL_RECRUITMENT_STAGES.map((st) => (
                <div
                  key={st.step}
                  className={`p-3 rounded-xl border flex flex-col justify-between ${
                    st.step === 8
                      ? 'bg-amber-50/80 border-amber-400 ring-1 ring-amber-400'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="w-6 h-6 rounded-full bg-[#083E34] text-amber-300 font-black text-xs flex items-center justify-center">
                        {st.step}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 font-mono">
                        {st.slaDays}d SLA
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-black leading-snug">
                      {st.stageName}
                    </h4>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-700">
                    <span className="font-bold block text-black truncate">{st.primaryActor}</span>
                    <span className="text-[9px] text-slate-500 uppercase">{st.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Stage Table */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-black uppercase tracking-wider">
                  Full 10-Stage Recruitment Protocol Specification
                </h3>
                <p className="text-[11px] text-slate-600">Roles, responsibilities, SLA days, and stage deliverables</p>
              </div>
              <span className="text-xs font-black px-2.5 py-1 bg-[#083E34] text-amber-300 rounded-md">
                Sheet 8 Mandate
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#083E34] text-white uppercase tracking-wider text-xs font-bold">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">Step</th>
                    <th className="py-3.5 px-4">Stage Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Primary Actor</th>
                    <th className="py-3.5 px-4">Mandatory Gate Requirement</th>
                    <th className="py-3.5 px-4">SLA</th>
                    <th className="py-3.5 px-4">Interview Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {CITADEL_RECRUITMENT_STAGES.map((st) => (
                    <tr
                      key={st.step}
                      className={`hover:bg-slate-100 transition ${
                        st.step === 8 ? 'bg-amber-50/40 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-black text-black">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-black text-xs font-black inline-flex items-center justify-center">
                          {st.step}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-black">
                        <span>{st.stageName}</span>
                        <p className="text-[11px] text-slate-600 font-normal mt-0.5 leading-snug">
                          {st.description}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-black border border-slate-200 uppercase">
                          {st.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-black">{st.primaryActor}</td>
                      <td className="py-3.5 px-4 text-slate-800 text-[11px] font-medium leading-relaxed max-w-xs">
                        {st.keyRequirement}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-black whitespace-nowrap">
                        {st.slaDays} Days
                      </td>
                      <td className="py-3.5 px-4">
                        {st.step === 8 ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                              <MapPin className="w-3 h-3" />
                              Stage 1: Physical Technical
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300 block">
                              <Video className="w-3 h-3" />
                              Stage 2: Virtual Competency
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Create Requisition Modal with Chevron Stepper */}
      <CreateRequisitionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleRequisitionCreated}
        entities={entities}
        departments={departments}
        employees={employees}
      />
    </div>
  );
};

