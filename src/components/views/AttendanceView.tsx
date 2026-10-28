import React, { useState, useEffect } from 'react';
import {
  Clock,
  Fingerprint,
  Smartphone,
  CreditCard,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Cpu,
  LogIn,
  LogOut,
  Radio,
  Calendar,
  ShieldAlert,
  Building,
  Info,
} from 'lucide-react';
import { AttendanceRecord, VerificationSource } from '../../types';
import { attendanceRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { CITADEL_ATTENDANCE_SCHEDULES } from '../../data/mockData';

export const AttendanceView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'live_logs' | 'schedules'>('live_logs');
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [logList, sum] = await Promise.all([
        attendanceRepository.getRecentLogs(20),
        attendanceRepository.getTodaySummary(),
      ]);
      setLogs(logList);
      setSummary(sum);
      const openAttendance = logList.find((record) => record.employeeId === currentUser.id && !record.clockOutTime);
      if (openAttendance) {
        setClockedIn(true);
        setClockInTime(openAttendance.clockInTime || null);
      }
    };
    fetchData();
  }, [currentUser.id]);

  const handleToggleClock = async () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!clockedIn) {
      const newRec = await attendanceRepository.recordClockIn(
        currentUser.id,
        currentUser.name,
        currentUser.staffId,
        currentUser.entityName,
        currentUser.departmentName
      );
      setClockedIn(true);
      setClockInTime(timeStr);
      setLogs([newRec, ...logs]);

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Attendance & Biometrics',
        action: 'Employee Self-Service Clock In',
        recordAffectedId: newRec.id,
        recordAffectedTitle: `${currentUser.name} (${currentUser.staffId})`,
        previousValue: 'Not Clocked In',
        newValue: `Clocked in at ${timeStr} (Web_SelfService)`,
        severity: 'Info',
      });
    } else {
      const activeRecord = logs.find((record) => record.employeeId === currentUser.id && !record.clockOutTime);
      if (!activeRecord) {
        throw new Error('Cannot find an open attendance record to clock out.');
      }
      const closedRecord = await attendanceRepository.recordClockOut(activeRecord.id);
      setLogs(logs.map((record) => record.id === closedRecord.id ? closedRecord : record));
      setClockedIn(false);
      setClockInTime(null);
      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Attendance & Biometrics',
        action: 'Employee Self-Service Clock Out',
        recordAffectedId: activeRecord.id,
        recordAffectedTitle: `${currentUser.name} (${currentUser.staffId})`,
        previousValue: `Clocked in at ${clockInTime}`,
        newValue: `Clocked out at ${timeStr}`,
        severity: 'Info',
      });
    }
  };

  const getSourceIcon = (src: VerificationSource) => {
    switch (src) {
      case 'Biometric_ZKTeco':
        return <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />;
      case 'Card_RFID':
        return <CreditCard className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Mobile_GPS':
        return <Smartphone className="w-3.5 h-3.5 text-sky-600" />;
      case 'Web_SelfService':
        return <Laptop className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in text-slate-900">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#083E34] shrink-0" />
          <span>Attendance &amp; Check-ins</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Daily clock-in activity, shift schedules, and attendance logs across all locations.
        </p>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'live_logs'}
          onClick={() => setActiveTab('live_logs')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 min-h-[40px] shrink-0 cursor-pointer ${
            activeTab === 'live_logs'
              ? 'bg-[#083E34] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Live Check-ins</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'schedules'}
          onClick={() => setActiveTab('schedules')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 min-h-[40px] shrink-0 cursor-pointer ${
            activeTab === 'schedules'
              ? 'bg-[#083E34] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4 text-[#FF9900]" />
          <span>Shift Schedules &amp; Policies</span>
        </button>
      </div>

      {activeTab === 'live_logs' ? (
        <>
          {/* Clock In / Out Banner Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                  clockedIn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{currentUser.name}</h3>
                  <span className="text-xs text-slate-500 font-mono">({currentUser.staffId})</span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {clockedIn ? (
                    <span className="text-emerald-700 font-bold">
                      Active Shift: Clocked in today at {clockInTime}
                    </span>
                  ) : (
                    'You have not recorded attendance for today yet. Shift start: 9:00 AM (10 min grace period until 9:10 AM).'
                  )}
                </p>
              </div>
            </div>

            <button
              id="btn-toggle-clock-in"
              onClick={handleToggleClock}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-xs active:scale-[0.98] cursor-pointer ${
                clockedIn
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-[#083E34] hover:bg-[#052C25] text-white border border-[#FF9900]/30'
              }`}
            >
              {clockedIn ? (
                <>
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Record Clock-Out</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-[#FF9900]" />
                  <span>Record Clock-In (Web Portal)</span>
                </>
              )}
            </button>
          </div>

          {/* Hardware Device Health Monitor */}
          <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#FF9900]" />
                <h4 className="text-xs font-bold text-slate-100">
                  Citadel Biometric Hardware Nodes (ZKTeco Live Status)
                </h4>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Telemetry Active</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">CGCC Main Gate / Reception</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">DEV-ZK-01 • IP: 192.168.10.24</p>
                <p className="text-[10px] text-slate-400 mt-1">Status: Online • Sync: 12 sec ago</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">School of Government (CSOG)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">DEV-ZK-02 • IP: 192.168.20.18</p>
                <p className="text-[10px] text-slate-400 mt-1">Status: Online • Sync: 45 sec ago</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Citadel Holdings Reception</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">DEV-ZK-03 • IP: 192.168.30.12</p>
                <p className="text-[10px] text-slate-400 mt-1">Status: Online • Sync: 1 min ago</p>
              </div>
            </div>
          </div>

          {/* Attendance Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Today's Attendance Logs (All Entities)
              </h3>
              <span className="text-xs text-slate-500 font-bold">18 September 2026</span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-black uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Employee</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Entity & Department</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Clock In</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Clock Out</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Verification Source</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{log.employeeName}</p>
                        <span className="text-[11px] text-slate-500 font-mono font-medium">{log.employeeStaffId}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-slate-800 font-semibold">{log.entityName}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{log.departmentName}</p>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {log.clockInTime || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800 font-semibold whitespace-nowrap">{log.clockOutTime || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          {getSourceIcon(log.verificationSource)}
                          <span>{log.verificationSource.replace('_', ' ')}</span>
                          {log.deviceId && (
                            <span className="text-[11px] text-slate-400 font-mono">({log.deviceId})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant={
                            log.status === 'Present'
                              ? 'success'
                              : log.status === 'Late'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {log.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Sheet 7: Shift Schedules & Grace Period Policies */
        <div className="space-y-4">
          {/* Institutional Grace Period Highlight Card */}
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                Citadel 10-Minute Punctuality Grace Period Policy (Sheet 7 Mandate)
              </h3>
              <p className="text-xs text-amber-900 mt-0.5 leading-relaxed font-medium">
                All entities operate with an institutional <span className="font-black text-amber-950">10-minute grace period</span>. Employees clocking in after the threshold (e.g. 9:10 AM for regular shifts or 7:10 AM for Facilities) are flagged as <span className="font-bold text-amber-950">Late</span>. Biometric verification via ZKTeco SilkBio readers is mandatory upon entry and exit across all entities.
              </p>
            </div>
          </div>

          {/* Master Schedules Table */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-black uppercase tracking-wider">
                  Entity &amp; Unit Work Hours Master Matrix
                </h3>
                <p className="text-[11px] text-slate-600">Standard operating shifts, early shifts, and special schedules from Workbook Sheet 7</p>
              </div>
              <span className="text-xs font-black px-2.5 py-1 bg-[#083E34] text-amber-300 rounded-lg">
                5 Active Schedules
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#083E34] text-white uppercase tracking-wider text-xs font-bold">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Entity / Operational Unit</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Shift Timings</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Hours / Day</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Biometric Capture</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Grace Window</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Late Threshold</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Operational &amp; Event Rules</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {CITADEL_ATTENDANCE_SCHEDULES.map((sched) => (
                    <tr key={sched.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-black text-black">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-[#083E34]" />
                          <span>{sched.entityOrUnit}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold block ml-6">
                          Category: {sched.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-black px-2 py-0.5 rounded text-xs ${
                          sched.shiftStart === '7:00 AM'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-black'
                        }`}>
                          {sched.shiftStart} – {sched.shiftEnd}
                        </span>
                        {sched.shiftStart === '7:00 AM' && (
                          <span className="text-[10px] text-amber-800 font-bold block mt-0.5">
                            Early Operational Shift
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-black">
                        {sched.hoursPerDay} Hours
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>YES (Mandatory)</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-black">
                        {sched.gracePeriodMinutes} Minutes
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          After {sched.lateThreshold}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 text-[11px] leading-relaxed max-w-xs">
                        {sched.specialRules}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
