export type TaskStatus = 'To do' | 'In progress' | 'In review' | 'Done';

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
