import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users,
  CheckCircle2,
  ChevronRight,
  Building2,
  Calendar,
  Download,
  Zap,
  X,
  FileSpreadsheet,
  Cake,
  ShieldCheck,
  Activity,
  FileText,
  Clock,
  CalendarDays,
  FolderKanban,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { isHrOrAdminUser, isManagerUser } from '../../utils/rbac';
import { shouldUseLaravelBackend } from '../../utils/authMode';
import { getLaravelAccessToken, isLaravelApiConfigured, requestLaravelData } from '../../services/laravelClient';
import { NavModule } from '../layout/Sidebar';
import {
  employeeRepository,
  leaveRepository,
  attendanceRepository,
  organizationRepository,
} from '../../services';
import {
  Employee,
  LeaveRequest,
  AttendanceRecord,
  CitadelEntity,
  LeaveBalanceRecord,
} from '../../types';
import { StatCard } from '../common/StatCard';
import { StatusPill } from '../common/StatusPill';
import { ProgressRing } from '../common/ProgressRing';
import { ScheduleCalendar, ScheduleEvent } from '../common/ScheduleCalendar';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { EmployeeDashboard } from './dashboard/EmployeeDashboard';
import { DepartmentHeadDashboard } from './dashboard/DepartmentHeadDashboard';

interface DashboardViewProps {
  onNavigate: (module: NavModule) => void;
  onOpenLeaveModal: () => void;
  onOpenAddEmployee: () => void;
}

interface EntityBreakdownItem {
  id: string;
  name: string;
  shortCode: string;
  count: number;
}

interface DashboardTaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  projectName?: string | null;
  departmentName?: string | null;
  assigneeName?: string | null;
}

interface AttendanceDayPoint {
  day: string;
  date: string;
  presentCount: number;
  lateCount: number;
  totalLogged: number;
  isToday: boolean;
}

interface UpcomingMilestone {
  id: string;
  fullName: string;
  departmentName: string;
  dateLabel: string;
  daysUntil?: number;
  type: string;
}

interface HrOverviewData {
  totalEmployees: number;
  activeEmployees: number;
  recentHiresCount: number;
  pendingManagerCount: number;
  pendingHrCount: number;
  approvedCount: number;
  rejectedCount: number;
  allRequests: LeaveRequest[];
  entityBreakdown: EntityBreakdownItem[];
  onLeaveToday: {
    id: string | number;
    employeeId?: string | number;
    employeeName: string;
    departmentName?: string | null;
    entityName?: string | null;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
  }[];
  activeTasks: DashboardTaskItem[];
  attendanceToday: {
    totalLogged: number;
    presentCount: number;
    lateCount: number;
  };
  attendanceTrend: AttendanceDayPoint[];
  upcomingMilestones: UpcomingMilestone[];
}

interface DashboardSummaryApiResponse {
  effectiveRole: string;
  balances?: LeaveBalanceRecord[];
  myLeaves?: LeaveRequest[];
  hrOverview?: Partial<HrOverviewData>;
}

const getInitials = (name?: string | null): string => {
  if (!name) return 'ST';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'ST';
};

const getRecentWeekdays = (): { day: string; date: string; isToday: boolean }[] => {
  const days: { day: string; date: string; isToday: boolean }[] = [];
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const cursor = new Date(today);
  while (days.length < 5) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      days.unshift({
        day: cursor.toLocaleDateString('en-US', { weekday: 'short' }),
        date: cursor.toISOString().split('T')[0],
        isToday: cursor.toISOString().split('T')[0] === todayIso,
      });
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
};

