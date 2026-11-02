import React from 'react';
import { TrellisProvider, useTrellis } from './TrellisContext';
import { TrellisHeader } from './TrellisHeader';
import { TrellisBoard } from './TrellisBoard';
import { TrellisList } from './TrellisList';
import { TrellisTimeline } from './TrellisTimeline';
import { TrellisDocs } from './TrellisDocs';
import { TrellisFiles } from './TrellisFiles';
import { TrellisTaskDetail } from './TrellisTaskDetail';
import { TrellisNewTaskModal } from './TrellisNewTaskModal';
import { TrellisInboxModal } from './TrellisInboxModal';
import { TrellisActivityToast } from './TrellisActivityToast';

const TrellisContent: React.FC = () => {
  const { activeTab, isApiMode, isLoading, apiError, clearApiError } = useTrellis();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'board':
        return <TrellisBoard />;
      case 'list':
        return <TrellisList />;
      case 'timeline':
        return <TrellisTimeline />;
      case 'docs':
        return <TrellisDocs />;
      case 'files':
        return <TrellisFiles />;
      default:
        return <TrellisBoard />;
    }
  };

  return (
    <div data-testid="trellis-app" className="space-y-4">
      {isLoading && <div role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600">Loading tasks and employees…</div>}
      {apiError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 flex items-start justify-between gap-3"><span>{isApiMode ? 'Trellis API request failed. ' : ''}{apiError}</span><button type="button" onClick={clearApiError} className="text-rose-700 underline underline-offset-2">Dismiss</button></div>}
      {/* Project Header Bar with Breadcrumb, Team Avatars, User Switcher, Tabs, and + New task */}
      <TrellisHeader />

      {/* Main Tab View (Board, List, Timeline, Docs, Files) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden">
        {renderTabContent()}
      </div>

      {/* Modals, Slide-over Drawer, and Bottom Activity Toast with Undo */}
      <TrellisTaskDetail />
      <TrellisNewTaskModal />
      <TrellisInboxModal />
      <TrellisActivityToast />
    </div>
  );
};

export const TrellisApp: React.FC = () => {
  return (
    <TrellisProvider>
      <TrellisContent />
    </TrellisProvider>
  );
};

export default TrellisApp;
