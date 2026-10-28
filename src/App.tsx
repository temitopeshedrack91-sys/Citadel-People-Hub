/**
 * Citadel People Hub
 * People • Culture • Performance • Growth
 * 
 * People, Culture & Change Management (PCCM) Platform
 * for Citadel Global Community Church (CGCC),
 * Citadel School of Government (CSOG), and Citadel Holdings.
 */

import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Col, Container, Row } from 'react-bootstrap';
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
import { OffboardingView } from './components/views/OffboardingView';
import { AIAssistantView } from './components/views/AIAssistantView';
import { ProjectsView } from './components/views/ProjectsView';
import { TeamNotesView } from './components/views/TeamNotesView';
import { LoginModal } from './components/auth/LoginModal';

const MainAppLayout: React.FC = () => {
  const { backendEnabled, isAuthenticated, currentRole, currentUser } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [currentModule, setCurrentModule] = useState<NavModule>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Desktop sidebar collapse state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('citadel_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('citadel_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar collapse
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global modal triggers from Dashboard
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);

  const getModuleTitle = (mod: NavModule): string => {
    switch (mod) {
      case 'dashboard':
        if (currentRole === 'EMPLOYEE') return 'My Employee Dashboard';
        if (currentRole === 'DEPARTMENT_HEAD') return `${currentUser.departmentName || 'Department'} Dashboard`;
        if (currentRole === 'BUSINESS_HEAD') return 'Executive Business Head Dashboard';
        return 'Overview Dashboard (PCCM Super Admin)';
      case 'employees':
        if (currentRole === 'EMPLOYEE') return 'My Profile & Team Records';
        if (currentRole === 'DEPARTMENT_HEAD') return `${currentUser.departmentName || 'Department'} Team Records`;
        if (currentRole === 'BUSINESS_HEAD') return 'Divisional Workforce Records';
        return 'Employee Records';
      case 'directory':
        return 'Corporate Directory';
      case 'leave':
        if (currentRole === 'EMPLOYEE') return 'My Leave Requests & Quotas';
        if (currentRole === 'DEPARTMENT_HEAD') return 'Department Leave Approvals';
        if (currentRole === 'BUSINESS_HEAD') return 'Executive Leave Sign-Offs';
        return 'Leave Management & Governance';
      case 'attendance':
        if (currentRole === 'EMPLOYEE') return 'My Attendance & Biometric Status';
        if (currentRole === 'DEPARTMENT_HEAD') return 'Department Attendance Adherence';
        if (currentRole === 'BUSINESS_HEAD') return 'Divisional Attendance Analytics';
        return 'Attendance & Biometrics';
      case 'recruitment':
        return 'Recruitment & Pipelines';
      case 'onboarding':
        return currentRole === 'EMPLOYEE' ? 'My Onboarding Tasks' : 'Onboarding Journeys';
      case 'offboarding':
        return 'Employee Lifecycle & Offboarding';
      case 'performance':
        return 'Performance & Appraisals';
      case 'documents':
        return 'Documents & Policies';
      case 'calendar':
        return 'Citadel Master Calendar';
      case 'reports':
        return 'Reports & Workforce Analytics';
      case 'notifications':
        return 'Notifications & Alerts';
      case 'integrations':
        return 'Integrations & Cloud';
      case 'ai-assistant':
        return 'AI Assistant & HR Automation';
      case 'settings':
        return 'Organization Settings';
      case 'projects':
        return 'Citadel People Hub • v3.2 release';
      case 'team-notes':
        return 'Team Notes & Operations';
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
      case 'offboarding':
        return <OffboardingView />;
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
      case 'ai-assistant':
        return <AIAssistantView />;
      case 'settings':
        return <SettingsView />;
      case 'projects':
        return <ProjectsView />;
      case 'team-notes':
        return <TeamNotesView />;
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

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  if (backendEnabled && !isAuthenticated) {
    return <LoginModal isOpen onClose={() => {}} required />;
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col font-sans text-slate-800">
      {/* 1. Notice Banner: Indicating demo data and production Supabase architecture */}
      <DemoDataBanner />

      {/* 2. Full-Width Top Navigation Bar: Spans top of screen, never covered by sidebar */}
      <Header
        activeModuleTitle={getModuleTitle(currentModule)}
        activeModuleId={currentModule}
        onNavigate={(mod) => setCurrentModule(mod)}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* 3. Main Workspace: Natural Flex container for Sidebar & Main Content */}
      <Container fluid className="p-0 flex-grow-1">
      <Row className="g-0 flex-grow-1">
        {/* Role-Aware Modern Sidebar: sits naturally below Header, never covering it */}
        <Col xs="auto" className="p-0">
          <Sidebar
          currentModule={currentModule}
          onSelectModule={(mod) => setCurrentModule(mod)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          onOpenAddEmployee={() => {
            setCurrentModule('employees');
            setIsAddEmployeeModalOpen(true);
          }}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          />
        </Col>

        {/* Dynamic View Area: sits naturally to the right of the sidebar with generous margins */}
        <Col className="min-w-0">
        <main className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 min-w-0 overflow-x-hidden">
          <div className="w-full max-w-[1720px] mx-auto min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentModule}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
                transition={{ duration: shouldReduceMotion ? 0.01 : 0.22, ease: 'easeOut' }}
              >
                {renderActiveModule()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        </Col>
      </Row>
      </Container>

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
