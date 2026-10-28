/**
 * Talent, Onboarding & Performance Types
 * Citadel People Hub
 */

export interface RecruitmentRequisition {
  id: string;
  requisitionCode: string;
  jobTitle: string;
  entityId: string;
  entityName: string;
  departmentId: string;
  departmentName: string;
  openPositions: number;
  employmentType: string;
  status: 'Draft' | 'Approved' | 'Open' | 'Interviewing' | 'Filled' | 'Closed';
  targetDate: string;
  targetHiringDate?: string;
  hiringManager?: string;
  applicantsCount: number;
  candidates?: any[];
}

export interface CitadelRecruitmentStage {
  step: number;
  stageName: string;
  category: 'Request & Approval' | 'Sourcing' | 'Assessment' | 'Finalization';
  description: string;
  primaryActor: string;
  keyRequirement: string;
  slaDays: number;
  interviewType?: 'Physical - Technical' | 'Virtual - Competency-Based' | 'Two-Stage (Physical + Virtual)' | 'None';
}


export interface PreOnboardingItem {
  id: string;
  candidateName: string;
  position: string;
  entityName: string;
  departmentName: string;
  offerAcceptedDate: string;
  expectedStartDate: string;
  documentsVerified: boolean;
  backgroundCheckStatus: 'Pending' | 'In Progress' | 'Cleared' | 'Flagged';
  workstationReady: boolean;
  emailAccountCreated: boolean;
}

export type OnboardingDepartment = 'Manager' | 'PCCM' | 'IT' | 'Finance' | 'Mentor';
export type OnboardingTimeline = 'Before Resumption' | 'Day 1' | 'Day 2' | 'Week 1' | '1st Month' | '90 Days';

export interface OnboardingRequiredDoc {
  id: string;
  name: string;
  isSubmitted: boolean;
  submittedAt?: string;
}

export interface OnboardingOrientationItem {
  id: string;
  name: string;
  isCompleted: boolean;
}

export interface OnboardingTeamRoster {
  managerName: string;
  pccmOfficerName: string;
  itLeadName: string;
  financeLeadName: string;
  mentorBuddyName: string;
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category?: string;
  department: OnboardingDepartment;
  timeline: OnboardingTimeline;
  assignedRole: 'PCCM' | 'Department Head' | 'Employee' | 'ICT' | 'Finance' | 'Mentor';
  responsibleRole?: string;
  assignedToName?: string;
  dueDate: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface OnboardingJourney {
  id: string;
  employeeId: string;
  employeeName: string;
  staffId: string;
  jobTitle: string;
  entityName: string;
  departmentName: string;
  startDate: string;
  mentorName?: string;
  mentorBuddyName?: string;
  overallProgressPercent: number;
  status: 'In Progress' | 'Completed' | 'Delayed';
  tasks: OnboardingTask[];
  requiredDocuments?: OnboardingRequiredDoc[];
  orientationItems?: OnboardingOrientationItem[];
  teamRoster?: OnboardingTeamRoster;
}

export interface PerformanceGoal {
  id: string;
  title: string;
  category: 'Strategic' | 'Operational' | 'Culture & Values' | 'Personal Development';
  weightPercent: number;
  targetMetric: string;
  progressPercent: number;
  status: 'On Track' | 'At Risk' | 'Achieved' | 'Behind';
}

export interface AppraisalCycle {
  id: string;
  cycleName: string;
  period: string; // e.g., '2026 Mid-Year Appraisal'
  status: 'Goal Setting' | 'Self Assessment' | 'Manager Review' | 'PCCM Calibration' | 'Completed';
  startDate: string;
  endDate: string;
  submissionRatePercent: number;
}
