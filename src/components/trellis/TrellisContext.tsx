import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import {
  TrellisTask,
  TeamMember,
  TrellisNotification,
  TaskStatus,
  AssignmentStatus,
  ActivityHistoryItem,
  ViewTab,
  TaskLabel,
} from './types';
import { initialTeamMembers, initialTasks } from './mockData';
import { AuthContext } from '../../context/AuthContext';
import { employeeRepository } from '../../services';
import { isLaravelApiConfigured } from '../../services/laravelClient';
import {
  createLaravelTask,
  deleteLaravelTask,
  listLaravelTasks,
  mapAuthenticatedUserToTeamMember,
  mapEmployeeToTeamMember,
  updateLaravelTask,
  updateLaravelTaskAssignment,
  updateLaravelTaskStatus,
} from '../../services/trellisApi';
import { Employee } from '../../types';
import { normalizeRole } from '../../utils/rbac';

interface CreateTaskInput {
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  labels: TaskLabel[];
  assigneeId: string;
  hours?: number;
  reviewerId?: string;
  prTag?: string;
}

interface TrellisContextType {
  tasks: TrellisTask[];
  teamMembers: TeamMember[];
  currentUser: TeamMember;
  findMember: (idOrEmail?: string | number) => TeamMember | undefined;
  switchUser: (userId: string) => void;
  notifications: TrellisNotification[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  createTask: (input: CreateTaskInput) => Promise<TrellisTask | null>;
  updateTask: (taskId: string, updates: Partial<TrellisTask>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  isApiMode: boolean;
  isLoading: boolean;
  apiError: string | null;
  clearApiError: () => void;
  canUndo: boolean;
  canManageTasks: boolean;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  assignTask: (taskId: string, newAssigneeId: string) => void;
  acceptTask: (taskId: string) => void;
  declineTask: (taskId: string, reason?: string) => void;
  moveTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  undoLastAction: () => void;
  activeToast: ActivityHistoryItem | null;
  clearToast: () => void;
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  myTasksMode: boolean;
  setMyTasksMode: (val: boolean) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  isNewTaskModalOpen: boolean;
  setIsNewTaskModalOpen: (open: boolean) => void;
  isInboxOpen: boolean;
  setIsInboxOpen: (open: boolean) => void;
  teamWorkload: Record<string, number>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedAssigneeFilter: string; // 'All' or userId
  setSelectedAssigneeFilter: (val: string) => void;
  selectedLabelFilter: string; // 'All' or label
  setSelectedLabelFilter: (val: string) => void;
  selectedGroupFilter: 'Status' | 'Assignee' | 'Priority';
  setSelectedGroupFilter: (val: 'Status' | 'Assignee' | 'Priority') => void;
}

const TrellisContext = createContext<TrellisContextType | undefined>(undefined);

export const TrellisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isApiMode = import.meta.env.PROD || isLaravelApiConfigured();
  const authContext = useContext(AuthContext);
  const authenticatedUser = authContext?.isAuthenticated ? authContext.currentUser : null;
  const canManageTasks = !isApiMode || ['ADMIN', 'HR_STAFF'].includes(normalizeRole(authContext?.currentRole) || '');
  const [tasks, setTasks] = useState<TrellisTask[]>(isApiMode ? [] : initialTasks);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(isApiMode ? [] : initialTeamMembers);
  const [employeeRecords, setEmployeeRecords] = useState<Employee[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialTeamMembers[0]?.id || '');
  const currentUser = useMemo(() => {
    if (!isApiMode) return teamMembers.find((member) => member.id === selectedUserId) || initialTeamMembers[0];
    if (authenticatedUser) {
      const employee = employeeRecords.find((record) =>
        (authenticatedUser.employeeId && String(record.id) === String(authenticatedUser.employeeId)) ||
        (authenticatedUser.staffId && record.staffId === authenticatedUser.staffId)
      );
      return mapAuthenticatedUserToTeamMember(authenticatedUser, employee);
    }
    return {
      id: '', name: 'Signed-out user', initials: '', role: '', avatarBg: 'bg-slate-600', avatarText: 'text-white',
      email: '', capacityHours: 0,
    };
  }, [authenticatedUser, employeeRecords, isApiMode, selectedUserId, teamMembers]);
  const [isLoading, setIsLoading] = useState(isApiMode);
  const [apiError, setApiError] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [notifications, setNotifications] = useState<TrellisNotification[]>(isApiMode ? [] : [
    {
      id: 'notif-1',
      recipientId: 'user-nadia',
      senderId: 'user-bayu',
      senderName: 'Bayu Wirawan',
      taskId: 'PAS-218',
      taskTitle: 'Let users skip the location permission step',
      type: 'assigned',
      message: 'assigned you to "Let users skip the location permission step"',
      timestamp: '15 min ago',
      read: false,
    },
    {
      id: 'notif-2',
      recipientId: 'user-nadia',
      senderId: 'user-sinta',
      senderName: 'Sinta Lubis',
      taskId: 'PAS-223',
      taskTitle: 'Push copy for 10.10 promo week',
      type: 'assigned',
      message: 'assigned you to "Push copy for 10.10 promo week"',
      timestamp: '2 hours ago',
      read: false,
    },
    {
      id: 'notif-3',
      recipientId: 'user-nadia',
      senderId: 'user-sinta',
      senderName: 'Sinta Lubis',
      taskId: 'PAS-218',
      taskTitle: 'Let users skip the location permission step',
      type: 'status_changed',
      message: 'reviewed and approved PAS-218',
      timestamp: '12 min ago',
      read: true,
    },
  ]);

  const [activeTab, setActiveTab] = useState<ViewTab>('board');
  const [myTasksMode, setMyTasksMode] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeToast, setActiveToast] = useState<ActivityHistoryItem | null>(null);
  const [undoStack, setUndoStack] = useState<ActivityHistoryItem[]>([]);

