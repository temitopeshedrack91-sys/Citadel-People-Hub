import React, { useState, useEffect } from 'react';
import {
  X,
  Link2,
  Maximize2,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Tag,
  Paperclip,
  CheckSquare,
  MessageSquare,
  Send,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTrellis } from './TrellisContext';
import { TaskStatus, TaskLabel } from './types';

const ALL_LABELS: TaskLabel[] = [
  'Feature',
  'Bug',
  'Design',
  'Tech',
  'Onboarding',
  'Marketing',
  'Android',
  'Data',
  'Content',
  'Design system',
  'High',
];

export const TrellisTaskDetail: React.FC = () => {
  const {
    tasks,
    selectedTaskId,
    setSelectedTaskId,
    teamMembers,
    findMember,
    currentUser,
    updateTask,
    deleteTask,
    isEditMode,
    setIsEditMode,
    assignTask,
    acceptTask,
    declineTask,
    moveTaskStatus,
  } = useTrellis();

  const [commentInput, setCommentInput] = useState('');
  const [declineReasonInput, setDeclineReasonInput] = useState('');
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const task = tasks.find((t) => t.id === selectedTaskId);

  // Edit form state
  const [editTitle, setEditTitle] = useState(task?.title || '');
  const [editDescription, setEditDescription] = useState(task?.description || '');
  const [editStatus, setEditStatus] = useState<TaskStatus>(task?.status || 'To do');
  const [editAssigneeId, setEditAssigneeId] = useState(task?.assigneeId || '');
  const [editDueDate, setEditDueDate] = useState(task?.dueDate || '');
  const [editHours, setEditHours] = useState(task?.hours || 8);
  const [editLabels, setEditLabels] = useState<TaskLabel[]>(task?.labels || []);
  const [editPrTag, setEditPrTag] = useState(task?.prTag || '');

  // Keep edit state in sync whenever selected task changes
  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDescription(task.description);
      setEditStatus(task.status);
      setEditAssigneeId(task.assigneeId);
      setEditDueDate(task.dueDate);
      setEditHours(task.hours);
      setEditLabels(task.labels);
      setEditPrTag(task.prTag || '');
      setIsDeleteConfirmOpen(false);
    }
  }, [task?.id]);

  useEffect(() => {
    if (!selectedTaskId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDeleteConfirmOpen) {
          setIsDeleteConfirmOpen(false);
        } else if (isDeclineModalOpen) {
          setIsDeclineModalOpen(false);
        } else if (isEditMode) {
          setIsEditMode(false);
        } else {
          setSelectedTaskId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeclineModalOpen, isDeleteConfirmOpen, isEditMode, selectedTaskId, setSelectedTaskId, setIsEditMode]);

  if (!task) return null;

  const assignee = findMember(task.assigneeId) || teamMembers.find((m) => m.id === task.assigneeId);
  const assigner = findMember(task.assignerId) || teamMembers.find((m) => m.id === task.assignerId);
  const reviewer = findMember(task.reviewerId) || teamMembers.find((m) => m.id === task.reviewerId);

  const isAssignedToCurrentUser =
    task.assigneeId === currentUser.id ||
    (currentUser.supabaseId && String(task.assigneeId) === String(currentUser.supabaseId));

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    updateTask(task.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      status: editStatus,
      assigneeId: editAssigneeId,
      dueDate: editDueDate.trim() || task.dueDate,
      hours: Number(editHours) || 8,
      labels: editLabels,
      prTag: editPrTag.trim() || undefined,
    });

    setIsEditMode(false);
  };

  const handleConfirmDelete = () => {
    deleteTask(task.id);
    setIsDeleteConfirmOpen(false);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const newComment = {
      id: `c-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorInitials: currentUser.initials,
      authorBg: currentUser.avatarBg,
      text: commentInput.trim(),
      timeAgo: 'Just now',
    };

    updateTask(task.id, {
      comments: [newComment, ...task.comments],
    });
    setCommentInput('');
  };

  const handleToggleChecklist = (checkId: string) => {
    const updated = task.checklist.map((c) =>
      c.id === checkId ? { ...c, done: !c.done } : c
    );
    const doneCount = updated.filter((c) => c.done).length;
    updateTask(task.id, {
      checklist: updated,
      progressFraction: `${doneCount}/${updated.length}`,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs animate-fade-in"
      onClick={() => setSelectedTaskId(null)}
    >
      <div
        role="dialog"
        aria-label="Task Detail"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:w-[540px] bg-white border-l border-slate-200/90 shadow-2xl flex flex-col animate-slide-left select-none h-full"
      >
      {/* Header bar matching screenshot */}
      <div className="h-14 border-b border-slate-100 px-6 flex items-center justify-between shrink-0">
        <span className="text-xs font-mono font-medium text-slate-500">
          {task.id} • Created {task.createdAt}
        </span>

        <div className="flex items-center gap-1.5 text-slate-400">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            data-testid="trellis-toggle-edit-btn"
            className={`p-1.5 rounded-lg transition ${
              isEditMode
                ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
                : 'hover:bg-slate-100 hover:text-slate-700'
            }`}
            title={isEditMode ? 'Exit edit mode' : 'Edit task'}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsDeleteConfirmOpen(true)}
            data-testid="trellis-delete-task-btn"
            className="p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => alert(`Task link copied: https://peoplehub.citadel.ng/task/${task.id}`)}
            className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition"
            title="Copy link"
          >
            <Link2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsEditMode(false);
              setSelectedTaskId(null);
            }}
            data-testid="trellis-close-detail-btn"
            className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isEditMode ? (
        /* Edit Mode Form */
        <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Edit Task</h3>
              <p className="text-xs text-slate-500 font-medium">Update properties for {task.id}</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
              Editing
            </span>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Task Title *</label>
            <input
              type="text"
              required
              data-testid="trellis-edit-title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#083E34]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Description</label>
            <textarea
              rows={4}
              data-testid="trellis-edit-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#083E34]"
            />
          </div>

          {/* Status & Assignee Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Status</label>
              <select
                data-testid="trellis-edit-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#083E34] cursor-pointer"
              >
                <option value="To do">To do</option>
                <option value="In progress">In progress</option>
                <option value="In review">In review</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Assignee</label>
              <select
                data-testid="trellis-edit-assignee"
                value={editAssigneeId}
                onChange={(e) => setEditAssigneeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#083E34] cursor-pointer"
              >
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date & Hours Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Due Date</label>
              <input
                type="text"
                data-testid="trellis-edit-due-date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                placeholder="e.g. Oct 28 or Nov 04"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#083E34]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Estimated Hours</label>
              <input
                type="number"
                min={1}
                max={100}
                data-testid="trellis-edit-hours"
                value={editHours}
                onChange={(e) => setEditHours(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#083E34]"
              />
            </div>
          </div>

          {/* PR / Tag */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">PR / Subtask Tag</label>
            <input
              type="text"
              data-testid="trellis-edit-pr-tag"
              value={editPrTag}
              onChange={(e) => setEditPrTag(e.target.value)}
              placeholder="e.g. PR #142 or subtasks 0/3"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#083E34]"
            />
          </div>

          {/* Labels Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Labels</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_LABELS.map((lbl) => {
                const isSelected = editLabels.includes(lbl);
                return (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setEditLabels(editLabels.filter((l) => l !== lbl));
                      } else {
                        setEditLabels([...editLabels, lbl]);
                      }
                    }}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#D4AF37] text-slate-950 border-[#C59B27]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditMode(false)}
              data-testid="trellis-cancel-edit-btn"
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition min-h-[40px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="trellis-save-edit-btn"
              className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 text-xs font-bold transition shadow-xs min-h-[40px]"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
      /* Task Content scrollable */
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Title */}
        <h2 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
          {task.title}
        </h2>

        {/* Task Properties Table matching screenshot */}
        <div className="space-y-3.5 text-xs">
          {/* Status Row */}
          <div className="flex items-center gap-4">
            <span className="w-20 text-slate-400 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Status</span>
            </span>
            <div className="relative">
              <select
                value={task.status}
                onChange={(e) => moveTaskStatus(task.id, e.target.value as TaskStatus)}
                data-testid="trellis-detail-status-select"
                className="px-3 py-1 rounded-lg text-xs font-bold border-transparent bg-purple-100 text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-300 cursor-pointer"
              >
                <option value="To do">• To do</option>
                <option value="In progress">• In progress</option>
                <option value="In review">• In review</option>
                <option value="Done">• Done</option>
              </select>
            </div>
          </div>

          {/* Assignee Row */}
          <div className="flex items-center gap-4">
            <span className="w-20 text-slate-400 font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Assignee</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Assignee selector dropdown */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-lg">
                {assignee && (
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${assignee.avatarBg} ${assignee.avatarText}`}
                  >
                    {assignee.initials}
                  </span>
                )}
                <select
                  value={task.assigneeId}
                  onChange={(e) => assignTask(task.id, e.target.value)}
                  data-testid="trellis-detail-assignee-select"
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reviewer indicator e.g. -> review by Sinta */}
              {reviewer && (
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <span className="text-slate-400">→ review by</span>
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] ${reviewer.avatarBg} ${reviewer.avatarText}`}
                  >
                    {reviewer.initials}
                  </span>
                  <span className="font-bold text-slate-800">{reviewer.name.split(' ')[0]}</span>
                </div>
              )}
            </div>
          </div>

          {/* Assignment Acceptance Bar */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Assignment Status
              </span>
              <span className="text-xs font-bold text-slate-900">
                {task.assignmentStatus === 'accepted' && (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Accepted by {assignee?.name}</span>
                  </span>
                )}
                {task.assignmentStatus === 'pending' && (
                  <span className="text-amber-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Pending Acceptance</span>
                  </span>
                )}
                {task.assignmentStatus === 'declined' && (
                  <span className="text-rose-700 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Declined ({task.declineReason})</span>
                  </span>
                )}
              </span>
            </div>

            {/* If task is assigned to current user and pending, allow accept/decline */}
            {isAssignedToCurrentUser && task.assignmentStatus === 'pending' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => acceptTask(task.id)}
                  data-testid="trellis-accept-task-btn"
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition"
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>Accept</span>
                </button>
                <button
                  onClick={() => setIsDeclineModalOpen(true)}
                  data-testid="trellis-decline-task-btn"
                  className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center gap-1 transition"
                >
                  <ThumbsDown className="w-3 h-3" />
                  <span>Decline</span>
                </button>
              </div>
            )}
          </div>

          {/* Due Date Row */}
          <div className="flex items-center gap-4">
            <span className="w-20 text-slate-400 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Due</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{task.dueDate}</span>
              {task.dueTag && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                  {task.dueTag}
                </span>
              )}
            </div>
          </div>

          {/* Labels Row */}
          <div className="flex items-center gap-4">
            <span className="w-20 text-slate-400 font-semibold flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Labels</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {task.labels.map((lbl) => (
                <span
                  key={lbl}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60"
                >
                  {lbl}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Description matching screenshot */}
        <div className="space-y-1.5 pt-2">
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {task.description}
          </p>
        </div>

        {/* Checklist Section matching screenshot */}
        {task.checklist && task.checklist.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-slate-600" />
                <span>Checklist {task.checklist.filter((c) => c.done).length}/{task.checklist.length}</span>
              </h4>
            </div>

            <div className="space-y-2">
              {task.checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => handleToggleChecklist(item.id)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-0 cursor-pointer"
                  />
                  <span className={item.done ? 'line-through text-slate-400' : ''}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Activity & Comments Section matching screenshot */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
            <span>Activity</span>
          </h4>

          {/* Comments List */}
          <div className="space-y-3">
            {task.comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2.5 text-xs">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[9px] shrink-0 ${comment.authorBg}`}
                >
                  {comment.authorInitials}
                </div>
                <div className="flex-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{comment.authorName}</span>
                    <span className="text-[10px] text-slate-400">{comment.timeAgo}</span>
                  </div>
                  <p className="text-slate-700 font-medium">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Attachments Section matching screenshot */}
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-slate-600" />
            <span>Attachments 2</span>
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-20 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center p-2 text-center text-[10px] text-slate-500 font-medium">
              <span>citadel_mobile_mockup.png</span>
              <span className="text-slate-400">1.4 MB</span>
            </div>
            <div className="h-20 bg-slate-900 rounded-xl flex flex-col items-center justify-center p-2 text-center text-[10px] text-amber-400 font-bold">
              <span>citadel_hr_funnel.svg</span>
              <span className="text-slate-400 font-normal">240 KB</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Decline Reason Modal */}
      {isDeclineModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Decline Task Assignment</h3>
            <p className="text-xs text-slate-500 font-medium">
              Provide a brief note for the assigner on why you are declining:
            </p>
            <textarea
              rows={3}
              value={declineReasonInput}
              onChange={(e) => setDeclineReasonInput(e.target.value)}
              placeholder="e.g. Current sprint workload at capacity (46 hrs)"
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDeclineModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  declineTask(task.id, declineReasonInput);
                  setIsDeclineModalOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div
          data-testid="trellis-delete-confirm-modal"
          className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Confirm Task Deletion"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 animate-slide-up"
          >
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 tracking-tight">Delete Task</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-900">"{task.title}"</span>? This will remove it from the board. You can undo this action immediately from the notification.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                data-testid="trellis-cancel-delete-btn"
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition min-h-[40px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                data-testid="trellis-confirm-delete-btn"
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shadow-xs min-h-[40px] cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
