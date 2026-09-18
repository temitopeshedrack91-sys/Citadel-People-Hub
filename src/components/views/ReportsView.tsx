import React from 'react';
import { BarChart3, Download, PieChart, Users, TrendingUp, FileSpreadsheet } from 'lucide-react';
import { auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';

export const ReportsView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();

  const handleExport = async (type: string) => {
    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Reports & Analytics',
      action: `Exported ${type} Report`,
      recordAffectedId: `rep-${Date.now()}`,
      recordAffectedTitle: `Headcount & Leave Analytics (${type})`,
      previousValue: 'None',
      newValue: 'Exported file',
      severity: 'Info',
    });
    alert(`Generating and downloading ${type} report for ${currentUser.name}...`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0A1E3F]" />
            <span>Reports & Workforce Analytics</span>
          </h2>
          <p className="text-xs text-slate-500">
            Workforce demographics, departmental headcount distribution, leave utilization, and governance analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('CSV')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="px-3.5 py-1.5 rounded-lg bg-[#0A1E3F] text-amber-300 hover:bg-[#152B52] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Executive PDF</span>
          </button>
        </div>
      </div>

      {/* Headcount Distribution Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Citadel Global Community Church (CGCC)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#0A1E3F]">82 Staff</span>
            <span className="text-xs font-semibold text-slate-500">56.9% of Total</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>People & Culture (PCCM):</span>
              <span className="font-semibold text-slate-800">12</span>
            </div>
            <div className="flex justify-between">
              <span>ICT & Digital Systems:</span>
              <span className="font-semibold text-slate-800">18</span>
            </div>
            <div className="flex justify-between">
              <span>Finance & Accounts:</span>
              <span className="font-semibold text-slate-800">14</span>
            </div>
            <div className="flex justify-between">
              <span>Media & Communications:</span>
              <span className="font-semibold text-slate-800">22</span>
            </div>
            <div className="flex justify-between">
              <span>Facility & Pastoral:</span>
              <span className="font-semibold text-slate-800">16</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Citadel School of Government (CSOG)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#0A1E3F]">24 Staff</span>
            <span className="text-xs font-semibold text-slate-500">16.7% of Total</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Faculty & Curriculum:</span>
              <span className="font-semibold text-slate-800">10</span>
            </div>
            <div className="flex justify-between">
              <span>Research & Policy Fellows:</span>
              <span className="font-semibold text-slate-800">8</span>
            </div>
            <div className="flex justify-between">
              <span>Academic Admin & Ops:</span>
              <span className="font-semibold text-slate-800">6</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Citadel Holdings (Commercial Ventures)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#0A1E3F]">38 Staff</span>
            <span className="text-xs font-semibold text-slate-500">26.4% of Total</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Citadel Cafe & Culinary:</span>
              <span className="font-semibold text-slate-800">14</span>
            </div>
            <div className="flex justify-between">
              <span>Bookshop & Publishing:</span>
              <span className="font-semibold text-slate-800">7</span>
            </div>
            <div className="flex justify-between">
              <span>Workstation / Co-Working:</span>
              <span className="font-semibold text-slate-800">5</span>
            </div>
            <div className="flex justify-between">
              <span>Asabi Aladire Apparel:</span>
              <span className="font-semibold text-slate-800">6</span>
            </div>
            <div className="flex justify-between">
              <span>Sales & Business Dev:</span>
              <span className="font-semibold text-slate-800">6</span>
            </div>
          </div>
        </div>
      </div>

      {/* Diversity & Demographics */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Workforce Demographics & Diversity Ratios
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block text-[11px]">Gender Ratio:</span>
            <div className="mt-1 flex items-baseline gap-2">
              <strong className="text-slate-900">56% Male</strong>
              <span className="text-slate-400">/</span>
              <strong className="text-slate-900">44% Female</strong>
            </div>
            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 flex overflow-hidden">
              <div className="bg-[#0A1E3F] h-1.5 w-[56%]"></div>
              <div className="bg-[#C5A059] h-1.5 w-[44%]"></div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block text-[11px]">Tenure Distribution:</span>
            <div className="mt-1 flex items-baseline gap-2">
              <strong className="text-slate-900">3.4 Years</strong>
              <span className="text-slate-500 text-[10px]">Average tenure</span>
            </div>
            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 w-3/4"></div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block text-[11px]">Employment Type:</span>
            <div className="mt-1 flex items-baseline gap-2">
              <strong className="text-slate-900">88% Full-Time</strong>
              <span className="text-slate-400">/</span>
              <strong className="text-slate-900">12% Contract</strong>
            </div>
            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 flex overflow-hidden">
              <div className="bg-[#0A1E3F] h-1.5 w-[88%]"></div>
              <div className="bg-amber-400 h-1.5 w-[12%]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
