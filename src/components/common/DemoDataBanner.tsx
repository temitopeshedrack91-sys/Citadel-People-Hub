import React, { useState } from 'react';
import { Database, X } from 'lucide-react';
import { isLaravelApiConfigured } from '../../services/laravelClient';

interface DemoDataBannerProps {
  onOpenDemoUsers?: () => void;
}

export const DemoDataBanner: React.FC<DemoDataBannerProps> = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const dataMode = isLaravelApiConfigured()
    ? 'Connected to authenticated Laravel backend with Supabase PostgreSQL.'
    : 'Connected to Supabase PostgreSQL & Auth with 7 pre-configured team accounts.';

  if (isDismissed) return null;

  return (
    <div
      id="citadel-demo-data-banner"
      className="bg-slate-900 text-slate-100 px-3 sm:px-6 py-2 text-xs border-b border-slate-800 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FF9900]/20 text-[#FF9900] font-bold uppercase tracking-wider text-[10px] shrink-0 border border-[#FF9900]/40">
          <Database className="w-3 h-3" />
          <span>Supabase Live</span>
        </div>
        <p className="truncate text-slate-300 text-xs">
          <strong>Database &amp; Auth:</strong> {dataMode}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-slate-200 p-1 shrink-0"
          title="Dismiss notice"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
