import React, { useState } from 'react';
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
} from 'lucide-react';
import { Employee, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SensitiveField } from '../common/SensitiveField';
import { Badge } from '../common/Badge';
import { auditRepository } from '../../services';
import { CitadelLogo } from '../brand/CitadelLogo';

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
  const { currentUser, currentRole, canViewSensitiveData } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isCopied, setIsCopied] = useState(false);

  if (!employee) return null;

  const isPCCM = currentRole === 'PCCM_SUPER_ADMIN';
  const isSelf = currentUser.staffId === employee.staffId;
  const isAuthorizedHR = isPCCM || currentRole === 'SYSTEM_ADMIN';

  const handleCopyContact = () => {
    navigator.clipboard?.writeText(`${employee.fullName} (${employee.phone}, ${employee.email})`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061328]/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Top Header (Dignified Navy & Gold Banner) */}
        <div className="bg-[#0A1E3F] text-white p-5 sm:p-6 relative border-b border-amber-500/20 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            title="Close dossier"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Profile Avatar / Photo */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#C59B27] to-[#A67F1A] text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0">
                {employee.firstName[0]}
                {employee.lastName[0]}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold font-serif text-white tracking-wide">
                    {employee.fullName}
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
                    <Building2 className="w-3.5 h-3.5 text-[#C59B27]" />
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
                className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-[#C59B27]" />
                <span>{isCopied ? 'Copied Contact!' : 'Share Contact'}</span>
              </button>

              <div className="text-[11px] text-slate-400 font-mono">
                Tenure: {employee.yearsOfService} Years in Citadel
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 flex overflow-x-auto gap-1 shrink-0 scrollbar-thin">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3.5 text-xs font-semibold whitespace-nowrap flex items-center gap-2 border-b-2 transition ${
                  isActive
                    ? 'border-[#0A1E3F] text-[#0A1E3F] bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#C59B27]' : 'text-slate-400'}`} />
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
                      {employee.managerName || 'PCCM Super Admin'}
                    </span>
                  </div>
                </div>
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
                        className="font-semibold text-[#0A1E3F] hover:underline"
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
                        className="font-semibold text-[#0A1E3F] hover:underline font-mono"
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
                  <span className="font-bold text-slate-900 text-sm block">{employee.fullName}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Gender</span>
                  <span className="font-bold text-slate-900 text-sm block">{employee.gender}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Date of Birth (Sensitive)</span>
                  <SensitiveField
                    id={`sens-dob-${employee.id}`}
                    value={employee.dateOfBirth}
                    category="dateOfBirth"
                    ownerId={employee.id}
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Residential Address (Sensitive)</span>
                  <SensitiveField
                    id={`sens-addr-${employee.id}`}
                    value={employee.address}
                    category="address"
                    ownerId={employee.id}
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
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-[#0A1E3F] font-bold">
                    <HeartPulse className="w-4 h-4 text-[#C59B27]" />
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
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-[#0A1E3F] font-bold">
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span>Next of Kin (Confidential)</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Next of Kin Name</span>
                    <SensitiveField
                      id={`sens-nok-name-${employee.id}`}
                      value={employee.nextOfKin.name}
                      category="nextOfKin"
                      ownerId={employee.id}
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
                      id={`sens-nok-phone-${employee.id}`}
                      value={employee.nextOfKin.phone}
                      category="nextOfKin"
                      ownerId={employee.id}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Residential Address</span>
                    <SensitiveField
                      id={`sens-nok-addr-${employee.id}`}
                      value={employee.nextOfKin.address}
                      category="address"
                      ownerId={employee.id}
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
                      id={`sens-sal-full-${employee.id}`}
                      value={
                        employee.bankPayroll.basicSalary
                          ? `₦${employee.bankPayroll.basicSalary.toLocaleString()} ${employee.bankPayroll.currency}`
                          : undefined
                      }
                      category="salary"
                      ownerId={employee.id}
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
                      id={`sens-bank-full-${employee.id}`}
                      value={`${employee.bankPayroll.bankName} - ${employee.bankPayroll.accountNumber}`}
                      category="bank"
                      ownerId={employee.id}
                    />
                  </div>
                </div>

                {/* BVN */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Bank Verification Number (BVN)</span>
                  <div className="mt-1">
                    <SensitiveField
                      id={`sens-bvn-full-${employee.id}`}
                      value={employee.bankPayroll.bvn}
                      category="bank"
                      ownerId={employee.id}
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
                      id={`sens-rsa-full-${employee.id}`}
                      value={employee.pensionHmo.rsaPin}
                      category="pension"
                      ownerId={employee.id}
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
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                  Mandatory Personnel Documents
                </span>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                  4 of 4 Verified
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  { name: 'Citadel Official Appointment Letter', date: '15 Jan 2024', status: 'Verified' },
                  { name: 'National Youth Service Corps (NYSC) Discharge Certificate', date: '15 Jan 2024', status: 'Verified' },
                  { name: 'National Identity Card (NIN Slip)', date: '16 Jan 2024', status: 'Verified' },
                  { name: 'Signed Code of Conduct & Pastoral Alignment Accord', date: '18 Jan 2024', status: 'Verified' },
                ].map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900 text-xs sm:text-sm">{doc.name}</p>
                        <p className="text-slate-500 text-[10px] font-mono mt-0.5">Filed: {doc.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {doc.status}
                      </span>
                      <button
                        onClick={() => alert(`Simulating download of ${doc.name} for ${employee.fullName}`)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200 transition"
                        title="Download document"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
                  className="w-full py-2.5 rounded-xl bg-[#0A1E3F] text-amber-300 font-semibold text-xs hover:bg-[#152B52] transition text-center"
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
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
                    Latest PCCM Performance Calibration
                  </span>
                  <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                    <span>4.8</span>
                    <span className="text-xs font-semibold text-slate-500">/ 5.0</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-bold">
                      Exceeds Expectations
                    </span>
                  </div>
                </div>
                <Award className="w-10 h-10 text-[#C59B27]" />
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1 border-b border-slate-200">
                  Core OKR & KPI Progress
                </h4>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      1. Deliver Key Q3 Department Objectives & Projects
                    </span>
                    <span className="font-mono font-bold text-emerald-700">95% Complete</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      2. Alignment with Citadel Leadership Excellence Accord
                    </span>
                    <span className="font-mono font-bold text-[#C59B27]">100% Exemplary</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C59B27] rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 font-mono">
            Citadel Personnel Master Record • Staff ID: {employee.staffId}
          </div>

          <div className="flex items-center gap-2">
            {isPCCM && onEdit && (
              <button
                onClick={() => onEdit(employee)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
              >
                Edit Records
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#0A1E3F] text-white rounded-lg text-xs font-semibold hover:bg-[#152B52] transition"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
