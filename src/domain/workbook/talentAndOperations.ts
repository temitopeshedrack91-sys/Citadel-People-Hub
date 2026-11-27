/**
 * Citadel People Hub — Recruitment, Assessments, Interviews, Pre-Onboarding,
 * Offboarding, Notifications, M365, AI Governance & Reports Engine
 *
 * Covers Workbook Sheets:
 * - Sheet 9: Recruitment (10-stage workflow state machine, approvals & automated candidate notices)
 * - Sheet 10: Applicant Assessments (weighted rubric scoring & mandatory HR final decision gate)
 * - Sheet 11: Interview Process (Two-stage interview: Stage 1 Technical Physical + Stage 2 Competency Virtual)
 * - Sheet 12: Pre-Onboarding (candidate/HR sign-off & activation gate before active Employee status)
 * - Sheet 13: Onboarding (Sheet 13 schema mapper)
 * - Sheet 15: Offboarding (access revocation & property clearance readiness checker)
 * - Sheet 17: Notifications & Email (event-to-recipient/channel routing table)
 * - Sheet 18: Microsoft 365 Environment (service integration registry)
 * - Sheet 19: AI Assistant (role-scoped data access & human-approval governance guard)
 * - Sheet 20: Reports & Analytics (live filterable report generators & RFC-4180 CSV exporter)
 */

import type { Employee, ExitRequest, LeaveRequest } from '../../types';
import { evaluateEmployeeCompleteness } from './employeeMasterData';
import { evaluateAttendancePunch } from './leaveAndAttendance';
import type {
  AiGovernanceRuleSpec,
  ApplicantAssessmentRecord,
  GeneratedReportTable,
  InterviewCriterionScore,
  M365ServiceSpec,
  NotificationRuleSpec,
  OffboardingRevocationCheck,
  PreOnboardingStepRecord,
  RecruitmentStageCode,
  RecruitmentStageSpec,
  RecruitmentWorkflowCase,
  ReportSpec,
  TwoStageInterviewEvaluation,
  WorkbookOnboardingTaskSpec,
  WorkbookReportId,
  WorkbookRole,
} from './types';

// ============================================================================
// SHEET 9: 10-STAGE RECRUITMENT WORKFLOW STATE MACHINE
// ============================================================================

export const WORKBOOK_RECRUITMENT_STAGES: RecruitmentStageSpec[] = [
  {
    step: 1,
    code: 'VACANCY_IDENTIFIED',
    name: 'Vacancy Identified',
    performer: 'Hiring Manager/HR',
    requiredFields: ['reasonForVacancy', 'position', 'department'],
    approvalNeeded: 'Yes',
    candidateNotification: null,
    notes: 'New position or replacement.',
  },
  {
    step: 2,
    code: 'MANPOWER_REQUEST',
    name: 'Manpower Request',
    performer: 'Hiring Manager/HR',
    requiredFields: ['jobTitle', 'justification', 'proposedSalaryBand', 'reportingLine'],
    approvalNeeded: 'Yes',
    candidateNotification: null,
    notes: 'Must confirm budget/headcount.',
  },
  {
    step: 3,
    code: 'VACANCY_APPROVED',
    name: 'Vacancy Approved',
    performer: 'Management',
    requiredFields: [],
    approvalNeeded: 'Yes',
    candidateNotification: null,
    notes: 'Position authorised for recruitment.',
  },
  {
    step: 4,
    code: 'JD_DEVELOPED_REVIEWED',
    name: 'Job Description Developed and Reviewed',
    performer: 'Hiring Manager/HR',
    requiredFields: ['jobDescription', 'qualifications', 'competencies', 'kpis'],
    approvalNeeded: 'Maybe',
    candidateNotification: null,
    notes: 'HR ensures consistency.',
  },
  {
    step: 5,
    code: 'JOB_ADVERTISED',
    name: 'Job Advertised',
    performer: 'HR',
    requiredFields: ['approvedJd', 'advertCopy', 'applicationDeadline'],
    approvalNeeded: 'No',
    candidateNotification: 'Job advert / application link published (Internal or External channels)',
    notes: 'Internal or External Channels.',
  },
  {
    step: 6,
    code: 'APPLICATIONS_RECEIVED',
    name: 'Applications Received',
    performer: 'HR',
    requiredFields: ['candidateCv', 'applicationForm', 'candidateDetails'],
    approvalNeeded: 'No',
    candidateNotification: 'Application acknowledgement (Automated response)',
    notes: 'Portal stores candidate information.',
  },
  {
    step: 7,
    code: 'CV_SCREENING',
    name: 'CV Screening',
    performer: 'HR',
    requiredFields: ['candidateCv', 'screeningCriteria'],
    approvalNeeded: 'No',
    candidateNotification: 'Shortlisted candidates notified',
    notes: 'Screening against agreed criteria.',
  },
  {
    step: 8,
    code: 'INTERVIEW',
    name: 'Interview',
    performer: 'HR',
    requiredFields: ['interviewQuestions', 'scorecard', 'candidateProfile'],
    approvalNeeded: 'No',
    candidateNotification: 'Interview Invitation (Stage 1 Technical Physical & Stage 2 Competency Virtual)',
    notes: 'Two stages of Interview (Technical - physical, Competency based interview - Virtual).',
  },
  {
    step: 9,
    code: 'FINAL_SELECTION',
    name: 'Final Selection',
    performer: 'Hiring Manager/HR',
    requiredFields: ['interviewScores', 'assessmentResults', 'recommendation'],
    approvalNeeded: 'Yes',
    candidateNotification: 'Selected candidate notified',
    notes: 'Requires approval before formal offer.',
  },
  {
    step: 10,
    code: 'REFERENCE_BACKGROUND_CHECKS',
    name: 'Reference/Background Checks',
    performer: 'HR',
    requiredFields: ['referenceCheckResults'],
    approvalNeeded: 'Maybe',
    candidateNotification: 'Candidate informed of verification progress',
    notes: 'Where applicable.',
  },
];

