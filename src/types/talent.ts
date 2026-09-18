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

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category?: string;
  assignedRole: 'PCCM' | 'Department Head' | 'Employee' | 'ICT';
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
