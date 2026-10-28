import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  Fingerprint,
  Cpu,
  Radio,
  Building,
  Info,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  CalendarDays,
  Loader2,
  Database,
} from 'lucide-react';
import { Employee } from '../../types';
import { employeeRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../utils/rbac';
import { Badge } from '../common/Badge';
import { CitadelLogo } from '../brand/CitadelLogo';
import { CITADEL_ATTENDANCE_SCHEDULES } from '../../data/mockData';
import {
  attendanceImportService,
  AttendanceImportResult,
  DailyAttendanceSummary,
  UnmatchedDeviceRecord,
} from '../../features/attendance-import';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatDateLabel(date: string): string {
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${day} ${MONTH_LABELS[Number(month) - 1] || month} ${year}`;
}

function formatTimestampLabel(timestamp: string): string {
  return timestamp.replace('T', ' ').slice(0, 16);
}

function unmatchedReasonLabel(reason: UnmatchedDeviceRecord['reason']): string {
  switch (reason) {
    case 'ambiguous_staff_match':
      return 'Ambiguous staff match';
    case 'invalid_device_id_format':
      return 'Invalid device ID format';
    default:
      return 'No matching staff record';
  }
}

export const AttendanceView: React.FC = () => {
  const { currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'daily_summary' | 'schedules'>('daily_summary');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summaries, setSummaries] = useState<DailyAttendanceSummary[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedDeviceRecord[]>([]);
  const [storedPunchCount, setStoredPunchCount] = useState(0);
  const [lastImportedAt, setLastImportedAt] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<AttendanceImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canonicalRole = normalizeRole(currentRole);
  const canImport = canonicalRole === 'ADMIN' || canonicalRole === 'HR_STAFF';

  useEffect(() => {
    let cancelled = false;

    const loadAttendance = async () => {
      try {
        const staff = await employeeRepository.getAll();
        if (cancelled) return;

        setEmployees(staff);
        const snapshot = attendanceImportService.getSnapshot(staff);
        if (cancelled) return;

        setSummaries(snapshot.summaries);
        setUnmatched(snapshot.unmatchedDeviceIds);
        setStoredPunchCount(snapshot.punchCount);
        setLastImportedAt(snapshot.lastImportedAt || null);
        setLastFileName(snapshot.lastFileName || null);
      } catch (error) {
        if (!cancelled) {
          setImportError(
            error instanceof Error ? error.message : 'Unable to load staff records.'
          );
        }
      }
    };

    loadAttendance();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleImportFile = async (file: File) => {
    if (!canImport || isImporting) return;

    setImportError(null);
    setIsImporting(true);

    try {
      const staff = employees.length > 0 ? employees : await employeeRepository.getAll();
      if (employees.length === 0) setEmployees(staff);

      const result = await attendanceImportService.importFile(file, staff);
      setImportResult(result);
      setSummaries(result.summaries);
      setUnmatched(result.unmatchedDeviceIds);
      setStoredPunchCount(result.storedPunchCount);
      setLastImportedAt(result.importedAt);
      setLastFileName(result.fileName);
      setDateFilter('all');
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'Unable to import the attendance export.'
      );
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleImportFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleImportFile(file);
  };

  const availableDates = useMemo(
    () => Array.from(new Set(summaries.map((summary) => summary.date))).sort().reverse(),
    [summaries]
  );

  const visibleSummaries = useMemo(
    () =>
      dateFilter === 'all'
        ? summaries
        : summaries.filter((summary) => summary.date === dateFilter),
    [summaries, dateFilter]
  );

  return (
    <div className="space-y-6 font-sans animate-fade-in text-slate-900">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#083E34] shrink-0" />
          <span>Attendance &amp; Biometric Imports</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Daily attendance summaries generated from biometric device exports, plus shift
          schedules across all locations.
        </p>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'daily_summary'}
          onClick={() => setActiveTab('daily_summary')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 min-h-[40px] shrink-0 cursor-pointer ${
            activeTab === 'daily_summary'
              ? 'bg-[#D4AF37] text-slate-950 shadow-xs border border-[#C59B27]'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Fingerprint className={`w-4 h-4 ${activeTab === 'daily_summary' ? 'text-slate-950' : 'text-slate-500'}`} />
          <span>Import &amp; Daily Summary</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'schedules'}
          onClick={() => setActiveTab('schedules')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 min-h-[40px] shrink-0 cursor-pointer ${
            activeTab === 'schedules'
              ? 'bg-[#D4AF37] text-slate-950 shadow-xs border border-[#C59B27]'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Building className={`w-4 h-4 ${activeTab === 'schedules' ? 'text-slate-950' : 'text-[#D4AF37]'}`} />
          <span>Shift Schedules &amp; Policies</span>
        </button>
      </div>

      {activeTab === 'daily_summary' ? (
        <div className="space-y-5">
          {/* Biometric Import Panel */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-[#083E34] via-[#0A463A] to-[#0D5546] text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <CitadelLogo variant="mark" colorMode="dark" className="h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-tight text-white">
                      Biometric Attendance Import
                    </h2>
                    <p className="text-[11px] text-emerald-50/80 font-medium mt-0.5 max-w-2xl">
                      Upload the export from the biometric device software. A single upload
                      refreshes the whole daily summary and never duplicates an overlapping
                      record.
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#D4AF37] text-slate-950 border border-[#C59B27]">
                  ZKTeco / CSV
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {canImport ? (
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`rounded-xl border-2 border-dashed p-5 text-center transition ${
                    isDragOver
                      ? 'border-[#D4AF37] bg-amber-50/60'
                      : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                    className="sr-only"
                    data-testid="attendance-import-input"
                    onChange={handleFileInputChange}
                  />
                  <FileSpreadsheet className="w-7 h-7 mx-auto text-[#083E34]" />
                  <p className="text-xs font-bold text-slate-900 mt-2">
                    Drop the biometric export here
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    CSV, TSV or TXT &middot; staff ID, timestamp and optional punch direction
                  </p>
                  <button
                    type="button"
                    id="attendance-import-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="mt-3 px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 border border-[#C59B27] font-bold text-xs transition inline-flex items-center gap-2 shadow-xs active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                  >
                    {isImporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{isImporting ? 'Importing export...' : 'Choose export file'}</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 font-medium">
                    Attendance exports are imported by People &amp; Culture administrators.
                    The daily summary below is read-only.
                  </p>
                </div>
              )}

              <div className="flex items-start gap-2 text-[11px] text-slate-500 font-medium">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#C59B27]" />
                <p>
                  Current assumptions: 4-digit zero-padded device IDs, local device
                  timestamps, and optional punch direction. Adjust the parser and matcher
                  modules when the real export format is confirmed.
                </p>
              </div>

              {importError && (
                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importResult && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Records read
                        </span>
                        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <p className="text-lg font-black text-slate-900 mt-1">
                        {importResult.totalRecords}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          Matched
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <p className="text-lg font-black text-emerald-800 mt-1">
                        {importResult.matchedRecords}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Duplicates skipped
                        </span>
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <p className="text-lg font-black text-slate-900 mt-1">
                        {importResult.duplicateRecords}
                      </p>
                    </div>
                    <div
                      className={`rounded-xl border p-3 ${
                        importResult.unmatchedDeviceIds.length > 0
                          ? 'border-amber-300 bg-amber-50/70'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Unmatched IDs
                        </span>
                        <AlertTriangle
                          className={`w-3.5 h-3.5 ${
                            importResult.unmatchedDeviceIds.length > 0
                              ? 'text-amber-600'
                              : 'text-slate-400'
                          }`}
                        />
                      </div>
                      <p className="text-lg font-black text-slate-900 mt-1">
                        {importResult.unmatchedDeviceIds.length}
                      </p>
                    </div>
                  </div>

                  {importResult.skippedRows.length > 0 && (
                    <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          {importResult.skippedRows.length} row
                          {importResult.skippedRows.length === 1 ? '' : 's'} could not be read
                        </span>
                      </div>
                      <ul className="mt-1.5 space-y-1 pl-6 list-disc text-[11px] font-medium">
                        {importResult.skippedRows.slice(0, 4).map((row) => (
                          <li key={`${row.line}-${row.reason}`}>
                            Line {row.line}: {row.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  {storedPunchCount} stored punch{storedPunchCount === 1 ? '' : 'es'}
                </span>
                {lastFileName && <span>Last file: {lastFileName}</span>}
                {lastImportedAt && (
                  <span>Last import: {new Date(lastImportedAt).toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>

          {/* Daily Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#083E34]" />
                  <span>Daily Attendance Summary</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  First punch of each date is the clock-in; last punch is the clock-out.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="attendance-date-filter" className="text-[11px] font-bold text-slate-500">
                  Date
                </label>
                <select
                  id="attendance-date-filter"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                >
                  <option value="all">All dates</option>
                  {availableDates.map((date) => (
                    <option key={date} value={date}>
                      {formatDateLabel(date)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {visibleSummaries.length === 0 ? (
              <div className="p-8 text-center">
                <Fingerprint className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700 mt-2">
                  No daily attendance records yet
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {canImport
                    ? 'Upload a biometric export to generate the first summary.'
                    : 'Biometric attendance imports will appear here once uploaded.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-black uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 whitespace-nowrap">Staff Member</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Clock In</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Clock Out</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Punches</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Entity &amp; Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleSummaries.map((summary) => (
                      <tr key={summary.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{summary.employeeName}</p>
                          <span className="text-[11px] text-slate-500 font-mono font-medium">
                            {summary.employeeStaffId}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {formatDateLabel(summary.date)}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-700 whitespace-nowrap">
                          {summary.clockInTime}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {summary.clockOutTime}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant={summary.punchCount > 1 ? 'success' : 'warning'}>
                            {summary.punchCount} punch{summary.punchCount === 1 ? '' : 'es'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-800 font-semibold">{summary.entityName || '—'}</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {summary.departmentName || '—'}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Unmatched Device IDs */}
          {unmatched.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden">
              <div className="p-4 border-b border-amber-100 bg-amber-50/70 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>Flagged Device IDs</span>
                  </h3>
                  <p className="text-[11px] text-amber-900/80 font-medium mt-0.5">
                    These punches were kept but not counted in the daily summary until a
                    staff record is mapped.
                  </p>
                </div>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-200 text-amber-950 border border-amber-300">
                  {unmatched.length} ID{unmatched.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-50/40 border-b border-amber-100 text-amber-900 font-black uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4 whitespace-nowrap">Device ID</th>
                      <th className="py-3 px-4 whitespace-nowrap">Reason</th>
                      <th className="py-3 px-4 whitespace-nowrap">Punches</th>
                      <th className="py-3 px-4 whitespace-nowrap">First Seen</th>
                      <th className="py-3 px-4 whitespace-nowrap">Last Seen</th>
                      <th className="py-3 px-4 whitespace-nowrap">Candidate Staff IDs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/70">
                    {unmatched.map((record) => (
                      <tr key={`${record.deviceId}-${record.reason}`} className="hover:bg-amber-50/40 transition">
                        <td className="py-3 px-4 font-mono font-black text-amber-950 whitespace-nowrap">
                          {record.deviceId || '(blank)'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-amber-900 whitespace-nowrap">
                          {unmatchedReasonLabel(record.reason)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                          {record.occurrences}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                          {formatTimestampLabel(record.firstTimestamp)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                          {formatTimestampLabel(record.lastTimestamp)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {record.candidateStaffIds.length > 0
                            ? record.candidateStaffIds.join(', ')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Hardware Device Health Monitor */}
          <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#D4AF37]" />
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
        </div>
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

            {/* Desktop: horizontal table */}
            <div className="hidden lg:block overflow-x-auto custom-scrollbar">
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

            {/* Mobile: stacked cards */}
            <div className="lg:hidden divide-y divide-slate-200 space-y-2">
              {CITADEL_ATTENDANCE_SCHEDULES.map((sched) => (
                <div key={sched.id} className="p-3 space-y-2 hover:bg-slate-50/60 rounded-lg transition border border-transparent hover:border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-black text-black">
                    <Building className="w-3.5 h-3.5 text-[#083E34]" />
                    <span>{sched.entityOrUnit}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">
                    Category: {sched.category}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="px-2 py-1 rounded bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                        Shift Timings
                      </span>
                      <span className={`font-black block ${
                        sched.shiftStart === '7:00 AM'
                          ? 'text-amber-900'
                          : 'text-black'
                      }`}>
                        {sched.shiftStart} – {sched.shiftEnd}
                      </span>
                      {sched.shiftStart === '7:00 AM' && (
                        <span className="text-[10px] text-amber-800 font-bold mt-0.5">
                          Early Operational Shift
                        </span>
                      )}
                    </div>
                    <div className="px-2 py-1 rounded bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <span className="block text-[10px] text-slate-500 font-semibold">
                        Hours / Day
                      </span>
                      <span className="font-black text-black">
                        {sched.hoursPerDay} Hours
                      </span>
                    </div>
                    <div className="px-2 py-1 rounded bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <span className="block text-[10px] text-slate-500 font-semibold">
                        Biometric Capture
                      </span>
                      <span className="inline-flex items-center gap-1 font-black text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>YES (Mandatory)</span>
                      </span>
                    </div>
                    <div className="px-2 py-1 rounded bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <span className="block text-[10px] text-slate-500 font-semibold">
                        Grace Window
                      </span>
                      <span className="font-black text-black">
                        {sched.gracePeriodMinutes} Minutes
                      </span>
                    </div>
                    <div className="px-2 py-1 rounded bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] text-slate-500 font-semibold">
                        Late Threshold
                      </span>
                      <span className="font-mono font-black text-rose-700 block">
                        After {sched.lateThreshold}
                      </span>
                    </div>
                  </div>
                  <div className="px-2 py-1.5 rounded bg-slate-50 border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-semibold mb-1">
                      Operational &amp; Event Rules
                    </span>
                    <span className="text-[11px] text-slate-800 leading-relaxed">
                      {sched.specialRules}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