  // Trellis uses the authenticated Laravel API whenever configured and always in production.
  // Local fixture data remains confined to unconfigured development/test runs.
  useEffect(() => {
    if (!isApiMode) return;
    let active = true;
    setIsLoading(true);
    setTasks([]);
    setTeamMembers([]);
    setEmployeeRecords([]);
    setSelectedTaskId(null);
    Promise.allSettled([listLaravelTasks(), employeeRepository.getAll()]).then(([taskResult, employeeResult]) => {
      if (!active) return;
      const errors: string[] = [];
      if (taskResult.status === 'fulfilled') setTasks(taskResult.value);
      else errors.push(`Tasks: ${taskResult.reason instanceof Error ? taskResult.reason.message : 'request failed'}`);
      if (employeeResult.status === 'fulfilled') {
        setEmployeeRecords(employeeResult.value);
        setTeamMembers(employeeResult.value.map(mapEmployeeToTeamMember));
      }
      else errors.push(`Employees: ${employeeResult.reason instanceof Error ? employeeResult.reason.message : 'request failed'}`);
      setApiError(errors.length ? errors.join(' ') : null);
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [authenticatedUser?.id, isApiMode]);

  // Listen for global open new task event
  React.useEffect(() => {
    const handleOpenModal = () => setIsNewTaskModalOpen(true);
    window.addEventListener('trellis-open-new-task', handleOpenModal);
    return () => window.removeEventListener('trellis-open-new-task', handleOpenModal);
  }, []);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState('All');
  const [selectedLabelFilter, setSelectedLabelFilter] = useState('All');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'Status' | 'Assignee' | 'Priority'>('Status');

  const findMember = useCallback(
    (idOrEmail?: string | number): TeamMember | undefined => {
      if (!idOrEmail) return undefined;
      const value = String(idOrEmail).trim().toLowerCase();
      return teamMembers.find((member) =>
        member.id.toLowerCase() === value ||
        String(member.staffId || '').toLowerCase() === value ||
        member.email.toLowerCase() === value ||
        member.name.toLowerCase() === value
      );
    },
    [teamMembers]
  );

  const switchUser = useCallback((userId: string) => {
    if (isApiMode) return;
    if (teamMembers.some((member) => member.id === userId)) setSelectedUserId(userId);
  }, [isApiMode, teamMembers]);

  const userNotifications = useMemo(
    () => notifications.filter((notification) => notification.recipientId === currentUser.id),
    [notifications, currentUser.id]
  );
  const unreadNotificationCount = useMemo(() => userNotifications.filter((item) => !item.read).length, [userNotifications]);
  const clearApiError = useCallback(() => setApiError(null), []);
  const reportApiError = useCallback((error: unknown) => {
    setApiError(error instanceof Error ? error.message : 'The task operation failed.');
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((previous) => previous.map((item) => item.id === id ? { ...item, read: true } : item));
  }, []);
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((previous) => previous.map((item) => item.recipientId === currentUser.id ? { ...item, read: true } : item));
  }, [currentUser.id]);

  const teamWorkload = useMemo(() => {
    const hours: Record<string, number> = {};
    teamMembers.forEach((member) => { hours[member.id] = 0; });
    tasks.forEach((task) => {
      if (task.status === 'Done') return;
      const member = findMember(task.assigneeId);
      if (member) hours[member.id] = (hours[member.id] || 0) + (task.hours ?? 0);
    });
    return hours;
  }, [tasks, teamMembers, findMember]);

  const createTask = useCallback(async (input: CreateTaskInput): Promise<TrellisTask | null> => {
    if (isApiMode) {
      try {
        const created = await createLaravelTask({
          ...input,
          departmentId: authenticatedUser?.departmentId,
        });
        setTasks((previous) => [created, ...previous]);
        setApiError(null);
        return created;
      } catch (error) {
        reportApiError(error);
        return null;
      }
    }

    const newId = `PAS-${tasks.length + 219}`;
    const isSelfAssignment = input.assigneeId === currentUser.id;
    const createdTask: TrellisTask = {
      id: newId,
      title: input.title,
      description: input.description,
      status: input.status || 'To do',
      labels: input.labels || ['Feature'],
      dueDate: input.dueDate || '',
      assigneeId: input.assigneeId,
      assignerId: currentUser.id,
      assignmentStatus: isSelfAssignment ? 'accepted' : 'pending',
      reviewerId: input.reviewerId,
      hours: input.hours ?? 8,
      checklist: [],
      comments: [],
      prTag: input.prTag,
      createdAt: `Just now by ${currentUser.name.split(' ')[0]}`,
    };
    setTasks((previous) => [createdTask, ...previous]);
    if (!isSelfAssignment) {
      setNotifications((previous) => [{
        id: `notif-${Date.now()}`, recipientId: input.assigneeId, senderId: currentUser.id,
        senderName: currentUser.name, taskId: newId, taskTitle: input.title, type: 'assigned',
        message: `${currentUser.name} assigned you to "${input.title}"`, timestamp: 'Just now', read: false,
      }, ...previous]);
    }
    return createdTask;
  }, [authenticatedUser?.departmentId, currentUser, isApiMode, reportApiError, tasks.length]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<TrellisTask>): Promise<void> => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (isApiMode) {
      try {
        const updated = await updateLaravelTask(task, updates);
        setTasks((previous) => previous.map((item) => item.id === taskId ? updated : item));
        setApiError(null);
      } catch (error) {
        reportApiError(error);
      }
      return;
    }
    setTasks((previous) => previous.map((item) => item.id === taskId ? { ...item, ...updates } : item));
  }, [isApiMode, reportApiError, tasks]);

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (isApiMode) {
      try {
        await deleteLaravelTask(taskId);
        setTasks((previous) => previous.filter((item) => item.id !== taskId));
        if (selectedTaskId === taskId) { setSelectedTaskId(null); setIsEditMode(false); }
        setCanUndo(false);
        setUndoStack([]);
        setActiveToast({
          id: `act-${Date.now()}`, taskId, taskTitle: task.title, previousStatus: task.status,
          newStatus: task.status, timestamp: Date.now(), message: `Deleted task "${task.title}"`,
        });
        setApiError(null);
      } catch (error) {
        reportApiError(error);
      }
      return;
    }
    setTasks((previous) => previous.filter((item) => item.id !== taskId));
    if (selectedTaskId === taskId) { setSelectedTaskId(null); setIsEditMode(false); }
    const toast: ActivityHistoryItem = {
      id: `act-${Date.now()}`, taskId, taskTitle: task.title, previousStatus: task.status,
      newStatus: task.status, timestamp: Date.now(), message: `Deleted task "${task.title}"`,
      taskBackup: task, actionType: 'delete',
    };
    setActiveToast(toast);
    setUndoStack((previous) => [toast, ...previous]);
    setCanUndo(true);
  }, [isApiMode, reportApiError, selectedTaskId, tasks]);

  const assignTask = useCallback(async (taskId: string, newAssigneeId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.assigneeId === newAssigneeId) return;
    if (isApiMode) {
      try {
        const updated = await updateLaravelTask(task, { assigneeId: newAssigneeId });
        setTasks((previous) => previous.map((item) => item.id === taskId ? updated : item));
        setApiError(null);
      } catch (error) { reportApiError(error); }
      return;
    }
    const newAssignee = teamMembers.find((member) => member.id === newAssigneeId);
    const self = newAssigneeId === currentUser.id;
    setTasks((previous) => previous.map((item) => item.id === taskId ? {
      ...item, assigneeId: newAssigneeId, assignerId: currentUser.id,
      assignmentStatus: self ? 'accepted' : 'pending', declineReason: undefined,
    } : item));
    if (newAssignee && !self) {
      setNotifications((previous) => [{
        id: `notif-${Date.now()}`, recipientId: newAssigneeId, senderId: currentUser.id,
        senderName: currentUser.name, taskId, taskTitle: task.title, type: 'reassigned',
        message: `${currentUser.name} assigned you to "${task.title}"`, timestamp: 'Just now', read: false,
      }, ...previous]);
    }
  }, [currentUser, isApiMode, reportApiError, tasks, teamMembers]);

  const acceptTask = useCallback(async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (isApiMode) {
      try {
        const updated = await updateLaravelTaskAssignment(task, 'accepted');
        setTasks((previous) => previous.map((item) => item.id === taskId ? updated : item));
        setApiError(null);
      } catch (error) { reportApiError(error); }
      return;
    }
    setTasks((previous) => previous.map((item) => item.id === taskId ? { ...item, assignmentStatus: 'accepted' } : item));
  }, [isApiMode, reportApiError, tasks]);

  const declineTask = useCallback(async (taskId: string, reason?: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (isApiMode) {
      try {
        const updated = await updateLaravelTaskAssignment(task, 'declined', reason);
        setTasks((previous) => previous.map((item) => item.id === taskId ? updated : item));
        setApiError(null);
      } catch (error) { reportApiError(error); }
      return;
    }
    setTasks((previous) => previous.map((item) => item.id === taskId ? {
      ...item, assignmentStatus: 'declined', declineReason: reason || 'Declined by assignee',
    } : item));
  }, [isApiMode, reportApiError, tasks]);

  const moveTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === newStatus) return;
    const previousStatus = task.status;
    let updated = { ...task, status: newStatus };
    if (isApiMode) {
      try {
        updated = await updateLaravelTaskStatus(task, newStatus);
        setApiError(null);
      } catch (error) { reportApiError(error); return; }
    }
    setTasks((previous) => previous.map((item) => item.id === taskId ? updated : item));
    const reviewer = teamMembers.find((member) => member.id === task.reviewerId);
    const assignee = teamMembers.find((member) => member.id === task.assigneeId);
    const target = reviewer?.name || assignee?.name;
    const toast: ActivityHistoryItem = {
      id: `act-${Date.now()}`, taskId, taskTitle: task.title, previousStatus, newStatus,
      timestamp: Date.now(), message: newStatus === 'In review' && target && !isApiMode
        ? `Moved to In review • ${target} was asked to review`
        : `Moved to ${newStatus}`,
      actionType: 'status_change',
    };
    setActiveToast(toast);
    setUndoStack((previous) => [toast, ...previous]);
    setCanUndo(true);
  }, [isApiMode, reportApiError, tasks, teamMembers]);

  const undoLastAction = useCallback(async () => {
    if (!canUndo || undoStack.length === 0) return;
    const [lastAction, ...rest] = undoStack;
    if (isApiMode) {
      if (lastAction.actionType === 'delete') {
        reportApiError(new Error('Deleted tasks cannot be restored through the current API.'));
        return;
      }
      const task = tasks.find((item) => item.id === lastAction.taskId);
      if (!task) return;
      try {
        const reverted = await updateLaravelTaskStatus(task, lastAction.previousStatus);
        setTasks((previous) => previous.map((item) => item.id === task.id ? reverted : item));
        setUndoStack(rest);
        setCanUndo(rest.length > 0);
        setActiveToast(null);
        setApiError(null);
      } catch (error) { reportApiError(error); }
      return;
    }
    if (lastAction.actionType === 'delete' && lastAction.taskBackup) {
      setTasks((previous) => [lastAction.taskBackup!, ...previous]);
    } else {
      setTasks((previous) => previous.map((item) => item.id === lastAction.taskId ? { ...item, status: lastAction.previousStatus } : item));
    }
    setUndoStack(rest);
    setCanUndo(rest.length > 0);
    setActiveToast(null);
  }, [canUndo, isApiMode, reportApiError, tasks, undoStack]);

  const clearToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  return (
    <TrellisContext.Provider
      value={{
        tasks,
        teamMembers,
        currentUser,
        findMember,
        switchUser,
        notifications: userNotifications,
        unreadNotificationCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        createTask,
        updateTask,
        deleteTask,
        isApiMode,
        isLoading,
        apiError,
        clearApiError,
        canUndo,
        canManageTasks,
        isEditMode,
        setIsEditMode,
        assignTask,
        acceptTask,
        declineTask,
        moveTaskStatus,
        undoLastAction,
        activeToast,
        clearToast,
        activeTab,
        setActiveTab,
        myTasksMode,
        setMyTasksMode,
        selectedTaskId,
        setSelectedTaskId,
        isNewTaskModalOpen,
        setIsNewTaskModalOpen,
        isInboxOpen,
        setIsInboxOpen,
        teamWorkload,
        searchQuery,
        setSearchQuery,
        selectedAssigneeFilter,
        setSelectedAssigneeFilter,
        selectedLabelFilter,
        setSelectedLabelFilter,
        selectedGroupFilter,
        setSelectedGroupFilter,
      }}
    >
      {children}
    </TrellisContext.Provider>
  );
};

export const useTrellis = () => {
  const context = useContext(TrellisContext);
  if (!context) {
    throw new Error('useTrellis must be used within a TrellisProvider');
  }
  return context;
};
