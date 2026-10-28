import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CalendarDays,
  Clock,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
  User,
  Users,
  Send,
  Plus,
  Briefcase,
  ShieldCheck,
  Check,
  Building,
  TrendingUp,
  MapPin,
  Coffee,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { NavModule } from '../../layout/Sidebar';
import { leaveRepository, attendanceRepository, employeeRepository } from '../../../services';
import { LeaveRequest, AttendanceRecord, Employee } from '../../../types';

interface EmployeeDashboardProps {
  onNavigate: (module: NavModule) => void;
  onOpenLeaveModal: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  onNavigate,
  onOpenLeaveModal,
}) => {
  const { currentUser } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Personal state
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [deptTeammates, setDeptTeammates] = useState<Employee[]>([]);
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [clockInTime, setClockInTime] = useState('07:54 AM');
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [clockFeedback, setClockFeedback] = useState<string | null>(null);

  // Leave balances for employee
  const annualTotal = 24;
  const annualUsed = 6;
  const annualRemaining = annualTotal - annualUsed;
  const casualRemaining = 5;
  const sickRemaining = 12;

  useEffect(() => {
    const loadEmployeeData = async () => {
      const [allLeaves, allEmps] = await Promise.all([
        leaveRepository.getAll(),
        employeeRepository.getAll({ departmentId: currentUser.departmentId }),
      ]);
      // Filter for this user's leaves
      const userLeaves = allLeaves.filter(
        (l) => l.employeeId === currentUser.id || l.employeeName === currentUser.name
      );
      setMyLeaves(userLeaves);
      // Filter department peers (excluding self)
      setDeptTeammates(allEmps.filter((e) => e.id !== currentUser.id));
    };
    loadEmployeeData();
  }, [currentUser]);

  const handleToggleClock = () => {
    const now = new Date();
    const formatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isClockedIn) {
      setIsClockedIn(false);
      setClockOutTime(formatted);
      setClockFeedback(`Successfully clocked out at ${formatted}. Have a restful evening!`);
    } else {
      setIsClockedIn(true);
      setClockInTime(formatted);
      setClockOutTime(null);
      setClockFeedback(`Successfully clocked in at ${formatted} (ZKTeco Biometric Node). Have a productive day!`);
    }
    setTimeout(() => setClockFeedback(null), 4000);
  };

  const activeLeave = myLeaves.length > 0 ? myLeaves[0] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Employee Welcome Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#0A1E3F] via-[#122b56] to-[#0A3B32] p-6 sm:p-8 text-white shadow-lg overflow-hidden border border-amber-500/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono text-[11px] font-bold">
                Employee Self-Service Portal
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 text-[11px] font-mono">
                Staff ID: {currentUser.staffId}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-white">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 font-medium max-w-xl">
              {currentUser.jobTitle} • {currentUser.departmentName} • {currentUser.entityName}
            </p>
          </div>

          {/* Quick Action Trigger in Banner */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={onOpenLeaveModal}
              id="employee-apply-leave-btn"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#0A1E3F] font-black text-xs shadow-md hover:shadow-lg transition flex items-center gap-2 active:scale-95"
            >
              <CalendarDays className="w-4 h-4 text-[#0A1E3F]" />
              <span>Apply for Leave</span>
            </button>
            <button
              onClick={handleToggleClock}
              id="employee-clock-toggle-btn"
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition border flex items-center gap-2 shadow-xs active:scale-95 ${
                isClockedIn
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-400/30'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/30'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{isClockedIn ? `Clocked In (${clockInTime})` : 'Clock In Now'}</span>
            </button>
          </div>
        </div>

        {clockFeedback && (
          <div className="mt-4 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{clockFeedback}</span>
          </div>
        )}
      </div>

      {/* 2. Personal Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Annual Leave Meter */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Annual Leave</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#0A1E3F]">{annualRemaining}</span>
            <span className="text-xs text-slate-500 font-bold">/ {annualTotal} days remaining</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-[#0A3B32] h-full rounded-full transition-all duration-500"
              style={{ width: `${(annualRemaining / annualTotal) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-600 mt-2 font-medium">
            {annualUsed} days utilized in 2026 leave cycle
          </p>
        </div>

        {/* Casual & Sick Entitlement */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Casual & Sick Quota</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-600 block">Casual</span>
              <span className="text-lg font-black text-[#0A1E3F]">{casualRemaining}</span>
              <span className="text-[10px] text-slate-500 font-semibold block">days left</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-600 block">Sick</span>
              <span className="text-lg font-black text-[#0A1E3F]">{sickRemaining}</span>
              <span className="text-[10px] text-slate-500 font-semibold block">days left</span>
            </div>
          </div>
        </div>

        {/* Today's Attendance & Shift */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Today's Presence</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-black text-slate-900">
              {isClockedIn ? `In at ${clockInTime}` : 'Clocked Out'}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>Standard: 08:00 - 17:00</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              On-Time
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            Node: Ikeja Campus Terminal
          </p>
        </div>

        {/* Punctuality Rating */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-slate-700">Punctuality Score</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#0A1E3F]">98.2%</span>
            <span className="text-xs font-bold text-emerald-600">Excellent</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
            <span>Days Attended:</span>
            <span className="font-bold text-slate-900">21 / 22 days</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
            0 late arrivals in current evaluation cycle
          </p>
        </div>
      </div>

      {/* 3. Interactive Quick Actions Shortcuts */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#C59B27]" />
          <span>Quick Self-Service Shortcuts</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <button
            onClick={onOpenLeaveModal}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 flex flex-col items-center justify-center text-center gap-2 transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center group-hover:scale-110 transition">
              <CalendarDays className="w-5 h-5 text-amber-800" />
            </div>
            <span className="font-bold text-slate-900">Apply for Leave</span>
            <span className="text-[10px] text-slate-500">Fast 2-min workflow</span>
          </button>

          <button
            onClick={handleToggleClock}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 flex flex-col items-center justify-center text-center gap-2 transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center group-hover:scale-110 transition">
              <Clock className="w-5 h-5 text-emerald-800" />
            </div>
            <span className="font-bold text-slate-900">{isClockedIn ? 'Clock Out' : 'Clock In'}</span>
            <span className="text-[10px] text-slate-500">Biometric log stamp</span>
          </button>

          <button
            onClick={() => onNavigate('documents')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 flex flex-col items-center justify-center text-center gap-2 transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center group-hover:scale-110 transition">
              <FileText className="w-5 h-5 text-blue-800" />
            </div>
            <span className="font-bold text-slate-900">Policies & Handbook</span>
            <span className="text-[10px] text-slate-500">Institutional guides</span>
          </button>

          <button
            onClick={() => onNavigate('directory')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 flex flex-col items-center justify-center text-center gap-2 transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center group-hover:scale-110 transition">
              <Users className="w-5 h-5 text-purple-800" />
            </div>
            <span className="font-bold text-slate-900">Staff Directory</span>
            <span className="text-[10px] text-slate-500">Find colleagues</span>
          </button>

          <button
            onClick={() => onNavigate('ai-assistant')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-[#0A1E3F] hover:bg-slate-50 flex flex-col items-center justify-center text-center gap-2 transition group col-span-2 sm:col-span-1"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0A1E3F] text-amber-300 flex items-center justify-center group-hover:scale-110 transition">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <span className="font-bold text-slate-900">Ask HR AI</span>
            <span className="text-[10px] text-slate-500">Policy inquiries</span>
          </button>
        </div>
      </div>

      {/* 4. Active Leave Application Status & Approval Pipeline */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#0A1E3F]" />
              <span>My Leave Applications & Multi-Tier Approval Pipeline</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Live progression through Citadel's 4-tier approval governance (Employee → Dept Head → Business Head → HR).
            </p>
          </div>
          <button
            onClick={onOpenLeaveModal}
            className="px-3.5 py-1.5 rounded-xl bg-[#0A1E3F] text-amber-300 hover:bg-[#152B52] font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Request</span>
          </button>
        </div>

        {activeLeave ? (
          <div className="p-6 space-y-6">
            {/* Request Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-[#0A1E3F]">{activeLeave.leaveType}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    {activeLeave.status}
                  </span>
                </div>
                <p className="text-xs text-slate-700">
                  <strong className="text-slate-900">Period:</strong> {activeLeave.startDate} to {activeLeave.endDate} ({activeLeave.totalDays} business days)
                </p>
                <p className="text-xs text-slate-600">
                  <strong className="text-slate-900">Reason:</strong> {activeLeave.reason}
                </p>
                {activeLeave.relievingStaffName && (
                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-900">Designated Handover Colleague:</strong> {activeLeave.relievingStaffName}
                  </p>
                )}
              </div>

              <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                <span className="text-[11px] font-mono text-slate-500">Ref: #{activeLeave.id}</span>
                <span className="text-[11px] text-slate-500">Applied: {activeLeave.appliedDate}</span>
              </div>
            </div>

            {/* Visual 4-Stage Approval Tracker */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Approval Workflow Journey
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
                {/* Step 1: Employee Submission */}
                <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/50 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Stage 1: Submitted</span>
                    <span className="text-xs font-bold text-slate-900 block">{currentUser.name}</span>
                    <span className="text-[10px] text-slate-500">Application initiated</span>
                  </div>
                </div>

                {/* Step 2: Department Head Review */}
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    activeLeave.status === 'Submitted'
                      ? 'border-amber-300 bg-amber-50/60 ring-2 ring-amber-400/20'
                      : 'border-emerald-300 bg-emerald-50/50'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${
                      activeLeave.status === 'Submitted'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {activeLeave.status === 'Submitted' ? '2' : <Check className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-700 block">Stage 2: Dept Head</span>
                    <span className="text-xs font-bold text-slate-900 block">Tier-1 HOD Review</span>
                    <span className="text-[10px] text-slate-500">
                      {activeLeave.status === 'Submitted' ? 'Awaiting sign-off' : 'Recommended'}
                    </span>
                  </div>
                </div>

                {/* Step 3: Business Head Endorsement */}
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    activeLeave.status === 'Pending Review'
                      ? 'border-blue-300 bg-blue-50/60 ring-2 ring-blue-400/20'
                      : activeLeave.status === 'Approved'
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${
                      activeLeave.status === 'Pending Review'
                        ? 'bg-blue-600 text-white animate-pulse'
                        : activeLeave.status === 'Approved'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {activeLeave.status === 'Approved' ? <Check className="w-4 h-4" /> : '3'}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-700 block">Stage 3: Business Head</span>
                    <span className="text-xs font-bold text-slate-900 block">Tier-2 GEC Review</span>
                    <span className="text-[10px] text-slate-500">
                      {activeLeave.status === 'Approved' ? 'Endorsed' : 'Executive sign-off'}
                    </span>
                  </div>
                </div>

                {/* Step 4: HR Final Approval */}
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    activeLeave.status === 'Approved'
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${
                      activeLeave.status === 'Approved' ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {activeLeave.status === 'Approved' ? <Check className="w-4 h-4" /> : '4'}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-700 block">Stage 4: HR / PCCM</span>
                    <span className="text-xs font-bold text-slate-900 block">Final Validation</span>
                    <span className="text-[10px] text-slate-500">
                      {activeLeave.status === 'Approved' ? 'Approved & Recorded' : 'Ledger updated'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-300 text-amber-800 mx-auto flex items-center justify-center">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">No Active Leave Applications</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              You have {annualRemaining} days of annual leave remaining. You can plan ahead and submit your application at any time.
            </p>
            <button
              onClick={onOpenLeaveModal}
              className="px-4 py-2 rounded-xl bg-[#0A1E3F] text-amber-300 font-bold text-xs hover:bg-[#152B52] transition shadow-xs"
            >
              + Apply for Leave Now
            </button>
          </div>
        )}
      </div>

      {/* 5. Department Teammates & Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Peer Coverage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-700">
                Department Teammates ({currentUser.departmentName})
              </h3>
              <p className="text-[11px] text-slate-500">Colleagues available for handover and shift relief.</p>
            </div>
            <button
              onClick={() => onNavigate('directory')}
              className="text-xs font-bold text-[#0A1E3F] hover:text-[#C59B27] flex items-center gap-1"
            >
              <span>Directory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {deptTeammates.length > 0 ? (
              deptTeammates.slice(0, 4).map((mate) => (
                <div
                  key={mate.id}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#0A1E3F] text-amber-300 flex items-center justify-center font-black text-[10px] shrink-0">
                      {mate.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">{mate.fullName}</span>
                      <span className="text-[11px] text-slate-500">{mate.jobTitle}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      mate.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {mate.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-3">No other teammates in this unit.</p>
            )}
          </div>
        </div>

        {/* Institutional Calendar / Holidays */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-700">Upcoming Citadel Events & Holidays</h3>
              <p className="text-[11px] text-slate-500">Institutional calendar across CGCC, CSOG, and Holdings.</p>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-xs font-bold text-[#0A1E3F] hover:text-[#C59B27] flex items-center gap-1"
            >
              <span>Full Calendar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Independence Day Institutional Holiday</span>
                  <span className="text-[11px] text-slate-600">October 1, 2026 • Statutory Public Holiday</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-amber-300 text-amber-900">
                Holiday
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0A1E3F] text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Citadel All-Hands & PCCM Townhall</span>
                  <span className="text-[11px] text-slate-600">October 14, 2026 • 10:00 AM • Main Auditorium</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                Meeting
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Q4 Staff Welfare & Cultural Festival</span>
                  <span className="text-[11px] text-slate-600">November 20, 2026 • Citadel Campus Piazza</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
                Community
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
