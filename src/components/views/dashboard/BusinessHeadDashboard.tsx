import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  CalendarDays,
  Check,
  X,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Briefcase,
  FileText,
  Building,
  Sparkles,
  TrendingUp,
  BarChart3,
  Layers,
  Award,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { NavModule } from '../../layout/Sidebar';
import { leaveRepository, employeeRepository, auditRepository } from '../../../services';
import { LeaveRequest, Employee } from '../../../types';

interface BusinessHeadDashboardProps {
  onNavigate: (module: NavModule) => void;
  onOpenLeaveModal: () => void;
}

export const BusinessHeadDashboard: React.FC<BusinessHeadDashboardProps> = ({
  onNavigate,
  onOpenLeaveModal,
}) => {
  const { currentUser, currentRole } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [entityEmployees, setEntityEmployees] = useState<Employee[]>([]);
  const [executiveLeaves, setExecutiveLeaves] = useState<LeaveRequest[]>([]);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Determine departments under command based on Excel structure
  const getPortfolioDetails = () => {
    const id = currentUser.id;
    const name = (currentUser.name || '').toLowerCase();

    if (id === 'emp-ike' || name.includes('ike')) {
      return {
        scopeTitle: 'CGCC Operations & Services Portfolio',
        departments: ['Facilities', 'Transport & Logistics', 'Campus Security'],
        description: 'Excel Structure: Facilities, Logistics, and Security managers report directly to Pastor Christian Ike.',
        headcountTarget: 38,
      };
    }
    if (id === 'emp-biola' || name.includes('biola')) {
      return {
        scopeTitle: 'CGCC Administration & Church Governance Portfolio',
        departments: ["S.O.'s Office", 'Church Administration & Operations', 'Protocol & Hospitality'],
        description: "Excel Structure: Church Admin & Operations, S.O.'s office, and Protocol officers report to Pastor Biola Adeyoola.",
        headcountTarget: 24,
      };
    }
    if (id === 'emp-segun' || name.includes('segun')) {
      return {
        scopeTitle: 'CGCC & Shared Digital Infrastructure Portfolio',
        departments: ['ICT & Digital Systems', 'Network Infrastructure', 'Media & Broadcast Tech'],
        description: 'Excel Structure: ICT Manager and technology infrastructure teams report to Pastor Segun Bakare.',
        headcountTarget: 18,
      };
    }
    if (id === 'emp-omoaholo' || name.includes('omoaholo')) {
      return {
        scopeTitle: 'Citadel School of Government (CSOG) Portfolio',
        departments: ['Admin & Operations', 'Academic Liaison & Executive Programs'],
        description: 'Excel Structure: CSG Admin/Operations & Academic Liaison report directly to Director CSG (Mr. Omoaholo Omoakhalen).',
        headcountTarget: 28,
      };
    }
    if (id === 'emp-fisayo' || name.includes('fisayo') || name.includes('durojaiye')) {
      return {
        scopeTitle: 'Citadel Holdings Commercial Arm Portfolio',
        departments: ['Bookshop', 'Cafe Operations', 'The Workstation', 'Asabi Aladire Fashion', 'Sales & BD'],
        description: 'Excel Structure: Commercial Business Managers report to CEO Holdings (Ms. Olufisayo Bakare).',
        headcountTarget: 34,
      };
    }
    return {
      scopeTitle: `${currentUser.entityName} Leadership`,
      departments: ['Division Teams'],
      description: 'Entity-wide executive governance and multi-tier approval authority.',
      headcountTarget: 30,
    };
  };

  const portfolio = getPortfolioDetails();

  const loadData = async () => {
    const [allEmps, allLeaves] = await Promise.all([
      employeeRepository.getAll({ entityId: currentUser.entityId }),
      leaveRepository.getAll(),
    ]);

    setEntityEmployees(allEmps);

    // Leaves under their entity scope that are recommended by HOD or awaiting Business Head
    const entityLeaves = allLeaves.filter(
      (l) =>
        (l.entityName === currentUser.entityName ||
          portfolio.departments.some((d) => (l.departmentName || '').includes(d))) &&
        l.employeeId !== currentUser.id
    );
    setExecutiveLeaves(entityLeaves);
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleExecutiveSignOff = async (leave: LeaveRequest) => {
    await leaveRepository.updateStatus(
      leave.id,
      'Approved',
      currentUser.name,
      `Tier-2 Executive Business Head Sign-Off granted by ${currentUser.name}. Endorsed and forwarded to PCCM HR for final ledger validation.`
    );

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Leave Management',
      action: 'Tier-2 Executive Business Head Endorsement',
      recordAffectedId: leave.id,
      recordAffectedTitle: `${leave.leaveType} for ${leave.employeeName}`,
      previousValue: leave.status,
      newValue: 'Approved (Business Head)',
      severity: 'Info',
    });

    setActionFeedback(`Executive Sign-Off granted for ${leave.employeeName}. Transferred to PCCM HR!`);
    setTimeout(() => setActionFeedback(null), 4000);
    await loadData();
  };

  const handleExecutiveDecline = async (leave: LeaveRequest) => {
    await leaveRepository.updateStatus(
      leave.id,
      'Rejected',
      currentUser.name,
      `Request declined at Executive Tier-2 level by Business Head (${currentUser.name}) due to strategic operations priority.`
    );

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Leave Management',
      action: 'Tier-2 Executive Declined Request',
      recordAffectedId: leave.id,
      recordAffectedTitle: `${leave.leaveType} for ${leave.employeeName}`,
      previousValue: leave.status,
      newValue: 'Rejected',
      severity: 'Warning',
    });

    setActionFeedback(`Request for ${leave.employeeName} declined at Executive tier.`);
    setTimeout(() => setActionFeedback(null), 4000);
    await loadData();
  };

  const pendingExecutiveQueue = executiveLeaves.filter(
    (l) => l.status === 'Pending Review' || l.status === 'Submitted'
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Executive Leadership Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                Tier-2 Governance: Business Head (GEC Member)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                {currentUser.entityName}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {portfolio.scopeTitle}
            </h1>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              Executive: <strong className="text-slate-800 font-bold">{currentUser.name}</strong> ({currentUser.jobTitle}) • {portfolio.description}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={onOpenLeaveModal}
              id="business-head-apply-leave-btn"
              className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold text-xs shadow-xs transition flex items-center gap-2 active:scale-95 cursor-pointer min-h-[38px] border border-[#C59B27]"
            >
              <CalendarDays className="w-4 h-4 text-slate-950" />
              <span>Apply for Leave</span>
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs border border-slate-200 transition flex items-center gap-2 cursor-pointer min-h-[38px]"
            >
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <span>Divisional Reports</span>
            </button>
          </div>
        </div>

        {actionFeedback && (
          <div className="mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}
      </div>

      {/* 2. Executive Divisional KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Divisional Workforce */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Divisional Headcount</span>
            <div className="w-8 h-8 rounded-xl bg-[#083E34] text-amber-300 flex items-center justify-center font-bold text-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#083E34]">{portfolio.headcountTarget}</span>
            <span className="text-xs text-slate-500 font-bold">total staff under command</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-2 font-medium">
            Across {portfolio.departments.length} supervised departmental units
          </p>
        </div>

        {/* Supervised Departments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Departments Supervised</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#083E34]">{portfolio.departments.length}</span>
            <span className="text-xs text-slate-500 font-bold">operational units</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-2 font-medium truncate">
            {portfolio.departments.join(', ')}
          </p>
        </div>

        {/* Pending Executive Sign-Offs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Tier-2 Sign-Offs</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-600">{pendingExecutiveQueue.length}</span>
            <span className="text-xs text-slate-500 font-bold">awaiting GEC endorsement</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            Pre-cleared by respective Department Heads
          </p>
        </div>

        {/* Attendance Compliance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Attendance Adherence</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#083E34]">95.4%</span>
            <span className="text-xs text-slate-500 font-bold">divisional average</span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-2 font-semibold">
            High shift punctuality across all units
          </p>
        </div>
      </div>

      {/* 3. Tier-2 Executive Sign-Off Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Tier-2 Executive Sign-Off Queue ({pendingExecutiveQueue.length})</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Leave requests recommended by Department Heads within your divisional portfolio awaiting your executive sign-off before final HR validation.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
            Tier-2 GEC Authority
          </span>
        </div>

        {pendingExecutiveQueue.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {pendingExecutiveQueue.map((req) => (
              <div key={req.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-slate-900">{req.employeeName}</span>
                    <span className="text-xs font-mono text-slate-500">({req.employeeStaffId})</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      {req.leaveType}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {req.departmentName} • {req.totalDays} business days ({req.startDate} to {req.endDate})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-800">Reason:</strong> {req.reason}
                  </p>
                  {req.approverComments && (
                    <p className="text-xs text-emerald-800 font-medium">
                      <strong>HOD Note:</strong> {req.approverComments}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleExecutiveDecline(req)}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                  <button
                    onClick={() => handleExecutiveSignOff(req)}
                    className="px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 hover:bg-[#C59B27] font-black text-xs shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer border border-[#C59B27]"
                  >
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>Executive Endorse & Sign Off</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">All Divisional Approvals Up to Date</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are no pending leave applications awaiting your executive sign-off in this division.
            </p>
          </div>
        )}
      </div>

      {/* 4. Supervised Departments Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#083E34]" />
              <span>Supervised Departments Breakdown</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Direct units reporting up to this Business Head command as specified in the organizational chart.
            </p>
          </div>
          <button
            onClick={() => onNavigate('employees')}
            className="text-xs font-bold text-[#083E34] hover:text-amber-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View Workforce</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {portfolio.departments.map((dept) => (
            <div
              key={dept}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">{dept}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <p>
                  <strong>Headcount:</strong> ~{Math.round(portfolio.headcountTarget / portfolio.departments.length)} staff
                </p>
                <p>
                  <strong>Shift Presence:</strong> 96% Today
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#083E34]">HOD Operational Lead</span>
                <span className="text-emerald-700 font-semibold">Tier-1 Cleared</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