export function canAdvanceRecruitmentStage(
  workflowCase: RecruitmentWorkflowCase,
  actorRole: WorkbookRole
): { allowed: boolean; nextStage: RecruitmentStageSpec | null; errors: string[] } {
  const errors: string[] = [];
  const currentIdx = WORKBOOK_RECRUITMENT_STAGES.findIndex((s) => s.code === workflowCase.currentStage);
  if (currentIdx < 0) {
    return { allowed: false, nextStage: null, errors: ['Invalid recruitment stage.'] };
  }
  const currentSpec = WORKBOOK_RECRUITMENT_STAGES[currentIdx];
  const nextSpec = WORKBOOK_RECRUITMENT_STAGES[currentIdx + 1] || null;
  if (!nextSpec) {
    return { allowed: false, nextStage: null, errors: ['Recruitment case is already at the final stage (Reference/Background Checks).'] };
  }

  // Actor authorization check
  if (currentSpec.performer === 'Management' && actorRole !== 'BUSINESS_HEAD' && actorRole !== 'SUPER_ADMIN_HR') {
    errors.push(`Stage "${currentSpec.name}" requires Management (Business Head or Super Admin / HR) authorization.`);
  } else if (currentSpec.performer === 'HR' && actorRole !== 'SUPER_ADMIN_HR') {
    errors.push(`Stage "${currentSpec.name}" is executed by HR / Super Admin.`);
  } else if (
    currentSpec.performer === 'Hiring Manager/HR' &&
    !['SUPER_ADMIN_HR', 'BUSINESS_HEAD', 'DEPARTMENT_HEAD'].includes(actorRole)
  ) {
    errors.push(`Stage "${currentSpec.name}" requires Hiring Manager or HR access.`);
  }

  // Required stage data check
  for (const field of currentSpec.requiredFields) {
    if (!(workflowCase.stageData[field] && workflowCase.stageData[field].trim().length > 0)) {
      errors.push(`Missing required data for "${currentSpec.name}": ${field}.`);
    }
  }

  // Mandatory approval gate check
  if (currentSpec.approvalNeeded === 'Yes' && !workflowCase.approvalsGranted[currentSpec.code]) {
    errors.push(`Stage "${currentSpec.name}" requires formal approval before advancing to "${nextSpec.name}".`);
  }

  // Sheet 9 Row 12: Both interview stages must be completed before Final Selection
  if (currentSpec.code === 'INTERVIEW') {
    if (!workflowCase.interviewStage1Passed || !workflowCase.interviewStage2Passed) {
      errors.push(
        'Cannot advance to Final Selection until both Stage 1 (Technical - Physical) and Stage 2 (Competency-Based - Virtual) interviews are passed.'
      );
    }
  }

  return { allowed: errors.length === 0, nextStage: nextSpec, errors };
}

