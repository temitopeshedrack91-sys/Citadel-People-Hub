import React from 'react';
import { CheckCircle2, Cloud, Cpu, FileSpreadsheet, Fingerprint, RefreshCw } from 'lucide-react';
import { Badge } from '../common/Badge';

export const IntegrationsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#174EA6]" />
          <span>Integrations</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Connected HRIS data channels, biometric attendance ingestion, and Microsoft 365 external readiness status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-[#BFDBFE] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#174EA6] flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Biometric Punch File Import</h3>
                  <p className="text-[10px] text-slate-400">CSV / XLSX • Idempotent Sync</p>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              ZKTeco &amp; RFID attendance exports can be uploaded directly in the Attendance module with automatic staff ID resolution, duplicate protection, and Sheet 8 10-minute grace evaluation.
            </p>
            <div className="mt-3 bg-[#EFF6FF] p-2.5 rounded-xl border border-[#BFDBFE] text-[11px] font-mono text-slate-700 space-y-1">
              <div>Endpoint: POST /api/v1/attendance/biometric-imports</div>
              <div>Deduplication: SHA-256 device + timestamp hash</div>
              <div>Status: Ready in Attendance module</div>
            </div>
          </div>
          <div className="mt-4 w-full py-2 bg-[#EFF6FF] text-[#174EA6] border border-[#BFDBFE] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Operational via Attendance Import</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#174EA6] border border-[#BFDBFE]/50 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Live Biometric Terminal Push</h3>
                  <p className="text-[10px] text-slate-400">ZKTeco • Direct TCP/UDP Agent</p>
                </div>
              </div>
              <Badge variant="warning">External dependency</Badge>
            </div>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Real-time push directly from physical campus biometric terminals requires a campus LAN collector/VPN bridge and vendor device IP credentials. Use Biometric Punch File Import until hardware push is provisioned.
            </p>
            <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
              <div>Protocol: ZKTeco ADMS / TCP push</div>
              <div>Dependency: Campus LAN bridge &amp; device IPs</div>
              <div>Status: Awaiting hardware provisioning</div>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="mt-4 w-full py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Awaiting campus device bridge</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] text-[#B45309] border border-[#F2E4B8] flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Microsoft 365 / Azure Entra ID</h3>
                  <p className="text-[10px] text-slate-400">SSO • Outlook • Teams • Graph</p>
                </div>
              </div>
              <Badge variant="warning">External dependency</Badge>
            </div>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Microsoft Entra ID single sign-on, Outlook mail/calendar sync, and Teams alerts (Workbook Sheet 19) require CGCC Azure Tenant App Registration credentials configured on the Laravel server.
            </p>
            <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
              <div>Provider: Microsoft Entra ID &amp; Graph API</div>
              <div>Required: Tenant ID, Client ID, Server Secret</div>
              <div>Status: Blocked on tenant credentials</div>
            </div>
            <div className="mt-2.5 p-2 rounded-lg bg-[#FAF5EB] border border-[#E9D59A] text-[11px] text-[#B88A24]">
              Keep Microsoft client secrets strictly in server environment variables — never in frontend build config.
            </div>
          </div>
          <button
            type="button"
            disabled
            className="mt-4 w-full py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Awaiting CGCC Azure Tenant setup</span>
          </button>
        </div>
      </div>
    </div>
  );
};
