import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
  Sparkles,
  AlertCircle,
  Camera,
  RefreshCw,
} from 'lucide-react';
import {
  Employee,
  CitadelEntity,
  CitadelDepartment,
  EmployeeStatus,
  EmploymentType,
  ContractStatus,
  JobTitle,
  PayGrade,
} from '../../types';
import {
  employeeRepository,
  organizationRepository,
  auditRepository,
  classificationRepository,
} from '../../services';
import { useAuth } from '../../context/AuthContext';
import { ChevronStepper } from '../common/ChevronStepper';
import {
  filterDepartmentsByEntity,
  findEntityById,
  getDepartmentHeadLabel,
  isSafeImageUrl,
} from '../../utils/orgHelpers';
import { calculateYearsOfService } from '../../domain/workbook';

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entities: CitadelEntity[];
  departments: CitadelDepartment[];
  employees?: Employee[];
  editingEmployee?: Employee | null;
}

export const CreateEmployeeModal: React.FC<CreateEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  entities,
  departments,
  employees,
  editingEmployee = null,
}) => {
  const { currentUser, currentRole } = useAuth();
  const isEditing = Boolean(editingEmployee);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Resilient self-loaded reference lists when parent props haven't populated yet
  const [localEntities, setLocalEntities] = useState<CitadelEntity[]>(entities);
  const [localDepartments, setLocalDepartments] = useState<CitadelDepartment[]>(departments);
  const [localEmployees, setLocalEmployees] = useState<Employee[]>(employees || []);
  const [payGrades, setPayGrades] = useState<PayGrade[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgLoadError, setOrgLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (entities.length > 0) setLocalEntities(entities);
  }, [entities]);

  useEffect(() => {
    if (departments.length > 0) setLocalDepartments(departments);
  }, [departments]);

  useEffect(() => {
    if (employees && employees.length > 0) setLocalEmployees(employees);
  }, [employees]);

  const refreshReferenceData = async () => {
    setOrgLoading(true);
    setOrgLoadError(null);
    try {
      const [ents, depts, emps, grades, titles] = await Promise.all([
        entities.length > 0 ? Promise.resolve(entities) : organizationRepository.getEntities(),
        departments.length > 0 ? Promise.resolve(departments) : organizationRepository.getDepartments(),
        employees && employees.length > 0 ? Promise.resolve(employees) : employeeRepository.getAll(),
        classificationRepository.getPayGrades().catch(() => [] as PayGrade[]),
        classificationRepository.getJobTitles().catch(() => [] as JobTitle[]),
      ]);
      if (entities.length === 0) setLocalEntities(ents);
      if (departments.length === 0) setLocalDepartments(depts);
      if (!employees || employees.length === 0) setLocalEmployees(emps);
      setPayGrades(Array.isArray(grades) ? grades : []);
      setJobTitles(Array.isArray(titles) ? titles : []);
    } catch (err) {
      setOrgLoadError(err instanceof Error ? err.message : 'Unable to load entities, departments, and supervisors.');
    } finally {
      setOrgLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (
      localEntities.length === 0 ||
      localDepartments.length === 0 ||
      localEmployees.length === 0 ||
      payGrades.length === 0 ||
      jobTitles.length === 0
    ) {
      void refreshReferenceData();
    }
  }, [isOpen]);

  // Step 1: Personal Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('1994-06-15');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+234 800 ');
  const [address, setAddress] = useState('Citadel Campus, 30 Kudirat Abiola Way, Oregun, Ikeja, Lagos');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Step 2: Employment Details
  const [staffId, setStaffId] = useState('CGCC-' + Math.floor(100 + Math.random() * 900));
  const [entityId, setEntityId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Associate (A-1)');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('Full-Time');
  const [contractStatus, setContractStatus] = useState<ContractStatus>('Probation');
  const [employmentDate, setEmploymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmationDate, setConfirmationDate] = useState('');
  const [managerId, setManagerId] = useState('');
  const [status, setStatus] = useState<EmployeeStatus>('Probation');

  // Step 3: Emergency & Next of Kin
  const [emergName, setEmergName] = useState('');
  const [emergRelationship, setEmergRelationship] = useState('Spouse');
  const [emergPhone, setEmergPhone] = useState('+234 800 ');
  const [nokName, setNokName] = useState('');
  const [nokRelationship, setNokRelationship] = useState('Spouse');
  const [nokPhone, setNokPhone] = useState('+234 800 ');
  const [nokAddress, setNokAddress] = useState('Lagos State, Nigeria');

  // Step 4: Qualifications & Documents
  const [degree, setDegree] = useState('B.Sc Business Administration');
  const [institution, setInstitution] = useState('University of Lagos');
  const [yearCompleted, setYearCompleted] = useState(2018);
  const [fieldOfStudy, setFieldOfStudy] = useState('Social Sciences');
  const [certName, setCertName] = useState('CIPM Associate Certification');
  const [certYear, setCertYear] = useState(2021);

  // Step 5: Payroll, Pension & HMO
  const [bankName, setBankName] = useState('Guaranty Trust Bank (GTBank)');
  const [accountNumber, setAccountNumber] = useState('');
  const [bvn, setBvn] = useState('');
  const [basicSalary, setBasicSalary] = useState(450000);
  const [pfaName, setPfaName] = useState('Stanbic IBTC Pension');
  const [rsaPin, setRsaPin] = useState('');
  const [hmoProvider, setHmoProvider] = useState('Reliance HMO');
  const [hmoPlan, setHmoPlan] = useState('Gold Corporate');

  // Populate ALL 5 steps when opening for Create vs Edit
  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
    if (editingEmployee) {
      setCurrentStep(2);
      setFirstName(editingEmployee.firstName || '');
      setLastName(editingEmployee.lastName || '');
      setGender(editingEmployee.gender || 'Male');
      setDateOfBirth(editingEmployee.dateOfBirth || '');
      setEmail(editingEmployee.email || '');
      setPhone(editingEmployee.phone || '');
      setAddress(editingEmployee.address || '');
      setProfilePhoto(editingEmployee.profilePhoto || '');

      const matchedEntity = findEntityById(localEntities, editingEmployee.entityId);
      setStaffId(editingEmployee.staffId || '');
      setEntityId(String(matchedEntity?.id || editingEmployee.entityId || localEntities[0]?.id || ''));
      setDepartmentId(String(editingEmployee.departmentId || ''));
      setJobTitle(editingEmployee.jobTitle || '');
      setGradeLevel(editingEmployee.gradeLevel || 'Associate (A-1)');
      setEmploymentType(editingEmployee.employmentType || 'Full-Time');
      setContractStatus(editingEmployee.contractStatus || 'Permanent');
      setEmploymentDate(editingEmployee.employmentDate || new Date().toISOString().split('T')[0]);
      setConfirmationDate(editingEmployee.confirmationDate || '');
      setManagerId(editingEmployee.managerId ? String(editingEmployee.managerId) : '');
      setStatus(editingEmployee.status || 'Active');

      // Step 3 hydration
      setEmergName(editingEmployee.emergencyContact?.name || '');
      setEmergRelationship(editingEmployee.emergencyContact?.relationship || 'Spouse');
      setEmergPhone(editingEmployee.emergencyContact?.phone || '');
      setNokName(editingEmployee.nextOfKin?.name || '');
      setNokRelationship(editingEmployee.nextOfKin?.relationship || 'Spouse');
      setNokPhone(editingEmployee.nextOfKin?.phone || '');
      setNokAddress(editingEmployee.nextOfKin?.address || '');

      // Step 4 hydration
      const firstQual = editingEmployee.qualifications?.[0];
      setDegree(firstQual?.degree || '');
      setInstitution(firstQual?.institution || '');
      setYearCompleted(firstQual?.yearCompleted || new Date().getFullYear());
      setFieldOfStudy(firstQual?.fieldOfStudy || '');
      const firstCert = editingEmployee.certifications?.[0];
      setCertName(firstCert?.name || '');
      setCertYear(firstCert?.yearObtained || new Date().getFullYear());

      // Step 5 hydration
      setBankName(editingEmployee.bankPayroll?.bankName || '');
      setAccountNumber(editingEmployee.bankPayroll?.accountNumber || '');
      setBvn(editingEmployee.bankPayroll?.bvn || '');
      setBasicSalary(editingEmployee.bankPayroll?.basicSalary ?? 0);
      setPfaName(editingEmployee.pensionHmo?.pfaName || '');
      setRsaPin(editingEmployee.pensionHmo?.rsaPin || '');
      setHmoProvider(editingEmployee.pensionHmo?.hmoProvider || '');
      setHmoPlan(editingEmployee.pensionHmo?.hmoPlan || '');
    } else {
      setCurrentStep(1);
      setFirstName('');
      setLastName('');
      setGender('Male');
      setDateOfBirth('1994-06-15');
      setEmail('');
      setPhone('+234 800 ');
      setAddress('Citadel Campus, 30 Kudirat Abiola Way, Oregun, Ikeja, Lagos');
      setProfilePhoto('');
      setStaffId('CGCC-' + Math.floor(100 + Math.random() * 900));
      setEntityId(localEntities[0] ? String(localEntities[0].id) : '');
      setDepartmentId('');
      setJobTitle('');
      setGradeLevel('Associate (A-1)');
      setEmploymentType('Full-Time');
      setContractStatus('Probation');
      setEmploymentDate(new Date().toISOString().split('T')[0]);
      setConfirmationDate('');
      setManagerId('');
      setStatus('Probation');
      setEmergName('');
      setEmergRelationship('Spouse');
      setEmergPhone('+234 800 ');
      setNokName('');
      setNokRelationship('Spouse');
      setNokPhone('+234 800 ');
      setNokAddress('Lagos State, Nigeria');
      setDegree('B.Sc Business Administration');
      setInstitution('University of Lagos');
      setYearCompleted(2018);
      setFieldOfStudy('Social Sciences');
      setCertName('');
      setCertYear(2021);
      setBankName('Guaranty Trust Bank (GTBank)');
      setAccountNumber('');
      setBvn('');
      setBasicSalary(450000);
      setPfaName('Stanbic IBTC Pension');
      setRsaPin('');
      setHmoProvider('Reliance HMO');
      setHmoPlan('Gold Corporate');
    }
  }, [isOpen, editingEmployee, localEntities]);

  // Synchronize entityId with loaded entities
  useEffect(() => {
    if (localEntities.length > 0 && (!entityId || !findEntityById(localEntities, entityId))) {
      setEntityId(String(localEntities[0].id));
    }
  }, [localEntities, entityId]);

  // Dismiss modal on Escape regardless of focused element
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Strict entity-coupled department filtering (never fall back to departments from other entities)
  const filteredDepartments = useMemo(() => {
    if (!entityId) return [];
    return filterDepartmentsByEntity(localDepartments, entityId, {
      keepDepartmentId: departmentId,
    });
  }, [localDepartments, entityId, departmentId]);

  // Keep department selection strictly consistent with selected entity
  useEffect(() => {
    if (filteredDepartments.length === 0) {
      if (departmentId !== '') setDepartmentId('');
      return;
    }
    if (!departmentId || !filteredDepartments.some((d) => String(d.id) === String(departmentId))) {
      setDepartmentId(String(filteredDepartments[0].id));
    }
  }, [filteredDepartments, departmentId]);

  const availableSupervisors = useMemo(() => {
    return localEmployees.filter((emp) => !editingEmployee || String(emp.id) !== String(editingEmployee.id));
  }, [localEmployees, editingEmployee]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setValidationError('Profile photo must be a PNG, JPG, WEBP, or GIF image.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setValidationError('Profile photo must be smaller than 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      if (isSafeImageUrl(result)) {
        setProfilePhoto(result);
        setValidationError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const handleNext = () => {
    setValidationError(null);
    if (currentStep === 1) {
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
        setValidationError('Please provide the full name, email address, and phone number.');
        return;
      }
    }
    if (currentStep === 2) {
      if (!staffId.trim() || !jobTitle.trim()) {
        setValidationError('Please specify the Staff ID and Job Title.');
        return;
      }
    }
    if (currentStep === 3) {
      if (!emergName.trim() || !nokName.trim()) {
        setValidationError('Please provide both the Emergency Contact and Next of Kin names.');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSaveDraft = () => {
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!entityId || !departmentId) {
      setValidationError('Please select a valid business entity and department.');
      return;
    }

    const entityObj = findEntityById(localEntities, entityId);
    const deptObj = localDepartments.find((d) => String(d.id) === String(departmentId));
    if (!entityObj || !deptObj) {
      setValidationError('The selected entity or department could not be verified. Reload organization records and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedSupervisor = availableSupervisors.find((s) => String(s.id) === String(managerId));
      const computedYears = calculateYearsOfService(employmentDate);
      const safePhoto = isSafeImageUrl(profilePhoto) ? profilePhoto.trim() : undefined;
      const qualificationsPayload = degree.trim()
        ? [
            {
              id: editingEmployee?.qualifications?.[0]?.id || 'q-1',
              degree: degree.trim(),
              institution: institution.trim(),
              yearCompleted: Number.isFinite(yearCompleted) ? yearCompleted : new Date().getFullYear(),
              fieldOfStudy: fieldOfStudy.trim(),
            },
          ]
        : [];
      const certificationsPayload = certName.trim()
        ? [
            {
              id: editingEmployee?.certifications?.[0]?.id || 'c-1',
              name: certName.trim(),
              issuingBody: editingEmployee?.certifications?.[0]?.issuingBody || 'Chartered Institute',
              yearObtained: Number.isFinite(certYear) ? certYear : new Date().getFullYear(),
            },
          ]
        : [];

      const masterPayload = {
        staffId: staffId.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        profilePhoto: safePhoto,
        email: email.trim(),
        phone: phone.trim(),
        dateOfBirth,
        gender,
        address: address.trim(),
        emergencyContact: {
          name: emergName.trim(),
          relationship: emergRelationship.trim(),
          phone: emergPhone.trim(),
        },
        nextOfKin: {
          name: nokName.trim(),
          relationship: nokRelationship.trim(),
          phone: nokPhone.trim(),
          address: nokAddress.trim(),
        },
        entityId: String(entityObj.id),
        entityName: entityObj.name,
        departmentId: String(deptObj.id),
        departmentName: deptObj.name,
        jobTitle: jobTitle.trim(),
        gradeLevel,
        employmentType,
        employmentDate,
        confirmationDate: confirmationDate || undefined,
        managerId: managerId ? String(managerId) : undefined,
        managerName: selectedSupervisor?.fullName || undefined,
        contractStatus,
        yearsOfService: computedYears,
        qualifications: qualificationsPayload,
        certifications: certificationsPayload,
        bankPayroll: {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountName: `${firstName.trim()} ${lastName.trim()}`.trim(),
          bvn: bvn.trim() || undefined,
          salaryGrade: gradeLevel,
          basicSalary: Number.isFinite(basicSalary) ? basicSalary : 0,
          currency: editingEmployee?.bankPayroll?.currency || 'NGN',
        },
        pensionHmo: {
          pfaName: pfaName.trim(),
          rsaPin: rsaPin.trim(),
          hmoProvider: hmoProvider.trim(),
          hmoPlan: hmoPlan.trim(),
          hmoIdNumber: editingEmployee?.pensionHmo?.hmoIdNumber || 'CIT-' + staffId.replace(/[^a-zA-Z0-9]/g, '-'),
        },
        status,
      };

      if (editingEmployee) {
        const updated = await employeeRepository.update(String(editingEmployee.id), {
          ...masterPayload,
          managerId: (managerId ? String(managerId) : null) as any,
          managerName: (selectedSupervisor?.fullName || null) as any,
        });

        await auditRepository.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentRole,
          module: 'Employee Management',
          action: 'Updated Employee Record',
          recordAffectedId: updated.id,
          recordAffectedTitle: `${updated.fullName} (${updated.staffId})`,
          previousValue: `${editingEmployee.entityName} • ${editingEmployee.departmentName}`,
          newValue: `${updated.entityName} • ${updated.departmentName}`,
          severity: 'Info',
        });

        onSuccess();
        onClose();
        return;
      }

      const created = await employeeRepository.create(masterPayload);

      await auditRepository.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentRole,
        module: 'Employee Management',
        action: 'Created New Employee Record',
        recordAffectedId: created.id,
        recordAffectedTitle: `${created.fullName} (${created.staffId})`,
        previousValue: 'None',
        newValue: `Created in ${created.entityName} • ${created.departmentName}`,
        severity: 'Info',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || 'Unable to save employee record. Check fields and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Personal Info' },
    { num: 2, title: 'Employment Placement' },
    { num: 3, title: 'Emergency & Kin' },
    { num: 4, title: 'Qualifications' },
    { num: 5, title: 'Payroll & HMO' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? `Edit Employee Record — ${editingEmployee?.fullName}` : 'Create Employee Master Record'}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#174EA6] text-white p-5 sm:p-6 relative shrink-0 border-b border-[#BFDBFE]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close employee modal"
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 pr-8 flex-wrap">
            <h2 className="text-lg font-bold text-white">
              {isEditing ? `Edit Employee Record — ${editingEmployee?.fullName}` : 'Create Employee Master Record'}
            </h2>
            <span className="px-2 py-0.5 rounded bg-[#B88A24] text-[#D4AF37] font-mono text-[10px] font-bold border border-[#E9D59A]">
              {isEditing ? 'Update Placement & Hierarchy' : 'PCCM Enrollment'}
            </span>
          </div>
          <p className="text-xs text-blue-100 mt-1">
            Sectioned personnel onboarding wizard with automatic credential indexing.
          </p>

          {/* Chevron Stepper Progress Bar */}
          <div className="mt-4 pt-1">
            <ChevronStepper
              steps={[
                { id: 1, title: 'Personal', subtitle: 'Identity & Contacts' },
                { id: 2, title: 'Placement', subtitle: 'Entity & Role' },
                { id: 3, title: 'Emergency', subtitle: 'Next of Kin' },
                { id: 4, title: 'Credentials', subtitle: 'Qualifications' },
                { id: 5, title: 'Finance', subtitle: 'Payroll & HMO' },
              ]}
              currentStep={currentStep}
              onStepClick={(step) => {
                if (isEditing || step < currentStep) setCurrentStep(step);
              }}
              variant="numbered"
            />
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {orgLoadError && (
            <div className="p-3 rounded-lg bg-[#FAF5EB] border border-[#E9D59A] text-[#B88A24] text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#B88A24]" />
                <span>{orgLoadError}</span>
              </div>
              <button
                type="button"
                onClick={() => void refreshReferenceData()}
                className="px-2.5 py-1 rounded bg-white border border-[#E9D59A] font-semibold hover:bg-[#FAF5EB] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {validationError && (
            <div className="p-3 rounded-lg bg-[#F5F7FA] border border-[#111827]/25 text-[#111827] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {draftSaved && (
            <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#174EA6] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Draft saved successfully to PCCM local cache!</span>
            </div>
          )}

          {/* STEP 1: PERSONAL INFORMATION */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1 border-b border-slate-200">
                1. Personal Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Oluwatosin"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Balogun"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="o.balogun@citadelcommunity.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Primary Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date of Birth (Sensitive)</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
                {isSafeImageUrl(profilePhoto) ? (
                  <img
                    src={profilePhoto}
                    alt="Employee preview"
                    className="w-12 h-12 rounded-xl object-cover border border-slate-300 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#174EA6] text-white font-bold flex items-center justify-center text-sm shrink-0">
                    <Camera className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                )}
                <div className="flex-1 space-y-1.5">
                  <label className="block text-slate-700 font-semibold">Profile Photo (Upload or HTTPS URL)</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handlePhotoUpload}
                      className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#174EA6] file:text-white cursor-pointer"
                    />
                    <input
                      type="url"
                      placeholder="Or paste https:// image URL"
                      value={profilePhoto.startsWith('data:') ? '' : profilePhoto}
                      onChange={(e) => setProfilePhoto(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none bg-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: EMPLOYMENT DETAILS */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1 border-b border-slate-200">
                2. Employment Placement & Status
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Staff ID *</label>
                  <input
                    type="text"
                    required
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:border-[#174EA6] outline-none font-bold text-[#174EA6]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Entity *</label>
                  <select
                    data-testid="employee-entity-select"
                    value={entityId}
                    disabled={orgLoading && localEntities.length === 0}
                    onChange={(e) => {
                      setEntityId(e.target.value);
                      setDepartmentId('');
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none bg-white font-medium disabled:bg-slate-100"
                  >
                    {localEntities.length === 0 ? (
                      <option value="">
                        {orgLoading ? 'Loading entities...' : 'No entities available'}
                      </option>
                    ) : (
                      localEntities.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {ent.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Department *</label>
                  <select
                    data-testid="employee-department-select"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    disabled={orgLoading || filteredDepartments.length === 0}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none bg-white font-medium disabled:bg-slate-100"
                  >
                    {orgLoading && filteredDepartments.length === 0 ? (
                      <option value="">Loading departments...</option>
                    ) : filteredDepartments.length === 0 ? (
                      <option value="">No departments found for selected entity</option>
                    ) : (
                      filteredDepartments.map((d) => {
                        const head = getDepartmentHeadLabel(d);
                        return (
                          <option key={d.id} value={d.id}>
                            {d.name} {head ? `(${head})` : ''}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Official Job Title *</label>
                  <input
                    type="text"
                    required
                    list="citadel-job-titles-datalist"
                    placeholder="e.g. Media Production Specialist"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                  />
                  <datalist id="citadel-job-titles-datalist">
                    {jobTitles.map((jt) => (
                      <option key={jt.id} value={jt.title} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Grade Level</label>
                  <select
                    data-testid="employee-grade-select"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    disabled={orgLoading && payGrades.length === 0}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none bg-white disabled:bg-slate-100"
                  >
                    {orgLoading && payGrades.length === 0 ? (
                      <option value={gradeLevel}>Loading pay grades...</option>
                    ) : payGrades.length === 0 ? (
                      <option value={gradeLevel || ''}>{gradeLevel || 'No pay grades configured'}</option>
                    ) : (
                      <>
                        {gradeLevel && !payGrades.some((g) => g.name === gradeLevel) && (
                          <option value={gradeLevel}>{gradeLevel}</option>
                        )}
                        {payGrades.map((grade) => (
                          <option key={grade.id} value={grade.name}>
                            {grade.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none bg-white"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                    <option value="Probationary">Probationary</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contract Status</label>
                  <select
                    data-testid="employee-contract-status-select"
                    value={contractStatus}
                    onChange={(e) => setContractStatus(e.target.value as ContractStatus)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none bg-white"
                  >
                    <option value="Probation">Probation</option>
                    <option value="Permanent">Permanent</option>
                    <option value="Fixed-Term">Fixed-Term</option>
                    <option value="Notice-Period">Notice-Period</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lifecycle Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none bg-white font-semibold"
                  >
                    <option value="Active">Active</option>
                    <option value="Probation">Probation</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Resigned">Resigned</option>
                    <option value="Terminated">Terminated</option>
                    <option value="Retired">Retired</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employment Date</label>
                  <input
                    type="date"
                    value={employmentDate}
                    onChange={(e) => setEmploymentDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Confirmation Date</label>
                  <input
                    type="date"
                    data-testid="employee-confirmation-date"
                    value={confirmationDate}
                    onChange={(e) => setConfirmationDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Direct Supervisor / Manager</label>
                  <select
                    data-testid="employee-supervisor-select"
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none bg-white font-medium"
                  >
                    <option value="">No Direct Supervisor (Top-Level)</option>
                    {availableSupervisors.map((sup) => (
                      <option key={sup.id} value={String(sup.id)}>
                        {sup.fullName} — {sup.jobTitle} ({sup.staffId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: EMERGENCY & NEXT OF KIN */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1 border-b border-slate-200">
                3. Emergency Contact & Next of Kin
              </h3>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-[#174EA6] block text-xs">Primary Emergency Contact</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Contact Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Mary Balogun"
                      value={emergName}
                      onChange={(e) => setEmergName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Relationship</label>
                    <input
                      type="text"
                      value={emergRelationship}
                      onChange={(e) => setEmergRelationship(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={emergPhone}
                      onChange={(e) => setEmergPhone(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-[#174EA6] block text-xs">Next of Kin (Confidential)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Next of Kin Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Mary Balogun"
                      value={nokName}
                      onChange={(e) => setNokName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Relationship</label>
                    <input
                      type="text"
                      value={nokRelationship}
                      onChange={(e) => setNokRelationship(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={nokPhone}
                      onChange={(e) => setNokPhone(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={nokAddress}
                    onChange={(e) => setNokAddress(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: QUALIFICATIONS & CERTIFICATIONS */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1 border-b border-slate-200">
                4. Academic Qualifications & Certifications
              </h3>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 block text-xs">Primary Degree</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Degree Title</label>
                    <input
                      type="text"
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Institution / University</label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Field of Study</label>
                    <input
                      type="text"
                      value={fieldOfStudy}
                      onChange={(e) => setFieldOfStudy(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Year Completed</label>
                    <input
                      type="number"
                      value={yearCompleted}
                      onChange={(e) => setYearCompleted(parseInt(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 block text-xs">Professional Certification (Optional)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Certification Name</label>
                    <input
                      type="text"
                      value={certName}
                      onChange={(e) => setCertName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Year Obtained</label>
                    <input
                      type="number"
                      value={certYear}
                      onChange={(e) => setCertYear(parseInt(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: PAYROLL, PENSION & HMO */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs pb-1 border-b border-slate-200">
                5. Benefits, Banking & Payroll Configuration
              </h3>

              <div className="p-3.5 rounded-xl bg-[#B88A24] border border-[#E9D59A] text-xs text-slate-700 flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                <span>
                  These credentials will be masked and guarded by role-based permissions in accordance with the Citadel PCCM Governance Charter.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Salary Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    placeholder="10-digit NUBAN"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">BVN (Sensitive)</label>
                  <input
                    type="text"
                    placeholder="11-digit BVN"
                    value={bvn}
                    onChange={(e) => setBvn(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Monthly Basic Salary (NGN)</label>
                  <input
                    type="number"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(parseInt(e.target.value || '0', 10))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Pension PFA Provider</label>
                  <input
                    type="text"
                    value={pfaName}
                    onChange={(e) => setPfaName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">RSA PIN</label>
                  <input
                    type="text"
                    value={rsaPin}
                    onChange={(e) => setRsaPin(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">HMO Provider</label>
                  <input
                    type="text"
                    value={hmoProvider}
                    onChange={(e) => setHmoProvider(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">HMO Plan Tier</label>
                  <input
                    type="text"
                    value={hmoPlan}
                    onChange={(e) => setHmoPlan(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#174EA6] outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Save in-progress enrollment as draft"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              )}

              {isEditing ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="employee-save-changes-btn"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              ) : currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  {isSubmitting ? (
                    'Enrolling Record...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Enrollment</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
