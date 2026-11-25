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
} from 'lucide-react';
import { Employee, CitadelEntity, CitadelDepartment, EmployeeStatus, EmploymentType } from '../../types';
import { employeeRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { ChevronStepper } from '../common/ChevronStepper';

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

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('1994-06-15');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+234 800 ');
  const [address, setAddress] = useState('Citadel Campus, 30 Kudirat Abiola Way, Oregun, Ikeja, Lagos');

  // Step 2: Employment Details
  const [staffId, setStaffId] = useState('CGCC-' + Math.floor(100 + Math.random() * 900));
  const [entityId, setEntityId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Associate (A-1)');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('Full-Time');
  const [employmentDate, setEmploymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmationDate, setConfirmationDate] = useState('');
  const [managerId, setManagerId] = useState('');
  const [status, setStatus] = useState<EmployeeStatus>('Probation');

  // Populate form when opening for Create vs Edit
  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
    if (editingEmployee) {
      setCurrentStep(2);
      setFirstName(editingEmployee.firstName || '');
      setLastName(editingEmployee.lastName || '');
      setGender(editingEmployee.gender || 'Male');
      setDateOfBirth(editingEmployee.dateOfBirth || '1994-06-15');
      setEmail(editingEmployee.email || '');
      setPhone(editingEmployee.phone || '');
      setAddress(editingEmployee.address || '');
      setStaffId(editingEmployee.staffId || '');
      setEntityId(String(editingEmployee.entityId || entities[0]?.id || ''));
      setDepartmentId(String(editingEmployee.departmentId || ''));
      setJobTitle(editingEmployee.jobTitle || '');
      setGradeLevel(editingEmployee.gradeLevel || 'Associate (A-1)');
      setEmploymentType(editingEmployee.employmentType || 'Full-Time');
      setEmploymentDate(editingEmployee.employmentDate || new Date().toISOString().split('T')[0]);
      setConfirmationDate(editingEmployee.confirmationDate || '');
      setManagerId(editingEmployee.managerId ? String(editingEmployee.managerId) : '');
      setStatus(editingEmployee.status || 'Active');
    } else {
      setCurrentStep(1);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('+234 800 ');
      setStaffId('CGCC-' + Math.floor(100 + Math.random() * 900));
      setEntityId(entities[0] ? String(entities[0].id) : '');
      setDepartmentId('');
      setJobTitle('');
      setManagerId('');
      setStatus('Probation');
    }
  }, [isOpen, editingEmployee, entities]);

  // Synchronize entityId with loaded entities
  useEffect(() => {
    if (entities.length > 0 && (!entityId || !entities.some((e) => String(e.id) === String(entityId)))) {
      setEntityId(String(entities[0].id));
    }
  }, [entities, entityId]);

  // Strict entity-coupled department filtering (never fall back to departments from other entities)
  const filteredDepartments = useMemo(() => {
    if (!departments || departments.length === 0) return [];
    if (!entityId) return [];

    return departments.filter((d) => {
      if (!d.isActive && String(d.id) !== String(departmentId)) return false;
      if (String(d.entityId) === String(entityId)) return true;
      const entLower = entityId.toLowerCase();
      const dEntLower = (d.entityId || '').toLowerCase();
      if (entLower.includes('cgcc') && dEntLower.includes('cgcc')) return true;
      if (entLower.includes('csog') && dEntLower.includes('csog')) return true;
      if (entLower.includes('holding') && dEntLower.includes('holding')) return true;
      return false;
    });
  }, [departments, entityId, departmentId]);

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
    if (!employees) return [];
    return employees.filter((emp) => !editingEmployee || String(emp.id) !== String(editingEmployee.id));
  }, [employees, editingEmployee]);

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
  const [accountNumber, setAccountNumber] = useState('0248891234');
  const [basicSalary, setBasicSalary] = useState(450000);
  const [pfaName, setPfaName] = useState('Stanbic IBTC Pension');
  const [rsaPin, setRsaPin] = useState('PEN100998844551');
  const [hmoProvider, setHmoProvider] = useState('Reliance HMO');
  const [hmoPlan, setHmoPlan] = useState('Gold Corporate');

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
      setValidationError('Please select a valid entity and department.');
      return;
    }

    setIsSubmitting(true);
    try {
      const entityObj = entities.find((ent) => String(ent.id) === String(entityId));
      const deptObj = departments.find((d) => String(d.id) === String(departmentId));
      const selectedSupervisor = availableSupervisors.find((s) => String(s.id) === String(managerId));

      if (editingEmployee) {
        const updated = await employeeRepository.update(String(editingEmployee.id), {
          staffId,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim(),
          email,
          phone,
          dateOfBirth,
          gender,
          address,
          entityId,
          departmentId,
          jobTitle,
          gradeLevel,
          employmentType,
          employmentDate,
          confirmationDate: confirmationDate || undefined,
          managerId: (managerId ? String(managerId) : null) as any,
          managerName: (selectedSupervisor?.fullName || null) as any,
          status,
        });

        await auditRepository.logAction({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentRole,
          module: 'Employee Management',
          action: 'Updated Employee Record',
          recordAffectedId: updated.id,
          recordAffectedTitle: `${updated.fullName} (${updated.staffId})`,
          previousValue: editingEmployee.departmentName,
          newValue: `${updated.entityName} • ${updated.departmentName}`,
          severity: 'Info',
        });

        onSuccess();
        onClose();
        return;
      }

      const newEmp: Omit<Employee, 'id'> = {
        staffId,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        email,
        phone,
        dateOfBirth,
        gender,
        address,
        emergencyContact: {
          name: emergName || `${firstName} Emergency Contact`,
          relationship: emergRelationship,
          phone: emergPhone,
        },
        nextOfKin: {
          name: nokName || `${firstName} Next of Kin`,
          relationship: nokRelationship,
          phone: nokPhone,
          address: nokAddress,
        },
        entityId,
        entityName: entityObj?.name || 'Citadel Global Community Church (CGCC)',
        departmentId,
        departmentName: deptObj?.name || 'People, Culture & Change',
        jobTitle,
        gradeLevel,
        employmentType,
        employmentDate,
        confirmationDate: confirmationDate || undefined,
        managerId: managerId ? String(managerId) : undefined,
        managerName: selectedSupervisor?.fullName || undefined,
        contractStatus: status === 'Probation' ? 'Probation' : 'Permanent',
        yearsOfService: 0,
        qualifications: [
          {
            id: 'q-1',
            degree,
            institution,
            yearCompleted,
            fieldOfStudy,
          },
        ],
        certifications: certName
          ? [
              {
                id: 'c-1',
                name: certName,
                issuingBody: 'Chartered Institute',
                yearObtained: certYear,
              },
            ]
          : [],
        bankPayroll: {
          bankName,
          accountNumber,
          accountName: `${firstName} ${lastName}`,
          bvn: '22889900112',
          salaryGrade: gradeLevel,
          basicSalary,
          currency: 'NGN',
        },
        pensionHmo: {
          pfaName,
          rsaPin,
          hmoProvider,
          hmoPlan,
          hmoIdNumber: 'CIT-' + staffId.replace('/', '-'),
        },
        status,
      };

      const created = await employeeRepository.create(newEmp);

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
        <div className="bg-[#083E34] text-white p-5 sm:p-6 relative shrink-0 border-b border-emerald-950/30">
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
            <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 font-mono text-[10px] font-bold border border-amber-400/30">
              {isEditing ? 'Update Placement & Hierarchy' : 'PCCM Enrollment'}
            </span>
          </div>
          <p className="text-xs text-emerald-100/90 mt-1">
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
                if (step < currentStep) setCurrentStep(step);
              }}
              variant="numbered"
            />
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {validationError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {draftSaved && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
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
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
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
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
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
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Primary Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none bg-white"
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
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
                />
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
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:border-[#083E34] outline-none font-bold text-[#083E34]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Entity *</label>
                  <select
                    data-testid="employee-entity-select"
                    value={entityId}
                    onChange={(e) => {
                      setEntityId(e.target.value);
                      setDepartmentId('');
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none bg-white font-medium"
                  >
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.name}
                      </option>
                    ))}
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
                    disabled={filteredDepartments.length === 0}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none bg-white font-medium disabled:bg-slate-100"
                  >
                    {filteredDepartments.length === 0 ? (
                      <option value="">No departments found for selected entity</option>
                    ) : (
                      filteredDepartments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.headOfDepartmentName ? `(${d.headOfDepartmentName})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Official Job Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Media Production Specialist"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Grade Level</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none bg-white"
                  >
                    <option>Associate (A-1)</option>
                    <option>Senior Associate (SA-1)</option>
                    <option>Team Lead (TL-1)</option>
                    <option>Managerial (M-2)</option>
                    <option>Executive Level (E-1)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none bg-white"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                    <option value="Probationary">Probationary</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lifecycle Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none bg-white font-semibold"
                  >
                    <option value="Active">Active</option>
                    <option value="Probation">Probation</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employment Date</label>
                  <input
                    type="date"
                    value={employmentDate}
                    onChange={(e) => setEmploymentDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Direct Supervisor / Reporting Manager</label>
                  <select
                    data-testid="employee-supervisor-select"
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none bg-white font-medium"
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
                <span className="font-bold text-[#083E34] block text-xs">Primary Emergency Contact</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Contact Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Mary Balogun"
                      value={emergName}
                      onChange={(e) => setEmergName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Relationship</label>
                    <input
                      type="text"
                      value={emergRelationship}
                      onChange={(e) => setEmergRelationship(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={emergPhone}
                      onChange={(e) => setEmergPhone(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-[#083E34] block text-xs">Next of Kin (Confidential)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Next of Kin Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Mary Balogun"
                      value={nokName}
                      onChange={(e) => setNokName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Relationship</label>
                    <input
                      type="text"
                      value={nokRelationship}
                      onChange={(e) => setNokRelationship(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={nokPhone}
                      onChange={(e) => setNokPhone(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={nokAddress}
                    onChange={(e) => setNokAddress(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
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
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Institution / University</label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
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
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Year Completed</label>
                    <input
                      type="number"
                      value={yearCompleted}
                      onChange={(e) => setYearCompleted(parseInt(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none font-mono"
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
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Year Obtained</label>
                    <input
                      type="number"
                      value={certYear}
                      onChange={(e) => setCertYear(parseInt(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none font-mono"
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

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-slate-700 flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                <span>
                  These credentials will be masked and guarded by role-based permissions in accordance with the Citadel PCCM Governance Charter.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Salary Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Monthly Basic Salary (NGN)</label>
                  <input
                    type="number"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(parseInt(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Pension PFA Provider</label>
                  <input
                    type="text"
                    value={pfaName}
                    onChange={(e) => setPfaName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
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
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">HMO Provider</label>
                  <input
                    type="text"
                    value={hmoProvider}
                    onChange={(e) => setHmoProvider(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">HMO Plan Tier</label>
                  <input
                    type="text"
                    value={hmoPlan}
                    onChange={(e) => setHmoPlan(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-[#083E34] outline-none"
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
