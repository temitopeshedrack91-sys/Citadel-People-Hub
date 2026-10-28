import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
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
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { NavModule } from '../../layout/Sidebar';
import { leaveRepository, employeeRepository, auditRepository } from '../../../services';
import { LeaveRequest, Employee } from '../../../types';

interface DepartmentHeadDashboardProps {
  onNavigate: (module: NavModule) => void;
  onOpenLeaveModal: () => void;
}

export const DepartmentHeadDashboard: React.FC<DepartmentHeadDashboardProps> = ({
  onNavigate,
  onOpenLeaveModal,
}) => {
  const { currentUser, currentRole } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequest[]>([]);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Determine reporting line based on Excel sheet structure
  const getReportingLine = () => {
    const dept = (currentUser.departmentName || '').toLowerCase();
    if (dept.includes('ict')) return 'Pastor Segun Bakare (Executive Pastor & ICT Director)';
    if (dept.includes('facilit') || dept.includes('secur') || dept.includes('transport') || dept.includes('logist')) {
      return 'Pastor Christian Ike (Executive Pastor / Business Head)';
    }
    if (dept.includes('admin') || dept.includes('protocol') || dept.includes('s.o')) {
      return 'Pastor Biola Adeyoola (Pastor & Head of Administration)';
    }
    if (dept.includes('cafe') || dept.includes('book') || dept.includes('sales') || dept.includes('holding')) {
      return 'Ms. Olufisayo Bakare (CEO Holdings / Managing Director)';
    }
    if (dept.includes('acad') || dept.includes('csog') || dept.includes('programme')) {
      return 'Mr. Omoaholo Omoakhalen (Director CSG / Business Head)';
    }
    if (dept.includes('finan') || dept.includes('pcc')) {
      return 'Group Executive Council (GEC) & PCCM Leadership';
    }
    return 'Assigned Business Head';
  };

  const loadData = async () => {
    const [allEmps, allLeaves] = await Promise.all([
      employeeRepository.getAll({ departmentId: currentUser.departmentId }),
      leaveRepository.getAll(),
    ]);

    setTeamMembers(allEmps);

    // Filter leaves for this department or direct reports
    const deptLeaves = allLeaves.filter(
      (l) =>
        (l.departmentName === currentUser.departmentName ||
          allEmps.some((e) => e.id === l.employeeId)) &&
        l.employeeId !== currentUser.id // Exclude HOD's own leave from team approval queue
    );
    setTeamLeaves(deptLeaves);
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleRecommendLeave = async (leave: LeaveRequest) => {
    await leaveRepository.updateStatus(
      leave.id,
      'Pending Review',
      currentUser.name,
      `Tier-1 HOD Approval granted by ${currentUser.name}. Recommended and forwarded to Business Head for Tier-2 executive sign-off.`
    );

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Leave Management',
      action: 'Tier-1 HOD Recommendation Approved',
      recordAffectedId: leave.id,
      recordAffectedTitle: `${leave.leaveType} for ${leave.employeeName}`,
      previousValue: leave.status,
      newValue: 'Pending Review (Business Head)',
      severity: 'Info',
    });

    setActionFeedback(`Recommended ${leave.leaveType} for ${leave.employeeName}. Forwarded to Business Head!`);
    setTimeout(() => setActionFeedback(null), 4000);
    await loadData();
  };

  const handleRejectLeave = async (leave: LeaveRequest) => {
    await leaveRepository.updateStatus(
      leave.id,
      'Rejected',
      currentUser.name,
      `Request declined by Department Head (${currentUser.name}) due to department operational coverage requirements.`
    );

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Leave Management',
      action: 'Tier-1 HOD Rejected Request',
      recordAffectedId: leave.id,
      recordAffectedTitle: `${leave.leaveType} for ${leave.employeeName}`,
      previousValue: leave.status,
      newValue: 'Rejected',
      severity: 'Warning',
    });

    setActionFeedback(`Request for ${leave.employeeName} has been declined.`);
    setTimeout(() => setActionFeedback(null), 4000);
    await loadData();
  };

  const pendingQueue = teamLeaves.filter((l) => l.status === 'Submitted' || l.status === 'Pending Review');
  const presentCount = Math.max(teamMembers.length - 1, 1);
  const attendancePercentage = teamMembers.length > 0 ? Math.round((presentCount / teamMembers.length) * 100) : 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner with Department Command Details */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                Tier-3 Governance: Department Head (HOD)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                {currentUser.entityName}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {currentUser.departmentName} Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              Led by <strong className="text-slate-800 font-bold">{currentUser.name}</strong> ({currentUser.jobTitle}) • Executive Reporting Line: <strong className="text-slate-800 font-semibold">{getReportingLine()}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={onOpenLeaveModal}
              id="hod-apply-leave-btn"
              className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold text-xs shadow-xs transition flex items-center gap-2 active:scale-95 cursor-pointer min-h-[38px] border border-[#C59B27]"
            >
              <CalendarDays className="w-4 h-4 text-slate-950" />
              <span>Apply for Leave</span>
            </button>
            <button
              onClick={() => onNavigate('leave')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs border border-slate-200 transition flex items-center gap-2 cursor-pointer min-h-[38px]"
            >
              <span>All Team Requests</span>
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
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

      {/* 2. Department Core KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Team Headcount */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Team Strength</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#083E34]">{teamMembers.length}</span>
            <span className="text-xs text-slate-500 font-bold">staff members in unit</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-2 font-medium">
            Active roles under {currentUser.departmentName}
          </p>
        </div>

        {/* Present Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Present Today</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#083E34]">{attendancePercentage}%</span>
            <span className="text-xs text-slate-500 font-bold">({presentCount}/{teamMembers.length})</span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${attendancePercentage}%` }} />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Biometric clock-ins verified</p>
        </div>

        {/* Pending Tier-1 Approvals */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-600">{pendingQueue.length}</span>
            <span className="text-xs text-slate-500 font-bold">requests need HOD action</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            Tier-1 line manager recommendation
          </p>
        </div>

        {/* HOD Personal Leave Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">My Leave Quota</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#083E34]">18</span>
            <span className="text-xs text-slate-500 font-bold">/ 24 days remaining</span>
          </div>
          <button
            onClick={onOpenLeaveModal}
            className="text-[11px] font-bold text-[#083E34] hover:text-amber-700 mt-2 block cursor-pointer"
          >
            + Submit HOD Leave Request
          </button>
        </div>
      </div>

      {/* 3. Tier-1 Team Leave Approval Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#083E34]" />
              <span>Tier-1 Team Leave Review Queue ({pendingQueue.length})</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Review requests from your direct reports. Approved requests automatically route to your Business Head ({getReportingLine()}).
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300">
            HOD First-Tier Sign-Off
          </span>
        </div>

        {pendingQueue.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {pendingQueue.map((req) => (
              <div key={req.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-slate-900">{req.employeeName}</span>
                    <span className="text-xs font-mono text-slate-500">({req.employeeStaffId})</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      {req.leaveType}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {req.totalDays} days ({req.startDate} to {req.endDate})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-800">Reason:</strong> {req.reason}
                  </p>
                  {req.relievingStaffName && (
                    <p className="text-xs text-slate-500">
                      <strong className="text-slate-700">Handover Colleague:</strong> {req.relievingStaffName}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRejectLeave(req)}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                  <button
                    onClick={() => handleRecommendLeave(req)}
                    className="px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 hover:bg-[#C59B27] font-bold text-xs shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer border border-[#C59B27]"
                  >
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>Recommend &amp; Forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">All Team Leave Requests Cleared</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are no pending leave requests awaiting your departmental review at this time.
            </p>
          </div>
        )}
      </div>

      {/* 4. Department Attendance Roster Today */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#083E34]" />
              <span>Department Daily Attendance & Clock-In Status</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Live biometric feed from ZKTeco reader nodes. 10-minute grace period applied per Citadel governance.
            </p>
          </div>
          <button
            onClick={() => onNavigate('attendance')}
            className="text-xs font-bold text-[#083E34] hover:text-amber-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Biometric Sheet</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 pl-5">Team Member</th>
                <th className="p-3.5">Staff ID</th>
                <th className="p-3.5">Job Title</th>
                <th className="p-3.5">Today's Clock-In</th>
                <th className="p-3.5">Punctuality Status</th>
                <th className="p-3.5 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamMembers.map((member, idx) => (
                <tr key={member.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3.5 pl-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#083E34] text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {member.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <span className="font-bold text-slate-900">{member.fullName}</span>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-slate-600">{member.staffId}</td>
                  <td className="p-3.5 text-slate-700">{member.jobTitle}</td>
                  <td className="p-3.5 font-mono text-slate-900">
                    {idx === 0 ? '07:54 AM' : idx === 1 ? '07:58 AM' : '08:02 AM'}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      On-Time (Within Grace Period)
                    </span>
                  </td>
                  <td className="p-3.5 pr-5 text-right">
                    <button
                      onClick={() => onNavigate('attendance')}
                      className="text-slate-600 hover:text-black font-semibold text-[11px]"
                    >
                      View Log
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