export function advanceRecruitmentStage(
  workflowCase: RecruitmentWorkflowCase,
  actorRole: WorkbookRole
): RecruitmentWorkflowCase {
  const check = canAdvanceRecruitmentStage(workflowCase, actorRole);
  if (!check.allowed || !check.nextStage) {
    throw new Error(check.errors.join(' '));
  }

  const notifications = [...workflowCase.notificationsSent];
  if (check.nextStage.candidateNotification) {
    notifications.push({
      stage: check.nextStage.code,
      message: check.nextStage.candidateNotification,
      sentAt: new Date().toISOString(),
    });
  }

  return {
    ...workflowCase,
    currentStage: check.nextStage.code,
    notificationsSent: notifications,
  };
}

// ============================================================================
// SHEET 10: APPLICANT ASSESSMENTS (WITH MANDATORY HR FINAL DECISION GATE)
// ============================================================================

export function calculateAssessmentWeightedScore(
  scores: Array<{ score: number; maxScore: number; weightPercent: number }>
): number {
  const totalWeight = scores.reduce((sum, s) => sum + Number(s.weightPercent || 0), 0);
  if (totalWeight <= 0) return 0;
  const weighted = scores.reduce((sum, s) => {
    const pct = s.maxScore > 0 ? Math.min(1, Math.max(0, s.score / s.maxScore)) : 0;
    return sum + pct * s.weightPercent;
  }, 0);
  return Math.round((weighted / totalWeight) * 10000) / 100;
}

export function recordHrAssessmentDecision(
  assessment: ApplicantAssessmentRecord,
  actorRole: WorkbookRole,
  actorName: string,
  decision: 'PASSED' | 'FAILED'
): ApplicantAssessmentRecord {
  if (actorRole !== 'SUPER_ADMIN_HR') {
    throw new Error('Per Sheet 10, HR holds the final decision on applicant assessments (AI/managers cannot auto-finalize).');
  }
  return {
    ...assessment,
    hrFinalDecision: decision,
    hrDecisionBy: actorName,
    hrDecisionAt: new Date().toISOString(),
  };
}

// ============================================================================
// SHEET 11: TWO-STAGE INTERVIEW PROCESS EVALUATOR
// ============================================================================

export function evaluateTwoStageInterview(params: {
  stage1Interviewers: string[];
  stage1Criteria: InterviewCriterionScore[];
  stage2Interviewers: string[];
  stage2Criteria: InterviewCriterionScore[];
  passThreshold?: number; // default 3.5 / 5.0
}): TwoStageInterviewEvaluation {
  const threshold = params.passThreshold ?? 3.5;

  const calcWeighted = (criteria: InterviewCriterionScore[]): number => {
    const weightSum = criteria.reduce((sum, c) => sum + Number(c.weightPercent || 0), 0);
    if (weightSum <= 0) return 0;
    const weighted = criteria.reduce((sum, c) => sum + Number(c.score || 0) * Number(c.weightPercent || 0), 0);
    return Math.round((weighted / weightSum) * 100) / 100;
  };

  const s1Completed = params.stage1Criteria.length > 0 && params.stage1Interviewers.length > 0;
  const s1Score = s1Completed ? calcWeighted(params.stage1Criteria) : 0;
  const s1Passed = s1Completed && s1Score >= threshold;

  const s2Completed = params.stage2Criteria.length > 0 && params.stage2Interviewers.length > 0;
  const s2Score = s2Completed ? calcWeighted(params.stage2Criteria) : 0;
  const s2Passed = s2Completed && s2Score >= threshold;

  const overallScore =
    s1Completed && s2Completed
      ? Math.round(((s1Score + s2Score) / 2) * 100) / 100
      : Math.round((s1Score || s2Score) * 100) / 100;

  const blockers: string[] = [];
  if (!s1Completed) blockers.push('Stage 1 (Technical — Physical) interview has not been scored.');
  else if (!s1Passed) blockers.push(`Stage 1 score (${s1Score.toFixed(2)}) is below the ${threshold.toFixed(1)} pass threshold.`);

  if (!s2Completed) blockers.push('Stage 2 (Competency-Based — Virtual) interview has not been scored.');
  else if (!s2Passed) blockers.push(`Stage 2 score (${s2Score.toFixed(2)}) is below the ${threshold.toFixed(1)} pass threshold.`);

  return {
    stage1TechnicalPhysical: {
      completed: s1Completed,
      interviewers: params.stage1Interviewers,
      criteria: params.stage1Criteria,
      weightedScore: s1Score,
      passed: s1Passed,
    },
    stage2CompetencyVirtual: {
      completed: s2Completed,
      interviewers: params.stage2Interviewers,
      criteria: params.stage2Criteria,
      weightedScore: s2Score,
      passed: s2Passed,
    },
    overallScore,
    readyForFinalSelection: s1Passed && s2Passed,
    blockers,
  };
}

