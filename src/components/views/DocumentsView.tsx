import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Download,
  Lock,
  Search,
  Filter,
  Eye,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';
import { HubDocument } from '../../types';
import { documentRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const DocumentsView: React.FC = () => {
  const { currentUser, currentRole, permissions } = useAuth();
  const [documents, setDocuments] = useState<HubDocument[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      const docs = await documentRepository.getAll();
      setDocuments(docs);
    };
    fetchData();
  }, []);

  const filteredDocs = documents.filter((doc) => {
    if (categoryFilter !== 'All' && doc.category !== categoryFilter) return false;
    if (search && !doc.title.toLowerCase().includes(search.toLowerCase())) return false;

    // Access level filter
    if (doc.accessLevel === 'PCCM_Only' && currentRole !== 'PCCM_SUPER_ADMIN') {
      return false;
    }
    return true;
  });

  const handleDownload = async (doc: HubDocument) => {
    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Documents & Policies',
      action: 'Downloaded Document',
      recordAffectedId: doc.id,
      recordAffectedTitle: doc.title,
      previousValue: 'None',
      newValue: 'Downloaded',
      severity: 'Info',
    });
    alert(`Downloading "${doc.title}" (${doc.fileSize})`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0A1E3F]" />
            <span>Documents & Organizational Policies</span>
          </h2>
          <p className="text-xs text-slate-500">
            Official Citadel Community Church, School of Government, and Holdings charters, templates, and employee manuals.
          </p>
        </div>

        {permissions.canManageDocuments && (
          <button
            onClick={() => alert('Opening Document Upload portal for PCCM repository')}
            className="px-3.5 py-2 rounded-lg bg-[#0A1E3F] text-amber-300 hover:bg-[#152B52] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search document title, category, or policy..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0A1E3F]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['All', 'Policy', 'Handbook', 'Template', 'Contract'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                categoryFilter === cat
                  ? 'bg-[#0A1E3F] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-lg bg-[#0A1E3F]/5 text-[#0A1E3F] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#C5A059]" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="citadel">{doc.category}</Badge>
                  {doc.accessLevel === 'PCCM_Only' && (
                    <span className="p-1 rounded bg-amber-100 text-amber-800" title="Restricted to PCCM">
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <h3 className="text-xs font-bold text-slate-900 leading-snug">{doc.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{doc.description}</p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Version: {doc.version}</span>
                  <span>Size: {doc.fileSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>Scope: {doc.entityScope}</span>
                  <span>Date: {doc.uploadedDate}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">PDF Document</span>
              <button
                onClick={() => handleDownload(doc)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#0A1E3F] text-slate-700 hover:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
