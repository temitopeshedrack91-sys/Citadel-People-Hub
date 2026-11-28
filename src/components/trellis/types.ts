export type TaskStatus = 'To do' | 'In progress' | 'In review' | 'Done';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export const ALL_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export const PRIORITY_BADGE_STYLES: Record<
  TaskPriority,
  { badgeClass: string; dotClass: string; activeBtnClass: string }
> = {
  Low: {
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
    activeBtnClass: 'bg-slate-700 text-white border-slate-700',
  },
  Medium: {
    badgeClass: 'bg-blue-50 text-[#174EA6] border-blue-200',
    dotClass: 'bg-[#174EA6]',
    activeBtnClass: 'bg-[#174EA6] text-white border-[#174EA6]',
  },
  High: {
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
    activeBtnClass: 'bg-amber-600 text-white border-amber-600',
  },
  Urgent: {
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-600',
    activeBtnClass: 'bg-rose-600 text-white border-rose-600',
  },
};

export function resolveTaskPriority(
  task: Pick<TrellisTask, 'priority' | 'labels'>
): TaskPriority {
  if (task.priority && ALL_PRIORITIES.includes(task.priority)) {
    return task.priority;
  }
  if (task.labels?.includes('High')) {
    return 'High';
  }
  return 'Medium';
}

export type TaskLabel =
  | 'Feature'
  | 'Bug'
  | 'Design'
  | 'Tech'
  | 'Onboarding'
  | 'Marketing'
  | 'Android'
  | 'Data'
  | 'Content'
  | 'Design system'
  | 'High';

export type AssignmentStatus = 'pending' | 'accepted' | 'declined';

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  avatarBg: string;
  avatarText: string;
  email: string;
  capacityHours: number; // default 40
  supabaseId?: number | string;
  staffId?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorBg: string;
  text: string;
  timeAgo: string;
}

export interface TrellisTask {
  id: string; // e.g. 'PAS-218'
  title: string;
  description: string;
  status: TaskStatus;
  priority?: TaskPriority;
  labels: TaskLabel[];
  dueDate: string; // e.g. 'Tue, Oct 20'
  dueTag?: 'Today' | 'Tomorrow' | string;
  assigneeId: string; // ID of assigned team member
  assignerId: string; // ID of member who created / assigned the task
  assignmentStatus: AssignmentStatus;
  declineReason?: string;
  reviewerId?: string; // Optional reviewer e.g. Sinta Lubis
  hours: number; // estimated hours for workload calculation
  checklist: ChecklistItem[];
  comments: TaskComment[];
  prTag?: string; // e.g. '#482 feat(onboarding): passed skip'
  attachmentsCount?: number;
  imageUrl?: string; // image preview for marketing cards
  progressFraction?: string; // e.g. '3/5', '2/8'
  createdAt: string;
}

export interface TrellisNotification {
  id: string;
  recipientId: string; // assignee or assigner
  senderId: string;
  senderName: string;
  taskId: string;
  taskTitle: string;
  type: 'assigned' | 'reassigned' | 'accepted' | 'declined' | 'status_changed';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface ActivityHistoryItem {
  id: string;
  taskId: string;
  taskTitle: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  timestamp: number;
  message: string;
  taskBackup?: TrellisTask;
  actionType?: 'status_change' | 'delete';
}

export type ViewTab = 'board' | 'list' | 'timeline' | 'docs' | 'files';
