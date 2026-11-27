import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  FileCheck2,
  Video,
  MapPin,
  Clock,
  ShieldCheck,
  Info,
  X,
  Search,
  Filter,
  UserCheck,
  Phone,
  Mail,
  CalendarDays,
  Award,
  ChevronRight,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { RecruitmentRequisition, CitadelEntity, CitadelDepartment, Employee, Candidate, CandidateInterview } from '../../types';
import { talentRepository, organizationRepository, employeeRepository, recruitmentPipelineRepository } from '../../services';
import { Badge } from '../common/Badge';
import {
  CITADEL_RECRUITMENT_STAGES,
} from '../../data/mockData';
import { CreateRequisitionModal } from '../recruitment/CreateRequisitionModal';

export const RecruitmentView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requisitions' | 'candidates' | 'sop_stages'>('requisitions');
  const [requisitions, setRequisitions] = useState<RecruitmentRequisition[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [entities, setEntities] = useState<CitadelEntity[]>([]);
  const [departments, setDepartments] = useState<CitadelDepartment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ATS Candidate Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVacancyFilter, setSelectedVacancyFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modals for ATS Actions
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isScheduleInterviewOpen, setIsScheduleInterviewOpen] = useState(false);
  const [isRecordResultOpen, setIsRecordResultOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<CandidateInterview | null>(null);

  // Candidate Form State
  const [candidateForm, setCandidateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    vacancyTitle: '',
    departmentName: 'ICT',
    notes: '',
  });

  // Schedule Interview Form State
  const [interviewForm, setInterviewForm] = useState({
    title: 'Stage 1: Physical Technical Interview',
    interviewerName: 'Sussan Afuwape (PCCM)',
    scheduledDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    scheduledTime: '10:00 AM',
    location: 'Citadel Boardroom / GEC Panel Suite',
    notes: 'Verify technical proficiency, job description competencies, and institutional alignment.',
  });

  // Record Result Form State
  const [resultForm, setResultForm] = useState<{
    result: 'Passed' | 'Failed';
    rating: number;
    notes: string;
  }>({
    result: 'Passed',
    rating: 4,
    notes: '',
  });

  const loadData = async () => {
    try {
      const [reqList, entList, deptList, empList, candList] = await Promise.all([
        talentRepository.getRequisitions(),
        organizationRepository.getEntities(),
        organizationRepository.getDepartments(),
        employeeRepository.getAll(),
        recruitmentPipelineRepository.getCandidates(),
      ]);

      setRequisitions(reqList);
      setEntities(entList);
      setDepartments(deptList);
      setEmployees(empList);
      setCandidates(candList || []);
      setLoadError(null);
    } catch (err) {
      console.error('Failed to load recruitment view data:', err);
      setLoadError(err instanceof Error ? err.message : 'Recruitment data could not be loaded.');
    }
  };

  useEffect(() => {
    void loadData();
    const onAuthChanged = () => void loadData();
    window.addEventListener('citadel:auth-changed', onAuthChanged);
    return () => window.removeEventListener('citadel:auth-changed', onAuthChanged);
  }, []);

  const handleRequisitionCreated = (newReq: RecruitmentRequisition) => {
    setRequisitions((prev) => [newReq, ...prev]);
    setActiveTab('requisitions');
    setSuccessBanner(
      `Requisition "${newReq.requisitionCode} - ${newReq.jobTitle}" was saved.`
    );
    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };

  const handleStatusChange = async (requisition: RecruitmentRequisition, status: RecruitmentRequisition['status']) => {
    if (status === requisition.status) return;
    try {
      if (!talentRepository.updateRequisitionStatus) {
        throw new Error('Requisition status updates are not supported by the configured data service.');
      }
      const saved = await talentRepository.updateRequisitionStatus(requisition.id, status);
      setRequisitions((previous) => previous.map((item) => item.id === saved.id ? saved : item));
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Requisition status could not be saved.');
    }
  };

  // Handle Candidate Stage Transition
  const handleCandidateStatusTransition = async (candidate: Candidate, newStatus: string) => {
    try {
      setActionError(null);
      const updated = await recruitmentPipelineRepository.updateCandidateStatus(candidate.id, newStatus);
      setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSuccessBanner(`Candidate ${candidate.fullName} transitioned to "${newStatus}".`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      setActionError(`Status update failed: ${err?.message || 'Unexpected error.'}`);
    }
  };

  // Handle Add Candidate Submit
  const handleAddCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateForm.firstName || !candidateForm.lastName || !candidateForm.email) {
      setActionError('Please provide first name, last name, and email address.');
      return;
    }
    try {
      setActionError(null);
      const created = await recruitmentPipelineRepository.createCandidate({
        firstName: candidateForm.firstName,
        lastName: candidateForm.lastName,
        email: candidateForm.email,
        phone: candidateForm.phone,
        vacancyTitle: candidateForm.vacancyTitle || 'General Recruitment',
        departmentName: candidateForm.departmentName,
        notes: candidateForm.notes,
        status: 'Application Initiated',
      });
      setCandidates((prev) => [created, ...prev]);
      setIsAddCandidateOpen(false);
      setCandidateForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        vacancyTitle: '',
        departmentName: 'ICT',
        notes: '',
      });
      setSuccessBanner(`Applicant ${created.fullName} successfully registered in ATS pipeline.`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      setActionError(`Could not register candidate: ${err?.message || 'Unexpected error.'}`);
    }
  };

  // Handle Schedule Interview Submit
  const handleScheduleInterviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    try {
      setActionError(null);
      const scheduled = await recruitmentPipelineRepository.scheduleInterview(selectedCandidate.id, {
        title: interviewForm.title,
        interviewerName: interviewForm.interviewerName,
        scheduledDate: interviewForm.scheduledDate,
        scheduledTime: interviewForm.scheduledTime,
        notes: `${interviewForm.notes} | Location: ${interviewForm.location}`,
      });

      // Reload candidates
      const freshCandidates = await recruitmentPipelineRepository.getCandidates();
      setCandidates(freshCandidates);
      setIsScheduleInterviewOpen(false);
      setSuccessBanner(`Interview scheduled for ${selectedCandidate.fullName} on ${scheduled.scheduledDate}.`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      setActionError(`Scheduling failed: ${err?.message || 'Unexpected error.'}`);
    }
  };

  // Handle Record Interview Result Submit
  const handleRecordResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterview) return;
    try {
      setActionError(null);
      await recruitmentPipelineRepository.updateInterviewResult(
        selectedInterview.id,
        resultForm.result,
        `Rating: ${resultForm.rating}/5. ${resultForm.notes}`
      );
      const freshCandidates = await recruitmentPipelineRepository.getCandidates();
      setCandidates(freshCandidates);
      setIsRecordResultOpen(false);
      setSuccessBanner(`Interview result marked as "${resultForm.result}" for candidate.`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      setActionError(`Failed to save interview result: ${err?.message || 'Unexpected error.'}`);
    }
  };

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchSearch =
        !searchQuery ||
        c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchVacancy =
        selectedVacancyFilter === 'all' ||
        c.vacancyTitle?.toLowerCase() === selectedVacancyFilter.toLowerCase() ||
        String(c.vacancyId) === selectedVacancyFilter;

      const matchStatus =
        selectedStatusFilter === 'all' ||
        c.status.toLowerCase() === selectedStatusFilter.toLowerCase();

      return matchSearch && matchVacancy && matchStatus;
    });
  }, [candidates, searchQuery, selectedVacancyFilter, selectedStatusFilter]);

  // ATS Funnel Stats
  const atsStats = useMemo(() => {
    const total = candidates.length;
    const shortlisted = candidates.filter((c) => c.status === 'Shortlisted').length;
    const interviewing = candidates.filter(
      (c) => c.status === 'Interview Scheduled' || c.status === 'Interview Passed'
    ).length;
    const offers = candidates.filter((c) => c.status === 'Job Offered' || c.status === 'Offer Accepted').length;
    const hired = candidates.filter((c) => c.status === 'Hired').length;
    return { total, shortlisted, interviewing, offers, hired };
  }, [candidates]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#174EA6]" />
            <span>Recruitment</span>
            <span className="text-slate-400 font-normal">·</span>
            <span className="text-sm font-semibold text-slate-600">Talent Acquisition</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manpower requisitions, 10-stage SOP hiring pipeline, candidate assessments, and interview scheduling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddCandidateOpen(true)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-[#174EA6]" />
            <span>Add Candidate</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#D4AF37] text-slate-950 hover:bg-[#C59B27] text-xs font-bold flex items-center gap-1.5 shadow-xs border border-[#C59B27] transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>New Requisition</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#111827]/25 text-[#111827] text-xs font-semibold flex items-center justify-between gap-3">
          <span>Recruitment data could not be loaded: {loadError}</span>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-3 py-1 rounded-lg bg-white border border-[#111827]/25 text-[#111827] hover:bg-[#E5E7EB] text-xs font-bold cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <div role="alert" className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#111827]/25 text-[#111827] text-xs font-semibold">
          Requisition status could not be saved: {actionError}
        </div>
      )}

      {/* Success Notification Banner */}
      {successBanner && (
        <div role="status" className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#174EA6] text-xs flex items-center justify-between animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#174EA6] shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            aria-label="Dismiss notification"
            className="p-1 text-[#174EA6] hover:text-[#174EA6] transition rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar scroll-smooth" role="tablist">
        <button
          onClick={() => setActiveTab('requisitions')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'requisitions'
              ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Active Requisitions ({requisitions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'candidates'
              ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Candidate Pipeline (ATS) ({candidates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sop_stages')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'sop_stages'
              ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Official 10-Stage SOP Framework (Sheet 8)</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE REQUISITIONS */}
      {activeTab === 'requisitions' && (
        requisitions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requisitions.map((req) => {
              const hiringMgr = req.hiringManager || 'Not assigned';
              const targetDt = req.targetDate || req.targetHiringDate || 'Not set';
              const reqCandidates = candidates.filter(
                (c) => c.vacancyTitle === req.jobTitle || String(c.vacancyId) === String(req.id)
              );

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex flex-col justify-between hover:border-slate-300 transition group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {req.requisitionCode}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {req.employmentType || 'Full-Time'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#174EA6] transition mt-1">
                          {req.jobTitle}
                        </h3>
                        <p className="text-xs text-[#174EA6] font-semibold mt-0.5">
                          {req.departmentName} ({req.entityName})
                        </p>
                      </div>
                      <Badge variant={req.status === 'Open' ? 'success' : req.status === 'Interviewing' ? 'warning' : 'neutral'}>
                        {req.status}
                      </Badge>
                    </div>

                    <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Requisition status
                      <select
                        aria-label={`Update status for ${req.jobTitle}`}
                        value={req.status}
                        onChange={(event) => void handleStatusChange(req, event.target.value as RecruitmentRequisition['status'])}
                        className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold normal-case tracking-normal text-slate-800"
                      >
                        {['Draft', 'Approved', 'Open', 'Interviewing', 'Filled', 'Closed'].map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Open Positions:</span>
                        <span className="font-bold text-slate-800">{req.openPositions} Opening(s)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Hiring Manager:</span>
                        <span className="font-bold text-slate-800">{hiringMgr}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Target Date:</span>
                        <span className="font-bold text-slate-800 font-mono">{targetDt}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Applicants:</span>
                        <span className="font-bold text-slate-800">{reqCandidates.length || req.applicantsCount} in pipeline</span>
                      </div>
                    </div>

                    {/* Candidate Pipeline Tracker */}
                    <div className="mt-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                        Active Candidates in 10-Stage Pipeline
                      </span>
                      {reqCandidates.length > 0 ? (
                        <div className="space-y-1.5">
                          {reqCandidates.slice(0, 3).map((cand) => (
                            <div
                              key={cand.id}
                              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white text-xs hover:bg-slate-50 transition"
                            >
                              <div>
                                <span className="font-bold text-slate-900 block">{cand.fullName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Applied: {cand.appliedDate}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  cand.status === 'Hired'
                                    ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]'
                                    : cand.status.includes('Interview')
                                    ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]/60'
                                    : cand.status === 'Job Offered'
                                    ? 'bg-[#FAF5EB] text-[#B88A24] border-[#E9D59A]'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {cand.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                            <span>Sourcing &amp; Screening Active</span>
                            <span className="text-[#174EA6] font-bold">{req.applicantsCount} Resumes</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                            <div className="bg-[#174EA6] h-full" style={{ width: '45%' }} />
                            <div className="bg-[#B88A24] h-full" style={{ width: '30%' }} />
                            <div className="bg-[#174EA6] h-full" style={{ width: '15%' }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                            <span>Screening (60%)</span>
                            <span>Interviewing (30%)</span>
                            <span>Offer (10%)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">PCCM Recruitment Engine</span>
                    <button
                      onClick={() => {
                        setSelectedVacancyFilter(req.jobTitle);
                        setActiveTab('candidates');
                      }}
                      className="text-xs font-bold text-[#174EA6] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All Candidates ({reqCandidates.length || req.applicantsCount})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">No Requisitions Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No active hiring requisitions currently match your criteria. Create a new requisition to start the hiring pipeline.
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#174EA6] text-white hover:bg-[#062d26] text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Requisition</span>
            </button>
          </div>
        )
      )}

      {/* TAB 2: CANDIDATE PIPELINE (ATS) */}
      {activeTab === 'candidates' && (
        <div className="space-y-4">
          {/* Top ATS Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 tabular-nums">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Total Pool</span>
              <span className="text-xl font-bold text-slate-900">{atsStats.total}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Active candidates</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-[#174EA6] uppercase tracking-wider block">Shortlisted</span>
              <span className="text-xl font-bold text-[#174EA6]">{atsStats.shortlisted}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Resume approved</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">In Interview</span>
              <span className="text-xl font-bold text-slate-900">{atsStats.interviewing}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Tech &amp; Competency</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-[#B88A24] uppercase tracking-wider block">Offers Extended</span>
              <span className="text-xl font-bold text-[#B88A24]">{atsStats.offers}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Pending acceptance</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-[#174EA6] uppercase tracking-wider block">Hired</span>
              <span className="text-xl font-bold text-[#174EA6]">{atsStats.hired}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Ready for Onboarding</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates by name, email..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedVacancyFilter}
                onChange={(e) => setSelectedVacancyFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="all">All Vacancies / Roles</option>
                {requisitions.map((r) => (
                  <option key={r.id} value={r.jobTitle}>{r.jobTitle}</option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="all">All Pipeline Stages</option>
                <option value="Application Initiated">Application Initiated</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Interview Passed">Interview Passed</option>
                <option value="Job Offered">Job Offered</option>
                <option value="Hired">Hired</option>
                <option value="Rejected">Rejected</option>
              </select>

              {(selectedVacancyFilter !== 'all' || selectedStatusFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedVacancyFilter('all');
                    setSelectedStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 text-xs font-semibold cursor-pointer"
                  title="Clear filters"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Candidate Grid */}
          {filteredCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCandidates.map((candidate) => {
                const interviews = candidate.interviews || [];
                const pendingInterview = interviews.find((i) => i.result === 'Pending');

                return (
                  <div
                    key={candidate.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
                  >
                    <div>
                      {/* Candidate Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#174EA6] text-[#D4AF37] font-black text-sm flex items-center justify-center">
                            {candidate.firstName.charAt(0)}{candidate.lastName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{candidate.fullName}</h3>
                            <p className="text-xs text-[#174EA6] font-semibold">
                              {candidate.vacancyTitle || 'Position not set'} · <span className="text-slate-400 font-normal">{candidate.departmentName || 'CGCC'}</span>
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                            candidate.status === 'Hired'
                              ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]'
                              : candidate.status === 'Job Offered'
                              ? 'bg-[#FAF5EB] text-[#B88A24] border-[#E9D59A]'
                              : candidate.status.includes('Interview')
                              ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]'
                              : candidate.status === 'Shortlisted'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : candidate.status === 'Rejected'
                              ? 'bg-[#F5F7FA] text-[#111827] border-[#111827]/25'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {candidate.status}
                        </span>
                      </div>

                      {/* Contact Info */}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <a href={`mailto:${candidate.email}`} className="flex items-center gap-1 hover:text-[#174EA6]">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{candidate.email}</span>
                        </a>
                        {candidate.phone && (
                          <a href={`tel:${candidate.phone}`} className="flex items-center gap-1 hover:text-[#174EA6]">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{candidate.phone}</span>
                          </a>
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto font-mono">
                          Applied: {candidate.appliedDate}
                        </span>
                      </div>

                      {/* Notes / Qualifications */}
                      {candidate.notes && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                          <span className="font-bold text-slate-900 block text-[10px] uppercase tracking-wider mb-0.5">Qualifications &amp; Evaluation:</span>
                          <p className="whitespace-pre-line text-[11px]">{candidate.notes}</p>
                        </div>
                      )}

                      {/* Scheduled Interviews Section */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Interview Stages (Sheet 8)
                          </span>
                          <button
                            onClick={() => {
                              setSelectedCandidate(candidate);
                              setIsScheduleInterviewOpen(true);
                            }}
                            className="text-[11px] font-bold text-[#174EA6] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <CalendarDays className="w-3 h-3" />
                            <span>Schedule Interview</span>
                          </button>
                        </div>

                        {interviews.length > 0 ? (
                          <div className="space-y-2">
                            {interviews.map((iv) => (
                              <div
                                key={iv.id}
                                className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col gap-1 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-slate-900 flex items-center gap-1">
                                    {iv.title.includes('Physical') ? (
                                      <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                                    ) : (
                                      <Video className="w-3 h-3 text-[#174EA6] shrink-0" />
                                    )}
                                    <span>{iv.title}</span>
                                  </span>
                                  <span
                                    className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                      iv.result === 'Passed'
                                        ? 'bg-[#DBEAFE] text-[#174EA6]'
                                        : iv.result === 'Failed'
                                        ? 'bg-[#E5E7EB] text-[#111827]'
                                        : 'bg-[#FAF5EB] text-[#B88A24]'
                                    }`}
                                  >
                                    {iv.result}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                  <span>Panel: {iv.interviewerName || 'CGCC Interview Committee'}</span>
                                  <span className="font-mono">{iv.scheduledDate} {iv.scheduledTime || ''}</span>
                                </div>
                                {iv.notes && (
                                  <p className="text-[10px] text-slate-600 italic bg-white p-1.5 rounded border border-slate-100 mt-1">
                                    "{iv.notes}"
                                  </p>
                                )}
                                {iv.result === 'Pending' && (
                                  <div className="mt-1 pt-1 border-t border-slate-200 flex justify-end">
                                    <button
                                      onClick={() => {
                                        setSelectedInterview(iv);
                                        setSelectedCandidate(candidate);
                                        setIsRecordResultOpen(true);
                                      }}
                                      className="px-2 py-1 rounded bg-[#174EA6] text-white text-[10px] font-bold hover:bg-[#062d26] transition cursor-pointer"
                                    >
                                      Record Assessment Result
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-[11px] text-slate-400">
                            No interviews scheduled yet.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stage Transition Toolbar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Move Stage:</span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {candidate.status === 'Application Initiated' && (
                          <button
                            onClick={() => handleCandidateStatusTransition(candidate, 'Shortlisted')}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 text-[11px] font-bold border border-blue-200 transition cursor-pointer"
                          >
                            Shortlist Candidate
                          </button>
                        )}
                        {(candidate.status === 'Shortlisted' || candidate.status === 'Interview Failed') && (
                          <button
                            onClick={() => {
                              setSelectedCandidate(candidate);
                              setIsScheduleInterviewOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#174EA6] hover:bg-[#DBEAFE] text-[11px] font-bold border border-[#BFDBFE] transition cursor-pointer"
                          >
                            Schedule Interview
                          </button>
                        )}
                        {candidate.status === 'Interview Passed' && (
                          <button
                            onClick={() => handleCandidateStatusTransition(candidate, 'Job Offered')}
                            className="px-2.5 py-1 rounded-lg bg-[#FAF5EB] text-[#B88A24] hover:bg-[#FAF5EB] text-[11px] font-bold border border-[#E9D59A] transition cursor-pointer"
                          >
                            Extend Job Offer
                          </button>
                        )}
                        {candidate.status === 'Job Offered' && (
                          <button
                            onClick={() => handleCandidateStatusTransition(candidate, 'Hired')}
                            className="px-2.5 py-1 rounded-lg bg-[#174EA6] text-white hover:bg-[#174EA6] text-[11px] font-bold transition cursor-pointer shadow-xs"
                          >
                            Mark Hired (Pre-Onboard)
                          </button>
                        )}
                        {candidate.status !== 'Hired' && candidate.status !== 'Rejected' && (
                          <button
                            onClick={() => handleCandidateStatusTransition(candidate, 'Rejected')}
                            className="px-2 py-1 rounded-lg bg-[#F5F7FA] text-[#111827] hover:bg-[#E5E7EB] text-[11px] font-bold border border-[#111827]/25 transition cursor-pointer"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">No Candidates Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No applicants match your filter criteria. Register a new candidate to begin the ATS evaluation workflow.
                </p>
              </div>
              <button
                onClick={() => setIsAddCandidateOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#174EA6] text-white hover:bg-[#062d26] text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Candidate to Pipeline</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 10-STAGE RECRUITMENT SOP FRAMEWORK */}
      {activeTab === 'sop_stages' && (
        <div className="space-y-5">
          {/* Institutional Highlights Card */}
          <div className="p-4 bg-[#FAF5EB] border border-[#E9D59A] rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-[#B88A24] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black text-[#B88A24] uppercase tracking-wider">
                Citadel Standard Operating Procedure for Recruitment (Workbook Sheet 8)
              </h3>
              <p className="text-xs text-[#B88A24] mt-1 leading-relaxed font-medium">
                Recruitment across all Citadel entities follows a rigid 10-stage sequential protocol. Vacancies require formal Manpower Requisitions with approved headcount and salary band validation. Stage 8 requires a <span className="font-black text-[#B88A24] underline">Two-Stage Interview Assessment</span> comprising <span className="font-bold text-[#B88A24]">Stage 1: Physical Technical Interview</span> and <span className="font-bold text-[#B88A24]">Stage 2: Virtual Competency-Based Assessment</span>.
              </p>
            </div>
          </div>

          {/* Stepper Timeline Visualizer */}
          <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-xs">
            <h3 className="text-xs font-black text-black uppercase tracking-wider mb-4">
              10-Stage Pipeline Overview &amp; SLA Sequence
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {CITADEL_RECRUITMENT_STAGES.map((st) => (
                <div
                  key={st.step}
                  className={`p-3 rounded-xl border flex flex-col justify-between ${
                    st.step === 8
                      ? 'bg-[#FAF5EB] border-[#E9D59A] ring-1 ring-amber-400'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="w-6 h-6 rounded-full bg-[#174EA6] text-[#D4AF37] font-black text-xs flex items-center justify-center">
                        {st.step}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 font-mono">
                        {st.slaDays}d SLA
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-black leading-snug">
                      {st.stageName}
                    </h4>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-700">
                    <span className="font-bold block text-black truncate">{st.primaryActor}</span>
                    <span className="text-[9px] text-slate-500 uppercase">{st.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Stage Table */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Full 10-Stage Recruitment Protocol Specification
                </h3>
                <p className="text-[11px] text-slate-600">Roles, responsibilities, SLA days, and stage deliverables</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-[#174EA6] text-[#D4AF37] rounded-md">
                Sheet 8 Mandate
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#174EA6] text-white uppercase tracking-wider text-xs font-bold">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">Step</th>
                    <th className="py-3.5 px-4">Stage Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Primary Actor</th>
                    <th className="py-3.5 px-4">Mandatory Gate Requirement</th>
                    <th className="py-3.5 px-4">SLA</th>
                    <th className="py-3.5 px-4">Interview Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {CITADEL_RECRUITMENT_STAGES.map((st) => (
                    <tr
                      key={st.step}
                      className={`hover:bg-slate-100 transition ${
                        st.step === 8 ? 'bg-[#FAF5EB] font-semibold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-black text-black">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-black text-xs font-black inline-flex items-center justify-center">
                          {st.step}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-black">
                        <span>{st.stageName}</span>
                        <p className="text-[11px] text-slate-600 font-normal mt-0.5 leading-snug">
                          {st.description}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-black border border-slate-200 uppercase">
                          {st.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-black">{st.primaryActor}</td>
                      <td className="py-3.5 px-4 text-slate-800 text-[11px] font-medium leading-relaxed max-w-xs">
                        {st.keyRequirement}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-black whitespace-nowrap">
                        {st.slaDays} Days
                      </td>
                      <td className="py-3.5 px-4">
                        {st.step === 8 ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                              <MapPin className="w-3 h-3" />
                              Stage 1: Physical Technical
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#DBEAFE] text-[#174EA6] border border-[#BFDBFE] block">
                              <Video className="w-3 h-3" />
                              Stage 2: Virtual Competency
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD CANDIDATE MODAL */}
      {isAddCandidateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#174EA6]" />
                <h3 className="font-bold text-sm text-slate-900">Register New Candidate in ATS</h3>
              </div>
              <button
                onClick={() => setIsAddCandidateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCandidateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={candidateForm.firstName}
                    onChange={(e) => setCandidateForm({ ...candidateForm, firstName: e.target.value })}
                    placeholder="e.g. Dapo"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={candidateForm.lastName}
                    onChange={(e) => setCandidateForm({ ...candidateForm, lastName: e.target.value })}
                    placeholder="e.g. Adeleke"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={candidateForm.email}
                    onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                    placeholder="dapo.adeleke@example.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={candidateForm.phone}
                    onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                    placeholder="+234 803 000 0000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Requisition / Role</label>
                <select
                  value={candidateForm.vacancyTitle}
                  onChange={(e) => {
                    const matchedReq = requisitions.find((r) => r.jobTitle === e.target.value);
                    setCandidateForm({
                      ...candidateForm,
                      vacancyTitle: e.target.value,
                      departmentName: matchedReq?.departmentName || 'ICT',
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37] bg-white"
                >
                  <option value="">Select Target Requisition</option>
                  {requisitions.map((r) => (
                    <option key={r.id} value={r.jobTitle}>
                      {r.jobTitle} ({r.departmentName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Candidate Profile &amp; Qualifications</label>
                <textarea
                  rows={3}
                  value={candidateForm.notes}
                  onChange={(e) => setCandidateForm({ ...candidateForm, notes: e.target.value })}
                  placeholder="Summary of experience, technical certifications, and sourcing channel..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCandidateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#174EA6] text-white rounded-xl text-xs font-bold hover:bg-[#062d26] transition cursor-pointer shadow-xs"
                >
                  Save Candidate to ATS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SCHEDULE INTERVIEW MODAL */}
      {isScheduleInterviewOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#174EA6]" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Schedule Candidate Interview</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{selectedCandidate.fullName} · {selectedCandidate.vacancyTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setIsScheduleInterviewOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleInterviewSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Interview Assessment Stage (Sheet 8)</label>
                <select
                  value={interviewForm.title}
                  onChange={(e) => setInterviewForm({ ...interviewForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37] bg-white"
                >
                  <option value="Stage 1: Physical Technical Interview">Stage 1: Physical Technical Interview (Technical Competencies &amp; Whiteboard)</option>
                  <option value="Stage 2: Virtual Competency Assessment">Stage 2: Virtual Competency Assessment (Values &amp; Leadership Alignment)</option>
                  <option value="Stage 3: Executive GEC Final Panel">Stage 3: Executive GEC Final Panel (Leadership Ratification)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Lead Interviewer / Panelist</label>
                <input
                  type="text"
                  required
                  value={interviewForm.interviewerName}
                  onChange={(e) => setInterviewForm({ ...interviewForm, interviewerName: e.target.value })}
                  placeholder="e.g. Sussan Afuwape (PCCM) / Pastor Segun Bakare (ICT)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Interview Date</label>
                  <input
                    type="date"
                    required
                    value={interviewForm.scheduledDate}
                    onChange={(e) => setInterviewForm({ ...interviewForm, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Time</label>
                  <input
                    type="text"
                    value={interviewForm.scheduledTime}
                    onChange={(e) => setInterviewForm({ ...interviewForm, scheduledTime: e.target.value })}
                    placeholder="10:00 AM"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Meeting Venue / Conference Room</label>
                <input
                  type="text"
                  value={interviewForm.location}
                  onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })}
                  placeholder="Citadel Executive Boardroom / MS Teams link"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Panel Instructions &amp; Focus Areas</label>
                <textarea
                  rows={2}
                  value={interviewForm.notes}
                  onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleInterviewOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#174EA6] text-white rounded-xl text-xs font-bold hover:bg-[#062d26] transition cursor-pointer shadow-xs"
                >
                  Confirm &amp; Notify Panel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD INTERVIEW RESULT MODAL */}
      {isRecordResultOpen && selectedInterview && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#174EA6]" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Record Assessment Evaluation</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{selectedCandidate.fullName} · {selectedInterview.title}</p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordResultOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordResultSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Interview Assessment Outcome *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setResultForm({ ...resultForm, result: 'Passed' })}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                      resultForm.result === 'Passed'
                        ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#174EA6] ring-2 ring-[#174EA6]/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#174EA6]" />
                    <span>Candidate Passed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResultForm({ ...resultForm, result: 'Failed' })}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                      resultForm.result === 'Failed'
                        ? 'bg-[#F5F7FA] border-[#111827]/25 text-[#111827] ring-2 ring-[#111827]/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <X className="w-4 h-4 text-[#111827]" />
                    <span>Candidate Failed</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Overall Rating: <span className="text-[#174EA6] font-black">{resultForm.rating} / 5</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={resultForm.rating}
                  onChange={(e) => setResultForm({ ...resultForm, rating: Number(e.target.value) })}
                  className="w-full accent-[#174EA6] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                  <span>1 - Unsatisfactory</span>
                  <span>3 - Meets Expectations</span>
                  <span>5 - Exceptional Fit</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Panel Assessment Notes &amp; Recommendations</label>
                <textarea
                  rows={3}
                  required
                  value={resultForm.notes}
                  onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })}
                  placeholder="Provide specific feedback on technical competence, communication, and recommendation for offer extension..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordResultOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#174EA6] text-white rounded-xl text-xs font-bold hover:bg-[#062d26] transition cursor-pointer shadow-xs"
                >
                  Record Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Requisition Modal with Chevron Stepper */}
      <CreateRequisitionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleRequisitionCreated}
        entities={entities}
        departments={departments}
        employees={employees}
      />
    </div>
  );
};
