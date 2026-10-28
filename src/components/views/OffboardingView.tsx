import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  FileText,
  ShieldCheck,
  UserRoundX,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { CITADEL_LIFECYCLE_EVENTS, CITADEL_OFFBOARDING_STEPS } from '../../data/mockData';

export const OffboardingView: React.FC = () => {
  const exitSummary = [
    { label: 'Open exits', value: '09', tone: 'warning' },
    { label: 'Clearance complete', value: '67%', tone: 'success' },
    { label: 'Pending asset return', value: '04', tone: 'info' },
    { label: 'Access revoked', value: '14/18', tone: 'citadel' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserRoundX className="w-5 h-5 text-[#083E34]" />
            <span>Offboarding</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Staff clearances, handovers, asset returns, and exit records.
          </p>
        </div>
        <Badge variant="warning">Exit in progress</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {exitSummary.map((item) => (
          <div key={item.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{item.label}</div>
            <div className="mt-2 text-2xl font-black text-slate-900">{item.value}</div>
            <Badge variant={item.tone as any} className="mt-3">
              {item.tone === 'success' ? 'Healthy' : item.tone === 'warning' ? 'Review' : item.tone === 'info' ? 'Action needed' : 'Managed'}
            </Badge>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#083E34]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Lifecycle events tracked in the HRIS</h3>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-black whitespace-nowrap">Lifecycle Event</th>
                <th className="px-4 py-3 font-black whitespace-nowrap">Trigger</th>
                <th className="px-4 py-3 font-black whitespace-nowrap">Required Action</th>
                <th className="px-4 py-3 font-black whitespace-nowrap">Approver</th>
                <th className="px-4 py-3 font-black whitespace-nowrap">Records Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {CITADEL_LIFECYCLE_EVENTS.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50/60 transition align-top">
                  <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{event.name}</td>
                  <td className="px-4 py-3 text-slate-700 leading-relaxed">{event.trigger}</td>
                  <td className="px-4 py-3 text-slate-700 leading-relaxed">{event.requiredAction}</td>
                  <td className="px-4 py-3 text-slate-700 leading-relaxed">{event.approver}</td>
                  <td className="px-4 py-3 text-slate-700 leading-relaxed">{event.recordsUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-[#083E34]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Offboarding checklist</h3>
        </div>

        <div className="space-y-3">
          {CITADEL_OFFBOARDING_STEPS.map((step) => (
            <div key={step.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 hover:bg-slate-50 transition">
              <div className="mt-0.5 rounded-full bg-white border border-slate-300 p-1 shadow-2xs">
                {step.status === 'Completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <CircleDashed className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-slate-900">{step.step}</h4>
                  <Badge variant={step.status === 'Completed' ? 'success' : 'warning'}>{step.status}</Badge>
                </div>
                <div className="mt-1 text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900">Owner:</span> {step.owner} • <span className="font-bold text-slate-900">Required document:</span> {step.requiredDocument}
                </div>
                <div className="mt-1 text-[11px] text-slate-600">
                  <span className="font-semibold">Approval:</span> {step.approval} • <span className="font-semibold">Access / property:</span> {step.accessAction}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