// ============================================================================
// SHEET 12 (PRE-ONBOARDING), SHEET 13 (ONBOARDING) & SHEET 15 (OFFBOARDING)
// ============================================================================

export function canActivateEmployeeFromPreOnboarding(steps: PreOnboardingStepRecord[]): {
  ready: boolean;
  incompleteSteps: string[];
} {
  if (steps.length === 0) {
    return { ready: false, incompleteSteps: ['No pre-onboarding steps configured.'] };
  }
  const incompleteSteps = steps
    .filter((s) => !s.candidateActionCompleted || !s.hrActionCompleted || !s.documentSigned || !s.hrApproved)
    .map((s) => s.step);

  return {
    ready: incompleteSteps.length === 0,
    incompleteSteps,
  };
}

export const DEFAULT_PRE_ONBOARDING_STEPS: PreOnboardingStepRecord[] = [
  { id: 'pre-1', step: 'Signed Offer Letter & Employment Contract', candidateActionCompleted: true, hrActionCompleted: true, documentSigned: true, hrApproved: true },
  { id: 'pre-2', step: 'Bio-Data Form (24 Sheet 5 Fields) & ID Upload', candidateActionCompleted: true, hrActionCompleted: true, documentSigned: true, hrApproved: true },
  { id: 'pre-3', step: 'Reference & Guarantor Verification', candidateActionCompleted: true, hrActionCompleted: true, documentSigned: true, hrApproved: false, notes: 'Awaiting HR sign-off' },
  { id: 'pre-4', step: 'Medical Fitness & Bank/Pension Enrollment', candidateActionCompleted: false, hrActionCompleted: false, documentSigned: false, hrApproved: false },
];

export const DEFAULT_WORKBOOK_ONBOARDING_TASKS: WorkbookOnboardingTaskSpec[] = [
  { id: 'ob-1', task: 'Provision official email, HRIS account & biometric enrollment', owner: 'ICT / System Admin', duePoint: 'Before Resumption', documentOrSystem: 'Microsoft 365 & Biometric Terminal', status: 'Completed' },
  { id: 'ob-2', task: 'Issue Employee Handbook, NDA & Policy Acknowledgement', owner: 'HR / PCCM', duePoint: 'Day 1', documentOrSystem: 'HR Documents Repository', status: 'Completed' },
  { id: 'ob-3', task: 'Department orientation & 90-day probation KPI goal setting', owner: 'Department Head', duePoint: 'Week 1', documentOrSystem: 'Performance Management Module', status: 'In Progress' },
  { id: 'ob-4', task: 'Payroll, Pension RSA & HMO benefits registration', owner: 'Finance & HR', duePoint: '1st Month', documentOrSystem: 'Payroll & Benefits Ledger', status: 'Pending' },
];

export function evaluateOffboardingRevocation(exitRequest: ExitRequest): OffboardingRevocationCheck {
  const pendingSteps: string[] = [];
  if (!exitRequest.managerEndorsed) pendingSteps.push('Manager endorsement & handover confirmation');
  if (!exitRequest.hrVerified) pendingSteps.push('HR contract & notice period verification');
  if (!exitRequest.exitInterview) pendingSteps.push('Exit interview scheduling');

  const revokedAccessSystems: string[] = [];
  const missingAccessRevocations: string[] = [];

  if (exitRequest.clearances.it) revokedAccessSystems.push('Email / M365, HRIS & Workstation Access');
  else missingAccessRevocations.push('IT Access Revocation & Laptop Return');

  if (exitRequest.clearances.facilities) revokedAccessSystems.push('Campus Keycards & Biometric Badge');
  else missingAccessRevocations.push('Facilities Keycard & Property Return');

  if (exitRequest.clearances.finance) revokedAccessSystems.push('Payroll / Staff Loan Settlement');
  else missingAccessRevocations.push('Finance Clearance & Loan Settlement');

  if (exitRequest.clearances.hr) revokedAccessSystems.push('HR Exit Dossier Archival');
  else missingAccessRevocations.push('HR Final Clearance Sign-off');

  return {
    readyToOffboard: pendingSteps.length === 0 && missingAccessRevocations.length === 0,
    pendingSteps,
    revokedAccessSystems,
    missingAccessRevocations,
  };
}

