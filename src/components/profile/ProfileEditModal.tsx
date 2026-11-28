/**
 * ProfileEditModal
 * Employee self-service profile editor aligned with Workbook Sheet 5:
 * - HR-managed institutional fields (Full Name, Staff ID, Entity, Department, Job Title, Grade) are read-only.
 * - Employee-permitted personal fields (Phone, Email, Residential Address, Date of Birth, Gender,
 *   Emergency Contact, Next of Kin, Profile Photo) stage into the HR approval workflow (PENDING_HR_APPROVAL)
 *   for non-HR users before becoming authoritative records.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Camera,
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  CheckCircle2,
  Shield,
  Lock,
  Clock,
  HeartPulse,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auditRepository, employeeRepository, governanceRepository } from '../../services';
import type { Employee } from '../../types';
import {
  applyApprovedChangeRequest,
  createProfileChangeRequest,
  mapAppRoleToWorkbookRole,
  type ProfileChangeRequest,
} from '../../domain/workbook';
import { isSafeImageUrl } from '../../utils/orgHelpers';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, currentRole, updateProfile } = useAuth();
  const workbookRole = mapAppRoleToWorkbookRole(currentRole);
  const isHrAdmin = workbookRole === 'SUPER_ADMIN_HR';

  const [employeeRecord, setEmployeeRecord] = useState<Employee | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ProfileChangeRequest[]>([]);
  const [loadingRecord, setLoadingRecord] = useState(false);

  // Permitted Sheet 5 personal fields
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [address, setAddress] = useState(currentUser.location || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [avatarPreview, setAvatarPreview] = useState(currentUser.avatarUrl || '');
  const [ecName, setEcName] = useState('');
  const [ecRelationship, setEcRelationship] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [nokName, setNokName] = useState('');
  const [nokRelationship, setNokRelationship] = useState('');
  const [nokPhone, setNokPhone] = useState('');
  const [nokAddress, setNokAddress] = useState('');
  const [changeReason, setChangeReason] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    const loadSelfProfile = async () => {
      setLoadingRecord(true);
      setSaveError(null);
      setSaveNotice(null);
      setChangeReason('');

      try {
        const [emps, allReqs] = await Promise.all([
          employeeRepository.getAll().catch(() => [] as Employee[]),
          governanceRepository.listProfileChangeRequests().catch(() => [] as ProfileChangeRequest[]),
        ]);
        if (!active) return;

        const matched =
          emps.find(
            (e) =>
              (currentUser.email && e.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
              (currentUser.staffId && e.staffId && e.staffId.toLowerCase() === currentUser.staffId.toLowerCase()) ||
              (currentUser.employeeId && String(e.id) === String(currentUser.employeeId)) ||
              (String(e.id) === String(currentUser.id) &&
                (!currentUser.staffId || !e.staffId || e.staffId.toLowerCase() === currentUser.staffId.toLowerCase()))
          ) || null;

        setEmployeeRecord(matched);

        const ownPending = allReqs.filter(
          (r) =>
            r.status === 'PENDING_HR_APPROVAL' &&
            ((matched && String(r.employeeId) === String(matched.id)) ||
              (currentUser.staffId && r.employeeStaffId === currentUser.staffId))
        );
        setPendingRequests(ownPending);

        setEmail(matched?.email || currentUser.email || '');
        setPhone(matched?.phone || currentUser.phone || '');
        setAddress(matched?.address || currentUser.location || '');
        setDateOfBirth(matched?.dateOfBirth || '');
        setGender(matched?.gender === 'Female' ? 'Female' : 'Male');
        setAvatarPreview(matched?.profilePhoto || currentUser.avatarUrl || '');
        setEcName(matched?.emergencyContact?.name || '');
        setEcRelationship(matched?.emergencyContact?.relationship || '');
        setEcPhone(matched?.emergencyContact?.phone || '');
        setNokName(matched?.nextOfKin?.name || '');
        setNokRelationship(matched?.nextOfKin?.relationship || '');
        setNokPhone(matched?.nextOfKin?.phone || '');
        setNokAddress(matched?.nextOfKin?.address || '');
      } finally {
        if (active) setLoadingRecord(false);
      }
    };

    void loadSelfProfile();
    return () => {
      active = false;
    };
  }, [currentUser, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSaveError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSaveError('Profile photo must be smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      if (isSafeImageUrl(dataUrl)) {
        setAvatarPreview(dataUrl);
        setSaveError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveNotice(null);

    if (avatarPreview.trim() && !isSafeImageUrl(avatarPreview.trim())) {
      setSaveError('Profile photo must be a valid https:// image URL or uploaded photo.');
      return;
    }

    const baseline: Employee = employeeRecord || {
      id: currentUser.employeeId || currentUser.id,
      staffId: currentUser.staffId,
      firstName: currentUser.name.split(' ')[0] || currentUser.name,
      lastName: currentUser.name.split(' ').slice(1).join(' ') || '',
      fullName: currentUser.name,
      dateOfBirth: '',
      gender: 'Male',
      phone: currentUser.phone || '',
      email: currentUser.email,
      address: currentUser.location || '',
      entityId: currentUser.entityId,
      entityName: currentUser.entityName,
      departmentId: currentUser.departmentId,
      departmentName: currentUser.departmentName,
      jobTitle: currentUser.jobTitle,
      gradeLevel: 'L1',
      employmentType: 'Full-Time',
      employmentDate: '',
      contractStatus: 'Permanent',
      yearsOfService: 0,
      status: 'Active',
      emergencyContact: { name: '', relationship: '', phone: '' },
      nextOfKin: { name: '', relationship: '', phone: '', address: '' },
      qualifications: [],
      certifications: [],
      bankPayroll: { bankName: '', accountNumber: '', accountName: '', salaryGrade: '', currency: 'NGN' },
      pensionHmo: { pfaName: '', rsaPin: '', hmoProvider: '', hmoPlan: '', hmoIdNumber: '' },
      profilePhoto: currentUser.avatarUrl,
    };

    const proposedChanges: Record<string, string> = {};
    if (phone.trim() !== (baseline.phone || '')) proposedChanges.phone = phone.trim();
    if (email.trim() !== (baseline.email || '')) proposedChanges.email = email.trim();
    if (address.trim() !== (baseline.address || '')) proposedChanges.address = address.trim();
    if (dateOfBirth.trim() && dateOfBirth.trim() !== (baseline.dateOfBirth || '')) {
      proposedChanges.dateOfBirth = dateOfBirth.trim();
    }
    if (gender !== baseline.gender) proposedChanges.gender = gender;
    if (avatarPreview.trim() !== (baseline.profilePhoto || '')) {
      proposedChanges.profilePhoto = avatarPreview.trim();
    }

    const nextEc = `${ecName.trim()} | ${ecRelationship.trim()} | ${ecPhone.trim()}`;
    const prevEc = `${baseline.emergencyContact?.name || ''} | ${baseline.emergencyContact?.relationship || ''} | ${baseline.emergencyContact?.phone || ''}`;
    if (ecPhone.trim() && nextEc !== prevEc) {
      proposedChanges.emergencyContact = nextEc;
    }

    const nextNok = `${nokName.trim()} | ${nokRelationship.trim()} | ${nokPhone.trim()} | ${nokAddress.trim()}`;
    const prevNok = `${baseline.nextOfKin?.name || ''} | ${baseline.nextOfKin?.relationship || ''} | ${baseline.nextOfKin?.phone || ''} | ${baseline.nextOfKin?.address || ''}`;
    if (nokName.trim() && nextNok !== prevNok) {
      proposedChanges.nextOfKin = nextNok;
    }

    if (Object.keys(proposedChanges).length === 0) {
      setSaveError('No changes detected. Edit at least one personal field before submitting.');
      return;
    }

    if (!isHrAdmin && !changeReason.trim()) {
      setSaveError('Please provide a short reason for your profile update request.');
      return;
    }

    setIsSaving(true);
    try {
      const request = createProfileChangeRequest({
        employee: baseline,
        actorRole: workbookRole,
        actorName: currentUser.name,
        proposedChanges,
        reason: changeReason.trim() || 'Direct HR profile update',
      });
      const persisted = await governanceRepository.createProfileChangeRequest(request);

      if (persisted.status === 'APPROVED') {
        if (employeeRecord) {
          const patched = applyApprovedChangeRequest(employeeRecord, persisted);
          const updated = await employeeRepository.update(employeeRecord.id, patched);
          setEmployeeRecord(updated);
        }
        await updateProfile({
          phone: phone.trim(),
          location: address.trim(),
          avatarUrl: avatarPreview.trim() || undefined,
        }).catch(() => undefined);

        setSaveNotice('Profile updated immediately on your authoritative HR record.');
      } else {
        setPendingRequests((prev) => [persisted, ...prev]);
        setSaveNotice(
          'Update submitted for HR approval (PENDING_HR_APPROVAL). Your authoritative employee record will update once PCCM/HR approves.'
        );
      }

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Employee Master',
        action:
          persisted.status === 'PENDING_HR_APPROVAL'
            ? 'Submitted Profile Change Request'
            : 'Updated Own Profile',
        recordAffectedId: baseline.id,
        recordAffectedTitle: `${baseline.fullName} (${baseline.staffId})`,
        previousValue: Object.keys(proposedChanges).join(', '),
        newValue: persisted.status,
        severity: 'Info',
      });

      setChangeReason('');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Profile changes could not be submitted.');
    } finally {
      setIsSaving(false);
    }
  };

  const initials = (currentUser.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="My Personal Profile"
      data-testid="profile-edit-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#174EA6] text-white p-5 relative border-b border-[#BFDBFE] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Close"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-white">My Personal Information</h2>
          <p className="text-xs text-blue-100 mt-0.5">
            {isHrAdmin
              ? 'HR/Super Admin edits commit directly to the employee master record.'
              : 'Personal updates enter the HR approval queue before becoming authoritative records (Workbook Sheet 5).'}
          </p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
            {loadingRecord && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#174EA6]" />
                <span>Loading your authoritative employee master record...</span>
              </div>
            )}

            {saveNotice && (
              <div
                role="status"
                data-testid="profile-edit-success"
                className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#174EA6] font-semibold flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#174EA6] shrink-0 mt-0.5" />
                <span>{saveNotice}</span>
              </div>
            )}

            {saveError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#111827]/25 text-[#111827] font-semibold flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-[#111827] shrink-0 mt-0.5" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Pending HR Approvals Notice */}
            {pendingRequests.length > 0 && (
              <div
                data-testid="profile-pending-requests-banner"
                className="p-3.5 rounded-xl bg-[#FAF5EB] border border-[#E9D59A] text-[#B88A24] space-y-1.5"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Clock className="w-4 h-4 text-[#B88A24]" />
                  <span>
                    {pendingRequests.length} Pending HR Approval Request
                    {pendingRequests.length === 1 ? '' : 's'}
                  </span>
                </div>
                {pendingRequests.slice(0, 3).map((req) => (
                  <div key={req.id} className="text-[11px] text-[#B88A24] flex flex-wrap items-center justify-between gap-2 bg-white/70 px-2.5 py-1.5 rounded-lg border border-[#E9D59A]">
                    <span>
                      Fields: <strong>{Object.keys(req.proposedChanges).join(', ')}</strong> — “{req.reason}”
                    </span>
                    <span className="font-mono font-bold text-[#B88A24]">{req.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="relative group shrink-0">
                {isSafeImageUrl(avatarPreview) ? (
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#174EA6] text-white font-bold flex items-center justify-center text-lg shadow-xs border-2 border-slate-200">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  title="Change photo"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1 w-full space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Profile Photo</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#174EA6] font-semibold hover:underline cursor-pointer"
                  >
                    Upload image
                  </button>
                </div>
                <input
                  type="url"
                  value={avatarPreview}
                  onChange={(e) => setAvatarPreview(e.target.value)}
                  placeholder="Or paste an https:// profile photo URL"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#174EA6]"
                />
              </div>
            </div>

            {/* HR-Managed Institutional Identity (Read-Only) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>HR-Managed Institutional Record (Read-Only)</span>
                </span>
                <span className="font-mono text-[10px] font-bold text-[#174EA6]">
                  {employeeRecord?.staffId || currentUser.staffId}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <span className="text-[10px] text-slate-400 block">Full Name</span>
                  <span className="font-semibold text-slate-900">{employeeRecord?.fullName || currentUser.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Business Entity</span>
                  <span className="font-semibold text-slate-900">{employeeRecord?.entityName || currentUser.entityName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Department</span>
                  <span className="font-semibold text-slate-900">{employeeRecord?.departmentName || currentUser.departmentName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Job Title</span>
                  <span className="font-semibold text-slate-900">{employeeRecord?.jobTitle || currentUser.jobTitle}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Grade / Level</span>
                  <span className="font-semibold text-slate-900">{employeeRecord?.gradeLevel || 'Assigned by HR'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Direct Manager</span>
                  <span className="font-semibold text-slate-900">{employeeRecord?.managerName || currentUser.managerName || 'Executive / HR'}</span>
                </div>
              </div>
            </div>

            {/* Editable Personal Information */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <User className="w-3.5 h-3.5 text-[#174EA6]" />
                <span>Personal Contact &amp; Bio-Data (Employee Self-Service)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    data-testid="profile-phone-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#174EA6]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    data-testid="profile-email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@thecitadelglobal.org"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#174EA6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#174EA6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#174EA6]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Residential Address
                  </label>
                  <input
                    type="text"
                    data-testid="profile-address-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Residential street address, Lagos"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#174EA6]"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact & Next of Kin */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <HeartPulse className="w-3.5 h-3.5 text-[#174EA6]" />
                <span>Emergency Contact &amp; Next of Kin</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Emergency Name</label>
                  <input
                    type="text"
                    value={ecName}
                    onChange={(e) => setEcName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#174EA6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={ecRelationship}
                    onChange={(e) => setEcRelationship(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#174EA6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    value={ecPhone}
                    onChange={(e) => setEcPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#174EA6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Next of Kin Name</label>
                  <input
                    type="text"
                    value={nokName}
                    onChange={(e) => setNokName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#174EA6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Next of Kin Relationship</label>
                  <input
                    type="text"
                    value={nokRelationship}
                    onChange={(e) => setNokRelationship(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#174EA6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Next of Kin Phone</label>
                  <input
                    type="tel"
                    value={nokPhone}
                    onChange={(e) => setNokPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#174EA6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Next of Kin Address</label>
                  <input
                    type="text"
                    value={nokAddress}
                    onChange={(e) => setNokAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#174EA6]"
                  />
                </div>
              </div>
            </div>

            {/* Reason for Change */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                <Shield className="w-3.5 h-3.5 text-[#174EA6]" />
                <span>Reason for Update {!isHrAdmin ? '*' : '(Optional)'}</span>
              </label>
              <input
                type="text"
                data-testid="profile-reason-input"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                required={!isHrAdmin}
                placeholder="e.g. Updated residential address / phone number for HR records"
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-[#174EA6]"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSaving}
              data-testid="profile-submit-btn"
              className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer bg-[#174EA6] text-white hover:bg-[#0B1F3A] active:scale-[0.97] disabled:opacity-50"
            >
              {isSaving ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isHrAdmin ? 'Save Authoritative Update' : 'Submit for HR Approval'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditModal;
