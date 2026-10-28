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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-black tracking-tight font-serif flex items-center gap-2">
            <UserRoundX className="w-5 h-5 text-[#0A1E3F]" />
            <span>Employee Lifecycle & Offboarding</span>
          </h2>
          <p className="text-xs text-black font-semibold">
            Resignation, termination, contract expiry, clearance, recovery of assets, and exit approvals aligned to the Citadel HR policy workbook.
          </p>
        </div>
        <Badge variant="warning">Exit workflow in progress</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {exitSummary.map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{item.label}</div>
            <div className="mt-2 text-2xl font-black text-black">{item.value}</div>
            <Badge variant={item.tone as any} className="mt-3">
              {item.tone === 'success' ? 'Healthy' : item.tone === 'warning' ? 'Review' : item.tone === 'info' ? 'Action needed' : 'Managed'}
            </Badge>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0A1E3F]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-black">Lifecycle events tracked in the HRIS</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-black">Lifecycle Event</th>
                <th className="px-4 py-3 font-black">Trigger</th>
                <th className="px-4 py-3 font-black">Required Action</th>
                <th className="px-4 py-3 font-black">Approver</th>
                <th className="px-4 py-3 font-black">Records Updated</th>
              </tr>
            </thead>
            <tbody>
              {CITADEL_LIFECYCLE_EVENTS.map((event) => (
                <tr key={event.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-3 font-bold text-black">{event.name}</td>
                  <td className="px-4 py-3 text-slate-700">{event.trigger}</td>
                  <td className="px-4 py-3 text-slate-700">{event.requiredAction}</td>
                  <td className="px-4 py-3 text-slate-700">{event.approver}</td>
                  <td className="px-4 py-3 text-slate-700">{event.recordsUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-[#0A1E3F]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-black">Offboarding checklist</h3>
        </div>

        <div className="space-y-3">
          {CITADEL_OFFBOARDING_STEPS.map((step) => (
            <div key={step.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mt-0.5 rounded-full bg-white border border-slate-300 p-1">
                {step.status === 'Completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <CircleDashed className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-black">{step.step}</h4>
                  <Badge variant={step.status === 'Completed' ? 'success' : 'warning'}>{step.status}</Badge>
                </div>
                <div className="mt-1 text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-black">Owner:</span> {step.owner} • <span className="font-bold text-black">Required document:</span> {step.requiredDocument}
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
