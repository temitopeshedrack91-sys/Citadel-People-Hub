import React, { useState } from 'react';
import { Info, Database, X } from 'lucide-react';
import { isLaravelApiConfigured } from '../../services/laravelClient';

export const DemoDataBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const dataMode = isLaravelApiConfigured()
    ? 'Laravel API configured: connected modules use authenticated backend requests; reference-only screens may still show prototype content.'
    : 'Development demo data active: records shown are local sample data and are not saved to Supabase.';

  if (isDismissed) return null;

  return (
    <div
      id="citadel-demo-data-banner"
      className="bg-slate-900 text-slate-100 px-4 py-2.5 text-xs border-b border-slate-800 flex items-center justify-between"
    >
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-semibold uppercase tracking-wider text-[10px] shrink-0 border border-amber-400/30">
          <Database className="w-3 h-3" />
          <span>{isLaravelApiConfigured() ? 'Laravel API' : 'Development Demo'}</span>
        </div>
        <p className="truncate text-slate-300">
          <strong>Data mode:</strong> {dataMode}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="text-slate-400 hover:text-slate-200 p-1 shrink-0 ml-3"
        title="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