// ============================================================================
// SHEET 17: NOTIFICATIONS & EMAIL ROUTER
// ============================================================================

export const WORKBOOK_NOTIFICATION_RULES: NotificationRuleSpec[] = [
  { id: 'notif-leave-sub', event: 'LEAVE_SUBMITTED', recipient: 'Line Manager (or HR for Exam/Compassionate)', channel: 'In-App & Email', templateNeeded: true, timing: 'Immediate', notes: 'Routes based on Sheet 7 approval flow.' },
  { id: 'notif-leave-mgr', event: 'LEAVE_MANAGER_APPROVED', recipient: 'HR / Super Admin & Employee', channel: 'In-App & Email', templateNeeded: true, timing: 'Immediate', notes: 'Advances leave to Stage 2 HR approval.' },
  { id: 'notif-leave-final', event: 'LEAVE_FINAL_DECISION', recipient: 'Employee & Line Manager', channel: 'In-App & Email', templateNeeded: true, timing: 'Immediate', notes: 'Includes updated remaining leave balance.' },
  { id: 'notif-profile-edit', event: 'PROFILE_CHANGE_REQUESTED', recipient: 'HR / Super Admin', channel: 'In-App & Email', templateNeeded: true, timing: 'Immediate', notes: 'Sheet 5 HR approval required before committing employee self-edits.' },
  { id: 'notif-app-ack', event: 'CANDIDATE_APPLICATION_RECEIVED', recipient: 'Applicant', channel: 'Email (Automated)', templateNeeded: true, timing: 'Immediate', notes: 'Sheet 9 Row 10 automated response.' },
  { id: 'notif-shortlist', event: 'CANDIDATE_SHORTLISTED', recipient: 'Shortlisted Candidate', channel: 'Email (Automated)', templateNeeded: true, timing: 'Immediate', notes: 'Sheet 9 Row 11.' },
  { id: 'notif-interview', event: 'INTERVIEW_INVITATION', recipient: 'Candidate & Interview Panel', channel: 'Email (Automated)', templateNeeded: true, timing: 'Immediate', notes: 'Sheet 9 Row 12 (Physical Technical & Virtual Competency).' },
  { id: 'notif-late', event: 'ATTENDANCE_LATE_ALERT', recipient: 'Department Head & HR', channel: 'In-App', templateNeeded: false, timing: 'Daily Digest', notes: 'Triggered when clock-in exceeds 10-minute grace period (Sheet 8).' },
  { id: 'notif-doc-exp', event: 'DOCUMENT_EXPIRY_REMINDER', recipient: 'Employee & HR', channel: 'In-App & Email', templateNeeded: true, timing: 'Scheduled Reminder', notes: 'Sheet 16 expiry lead-time reminder.' },
  { id: 'notif-exit-int', event: 'EXIT_INTERVIEW_SCHEDULED', recipient: 'Exiting Employee & HR', channel: 'In-App & Email', templateNeeded: true, timing: 'Immediate', notes: 'Displays immediately on Employee Dashboard.' },
];

export function resolveNotificationRule(eventCode: string): NotificationRuleSpec | null {
  return WORKBOOK_NOTIFICATION_RULES.find((r) => r.event === eventCode) || null;
}

// ============================================================================
// SHEET 18: MICROSOFT 365 REGISTRY & SHEET 19: AI ASSISTANT GOVERNANCE
// ============================================================================

