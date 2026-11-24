/**
 * Enterprise HR Parity Types (OrangeHRM Parity)
 * Citadel People Hub
 */

export interface JobTitle {
  id: number;
  title: string;
  description?: string | null;
  specification?: string | null;
  minExperienceYears: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayGrade {
  id: number;
  name: string;
  currency: string;
  minSalary: number;
  maxSalary: number;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimesheetItem {
  id?: number;
  projectId?: number | null;
  projectName?: string;
  activityName: string;
  date: string; // YYYY-MM-DD
  durationHours: number;
  notes?: string | null;
}

export interface TimesheetActionLog {
  id: number;
  action: string;
  performer?: string;
  comments?: string | null;
  timestamp: string;
}

export interface Timesheet {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeStaffId?: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  totalHours: number;
  submittedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  comments?: string | null;
  items?: TimesheetItem[];
  actionLogs?: TimesheetActionLog[];
}

export interface Kpi {
  id: number;
  jobTitleId?: number | null;
  jobTitleName?: string;
  jobTitle?: { id?: number; name?: string } | null;
  indicator: string;
  minRating: number;
  maxRating: number;
  weight: number;
  isActive: boolean;
  version?: number;
  updatedAt?: string;
}

export interface ReviewRating {
  id?: number;
  kpiId?: number | null;
  kpiTitle: string;
  weight?: number;
  minRating?: number;
  maxRating?: number;
  rating: number;
  comment?: string | null;
}

export interface PerformanceReview {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeStaffId?: string;
  reviewerId?: number | null;
  reviewerName?: string;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  dueDate: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'EVALUATED' | 'APPROVED';
  finalRating?: number | null;
  employeeComments?: string | null;
  reviewerComments?: string | null;
  completedAt?: string | null;
  version?: number;
  updatedAt?: string;
  ratings?: ReviewRating[];
  kpis?: Array<{
    kpiId?: number;
    title?: string;
    weight?: number;
  }>;
}

export interface JobVacancy {
  id: number;
  requisitionId?: string | null;
  title: string;
  jobTitleId?: number | null;
  jobTitleName?: string;
  departmentId?: number | null;
  departmentName?: string;
  hiringManagerId?: number | null;
  hiringManagerName?: string;
  positionsCount: number;
  description?: string | null;
  status: 'Active' | 'Closed' | 'On Hold';
  candidateCount?: number;
  createdAt?: string;
}

export interface CandidateInterview {
  id: number;
  title: string;
  interviewerName?: string;
  scheduledDate: string;
  scheduledTime?: string | null;
  result: 'Pending' | 'Passed' | 'Failed';
  notes?: string | null;
}

export interface CandidateHistory {
  id: number;
  action: string;
  performer?: string;
  notes?: string | null;
  timestamp: string;
}

export interface Candidate {
  id: number;
  vacancyId: number;
  vacancyTitle?: string;
  departmentName?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string | null;
  resumeUrl?: string | null;
  status:
    | 'Application Initiated'
    | 'Shortlisted'
    | 'Interview Scheduled'
    | 'Interview Passed'
    | 'Interview Failed'
    | 'Job Offered'
    | 'Offer Accepted'
    | 'Offer Declined'
    | 'Rejected'
    | 'Hired';
  notes?: string | null;
  appliedDate: string;
  interviews?: CandidateInterview[];
  histories?: CandidateHistory[];
}

export interface TrainingCourse {
  id: number;
  title: string;
  code: string;
  description?: string | null;
  trainerProvider?: string | null;
  durationHours: number;
  isActive: boolean;
  sessionsCount?: number;
}

export interface EmployeeTraining {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeStaffId?: string;
  status: 'Enrolled' | 'Attended' | 'Completed' | 'Incomplete';
  completionDate?: string | null;
  score?: number | null;
  feedback?: string | null;
}

export interface TrainingSession {
  id: number;
  courseId: number;
  courseTitle?: string;
  sessionName: string;
  startDate: string;
  endDate: string;
  deliveryMethod: 'In-Person' | 'Online' | 'Hybrid';
  locationOrUrl?: string | null;
  maxCapacity: number;
  enrolledCount?: number;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  enrollments?: EmployeeTraining[];
}

export interface WorkforceReport {
  totalEmployees: number;
  totalActive: number;
  byEntity: Record<string, number>;
  byDepartment: Record<string, number>;
  byGender: Record<string, number>;
  byEmploymentType: Record<string, number>;
}

export interface LeaveReport {
  year: number;
  summary: {
    totalEntitled: number;
    totalUsed: number;
    totalPending: number;
    totalRemaining: number;
  };
  byCategory: Array<{
    category_name: string;
    entitled: number;
    used: number;
    pending: number;
    remaining: number;
  }>;
  requestsByStatus: Record<string, number>;
}

export interface AttendanceReport {
  totalAttendanceLogs: number;
  statusBreakdown: Record<string, number>;
  totalHoursWorked: number;
  averageHoursPerLog: number;
}

export interface RecruitmentReport {
  activeVacancies: number;
  totalVacancies: number;
  totalCandidates: number;
  funnel: Record<string, number>;
}
