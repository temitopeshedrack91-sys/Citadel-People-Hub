import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  Building2,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  MapPin,
  Video,
  FileText,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import { RecruitmentRequisition, CitadelEntity, CitadelDepartment, Employee } from '../../types';
import { ChevronStepper, StepItem } from '../common/ChevronStepper';
import { talentRepository } from '../../services';

interface CreateRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRequisition: RecruitmentRequisition) => void;
  entities: CitadelEntity[];
  departments: CitadelDepartment[];
  employees?: Employee[];
}

const REQUISITION_STEPS: StepItem[] = [
  { id: 1, title: 'Role & Entity', subtitle: 'Job title & organization' },
  { id: 2, title: 'Headcount & Team', subtitle: 'Capacity & hiring manager' },
  { id: 3, title: 'SLA & Timeline', subtitle: 'Target date & interview mode' },
  { id: 4, title: 'Verify & Submit', subtitle: 'Review & PCCM sign-off' },
];

const SALARY_BANDS = [
  { id: 'grade-1', name: 'Grade 1 - Executive / Director (Band A: ₦1.2M - ₦2.0M)' },
  { id: 'grade-2', name: 'Grade 2 - Senior Manager / Department Head (Band B: ₦750k - ₦1.1M)' },
  { id: 'grade-3', name: 'Grade 3 - Specialist / Lead Officer (Band C: ₦450k - ₦700k)' },
  { id: 'grade-4', name: 'Grade 4 - Associate / Operations Staff (Band D: ₦250k - ₦400k)' },
  { id: 'grade-5', name: 'Grade 5 - Entry Level / Ministry Intern (Band E: ₦120k - ₦220k)' },
];

