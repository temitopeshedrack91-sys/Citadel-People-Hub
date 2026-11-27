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
import { Employee, EmployeeHierarchy, DocumentCategory, HubDocument, PerformanceReview, LeaveBalanceRecord, LeaveRequest, AttendanceRecord, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { SensitiveField } from '../common/SensitiveField';
import { Badge } from '../common/Badge';
import {
  documentRepository,
  auditRepository,
  employeeRepository,
  performanceRepository,
  leaveRepository,
  attendanceRepository,
  governanceRepository,
} from '../../services';
import { EmployeeDocumentInput } from '../../types/documents';
import { isSafeImageUrl } from '../../utils/orgHelpers';
import {
  applyApprovedChangeRequest,
  createProfileChangeRequest,
  mapAppRoleToWorkbookRole,
} from '../../domain/workbook';

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
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hierarchy, setHierarchy] = useState<EmployeeHierarchy | null>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [empReviews, setEmpReviews] = useState<PerformanceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [empBalances, setEmpBalances] = useState<LeaveBalanceRecord[]>([]);
  const [empLeaves, setEmpLeaves] = useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [empAttendance, setEmpAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const replaceFileRef = useRef<HTMLInputElement>(null);

  // Employee self-service profile change request state (Sheet 5)
  const [selfEditOpen, setSelfEditOpen] = useState(false);
  const [selfPhone, setSelfPhone] = useState('');
  const [selfEmail, setSelfEmail] = useState('');
  const [selfAddress, setSelfAddress] = useState('');
  const [selfDob, setSelfDob] = useState('');
  const [selfGender, setSelfGender] = useState<'Male' | 'Female'>('Male');
  const [selfPhoto, setSelfPhoto] = useState('');
  const [selfEcName, setSelfEcName] = useState('');
  const [selfEcRel, setSelfEcRel] = useState('');
  const [selfEcPhone, setSelfEcPhone] = useState('');
  const [selfNokName, setSelfNokName] = useState('');
  const [selfNokRel, setSelfNokRel] = useState('');
  const [selfNokPhone, setSelfNokPhone] = useState('');
  const [selfNokAddr, setSelfNokAddr] = useState('');
  const [selfReason, setSelfReason] = useState('');
  const [selfSubmitting, setSelfSubmitting] = useState(false);
  const [selfFeedback, setSelfFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const isSelfActor = Boolean(
    employee &&
      ((employee.staffId && currentUser.staffId === employee.staffId) ||
        String(currentUser.employeeId || currentUser.id) === String(employee.id))
  );

  const canManageEmployeeDocs = permissions.canManageDocuments || isSelfActor;

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

  useEffect(() => {
    if (!employee) return;
    setSelfPhone(employee.phone || '');
    setSelfEmail(employee.email || '');
    setSelfAddress(employee.address || '');
    setSelfDob(employee.dateOfBirth || '');
    setSelfGender(employee.gender === 'Female' ? 'Female' : 'Male');
    setSelfPhoto(employee.profilePhoto || '');
    setSelfEcName(employee.emergencyContact?.name || '');
    setSelfEcRel(employee.emergencyContact?.relationship || '');
    setSelfEcPhone(employee.emergencyContact?.phone || '');
    setSelfNokName(employee.nextOfKin?.name || '');
    setSelfNokRel(employee.nextOfKin?.relationship || '');
    setSelfNokPhone(employee.nextOfKin?.phone || '');
    setSelfNokAddr(employee.nextOfKin?.address || '');
    setSelfReason('');
    setSelfFeedback(null);
    setSelfEditOpen(false);
    setConfirmDeleteDocId(null);
  }, [employee]);

  const loadEmployeePerformance = useCallback(async () => {
    if (!employee?.id) {
      setEmpReviews([]);
      return;
    }
    setReviewsLoading(true);
    try {
      const numericId = Number(employee.id);
      const list = await performanceRepository.getReviews(
        Number.isFinite(numericId) && numericId > 0 ? { employeeId: numericId } : undefined
      );
      setEmpReviews(
        list.filter(
          (r) =>
            String(r.employeeId) === String(employee.id) ||
            (employee.staffId && r.employeeStaffId === employee.staffId) ||
            (r.employeeName && r.employeeName.toLowerCase() === employee.fullName.toLowerCase())
        )
      );
    } catch {
      setEmpReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [employee?.id, employee?.staffId, employee?.fullName]);

  const loadEmployeeLeave = useCallback(async () => {
    if (!employee?.id) {
      setEmpBalances([]);
      setEmpLeaves([]);
      return;
    }
    setLeaveLoading(true);
    try {
      const [balData, reqData] = await Promise.all([
        leaveRepository.getBalances(String(employee.id)).catch(() => [] as LeaveBalanceRecord[]),
        leaveRepository.getByEmployee(String(employee.id)).catch(() => [] as LeaveRequest[]),
      ]);
      setEmpBalances(balData);
      setEmpLeaves(reqData);
    } catch {
      setEmpBalances([]);
      setEmpLeaves([]);
    } finally {
      setLeaveLoading(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    if (activeTab === 'performance' && employee?.id) {
      void loadEmployeePerformance();
    }
    if (activeTab === 'leave' && employee?.id) {
      void loadEmployeeLeave();
    }
  }, [activeTab, employee?.id, loadEmployeePerformance, loadEmployeeLeave]);

  useEffect(() => {
    if (activeTab !== 'leave' || !employee?.id) return;
    let cancelled = false;
    setLeaveLoading(true);
    Promise.all([
      leaveRepository.getBalances(employee.id).catch(() => [] as LeaveBalanceRecord[]),
      leaveRepository.getByEmployee(employee.id).catch(() => [] as LeaveRequest[]),
    ])
      .then(([bals, lvs]) => {
        if (cancelled) return;
        setEmpBalances(bals.filter((b) => String(b.employee_id) === String(employee.id) || (employee.staffId && b.employee?.staff_id === employee.staffId)));
        setEmpLeaves(lvs);
      })
      .finally(() => {
        if (!cancelled) setLeaveLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, employee?.id, employee?.staffId]);

  useEffect(() => {
    if (activeTab !== 'attendance' || !employee?.id) return;
    let cancelled = false;
    setAttendanceLoading(true);
    attendanceRepository
      .getRecentLogs(50)
      .then((logs) => {
        if (cancelled) return;
        setEmpAttendance(
          logs.filter(
            (r) =>
              String(r.employeeId) === String(employee.id) ||
              (employee.staffId && r.employeeStaffId === employee.staffId)
          )
        );
      })
      .catch(() => {
        if (!cancelled) setEmpAttendance([]);
      })
      .finally(() => {
        if (!cancelled) setAttendanceLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, employee?.id, employee?.staffId]);

  useRealtimeTable('performance_reviews', () => {
    if (employee?.id) {
      void loadEmployeePerformance();
    }
  });

  useRealtimeTable('leave_requests', () => {
    if (employee?.id) {
      void loadEmployeeLeave();
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
    try {
      await documentRepository.deleteEmployeeDocument(employee!.id, doc.id);
      await handleAuditLog('Deleted Employee Document', doc);
      setEmployeeDocs((prev) => prev.filter((d) => d.id !== doc.id));
      setConfirmDeleteDocId(null);
      setStatusMessage(`"${doc.title}" deleted.`);
      clearStatus();
    } catch (error: any) {
      setDocsError(error?.message || 'Delete failed.');
    }
  };

  const handleSelfUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setSelfFeedback(null);

    const proposedChanges: Record<string, string> = {};
    if (selfPhone.trim() && selfPhone.trim() !== (employee.phone || '')) {
      proposedChanges.phone = selfPhone.trim();
    }
    if (selfEmail.trim() && selfEmail.trim() !== (employee.email || '')) {
      proposedChanges.email = selfEmail.trim();
    }
    if (selfAddress.trim() && selfAddress.trim() !== (employee.address || '')) {
      proposedChanges.address = selfAddress.trim();
    }
    if (selfDob.trim() && selfDob.trim() !== (employee.dateOfBirth || '')) {
      proposedChanges.dateOfBirth = selfDob.trim();
    }
    if (selfGender !== employee.gender) {
      proposedChanges.gender = selfGender;
    }
    if (selfPhoto.trim() !== (employee.profilePhoto || '')) {
      if (selfPhoto.trim() && !isSafeImageUrl(selfPhoto.trim())) {
        setSelfFeedback({
          type: 'error',
          text: 'Profile photo must be a valid https:// URL or uploaded image.',
        });
        return;
      }
      proposedChanges.profilePhoto = selfPhoto.trim();
    }

    const nextEc = `${selfEcName.trim()} | ${selfEcRel.trim()} | ${selfEcPhone.trim()}`;
    const prevEc = `${employee.emergencyContact?.name || ''} | ${employee.emergencyContact?.relationship || ''} | ${employee.emergencyContact?.phone || ''}`;
    if (selfEcPhone.trim() && nextEc !== prevEc) {
      proposedChanges.emergencyContact = nextEc;
    }

    const nextNok = `${selfNokName.trim()} | ${selfNokRel.trim()} | ${selfNokPhone.trim()} | ${selfNokAddr.trim()}`;
    const prevNok = `${employee.nextOfKin?.name || ''} | ${employee.nextOfKin?.relationship || ''} | ${employee.nextOfKin?.phone || ''} | ${employee.nextOfKin?.address || ''}`;
    if (selfNokName.trim() && nextNok !== prevNok) {
      proposedChanges.nextOfKin = nextNok;
    }

    if (Object.keys(proposedChanges).length === 0) {
      setSelfFeedback({
        type: 'error',
        text: 'Modify at least one personal field before submitting an update request.',
      });
      return;
    }

    setSelfSubmitting(true);
    try {
      const workbookRole = mapAppRoleToWorkbookRole(currentRole);
      const request = createProfileChangeRequest({
        employee,
        actorRole: workbookRole,
        actorName: currentUser.name,
        proposedChanges,
        reason: selfReason.trim() || 'Employee self-service bio-data update',
      });
      const persisted = await governanceRepository.createProfileChangeRequest(request);

      if (persisted.status === 'APPROVED') {
        const patched = applyApprovedChangeRequest(employee, persisted);
        await employeeRepository.update(employee.id, patched);
      }

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Employee Master',
        action:
          persisted.status === 'PENDING_HR_APPROVAL'
            ? 'Submitted Self-Service Profile Update Request'
            : 'Updated Personal Profile Record',
        recordAffectedId: employee.id,
        recordAffectedTitle: `${employee.fullName} (${employee.staffId})`,
        previousValue: Object.keys(proposedChanges).join(', '),
        newValue: persisted.status,
        severity: 'Info',
      });

      window.dispatchEvent(new CustomEvent('citadel:profile-change-updated'));
      setSelfReason('');
      setSelfEditOpen(false);
      setSelfFeedback({
        type: 'success',
        text:
          persisted.status === 'PENDING_HR_APPROVAL'
            ? 'Your personal information update has been submitted for HR approval (Sheet 5). Your authoritative record will update once HR approves.'
            : 'Personal information updated directly on the authoritative HR record.',
      });
    } catch (err: any) {
      setSelfFeedback({
        type: 'error',
        text: err?.message || 'Unable to submit personal information update.',
      });
    } finally {
      setSelfSubmitting(false);
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
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-[#174EA6] focus:border-[#174EA6] outline-none transition"
        required={required}
      />
    </div>
  );

  if (!employee) return null;

  const isPCCM = currentRole === 'PCCM_SUPER_ADMIN';
  const isSelf = isSelfActor;
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Employee Dossier — ${employee.fullName}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in"
    >
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="bg-[#174EA6] text-white p-5 sm:p-6 relative border-b border-[#BFDBFE] shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close employee dossier"
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Close dossier"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Profile Avatar / Photo */}
              {isSafeImageUrl(employee.profilePhoto) ? (
                <img
                  src={employee.profilePhoto}
                  alt={employee.fullName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-lg border-2 border-white/25 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#B88A24] text-white font-black text-2xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0">
                  {employee.firstName[0]}
                  {employee.lastName[0]}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                    {employee!.fullName}
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-[#B88A24] text-[#D4AF37] font-mono text-[11px] font-bold border border-[#E9D59A]">
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

                <p className="text-xs sm:text-sm text-[#D4AF37] font-medium mt-1">
                  {employee.jobTitle} • {employee.gradeLevel}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{employee.entityName}</span>
                  </span>
                  <span>•</span>
                  <span>{employee.departmentName}</span>
                </div>
              </div>
            </div>

            {/* Quick Contact & Action Buttons */}
            <div className="flex sm:flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {isSelf && (
                  <button
                    type="button"
                    data-testid="request-self-service-update-btn"
                    onClick={() => {
                      setActiveTab('personal');
                      setSelfEditOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 text-xs font-bold border border-[#C59B27] transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Request Info Update</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyContact}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-slate-100 text-xs font-semibold border border-white/20 transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{isCopied ? 'Copied Contact!' : 'Share Contact'}</span>
                </button>
              </div>

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
                    ? 'border-[#174EA6] text-[#174EA6] bg-white rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#B88A24]' : 'text-slate-400'}`} />
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
                  <GitBranch className="w-4 h-4 text-[#174EA6]" />
                  <span>Reporting Hierarchy</span>
                </h3>

                {hierarchyLoading ? (
                  <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#174EA6]" />
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
                              <span className="text-[10px] font-mono text-[#174EA6] font-semibold">
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
                        <Users className="w-3.5 h-3.5 text-[#174EA6]" />
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
                    <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#174EA6]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Official Citadel Email</span>
                      <a
                        href={`mailto:${employee.email}`}
                        className="font-bold text-[#174EA6] hover:underline"
                      >
                        {employee.email}
                      </a>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#174EA6]">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Official Phone</span>
                      <a
                        href={`tel:${employee.phone}`}
                        className="font-bold text-[#174EA6] hover:underline font-mono"
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
              <div className="p-3.5 rounded-xl bg-[#FAF5EB] border border-[#E9D59A] text-[#B88A24] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Privacy & Data Governance Notice:</span>
                    Personal identifying fields including residential address and date of birth are protected by the PCCM Privacy Charter. Unmasking actions are recorded in the Citadel audit trail.
                  </div>
                </div>
                {isSelf && (
                  <button
                    type="button"
                    data-testid="dossier-request-profile-update-btn"
                    onClick={() => setSelfEditOpen((prev) => !prev)}
                    className="px-3 py-1.5 rounded-lg bg-[#174EA6] text-white hover:bg-[#0B1F3A] text-xs font-semibold shrink-0 transition cursor-pointer"
                  >
                    {selfEditOpen ? 'Close Update Form' : 'Request Profile Update'}
                  </button>
                )}
              </div>

              {selfFeedback && (
                <div
                  role={selfFeedback.type === 'error' ? 'alert' : 'status'}
                  data-testid="dossier-self-update-feedback"
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    selfFeedback.type === 'success'
                      ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#174EA6]'
                      : 'bg-[#F5F7FA] border-[#111827]/25 text-[#111827]'
                  }`}
                >
                  {selfFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#174EA6] shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#111827] shrink-0" />
                  )}
                  <span>{selfFeedback.text}</span>
                </div>
              )}

              {isSelf && selfEditOpen && (
                <form
                  onSubmit={handleSelfUpdateSubmit}
                  data-testid="dossier-self-update-form"
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Submit Personal Information Update (HR Approval Required)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Only employee-permitted Sheet 5 personal fields are editable here. Protected changes wait for HR sign-off before replacing authoritative records.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={selfPhone}
                        onChange={(e) => setSelfPhone(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Email Address</label>
                      <input
                        type="email"
                        value={selfEmail}
                        onChange={(e) => setSelfEmail(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={selfDob}
                        onChange={(e) => setSelfDob(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Gender</label>
                      <select
                        value={selfGender}
                        onChange={(e) => setSelfGender(e.target.value as 'Male' | 'Female')}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Residential Address</label>
                      <input
                        type="text"
                        value={selfAddress}
                        onChange={(e) => setSelfAddress(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Profile Photo URL (https://)</label>
                      <input
                        type="url"
                        value={selfPhoto}
                        onChange={(e) => setSelfPhoto(e.target.value)}
                        placeholder="https://example.org/photo.jpg"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Emergency Contact Name</label>
                      <input
                        type="text"
                        value={selfEcName}
                        onChange={(e) => setSelfEcName(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Relationship</label>
                      <input
                        type="text"
                        value={selfEcRel}
                        onChange={(e) => setSelfEcRel(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Emergency Phone</label>
                      <input
                        type="tel"
                        value={selfEcPhone}
                        onChange={(e) => setSelfEcPhone(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Next of Kin Name</label>
                      <input
                        type="text"
                        value={selfNokName}
                        onChange={(e) => setSelfNokName(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Next of Kin Relationship</label>
                      <input
                        type="text"
                        value={selfNokRel}
                        onChange={(e) => setSelfNokRel(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Next of Kin Phone</label>
                      <input
                        type="tel"
                        value={selfNokPhone}
                        onChange={(e) => setSelfNokPhone(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Next of Kin Address</label>
                      <input
                        type="text"
                        value={selfNokAddr}
                        onChange={(e) => setSelfNokAddr(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Reason for Change *</label>
                    <input
                      type="text"
                      required
                      value={selfReason}
                      onChange={(e) => setSelfReason(e.target.value)}
                      placeholder="e.g. Relocated residential address / updated phone number"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#174EA6]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelfEditOpen(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={selfSubmitting}
                      className="px-4 py-1.5 rounded-lg bg-[#D4AF37] text-slate-950 hover:bg-[#C59B27] text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {selfSubmitting ? 'Submitting...' : 'Submit for HR Approval'}
                    </button>
                  </div>
                </form>
              )}

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
                    ownerStaffId={employee.staffId}
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Residential Address (Sensitive)</span>
                  <SensitiveField
                    id={`sens-addr-${employee!.id}`}
                    value={employee.address}
                    category="address"
                    ownerId={employee!.id}
                    ownerStaffId={employee.staffId}
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
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-[#174EA6] font-bold">
                    <HeartPulse className="w-4 h-4 text-[#B88A24]" />
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
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-[#174EA6] font-bold">
                    <Shield className="w-4 h-4 text-[#B88A24]" />
                    <span>Next of Kin (Confidential)</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Next of Kin Name</span>
                    <SensitiveField
                      id={`sens-nok-name-${employee!.id}`}
                      value={employee.nextOfKin.name}
                      category="nextOfKin"
                      ownerId={employee!.id}
                      ownerStaffId={employee.staffId}
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
                      ownerStaffId={employee.staffId}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Residential Address</span>
                    <SensitiveField
                      id={`sens-nok-addr-${employee!.id}`}
                      value={employee.nextOfKin.address}
                      category="address"
                      ownerId={employee!.id}
                      ownerStaffId={employee.staffId}
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
                  <GraduationCap className="w-4 h-4 text-[#174EA6]" />
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
                  <Award className="w-4 h-4 text-[#174EA6]" />
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
                        <span className="font-mono font-bold text-[#174EA6] bg-[#EFF6FF] px-2.5 py-1 rounded border border-[#BFDBFE]">
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
              <div className="p-4 rounded-xl bg-[#B88A24] border border-[#E9D59A] flex items-start justify-between">
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
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FAF5EB] text-[#B88A24] border border-[#E9D59A] shrink-0">
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
                      ownerStaffId={employee.staffId}
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
                      ownerStaffId={employee.staffId}
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
                      ownerStaffId={employee.staffId}
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
                      ownerStaffId={employee.staffId}
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#174EA6] text-white text-xs font-bold hover:bg-[#0B1F3A] transition shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Document
                  </button>
                )}
              </div>

              {docsError && (
                <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#111827]/25 text-[#111827] text-xs flex items-center gap-2 animate-fade-in">
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
                          <div className="p-1.5 rounded-lg bg-[#FAF5EB] text-[#B88A24] shrink-0">
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
                              ? 'bg-[#EFF6FF] text-[#174EA6] border border-[#BFDBFE]'
                              : status.variant === 'warning'
                              ? 'bg-[#FAF5EB] text-[#B88A24] border border-[#E9D59A]'
                              : 'bg-[#F5F7FA] text-[#111827] border border-[#111827]/25'
                          }`}>
                            {status.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            disabled={downloadingDocId === doc.id}
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 text-slate-500 hover:text-[#174EA6] hover:bg-[#EFF6FF] rounded transition disabled:opacity-60"
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
                              className="p-1.5 text-slate-500 hover:text-[#B88A24] hover:bg-[#FAF5EB] rounded transition disabled:opacity-60"
                              title="Replace document"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {canManageEmployeeDocs && (
                            confirmDeleteDocId === doc.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(doc)}
                                  className="px-2 py-1 rounded bg-[#111827] text-white text-[10px] font-bold hover:bg-[#111827] cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteDocId(null)}
                                  className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 text-[10px] font-semibold hover:bg-slate-100 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteDocId(doc.id)}
                                className="p-1.5 text-slate-500 hover:text-[#111827] hover:bg-[#F5F7FA] rounded transition cursor-pointer"
                                title="Delete document"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
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
                  uploadModalOpen ? 'bg-[#FAF5EB] border-[#E9D59A]' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5 cursor-pointer" onClick={() => setUploadModalOpen((o) => !o)}>
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    {uploadModalOpen ? 'Close' : 'Add New Employee Document'}
                  </span>
                  <span className={`text-[10px] ${uploadModalOpen ? 'text-[#174EA6]' : 'text-slate-500'}`}>
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
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-[#174EA6] focus:border-[#174EA6] outline-none transition"
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
                        className="w-full block text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#174EA6] file:text-white hover:file:bg-[#0B1F3A] cursor-pointer"
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
                <div className="p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#174EA6] text-xs flex items-center justify-between animate-fade-in">
                  <span>{statusMessage}</span>
                  <button
                    onClick={() => setStatusMessage(null)}
                    className="p-1 text-[#174EA6] hover:text-[#174EA6] rounded"
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
              {leaveLoading ? (
                <p className="text-xs text-slate-500 py-4 text-center">Loading leave balances &amp; history...</p>
              ) : (
                <>
                  {empBalances.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                      {empBalances.slice(0, 4).map((bal) => (
                        <div key={String(bal.id)} className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]/60 text-center">
                          <span className="text-[11px] text-[#174EA6] font-semibold block truncate">
                            {bal.category?.name || 'Leave Quota'}
                          </span>
                          <div className="text-xl font-bold text-[#0B1F3A] mt-1">
                            {Number(bal.remaining_days)} / {Number(bal.total_days)}
                          </div>
                          <span className="text-[11px] text-[#174EA6]/80">Days Remaining</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                      No leave balance allocations recorded for this staff member.
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-xs pb-1.5 border-b border-slate-200">
                      Recent Leave Applications ({empLeaves.length})
                    </h4>
                    {empLeaves.length > 0 ? (
                      <div className="space-y-2 mt-3">
                        {empLeaves.slice(0, 5).map((lv) => (
                          <div key={lv.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-800">{lv.leaveType} ({lv.totalDays} Days)</p>
                              <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                                {lv.startDate} → {lv.endDate}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                lv.status === 'Approved'
                                  ? 'text-[#174EA6] bg-[#EFF6FF] border-[#BFDBFE]'
                                  : lv.status === 'Rejected'
                                  ? 'text-[#111827] bg-[#F5F7FA] border-[#111827]/25'
                                  : 'text-[#B88A24] bg-[#FAF5EB] border-[#E9D59A]'
                              }`}
                            >
                              {lv.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-3">No leave requests submitted by this employee.</p>
                    )}
                  </div>
                </>
              )}

              {onNavigateLeave && (
                <button
                  type="button"
                  onClick={onNavigateLeave}
                  className="w-full py-2.5 rounded-xl bg-[#174EA6] text-[#D4AF37] font-semibold text-xs hover:bg-[#062f28] transition text-center cursor-pointer shadow-2xs"
                >
                  Manage Leave Requests in Leave Module →
                </button>
              )}
            </div>
          )}

          {/* TAB 8: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-fade-in">
              {attendanceLoading ? (
                <p className="text-xs text-slate-500 py-4 text-center">Loading attendance telemetry...</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 tabular-nums">
                    <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-center">
                      <span className="text-[11px] text-[#174EA6] font-semibold block">Total Logs</span>
                      <div className="text-xl font-bold text-[#174EA6] mt-1">{empAttendance.length}</div>
                      <span className="text-[10px] text-[#174EA6]">Recorded punches</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FAF5EB] border border-[#E9D59A] text-center">
                      <span className="text-[11px] text-[#B88A24] font-semibold block">Late Instances</span>
                      <div className="text-xl font-bold text-[#B88A24] mt-1">
                        {empAttendance.filter((r) => r.status === 'Late').length}
                      </div>
                      <span className="text-[10px] text-[#B88A24]">In window</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]/60 text-center">
                      <span className="text-[11px] text-[#174EA6] font-semibold block">Device ID</span>
                      <div className="text-sm font-bold text-[#0B1F3A] mt-2 font-mono">
                        {employee.biometricDeviceId || 'Web / Unassigned'}
                      </div>
                      <span className="text-[10px] text-[#174EA6]/80">Verification Profile</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-xs pb-1 border-b border-slate-200">
                      Recent Attendance Clock-Ins
                    </h4>
                    {empAttendance.length > 0 ? (
                      <div className="divide-y divide-slate-100 text-xs">
                        {empAttendance.slice(0, 6).map((rec) => (
                          <div key={rec.id} className="py-2 flex justify-between gap-2 tabular-nums">
                            <span className="font-medium text-slate-800">{rec.date}</span>
                            <span className="font-mono text-[#174EA6] font-semibold">
                              {rec.clockInTime || 'Logged'} · {rec.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-3">
                        No recent clock-in logs recorded for this staff member.
                      </p>
                    )}
                  </div>
                </>
              )}
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
                    <div className="p-4 bg-[#FAF5EB] rounded-xl border border-[#E9D59A] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#B88A24] font-bold uppercase tracking-wider block">
                          Latest PCCM Performance Calibration
                        </span>
                        {reviewsLoading ? (
                          <p className="text-xs text-slate-600 mt-1">Loading appraisal records...</p>
                        ) : (
                          <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2 flex-wrap">
                            <span>{scoreVal !== null ? scoreVal.toFixed(2) : '—'}</span>
                            <span className="text-xs font-semibold text-slate-500">/ 5.0</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-[#B88A24] text-slate-950 font-bold">
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
                      <Award className="w-10 h-10 text-[#B88A24] shrink-0" />
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
                                <span className="font-mono font-bold text-[#174EA6] shrink-0">
                                  {rVal > 0 ? `${rVal.toFixed(1)} / 5.0` : 'Pending'}
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-[#174EA6] rounded-full" style={{ width: `${pct}%` }} />
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
            {isSelf && !isAuthorizedHR && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('personal');
                  setSelfEditOpen(true);
                }}
                className="px-4 py-2 border border-[#BFDBFE] bg-[#EFF6FF] text-[#174EA6] rounded-xl text-xs font-semibold hover:bg-[#DBEAFE] transition cursor-pointer"
              >
                Update Personal Info
              </button>
            )}
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
