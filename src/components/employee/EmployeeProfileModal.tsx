import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  Shield,
  GraduationCap,
  Award,
  CreditCard,
  HeartPulse,
  Clock,
  CalendarDays,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Eye,
  EyeOff,
  Download,
  Share2,
  ExternalLink,
  Lock,
  Upload,
  Trash2,
  RefreshCw,
  Loader2,
  FileWarning,
  Users,
  GitBranch,
} from 'lucide-react';
import { Employee, EmployeeHierarchy, DocumentCategory, HubDocument, PerformanceReview, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { SensitiveField } from '../common/SensitiveField';
import { Badge } from '../common/Badge';
import { documentRepository, auditRepository, employeeRepository, performanceRepository } from '../../services';
import { EmployeeDocumentInput } from '../../types/documents';

interface EmployeeProfileModalProps {
  employee: Employee | null;
  onClose: () => void;
  onEdit?: (employee: Employee) => void;
  onNavigateLeave?: () => void;
}

type ProfileTab =
  | 'overview'
  | 'personal'
  | 'emergency'
  | 'qualifications'
  | 'payroll'
  | 'documents'
  | 'leave'
  | 'attendance'
  | 'performance';

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  employee,
  onClose,
  onEdit,
  onNavigateLeave,
}) => {
  const { currentUser, currentRole, canViewSensitiveData, permissions } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isCopied, setIsCopied] = useState(false);

  // Employee Documents state
  const [employeeDocs, setEmployeeDocs] = useState<HubDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<EmployeeDocumentInput & { file?: File }>({
    title: '',
    category: 'Identification',
    description: '',
    issueDate: '',
    expiryDate: '',
    version: '1.0',
  });
  const [uploading, setUploading] = useState(false);
  const [replaceDocId, setReplaceDocId] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hierarchy, setHierarchy] = useState<EmployeeHierarchy | null>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [empReviews, setEmpReviews] = useState<PerformanceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const replaceFileRef = useRef<HTMLInputElement>(null);

  const EMPLOYEE_DOCUMENT_CATEGORIES: DocumentCategory[] = [
    'Educational Certificate',
    'Professional Certification',
    'CV/Resume',
    'National Identification',
    'Employment Letter',
    'Previous Employment Document',
    'Medical Fitness Certificate',
    'Other Supporting Document',
  ];

  const canManageEmployeeDocs =
    permissions.canManageDocuments || Boolean(employee?.staffId && currentUser.staffId === employee.staffId);

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return String(dateString);
    }
  };

  const documentStatus = (doc: HubDocument): { label: string; variant: 'success' | 'warning' | 'destructive' } => {
    if (!doc.expiryDate) return { label: 'Valid', variant: 'success' };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const expiry = new Date(doc.expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: 'Expired', variant: 'destructive' };
    if (daysLeft <= 30) return { label: 'Expiring Soon', variant: 'warning' };
    return { label: 'Valid', variant: 'success' };
  };

  const clearStatus = () => setTimeout(() => setStatusMessage(null), 4000);

  const loadEmployeeDocuments = async () => {
    setDocsError(null);
    setDocsLoading(true);
    try {
      const docs = await documentRepository.getEmployeeDocuments(employee!.id);
      setEmployeeDocs(docs);
    } catch (error: any) {
      setDocsError(error?.message || 'Unable to load employee documents.');
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'documents' && employee?.id) {
      loadEmployeeDocuments();
    }
  }, [activeTab, employee?.id]);

  useEffect(() => {
    if (!employee?.id) {
      setHierarchy(null);
      return;
    }
    let cancelled = false;
    setHierarchyLoading(true);
    employeeRepository
      .getHierarchy(employee.id)
      .then((res) => {
        if (!cancelled) setHierarchy(res);
      })
      .catch(() => {
        if (!cancelled) setHierarchy(null);
      })
      .finally(() => {
        if (!cancelled) setHierarchyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employee?.id]);

  const loadEmployeePerformance = useCallback(async () => {
    if (!employee?.id) {
      setEmpReviews([]);
      return;
    }
    const numericId = Number(employee.id);
    if (!numericId) {
      setEmpReviews([]);
      return;
    }
    setReviewsLoading(true);
    try {
      const list = await performanceRepository.getReviews({ employeeId: numericId });
      setEmpReviews(list.filter((r) => String(r.employeeId) === String(employee.id)));
    } catch {
      setEmpReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    if (activeTab === 'performance' && employee?.id) {
      void loadEmployeePerformance();
    }
  }, [activeTab, employee?.id, loadEmployeePerformance]);

  useRealtimeTable('performance_reviews', () => {
    if (employee?.id) {
      void loadEmployeePerformance();
    }
  });

  const handleAuditLog = async (action: string, doc: HubDocument, previousValue: string | null = null) => {
    void auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Employee Documents',
      action,
      recordAffectedId: doc.id,
      recordAffectedTitle: doc.title,
      previousValue: previousValue ?? 'None',
      newValue: `${doc.category} ${action.toLowerCase()}`,
      severity: 'Info',
    });
  };

  const handleDownload = async (doc: HubDocument) => {
    setDownloadingDocId(doc.id);
    try {
      await handleAuditLog('Downloaded Document', doc);
      const blob = await documentRepository.downloadEmployeeDocument(employee!.id, doc.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMessage(`Downloaded "${doc.title}".`);
      clearStatus();
    } catch (error: any) {
      setDocsError(error?.message || 'Download failed.');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title.trim() || !uploadForm.file) return;
    setUploading(true);
    try {
      const payload: EmployeeDocumentInput = {
        title: uploadForm.title.trim(),
        description: uploadForm.description || undefined,
        category: uploadForm.category,
        issueDate: uploadForm.issueDate || undefined,
        expiryDate: uploadForm.expiryDate || undefined,
        version: uploadForm.version || '1.0',
      };
      const newDoc = await documentRepository.uploadEmployeeDocument(employee!.id, payload, uploadForm.file);
      await handleAuditLog('Uploaded Employee Document', newDoc);
      setEmployeeDocs((prev) => [newDoc, ...prev]);
      setStatusMessage(`"${newDoc.title}" uploaded successfully.`);
      clearStatus();
      setUploadModalOpen(false);
      setUploadForm({ title: '', category: 'Identification', description: '', issueDate: '', expiryDate: '', version: '1.0' });
    } catch (error: any) {
      setDocsError(error?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleReplaceSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const doc = employeeDocs.find((d) => d.id === replaceDocId);
    if (!doc) return;
    setReplacing(true);
    try {
      const payload: EmployeeDocumentInput = {
        title: doc.title,
        description: doc.description || undefined,
        category: doc.category,
        issueDate: doc.issueDate || undefined,
        expiryDate: doc.expiryDate || undefined,
        version: doc.version,
      };
      const replaced = await documentRepository.replaceEmployeeDocument(employee!.id, doc.id, payload, file);
      await handleAuditLog('Replaced Employee Document', replaced, doc.fileName);
      setEmployeeDocs((prev) => prev.map((d) => (d.id === replaced.id ? replaced : d)));
      setStatusMessage(`"${replaced.title}" replaced successfully.`);
      clearStatus();
    } catch (error: any) {
      setDocsError(error?.message || 'Replace failed.');
    } finally {
      setReplacing(false);
      setReplaceDocId(null);
      if (replaceFileRef.current) replaceFileRef.current.value = '';
    }
  };

  const handleDelete = async (doc: HubDocument) => {
    if (!window.confirm(`Delete "${doc.title}" for ${employee!.fullName}? This cannot be undone.`)) return;
    try {
      await documentRepository.deleteEmployeeDocument(employee!.id, doc.id);
      await handleAuditLog('Deleted Employee Document', doc);
      setEmployeeDocs((prev) => prev.filter((d) => d.id !== doc.id));
      setStatusMessage(`"${doc.title}" deleted.`);
      clearStatus();
    } catch (error: any) {
      setDocsError(error?.message || 'Delete failed.');
    }
  };

  const UploadFormField = ({ label, id, value, onChange, type = 'text', required = true }: {
    label: string;
    id: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
  }) => (
    <div className="space-y-1">
      <label className="text-[10px] text-slate-500 font-medium block">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-[#083E34] focus:border-[#083E34] outline-none transition"
        required={required}
      />
    </div>
  );

  if (!employee) return null;

  const isPCCM = currentRole === 'PCCM_SUPER_ADMIN';
  const isSelf = currentUser.staffId === employee.staffId;
  const isAuthorizedHR = isPCCM || currentRole === 'SYSTEM_ADMIN';

  const handleCopyContact = () => {
    navigator.clipboard?.writeText(`${employee!.fullName} (${employee.phone}, ${employee.email})`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const tabs: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Briefcase },
    { id: 'personal', label: 'Personal Information', icon: Shield },
    { id: 'emergency', label: 'Emergency & Next of Kin', icon: HeartPulse },
    { id: 'qualifications', label: 'Qualifications & Certs', icon: GraduationCap },
    { id: 'payroll', label: 'Benefits & Payroll', icon: CreditCard },
    { id: 'documents', label: 'Documents & Verification', icon: FileText },
    { id: 'leave', label: 'Leave Records', icon: CalendarDays },
    { id: 'attendance', label: 'Attendance & Biometrics', icon: Clock },
    { id: 'performance', label: 'Performance & OKRs', icon: Award },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="bg-[#0A1E3F] text-white p-5 sm:p-6 relative border-b border-blue-900/30 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Close dossier"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Profile Avatar / Photo */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-600 text-white font-black text-2xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0">
                {employee.firstName[0]}
                {employee.lastName[0]}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                    {employee!.fullName}
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono text-[11px] font-bold border border-amber-400/30">
                    {employee.staffId}
                  </span>
                  <Badge
                    variant={
                      employee.status === 'Active'
                        ? 'success'
                        : employee.status === 'On Leave'
                        ? 'warning'
                        : employee.status === 'Probation'
                        ? 'neutral'
                        : 'neutral'
                    }
                  >
                    {employee.status}
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm text-amber-200/90 font-medium mt-1">
                  {employee.jobTitle} • {employee.gradeLevel}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{employee.entityName}</span>
                  </span>
                  <span>•</span>
                  <span>{employee.departmentName}</span>
                </div>
              </div>
            </div>

            {/* Quick Contact & Action Buttons */}
            <div className="flex sm:flex-col items-end gap-2 shrink-0">
              <button
                onClick={handleCopyContact}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-slate-100 text-xs font-semibold border border-white/20 transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-300" />
                <span>{isCopied ? 'Copied Contact!' : 'Share Contact'}</span>
              </button>

              <div className="text-[11px] text-slate-300 font-mono">
                Tenure: {employee.yearsOfService} Years in Citadel
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 flex overflow-x-auto gap-1 shrink-0 custom-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3.5 text-xs font-bold whitespace-nowrap flex items-center gap-2 border-b-2 transition cursor-pointer ${
                  isActive
                    ? 'border-[#083E34] text-[#083E34] bg-white rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-700">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Placement & Service */}
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1.5 border-b border-slate-200 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#C59B27]" />
                  <span>Citadel Placement & Organizational Assignment</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Employment Type</span>
                    <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                      {employee.employmentType}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Contract Status</span>
                    <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                      {employee.contractStatus}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Grade Band</span>
                    <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                      {employee.gradeLevel}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Employment Date</span>
                    <span className="font-semibold text-slate-900 text-xs mt-0.5 block font-mono">
                      {employee.employmentDate}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Confirmation Date</span>
                    <span className="font-semibold text-slate-900 text-xs mt-0.5 block font-mono">
                      {employee.confirmationDate || 'Pending PCCM Review'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Reporting Manager</span>
                    <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                      {employee.managerName || 'Executive / Top-Level (Routes to HR)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Phase 1: Reporting Hierarchy (Upward Chain & Direct Reports) */}
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1.5 border-b border-slate-200 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[#083E34]" />
                  <span>Reporting Hierarchy</span>
                </h3>

                {hierarchyLoading ? (
                  <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#083E34]" />
                    <span>Loading reporting chain and direct reports...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Supervisor Chain (Upward)
                      </span>
                      {hierarchy?.supervisorChain && hierarchy.supervisorChain.length > 0 ? (
                        <div className="space-y-1.5">
                          {hierarchy.supervisorChain.map((sup, idx) => (
                            <div
                              key={sup.id}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-900">{sup.fullName}</span>
                                <span className="text-[10px] text-slate-500 block">{sup.jobTitle}</span>
                              </div>
                              <span className="text-[10px] font-mono text-[#083E34] font-semibold">
                                L{idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Top-level reporting line (no direct supervisor assigned).
                        </p>
                      )}
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#083E34]" />
                        Direct Reports ({hierarchy?.directReports?.length ?? employee.directReportsCount ?? 0})
                      </span>
                      {hierarchy?.directReports && hierarchy.directReports.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {hierarchy.directReports.map((rep) => (
                            <div
                              key={rep.id}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-900">{rep.fullName}</span>
                                <span className="text-[10px] text-slate-500 block">
                                  {rep.jobTitle} · {rep.departmentName || 'Department'}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">{rep.staffId}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No direct reports assigned.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Contact Overview */}
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1.5 border-b border-slate-200 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#C59B27]" />
                  <span>Direct Communication Channels</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Official Citadel Email</span>
                      <a
                        href={`mailto:${employee.email}`}
                        className="font-bold text-[#083E34] hover:underline"
                      >
                        {employee.email}
                      </a>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Official Phone</span>
                      <a
                        href={`tel:${employee.phone}`}
                        className="font-bold text-[#083E34] hover:underline font-mono"
                      >
                        {employee.phone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL INFORMATION */}
          {activeTab === 'personal' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Privacy & Data Governance Notice:</span>
                  Personal identifying fields including residential address and date of birth are protected by the PCCM Privacy Charter. Unmasking actions are recorded in the Citadel audit trail.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Full Name</span>
                  <span className="font-bold text-slate-900 text-sm block">{employee!.fullName}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Gender</span>
                  <span className="font-bold text-slate-900 text-sm block">{employee.gender}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Date of Birth (Sensitive)</span>
                  <SensitiveField
                    id={`sens-dob-${employee!.id}`}
                    value={employee.dateOfBirth}
                    category="dateOfBirth"
                    ownerId={employee!.id}
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Residential Address (Sensitive)</span>
                  <SensitiveField
                    id={`sens-addr-${employee!.id}`}
                    value={employee.address}
                    category="address"
                    ownerId={employee!.id}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMERGENCY & NEXT OF KIN */}
          {activeTab === 'emergency' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Emergency Contact */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-[#083E34] font-bold">
                    <HeartPulse className="w-4 h-4 text-amber-600" />
                    <span>Primary Emergency Contact</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Contact Name</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {employee.emergencyContact.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Relationship</span>
                    <span className="font-medium text-slate-800">
                      {employee.emergencyContact.relationship}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Phone Number</span>
                    <span className="font-mono font-medium text-slate-900">
                      {employee.emergencyContact.phone}
                    </span>
                  </div>
                </div>

                {/* Next of Kin */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-[#083E34] font-bold">
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span>Next of Kin (Confidential)</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Next of Kin Name</span>
                    <SensitiveField
                      id={`sens-nok-name-${employee!.id}`}
                      value={employee.nextOfKin.name}
                      category="nextOfKin"
                      ownerId={employee!.id}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Relationship</span>
                    <span className="font-medium text-slate-800">
                      {employee.nextOfKin.relationship}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Contact Phone</span>
                    <SensitiveField
                      id={`sens-nok-phone-${employee!.id}`}
                      value={employee.nextOfKin.phone}
                      category="nextOfKin"
                      ownerId={employee!.id}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Residential Address</span>
                    <SensitiveField
                      id={`sens-nok-addr-${employee!.id}`}
                      value={employee.nextOfKin.address}
                      category="address"
                      ownerId={employee!.id}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: QUALIFICATIONS & CERTIFICATIONS */}
          {activeTab === 'qualifications' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1.5 border-b border-slate-200 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Academic Qualifications</span>
                </h3>

                <div className="space-y-2.5 mt-3">
                  {employee.qualifications.map((q) => (
                    <div
                      key={q.id}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-xs sm:text-sm">{q.degree}</p>
                        <p className="text-slate-600 mt-0.5">
                          {q.institution} • {q.fieldOfStudy}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200">
                        {q.yearCompleted}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1.5 border-b border-slate-200 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Professional Certifications & Licenses</span>
                </h3>

                <div className="space-y-2.5 mt-3">
                  {employee.certifications.length === 0 ? (
                    <p className="text-slate-400 italic py-2">
                      No external professional certifications filed on record.
                    </p>
                  ) : (
                    employee.certifications.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900 text-xs sm:text-sm">{c.name}</p>
                          <p className="text-slate-600 mt-0.5">{c.issuingBody}</p>
                        </div>
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                          {c.yearObtained}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BENEFITS & PAYROLL (ROLE-RESTRICTED) */}
          {activeTab === 'payroll' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/40 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-[#C59B27] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                      Restricted Payroll & Pension Dossier
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Sensitive financial credentials are strictly restricted to PCCM leadership and authorized audit teams.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                  PCCM PROTECTED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Basic Salary */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Monthly Basic Salary</span>
                  <div className="mt-1">
                    <SensitiveField
                      id={`sens-sal-full-${employee!.id}`}
                      value={
                        employee.bankPayroll.basicSalary
                          ? `₦${employee.bankPayroll.basicSalary.toLocaleString()} ${employee.bankPayroll.currency}`
                          : undefined
                      }
                      category="salary"
                      ownerId={employee!.id}
                    />
                  </div>
                </div>

                {/* Salary Grade */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Salary Grade Level</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-1 block">
                    {employee.bankPayroll.salaryGrade}
                  </span>
                </div>

                {/* Bank Account */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Bank & Account Number</span>
                  <div className="mt-1">
                    <SensitiveField
                      id={`sens-bank-full-${employee!.id}`}
                      value={`${employee.bankPayroll.bankName} - ${employee.bankPayroll.accountNumber}`}
                      category="bank"
                      ownerId={employee!.id}
                    />
                  </div>
                </div>

                {/* BVN */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Bank Verification Number (BVN)</span>
                  <div className="mt-1">
                    <SensitiveField
                      id={`sens-bvn-full-${employee!.id}`}
                      value={employee.bankPayroll.bvn}
                      category="bank"
                      ownerId={employee!.id}
                    />
                  </div>
                </div>

                {/* Pension Details */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Pension Fund Administrator (PFA)</span>
                  <span className="font-semibold text-slate-900 text-sm mt-1 block">
                    {employee.pensionHmo.pfaName}
                  </span>
                </div>

                {/* RSA PIN */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Retirement Savings Account (RSA PIN)</span>
                  <div className="mt-1">
                    <SensitiveField
                      id={`sens-rsa-full-${employee!.id}`}
                      value={employee.pensionHmo.rsaPin}
                      category="pension"
                      ownerId={employee!.id}
                    />
                  </div>
                </div>

                {/* HMO Provider */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">HMO Medical Provider & Tier</span>
                  <span className="font-semibold text-slate-900 text-sm mt-1 block">
                    {employee.pensionHmo.hmoProvider} ({employee.pensionHmo.hmoPlan})
                  </span>
                </div>

                {/* HMO ID */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">HMO Policy Enrollee ID</span>
                  <span className="font-mono font-bold text-slate-800 text-sm mt-1 block">
                    {employee.pensionHmo.hmoIdNumber}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTS & VERIFICATION */}
          {activeTab === 'documents' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                    Employee Personnel Documents
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                    {employeeDocs.length} document{employeeDocs.length === 1 ? '' : 's'} on file
                  </span>
                </div>
                {canManageEmployeeDocs && (
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#083E34] text-white text-xs font-bold hover:bg-[#04241e] transition shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Document
                  </button>
                )}
              </div>

              {docsError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-800 text-xs flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {docsError}
                </div>
              )}

              {docsLoading && employeeDocs.length === 0 ? (
                <div className="h-48 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
              ) : employeeDocs.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 text-xs">
                  <FileText className="w-6 h-6 mb-2 text-slate-300" />
                  <p>No employee documents filed yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {employeeDocs.map((doc) => {
                    const status = documentStatus(doc);
                    const isOwner = doc.uploadedById === currentUser.id || isSelf;
                    return (
                      <div
                        key={doc.id}
                        className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fade-in"
                      >
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">{doc.title}</p>
                            <p className="text-slate-500 text-[10px] font-mono mt-0.5 truncate">
                              {doc.fileName} • {doc.fileSize} • {doc.fileType}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                            {doc.category}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full sm:w-auto">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 block">
                              Issued:{doc.issueDate ? ' ' : ''}
                            </span>
                            <span className="font-mono font-bold text-slate-700 text-[10px] block">
                              {formatDate(doc.issueDate)}
                            </span>
                            <span className="text-[10px] text-slate-400 block ml-0.5">• Expires:</span>
                            <span className="font-mono font-bold text-slate-700 text-[10px] block">
                              {formatDate(doc.expiryDate)}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                            status.variant === 'success'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : status.variant === 'warning'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {status.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            disabled={downloadingDocId === doc.id}
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50 rounded transition disabled:opacity-60"
                            title="Download document"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {(canManageEmployeeDocs || isOwner) && (
                            <button
                              disabled={replacing}
                              onClick={() => {
                                setReplaceDocId(doc.id);
                                if (replaceFileRef.current) replaceFileRef.current.click();
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50/50 rounded transition disabled:opacity-60"
                              title="Replace document"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {canManageEmployeeDocs && (
                            <button
                              onClick={() => handleDelete(doc)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50/50 rounded transition"
                              title="Delete document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <input
                ref={replaceFileRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleReplaceSelect}
              />

              {/* Upload Form */}
              <div
                className={`rounded-xl border p-3.5 animate-fade-in ${
                  uploadModalOpen ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5 cursor-pointer" onClick={() => setUploadModalOpen((o) => !o)}>
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    {uploadModalOpen ? 'Close' : 'Add New Employee Document'}
                  </span>
                  <span className={`text-[10px] ${uploadModalOpen ? 'text-[#083E34]' : 'text-slate-500'}`}>
                    {uploadModalOpen ? 'Hide form' : 'Upload a new personnel document'}
                  </span>
                </div>
                {uploadModalOpen && (
                  <form onSubmit={handleUploadSubmit} className="space-y-3 mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <UploadFormField
                        label="Document Title"
                        id="doc-title"
                        value={uploadForm.title}
                        onChange={(v) => setUploadForm({ ...uploadForm, title: v })}
                      />
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-medium block">Category</label>
                        <select
                          value={uploadForm.category}
                          onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as DocumentCategory })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-[#083E34] focus:border-[#083E34] outline-none transition"
                        >
                          {EMPLOYEE_DOCUMENT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <UploadFormField
                      label="Description"
                      id="doc-description"
                      value={uploadForm.description ?? ''}
                      onChange={(v) => setUploadForm({ ...uploadForm, description: v })}
                      required={false}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <UploadFormField
                        label="Issue Date"
                        id="doc-issue-date"
                        value={uploadForm.issueDate ?? ''}
                        onChange={(v) => setUploadForm({ ...uploadForm, issueDate: v })}
                        type="date"
                        required={false}
                      />
                      <UploadFormField
                        label="Expiry Date"
                        id="doc-expiry-date"
                        value={uploadForm.expiryDate ?? ''}
                        onChange={(v) => setUploadForm({ ...uploadForm, expiryDate: v })}
                        type="date"
                        required={false}
                      />
                      <UploadFormField
                        label="Version"
                        id="doc-version"
                        value={uploadForm.version ?? '1.0'}
                        onChange={(v) => setUploadForm({ ...uploadForm, version: v })}
                        required={false}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-medium block">Document File</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] })}
                        className="w-full block text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#083E34] file:text-white hover:file:bg-[#04241e] cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadModalOpen(false);
                          setUploadForm({ title: '', category: 'Identification', description: '', issueDate: '', expiryDate: '', version: '1.0' });
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-100 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={uploading || !uploadForm.title.trim() || !uploadForm.file}
                        className={`px-3 py-1.5 rounded-xl ${uploading || (!uploadForm.title.trim() && !uploadForm.file) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#C59B27] text-white hover:bg-[#a0801f]'} text-xs font-bold transition disabled:opacity-60`}
                      >
                        {uploading ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : ''} Upload Document
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {statusMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fade-in">
                  <span>{statusMessage}</span>
                  <button
                    onClick={() => setStatusMessage(null)}
                    className="p-1 text-emerald-500 hover:text-emerald-700 rounded"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: LEAVE */}
          {activeTab === 'leave' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                  <span className="text-[10px] text-indigo-700 font-bold block">Annual Leave</span>
                  <div className="text-xl font-bold text-indigo-900 mt-1">18 / 21</div>
                  <span className="text-[10px] text-indigo-600">Days Remaining</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                  <span className="text-[10px] text-emerald-700 font-bold block">Casual Leave</span>
                  <div className="text-xl font-bold text-emerald-900 mt-1">3 / 5</div>
                  <span className="text-[10px] text-emerald-600">Days Remaining</span>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
                  <span className="text-[10px] text-amber-700 font-bold block">Sick Leave</span>
                  <div className="text-xl font-bold text-amber-900 mt-1">10 / 12</div>
                  <span className="text-[10px] text-amber-600">Days Remaining</span>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100 text-center">
                  <span className="text-[10px] text-purple-700 font-bold block">Compassionate</span>
                  <div className="text-xl font-bold text-purple-900 mt-1">3 / 3</div>
                  <span className="text-[10px] text-purple-600">Days Remaining</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1.5 border-b border-slate-200">
                  Recent Leave Applications
                </h4>
                <div className="space-y-2 mt-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">Annual Leave (10 Days)</p>
                      <p className="text-[10px] text-slate-500 font-mono">10 Aug 2026 - 20 Aug 2026</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Approved & Completed
                    </span>
                  </div>
                </div>
              </div>

              {onNavigateLeave && (
                <button
                  onClick={onNavigateLeave}
                  className="w-full py-2.5 rounded-xl bg-[#083E34] text-amber-300 font-bold text-xs hover:bg-[#062f28] transition text-center cursor-pointer shadow-xs active:scale-95"
                >
                  Manage Leave Requests in Leave Module →
                </button>
              )}
            </div>
          )}

          {/* TAB 8: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                  <span className="text-[10px] text-emerald-700 font-bold block">Punctuality Rate</span>
                  <div className="text-xl font-bold text-emerald-900 mt-1">98.4%</div>
                  <span className="text-[10px] text-emerald-600">On-time check-in</span>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
                  <span className="text-[10px] text-amber-700 font-bold block">Late Instances</span>
                  <div className="text-xl font-bold text-amber-900 mt-1">1</div>
                  <span className="text-[10px] text-amber-600">This Quarter</span>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-center">
                  <span className="text-[10px] text-blue-700 font-bold block">Registered Device</span>
                  <div className="text-sm font-bold text-blue-900 mt-2 font-mono">ZKTeco Gate #1</div>
                  <span className="text-[10px] text-blue-600">Biometric Verified</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1 border-b border-slate-200">
                  Recent Biometric Clock-Ins
                </h4>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex justify-between">
                    <span className="font-medium text-slate-800">Today, 18 Sep 2026</span>
                    <span className="font-mono text-emerald-700 font-bold">07:54 AM (Gatehouse 1)</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="font-medium text-slate-800">Yesterday, 17 Sep 2026</span>
                    <span className="font-mono text-emerald-700 font-bold">07:58 AM (Gatehouse 1)</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="font-medium text-slate-800">Wednesday, 16 Sep 2026</span>
                    <span className="font-mono text-emerald-700 font-bold">07:49 AM (Gatehouse 1)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: PERFORMANCE */}
          {activeTab === 'performance' && (
            <div className="space-y-6 animate-fade-in">
              {(() => {
                const latestScored = empReviews.find((r) => r.finalRating !== null && r.finalRating !== undefined) || empReviews[0];
                const scoreVal = latestScored?.finalRating !== null && latestScored?.finalRating !== undefined
                  ? Number(latestScored.finalRating)
                  : null;
                const bandLabel =
                  scoreVal === null
                    ? latestScored
                      ? 'Pending Evaluation'
                      : 'No Appraisals Yet'
                    : scoreVal >= 4.5
                    ? 'Exceeds Expectations'
                    : scoreVal >= 3.5
                    ? 'Strong Performance'
                    : scoreVal >= 2.5
                    ? 'Meets Expectations'
                    : 'Needs Development';

                return (
                  <>
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
                          Latest PCCM Performance Calibration
                        </span>
                        {reviewsLoading ? (
                          <p className="text-xs text-slate-600 mt-1">Loading appraisal records...</p>
                        ) : (
                          <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2 flex-wrap">
                            <span>{scoreVal !== null ? scoreVal.toFixed(2) : '—'}</span>
                            <span className="text-xs font-semibold text-slate-500">/ 5.0</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-bold">
                              {bandLabel}
                            </span>
                            {latestScored && (
                              <span className="text-[11px] font-semibold text-slate-600">
                                ({latestScored.status} • {latestScored.reviewPeriodStart} – {latestScored.reviewPeriodEnd})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <Award className="w-10 h-10 text-amber-600 shrink-0" />
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1 border-b border-slate-200">
                        Weighted KPI Breakdown &amp; Appraisal History
                      </h4>
                      {latestScored?.ratings && latestScored.ratings.length > 0 ? (
                        latestScored.ratings.map((rating, idx) => {
                          const rVal = Number(rating.rating ?? 0);
                          const pct = rVal > 0 ? Math.min(100, Math.round((rVal / 5) * 100)) : 0;
                          return (
                            <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                              <div className="flex justify-between gap-2 text-xs">
                                <span className="font-semibold text-slate-800">
                                  {idx + 1}. {rating.kpiTitle} ({Number(rating.weight ?? 0)}%)
                                </span>
                                <span className="font-mono font-bold text-emerald-700 shrink-0">
                                  {rVal > 0 ? `${rVal.toFixed(1)} / 5.0` : 'Pending'}
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              {rating.comment && (
                                <p className="text-[11px] text-slate-600 italic">"{rating.comment}"</p>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                          No scored KPI deliverables recorded for {employee.fullName} yet.
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 font-mono">
            Citadel Personnel Master Record • Staff ID: {employee.staffId}
          </div>

          <div className="flex items-center gap-2">
            {(permissions.canManageEmployees || isAuthorizedHR) && onEdit && (
              <button
                onClick={() => onEdit(employee)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Edit Records
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#D4AF37] text-slate-950 rounded-xl text-xs font-bold hover:bg-[#C59B27] transition cursor-pointer shadow-xs active:scale-95"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
