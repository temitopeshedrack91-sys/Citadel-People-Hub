/**
 * Citadel People Hub — Requirements Workbook Domain Types (Sheets 1–24)
 *
 * Every data structure below maps traceably to its source sheet in
 * `Citadel_People_Hub_Requirements_Workbook (2).csv` (24-sheet XLSX workbook).
 */

/** Sheet 1: Start Here — Workbook Priority Taxonomy */
export type WorkbookPriority = 'Must Have' | 'Important' | 'Phase 2' | 'Future';

/** Sheet 1 / Cross-Sheet: Explicit Flag for Ambiguities, Contradictions & Blank Sheets */
export interface WorkbookAmbiguityFlag {
  id: string;
  sheetNumber: number;
  sheetName: string;
  severity: 'Contradiction' | 'Ambiguity' | 'Blank Template' | 'Data Anomaly';
  summary: string;
  chosenInterpretation: string;
  needsUserDecision: boolean;
}

/** Sheet 2: Project Scope */
export interface ProjectScopeSpec {
  primaryObjective: string;
  expectedOutcomes: string[];
  userGroups: string[];
  targetLaunchDate: string; // ISO YYYY-MM-DD (2026-10-04)
  v1Included: string[];
  v1Excluded: string[];
  successMetric: string;
}

/** Sheet 3: Org Structure */
export type EntityShortCode = 'CGCC' | 'CSOG' | 'HOLDINGS';

export interface OrgEntitySpec {
  id: string;
  shortCode: EntityShortCode;
  name: string;
  businessHeads: string[];
  allBusinessHeadsInGec: boolean;
}

export interface OrgDepartmentSpec {
  id: string;
  entityId: string;
  entityShortCode: EntityShortCode;
  entityName: string;
  departmentName: string;
  priority: WorkbookPriority;
  departmentHeadTitle: string;
  headEmail: string | null; // null when workbook specifies "TBD"
  reportsTo: string;
  isGecSharedService: boolean;
  notes: string;
}

/** Sheet 4: Roles & Permissions */
export type WorkbookRole =
  | 'SUPER_ADMIN_HR'
  | 'BUSINESS_HEAD'
  | 'DEPARTMENT_HEAD'
  | 'EMPLOYEE'
  | 'SYSTEM_ADMIN';

export type RoleScope =
  | 'ALL_ENTITIES'
  | 'OWN_ENTITY'
  | 'OWN_DEPARTMENT_TEAM'
  | 'OWN_RECORDS'
  | 'TECHNICAL_CONFIGURATION';

export type GovernanceAction =
  | 'VIEW_PLATFORM'
  | 'EDIT_ANY_MODULE'
  | 'EDIT_ENTITY_UNIT'
  | 'EDIT_TEAM_PERFORMANCE'
  | 'UPLOAD_OWN_PROFILE_OR_DOCS'
  | 'EDIT_TECHNICAL_BACKEND'
  | 'APPROVE_HR_CHANGE'
  | 'APPROVE_TECHNICAL_CHANGE'
  | 'EXPORT_REPORTS';

export interface RoleGovernanceSpec {
  role: WorkbookRole;
  label: string;
  scope: RoleScope;
  priority: WorkbookPriority;
  createEditSummary: string;
  approvalRequirement: 'NONE' | 'HR_SUPER_ADMIN_APPROVAL' | 'SUPER_ADMIN_APPROVAL';
  reportingOrGecNote: string;
  isGecMember: boolean;
  allowedActions: GovernanceAction[];
}

export interface GovernanceDecision {
  allowed: boolean;
  requiresApproval: boolean;
  approverRole?: 'SUPER_ADMIN_HR' | 'SYSTEM_ADMIN';
  reason: string;
}

/** Sheet 5: Employee Master Data (24 Mandatory Sensitive Fields) */
export type EmployeeFieldEditPolicy = 'EMPLOYEE_WITH_HR_APPROVAL' | 'HR_SUPER_ADMIN_ONLY';

export interface EmployeeMasterFieldSpec {
  key: string;
  label: string;
  required: boolean;
  sensitive: boolean;
  priority: WorkbookPriority;
  editPolicy: EmployeeFieldEditPolicy;
  source: string;
  notes: string;
}

