import React from 'react';
import { Paperclip, Download, Image, FileCode, Plus } from 'lucide-react';

export const TrellisFiles: React.FC = () => {
  const files = [
    { name: 'citadel_app_store_screenshots.zip', size: '14.2 MB', uploader: 'Nadia Safitri', date: 'Oct 20' },
    { name: 'citadel_biometric_sync_schema.sql', size: '18 KB', uploader: 'Jonathan Tan', date: 'Oct 19' },
    { name: 'citadel_people_hub_tokens.json', size: '42 KB', uploader: 'Nadia Safitri', date: 'Oct 17' },
    { name: 'citadel_attendance_gateway_sdk.aar', size: '2.8 MB', uploader: 'Bayu Wirawan', date: 'Oct 16' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">Citadel People Hub Assets & Attachments</h3>
          <p className="text-[11px] text-slate-400 font-medium">Sprint 14 HR deliverables, mobile assets, schemas and SDKs</p>
        </div>
        <button className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-slate-800">
          <Plus className="w-3.5 h-3.5" />
          <span>Upload File</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {files.map((file, idx) => (
          <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Paperclip className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900">{file.name}</p>
                <p className="text-[11px] text-slate-400">
                  {file.size} • Uploaded by {file.uploader} on {file.date}
                </p>
              </div>
            </div>

            <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
              <Download className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
