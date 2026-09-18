import React, { useState, useEffect } from 'react';
import { History, Search, ShieldCheck, Filter, AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import { AuditLogEntry } from '../../types';
import { auditRepository } from '../../services';
import { Badge } from '../common/Badge';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');

  const loadLogs = async () => {
    const list = await auditRepository.getLogs();
    setLogs(list);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (moduleFilter !== 'All' && log.module !== moduleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.recordAffectedTitle.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return <Badge variant="danger">Critical</Badge>;
      case 'Warning':
        return <Badge variant="warning">Warning</Badge>;
      default:
        return <Badge variant="neutral">Info</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
          <History className="w-5 h-5 text-[#0A1E3F]" />
          <span>Citadel Compliance & Audit Trail</span>
        </h2>
        <p className="text-xs text-slate-500">
          Immutable event logs for HR compliance, workflow approvals, sensitive data access, and administrative actions.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, actor, affected employee, or module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0A1E3F]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {[
            'All',
            'Employee Management',
            'Leave Management',
            'Organization Settings',
            'Talent & Onboarding',
            'Documents & Policies',
          ].map((mod) => (
            <button
              key={mod}
              onClick={() => setModuleFilter(mod)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                moduleFilter === mod
                  ? 'bg-[#0A1E3F] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {mod === 'Employee Management' ? 'Employees' : mod}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Action & Affected Item</th>
                <th className="py-3 px-4">Audit Delta</th>
                <th className="py-3 px-4 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{log.userName}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{log.userRole}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">{log.module}</td>
                  <td className="py-3 px-4 max-w-xs">
                    <p className="font-semibold text-slate-900 truncate">{log.action}</p>
                    <p className="text-[11px] text-slate-500 truncate">{log.recordAffectedTitle}</p>
                  </td>
                  <td className="py-3 px-4 text-[11px] font-mono text-slate-600 max-w-xs">
                    <div className="truncate">
                      <span className="text-slate-400">Old:</span> {log.previousValue || '—'}
                    </div>
                    <div className="truncate">
                      <span className="text-emerald-700 font-semibold">New:</span>{' '}
                      {log.newValue || '—'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">{getSeverityBadge(log.severity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