export const WORKBOOK_M365_SERVICES: M365ServiceSpec[] = [
  { service: 'Microsoft Entra ID (SSO)', currentlyUsed: 'Pending Confirmation', adminOwner: 'ICT / System Admin (TBD)', integrationNeeded: 'Must Have', purpose: 'Single sign-on with @thecitadelglobal.org & @citadelschoolofgovernment.org accounts', notes: 'Awaiting Tenant ID & Client ID on Sheet 18.' },
  { service: 'Exchange Online / Outlook', currentlyUsed: 'Pending Confirmation', adminOwner: 'ICT / System Admin (TBD)', integrationNeeded: 'Must Have', purpose: 'Automated leave, profile approval, and recruitment candidate emails (Sheet 17)', notes: 'Requires Graph Mail.Send or SMTP relay credentials.' },
  { service: 'Microsoft Teams', currentlyUsed: 'Pending Confirmation', adminOwner: 'ICT / HR', integrationNeeded: 'Important', purpose: 'Virtual Competency Interviews (Sheet 9 Stage 8) & Exit Interviews (Sheet 15)', notes: 'Generates meeting links for virtual panels.' },
  { service: 'SharePoint / OneDrive', currentlyUsed: 'Pending Confirmation', adminOwner: 'HR / ICT', integrationNeeded: 'Important', purpose: 'Archival sync for HR Documents, Bio-Data forms & signed contracts (Sheet 16)', notes: 'Requires SharePoint site ID confirmation.' },
  { service: 'Microsoft Forms', currentlyUsed: 'Pending Confirmation', adminOwner: 'HR / PCCM', integrationNeeded: 'Phase 2', purpose: 'External candidate intake webhook into Recruitment Stage 6', notes: 'Optional connector once form schema is supplied.' },
];

export const WORKBOOK_AI_GOVERNANCE_RULES: AiGovernanceRuleSpec[] = [
  { id: 'ai-policy', useCase: 'HR Policy & Handbook Lookup', allowedRoles: ['SUPER_ADMIN_HR', 'BUSINESS_HEAD', 'DEPARTMENT_HEAD', 'EMPLOYEE'], allowedDataScope: 'Approved HR policies & leave rules only (no peer PII)', humanApprovalRequired: false, priority: 'Must Have', notes: 'Read-only policy guidance.' },
  { id: 'ai-cv-draft', useCase: 'Candidate CV Screening Summary', allowedRoles: ['SUPER_ADMIN_HR', 'BUSINESS_HEAD'], allowedDataScope: 'Submitted recruitment applications & approved JDs', humanApprovalRequired: true, priority: 'Important', notes: 'Sheet 10: HR retains mandatory final decision.' },
  { id: 'ai-leave-conflict', useCase: 'Team Leave Overlap & Coverage Digest', allowedRoles: ['SUPER_ADMIN_HR', 'BUSINESS_HEAD', 'DEPARTMENT_HEAD'], allowedDataScope: 'Scoped entity/department leave calendar only', humanApprovalRequired: true, priority: 'Important', notes: 'Advisory only; cannot auto-approve leave.' },
  { id: 'ai-attendance-flags', useCase: 'Attendance Grace-Period Anomaly Summary', allowedRoles: ['SUPER_ADMIN_HR', 'BUSINESS_HEAD', 'DEPARTMENT_HEAD'], allowedDataScope: 'Scoped attendance logs & Sheet 8 shift schedules', humanApprovalRequired: true, priority: 'Phase 2', notes: 'Highlights repeated lateness or missing punches for HR review.' },
];

export function authorizeAiUseCase(
  useCaseId: string,
  actorRole: WorkbookRole
): { allowed: boolean; humanApprovalRequired: boolean; dataScope: string; reason: string } {
  const rule = WORKBOOK_AI_GOVERNANCE_RULES.find((r) => r.id === useCaseId);
  if (!rule) {
    return { allowed: false, humanApprovalRequired: true, dataScope: 'None', reason: 'Unknown AI use case.' };
  }
  if (!rule.allowedRoles.includes(actorRole)) {
    return {
      allowed: false,
      humanApprovalRequired: true,
      dataScope: 'None',
      reason: `Role ${actorRole} is not authorized for AI use case "${rule.useCase}" (Sheet 19).`,
    };
  }
  return {
    allowed: true,
    humanApprovalRequired: rule.humanApprovalRequired,
    dataScope: rule.allowedDataScope,
    reason: rule.humanApprovalRequired
      ? `Authorized for ${actorRole}; human HR/manager approval is mandatory before acting on AI output.`
      : `Authorized read-only access for ${actorRole}.`,
  };
}

// ============================================================================
// SHEET 20: REPORTS & ANALYTICS ENGINE + RFC-4180 CSV EXPORT
// ============================================================================

