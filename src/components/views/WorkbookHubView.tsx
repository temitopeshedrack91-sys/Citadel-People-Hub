import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  GitBranch,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCheck,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { employeeRepository, governanceRepository, leaveRepository } from '../../services';
import type { Employee, LeaveRequest } from '../../types';
import {
  WORKBOOK_PROJECT_SCOPE,
  WORKBOOK_ENTITIES,
  WORKBOOK_DEPARTMENTS,
  WORKBOOK_ROLE_SPECS,
  WORKBOOK_AMBIGUITIES_REGISTER,
  WORKBOOK_SECURITY_CONTROLS,
  WORKBOOK_V1_PRIORITIES,
  WORKBOOK_FUTURE_ROADMAP,
  WORKBOOK_LEGACY_DATA_SOURCES,
  WORKBOOK_DOCUMENT_POLICIES,
  WORKBOOK_RECRUITMENT_STAGES,
  WORKBOOK_NOTIFICATION_RULES,
  WORKBOOK_M365_SERVICES,
  WORKBOOK_AI_GOVERNANCE_RULES,
  WORKBOOK_REPORT_SPECS,
  EMPLOYEE_MASTER_FIELDS,
  DEFAULT_PRE_ONBOARDING_STEPS,
  mapAppRoleToWorkbookRole,
  getReportingChainForDepartment,
  evaluateWorkbookPermission,
  createProfileChangeRequest,
  reviewProfileChangeRequest,
  applyApprovedChangeRequest,
  createLifecycleEvent,
  applyApprovedLifecycleEvent,
  evaluateEmployeeCompleteness,
  evaluateDocumentExpiry,
  validateBioDataMigrationCsv,
  generateSampleBioDataMigrationCsv,
  canAdvanceRecruitmentStage,
  advanceRecruitmentStage,
  calculateAssessmentWeightedScore,
  recordHrAssessmentDecision,
  evaluateTwoStageInterview,
  canActivateEmployeeFromPreOnboarding,
  generateWorkbookReport,
  exportReportToCsv,
  type ProfileChangeRequest,
  type LifecycleEventRecord,
  type LifecycleEventType,
  type RecruitmentWorkflowCase,
  type ApplicantAssessmentRecord,
  type PreOnboardingStepRecord,
  type WorkbookReportId,
  type GovernanceAction,
  type WorkbookRole,
} from '../../domain/workbook';

type HubTab = 'approvals' | 'org' | 'recruitment' | 'migration' | 'readiness';

