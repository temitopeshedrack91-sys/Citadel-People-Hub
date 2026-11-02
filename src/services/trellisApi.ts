import { Employee, User } from '../types';
import { requestLaravel, requestLaravelData } from './laravelClient';
import { AssignmentStatus, TaskComment, TaskLabel, TaskStatus, TeamMember, TrellisTask } from '../components/trellis/types';

type LaravelComment = {
  id: number | string;
  comment: string;
  created_at?: string;
  author?: { id?: number | string; full_name?: string | null } | null;
};

export type LaravelTask = {
  id: number | string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string | null;
  assigned_to_employee_id?: number | string | null;
  created_by_employee_id?: number | string | null;
  reviewer_employee_id?: number | string | null;
  assignment_status?: AssignmentStatus | null;
  decline_reason?: string | null;
  labels?: string[] | null;
  estimated_hours?: number | string | null;
  checklist?: { id: string; text: string; done: boolean }[] | null;
  pr_tag?: string | null;
  created_at?: string;
  project?: { id?: number | string; title?: string | null; code?: string | null } | null;
  department?: { id?: number | string; name?: string | null } | null;
  assignee?: { id?: number | string; staff_id?: string | null; full_name?: string | null; job_title?: string | null } | null;
  creator?: { id?: number | string; staff_id?: string | null; full_name?: string | null } | null;
  reviewer?: { id?: number | string; staff_id?: string | null; full_name?: string | null } | null;
  comments?: LaravelComment[];
};

const statusFromApi: Record<LaravelTask['status'], TaskStatus> = {
  todo: 'To do',
  in_progress: 'In progress',
  review: 'In review',
  completed: 'Done',
};

const apiStatusFromTask: Record<TaskStatus, LaravelTask['status']> = {
  'To do': 'todo',
  'In progress': 'in_progress',
  'In review': 'review',
  Done: 'completed',
};

export const taskStatusToApi = (status: TaskStatus): LaravelTask['status'] => apiStatusFromTask[status];

const allowedLabels: TaskLabel[] = [
  'Feature', 'Bug', 'Design', 'Tech', 'Onboarding', 'Marketing', 'Android', 'Data', 'Content', 'Design system', 'High',
];

const initials = (name: string): string => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');

export function mapEmployeeToTeamMember(employee: Employee, index = 0): TeamMember {
  const colors = [
    ['bg-amber-400', 'text-slate-900'], ['bg-emerald-500', 'text-white'], ['bg-purple-500', 'text-white'],
    ['bg-cyan-500', 'text-white'], ['bg-blue-600', 'text-white'], ['bg-[#083E34]', 'text-amber-300'],
  ];
  const name = employee.fullName || `${employee.firstName} ${employee.lastName}`.trim();
  const [avatarBg, avatarText] = colors[index % colors.length];
  return {
    id: String(employee.id),
    staffId: employee.staffId,
    name,
    initials: initials(name),
    role: employee.jobTitle || 'Employee',
    avatarBg,
    avatarText,
    email: employee.email || '',
    capacityHours: 40,
  };
}

export function mapAuthenticatedUserToTeamMember(user: User, employeeMatch?: Employee): TeamMember {
  const member = employeeMatch ? mapEmployeeToTeamMember(employeeMatch) : {
    id: `unlinked:${user.id}`,
    staffId: user.staffId,
    name: user.name,
    initials: initials(user.name),
    role: user.jobTitle || user.role,
    avatarBg: 'bg-slate-600',
    avatarText: 'text-white',
    email: user.email,
    capacityHours: 40,
  };
  return member;
}

function mapComment(comment: LaravelComment): TaskComment {
  const authorName = comment.author?.full_name || 'Unknown employee';
  return {
    id: String(comment.id),
    authorId: String(comment.author?.id || ''),
    authorName,
    authorInitials: initials(authorName),
    authorBg: 'bg-slate-500',
    text: comment.comment,
    timeAgo: comment.created_at ? new Date(comment.created_at).toLocaleString() : '',
  };
}

export function mapLaravelTask(task: LaravelTask): TrellisTask {
  const assignerName = task.creator?.full_name;
  const createdAt = task.created_at ? new Date(task.created_at).toLocaleDateString() : '';
  return {
    id: String(task.id),
    title: task.title,
    description: task.description || '',
    status: statusFromApi[task.status],
    labels: (task.labels || []).filter((label): label is TaskLabel => allowedLabels.includes(label as TaskLabel)),
    dueDate: task.due_date || '',
    assigneeId: task.assigned_to_employee_id === null || task.assigned_to_employee_id === undefined ? '' : String(task.assigned_to_employee_id),
    assignerId: task.created_by_employee_id === null || task.created_by_employee_id === undefined ? '' : String(task.created_by_employee_id),
    assignmentStatus: task.assignment_status || 'accepted',
    declineReason: task.decline_reason || undefined,
    reviewerId: task.reviewer_employee_id === null || task.reviewer_employee_id === undefined ? undefined : String(task.reviewer_employee_id),
    hours: Number(task.estimated_hours || 0),
    checklist: (task.checklist || []).map((item) => ({ ...item })),
    comments: (task.comments || []).map(mapComment),
    prTag: task.pr_tag || undefined,
    createdAt: [createdAt, assignerName ? `by ${assignerName}` : ''].filter(Boolean).join(' '),
  };
}

