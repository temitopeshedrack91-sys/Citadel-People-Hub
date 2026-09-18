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
} from 'lucide-react';
import { RecruitmentRequisition } from '../../types';
import { talentRepository } from '../../services';
import { Badge } from '../common/Badge';

export const RecruitmentView: React.FC = () => {
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
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#0A1E3F]" />
            <span>Recruitment & Talent Pipeline</span>
          </h2>
          <p className="text-xs text-slate-500">
            Open requisitions, candidate screening stages, and pre-onboarding workflows across Citadel entities.
          </p>
        </div>

        <button
          onClick={() => alert('New Job Requisition request initiated for PCCM review.')}
          className="px-3.5 py-2 rounded-lg bg-[#0A1E3F] text-amber-300 hover:bg-[#152B52] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Requisition</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requisitions.map((req) => (
          <div
            key={req.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{req.jobTitle}</h3>
                  <p className="text-xs text-[#0A1E3F] font-medium mt-0.5">
                    {req.departmentName} ({req.entityName})
                  </p>
                </div>
                <Badge variant={req.status === 'Open' ? 'success' : 'neutral'}>
                  {req.status}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                <div>
                  <span className="text-slate-400 block text-[10px]">Open Positions:</span>
                  <span className="font-semibold text-slate-800">{req.openPositions} Opening(s)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Hiring Manager:</span>
                  <span className="font-semibold text-slate-800">{req.hiringManager}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Target Date:</span>
                  <span className="font-semibold text-slate-800">{req.targetHiringDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Applicants:</span>
                  <span className="font-semibold text-slate-800">{req.applicantsCount} in pipeline</span>
                </div>
              </div>

              {/* Candidate Pipeline Tracker */}
              <div className="mt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Active Candidate Pipeline
                </span>
                <div className="space-y-1.5">
                  {(req.candidates || []).map((cand: any) => (
                    <div
                      key={cand.id}
                      className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-white text-xs hover:bg-slate-50 transition"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 block">{cand.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Applied: {cand.appliedDate}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          cand.stage === 'Pre-Onboarding'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cand.stage === 'Offer Extended'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {cand.stage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">PCCM Recruitment Engine</span>
              <button
                onClick={() => alert(`Reviewing candidate profiles for ${req.jobTitle}`)}
                className="text-xs font-semibold text-[#0A1E3F] hover:underline flex items-center gap-1"
              >
                <span>View All Candidates</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
