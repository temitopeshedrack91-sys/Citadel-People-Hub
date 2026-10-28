import React, { useState } from 'react';
import { Cloud, Cpu, Database, Fingerprint, RefreshCw } from 'lucide-react';
import { Badge } from '../common/Badge';
import { isLaravelApiConfigured, requestLaravel } from '../../services/laravelClient';

export const IntegrationsView: React.FC = () => {
  const [testingApi, setTestingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const hasLaravelApi = isLaravelApiConfigured();

  const testApi = async () => {
    setTestingApi(true);
    try {
      const health = await requestLaravel<{ status: string }>('/health');
      setApiStatus(
        health.status === 'ok'
          ? 'Laravel API is reachable. This health check does not verify database connectivity.'
          : 'Laravel API returned an unexpected health response.'
      );
    } catch (error) {
      setApiStatus(error instanceof Error ? `Laravel API check failed: ${error.message}` : 'Laravel API check failed.');
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#083E34]" />
          <span>Integrations</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Connected services, biometric hardware sync, and API endpoints.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Biometric Devices</h3>
                  <p className="text-[10px] text-slate-400">ZKTeco • RFID • TCP/UDP</p>
                </div>
              </div>
              <Badge variant="warning">Not integrated</Badge>
            </div>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Device synchronization is not connected to Laravel yet. No device ping is sent from this browser.
            </p>
            <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
              <div>Provider: not configured</div>
              <div>Laravel integration: not implemented</div>
              <div>Status: unavailable</div>
            </div>
          </div>
          <button
            disabled
            className="mt-4 w-full py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Device check unavailable</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Laravel API & Supabase PostgreSQL</h3>
                  <p className="text-[10px] text-slate-400">Laravel auth and API • Supabase database</p>
                </div>
              </div>
              <Badge variant={hasLaravelApi ? 'info' : 'warning'}>
                {hasLaravelApi ? 'API configured' : 'API not configured'}
              </Badge>
            </div>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Laravel owns application authentication and data access. Supabase is used only as the PostgreSQL database.
            </p>
            <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
              <div>Application API: Laravel REST</div>
              <div>Database: Supabase PostgreSQL</div>
              <div>Storage: Laravel private disk</div>
            </div>
            {apiStatus && (
              <div
                className={`mt-2.5 p-2 rounded-lg text-[11px] border ${
                  apiStatus.includes('reachable')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {apiStatus}
              </div>
            )}
          </div>
          <button
            onClick={testApi}
            disabled={testingApi || !hasLaravelApi}
            className="mt-4 w-full py-2 bg-slate-100 hover:bg-[#083E34] text-slate-800 hover:text-[#FF9900] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingApi ? 'animate-spin' : ''}`} />
            <span>{testingApi ? 'Checking Laravel API...' : 'Check Laravel API'}</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Microsoft 365 / Azure</h3>
                  <p className="text-[10px] text-slate-400">Outlook • SSO • Calendar</p>
                </div>
              </div>
              <Badge variant="warning">Not integrated</Badge>
            </div>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Microsoft Entra ID sign-in, Outlook calendar synchronization, and staff email routing are not connected to Laravel yet.
            </p>
            <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
              <div>Provider: Microsoft Entra ID</div>
              <div>Laravel integration: not configured</div>
              <div>Credentials: server-side configuration required</div>
            </div>
            <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
              Do not place Microsoft client secrets in frontend build variables.
            </div>
          </div>
          <button
            disabled
            className="mt-4 w-full py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>SSO check unavailable</span>
          </button>
        </div>
      </div>
    </div>
  );
};