export async function listLaravelTasks(): Promise<TrellisTask[]> {
  const page = await requestLaravelData<{ data?: LaravelTask[] } | LaravelTask[]>('/tasks');
  const rows = Array.isArray(page) ? page : page?.data;
  if (!Array.isArray(rows)) throw new Error('The tasks API returned an unsupported response shape.');
  return rows.map(mapLaravelTask);
}

export async function getLaravelTask(taskId: string): Promise<TrellisTask> {
  const task = await requestLaravelData<LaravelTask>(`/tasks/${encodeURIComponent(taskId)}`);
  return mapLaravelTask(task);
}

export async function createLaravelTask(input: {
  title: string;
  description: string;
  status: TaskStatus;
  labels: TaskLabel[];
  dueDate: string;
  assigneeId?: string;
  departmentId?: string;
  reviewerId?: string;
  hours?: number;
  prTag?: string;
}): Promise<TrellisTask> {
  const assignedTo = input.assigneeId && /^\d+$/.test(input.assigneeId) ? Number(input.assigneeId) : null;
  const task = await requestLaravelData<LaravelTask>('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      status: taskStatusToApi(input.status),
      priority: input.labels.includes('High') ? 'high' : 'medium',
      due_date: input.dueDate || null,
      assigned_to_employee_id: assignedTo,
      department_id: assignedTo === null && input.departmentId && /^\d+$/.test(input.departmentId) ? Number(input.departmentId) : null,
      reviewer_employee_id: input.reviewerId && /^\d+$/.test(input.reviewerId) ? Number(input.reviewerId) : null,
      labels: input.labels,
      estimated_hours: input.hours ?? null,
      pr_tag: input.prTag || null,
    }),
  });
  return mapLaravelTask(task);
}

export async function updateLaravelTask(task: TrellisTask, updates: Partial<TrellisTask>): Promise<TrellisTask> {
  const body: Record<string, unknown> = {};
  if (updates.title !== undefined) body.title = updates.title;
  if (updates.description !== undefined) body.description = updates.description;
  if (updates.status !== undefined) body.status = taskStatusToApi(updates.status);
  if (updates.labels !== undefined) {
    body.labels = updates.labels;
    body.priority = updates.labels.includes('High') ? 'high' : 'medium';
  }
  if (updates.dueDate !== undefined) body.due_date = updates.dueDate || null;
  if (updates.assigneeId !== undefined) body.assigned_to_employee_id = updates.assigneeId && /^\d+$/.test(updates.assigneeId) ? Number(updates.assigneeId) : null;
  if (updates.reviewerId !== undefined) body.reviewer_employee_id = updates.reviewerId && /^\d+$/.test(updates.reviewerId) ? Number(updates.reviewerId) : null;
  if (updates.hours !== undefined) body.estimated_hours = updates.hours;
  if (updates.checklist !== undefined) body.checklist = updates.checklist;
  if (updates.prTag !== undefined) body.pr_tag = updates.prTag || null;

  let changed = false;
  if (Object.keys(body).length > 0) {
    if (Object.keys(body).length === 1 && updates.checklist !== undefined) {
      await requestLaravelData(`/tasks/${encodeURIComponent(task.id)}/checklist`, {
        method: 'PATCH', body: JSON.stringify({ checklist: updates.checklist }),
      });
    } else {
      await requestLaravelData(`/tasks/${encodeURIComponent(task.id)}`, {
        method: 'PUT', body: JSON.stringify(body),
      });
    }
    changed = true;
  }

  const nextComments = updates.comments;
  if (nextComments && nextComments.length > task.comments.length) {
    const newComments = nextComments.filter((comment) => !task.comments.some((current) => current.id === comment.id));
    for (const comment of newComments) {
      await requestLaravelData(`/tasks/${encodeURIComponent(task.id)}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment: comment.text }),
      });
      changed = true;
    }
  }

  return changed ? getLaravelTask(task.id) : task;
}

export async function updateLaravelTaskStatus(task: TrellisTask, status: TaskStatus): Promise<TrellisTask> {
  await requestLaravelData<LaravelTask>(`/tasks/${encodeURIComponent(task.id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: taskStatusToApi(status) }),
  });
  return getLaravelTask(task.id);
}

export async function updateLaravelTaskAssignment(task: TrellisTask, status: AssignmentStatus, reason?: string): Promise<TrellisTask> {
  const updated = await requestLaravelData<LaravelTask>(`/tasks/${encodeURIComponent(task.id)}/assignment`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
  return mapLaravelTask(updated);
}

export async function deleteLaravelTask(taskId: string): Promise<void> {
  await requestLaravel(`/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
}
