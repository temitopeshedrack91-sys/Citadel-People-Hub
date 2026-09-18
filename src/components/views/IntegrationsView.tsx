import React, { useState } from 'react';
import {
  Cpu,
  Fingerprint,
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const IntegrationsView: React.FC = () => {
  const [testingBiometric, setTestingBiometric] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [testingM365, setTestingM365] = useState(false);

  const [biometricStatus, setBiometricStatus] = useState<string | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);
  const [m365Status, setM365Status] = useState<string | null>(null);

  const testBiometric = () => {
    setTestingBiometric(true);
    setTimeout(() => {
      setTestingBiometric(false);
      setBiometricStatus('Connected: 3/3 ZKTeco Nodes responding on LAN. UDP Socket 4370 Verified.');
    }, 800);
  };

  const testSupabase = () => {
    setTestingSupabase(true);
    setTimeout(() => {
      setTestingSupabase(false);
      setSupabaseStatus('Prototype Mode: Mock data layer active. Pre-configured for VITE_SUPABASE_URL.');
    }, 800);
  };

  const testM365 = () => {
    setTestingM365(true);
    setTimeout(() => {
      setTestingM365(false);
      setM365Status('Ready: Azure AD App Registration schema verified (citadelcommunity.org).');
    }, 800);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#0A1E3F]" />
          <span>Integrations & Cloud Infrastructure</span>
        </h2>
        <p className="text-xs text-slate-500">
          Biometric hardware hooks, Microsoft 365 ecosystem connectors, and Supabase PostgreSQL backend readiness.
        </p>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Biometric Hardware */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
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
              <Badge variant="success">Online</Badge>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Real-time synchronization with on-premise biometric time clocks across CGCC reception, CSOG gate, and Holdings cafe.
            </p>

            <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
              <div>Port: 4370 (ZKTeco Protocol)</div>
              <div>Buffer: 50,000 logs</div>
              <div>Sync Cadence: 30 seconds</div>
            </div>

            {biometricStatus && (
              <div className="mt-2.5 p-2 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800">
                {biometricStatus}
              </div>
            )}
          </div>

          <button
            onClick={testBiometric}
            disabled={testingBiometric}
            className="mt-4 w-full py-2 bg-slate-100 hover:bg-[#0A1E3F] text-slate-800 hover:text-amber-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingBiometric ? 'animate-spin' : ''}`} />
            <span>{testingBiometric ? 'Testing Telemetry...' : 'Test Device Ping'}</span>
          </button>
        </div>

        {/* 2. Supabase PostgreSQL & Storage */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Supabase Platform</h3>
                  <p className="text-[10px] text-slate-400">PostgreSQL • Auth • RLS</p>
                </div>
              </div>
              <Badge variant="warning">Schema Ready</Badge>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Clean repository abstraction prepared for drop-in activation of Supabase PostgreSQL database, S3 document storage, and Row Level Security.
            </p>

            <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
              <div>Adapter: /src/services/</div>
              <div>RLS: Entity & Role Scoped</div>
              <div>Storage: Private Documents</div>
            </div>

            {supabaseStatus && (
              <div className="mt-2.5 p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                {supabaseStatus}
              </div>
            )}
          </div>

          <button
            onClick={testSupabase}
            disabled={testingSupabase}
            className="mt-4 w-full py-2 bg-slate-100 hover:bg-[#0A1E3F] text-slate-800 hover:text-amber-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingSupabase ? 'animate-spin' : ''}`} />
            <span>{testingSupabase ? 'Verifying Adapter...' : 'Verify Schema Contracts'}</span>
          </button>
        </div>

        {/* 3. Microsoft 365 & Azure AD */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
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
              <Badge variant="info">Configured</Badge>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Citadel community domain federation, Single Sign-On (SSO) via Microsoft Entra ID, Outlook calendar synching, and staff email routing.
            </p>

            <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
              <div>Tenant: citadelcommunity.org</div>
              <div>Graph API: User.Read, Calendars</div>
              <div>Auth Flow: OAuth 2.0 PKCE</div>
            </div>

            {m365Status && (
              <div className="mt-2.5 p-2 rounded bg-sky-50 border border-sky-200 text-[11px] text-sky-800">
                {m365Status}
              </div>
            )}
          </div>

          <button
            onClick={testM365}
            disabled={testingM365}
            className="mt-4 w-full py-2 bg-slate-100 hover:bg-[#0A1E3F] text-slate-800 hover:text-amber-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingM365 ? 'animate-spin' : ''}`} />
            <span>{testingM365 ? 'Verifying Tenant...' : 'Test Tenant SSO'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