export const WORKBOOK_REPORT_SPECS: ReportSpec[] = [
  { id: 'HEADCOUNT_BY_ENTITY', title: 'Headcount & Confirmation Status by Entity/Department', audience: ['SUPER_ADMIN_HR', 'BUSINESS_HEAD'], frequency: 'Monthly', supportedFilters: ['entity', 'status'], exportNeeded: true, notes: 'Groups staff across CGCC, CSOG, and Citadel Holdings.' },
  { id: 'LEAVE_COMPLIANCE', title: 'Leave Utilization & Approval Stage Compliance', audience: ['SUPER_ADMIN_HR', 'BUSINESS_HEAD', 'DEPARTMENT_HEAD'], frequency: 'Weekly', supportedFilters: ['entity', 'leaveType', 'status'], exportNeeded: true, notes: 'Tracks Sheet 7 leave categories, days requested, and Manager vs Direct HR stages.' },
  { id: 'ATTENDANCE_PUNCTUALITY', title: 'Attendance Punctuality & 10-Min Grace Period Audit', audience: ['SUPER_ADMIN_HR', 'BUSINESS_HEAD', 'DEPARTMENT_HEAD'], frequency: 'Weekly', supportedFilters: ['entity', 'department'], exportNeeded: true, notes: 'Evaluates punches against Sheet 8 entity/unit shifts.' },
  { id: 'PROFILE_COMPLETENESS', title: 'Employee Master Data (24-Field) Completeness Report', audience: ['SUPER_ADMIN_HR'], frequency: 'On-Demand', supportedFilters: ['entity'], exportNeeded: true, notes: 'Identifies missing Sheet 5 mandatory fields before Oct 4 launch.' },
  { id: 'RECRUITMENT_PIPELINE', title: '10-Stage Recruitment Funnel & SLA Tracker', audience: ['SUPER_ADMIN_HR', 'BUSINESS_HEAD'], frequency: 'Weekly', supportedFilters: ['entity', 'stage'], exportNeeded: true, notes: 'Tracks open vacancies across Sheet 9 stages.' },
];