export const CreateRequisitionModal: React.FC<CreateRequisitionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  entities,
  departments,
  employees = [],
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form State
  // Step 1: Role & Entity
  const [jobTitle, setJobTitle] = useState('');
  const [entityId, setEntityId] = useState(entities[0]?.id || '');
  const [departmentId, setDepartmentId] = useState('');
  const [employmentType, setEmploymentType] = useState<'Full-Time' | 'Part-Time' | 'Contract' | 'Internship'>('Full-Time');
  const [workLocation, setWorkLocation] = useState('');

  // Step 2: Headcount & Team
  const [openPositions, setOpenPositions] = useState<number>(1);
  const [hiringManager, setHiringManager] = useState('');
  const [salaryBand, setSalaryBand] = useState('');
  const [justification, setJustification] = useState('');

  // Step 3: SLA & Timeline
  const [targetDate, setTargetDate] = useState('');
  const [interviewFormat, setInterviewFormat] = useState('');
  const [sourcingChannel, setSourcingChannel] = useState('');
  const [keyRequirements, setKeyRequirements] = useState('');

  // Keep department synced when entityId changes
  useEffect(() => {
    if (!entityId && entities.length > 0) {
      setEntityId(entities[0].id);
    }
  }, [entities, entityId]);

  useEffect(() => {
    const entityDepts = departments.filter((d) => d.entityId === entityId);
    if (entityDepts.length > 0) {
      if (!entityDepts.some((d) => d.id === departmentId)) {
        setDepartmentId(entityDepts[0].id);
      }
    } else {
      setDepartmentId('');
    }
  }, [entityId, departments]);

  // Set default hiring manager from employees
  useEffect(() => {
    if (!hiringManager && employees.length > 0) {
      const pccmLead = employees.find(
        (e) =>
          e.departmentName?.toLowerCase().includes('people') ||
          e.departmentName?.toLowerCase().includes('pccm')
      );
      setHiringManager(
        pccmLead
          ? `${pccmLead.firstName} ${pccmLead.lastName}`
          : `${employees[0].firstName} ${employees[0].lastName}`
      );
    }
  }, [employees, hiringManager]);

  if (!isOpen) return null;

  const selectedEntity = entities.find((e) => e.id === entityId);
  const filteredDepartments = departments.filter((d) => d.entityId === entityId);
  const selectedDept = departments.find((d) => d.id === departmentId);

  const validateStep = (step: number): boolean => {
    setValidationError(null);
    if (step === 1) {
      if (!jobTitle.trim()) {
        setValidationError('Please provide a specific job title for this requisition.');
        return false;
      }
      if (!entityId) {
        setValidationError('Please select an assigned Citadel entity.');
        return false;
      }
      if (!departmentId || !selectedDept) {
        setValidationError('Please select an assigned department.');
        return false;
      }
    } else if (step === 2) {
      if (openPositions < 1) {
        setValidationError('Number of open positions must be at least 1.');
        return false;
      }
      if (!hiringManager.trim()) {
        setValidationError('Please designate a hiring manager or department lead.');
        return false;
      }
    } else if (step === 3) {
      if (!targetDate) {
        setValidationError('Please choose a realistic target fulfillment date.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const newRequisition: RecruitmentRequisition = {
        id: '',
        requisitionCode: '',
        jobTitle: jobTitle.trim(),
        entityId: selectedEntity?.id || '',
        entityName: selectedEntity?.name || '',
        departmentId: selectedDept?.id || '',
        departmentName: selectedDept?.name || '',
        openPositions: Number(openPositions) || 1,
        employmentType,
        status: 'Open',
        targetDate,
        targetHiringDate: targetDate,
        hiringManager: hiringManager.trim(),
        workLocation,
        salaryBand,
        justification,
        interviewFormat,
        sourcingChannel,
        keyRequirements,
        applicantsCount: 0,
        candidates: [],
      };

      if (!talentRepository.createRequisition) {
        throw new Error('Recruitment requisition creation is not supported by the configured data service.');
      }
      const savedRequisition = await talentRepository.createRequisition(newRequisition);

      onSuccess(savedRequisition);
      handleClose();
    } catch (err) {
      console.error('Failed to create requisition:', err);
      setValidationError(err instanceof Error ? err.message : 'Failed to create requisition. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setValidationError(null);
    setJobTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0A1E3F] via-[#0F172A] to-[#1E3A8A] text-white flex items-center justify-between border-b border-blue-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-[#D4AF37]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">New Recruitment Requisition</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37] text-slate-950 font-mono">
                  Sheet 8 Mandate
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Headcount authorization &amp; 10-stage sequential talent pipeline request
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chevron Stepper Progress Bar */}
        <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200">
          <ChevronStepper
            steps={REQUISITION_STEPS}
            currentStep={currentStep}
            onStepClick={(step) => {
              if (step < currentStep) setCurrentStep(step);
            }}
            variant="numbered"
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {validationError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{validationError}</span>
            </div>
          )}

          {/* STEP 1: ROLE & ENTITY */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[#083E34]" />
                  <span>Step 1: Role Designation &amp; Organization</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Step 1 of 4</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Job Position Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Broadcast Engineer, Academy Lead, Head of Operations"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#083E34] focus:ring-2 focus:ring-[#083E34]/10 outline-none transition"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Official title corresponding with Citadel Approved Establishment Headcount.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Citadel Entity <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#083E34] outline-none transition cursor-pointer"
                  >
                    <option value="">Select an entity</option>
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.name} ({ent.shortCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#083E34] outline-none transition cursor-pointer"
                  >
                    <option value="">Select a department</option>
                    {filteredDepartments.length > 0 ? (
                      filteredDepartments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))
                    ) : (
                      <option value="">No departments available</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Employment Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#083E34] outline-none transition cursor-pointer"
                  >
                    <option value="Full-Time">Full-Time (Permanent Staff)</option>
                    <option value="Contract">Fixed-Term Contract</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Internship">Internship / National Youth Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Work Location &amp; Arrangement
                  </label>
                  <select
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#083E34] outline-none transition cursor-pointer"
                  >
                    <option value="">Select a work arrangement</option>
                    <option value="Physical On-Site (Oregun Campus)">Physical On-Site (Oregun Campus, Ikeja)</option>
                    <option value="Hybrid (Campus + Remote)">Hybrid (Campus + Remote)</option>
                    <option value="Fully Remote">Fully Remote</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: HEADCOUNT & TEAM */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#083E34]" />
                  <span>Step 2: Headcount, Hiring Lead &amp; Compensation</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Step 2 of 4</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Number of Open Positions <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={openPositions}
                    onChange={(e) => setOpenPositions(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#083E34] outline-none transition"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Headcount must align with quarterly manpower budget.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Designated Hiring Manager <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Bukola Adeleke, Mrs. Folashade Adeyemo"
                    value={hiringManager}
                    onChange={(e) => setHiringManager(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#083E34] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Salary Grade &amp; Compensation Band
                </label>
                <select
                  value={salaryBand}
                  onChange={(e) => setSalaryBand(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#083E34] outline-none transition cursor-pointer"
                >
                  <option value="">Select an approved salary band</option>
                  {SALARY_BANDS.map((band) => (
                    <option key={band.id} value={band.name}>
                      {band.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Requisition Justification
                </label>
                <select
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#083E34] outline-none transition cursor-pointer"
                >
                  <option value="">Select a requisition justification</option>
                  <option value="New Headcount / Strategic Growth">New Headcount / Strategic Growth</option>
                  <option value="Backfill / Attrition Replacement">Backfill / Attrition Replacement</option>
                  <option value="Special Ministry Project / Seasonal Surge">Special Ministry Project / Seasonal Surge</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: SLA & TIMELINE */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#083E34]" />
                  <span>Step 3: Timeline &amp; Sheet 8 Protocol</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Step 3 of 4</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Hiring Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-[#083E34] outline-none transition"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Calculated standard recruitment SLA: ~28 to 35 calendar days.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stage 8 Assessment Protocol
                  </label>
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 font-semibold space-y-1">
                    <div className="flex items-center gap-1.5 text-[#083E34] font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Sheet 8 Mandated Format:</span>
                    </div>
                    <div className="text-[11px] space-y-0.5 text-slate-700">
                      <p>• <strong>Stage 1:</strong> Physical Technical Interview</p>
                      <p>• <strong>Stage 2:</strong> Virtual Competency Assessment</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Sourcing Channel
                </label>
                <select
                  value={sourcingChannel}
                  onChange={(e) => setSourcingChannel(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#083E34] outline-none transition cursor-pointer"
                >
                  <option value="Citadel Community & Careers Portal">Citadel Community &amp; Careers Portal</option>
                  <option value="Internal Succession & Mobility">Internal Succession &amp; Mobility</option>
                  <option value="LinkedIn & External Job Boards">LinkedIn &amp; External Job Boards</option>
                  <option value="Executive Search & Direct Referral">Executive Search &amp; Direct Referral</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Key Deliverables &amp; Core Qualifications Summary (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline key expectations, technical stack or pastoral competencies required for this position..."
                  value={keyRequirements}
                  onChange={(e) => setKeyRequirements(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#083E34] outline-none transition resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 4: VERIFY & SUBMIT */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Step 4: Verify &amp; Authorization Sign-Off</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Step 4 of 4</span>
              </div>

              {/* Requisition Card Summary */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-1 rounded-md bg-[#083E34] text-amber-300 font-mono text-xs font-bold inline-block mb-1.5">
                      Assigned after save
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">{jobTitle || 'Untitled Position'}</h3>
                    <p className="text-xs font-semibold text-[#083E34]">
                      {selectedDept?.name || 'Department'} • {selectedEntity?.name || 'Entity'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold">
                    Pending PCCM Approval
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-200/80">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Open Positions</span>
                    <span className="font-bold text-slate-800">{openPositions} Opening(s)</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Type</span>
                    <span className="font-bold text-slate-800">{employmentType}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Hiring Manager</span>
                    <span className="font-bold text-slate-800 truncate block">{hiringManager}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Target Date</span>
                    <span className="font-bold text-slate-800 font-mono">{targetDate}</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Salary Grade:</span>
                    <span className="font-bold text-slate-900">{salaryBand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Justification:</span>
                    <span className="font-bold text-slate-900">{justification}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Location:</span>
                    <span className="font-bold text-slate-900">{workLocation}</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <p className="text-amber-950 text-[11px] leading-relaxed">
                    Upon submission, this requisition initiates <strong>Stage 1 (Manpower Request &amp; Headcount Verification)</strong> of the Sheet 8 Sequential Protocol. Notification will be routed to People, Culture &amp; Change Management.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation Controls */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={currentStep === 1 ? handleClose : handleBack}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 transition flex items-center gap-1.5 cursor-pointer"
          >
            {currentStep > 1 && <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{currentStep === 1 ? 'Cancel' : 'Previous Step'}</span>
          </button>

          <div className="flex items-center gap-2">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 hover:bg-[#C59B27] border border-[#C59B27] text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 hover:bg-[#C59B27] text-xs font-extrabold flex items-center gap-1.5 shadow-sm border border-[#C59B27] transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Submitting Requisition...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Requisition for Approval</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
