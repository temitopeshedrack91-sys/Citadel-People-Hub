import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Download,
  Lock,
  Search,
  CheckCircle2,
  X,
  FileCheck,
  Shield,
  Sparkles,
} from 'lucide-react';
import { HubDocument } from '../../types';
import { documentRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { downloadLaravelFile, isLaravelApiConfigured } from '../../services/laravelClient';

export const DocumentsView: React.FC = () => {
  const { currentUser, currentRole, permissions } = useAuth();
  const [documents, setDocuments] = useState<HubDocument[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  // Upload Form State
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<'Company Policy' | 'PCCM Form / Template' | 'Employee Contract' | 'Academic & Professional'>('Company Policy');
  const [docDescription, setDocDescription] = useState('');
  const [docAccessLevel, setDocAccessLevel] = useState<'Public' | 'Departmental' | 'PCCM_Only'>('Public');
  const [docEntityScope, setDocEntityScope] = useState('All Citadel Entities');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState('1.2 MB');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = async () => {
    const docs = await documentRepository.getAll();
    setDocuments(docs);
  };

  useEffect(() => {
    fetchDocuments();
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedFileName(file.name);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setSelectedFileSize(`${sizeMb} MB`);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    setIsUploading(true);
    try {
      const newDoc = await documentRepository.uploadDocument({
        title: docTitle,
        category: docCategory,
        description: docDescription || `Official ${docCategory} published for ${docEntityScope}`,
        accessLevel: docAccessLevel,
        entityScope: docEntityScope,
        version: 'v1.0',
        fileSize: selectedFileSize,
        fileName: selectedFileName || `${docTitle.replace(/\s+/g, '_')}.pdf`,
        fileType: selectedFileName.endsWith('.docx') ? 'DOCX' : selectedFileName.endsWith('.xlsx') ? 'XLSX' : 'PDF',
        uploadedBy: currentUser.name,
        isSensitive: docAccessLevel === 'PCCM_Only',
      }, selectedFile || undefined);

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Documents & Policies',
        action: 'Uploaded Document to Vault',
        recordAffectedId: newDoc.id,
        recordAffectedTitle: newDoc.title,
        previousValue: 'None',
        newValue: `Uploaded ${newDoc.category} (${newDoc.fileSize})`,
        severity: 'Info',
      });

      await fetchDocuments();
      setIsUploadModalOpen(false);
      setDocTitle('');
      setDocDescription('');
      setSelectedFileName('');
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Real client-side file download generator
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

    if (isLaravelApiConfigured()) {
      await downloadLaravelFile(`/documents/${encodeURIComponent(doc.id)}/download`, doc.fileName);
      setDownloadSuccessMsg(`Downloaded "${doc.title}" to your computer.`);
      setTimeout(() => setDownloadSuccessMsg(null), 4000);
      return;
    }

    const docContent = `========================================================================
CITADEL PEOPLE HUB - OFFICIAL CORPORATE DOCUMENT
========================================================================
Document Title: ${doc.title}
Category:       ${doc.category}
Version:        ${doc.version}
Scope:          ${doc.entityScope}
Published Date: ${doc.uploadedDate}
Access Level:   ${doc.accessLevel}

SUMMARY & PURPOSE:
${doc.description}

GOVERNANCE NOTICE:
This document is issued by the People, Culture & Change Management (PCCM) Directorate
for Citadel Global Community Church (CGCC), Citadel School of Government (CSOG),
and Citadel Holdings. Unauthorized alteration or dissemination outside approved
Citadel channels is strictly prohibited.

Downloaded by: ${currentUser.name} (${currentUser.staffId})
Timestamp:     ${new Date().toLocaleString()}
========================================================================`;

    const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `Citadel_${safeTitle}_${doc.version}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccessMsg(`Downloaded "${doc.title}" to your computer.`);
    setTimeout(() => setDownloadSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-5">
      {downloadSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadSuccessMsg}</span>
          </div>
          <button onClick={() => setDownloadSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-black tracking-tight font-serif flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0A1E3F]" />
            <span>Documents & Organizational Policies</span>
          </h2>
          <p className="text-xs text-black font-semibold">
            Official Citadel Community Church, School of Government, and Holdings charters, templates, and employee manuals.
          </p>
        </div>

        {permissions.canManageDocuments && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-[#0A1E3F] text-amber-300 hover:bg-[#152B52] text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-black" />
          <input
            type="text"
            placeholder="Search document title, category, or policy..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 text-black font-semibold placeholder:text-slate-600 focus:outline-none focus:border-[#0A1E3F]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {['All', 'Policy', 'Handbook', 'Template', 'Contract'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                categoryFilter === cat
                  ? 'bg-[#0A1E3F] text-white shadow-xs'
                  : 'text-black hover:bg-slate-100'
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
            className="bg-white rounded-xl border border-slate-300 p-4 shadow-xs flex flex-col justify-between hover:border-slate-400 transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-lg bg-[#0A1E3F]/5 text-[#0A1E3F] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#C5A059]" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="citadel">{doc.category}</Badge>
                  {doc.accessLevel === 'PCCM_Only' && (
                    <span className="p-1 rounded bg-amber-100 text-amber-900 border border-amber-300" title="Restricted to PCCM">
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <h3 className="text-xs font-black text-black leading-snug">{doc.title}</h3>
                <p className="text-xs text-black font-medium mt-1 line-clamp-2">{doc.description}</p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-black font-bold space-y-1">
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

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-black">Official Document</span>
              <button
                onClick={() => handleDownload(doc)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#0A1E3F] text-black hover:text-amber-300 text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061328]/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="bg-[#0A1E3F] text-white p-5 relative border-b border-amber-500/20 shrink-0">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold font-serif text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-300" />
                <span>Upload Document to Vault</span>
              </h3>
              <p className="text-xs text-amber-200/80 mt-0.5">
                PCCM Document Repository & Policy Publishing
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Citadel Staff Code of Conduct 2026/2027"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0A1E3F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0A1E3F]"
                  >
                    <option value="Company Policy">Company Policy</option>
                    <option value="PCCM Form / Template">PCCM Form / Template</option>
                    <option value="Employee Contract">Employee Contract</option>
                    <option value="Academic & Professional">Academic & Professional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Access Level</label>
                  <select
                    value={docAccessLevel}
                    onChange={(e) => setDocAccessLevel(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0A1E3F]"
                  >
                    <option value="Public">Public (All Citadel Staff)</option>
                    <option value="Departmental">Departmental Only</option>
                    <option value="PCCM_Only">Restricted PCCM Super Admin Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Entity Scope</label>
                <select
                  value={docEntityScope}
                  onChange={(e) => setDocEntityScope(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0A1E3F]"
                >
                  <option value="All Citadel Entities">All Citadel Entities (CGCC, CSOG, Holdings)</option>
                  <option value="Citadel Global Community Church (CGCC)">Citadel Global Community Church (CGCC)</option>
                  <option value="Citadel School of Government (CSOG)">Citadel School of Government (CSOG)</option>
                  <option value="Citadel Holdings">Citadel Holdings</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of document purpose and guidelines..."
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0A1E3F]"
                />
              </div>

              {/* File Attachment Input */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select File (PDF, DOCX, XLSX)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-[#0A1E3F] transition cursor-pointer relative">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    required
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                  <p className="text-slate-700 font-medium text-xs">
                    {selectedFileName || 'Click to choose a file from your computer'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {selectedFileName ? `File Size: ${selectedFileSize}` : 'Supported: PDF, Word, Excel (Max 25MB)'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 bg-[#0A1E3F] text-amber-300 font-bold rounded-lg hover:bg-[#152B52] transition shadow-xs"
                >
                  {isUploading ? 'Publishing...' : 'Save & Publish Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
