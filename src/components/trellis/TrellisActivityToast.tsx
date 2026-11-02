import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useTrellis } from './TrellisContext';

export const TrellisActivityToast: React.FC = () => {
  const { activeToast, undoLastAction, clearToast, canUndo } = useTrellis();

  if (!activeToast) return null;

  return (
    <div
      role="status"
      data-testid="trellis-activity-toast"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white rounded-full px-4 py-2.5 shadow-2xl flex items-center gap-3 text-xs font-semibold animate-slide-up border border-slate-800"
    >
      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" />
      </div>

      <span className="text-slate-100">{activeToast.message}</span>

      {canUndo && <button
        onClick={undoLastAction}
        data-testid="trellis-undo-btn"
        className="text-amber-400 hover:text-amber-300 font-bold underline underline-offset-2 transition ml-1 cursor-pointer"
      >
        Undo
      </button>}

      <button
        onClick={clearToast}
        className="text-slate-400 hover:text-slate-200 transition ml-1 p-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