export type ChangeRequestStatus = 'PENDING_HR_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface ProfileChangeRequest {
  id: string;
  employeeId: string;
  employeeStaffId: string;
  employeeName: string;
  requestedByRole: WorkbookRole;
  requestedByName: string;
  proposedChanges: Record<string, string>;
  previousValues: Record<string, string>;
  reason: string;
  status: ChangeRequestStatus;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
}

/** Sheet 6 & Sheet 22: Existing Data Sources & Data Migration */
export interface LegacyDataSourceSpec {
  id: string;
  sourceName: string;
  format: 'Excel' | 'Google Doc';
  owner: string;
  approxRecords: number | null;
  currentLocation: string;
  migrationNeeded: 'Yes' | 'Maybe' | 'No';
  cleaningRequired: boolean;
  importPriority: WorkbookPriority;
  notes: string;
}

export interface MigrationRowValidation {
  rowNumber: number;
  staffId: string;
  fullName: string;
  valid: boolean;
  missingFields: string[];
  errors: string[];
  warnings: string[];
}

export interface MigrationValidationReport {
  sourceName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateStaffIds: string[];
  duplicateEmails: string[];
  credentialLeakRows: number[];
  rows: MigrationRowValidation[];
}

/** Sheet 7: Leave Management */
export type WorkbookLeaveType =
  | 'Annual Leave'
  | 'Sick Leave'
  | 'Maternity Leave'
  | 'Paternity Leave'
  | 'Exam Leave'
  | 'Compassionate Leave';

export type LeaveApprovalRoute = 'MANAGER_TO_HR' | 'DIRECT_HR';

export interface WorkbookLeavePolicy {
  leaveType: WorkbookLeaveType;
  entitlementLabel: string;
  entitlementDays: number;
  approvalRoute: LeaveApprovalRoute;
  attachmentRequirement: 'REQUIRED' | 'SUBJECTIVE_OPTIONAL';
  attachmentLabel: string;
  requiresConfirmedEmployee: boolean;
  minServiceYears: number;
  restrictedGender?: 'Male' | 'Female';
  advanceNoticePolicy: 'REQUIRED' | 'ADVISORY';
  notes: string;
}

export interface LeaveEligibilityEmployeeInput {
  id: string;
  fullName?: string;
  gender?: 'Male' | 'Female' | string;
  status?: string;
  contractStatus?: string;
  employmentDate?: string;
  confirmationDate?: string;
  yearsOfService?: number;
}

export interface LeaveApplicationValidationInput {
  employee: LeaveEligibilityEmployeeInput;
  leaveType: WorkbookLeaveType | string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  today?: string; // YYYY-MM-DD (defaults to current date)
  attachmentName?: string | null;
  availableBalanceDays?: number;
  existingLeaves?: Array<{
    startDate: string;
    endDate: string;
    status: string;
  }>;
  managerId?: string | null;
}

export interface LeaveValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  calculatedDays: number;
  policy: WorkbookLeavePolicy | null;
  initialApprovalStage: 'MANAGER' | 'HR';
  requiresManagerSelection: boolean;
  requiresAttachment: boolean;
  attachmentLabel: string;
}

/** Sheet 8: Attendance */
export interface WorkbookAttendanceSchedule {
  id: string;
  entityOrDepartment: string;
  matchKeywords: string[];
  shiftStart: string; // HH:mm 24h
  shiftEnd: string; // HH:mm 24h
  biometricRequired: boolean;
  gracePeriodMinutes: number;
  supportsEventDayOverride: boolean;
  notes: string;
}

export interface AttendancePunchInput {
  entityName: string;
  departmentName?: string;
  date: string; // YYYY-MM-DD
  clockInTime?: string | null; // "09:08" or "09:08 AM"
  clockOutTime?: string | null; // "16:05" or "04:05 PM"
  verificationSource?: string;
  isEventDay?: boolean;
  eventShiftStart?: string; // HH:mm
  eventShiftEnd?: string; // HH:mm
  punchCount?: number;
}

