import React, { useState } from 'react';
import { Award, Target, CheckCircle2, Star, Calendar, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const PerformanceView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'kpi' | 'reviews'>('kpi');

  // Sample Objectives & Key Results for Citadel Hub
  const objectives = [
    {
      title: 'Digital Systems & Biometric Optimization',
      category: 'Organizational Excellence',
      progress: 85,
      dueDate: 'Q4 2026',
      keyResults: [
        'Complete ZKTeco device integration across all 3 Citadel gates',
        'Achieve 95% self-service adoption on Citadel People Hub',
      ],
    },
    {
      title: 'PCCM Policy Harmonization & Employee Handbook',
      category: 'People & Culture',
      progress: 70,
      dueDate: 'Q4 2026',
      keyResults: [
        'Publish updated Leave and Ethics charters for CGCC and CSOG',
        'Conduct orientation workshops for Citadel Holdings retail heads',
      ],
    },
    {
      title: 'Leadership Development & Capacity Building',
      category: 'Talent Growth',
      progress: 60,
      dueDate: 'Q1 2027',
      keyResults: [
        'Conduct 3 supervisory coaching masterclasses for Dept Heads',
        'Enroll 20 high-potential candidates into School of Government executive tracks',
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
            <Award className="w-5 h-5 text-[#0A1E3F]" />
            <span>Performance & Appraisals</span>
          </h2>
          <p className="text-xs text-slate-500">
            Objectives, Key Results (OKRs), core competency evaluations, and semi-annual performance reviews.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('kpi')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              activeTab === 'kpi' ? 'bg-white text-[#0A1E3F] shadow-xs' : 'text-slate-600'
            }`}
          >
            Objectives & OKRs
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              activeTab === 'reviews' ? 'bg-white text-[#0A1E3F] shadow-xs' : 'text-slate-600'
            }`}
          >
            Review Cycles
          </button>
        </div>
      </div>

      {activeTab === 'kpi' ? (
        <div className="space-y-4">
          {objectives.map((obj, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider block">
                      {obj.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">{obj.title}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-[#0A1E3F]">{obj.progress}%</span>
                    <span className="text-[10px] text-slate-400 block font-mono">Target: {obj.dueDate}</span>
                  </div>
                </div>

                <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#0A1E3F] h-2 rounded-full transition-all"
                    style={{ width: `${obj.progress}%` }}
                  ></div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-700 block">Key Results:</span>
                  {obj.keyResults.map((kr, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                      <Target className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                      <span>{kr}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Aligned with Citadel Strategic Vision 2026/2027</span>
                <button
                  onClick={() => alert('Opening KPI progress check-in modal')}
                  className="font-semibold text-[#0A1E3F] hover:underline"
                >
                  Update Check-in →
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs text-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">2026 Appraisal Cadence</h3>
            <Badge variant="success">Active Review Window</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block text-xs">Q3 Mid-Year Review</span>
              <p className="text-slate-600 text-[11px] mt-1">
                Self-evaluation and line-manager 1-on-1 appraisals covering performance deliverables and values calibration.
              </p>
              <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-slate-500">
                <span>Status: In Progress</span>
                <span className="text-emerald-700 font-semibold">Due: 30 Oct 2026</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block text-xs">2026 Annual Calibration</span>
              <p className="text-slate-600 text-[11px] mt-1">
                Comprehensive 360 review, promotion recommendations, and leadership assessment by PCCM and Executive Council.
              </p>
              <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-slate-500">
                <span>Status: Scheduled</span>
                <span>Starts: Dec 2026</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
