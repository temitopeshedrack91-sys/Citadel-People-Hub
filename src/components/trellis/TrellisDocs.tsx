import React from 'react';
import { FileText, Plus, ExternalLink } from 'lucide-react';

export const TrellisDocs: React.FC = () => {
  const docs = [
    {
      id: 'doc-1',
      title: 'Citadel People Hub Mobile App Spec',
      author: 'Nadia Safitri',
      updated: 'Oct 18, 2026',
      summary: 'Specifications for biometric check-in, offline leave requests, and self-service approval integration.',
    },
    {
      id: 'doc-2',
      title: 'Biometric Attendance Sync Architecture & SQLite Queue',
      author: 'Jonathan Tan',
      updated: 'Oct 16, 2026',
      summary: 'Technical architecture for handling spotty connectivity during rapid gatehouse biometric scanning.',
    },
    {
      id: 'doc-3',
      title: 'Nigerian Naira (₦) Display & Payroll Formatting',
      author: 'Bayu Wirawan',
      updated: 'Oct 15, 2026',
      summary: 'Locale standards for comma vs dot separators and deduction rounding rules across Citadel entities.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">Citadel People Hub Documentation</h3>
          <p className="text-[11px] text-slate-400 font-medium">Sprint 14 HR specifications, biometric sync guides, and compliance standards</p>
        </div>
        <button className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-slate-800">
          <Plus className="w-3.5 h-3.5" />
          <span>New Doc</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition space-y-2 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>{doc.title}</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">{doc.summary}</p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-semibold">
              <span>{doc.author}</span>
              <span>Updated {doc.updated}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