export interface AttendanceEvaluationResult {
  schedule: WorkbookAttendanceSchedule;
  effectiveShiftStart: string;
  effectiveShiftEnd: string;
  graceCutoffTime: string;
  status: 'Present' | 'Late' | 'Absent' | 'Half-Day' | 'Missing Punch';
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
  workedMinutes: number;
  biometricCompliant: boolean;
  anomalies: string[];
}

/** Sheet 9: Recruitment (10-Stage Workflow) */
export type RecruitmentStageCode =
  | 'VACANCY_IDENTIFIED'
  | 'MANPOWER_REQUEST'
  | 'VACANCY_APPROVED'
  | 'JD_DEVELOPED_REVIEWED'
  | 'JOB_ADVERTISED'
  | 'APPLICATIONS_RECEIVED'
  | 'CV_SCREENING'
  | 'INTERVIEW'
  | 'FINAL_SELECTION'
  | 'REFERENCE_BACKGROUND_CHECKS';

export interface RecruitmentStageSpec {
  step: number;
  code: RecruitmentStageCode;
  name: string;
  performer: 'Hiring Manager/HR' | 'Management' | 'HR';
  requiredFields: string[];
  approvalNeeded: 'Yes' | 'Maybe' | 'No';
  candidateNotification: string | null;
  notes: string;
}

export interface RecruitmentWorkflowCase {
  id: string;
  jobTitle: string;
  department: string;
  entity: string;
  currentStage: RecruitmentStageCode;
  stageData: Record<string, string>;
  approvalsGranted: Partial<Record<RecruitmentStageCode, { approver: string; approvedAt: string }>>;
  notificationsSent: Array<{
    stage: RecruitmentStageCode;
    message: string;
    sentAt: string;
  }>;
  interviewStage1Passed?: boolean; // Technical - Physical
  interviewStage2Passed?: boolean; // Competency-based - Virtual
  assessmentApprovedByHr?: boolean;
}

/** Sheet 10: Assessments */
export interface AssessmentCriterion {
  id: string;
  questionOrTask: string;
  maxScore: number;
  weightPercent: number;
}

export interface ApplicantAssessmentRecord {
  id: string;
  candidateName: string;
  jobRole: string;
  assessmentType: 'Technical' | 'Aptitude' | 'Case Study' | 'Competency';
  scoringMethod: 'Weighted Rubric (0-100)' | 'Pass/Fail' | 'Points';
  aiAssistanceUsed: boolean;
  aiDraftSummary?: string;
  scores: Array<{ criterionId: string; score: number; maxScore: number; weightPercent: number }>;
  weightedScorePercent: number;
  hrFinalDecision: 'PENDING' | 'PASSED' | 'FAILED';
  hrDecisionBy?: string;
  hrDecisionAt?: string;
}

/** Sheet 11: Interview Process (2-Stage Interview) */
export interface InterviewCriterionScore {
  criterion: string;
  weightPercent: number;
  score: number; // 1-5
  comment?: string;
}

export interface TwoStageInterviewEvaluation {
  stage1TechnicalPhysical: {
    completed: boolean;
    interviewers: string[];
    criteria: InterviewCriterionScore[];
    weightedScore: number;
    passed: boolean;
  };
  stage2CompetencyVirtual: {
    completed: boolean;
    interviewers: string[];
    criteria: InterviewCriterionScore[];
    weightedScore: number;
    passed: boolean;
  };
  overallScore: number;
  readyForFinalSelection: boolean;
  blockers: string[];
}

/** Sheet 12: Pre-Onboarding */
export interface PreOnboardingStepRecord {
  id: string;
  step: string;
  candidateActionCompleted: boolean;
  hrActionCompleted: boolean;
  documentSigned: boolean;
  hrApproved: boolean;
  notes?: string;
}

/** Sheet 13: Onboarding */
export interface WorkbookOnboardingTaskSpec {
  id: string;
  task: string;
  owner: string;
  duePoint: string;
  documentOrSystem: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  notes?: string;
}

/** Sheet 14: Employee Lifecycle */
export type LifecycleEventType =
  | 'CONFIRMATION'
  | 'PROMOTION'
  | 'TRANSFER'
  | 'CONTRACT_CHANGE'
  | 'SUSPENSION'
  | 'EXIT';