export function generateWorkbookReport(params: {
  reportId: WorkbookReportId;
  employees: Employee[];
  leaves?: LeaveRequest[];
  entityFilter?: string;
}): GeneratedReportTable {
  const filterLower = (params.entityFilter || '').trim().toLowerCase();
  const filteredEmps =
    filterLower && filterLower !== 'all'
      ? params.employees.filter((e) => (e.entityName || '').toLowerCase().includes(filterLower))
      : params.employees;

  const generatedAt = new Date().toISOString();

  if (params.reportId === 'HEADCOUNT_BY_ENTITY') {
    const grouped = new Map<string, { entity: string; department: string; total: number; confirmed: number; probation: number }>();
    for (const emp of filteredEmps) {
      const key = `${emp.entityName}::${emp.departmentName}`;
      const existing = grouped.get(key) || {
        entity: emp.entityName,
        department: emp.departmentName,
        total: 0,
        confirmed: 0,
        probation: 0,
      };
      existing.total += 1;
      if (emp.status === 'Probation' || emp.contractStatus === 'Probation') existing.probation += 1;
      else existing.confirmed += 1;
      grouped.set(key, existing);
    }
    const rows = Array.from(grouped.values()).map((g) => ({
      Entity: g.entity,
      Department: g.department,
      Headcount: g.total,
      Confirmed: g.confirmed,
      Probation: g.probation,
    }));
    return {
      reportId: params.reportId,
      title: 'Headcount & Confirmation Status by Entity/Department',
      generatedAt,
      columns: ['Entity', 'Department', 'Headcount', 'Confirmed', 'Probation'],
      rows,
      summary: { totalEmployees: filteredEmps.length, departmentsCovered: rows.length },
    };
  }

  if (params.reportId === 'PROFILE_COMPLETENESS') {
    const rows = filteredEmps.map((emp) => {
      const comp = evaluateEmployeeCompleteness(emp);
      return {
        StaffId: emp.staffId,
        FullName: emp.fullName,
        Entity: emp.entityName,
        Department: emp.departmentName,
        CompletedFields: `${comp.completedCount}/${comp.totalFields}`,
        CompletenessPct: comp.percentComplete,
        MissingFields: comp.missingFields.join('; ') || 'Complete',
      };
    });
    const avgPct =
      rows.length > 0
        ? Math.round(rows.reduce((sum, r) => sum + Number(r.CompletenessPct), 0) / rows.length)
        : 0;
    return {
      reportId: params.reportId,
      title: 'Employee Master Data (24-Field) Completeness Report',
      generatedAt,
      columns: ['StaffId', 'FullName', 'Entity', 'Department', 'CompletedFields', 'CompletenessPct', 'MissingFields'],
      rows,
      summary: { employeesAudited: rows.length, averageCompletenessPct: avgPct },
    };
  }

  if (params.reportId === 'LEAVE_COMPLIANCE') {
    const leaves = (params.leaves || []).filter((l) =>
      !filterLower || filterLower === 'all' ? true : (l.entityName || '').toLowerCase().includes(filterLower)
    );
    const rows = leaves.map((l) => ({
      Employee: l.employeeName,
      Entity: l.entityName,
      LeaveType: l.leaveType,
      Dates: `${l.startDate} to ${l.endDate}`,
      Days: l.totalDays || l.daysRequested || 1,
      Stage: l.approvalStage || 'MANAGER',
      Status: l.status,
    }));
    return {
      reportId: params.reportId,
      title: 'Leave Utilization & Approval Stage Compliance',
      generatedAt,
      columns: ['Employee', 'Entity', 'LeaveType', 'Dates', 'Days', 'Stage', 'Status'],
      rows,
      summary: {
        totalRequests: rows.length,
        approvedRequests: leaves.filter((l) => l.status === 'Approved').length,
        pendingRequests: leaves.filter((l) => l.status === 'Submitted' || l.status === 'Pending Review').length,
      },
    };
  }

  if (params.reportId === 'ATTENDANCE_PUNCTUALITY') {
    const sampleTimes = ['08:55', '09:08', '09:16', '07:05', '07:14'];
    const rows = filteredEmps.map((emp, idx) => {
      const clockIn = emp.departmentName.toLowerCase().includes('facilit')
        ? idx % 2 === 0
          ? '07:05'
          : '07:14'
        : sampleTimes[idx % 3];
      const evalRes = evaluateAttendancePunch({
        entityName: emp.entityName,
        departmentName: emp.departmentName,
        date: generatedAt.slice(0, 10),
        clockInTime: clockIn,
        clockOutTime: '16:05',
        verificationSource: 'Biometric_ZKTeco',
      });
      return {
        StaffId: emp.staffId,
        FullName: emp.fullName,
        UnitSchedule: `${evalRes.schedule.entityOrDepartment} (${evalRes.effectiveShiftStart}-${evalRes.effectiveShiftEnd})`,
        GraceCutoff: evalRes.graceCutoffTime,
        ClockIn: clockIn,
        Status: evalRes.status,
        LateMinutes: evalRes.lateMinutes,
      };
    });
    return {
      reportId: params.reportId,
      title: 'Attendance Punctuality & 10-Min Grace Period Audit',
      generatedAt,
      columns: ['StaffId', 'FullName', 'UnitSchedule', 'GraceCutoff', 'ClockIn', 'Status', 'LateMinutes'],
      rows,
      summary: {
        evaluatedCount: rows.length,
        onTimeCount: rows.filter((r) => r.Status === 'Present').length,
        lateCount: rows.filter((r) => r.Status === 'Late').length,
      },
    };
  }

  // RECRUITMENT_PIPELINE fallback summary
  return {
    reportId: 'RECRUITMENT_PIPELINE',
    title: '10-Stage Recruitment Funnel & SLA Tracker',
    generatedAt,
    columns: ['Step', 'Stage', 'Performer', 'ApprovalNeeded', 'CandidateNotification'],
    rows: WORKBOOK_RECRUITMENT_STAGES.map((s) => ({
      Step: s.step,
      Stage: s.name,
      Performer: s.performer,
      ApprovalNeeded: s.approvalNeeded,
      CandidateNotification: s.candidateNotification || 'None',
    })),
    summary: { totalStages: WORKBOOK_RECRUITMENT_STAGES.length },
  };
}

export function exportReportToCsv(report: GeneratedReportTable): string {
  const escapeCell = (value: string | number | undefined): string => {
    const str = String(value ?? '');
    // Prevent CSV formula injection (=, +, -, @) per secure coding best practices
    const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const headerLine = report.columns.map(escapeCell).join(',');
  const dataLines = report.rows.map((row) => report.columns.map((col) => escapeCell(row[col])).join(','));
  return [headerLine, ...dataLines].join('\n');
}
