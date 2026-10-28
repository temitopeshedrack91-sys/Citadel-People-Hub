import React from 'react';
import { Bot, BrainCircuit, CheckCircle2, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '../common/Badge';
import { CITADEL_AI_USE_CASES } from '../../data/mockData';

export const AIAssistantView: React.FC = () => {
  const safetyControls = [
    'No payroll or bank details are available without explicit PCCM authorization.',
    'Employee personal data is restricted to approved HR and line-manager workflows.',
    'Human approval is required for all candidate recommendation, leave exception, and policy-change suggestions.',
    'AI outputs are logged and auditable within the Citadel People Hub compliance trail.',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#083E34]" />
            <span>Help &amp; Assistant</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Automated assistance for summaries, policy lookups, and workflow guidance.
          </p>
        </div>
        <Badge variant="success">Active</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#083E34]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Approved use cases</h3>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">06</div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">Summaries, documents, policy search, scheduling support, onboarding checklists, and HR FAQ guidance.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Policy guardrails</h3>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">100%</div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">Every action requiring sensitive approval is escalated to a human reviewer before a final action is taken.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Restricted data</h3>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">4</div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">Payroll, bank data, medical records, and unpublished disciplinary notes remain inaccessible without approved clearance.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#083E34]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">AI capability matrix</h3>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {CITADEL_AI_USE_CASES.map((useCase) => (
            <div key={useCase.id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-3 hover:bg-slate-50/50 transition">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <h4 className="text-sm font-black text-slate-900">{useCase.title}</h4>
                  <Badge variant={useCase.priority === 'High' ? 'warning' : 'info'}>{useCase.priority}</Badge>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{useCase.description}</p>
                <div className="mt-2.5 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-900">Who can use it:</span> {useCase.whoCanUseIt} • <span className="font-bold text-slate-900">Data scope:</span> {useCase.dataAccess}
                </div>
              </div>

              <div className="md:w-48 shrink-0">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                  {useCase.humanApprovalRequired ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                  )}
                  <span>{useCase.humanApprovalRequired ? 'Human approval required' : 'Auto-approved draft'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#083E34] rounded-2xl border border-emerald-800/40 p-6 shadow-sm text-white">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-amber-300" />
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">Safe operating requirements</h3>
        </div>
        <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
          {safetyControls.map((item) => (
            <li key={item} className="flex gap-2.5 items-start">
              <span className="mt-0.5 text-amber-400 font-bold">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