export interface LifecycleEventRecord {
  id: string;
  eventType: LifecycleEventType;
  employeeId: string;
  employeeName: string;
  trigger: string;
  requiredAction: string;
  approverRole: 'SUPER_ADMIN_HR' | 'BUSINESS_HEAD_AND_HR';
  approvedBy?: string;
  approvedAt?: string;
  effectiveDate: string;
  changes: Record<string, string>;
  recordsUpdated: string[];
  status: 'PENDING_APPROVAL' | 'APPLIED' | 'REJECTED';
}

/** Sheet 15: Offboarding */
export interface OffboardingRevocationCheck {
  readyToOffboard: boolean;
  pendingSteps: string[];
  revokedAccessSystems: string[];
  missingAccessRevocations: string[];
}

/** Sheet 16: Documents */
export interface DocumentPolicySpec {
  documentType: string;
  whoUploads: 'Employee (HR Approves)' | 'HR / Super Admin' | 'Candidate / HR';
  whoCanView: 'Employee & HR' | 'HR & Business Head' | 'All Staff';
  required: boolean;
  tracksExpiry: boolean;
  reminderLeadDays: number;
  notes: string;
}

export interface DocumentExpiryStatus {
  documentName: string;
  expiryDate?: string;
  state: 'NO_EXPIRY' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  daysRemaining: number | null;
}

/** Sheet 17: Notifications & Email */
export interface NotificationRuleSpec {
  id: string;
  event: string;
  recipient: string;
  channel: 'In-App & Email' | 'Email (Automated)' | 'In-App';
  templateNeeded: boolean;
  timing: 'Immediate' | 'Scheduled Reminder' | 'Daily Digest';
  notes: string;
}

/** Sheet 18: Microsoft 365 */
export interface M365ServiceSpec {
  service: string;
  currentlyUsed: 'Pending Confirmation' | 'Yes' | 'No';
  adminOwner: string;
  integrationNeeded: 'Must Have' | 'Important' | 'Phase 2';
  purpose: string;
  notes: string;
}

/** Sheet 19: AI Assistant */
export interface AiGovernanceRuleSpec {
  id: string;
  useCase: string;
  allowedRoles: WorkbookRole[];
  allowedDataScope: string;
  humanApprovalRequired: boolean;
  priority: WorkbookPriority;
  notes: string;
}

/** Sheet 20: Reports & Analytics */
export type WorkbookReportId =
  | 'HEADCOUNT_BY_ENTITY'
  | 'LEAVE_COMPLIANCE'
  | 'ATTENDANCE_PUNCTUALITY'
  | 'PROFILE_COMPLETENESS'
  | 'RECRUITMENT_PIPELINE';

export interface ReportSpec {
  id: WorkbookReportId;
  title: string;
  audience: WorkbookRole[];
  frequency: 'On-Demand' | 'Weekly' | 'Monthly';
  supportedFilters: string[];
  exportNeeded: boolean;
  notes: string;
}

export interface GeneratedReportTable {
  reportId: WorkbookReportId;
  title: string;
  generatedAt: string;
  columns: string[];
  rows: Array<Record<string, string | number>>;
  summary: Record<string, string | number>;
}

/** Sheet 21: Security */
export interface SecurityControlSpec {
  id: string;
  requirement: string;
  currentPractice: string;
  requiredForV1: boolean;
  owner: string;
  riskIfMissing: string;
  implementedInApp: boolean;
}

/** Sheet 23: V1 Priorities */
export interface V1PrioritySpec {
  id: string;
  feature: string;
  businessValue: string;
  october4Target: boolean;
  priority: WorkbookPriority;
  dependencies: string;
  acceptanceCriteria: string;
  implementationStatus: 'Implemented' | 'Partial (Awaiting Client Config)' | 'Deferred to Phase 2';
}

/** Sheet 24: Future Roadmap */
export interface FutureRoadmapSpec {
  id: string;
  feature: string;
  whyItMatters: string;
  suggestedPhase: 'Phase 2' | 'Future';
  dependency: string;
  owner: string;
  notes: string;
}
