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
} from 'lucide-react';
import { AttendanceRecord, VerificationSource } from '../../types';
import { attendanceRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const AttendanceView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
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
    };
    fetchData();
  }, []);

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
      setClockedIn(false);
      setClockInTime(null);
      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Attendance & Biometrics',
        action: 'Employee Self-Service Clock Out',
        recordAffectedId: `att-out-${Date.now()}`,
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
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#0A1E3F]" />
          <span>Attendance & Biometric Verification</span>
        </h2>
        <p className="text-xs text-slate-500">
          Integrated timekeeping supporting biometric devices (ZKTeco), RFID badges, and authenticated web self-service.
        </p>
      </div>

      {/* Clock In / Out Banner Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              clockedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{currentUser.name}</h3>
              <span className="text-xs text-slate-400 font-mono">({currentUser.staffId})</span>
            </div>
            <p className="text-xs text-slate-500">
              {clockedIn ? (
                <span className="text-emerald-600 font-semibold">
                  Active Shift: Clocked in today at {clockInTime}
                </span>
              ) : (
                'You have not recorded attendance for today yet.'
              )}
            </p>
          </div>
        </div>

        <button
          id="btn-toggle-clock-in"
          onClick={handleToggleClock}
          className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-2 shadow-xs ${
            clockedIn
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-[#0A1E3F] hover:bg-[#152B52] text-amber-300'
          }`}
        >
          {clockedIn ? (
            <>
              <LogOut className="w-4 h-4" />
              <span>Record Clock-Out</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Record Clock-In (Web Portal)</span>
            </>
          )}
        </button>
      </div>

      {/* Hardware Device Health Monitor */}
      <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Today's Attendance Logs (All Entities)
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">18 September 2026</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Entity & Department</th>
                <th className="py-3 px-4">Clock In</th>
                <th className="py-3 px-4">Clock Out</th>
                <th className="py-3 px-4">Verification Source</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{log.employeeName}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{log.employeeStaffId}</span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-slate-800 font-medium">{log.entityName}</p>
                    <p className="text-[11px] text-slate-500">{log.departmentName}</p>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">
                    {log.clockInTime || '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">{log.clockOutTime || '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                      {getSourceIcon(log.verificationSource)}
                      <span>{log.verificationSource.replace('_', ' ')}</span>
                      {log.deviceId && (
                        <span className="text-[10px] text-slate-400 font-mono">({log.deviceId})</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
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
    </div>
  );
};