export const WorkbookHubView: React.FC = () => {
  const { currentUser } = useAuth();
  const actorWorkbookRole = mapAppRoleToWorkbookRole(currentUser.role);
  const isHrAdmin = actorWorkbookRole === 'SUPER_ADMIN_HR';

  const [activeTab, setActiveTab] = useState<HubTab>('approvals');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab 1: Profile Change Requests & Lifecycle Events (Sheets 4, 5, 14)
  const [changeRequests, setChangeRequests] = useState<ProfileChangeRequest[]>([]);
  const [lifecycleEvents, setLifecycleEvents] = useState<LifecycleEventRecord[]>([]);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>('phone');
  const [proposedValue, setProposedValue] = useState<string>('');
  const [changeReason, setChangeReason] = useState<string>('');
  const [rejectComments, setRejectComments] = useState<Record<string, string>>({});

  // Lifecycle form state
  const [lifecycleEmpId, setLifecycleEmpId] = useState<string>('');
  const [lifecycleType, setLifecycleType] = useState<LifecycleEventType>('CONFIRMATION');
  const [lifecycleTrigger, setLifecycleTrigger] = useState<string>('Completed 6-month probation assessment');
  const [lifecycleDetail, setLifecycleDetail] = useState<string>('');

  // Tab 2: Org & Role Simulator (Sheets 3 & 4)
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('ALL');
  const [simRole, setSimRole] = useState<WorkbookRole>('BUSINESS_HEAD');
  const [simAction, setSimAction] = useState<GovernanceAction>('EDIT_ENTITY_UNIT');
  const [simSameScope, setSimSameScope] = useState<boolean>(true);

  // Tab 3: Recruitment 10-Stage + Assessments + Two-Stage Interviews + Pre-Onboarding (Sheets 9–12)
  const [recCase, setRecCase] = useState<RecruitmentWorkflowCase>({
    id: 'REC-2026-01',
    jobTitle: 'Network & Systems Administrator',
    department: 'ICT',
    entity: 'CGCC',
    currentStage: 'VACANCY_IDENTIFIED',
    stageData: {
      reasonForVacancy: 'Campus broadcast & network expansion',
      position: 'Network & Systems Administrator',
      department: 'ICT',
      jobTitle: 'Network & Systems Administrator',
      justification: 'Support growing Sunday & CSOG broadcast load',
      proposedSalaryBand: 'L3 (NGN 450k - 600k)',
      reportingLine: 'ICT Manager -> Pastor Segun Bakare',
      jobDescription: 'Manage campus LAN, Wi-Fi, biometric terminals & M365',
      qualifications: 'B.Sc Computer Science / Engineering',
      competencies: 'Cisco/MikroTik, M365 Admin, Helpdesk SLA',
      kpis: '99.9% network uptime, <2h ticket resolution',
      approvedJd: 'JD-ICT-2026-v1',
      advertCopy: 'Now hiring Network & Systems Administrator at CGCC Oregun',
      applicationDeadline: '2026-12-20',
      candidateCv: 'Chinedu_Okafor_CV.pdf',
      applicationForm: 'MS-Form-Submission-104',
      candidateDetails: 'Chinedu Okafor (c.okafor@example.com)',
      screeningCriteria: 'Min 3 yrs networking + M365 experience',
      interviewQuestions: 'Technical Lab + Citadel Culture Competency Pack',
      scorecard: 'Weighted 2-Stage Rubric',
      candidateProfile: 'Shortlisted #1 Candidate',
      interviewScores: 'Stage 1: 4.4 / 5.0 | Stage 2: 4.2 / 5.0',
      assessmentResults: '86% (HR Passed)',
      recommendation: 'Recommended for formal offer',
      referenceCheckResults: '2 verified employer references cleared',
    },
    approvalsGranted: {},
    notificationsSent: [],
    interviewStage1Passed: true,
    interviewStage2Passed: true,
  });
  const [techScore, setTechScore] = useState<number>(4.4);
  const [compScore, setCompScore] = useState<number>(4.2);
  const [assessment, setAssessment] = useState<ApplicantAssessmentRecord>({
    id: 'ASMT-101',
    candidateName: 'Chinedu Okafor',
    jobRole: 'Network & Systems Administrator',
    assessmentType: 'Technical',
    scoringMethod: 'Weighted Rubric (0-100)',
    aiAssistanceUsed: true,
    aiDraftSummary: 'AI draft suggests strong troubleshooting depth; awaiting HR final decision.',
    scores: [
      { criterionId: 'c1', score: 44, maxScore: 50, weightPercent: 60 },
      { criterionId: 'c2', score: 33, maxScore: 40, weightPercent: 40 },
    ],
    weightedScorePercent: calculateAssessmentWeightedScore([
      { score: 44, maxScore: 50, weightPercent: 60 },
      { score: 33, maxScore: 40, weightPercent: 40 },
    ]),
    hrFinalDecision: 'PENDING',
  });
  const [preSteps, setPreSteps] = useState<PreOnboardingStepRecord[]>(DEFAULT_PRE_ONBOARDING_STEPS);

  // Tab 4: Migration & Reports (Sheets 6, 16–22)
  const [migrationCsv, setMigrationCsv] = useState<string>(() => generateSampleBioDataMigrationCsv());
  const [selectedReportId, setSelectedReportId] = useState<WorkbookReportId>('PROFILE_COMPLETENESS');
  const [reportEntityFilter, setReportEntityFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [empData, leaveData, govChanges, govLifecycle] = await Promise.all([
          employeeRepository.getAll(),
          leaveRepository.getAll().catch(() => [] as LeaveRequest[]),
          governanceRepository.listProfileChangeRequests().catch(() => [] as ProfileChangeRequest[]),
          governanceRepository.listLifecycleEvents().catch(() => [] as LifecycleEventRecord[]),
        ]);
        if (!active) return;
        setEmployees(empData);
        setLeaves(leaveData);
        setChangeRequests(govChanges);
        setLifecycleEvents(govLifecycle);
        if (empData.length > 0 && !lifecycleEmpId) {
          setLifecycleEmpId(empData[0].id);
        }
      } catch {
        // ignore
      }
    };
    void load();
    const onAuthChanged = () => void load();
    window.addEventListener('citadel:auth-changed', onAuthChanged);
    return () => {
      active = false;
      window.removeEventListener('citadel:auth-changed', onAuthChanged);
    };
  }, [currentUser.id, currentUser.role]);

  const selfEmployee = useMemo(
    () =>
      employees.find(
        (e) =>
          String(e.id) === String(currentUser.employeeId || currentUser.id) ||
          (currentUser.staffId && e.staffId === currentUser.staffId)
      ) || employees[0],
    [employees, currentUser]
  );

  const employeeEditableFields = useMemo(
    () => EMPLOYEE_MASTER_FIELDS.filter((f) => f.editPolicy === 'EMPLOYEE_WITH_HR_APPROVAL'),
    []
  );
  const hrOnlyFields = useMemo(
    () => EMPLOYEE_MASTER_FIELDS.filter((f) => f.editPolicy === 'HR_SUPER_ADMIN_ONLY'),
    []
  );

  const migrationReport = useMemo(() => validateBioDataMigrationCsv(migrationCsv), [migrationCsv]);

  const generatedReport = useMemo(
    () =>
      generateWorkbookReport({
        reportId: selectedReportId,
        employees,
        leaves,
        entityFilter: reportEntityFilter,
      }),
    [selectedReportId, employees, leaves, reportEntityFilter]
  );

  const interviewEval = useMemo(
    () =>
      evaluateTwoStageInterview({
        stage1Interviewers: ['ICT Manager', 'Senior Systems Engineer'],
        stage1Criteria: [{ criterion: 'Physical Technical Lab & Architecture', weightPercent: 100, score: techScore }],
        stage2Interviewers: ['People, Culture & Change Manager', 'Business Head'],
        stage2Criteria: [{ criterion: 'Virtual Competency & Citadel Culture Alignment', weightPercent: 100, score: compScore }],
      }),
    [techScore, compScore]
  );

  const preOnboardingGate = useMemo(() => canActivateEmployeeFromPreOnboarding(preSteps), [preSteps]);

  const roleSimResult = useMemo(
    () =>
      evaluateWorkbookPermission({
        actorRole: simRole,
        action: simAction,
        actorEntityId: 'entity-csog',
        targetEntityId: simSameScope ? 'entity-csog' : 'entity-holdings',
        actorDepartmentId: 'dept-cgcc-ict',
        targetDepartmentId: simSameScope ? 'dept-cgcc-ict' : 'dept-cgcc-fin',
        actorEmployeeId: 'emp-4',
        targetEmployeeId: simSameScope ? 'emp-4' : 'emp-1',
      }),
    [simRole, simAction, simSameScope]
  );

  const handleSubmitProfileChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    if (!selfEmployee) {
      setBanner({ type: 'error', text: 'No employee profile loaded.' });
      return;
    }
    try {
      const created = createProfileChangeRequest({
        employee: selfEmployee,
        actorRole: actorWorkbookRole,
        actorName: currentUser.name,
        proposedChanges: { [selectedFieldKey]: proposedValue.trim() },
        reason: changeReason,
      });
      const persisted = await governanceRepository.createProfileChangeRequest(created);
      setChangeRequests((prev) => [persisted, ...prev]);

      if (persisted.status === 'APPROVED') {
        const patched = applyApprovedChangeRequest(selfEmployee, persisted);
        const saved = await employeeRepository.update(selfEmployee.id, patched);
        setEmployees((prev) => prev.map((emp) => (emp.id === saved.id ? saved : emp)));
      }

      setProposedValue('');
      setChangeReason('');
      setBanner({
        type: 'success',
        text:
          persisted.status === 'PENDING_HR_APPROVAL'
            ? 'Profile change request submitted and queued for mandatory HR approval (Sheet 5).'
            : 'HR update applied directly to the employee master record.',
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to submit change request.' });
    }
  };

  const handleReviewChange = async (req: ProfileChangeRequest, decision: 'APPROVED' | 'REJECTED') => {
    setBanner(null);
    try {
      const reviewed = reviewProfileChangeRequest({
        request: req,
        reviewerRole: actorWorkbookRole,
        reviewerName: currentUser.name,
        decision,
        comments: rejectComments[req.id],
      });
      const persisted = await governanceRepository.reviewProfileChangeRequest(
        req.id,
        decision,
        rejectComments[req.id],
        reviewed
      );
      setChangeRequests((prev) => prev.map((item) => (item.id === req.id ? persisted : item)));

      if (decision === 'APPROVED') {
        const targetEmp = employees.find((e) => e.id === req.employeeId);
        if (targetEmp) {
          const patched = applyApprovedChangeRequest(targetEmp, persisted);
          const saved = await employeeRepository.update(targetEmp.id, patched);
          setEmployees((prev) => prev.map((emp) => (emp.id === saved.id ? saved : emp)));
        }
      }
      setBanner({
        type: 'success',
        text:
          decision === 'APPROVED'
            ? `Approved and committed bio-data change for ${req.employeeName}.`
            : `Rejected profile change request for ${req.employeeName}.`,
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to process review decision.' });
    }
  };

  const handleExecuteLifecycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const target = employees.find((emp) => emp.id === lifecycleEmpId);
    if (!target) return;

    try {
      const changes: Record<string, string> = {};
      if (lifecycleType === 'PROMOTION' && lifecycleDetail.trim()) {
        changes.jobTitle = lifecycleDetail.trim();
      } else if (lifecycleType === 'TRANSFER' && lifecycleDetail.includes('|')) {
        const [ent, dept] = lifecycleDetail.split('|').map((s) => s.trim());
        changes.entityName = ent;
        changes.departmentName = dept;
      }

      const draft = createLifecycleEvent({
        eventType: lifecycleType,
        employee: target,
        trigger: lifecycleTrigger,
        effectiveDate: new Date().toISOString().split('T')[0],
        changes,
      });

      if (isHrAdmin) {
        const applied = applyApprovedLifecycleEvent(target, draft, actorWorkbookRole, currentUser.name);
        const createdEvt = await governanceRepository.createLifecycleEvent(applied.event);
        const approvedEvt =
          createdEvt.status === 'APPLIED'
            ? createdEvt
            : await governanceRepository.approveLifecycleEvent(createdEvt.id, applied.event);
        const saved = await employeeRepository.update(target.id, applied.employee);
        setEmployees((prev) => prev.map((emp) => (emp.id === saved.id ? saved : emp)));
        setLifecycleEvents((prev) => [approvedEvt, ...prev]);
        setBanner({
          type: 'success',
          text: `${lifecycleType} approved and applied to ${target.fullName} (Sheet 14).`,
        });
      } else {
        const createdEvt = await governanceRepository.createLifecycleEvent(draft);
        setLifecycleEvents((prev) => [createdEvt, ...prev]);
        setBanner({
          type: 'success',
          text: `${lifecycleType} submitted for HR approval.`,
        });
      }
      setLifecycleDetail('');
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to execute lifecycle event.' });
    }
  };

  const handleDownloadCsvReport = () => {
    const csv = exportReportToCsv(generatedReport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedReport.reportId.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingApprovalsCount = changeRequests.filter((r) => r.status === 'PENDING_HR_APPROVAL').length;
  const selfCompleteness = selfEmployee ? evaluateEmployeeCompleteness(selfEmployee) : null;
  const currentStageSpec =
    WORKBOOK_RECRUITMENT_STAGES.find((s) => s.code === recCase.currentStage) || WORKBOOK_RECRUITMENT_STAGES[0];
  const stageAdvanceCheck = canAdvanceRecruitmentStage(
    { ...recCase, interviewStage1Passed: interviewEval.stage1TechnicalPhysical.passed, interviewStage2Passed: interviewEval.stage2CompetencyVirtual.passed },
    actorWorkbookRole
  );

  return (
    <div className="space-y-5" data-testid="workbook-hub-view">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#174EA6]">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <span>Citadel People Hub · 24-Sheet Requirements Governance &amp; Operations</span>
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900 mt-1">
            HR Governance, Master Data Approvals &amp; Workbook Operations
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 max-w-3xl">
            Target V1 Launch: <strong className="text-slate-900">{WORKBOOK_PROJECT_SCOPE.targetLaunchDate}</strong> · Active Role:{' '}
            <strong className="text-[#174EA6]">{WORKBOOK_ROLE_SPECS[actorWorkbookRole].label}</strong> (Scope:{' '}
            {WORKBOOK_ROLE_SPECS[actorWorkbookRole].scope.replace(/_/g, ' ')})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className="block text-[10px] uppercase font-bold text-slate-500">Entities / Depts</span>
            <span className="font-mono font-bold text-slate-900">
              {WORKBOOK_ENTITIES.length} Entities · {WORKBOOK_DEPARTMENTS.length} Depts
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#FAF5EB] border border-[#E9D59A]">
            <span className="block text-[10px] uppercase font-bold text-[#B88A24]">Pending HR Approvals</span>
            <span className="font-mono font-bold text-[#B88A24]" data-testid="pending-change-count">
              {pendingApprovalsCount} Request{pendingApprovalsCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {banner && (
        <div
          data-testid="workbook-hub-banner"
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            banner.type === 'success'
              ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#174EA6]'
              : 'bg-[#F5F7FA] border-[#111827]/25 text-[#111827]'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#174EA6]" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0 text-[#111827]" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div role="tablist" aria-label="Governance Hub Sections" className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {(
          [
            { id: 'approvals', label: 'Master Data Approvals & Lifecycle (S4, S5, S14)' },
            { id: 'org', label: 'Org Structure & Role Governance (S3, S4)' },
            { id: 'recruitment', label: '10-Stage Recruitment & Interviews (S9–S12)' },
            { id: 'migration', label: 'Migration, Docs & Reports (S6, S16–S22)' },
            { id: 'readiness', label: 'V1 Readiness & Workbook Audit (S1, S2, S23–S24)' },
          ] as Array<{ id: HubTab; label: string }>
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            data-testid={`gov-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#174EA6] text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: MASTER DATA APPROVALS & LIFECYCLE */}
      {activeTab === 'approvals' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Staged Employee Bio-Data Change Request Form */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Employee Bio-Data Update Request (Sheet 5 · 24 Mandatory Fields)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Employees can only propose edits to the 11 approved self-service fields; HR approval is required before live records update.
                </p>
              </div>
              {selfCompleteness && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Profile Score</span>
                  <span className="font-mono text-sm font-bold text-[#174EA6]">
                    {selfCompleteness.completedCount}/{selfCompleteness.totalFields} ({selfCompleteness.percentComplete}%)
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitProfileChange} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="gov-field-select" className="block font-semibold text-slate-700 mb-1">
                    Select Field to Update
                  </label>
                  <select
                    id="gov-field-select"
                    value={selectedFieldKey}
                    onChange={(e) => setSelectedFieldKey(e.target.value)}
                    data-testid="profile-change-field-select"
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-900"
                  >
                    <optgroup label="Employee-Editable (Requires HR Approval — 11 Fields)">
                      {employeeEditableFields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label} ({f.priority})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="HR / Super Admin Only (Locked for Staff — 13 Fields)">
                      {hrOnlyFields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label} [HR Only]
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label htmlFor="gov-new-value" className="block font-semibold text-slate-700 mb-1">
                    Proposed New Value *
                  </label>
                  <input
                    id="gov-new-value"
                    type="text"
                    required
                    value={proposedValue}
                    onChange={(e) => setProposedValue(e.target.value)}
                    data-testid="profile-change-value-input"
                    placeholder="Enter updated value (no passwords or bank PINs)"
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="gov-change-reason" className="block font-semibold text-slate-700 mb-1">
                  Reason / Supporting Note *
                </label>
                <input
                  id="gov-change-reason"
                  type="text"
                  required
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  data-testid="profile-change-reason-input"
                  placeholder="e.g. Updated residential address or phone number"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>All 24 fields are marked Sensitive &amp; protected against PIN/password leaks.</span>
                </span>
                <button
                  type="submit"
                  data-testid="profile-change-submit-btn"
                  className="px-4 py-2 rounded-lg bg-[#174EA6] hover:bg-[#0B1F3A] text-white font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                >
                  {isHrAdmin ? 'Apply HR Update' : 'Submit for HR Approval'}
                </button>
              </div>
            </form>

            {/* HR Pending Change Request Approval Queue */}
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Profile Change Approval Queue ({changeRequests.length})
              </h4>
              {changeRequests.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  No profile change requests submitted yet. Submit an edit above to test the Sheet 5 HR approval gate.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {changeRequests.map((req) => (
                    <div
                      key={req.id}
                      data-testid={`change-request-${req.id}`}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900">{req.employeeName}</span>
                          <span className="ml-2 font-mono text-[11px] text-slate-500">{req.employeeStaffId}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                            req.status === 'APPROVED'
                              ? 'bg-[#DBEAFE] text-[#174EA6]'
                              : req.status === 'REJECTED'
                                ? 'bg-[#E5E7EB] text-[#111827]'
                                : 'bg-[#FAF5EB] text-[#B88A24]'
                          }`}
                        >
                          {req.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-700">
                        {Object.entries(req.proposedChanges).map(([k, v]) => (
                          <div key={k}>
                            <strong>{k}</strong>: <span className="line-through text-slate-400">{req.previousValues[k] || '(empty)'}</span> →{' '}
                            <span className="font-semibold text-[#174EA6]">{v}</span>
                          </div>
                        ))}
                        <p className="text-slate-500 mt-0.5">Reason: {req.reason}</p>
                      </div>
                      {isHrAdmin && req.status === 'PENDING_HR_APPROVAL' && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={rejectComments[req.id] || ''}
                            onChange={(e) => setRejectComments((prev) => ({ ...prev, [req.id]: e.target.value }))}
                            placeholder="Optional comment / required rejection reason"
                            className="flex-1 min-w-[160px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px]"
                          />
                          <button
                            type="button"
                            data-testid="approve-change-btn"
                            onClick={() => void handleReviewChange(req, 'APPROVED')}
                            className="px-3 py-1.5 rounded-lg bg-[#174EA6] hover:bg-[#174EA6] text-white font-semibold text-[11px] cursor-pointer"
                          >
                            Approve &amp; Commit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReviewChange(req, 'REJECTED')}
                            className="px-3 py-1.5 rounded-lg bg-[#F5F7FA] hover:bg-[#E5E7EB] text-[#111827] border border-[#111827]/25 font-semibold text-[11px] cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Employee Lifecycle Engine (Sheet 14) */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#174EA6]" />
                <span>Employee Lifecycle Actions (Sheet 14)</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Execute Confirmation (unlocks Sheet 7 Confirmed Leave eligibility), Promotion, or Entity/Department Transfer (validated against Sheet 3).
              </p>
            </div>

            <form onSubmit={handleExecuteLifecycle} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="lc-emp" className="block font-semibold text-slate-700 mb-1">
                    Employee
                  </label>
                  <select
                    id="lc-emp"
                    value={lifecycleEmpId}
                    onChange={(e) => setLifecycleEmpId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-900"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.staffId}) — {emp.status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="lc-type" className="block font-semibold text-slate-700 mb-1">
                    Lifecycle Event
                  </label>
                  <select
                    id="lc-type"
                    value={lifecycleType}
                    onChange={(e) => setLifecycleType(e.target.value as LifecycleEventType)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-900"
                  >
                    <option value="CONFIRMATION">Confirmation (Permanent Status)</option>
                    <option value="PROMOTION">Promotion / New Title</option>
                    <option value="TRANSFER">Entity / Department Transfer</option>
                    <option value="SUSPENSION">Disciplinary Suspension</option>
                  </select>
                </div>
              </div>

              {(lifecycleType === 'PROMOTION' || lifecycleType === 'TRANSFER') && (
                <div>
                  <label htmlFor="lc-detail" className="block font-semibold text-slate-700 mb-1">
                    {lifecycleType === 'PROMOTION' ? 'New Job Title' : 'Target Entity | Department (e.g. CSOG | Admin & Operations)'}
                  </label>
                  <input
                    id="lc-detail"
                    type="text"
                    value={lifecycleDetail}
                    onChange={(e) => setLifecycleDetail(e.target.value)}
                    placeholder={lifecycleType === 'PROMOTION' ? 'Senior Operations Lead' : 'CSOG | Admin & Operations'}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900"
                  />
                </div>
              )}

              <div>
                <label htmlFor="lc-trigger" className="block font-semibold text-slate-700 mb-1">
                  Trigger / Justification
                </label>
                <input
                  id="lc-trigger"
                  type="text"
                  value={lifecycleTrigger}
                  onChange={(e) => setLifecycleTrigger(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#174EA6] hover:bg-[#0B1F3A] text-white font-semibold cursor-pointer"
                >
                  {isHrAdmin ? 'Approve & Apply Lifecycle Event' : 'Submit Lifecycle Request'}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-slate-200 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recent Lifecycle Log ({lifecycleEvents.length})
              </h4>
              {lifecycleEvents.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No lifecycle transactions recorded in this session.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {lifecycleEvents.map((ev) => (
                    <div key={ev.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900">
                          {ev.eventType} — {ev.employeeName}
                        </span>
                        <p className="text-[11px] text-slate-600">{ev.trigger} · Effective {ev.effectiveDate}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#DBEAFE] text-[#174EA6] font-semibold text-[11px]">
                        {ev.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: ORG STRUCTURE & ROLE GOVERNANCE (SHEETS 3 & 4) */}
      {activeTab === 'org' && (
        <div className="space-y-5">
          {/* 3 Entities & Business Heads */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {WORKBOOK_ENTITIES.map((ent) => (
              <div key={ent.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#174EA6]">{ent.shortCode}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#174EA6]">
                    GEC Business Heads
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{ent.name}</h3>
                <ul className="text-xs text-slate-700 space-y-1">
                  {ent.businessHeads.map((bh) => (
                    <li key={bh} className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>{bh}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* 15 Departments Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Sheet 3 Department &amp; GEC Shared Services Directory ({WORKBOOK_DEPARTMENTS.length} Departments)
              </h3>
              <select
                aria-label="Filter departments by entity"
                value={selectedEntityFilter}
                onChange={(e) => setSelectedEntityFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
              >
                <option value="ALL">All 3 Entities (15)</option>
                <option value="CGCC">CGCC (8)</option>
                <option value="CSOG">Citadel School of Government (2)</option>
                <option value="HOLDINGS">Citadel Holdings (5)</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2 pr-3">Entity</th>
                    <th className="py-2 pr-3">Department</th>
                    <th className="py-2 pr-3">Department Head</th>
                    <th className="py-2 pr-3">Head Email</th>
                    <th className="py-2 pr-3">Reporting Chain</th>
                    <th className="py-2">GEC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {WORKBOOK_DEPARTMENTS.filter(
                    (d) => selectedEntityFilter === 'ALL' || d.entityShortCode === selectedEntityFilter
                  ).map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-3 font-mono font-semibold text-slate-600">{dept.entityShortCode}</td>
                      <td className="py-2.5 pr-3 font-bold text-slate-900">{dept.departmentName}</td>
                      <td className="py-2.5 pr-3 text-slate-700">{dept.departmentHeadTitle}</td>
                      <td className="py-2.5 pr-3 font-mono text-[11px]">
                        {dept.headEmail ? (
                          <span className="text-slate-800">{dept.headEmail}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#FAF5EB] text-[#B88A24] font-semibold">TBD</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-[11px] text-slate-600">
                        {getReportingChainForDepartment(dept.id).join(' → ')}
                      </td>
                      <td className="py-2.5">
                        {dept.isGecSharedService ? (
                          <span className="px-2 py-0.5 rounded bg-[#DBEAFE] text-[#174EA6] font-semibold text-[10px]">
                            GEC Shared
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Unit</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Role Governance Simulator (Sheet 4) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Sheet 4 Interactive Role &amp; Approval-Gate Evaluator (5 Workbook Roles)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={simRole}
                  onChange={(e) => setSimRole(e.target.value as WorkbookRole)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  {Object.values(WORKBOOK_ROLE_SPECS).map((spec) => (
                    <option key={spec.role} value={spec.role}>
                      {spec.label} ({spec.scope.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Action</label>
                <select
                  value={simAction}
                  onChange={(e) => setSimAction(e.target.value as GovernanceAction)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="EDIT_ANY_MODULE">Edit Any Platform Module</option>
                  <option value="EDIT_ENTITY_UNIT">Create / Edit Own Business Unit</option>
                  <option value="EDIT_TEAM_PERFORMANCE">Create / Edit Team Performance</option>
                  <option value="UPLOAD_OWN_PROFILE_OR_DOCS">Upload Own Bio-Data / CV / Certs</option>
                  <option value="EDIT_TECHNICAL_BACKEND">Edit Technical / Backend Config</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 w-full cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={simSameScope}
                    onChange={(e) => setSimSameScope(e.target.checked)}
                  />
                  <span>Target is within actor&apos;s own scope</span>
                </label>
              </div>
            </div>
            <div
              className={`p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                roleSimResult.allowed
                  ? roleSimResult.requiresApproval
                    ? 'bg-[#FAF5EB] border-[#E9D59A] text-[#B88A24]'
                    : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#174EA6]'
                  : 'bg-[#F5F7FA] border-[#111827]/25 text-[#D4AF37]'
              }`}
            >
              <div>
                <strong>
                  {roleSimResult.allowed
                    ? roleSimResult.requiresApproval
                      ? 'ALLOWED WITH MANDATORY APPROVAL'
                      : 'ALLOWED DIRECTLY'
                    : 'DENIED (403)'}
                </strong>
                <p className="mt-0.5">{roleSimResult.reason}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RECRUITMENT 10-STAGE, ASSESSMENTS, 2-STAGE INTERVIEWS & PRE-ONBOARDING */}
      {activeTab === 'recruitment' && (
        <div className="space-y-5">
          {/* 10-Stage Recruitment State Machine */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[#174EA6]" />
                  <span>Sheet 9 — 10-Stage Recruitment Workflow ({recCase.jobTitle})</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Current Stage: <strong>Step {currentStageSpec.step} — {currentStageSpec.name}</strong> (Performer: {currentStageSpec.performer} · Approval: {currentStageSpec.approvalNeeded})
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {currentStageSpec.approvalNeeded !== 'No' && !recCase.approvalsGranted[currentStageSpec.code] && (
                  <button
                    type="button"
                    data-testid="rec-grant-approval-btn"
                    onClick={() =>
                      setRecCase((prev) => ({
                        ...prev,
                        approvalsGranted: {
                          ...prev.approvalsGranted,
                          [currentStageSpec.code]: { approver: currentUser.name, approvedAt: new Date().toISOString() },
                        },
                      }))
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#B88A24] hover:bg-[#B88A24] text-white font-semibold cursor-pointer"
                  >
                    Grant Stage Approval
                  </button>
                )}
                <button
                  type="button"
                  data-testid="rec-advance-stage-btn"
                  disabled={!stageAdvanceCheck.allowed}
                  onClick={() => {
                    try {
                      const next = advanceRecruitmentStage(
                        {
                          ...recCase,
                          interviewStage1Passed: interviewEval.stage1TechnicalPhysical.passed,
                          interviewStage2Passed: interviewEval.stage2CompetencyVirtual.passed,
                        },
                        actorWorkbookRole
                      );
                      setRecCase(next);
                      setBanner({ type: 'success', text: `Advanced recruitment case to ${next.currentStage.replace(/_/g, ' ')}.` });
                    } catch (err: any) {
                      setBanner({ type: 'error', text: err?.message });
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#174EA6] hover:bg-[#0B1F3A] text-white font-semibold cursor-pointer disabled:opacity-40"
                >
                  Advance to Next Stage
                </button>
              </div>
            </div>

            {!stageAdvanceCheck.allowed && (
              <div className="p-2.5 rounded-lg bg-[#FAF5EB] border border-[#E9D59A] text-[#B88A24] text-xs">
                {stageAdvanceCheck.errors.join(' ')}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              {WORKBOOK_RECRUITMENT_STAGES.map((st) => {
                const isActive = st.code === recCase.currentStage;
                const isDone = st.step < currentStageSpec.step;
                return (
                  <div
                    key={st.code}
                    className={`p-2.5 rounded-xl border ${
                      isActive
                        ? 'bg-[#174EA6] text-white border-[#174EA6]'
                        : isDone
                          ? 'bg-[#EFF6FF] text-[#174EA6] border-[#BFDBFE]'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <div className="font-mono font-bold text-[10px] opacity-80">STEP {st.step}</div>
                    <div className="font-bold mt-0.5 leading-snug">{st.name}</div>
                    <div className="text-[10px] mt-1 opacity-80">Approval: {st.approvalNeeded}</div>
                  </div>
                );
              })}
            </div>

            {recCase.notificationsSent.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-800">Automated Candidate Notifications Triggered</div>
                {recCase.notificationsSent.map((n, i) => (
                  <div key={i} className="text-slate-600">
                    • <strong>{n.stage.replace(/_/g, ' ')}</strong>: {n.message}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Sheets 10, 11 & 12 Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Sheet 10: Assessment + HR Final Decision Gate */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-slate-900">Sheet 10 — Applicant Assessment</h3>
              <p className="text-slate-600">{assessment.candidateName} · {assessment.jobRole}</p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span>Weighted Score</span>
                <span className="font-mono text-base font-bold text-[#174EA6]">{assessment.weightedScorePercent}%</span>
              </div>
              <p className="text-[11px] text-slate-600">{assessment.aiDraftSummary}</p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="font-semibold">HR Decision: {assessment.hrFinalDecision}</span>
                {isHrAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      setAssessment((prev) =>
                        recordHrAssessmentDecision(prev, actorWorkbookRole, currentUser.name, 'PASSED')
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#174EA6] text-white font-semibold cursor-pointer"
                  >
                    HR Pass
                  </button>
                )}
              </div>
            </section>

            {/* Sheet 11: Two-Stage Interview Scorecard */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-slate-900">Sheet 11 — Two-Stage Interview</h3>
              <div className="space-y-2">
                <label className="block">
                  <span className="font-semibold text-slate-700">Stage 1: Technical (Physical) Score (1–5)</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    value={techScore}
                    onChange={(e) => setTechScore(Number(e.target.value))}
                    className="mt-1 w-full p-2 rounded-lg border border-slate-200 font-mono"
                  />
                </label>
                <label className="block">
                  <span className="font-semibold text-slate-700">Stage 2: Competency (Virtual) Score (1–5)</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    value={compScore}
                    onChange={(e) => setCompScore(Number(e.target.value))}
                    className="mt-1 w-full p-2 rounded-lg border border-slate-200 font-mono"
                  />
                </label>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span>Combined Score: <strong className="font-mono">{interviewEval.overallScore.toFixed(2)} / 5.0</strong></span>
                <span className={`font-bold ${interviewEval.readyForFinalSelection ? 'text-[#174EA6]' : 'text-[#111827]'}`}>
                  {interviewEval.readyForFinalSelection ? 'Ready for Offer' : 'Blocked'}
                </span>
              </div>
            </section>

            {/* Sheet 12: Pre-Onboarding Activation Gate */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-slate-900">Sheet 12 — Pre-Onboarding Gate</h3>
              <div className="space-y-2">
                {preSteps.map((step) => {
                  const done = step.candidateActionCompleted && step.hrActionCompleted && step.documentSigned && step.hrApproved;
                  return (
                    <label key={step.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setPreSteps((prev) =>
                            prev.map((s) =>
                              s.id === step.id
                                ? { ...s, candidateActionCompleted: checked, hrActionCompleted: checked, documentSigned: checked, hrApproved: checked }
                                : s
                            )
                          );
                        }}
                      />
                      <span className="font-medium text-slate-800">{step.step}</span>
                    </label>
                  );
                })}
              </div>
              <div className={`p-2.5 rounded-lg font-semibold ${preOnboardingGate.ready ? 'bg-[#DBEAFE] text-[#174EA6]' : 'bg-[#FAF5EB] text-[#B88A24]'}`}>
                {preOnboardingGate.ready
                  ? 'All steps signed & approved — Candidate ready to activate as Active Employee.'
                  : `${preOnboardingGate.incompleteSteps.length} step(s) pending before Employee activation.`}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 4: DATA MIGRATION, DOCUMENTS, NOTIFICATIONS, M365, AI & REPORTS */}
      {activeTab === 'migration' && (
        <div className="space-y-5">
          {/* Sheets 6 & 22: Bio-Data CSV Migration Validator */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#174EA6]" />
                  <span>Sheets 6 &amp; 22 — Legacy Bio-Data CSV Migration Validator (24 Mandatory Fields)</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Validates the 40-record Excel Bio Data Form against Sheet 5 required fields, Sheet 3 entity-department pairing, duplicate Staff IDs/emails, and Sheet 1 Rule 4 credential leaks.
                </p>
              </div>
              <label className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setMigrationCsv(String(reader.result || ''));
                    reader.readAsText(file);
                  }}
                />
              </label>
            </div>

            <textarea
              rows={4}
              value={migrationCsv}
              onChange={(e) => setMigrationCsv(e.target.value)}
              data-testid="migration-csv-input"
              aria-label="Employee Bio-Data CSV content"
              className="w-full p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs" data-testid="migration-summary">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Rows</span>
                <span className="font-mono text-base font-bold text-slate-900">{migrationReport.totalRows}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
                <span className="text-[10px] font-bold uppercase text-[#174EA6] block">Valid Rows</span>
                <span className="font-mono text-base font-bold text-[#174EA6]">{migrationReport.validRows}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#111827]/25">
                <span className="text-[10px] font-bold uppercase text-[#111827] block">Rows Needing Cleaning</span>
                <span className="font-mono text-base font-bold text-[#111827]">{migrationReport.invalidRows}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF5EB] border border-[#E9D59A]">
                <span className="text-[10px] font-bold uppercase text-[#B88A24] block">Credential Leaks Blocked</span>
                <span className="font-mono text-base font-bold text-[#B88A24]">{migrationReport.credentialLeakRows.length}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {migrationReport.rows.map((r) => (
                <div
                  key={r.rowNumber}
                  className={`p-3 rounded-xl border ${
                    r.valid ? 'bg-[#EFF6FF] border-[#BFDBFE]' : 'bg-[#F5F7FA] border-[#111827]/25'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>
                      Row {r.rowNumber}: {r.staffId} — {r.fullName}
                    </span>
                    <span className={r.valid ? 'text-[#174EA6]' : 'text-[#111827]'}>
                      {r.valid ? 'Ready to Import' : `${r.errors.length} Error(s)`}
                    </span>
                  </div>
                  {r.errors.length > 0 && (
                    <ul className="mt-1 text-[11px] text-[#111827] list-disc pl-4">
                      {r.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Sheet 20: Live Filterable Reports & CSV Export */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sheet 20 — Filterable HR Reports &amp; CSV Export</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Generate live compliance, headcount, leave, attendance, and recruitment reports with formula-safe CSV export.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  aria-label="Select HR report"
                  value={selectedReportId}
                  onChange={(e) => setSelectedReportId(e.target.value as WorkbookReportId)}
                  data-testid="workbook-report-select"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                >
                  {WORKBOOK_REPORT_SPECS.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.title}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter report by entity"
                  value={reportEntityFilter}
                  onChange={(e) => setReportEntityFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                >
                  <option value="all">All Entities</option>
                  <option value="church">CGCC</option>
                  <option value="government">CSOG</option>
                  <option value="holdings">Citadel Holdings</option>
                </select>
                <button
                  type="button"
                  onClick={handleDownloadCsvReport}
                  data-testid="workbook-export-csv-btn"
                  className="px-3.5 py-1.5 rounded-lg bg-[#174EA6] text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    {generatedReport.columns.map((col) => (
                      <th key={col} className="py-2 pr-3">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {generatedReport.rows.map((row, idx) => (
                    <tr key={idx}>
                      {generatedReport.columns.map((col) => (
                        <td key={col} className="py-2 pr-3 text-slate-700">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sheets 6, 16, 17, 18, 19 & 21 Summary Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900">Sheets 6 &amp; 16 — Legacy Data Sources &amp; Document Expiry Rules</h3>
              {WORKBOOK_LEGACY_DATA_SOURCES.map((src) => (
                <div key={src.id} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <div>
                    <span className="font-bold text-slate-900">{src.sourceName}</span>
                    <span className="ml-2 text-slate-500">({src.format}{src.approxRecords ? ` · ~${src.approxRecords} records` : ''})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">Migrate: {src.migrationNeeded}</span>
                </div>
              ))}
              <div className="pt-2 text-[11px] text-slate-600">
                Sample Expiry Check (Sheet 16): Passport expiring in 14 days →{' '}
                <strong className="text-[#B88A24]">
                  {evaluateDocumentExpiry('Passport', '2026-12-10', 30, '2026-11-26').state}
                </strong>{' '}
                ({WORKBOOK_DOCUMENT_POLICIES.length} document policies active).
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900">Sheets 17, 18, 19 &amp; 21 — Notifications, M365, AI &amp; Security</h3>
              <ul className="space-y-1.5 text-slate-700">
                <li>• <strong>Notifications (Sheet 17)</strong>: {WORKBOOK_NOTIFICATION_RULES.length} automated event triggers configured (Leave, Bio-Data Approval, Candidate Acknowledgement, Shortlist, Interview Invite, Late Alert, Exit Interview).</li>
                <li>• <strong>Microsoft 365 (Sheet 18)</strong>: {WORKBOOK_M365_SERVICES.length} services registered (Entra ID, Exchange, Teams, SharePoint, Forms) — awaiting client tenant credentials.</li>
                <li>• <strong>AI Governance (Sheet 19)</strong>: {WORKBOOK_AI_GOVERNANCE_RULES.length} role-scoped AI policies active with mandatory human approval on hiring/leave/attendance decisions.</li>
                <li>• <strong>Security Controls (Sheet 21)</strong>: {WORKBOOK_SECURITY_CONTROLS.length} V1 compliance controls enforced (RBAC, 24-field masking, credential guard, audit trail).</li>
              </ul>
            </section>
          </div>
        </div>
      )}

      {/* TAB 5: V1 LAUNCH READINESS & EXPLICIT AMBIGUITIES REGISTER */}
      {activeTab === 'readiness' && (
        <div className="space-y-5">
          {/* Explicit Ambiguities & Contradictions Register */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#B88A24]" />
              <h3 className="text-sm font-bold text-slate-900">
                Workbook Ambiguities, Contradictions &amp; Blank-Sheet Decisions ({WORKBOOK_AMBIGUITIES_REGISTER.length})
              </h3>
            </div>
            <div className="space-y-2.5 text-xs">
              {WORKBOOK_AMBIGUITIES_REGISTER.map((flag) => (
                <div key={flag.id} className="p-3.5 rounded-xl border border-[#E9D59A] bg-[#FAF5EB] space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      Sheet {flag.sheetNumber} ({flag.sheetName}) — {flag.severity}
                    </span>
                    {flag.needsUserDecision && (
                      <span className="px-2 py-0.5 rounded bg-amber-200 text-[#B88A24] font-semibold text-[10px]">
                        Needs HR Decision
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700">{flag.summary}</p>
                  <p className="text-[#174EA6] font-medium">
                    <strong>Implemented Interpretation:</strong> {flag.chosenInterpretation}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Sheet 23 V1 Priorities & Sheet 24 Future Roadmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#174EA6]" />
                <span>Sheet 23 — V1 Launch Priorities (October 4, 2026)</span>
              </h3>
              {WORKBOOK_V1_PRIORITIES.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{item.feature}</span>
                    <span className="px-2 py-0.5 rounded bg-[#DBEAFE] text-[#174EA6] font-semibold text-[10px]">
                      {item.implementationStatus}
                    </span>
                  </div>
                  <p className="text-slate-600">{item.acceptanceCriteria}</p>
                </div>
              ))}
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#D4AF37]" />
                <span>Sheet 24 — Future Roadmap (Phase 2 &amp; Beyond)</span>
              </h3>
              {WORKBOOK_FUTURE_ROADMAP.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{item.feature}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold text-[10px]">
                      {item.suggestedPhase}
                    </span>
                  </div>
                  <p className="text-slate-600">{item.whyItMatters}</p>
                  <p className="text-[11px] text-slate-500">Dependency: {item.dependency}</p>
                </div>
              ))}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkbookHubView;
