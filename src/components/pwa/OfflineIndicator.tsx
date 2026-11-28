import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from './useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-banner"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white shadow-xl border border-slate-800"
    >
      <WifiOff className="w-4 h-4 text-slate-300" />
      <span>Offline Mode — Cached Citadel People Hub data is active.</span>
    </div>
  );
};
