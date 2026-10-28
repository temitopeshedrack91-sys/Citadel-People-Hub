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
} from 'lucide-react';
import { RecruitmentRequisition } from '../../types';
import { talentRepository } from '../../services';
import { Badge } from '../common/Badge';
import { CITADEL_RECRUITMENT_STAGES } from '../../data/mockData';

export const RecruitmentView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requisitions' | 'sop_stages'>('requisitions');
  const [requisitions, setRequisitions] = useState<RecruitmentRequisition[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const list = await talentRepository.getRequisitions();
      setRequisitions(list);
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-black tracking-tight font-serif flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#0A1E3F]" />
            <span>Recruitment & Talent Acquisition</span>
          </h2>
          <p className="text-xs text-black font-semibold">
            Citadel 10-stage recruitment framework, two-stage interview governance, and active candidate pipelines.
          </p>
        </div>

        <button
          onClick={() => alert('New Job Requisition request initiated for PCCM and GEC review.')}
          className="px-3.5 py-2 rounded-lg bg-[#0A1E3F] text-amber-300 hover:bg-[#152B52] text-xs font-black flex items-center gap-1.5 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Requisition</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-slate-300 pb-2">
        <button
          onClick={() => setActiveTab('requisitions')}
          className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
            activeTab === 'requisitions'
              ? 'bg-[#0A1E3F] text-white shadow-xs'
              : 'text-black hover:bg-slate-200'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Active Requisitions ({requisitions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sop_stages')}
          className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
            activeTab === 'sop_stages'
              ? 'bg-[#0A1E3F] text-white shadow-xs'
              : 'text-black hover:bg-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-600" />
          <span>Official 10-Stage Recruitment Framework (Sheet 8)</span>
        </button>
      </div>

      {activeTab === 'requisitions' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requisitions.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-xl border border-slate-300 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-black">{req.jobTitle}</h3>
                    <p className="text-xs text-[#0A1E3F] font-bold mt-0.5">
                      {req.departmentName} ({req.entityName})
                    </p>
                  </div>
                  <Badge variant={req.status === 'Open' ? 'success' : 'neutral'}>
                    {req.status}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-black bg-slate-100 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-600 block text-[10px] font-bold">Open Positions:</span>
                    <span className="font-black text-black">{req.openPositions} Opening(s)</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[10px] font-bold">Hiring Manager:</span>
                    <span className="font-black text-black">{req.hiringManager}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[10px] font-bold">Target Date:</span>
                    <span className="font-black text-black">{req.targetHiringDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[10px] font-bold">Applicants:</span>
                    <span className="font-black text-black">{req.applicantsCount} in pipeline</span>
                  </div>
                </div>

                {/* Candidate Pipeline Tracker */}
                <div className="mt-4">
                  <span className="text-[10px] font-black text-black uppercase tracking-wider block mb-2">
                    Active Candidates in 10-Stage Pipeline
                  </span>
                  <div className="space-y-1.5">
                    {(req.candidates || []).map((cand: any) => (
                      <div
                        key={cand.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs hover:bg-slate-50 transition"
                      >
                        <div>
                          <span className="font-bold text-black block">{cand.name}</span>
                          <span className="text-[10px] text-slate-600 font-mono">
                            Applied: {cand.appliedDate}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            cand.stage === 'Pre-Onboarding'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : cand.stage === 'Offer Extended'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-black border-slate-300'
                          }`}
                        >
                          {cand.stage}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-700 font-medium">PCCM Recruitment Engine</span>
                <button
                  onClick={() => alert(`Reviewing candidate profiles for ${req.jobTitle}`)}
                  className="text-xs font-bold text-[#0A1E3F] hover:underline flex items-center gap-1"
                >
                  <span>View All Candidates</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
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
                      <span className="w-6 h-6 rounded-full bg-[#0A1E3F] text-amber-300 font-black text-xs flex items-center justify-center">
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
          <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-black uppercase tracking-wider">
                  Full 10-Stage Recruitment Protocol Specification
                </h3>
                <p className="text-[11px] text-slate-600">Roles, responsibilities, SLA days, and stage deliverables</p>
              </div>
              <span className="text-xs font-black px-2.5 py-1 bg-[#0A1E3F] text-amber-300 rounded-md">
                Sheet 8 Mandate
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A1E3F] text-white uppercase tracking-wider text-xs font-bold">
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
    </div>
  );
};

