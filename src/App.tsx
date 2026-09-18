/**
 * Citadel People Hub
 * People • Culture • Performance • Growth
 * 
 * People, Culture & Change Management (PCCM) Platform
 * for Citadel Global Community Church (CGCC),
 * Citadel School of Government (CSOG), and Citadel Holdings.
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavModule } from './components/layout/Sidebar';
import { DemoDataBanner } from './components/common/DemoDataBanner';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';

// View modules
import { DashboardView } from './components/views/DashboardView';
import { EmployeeManagementView } from './components/views/EmployeeManagementView';
import { DirectoryView } from './components/views/DirectoryView';
import { LeaveManagementView } from './components/views/LeaveManagementView';
import { AttendanceView } from './components/views/AttendanceView';
import { RecruitmentView } from './components/views/RecruitmentView';
import { OnboardingView } from './components/views/OnboardingView';
import { PerformanceView } from './components/views/PerformanceView';
import { DocumentsView } from './components/views/DocumentsView';
import { CalendarView } from './components/views/CalendarView';
import { ReportsView } from './components/views/ReportsView';
import { NotificationsView } from './components/views/NotificationsView';
import { IntegrationsView } from './components/views/IntegrationsView';
import { SettingsView } from './components/views/SettingsView';
import { AuditLogsView } from './components/views/AuditLogsView';

const MainAppLayout: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<NavModule>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global modal triggers from Dashboard
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);

  const getModuleTitle = (mod: NavModule): string => {
    switch (mod) {
      case 'dashboard':
        return 'Overview Dashboard';
      case 'employees':
        return 'Employee Records';
      case 'directory':
        return 'Corporate Directory';
      case 'leave':
        return 'Leave Management';
      case 'attendance':
        return 'Attendance & Biometrics';
      case 'recruitment':
        return 'Recruitment & Pipelines';
      case 'onboarding':
        return 'Onboarding Journeys';
      case 'performance':
        return 'Performance & Appraisals';
      case 'documents':
        return 'Documents & Policies';
      case 'calendar':
        return 'Citadel Calendar';
      case 'reports':
        return 'Reports & Workforce Analytics';
      case 'notifications':
        return 'Notifications & Alerts';
      case 'integrations':
        return 'Integrations & Cloud';
      case 'settings':
        return 'Organization Settings';
      case 'audit-logs':
        return 'Compliance & Audit Trail';
      default:
        return 'Citadel People Hub';
    }
  };

  const renderActiveModule = () => {
    switch (currentModule) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={(mod) => setCurrentModule(mod)}
            onOpenLeaveModal={() => {
              setCurrentModule('leave');
              setIsLeaveModalOpen(true);
            }}
            onOpenAddEmployee={() => {
              setCurrentModule('employees');
              setIsAddEmployeeModalOpen(true);
            }}
          />
        );
      case 'employees':
        return (
          <EmployeeManagementView
            isAddModalOpen={isAddEmployeeModalOpen}
            onCloseAddModal={() => setIsAddEmployeeModalOpen(false)}
            onNavigate={(mod) => setCurrentModule(mod)}
          />
        );
      case 'directory':
        return <DirectoryView />;
      case 'leave':
        return (
          <LeaveManagementView
            isApplyModalOpen={isLeaveModalOpen}
            onCloseApplyModal={() => setIsLeaveModalOpen(false)}
          />
        );
      case 'attendance':
        return <AttendanceView />;
      case 'recruitment':
        return <RecruitmentView />;
      case 'onboarding':
        return <OnboardingView />;
      case 'performance':
        return <PerformanceView />;
      case 'documents':
        return <DocumentsView />;
      case 'calendar':
        return <CalendarView />;
      case 'reports':
        return <ReportsView />;
      case 'notifications':
        return <NotificationsView />;
      case 'integrations':
        return <IntegrationsView />;
      case 'settings':
        return <SettingsView />;
      case 'audit-logs':
        return <AuditLogsView />;
      default:
        return (
          <DashboardView
            onNavigate={(mod) => setCurrentModule(mod)}
            onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
            onOpenAddEmployee={() => setIsAddEmployeeModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* 1. Notice Banner: Indicating demo data and production Supabase architecture */}
      <DemoDataBanner />

      {/* 2. Top Navigation Bar */}
      <Header
        activeModuleTitle={getModuleTitle(currentModule)}
        activeModuleId={currentModule}
        onNavigate={(mod) => setCurrentModule(mod)}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* 3. Main Workspace */}
      <div className="flex-1 flex">
        {/* Role-Aware Sidebar */}
        <Sidebar
          currentModule={currentModule}
          onSelectModule={(mod) => setCurrentModule(mod)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Dynamic View Area */}
        <main className="flex-1 lg:pl-64 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {renderActiveModule()}
        </main>
      </div>

      {/* 4. PWA Offline Status Toast */}
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppLayout />
    </AuthProvider>
  );
}