const csvCell = (val: unknown): string => {
  const str = String(val ?? '').replace(/"/g, '""');
  return `"${str}"`;
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenLeaveModal,
  onOpenAddEmployee,
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const hasActiveStaffIdentity = isAuthenticated || Boolean(currentUser?.staffId);

  if (hasActiveStaffIdentity && isManagerUser(currentUser)) {
    return <DepartmentHeadDashboard onNavigate={onNavigate} onOpenLeaveModal={onOpenLeaveModal} />;
  }

  if (hasActiveStaffIdentity && !isHrOrAdminUser(currentUser)) {
    return <EmployeeDashboard onNavigate={onNavigate} onOpenLeaveModal={onOpenLeaveModal} />;
  }

  return (
    <HrAdminDashboardContent
      onNavigate={onNavigate}
      onOpenLeaveModal={onOpenLeaveModal}
      onOpenAddEmployee={onOpenAddEmployee}
    />
  );
};

const HrAdminDashboardContent: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenLeaveModal,
  onOpenAddEmployee,
}) => {
  const { currentUser, selectedEntityFilter } = useAuth();

  const [overview, setOverview] = useState<HrOverviewData>({
    totalEmployees: 0,
    activeEmployees: 0,
    recentHiresCount: 0,
    pendingManagerCount: 0,
    pendingHrCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    allRequests: [],
    entityBreakdown: [],
    onLeaveToday: [],
    activeTasks: [],
    attendanceToday: { totalLogged: 0, presentCount: 0, lateCount: 0 },
    attendanceTrend: getRecentWeekdays().map((d) => ({
      ...d,
      presentCount: 0,
      lateCount: 0,
      totalLogged: 0,
    })),
    upcomingMilestones: [],
  });
  const [liveBalances, setLiveBalances] = useState<LeaveBalanceRecord[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [entities, setEntities] = useState<CitadelEntity[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processingLeaveId, setProcessingLeaveId] = useState<string | null>(null);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadDashboardData = useCallback(async () => {
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = null;
    }
    setLoadError(null);

    try {
      const useApiSummary =
        shouldUseLaravelBackend(import.meta.env.PROD, isLaravelApiConfigured()) &&
        Boolean(getLaravelAccessToken());

      if (useApiSummary) {
        const query =
          selectedEntityFilter && selectedEntityFilter !== 'all'
            ? `?entity_id=${encodeURIComponent(selectedEntityFilter)}`
            : '';
        const [summary, entityList] = await Promise.all([
          requestLaravelData<DashboardSummaryApiResponse>(`/dashboard/summary${query}`),
          organizationRepository.getEntities().catch(() => [] as CitadelEntity[]),
        ]);

        setEntities(entityList);
        setLiveBalances(Array.isArray(summary.balances) ? summary.balances : []);
        setMyLeaves(Array.isArray(summary.myLeaves) ? summary.myLeaves : []);

        const hr = summary.hrOverview || {};
        setOverview({
          totalEmployees: Number(hr.totalEmployees ?? 0),
          activeEmployees: Number(hr.activeEmployees ?? 0),
          recentHiresCount: Number(hr.recentHiresCount ?? 0),
          pendingManagerCount: Number(hr.pendingManagerCount ?? 0),
          pendingHrCount: Number(hr.pendingHrCount ?? 0),
          approvedCount: Number(hr.approvedCount ?? 0),
          rejectedCount: Number(hr.rejectedCount ?? 0),
          allRequests: Array.isArray(hr.allRequests) ? hr.allRequests : [],
          entityBreakdown: Array.isArray(hr.entityBreakdown) ? hr.entityBreakdown : [],
          onLeaveToday: Array.isArray(hr.onLeaveToday) ? hr.onLeaveToday : [],
          activeTasks: Array.isArray(hr.activeTasks) ? hr.activeTasks : [],
          attendanceToday: hr.attendanceToday || { totalLogged: 0, presentCount: 0, lateCount: 0 },
          attendanceTrend:
            Array.isArray(hr.attendanceTrend) && hr.attendanceTrend.length > 0
              ? hr.attendanceTrend
              : getRecentWeekdays().map((d) => ({
                  ...d,
                  presentCount: 0,
                  lateCount: 0,
                  totalLogged: 0,
                })),
          upcomingMilestones: Array.isArray(hr.upcomingMilestones) ? hr.upcomingMilestones : [],
        });
      } else {
        const [empList, entList, leaveList, balList, attLogs] = await Promise.all([
          employeeRepository.getAll({
            entityId: selectedEntityFilter === 'all' ? undefined : selectedEntityFilter,
          }),
          organizationRepository.getEntities().catch(() => [] as CitadelEntity[]),
          leaveRepository.getAll(),
          leaveRepository.getBalances().catch(() => [] as LeaveBalanceRecord[]),
          attendanceRepository.getRecentLogs().catch(() => [] as AttendanceRecord[]),
        ]);

        const todayIso = new Date().toISOString().split('T')[0];
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const cutoffIso = cutoff.toISOString().split('T')[0];

        const entityBreakdown: EntityBreakdownItem[] = entList.map((ent) => ({
          id: String(ent.id),
          name: ent.name,
          shortCode: ent.shortCode,
          count: empList.filter(
            (e) =>
              String(e.entityId) === String(ent.id) ||
              (e.entityName || '').toLowerCase().includes(ent.shortCode.toLowerCase())
          ).length,
        }));

        const onLeaveToday = leaveList
          .filter(
            (l) =>
              l.status === 'Approved' &&
              l.startDate <= todayIso &&
              l.endDate >= todayIso
          )
          .slice(0, 8)
          .map((l) => ({
            id: l.id,
            employeeId: l.employeeId,
            employeeName: l.employeeName,
            departmentName: l.departmentName,
            entityName: l.entityName,
            leaveType: l.leaveType,
            startDate: l.startDate,
            endDate: l.endDate,
            totalDays: l.totalDays,
          }));

        const weekdays = getRecentWeekdays();
        const attendanceTrend: AttendanceDayPoint[] = weekdays.map((day) => {
          const dayLogs = attLogs.filter((log) => (log.date || '').slice(0, 10) === day.date);
          const lateCount = dayLogs.filter((log) => (log.status || '').toLowerCase() === 'late').length;
          const totalLogged = dayLogs.length;
          return {
            ...day,
            presentCount: Math.max(0, totalLogged - lateCount),
            lateCount,
            totalLogged,
          };
        });
        const todayPoint = attendanceTrend.find((p) => p.isToday);

        const ownActorId = String(currentUser.employeeId || currentUser.id || '');
        const ownLeaves = leaveList.filter(
          (l) =>
            (ownActorId && String(l.employeeId) === ownActorId) ||
            (currentUser.staffId && l.employeeStaffId === currentUser.staffId)
        );

        setEntities(entList);
        setLiveBalances(balList);
        setMyLeaves(ownLeaves.length > 0 ? ownLeaves : leaveList.slice(0, 3));
        setOverview({
          totalEmployees: empList.length,
          activeEmployees: empList.filter((e) => e.status === 'Active').length,
          recentHiresCount: empList.filter((e) => (e.employmentDate || '') >= cutoffIso).length,
          pendingManagerCount: leaveList.filter(
            (l) =>
              (l.approvalStage === 'MANAGER' || l.approvalStage === 'LINE_MANAGER') &&
              l.status === 'Submitted'
          ).length,
          pendingHrCount: leaveList.filter(
            (l) =>
              l.approvalStage === 'HR' &&
              (l.status === 'Pending Review' || l.status === 'Submitted')
          ).length,
          approvedCount: leaveList.filter((l) => l.status === 'Approved').length,
          rejectedCount: leaveList.filter((l) => l.status === 'Rejected').length,
          allRequests: leaveList,
          entityBreakdown,
          onLeaveToday,
          activeTasks: [],
          attendanceToday: {
            totalLogged: todayPoint?.totalLogged ?? 0,
            presentCount: todayPoint?.presentCount ?? 0,
            lateCount: todayPoint?.lateCount ?? 0,
          },
          attendanceTrend,
          upcomingMilestones: [],
        });
      }
      setHasLoadedOnce(true);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load dashboard summary.');
      setHasLoadedOnce(true);
    }
  }, [currentUser.employeeId, currentUser.id, currentUser.staffId, selectedEntityFilter]);

  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null;
      void loadDashboardData();
    }, 150);
  }, [loadDashboardData]);

  useEffect(() => {
    void loadDashboardData();
    return () => {
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
    };
  }, [loadDashboardData]);

  useRealtimeTable('employees', scheduleReload);
  useRealtimeTable('leave_requests', scheduleReload);
  useRealtimeTable('leave_balances', scheduleReload);
  useRealtimeTable('tasks', scheduleReload);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const greetingName = useMemo(() => {
    if (!currentUser?.name) return 'Team';
    const parts = currentUser.name.trim().split(/\s+/);
    const titles = ['Dr.', 'Dr', 'Prof.', 'Prof', 'Pastor', 'Rev.', 'Rev', 'Mr.', 'Mr', 'Mrs.', 'Mrs', 'Ms.', 'Ms', 'Engr.', 'Engr'];
    if (titles.includes(parts[0]) && parts.length > 1) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0] || 'Team';
  }, [currentUser?.name]);

  const hrQueue = useMemo(
    () =>
      overview.allRequests.filter(
        (l) =>
          l.approvalStage === 'HR' &&
          (l.status === 'Pending Review' || l.status === 'Submitted')
      ),
    [overview.allRequests]
  );

  const ownAnnualBalance = useMemo(() => {
    const own = liveBalances.filter(
      (b) =>
        (currentUser.employeeId && String(b.employee_id) === String(currentUser.employeeId)) ||
        (currentUser.staffId && b.employee?.staff_id === currentUser.staffId)
    );
    const pool = own.length > 0 ? own : liveBalances;
    return pool.find((b) => (b.category?.name || '').toLowerCase().includes('annual')) || pool[0] || null;
  }, [currentUser.employeeId, currentUser.staffId, liveBalances]);

  const calendarScheduleEvents: ScheduleEvent[] = useMemo(() => {
    return overview.allRequests
      .filter((l) => l.status === 'Approved')
      .slice(0, 6)
      .map((l) => ({
        id: `leave-${l.id}`,
        time: `${l.totalDays}d Leave`,
        tag: l.leaveType,
        title: `${l.employeeName} — ${l.leaveType}`,
        channel: l.departmentName || l.entityName || 'Citadel Team',
        category: 'Holidays',
        dateString: l.startDate,
        dayNum: Number((l.startDate || '').split('-')[2]) || undefined,
        description: `${l.startDate} to ${l.endDate}`,
      }));
  }, [overview.allRequests]);

  const activeScopeName = useMemo(() => {
    if (!selectedEntityFilter || selectedEntityFilter === 'all') return 'All Entities';
    const match = entities.find((e) => String(e.id) === String(selectedEntityFilter));
    return match ? `${match.name} (${match.shortCode})` : 'Filtered Entity';
  }, [entities, selectedEntityFilter]);

  const handleStage2Action = async (leave: LeaveRequest, status: 'Approved' | 'Rejected') => {
    setProcessingLeaveId(leave.id);
    try {
      await leaveRepository.updateStatus(
        leave.id,
        status,
        currentUser.name,
        status === 'Approved' ? 'Final HR approval confirmed.' : 'Rejected at Stage 2 by HR.'
      );
      await loadDashboardData();
      showToast(
        status === 'Approved'
          ? `Final HR approval granted for ${leave.employeeName}.`
          : `Rejected leave request for ${leave.employeeName}.`
      );
    } catch (err: any) {
      showToast(err?.message || 'Unable to process leave action.');
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleExportSummaryCsv = () => {
    const rows: string[][] = [
      ['Metric', 'Value'],
      ['Entity Scope', activeScopeName],
      ['Total Employees', String(overview.totalEmployees)],
      ['Active Staff', String(overview.activeEmployees)],
      ['Recent Hires (30d)', String(overview.recentHiresCount)],
      ['Stage 2 HR Approvals Pending', String(overview.pendingHrCount)],
      ['Stage 1 Manager Reviews Pending', String(overview.pendingManagerCount)],
      ['On Leave Today', String(overview.onLeaveToday.length)],
      [],
      ['Entity', 'Short Code', 'Headcount'],
      ...overview.entityBreakdown.map((e) => [e.name, e.shortCode, String(e.count)]),
    ];

    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
    try {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Citadel_Executive_Summary_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      showToast('Executive summary CSV downloaded.');
    } catch {
      showToast('Summary prepared cleanly.');
    }
  };

  const recentPersonalLeaves = myLeaves.length > 0 ? myLeaves.slice(0, 3) : [];
  const totalEntityHeadcount = overview.entityBreakdown.reduce((sum, e) => sum + e.count, 0) || overview.totalEmployees;

  return (
    <ErrorBoundary fallbackTitle="Dashboard Unavailable">
      <div className="space-y-5 pb-10 font-sans antialiased text-slate-900" data-testid="dashboard-view">
        {toastMessage && (
          <div
            role="status"
            className="fixed bottom-6 right-6 z-50 bg-[#083E34] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold animate-slide-up border border-emerald-950/40"
          >
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" aria-hidden="true" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. Executive Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/citadel-logo.png"
              alt="Citadel Logo"
              className="h-10 w-10 object-contain rounded-xl p-1 bg-white border border-slate-200/90 shadow-2xs shrink-0"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {greeting}, {greetingName}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Executive Operations Overview · {activeScopeName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleExportSummaryCsv}
              data-testid="export-report-btn"
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsQuickActionsOpen(true)}
              data-testid="quick-actions-btn"
              className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-2xs border border-[#C59B27] transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950" aria-hidden="true" />
              <span>Quick Actions</span>
            </button>
          </div>
        </div>

        {loadError && (
          <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            <span>{loadError}</span>
          </div>
        )}

        {/* 2. Live 4-Metric KPI Strip */}
        {!hasLoadedOnce ? (
          <LoadingSkeleton type="stats" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="Total Employees"
              value={overview.totalEmployees}
              icon={Users}
              iconColor="text-[#083E34]"
              iconBg="bg-[#EBF5F2] border-[#A3D4C7]/50"
              supportingText={
                <span className="text-slate-600 tabular-nums">
                  <strong className="font-semibold text-emerald-700">{overview.activeEmployees} active</strong>
                  {' · '}
                  {overview.recentHiresCount} joined (30d)
                </span>
              }
              onClick={() => onNavigate('employees')}
              dataTestId="stat-total-employees"
            />

            <StatCard
              title="Stage 2 HR Approvals"
              value={hrQueue.length}
              icon={ShieldCheck}
              iconColor={hrQueue.length > 0 ? 'text-amber-700' : 'text-emerald-700'}
              iconBg={hrQueue.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}
              supportingText={
                <span className="text-slate-600 tabular-nums">
                  {overview.pendingManagerCount} awaiting Stage 1 manager review
                </span>
              }
              onClick={() => onNavigate('leave')}
              dataTestId="stat-hr-approvals"
            />

            <StatCard
              title="Today Attendance"
              value={
                overview.attendanceToday.totalLogged > 0
                  ? `${overview.attendanceToday.totalLogged} logged`
                  : '0 logged'
              }
              icon={Clock}
              iconColor="text-[#083E34]"
              iconBg="bg-slate-100 border-slate-200"
              supportingText={
                overview.attendanceToday.totalLogged > 0 ? (
                  <span className="text-slate-600 tabular-nums">
                    {overview.attendanceToday.presentCount} on time · {overview.attendanceToday.lateCount} late
                  </span>
                ) : (
                  <span className="text-slate-500">No punches synced for today yet</span>
                )
              }
              onClick={() => onNavigate('attendance')}
              dataTestId="stat-attendance"
            />

            <StatCard
              title="On Leave Today"
              value={overview.onLeaveToday.length}
              icon={CalendarDays}
              iconColor="text-slate-700"
              iconBg="bg-slate-100 border-slate-200"
              supportingText={
                <span className="text-slate-600 tabular-nums">
                  {overview.approvedCount} approved · {overview.rejectedCount} rejected total
                </span>
              }
              onClick={() => onNavigate('calendar')}
              dataTestId="stat-active-staff"
            />
          </div>
        )}

        {/* 3. Main Operational Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT MAJOR COLUMN (8 COLS) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Stage 2 HR Leave Queue */}
            <section className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
                    <span>Stage 2 HR Leave Approvals</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Requests cleared at Stage 1 by direct supervisors awaiting final HR decision.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('leave')}
                  className="text-xs font-semibold text-[#083E34] hover:underline shrink-0 cursor-pointer"
                >
                  Open Leave Queue
                </button>
              </div>

              {hrQueue.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {hrQueue.slice(0, 5).map((lv) => (
                    <div
                      key={lv.id}
                      className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{lv.employeeName}</span>
                          <StatusPill status="pending" label={lv.leaveType} size="sm" />
                        </div>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          {lv.startDate} → {lv.endDate} ({lv.totalDays}d) · Stage 1:{' '}
                          {lv.managerActorName || lv.managerName || 'Cleared'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={processingLeaveId === lv.id}
                          onClick={() => handleStage2Action(lv, 'Rejected')}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold cursor-pointer transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={processingLeaveId === lv.id}
                          onClick={() => handleStage2Action(lv, 'Approved')}
                          className="px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 border border-[#C59B27] text-xs font-semibold cursor-pointer transition disabled:opacity-50"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>
                      No leave requests currently awaiting Stage 2 HR approval.
                      {overview.pendingManagerCount > 0
                        ? ` (${overview.pendingManagerCount} pending Stage 1 Manager review.)`
                        : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('leave')}
                    className="text-xs font-semibold text-[#083E34] hover:underline shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    View all requests
                  </button>
                </div>
              )}
            </section>

            {/* Active Workstreams (Live Tasks from Database) */}
            <section className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
                    <span>Active Workstreams &amp; Open Tasks</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live open deliverables across Trellis project boards.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('projects')}
                  data-testid="projects-view-all"
                  className="text-xs font-semibold text-[#083E34] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Open Projects</span>
                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              {overview.activeTasks.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {overview.activeTasks.map((task) => {
                    const p = (task.priority || 'medium').toLowerCase();
                    const pillStatus = p === 'high' || p === 'urgent' ? 'high' : 'medium';
                    return (
                      <button
                        type="button"
                        key={task.id}
                        data-testid={`project-card-${task.id}`}
                        onClick={() => onNavigate('projects')}
                        className="w-full px-5 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-900 truncate">
                              {task.title}
                            </span>
                            <StatusPill
                              status={pillStatus}
                              label={task.priority || 'medium'}
                              size="sm"
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {task.projectName || 'General Project'}
                            {task.departmentName ? ` · ${task.departmentName}` : ''}
                            {task.dueDate ? ` · Due ${task.dueDate}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.assigneeName && (
                            <span
                              title={task.assigneeName}
                              className="w-6 h-6 rounded-full bg-[#083E34] text-white text-[10px] font-semibold flex items-center justify-center"
                            >
                              {getInitials(task.assigneeName)}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500">
                    No open project tasks queued right now. Create or assign deliverables in the Projects workspace.
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('projects')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    Go to Projects
                  </button>
                </div>
              )}
            </section>

            {/* Entity Distribution & 5-Weekday Attendance Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Workforce by Entity */}
              <section className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
                      <span>Workforce by Entity</span>
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Live headcount breakdown.</p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded tabular-nums">
                    {totalEntityHeadcount}
                  </span>
                </div>

                <div className="space-y-3">
                  {overview.entityBreakdown.length > 0 ? (
                    overview.entityBreakdown.map((ent, idx) => {
                      const pct =
                        totalEntityHeadcount > 0
                          ? Math.round((ent.count / totalEntityHeadcount) * 1000) / 10
                          : 0;
                      const barColors = ['bg-[#083E34]', 'bg-[#D4AF37]', 'bg-emerald-600'];
                      return (
                        <div key={ent.id}>
                          <div className="flex justify-between text-xs mb-1 gap-2">
                            <span className="text-slate-700 font-medium truncate">
                              {ent.name} ({ent.shortCode})
                            </span>
                            <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                              {ent.count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColors[idx % barColors.length]}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500">No entities configured yet.</p>
                  )}
                </div>
              </section>

              {/* Last 5 Weekdays Attendance */}
              <section className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#083E34]" aria-hidden="true" />
                      <span>5-Weekday Check-In Log</span>
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Recorded daily attendance punches.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('attendance')}
                    className="text-xs font-semibold text-[#083E34] hover:underline cursor-pointer"
                  >
                    Details
                  </button>
                </div>

                {overview.attendanceTrend.some((d) => d.totalLogged > 0) ? (
                  <div className="space-y-2.5 text-xs">
                    {overview.attendanceTrend.map((d) => {
                      const denom = Math.max(1, overview.activeEmployees || 1);
                      const widthPct = Math.min(100, Math.round((d.totalLogged / denom) * 100));
                      return (
                        <div key={d.date} className="space-y-1">
                          <div className="flex items-center justify-between tabular-nums">
                            <span className="font-medium text-slate-700">
                              {d.day} ({d.date})
                              {d.isToday ? ' · Today' : ''}
                            </span>
                            <span className="font-mono font-semibold text-slate-900">
                              {d.totalLogged} logged
                              {d.lateCount > 0 ? ` (${d.lateCount} late)` : ''}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${d.isToday ? 'bg-[#083E34]' : 'bg-emerald-600'}`}
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-xs text-slate-500 space-y-2">
                    <p>No biometric or web attendance logs recorded in the last 5 weekdays.</p>
                    <button
                      type="button"
                      onClick={() => onNavigate('attendance')}
                      className="text-xs font-semibold text-[#083E34] hover:underline cursor-pointer"
                    >
                      Open Attendance &amp; Import Punches
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>

          {/* RIGHT MINOR COLUMN (4 COLS) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Staff On Leave Today */}
            <section
              data-testid="team-presence-card"
              className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">Staff On Leave Today</h2>
                <button
                  type="button"
                  onClick={() => onNavigate('calendar')}
                  className="text-xs font-semibold text-[#083E34] hover:underline cursor-pointer"
                >
                  Calendar
                </button>
              </div>

              {overview.onLeaveToday.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {overview.onLeaveToday.map((item) => (
                    <div key={String(item.id)} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#083E34] text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                          {getInitials(item.employeeName)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 block truncate">
                            {item.employeeName}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {item.leaveType} · Returns after {item.endDate}
                          </span>
                        </div>
                      </div>
                      <StatusPill status="on-leave" label="On Leave" size="sm" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-2">
                  No staff members have an approved leave covering today.
                </p>
              )}
            </section>

            {/* Personal Leave Balance Card */}
            <section
              data-testid="leave-balance-card"
              className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-700" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-slate-900">Personal Leave Balance</h2>
                </div>
                <button
                  type="button"
                  onClick={onOpenLeaveModal}
                  className="text-xs font-semibold text-[#083E34] hover:underline cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {ownAnnualBalance ? (
                <div className="flex flex-col items-center justify-center">
                  {(() => {
                    const total = Number(ownAnnualBalance.total_days) || 0;
                    const rem = Math.max(0, Number(ownAnnualBalance.remaining_days) || 0);
                    const pct = total > 0 ? Math.round((rem / total) * 100) : 0;
                    return (
                      <ProgressRing
                        value={pct}
                        max={100}
                        label={`${pct}%`}
                        subtext={`${rem} out of ${total}`}
                        type="semicircle"
                        strokeColor="#083E34"
                      />
                    );
                  })()}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-2">
                  No personal leave entitlement record linked to this account.
                </p>
              )}

              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                {recentPersonalLeaves.length > 0 ? (
                  recentPersonalLeaves.map((lv) => {
                    const statusType =
                      lv.status === 'Approved' ? 'confirmed' : lv.status === 'Rejected' ? 'rejected' : 'pending';
                    return (
                      <button
                        type="button"
                        key={lv.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onNavigate('leave')}
                        className="w-full flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition text-left"
                      >
                        <span className="text-xs font-medium text-slate-700 truncate">
                          {lv.startDate} · {lv.leaveType}
                        </span>
                        <StatusPill status={statusType} label={lv.status} size="sm" />
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 text-center py-1">No recent leave requests.</p>
                )}
              </div>
            </section>

            {/* Schedule Calendar */}
            <ScheduleCalendar
              events={calendarScheduleEvents}
              onViewAll={() => onNavigate('calendar')}
              onSelectEvent={(evt) => showToast(`Selected: ${evt.title} (${evt.time})`)}
            />

            {/* Upcoming Staff Milestones */}
            <section className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Cake className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-slate-900">Upcoming Birthdays</h2>
                </div>
                <span className="text-[11px] font-medium text-slate-500">Next 45 days</span>
              </div>

              {overview.upcomingMilestones.length > 0 ? (
                <div className="space-y-2">
                  {overview.upcomingMilestones.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl border border-slate-200/70 bg-slate-50/60 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#FAF5EB] text-[#B45309] font-semibold flex items-center justify-center text-[10px] shrink-0 border border-[#F2E4B8]">
                          {getInitials(m.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{m.fullName}</p>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {m.dateLabel} · {m.departmentName}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-2">
                  No staff birthdays scheduled within the next 45 days.
                </p>
              )}
            </section>
          </div>
        </div>

        {/* Quick Actions Modal */}
        {isQuickActionsOpen && (
          <div
            data-testid="quick-actions-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Citadel People Hub Quick Actions"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsQuickActionsOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-5 overflow-y-auto animate-fade-in"
          >
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
              <div className="bg-[#083E34] text-white p-5 relative border-b border-emerald-950/30 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsQuickActionsOpen(false)}
                  aria-label="Close Quick Actions"
                  className="absolute top-4 right-4 text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#D4AF37]" aria-hidden="true" />
                  <span>Citadel People Hub — Quick Actions</span>
                </h3>
                <p className="text-xs text-emerald-100/90 mt-0.5">
                  Frequently executed People, Culture &amp; Operations administrative workflows.
                </p>
              </div>

              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs overflow-y-auto flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    onOpenLeaveModal();
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34] hover:bg-slate-50 transition text-left space-y-1 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200 group-hover:bg-[#083E34] group-hover:text-white transition">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-slate-900">Apply for Leave</h4>
                  <p className="text-xs text-slate-500">Casual, Annual or Sick leave application</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    onOpenAddEmployee();
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34] hover:bg-slate-50 transition text-left space-y-1 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200 group-hover:bg-[#083E34] group-hover:text-white transition">
                    <Users className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-slate-900">Add New Employee</h4>
                  <p className="text-xs text-slate-500">Enroll staff member and assign supervisor</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    onNavigate('attendance');
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34] hover:bg-slate-50 transition text-left space-y-1 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 group-hover:bg-[#083E34] group-hover:text-white transition">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-slate-900">Attendance Logs</h4>
                  <p className="text-xs text-slate-500">Review clock-ins and biometric imports</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    onNavigate('documents');
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34] hover:bg-slate-50 transition text-left space-y-1 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200 group-hover:bg-[#083E34] group-hover:text-white transition">
                    <Download className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-slate-900">Documents &amp; Policies</h4>
                  <p className="text-xs text-slate-500">Manage handbooks and staff records</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    onNavigate('projects');
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34] hover:bg-slate-50 transition text-left space-y-1 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] text-[#B45309] flex items-center justify-center border border-[#F2E4B8] group-hover:bg-[#083E34] group-hover:text-white transition">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-slate-900">Projects &amp; Tasks</h4>
                  <p className="text-xs text-slate-500">Assign deliverables across divisions</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    onNavigate('reports');
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#083E34] hover:bg-slate-50 transition text-left space-y-1 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200 group-hover:bg-[#083E34] group-hover:text-white transition">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-slate-900">Workforce Reports</h4>
                  <p className="text-xs text-slate-500">Headcount and leave analytics</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default DashboardView;
