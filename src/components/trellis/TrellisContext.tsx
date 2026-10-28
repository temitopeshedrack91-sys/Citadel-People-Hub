import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
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
  switchUser: (userId: string) => void;
  notifications: TrellisNotification[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  createTask: (input: CreateTaskInput) => TrellisTask;
  updateTask: (taskId: string, updates: Partial<TrellisTask>) => void;
  deleteTask: (taskId: string) => void;
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
  const [tasks, setTasks] = useState<TrellisTask[]>(initialTasks);
  const [teamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [currentUser, setCurrentUser] = useState<TeamMember>(initialTeamMembers[0]); // Nadia Safitri by default
  const [notifications, setNotifications] = useState<TrellisNotification[]>([
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

  const switchUser = useCallback((userId: string) => {
    const found = teamMembers.find((m) => m.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  }, [teamMembers]);

  // Notifications filtered for current user
  const userNotifications = useMemo(() => {
    return notifications.filter((n) => n.recipientId === currentUser.id);
  }, [notifications, currentUser.id]);

  const unreadNotificationCount = useMemo(() => {
    return userNotifications.filter((n) => !n.read).length;
  }, [userNotifications]);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => (n.recipientId === currentUser.id ? { ...n, read: true } : n))
    );
  }, [currentUser.id]);

  // Dynamically calculate team workload hours from active tasks
  const teamWorkload = useMemo(() => {
    const hoursMap: Record<string, number> = {
      'user-nadia': 0,
      'user-bayu': 0,
      'user-sinta': 0,
      'user-jonathan': 0,
      'user-raka': 0,
    };

    tasks.forEach((t) => {
      // Done tasks are archived/complete; active tasks contribute to workload
      if (t.status !== 'Done') {
        const assignedId = t.assigneeId;
        if (hoursMap[assignedId] !== undefined) {
          hoursMap[assignedId] += t.hours || 8;
        }
      }
    });

    return hoursMap;
  }, [tasks]);

  // Create Task Flow
  const createTask = useCallback(
    (input: CreateTaskInput): TrellisTask => {
      const newIdNum = tasks.length + 219;
      const newId = `PAS-${newIdNum}`;
      const isSelfAssignment = input.assigneeId === currentUser.id;

      const createdTask: TrellisTask = {
        id: newId,
        title: input.title,
        description: input.description,
        status: input.status || 'To do',
        labels: input.labels || ['Feature'],
        dueDate: input.dueDate || 'Oct 28',
        assigneeId: input.assigneeId,
        assignerId: currentUser.id,
        assignmentStatus: isSelfAssignment ? 'accepted' : 'pending',
        reviewerId: input.reviewerId,
        hours: input.hours || 8,
        checklist: [],
        comments: [],
        prTag: input.prTag,
        createdAt: `Just now by ${currentUser.name.split(' ')[0]}`,
      };

      setTasks((prev) => [createdTask, ...prev]);

      // If assigned to someone else, send them a notification
      if (!isSelfAssignment) {
        const notif: TrellisNotification = {
          id: `notif-${Date.now()}`,
          recipientId: input.assigneeId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          taskId: newId,
          taskTitle: input.title,
          type: 'assigned',
          message: `${currentUser.name} assigned you to "${input.title}"`,
          timestamp: 'Just now',
          read: false,
        };
        setNotifications((prev) => [notif, ...prev]);
      }

      return createdTask;
    },
    [tasks.length, currentUser]
  );

  const updateTask = useCallback((taskId: string, updates: Partial<TrellisTask>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
  }, []);

  // Delete Task Flow with Undo Support
  const deleteTask = useCallback(
    (taskId: string) => {
      const taskToDelete = tasks.find((t) => t.id === taskId);
      if (!taskToDelete) return;

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
        setIsEditMode(false);
      }

      const toastItem: ActivityHistoryItem = {
        id: `act-${Date.now()}`,
        taskId,
        taskTitle: taskToDelete.title,
        previousStatus: taskToDelete.status,
        newStatus: taskToDelete.status,
        timestamp: Date.now(),
        message: `Deleted task "${taskToDelete.title}"`,
        taskBackup: taskToDelete,
        actionType: 'delete',
      };

      setActiveToast(toastItem);
      setUndoStack((prev) => [toastItem, ...prev]);
    },
    [tasks, selectedTaskId]
  );

  // Reassignment Flow
  const assignTask = useCallback(
    (taskId: string, newAssigneeId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.assigneeId === newAssigneeId) return;

      const newAssignee = teamMembers.find((m) => m.id === newAssigneeId);
      const isSelf = newAssigneeId === currentUser.id;

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              assigneeId: newAssigneeId,
              assignerId: currentUser.id,
              assignmentStatus: isSelf ? 'accepted' : 'pending',
              declineReason: undefined,
            };
          }
          return t;
        })
      );

      // Create notification for new assignee
      if (newAssignee && !isSelf) {
        const notif: TrellisNotification = {
          id: `notif-${Date.now()}`,
          recipientId: newAssigneeId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          taskId: task.id,
          taskTitle: task.title,
          type: 'reassigned',
          message: `${currentUser.name} assigned you to "${task.title}"`,
          timestamp: 'Just now',
          read: false,
        };
        setNotifications((prev) => [notif, ...prev]);
      }
    },
    [tasks, teamMembers, currentUser]
  );

  // Accept Task Flow
  const acceptTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, assignmentStatus: 'accepted' } : t))
      );

      // Notify the assigner that task was accepted
      if (task.assignerId && task.assignerId !== currentUser.id) {
        const notif: TrellisNotification = {
          id: `notif-${Date.now()}`,
          recipientId: task.assignerId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          taskId: task.id,
          taskTitle: task.title,
          type: 'accepted',
          message: `${currentUser.name} accepted assignment for "${task.title}"`,
          timestamp: 'Just now',
          read: false,
        };
        setNotifications((prev) => [notif, ...prev]);
      }
    },
    [tasks, currentUser]
  );

  // Decline Task Flow
  const declineTask = useCallback(
    (taskId: string, reason?: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, assignmentStatus: 'declined', declineReason: reason || 'Declined by assignee' }
            : t
        )
      );

      // Notify the assigner that task was declined
      if (task.assignerId && task.assignerId !== currentUser.id) {
        const notif: TrellisNotification = {
          id: `notif-${Date.now()}`,
          recipientId: task.assignerId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          taskId: task.id,
          taskTitle: task.title,
          type: 'declined',
          message: `${currentUser.name} declined "${task.title}"${reason ? `: "${reason}"` : ''}`,
          timestamp: 'Just now',
          read: false,
        };
        setNotifications((prev) => [notif, ...prev]);
      }
    },
    [tasks, currentUser]
  );

  // Move Task Status Flow with Undo Support
  const moveTaskStatus = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      const previousStatus = task.status;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      // Target reviewer / assignee name for toast
      const reviewer = teamMembers.find((m) => m.id === task.reviewerId);
      const assignee = teamMembers.find((m) => m.id === task.assigneeId);
      const targetPersonName = reviewer ? reviewer.name : assignee?.name || 'team';

      const toastItem: ActivityHistoryItem = {
        id: `act-${Date.now()}`,
        taskId,
        taskTitle: task.title,
        previousStatus,
        newStatus,
        timestamp: Date.now(),
        message:
          newStatus === 'In review'
            ? `Moved to In review • ${targetPersonName} was asked to review`
            : `Moved to ${newStatus}`,
      };

      setActiveToast(toastItem);
      setUndoStack((prev) => [toastItem, ...prev]);
    },
    [tasks, teamMembers]
  );

  // Undo Last Action
  const undoLastAction = useCallback(() => {
    if (undoStack.length === 0) return;
    const [lastAction, ...rest] = undoStack;

    if (lastAction.actionType === 'delete' && lastAction.taskBackup) {
      setTasks((prev) => [lastAction.taskBackup!, ...prev]);
    } else {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === lastAction.taskId ? { ...t, status: lastAction.previousStatus } : t
        )
      );
    }

    setUndoStack(rest);
    setActiveToast(null);
  }, [undoStack]);

  const clearToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  return (
    <TrellisContext.Provider
      value={{
        tasks,
        teamMembers,
        currentUser,
        switchUser,
        notifications: userNotifications,
        unreadNotificationCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        createTask,
        updateTask,
        deleteTask,
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
