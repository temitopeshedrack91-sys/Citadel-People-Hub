import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  CalendarDays,
  Clock,
  Cake,
  AlertTriangle,
  UserPlus,
  ArrowUpRight,
  CheckCircle2,
  Building,
  Building2,
  Sparkles,
  FileCheck2,
  Award,
  Check,
  ChevronRight,
  Send,
  Filter,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { useAuth } from '../../context/AuthContext';
import { NavModule } from '../layout/Sidebar';
import { CitadelLogo } from '../brand/CitadelLogo';

interface DashboardViewProps {
  onNavigate: (module: NavModule) => void;
  onOpenLeaveModal: () => void;
  onOpenAddEmployee: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenLeaveModal,
  onOpenAddEmployee,
}) => {
  const { currentUser, currentRole, selectedEntityFilter, setSelectedEntityFilter } = useAuth();

  const isPCCM = currentRole === 'PCCM_SUPER_ADMIN';

  // Demo action state
  const [actionDone, setActionDone] = useState<Record<string, boolean>>({});
  const [wishedBirthday, setWishedBirthday] = useState<Record<string, boolean>>({});

  const handleQuickApprove = (actionId: string) => {
    setActionDone((prev) => ({ ...prev, [actionId]: true }));
  };

  const handleSendWish = (id: string) => {
    setWishedBirthday((prev) => ({ ...prev, [id]: true }));
  };

  // Dynamic values adjusted for entity filter
  const isCgcc = selectedEntityFilter === 'entity-cgcc';
  const isCsog = selectedEntityFilter === 'entity-csog';
  const isHoldings = selectedEntityFilter === 'entity-holdings';

  const totalEmployees = isCgcc ? 82 : isCsog ? 28 : isHoldings ? 34 : 144;
  const activeEmployees = isCgcc ? 79 : isCsog ? 27 : isHoldings ? 32 : 138;
  const employeesOnLeaveCount = isCgcc ? 2 : isCsog ? 1 : isHoldings ? 1 : 4;
  const pendingLeaveCount = isCgcc ? 1 : isCsog ? 1 : isHoldings ? 0 : 2;
  const pendingActionsCount = isCgcc ? 3 : isCsog ? 1 : isHoldings ? 1 : 5;
  const onboardingCount = isCgcc ? 1 : isCsog ? 1 : isHoldings ? 0 : 2;

  // Upcoming Birthdays
  const upcomingBirthdays = [
    {
      id: 'b-1',
      name: 'Blessing Okafor',
      dept: 'People, Culture & Change',
      entity: 'CGCC',
      date: 'Sep 28',
      milestone: '31st Birthday',
    },
    {
      id: 'b-2',
      name: 'Chef Kolawole Briggs',
      dept: 'Cafe & Culinary Services',
      entity: 'Citadel Holdings',
      date: 'Oct 04',
      milestone: '36th Birthday',
    },
    {
      id: 'b-3',
      name: 'Engr. Femi Olatunji',
      dept: 'ICT & Infrastructure',
      entity: 'CGCC',
      date: 'Nov 20',
      milestone: '39th Birthday',
    },
  ];

  // Employees currently on leave
  const employeesOnLeave = [
    {
      name: 'Chef Kolawole Briggs',
      role: 'Head Chef',
      dept: 'Cafe',
      entity: 'Citadel Holdings',
      until: '25 Sep 2026',
      type: 'Annual Leave',
    },
    {
      name: 'Barr. Tunde Sholanke',
      role: 'Admin & Ops Lead',
      dept: 'Admin & Operations',
      entity: 'Citadel School of Government',
      until: '22 Sep 2026',
      type: 'Casual Leave',
    },
    {
      name: 'Mrs. Folashade Adeyemo',
      role: 'Head of Finance',
      dept: 'Finance',
      entity: 'CGCC',
      until: '21 Sep 2026',
      type: 'Compassionate Leave',
    },
    {
      name: 'Abimbola Wright',
      role: 'Curriculum Associate',
      dept: 'Academy & Programmes',
      entity: 'Citadel School of Government',
      until: '28 Sep 2026',
      type: 'Maternity Leave',
    },
  ];

  // 5 Required Pending Actions
  const pendingActions = [
    {
      id: 'act-1',
      type: 'Leave Approval',
      title: 'Blessing Okafor - Casual Leave (2 Days)',
      subtitle: 'CGCC • People, Culture & Change Department',
      priority: 'High',
      time: '12 mins ago',
      module: 'leave' as NavModule,
    },
    {
      id: 'act-2',
      type: 'Employee Profile Approval',
      title: 'Review Staff Dossier: Michael Babatunde',
      subtitle: 'Citadel Holdings • Retail Store Assistant',
      priority: 'High',
      time: '1 hour ago',
      module: 'employees' as NavModule,
    },
    {
      id: 'act-3',
      type: 'Document Verification',
      title: 'Verify NYSC Discharge Certificate: Kelechi Eze',
      subtitle: 'CGCC • Media & Protocol Wing',
      priority: 'Medium',
      time: '3 hours ago',
      module: 'documents' as NavModule,
    },
    {
      id: 'act-4',
      type: 'Onboarding Task',
      title: 'Assign IT Workstation & Email: Engr. Daniel Alabi',
      subtitle: 'CSOG • Public Policy Fellow',
      priority: 'Medium',
      time: 'Yesterday',
      module: 'onboarding' as NavModule,
    },
    {
      id: 'act-5',
      type: 'Performance Review',
      title: 'Sign off Q3 Leadership Appraisal: Femi Olatunji',
      subtitle: 'CGCC • ICT & Technical Infrastructure Lead',
      priority: 'Low',
      time: '2 days ago',
      module: 'performance' as NavModule,
    },
  ];

  // Formatted Recent Activity List
  const recentActivities = [
    {
      id: 'act-log-1',
      actor: 'Dr. Bukola Adeleke (PCCM)',
      action: 'Approved Annual Leave',
      subject: 'Chef Kolawole Briggs (Holdings)',
      time: '15 mins ago',
      tag: 'Leave',
    },
    {
      id: 'act-log-2',
      actor: 'Biometric Gate Sensor #02',
      action: 'Logged Shift Clock-In',
      subject: '94 Staff Verified at CGCC Main Gate',
      time: '08:45 AM',
      tag: 'Attendance',
    },
    {
      id: 'act-log-3',
      actor: 'Pastor David Adeleke',
      action: 'Submitted Quarterly OKRs',
      subject: 'Citadel School of Government (CSOG)',
      time: 'Yesterday 04:30 PM',
      tag: 'Performance',
    },
    {
      id: 'act-log-4',
      actor: 'Femi Olatunji',
      action: 'Uploaded Document',
      subject: 'Cisco Enterprise Network Audit Report',
      time: 'Yesterday 02:15 PM',
      tag: 'Documents',
    },
    {
      id: 'act-log-5',
      actor: 'PCCM Enrollment Desk',
      action: 'Initiated Onboarding Journey',
      subject: 'Daniel Alabi (CSOG Fellow)',
      time: '2 days ago',
      tag: 'Onboarding',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Official PCCM Executive Welcome Header */}
      <div className="bg-gradient-to-r from-[#0A1E3F] via-[#102954] to-[#0A1E3F] rounded-2xl p-6 sm:p-7 text-white border border-[#C59B27]/30 shadow-md relative overflow-hidden">
        {/* Background Citadel Logo Watermark */}
        <div className="absolute -right-6 -bottom-8 opacity-10 pointer-events-none flex items-center pr-6 select-none">
          <CitadelLogo variant="mark" colorMode="dark" className="w-64 h-64" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C59B27]/20 border border-[#C59B27]/40 text-amber-300 text-xs font-semibold mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
            <span>People, Culture & Change Management (PCCM)</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white font-serif">
            Welcome back, {currentUser.name}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            Centralized HR governance and personnel operations for{' '}
            <strong className="text-white">Citadel Global Community Church</strong>,{' '}
            <strong className="text-white">Citadel School of Government</strong>, and{' '}
            <strong className="text-white">Citadel Holdings</strong>.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5 pt-3 border-t border-slate-700/60">
            {isPCCM && (
              <button
                id="btn-dash-add-employee"
                onClick={onOpenAddEmployee}
                className="px-4 py-2 rounded-lg bg-[#C59B27] text-slate-950 text-xs font-bold hover:bg-[#D4A836] transition flex items-center gap-1.5 shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add New Employee</span>
              </button>
            )}
            <button
              id="btn-dash-request-leave"
              onClick={onOpenLeaveModal}
              className="px-4 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-600 transition flex items-center gap-1.5"
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>Apply for Leave</span>
            </button>
            <button
              onClick={() => onNavigate('employees')}
              className="px-4 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-600 transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-slate-300" />
              <span>Manage Workforce</span>
            </button>
            <button
              onClick={() => onNavigate('attendance')}
              className="px-4 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-600 transition flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-slate-300" />
              <span>Biometric Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Six Required PCCM Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          id="stat-total-employees"
          title="Total Workforce"
          value={totalEmployees.toString()}
          subtitle="All Citadel entities"
          icon={Users}
        />
        <StatCard
          id="stat-active-employees"
          title="Active Employees"
          value={activeEmployees.toString()}
          subtitle="Current staff in post"
          icon={UserCheck}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          id="stat-employees-on-leave"
          title="Employees on Leave"
          value={employeesOnLeaveCount.toString()}
          subtitle="Authorized absences"
          icon={CalendarDays}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          id="stat-pending-leave"
          title="Pending Leave"
          value={pendingLeaveCount.toString()}
          subtitle="Requires PCCM sign-off"
          icon={CalendarDays}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          id="stat-pending-actions"
          title="Pending PCCM Actions"
          value={pendingActionsCount.toString()}
          subtitle="Approvals & tasks"
          icon={AlertTriangle}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <StatCard
          id="stat-in-onboarding"
          title="In Onboarding"
          value={onboardingCount.toString()}
          subtitle="Active induction track"
          icon={UserPlus}
          iconColor="text-[#C59B27]"
          iconBg="bg-amber-50"
        />
      </div>

      {/* 3. People Overview & Attendance Overview (Two-column layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* People Overview Panel (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0A1E3F]" />
                <span>People Overview</span>
              </h3>
              <p className="text-xs text-slate-500">
                Staff distribution breakdown across entities, departments, and lifecycle status.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 self-start sm:self-auto">
              Total: {totalEmployees} Staff
            </span>
          </div>

          {/* Breakdown by Entity */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
              <span className="uppercase tracking-wider text-[10px] text-slate-500">
                1. Distribution by Citadel Entity
              </span>
              <span className="text-[11px] text-slate-400">Target: 100% capacity</span>
            </div>

            <div className="space-y-2.5">
              {/* CGCC */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-800">
                    Citadel Global Community Church (CGCC)
                  </span>
                  <span className="font-mono text-slate-600 font-semibold">
                    82 Staff (57.0%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0A1E3F] rounded-full" style={{ width: '57%' }}></div>
                </div>
              </div>

              {/* CSOG */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-800">
                    Citadel School of Government (CSOG)
                  </span>
                  <span className="font-mono text-slate-600 font-semibold">
                    28 Staff (19.4%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C59B27] rounded-full" style={{ width: '19.4%' }}></div>
                </div>
              </div>

              {/* Citadel Holdings */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-800">
                    Citadel Holdings (Bookshop, Cafe, Workstation, Asabi Aladire)
                  </span>
                  <span className="font-mono text-slate-600 font-semibold">
                    34 Staff (23.6%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: '23.6%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown by Key Departments & Employment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            {/* Departments */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                2. Key Departments
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 px-2 rounded bg-slate-50">
                  <span className="text-slate-700">Finance & Accounts</span>
                  <span className="font-mono font-bold text-slate-900">12</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-slate-50">
                  <span className="text-slate-700">People, Culture & Change (PCCM)</span>
                  <span className="font-mono font-bold text-[#C59B27]">8</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-slate-50">
                  <span className="text-slate-700">Facilities & Maintenance</span>
                  <span className="font-mono font-bold text-slate-900">22</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-slate-50">
                  <span className="text-slate-700">ICT & Technical Infrastructure</span>
                  <span className="font-mono font-bold text-slate-900">14</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-slate-50">
                  <span className="text-slate-700">School of Government (CSOG)</span>
                  <span className="font-mono font-bold text-slate-900">28</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-slate-50">
                  <span className="text-slate-700">Holdings Commercial Units</span>
                  <span className="font-mono font-bold text-slate-900">34</span>
                </div>
              </div>
            </div>

            {/* Employment Status */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                3. Lifecycle Employment Status
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-1 px-2 rounded bg-emerald-50 text-emerald-900">
                  <span className="font-medium">Active (Confirmed)</span>
                  <span className="font-mono font-bold">132</span>
                </div>
                <div className="flex items-center justify-between py-1 px-2 rounded bg-amber-50 text-amber-900">
                  <span className="font-medium">Probationary Period</span>
                  <span className="font-mono font-bold">6</span>
                </div>
                <div className="flex items-center justify-between py-1 px-2 rounded bg-indigo-50 text-indigo-900">
                  <span className="font-medium">On Authorized Leave</span>
                  <span className="font-mono font-bold">4</span>
                </div>
                <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-100 text-slate-700">
                  <span className="font-medium">Notice Period / Offboarding</span>
                  <span className="font-mono font-bold">2</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Overview (Demo Visualization) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0A1E3F]" />
                <h3 className="text-sm font-bold text-slate-900">Attendance Overview</h3>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono">
                DEVELOPMENT / DEMO
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Biometric check-in snapshot from Citadel main gatehouse and campus readers:
            </p>

            {/* Visual Attendance Bar */}
            <div className="mt-4">
              <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: '88.9%' }}
                  title="Present: 128"
                ></div>
                <div
                  className="bg-amber-400 h-full"
                  style={{ width: '5.6%' }}
                  title="Late: 8"
                ></div>
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: '2.8%' }}
                  title="Absent: 4"
                ></div>
                <div
                  className="bg-indigo-500 h-full"
                  style={{ width: '2.7%' }}
                  title="On Leave: 4"
                ></div>
              </div>

              {/* Legend & Numbers */}
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-700 font-medium">Present</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-800 mt-1">128</div>
                  <span className="text-[10px] text-emerald-600">88.9% on-time</span>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-slate-700 font-medium">Late</span>
                  </div>
                  <div className="text-lg font-bold text-amber-800 mt-1">8</div>
                  <span className="text-[10px] text-amber-600">Grace period applied</span>
                </div>

                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="text-slate-700 font-medium">Absent</span>
                  </div>
                  <div className="text-lg font-bold text-rose-800 mt-1">4</div>
                  <span className="text-[10px] text-rose-600">Pending justification</span>
                </div>

                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    <span className="text-slate-700 font-medium">On Leave</span>
                  </div>
                  <div className="text-lg font-bold text-indigo-800 mt-1">4</div>
                  <span className="text-[10px] text-indigo-600">PCCM approved</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700 block mb-0.5">Biometric Sensor Note:</span>
              Demonstrating device sync architecture with Anviz / ZKTeco biometric stream.
            </div>
          </div>

          <button
            onClick={() => onNavigate('attendance')}
            className="mt-4 w-full py-2 text-xs font-semibold text-[#0A1E3F] hover:text-[#152B52] border border-slate-200 hover:border-slate-300 rounded-lg transition text-center"
          >
            Explore Detailed Attendance Log →
          </button>
        </div>
      </div>

      {/* 4. Three Operational Columns: Pending Actions, Birthdays, Personnel on Leave */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Actions List (Leave approval, Profile approval, Doc verification, Onboarding, Performance) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Pending PCCM Actions</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
                5 Tasks
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {pendingActions.map((act) => {
                const isDone = actionDone[act.id];
                return (
                  <div
                    key={act.id}
                    className={`p-3 rounded-lg border transition ${
                      isDone
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#C59B27]">
                          {act.type}
                        </span>
                        <p className={`text-xs font-semibold ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {act.title}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{act.subtitle}</p>
                        <span className="text-[9px] text-slate-400 font-mono mt-1 block">
                          {act.time}
                        </span>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            act.priority === 'High'
                              ? 'bg-rose-100 text-rose-700'
                              : act.priority === 'Medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {act.priority}
                        </span>

                        {!isDone ? (
                          <button
                            onClick={() => handleQuickApprove(act.id)}
                            className="px-2 py-1 rounded bg-[#0A1E3F] hover:bg-[#152B52] text-white text-[10px] font-semibold transition"
                          >
                            Resolve
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Done
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigate('leave')}
            className="mt-4 w-full py-2 text-xs font-semibold text-[#0A1E3F] hover:text-[#152B52] border border-slate-200 hover:border-slate-300 rounded-lg transition text-center"
          >
            Review All Governance Approvals →
          </button>
        </div>

        {/* Upcoming Birthdays Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-pink-500" />
                <h3 className="text-sm font-bold text-slate-900">Upcoming Birthdays</h3>
              </div>
              <span className="text-[10px] font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-full">
                Citadel Community
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {upcomingBirthdays.map((b) => {
                const isWished = wishedBirthday[b.id];
                return (
                  <div
                    key={b.id}
                    className="p-3 rounded-lg border border-pink-100/70 bg-pink-50/30 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {b.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{b.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {b.dept} • {b.entity}
                        </p>
                        <span className="text-[10px] font-bold text-pink-600 block mt-0.5">
                          {b.date} • {b.milestone}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendWish(b.id)}
                      disabled={isWished}
                      className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition shrink-0 ${
                        isWished
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-white hover:bg-pink-100 text-pink-700 border border-pink-200'
                      }`}
                    >
                      {isWished ? (
                        <>
                          <Check className="w-3 h-3" /> Wished
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" /> Wish
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-800 block">Culture Milestone Notice:</span>
            PCCM automatically schedules personalized congratulatory greetings across Citadel Slack/WhatsApp groups.
          </div>
        </div>

        {/* Personnel on Leave */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Personnel on Leave</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                4 Active
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {employeesOnLeave.map((emp, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-start justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{emp.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {emp.role} • {emp.dept}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        Resumes: {emp.until}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 shrink-0">
                    {emp.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('leave')}
            className="mt-4 w-full py-2 text-xs font-semibold text-[#0A1E3F] hover:text-[#152B52] border border-slate-200 hover:border-slate-300 rounded-lg transition text-center"
          >
            View Citadel Leave Calendar →
          </button>
        </div>
      </div>

      {/* 5. Recent Activity List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent PCCM System Activity</h3>
            <p className="text-xs text-slate-500">
              Audited operational actions across personnel, time, and talent modules.
            </p>
          </div>
          <button
            onClick={() => onNavigate('audit-logs')}
            className="text-xs text-[#0A1E3F] hover:text-[#152B52] font-semibold flex items-center gap-1"
          >
            <span>View Complete Audit Log</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 mt-2">
          {recentActivities.map((act) => (
            <div key={act.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span
                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                    act.tag === 'Leave'
                      ? 'bg-indigo-100 text-indigo-800'
                      : act.tag === 'Attendance'
                      ? 'bg-emerald-100 text-emerald-800'
                      : act.tag === 'Performance'
                      ? 'bg-purple-100 text-purple-800'
                      : act.tag === 'Documents'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {act.tag}
                </span>
                <div>
                  <span className="font-semibold text-slate-900">{act.actor}</span>
                  <span className="text-slate-600 ml-1.5">{act.action}:</span>
                  <span className="text-slate-800 font-medium ml-1">{act.subject}</span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-400 shrink-0">{act.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
