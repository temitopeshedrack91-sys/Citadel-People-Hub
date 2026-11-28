import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, User, Tag, Clock, CheckCircle2, Flag, Link2 } from 'lucide-react';
import { useTrellis } from './TrellisContext';
import {
  TaskStatus,
  TaskLabel,
  TaskPriority,
  ALL_PRIORITIES,
  PRIORITY_BADGE_STYLES,
} from './types';

const availableLabels: TaskLabel[] = [
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
];

export const TrellisNewTaskModal: React.FC = () => {
  const {
    isNewTaskModalOpen,
    setIsNewTaskModalOpen,
    tasks,
    teamMembers,
    currentUser,
    createTask,
    isApiMode,
  } = useTrellis();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('To do');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [assigneeId, setAssigneeId] = useState<string>(currentUser.id);
  const [dueDate, setDueDate] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<TaskLabel[]>(['Feature']);
  const [hours, setHours] = useState<number>(8);
  const [reviewerId, setReviewerId] = useState<string>('');
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [selectedPrereqId, setSelectedPrereqId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isNewTaskModalOpen) return;
    setAssigneeId(currentUser.id);
    setReviewerId('');
    setDependsOn([]);
    setSelectedPrereqId('');
  }, [currentUser.id, isNewTaskModalOpen]);

  useEffect(() => {
    if (!isNewTaskModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNewTaskModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewTaskModalOpen, setIsNewTaskModalOpen]);

  if (!isNewTaskModalOpen) return null;

  const toggleLabel = (lbl: TaskLabel) => {
    setSelectedLabels((prev) =>
      prev.includes(lbl) ? prev.filter((l) => l !== lbl) : [...prev, lbl]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    const created = await createTask({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      labels: selectedLabels,
      dueDate,
      assigneeId,
      hours: Number(hours),
      reviewerId: reviewerId || undefined,
      dependsOn: dependsOn.length > 0 ? dependsOn : undefined,
    });
    setIsSaving(false);
    if (!created) return;
    setIsNewTaskModalOpen(false);
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('Medium');
    setSelectedLabels(['Feature']);
    setDependsOn([]);
    setSelectedPrereqId('');
  };

  const availablePrerequisiteTasks = tasks.filter((t) => !dependsOn.includes(t.id));

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => setIsNewTaskModalOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Create New Task</h3>
            <p className="text-xs text-slate-400 font-medium">
              Citadel People Hub (Sprint 14 • Ends Oct 30)
            </p>
          </div>
          <button
            onClick={() => setIsNewTaskModalOpen(false)}
            data-testid="trellis-modal-close-btn"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block text-slate-800 font-bold mb-1">Task Title *</label>
            <input
              type="text"
              required
              data-testid="trellis-input-title"
              placeholder="e.g. Implement Apple Pay checkout integration"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-semibold text-slate-900"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-800 font-bold mb-1">Description</label>
            <textarea
              rows={3}
              data-testid="trellis-input-description"
              placeholder="Task details, requirements, flags, or acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-medium text-slate-800 resize-none"
            />
          </div>

          {/* Assignee & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-800 font-bold mb-1">Assignee *</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                data-testid="trellis-select-assignee"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-bold text-slate-900 bg-white cursor-pointer"
              >
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-800 font-bold mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                data-testid="trellis-select-status"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-bold text-slate-900 bg-white cursor-pointer"
              >
                <option value="To do">To do</option>
                <option value="In progress">In progress</option>
                <option value="In review">In review</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>

          {/* Priority Selector */}
          <div>
            <label className="block text-slate-800 font-bold mb-1.5">Priority</label>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Task Priority">
              {ALL_PRIORITIES.map((p) => {
                const isSelected = priority === p;
                const style = PRIORITY_BADGE_STYLES[p];
                return (
                  <button
                    type="button"
                    key={p}
                    data-testid={`trellis-priority-option-${p}`}
                    aria-pressed={isSelected}
                    onClick={() => setPriority(p)}
                    className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border transition cursor-pointer ${
                      isSelected
                        ? `${style.badgeClass} ring-2 ring-slate-900/15`
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`} />
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date & Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-800 font-bold mb-1">Due Date</label>
              <input
                type={isApiMode ? 'date' : 'text'}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder={isApiMode ? undefined : 'YYYY-MM-DD'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-800 font-bold mb-1">
                Estimated Hours (Workload)
              </label>
              <input
                type="number"
                min={1}
                max={40}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-semibold text-slate-900"
              />
            </div>
          </div>

          {/* Labels Pill Selector */}
          <div>
            <label className="block text-slate-800 font-bold mb-1.5">Labels</label>
            <div className="flex flex-wrap gap-1.5">
              {availableLabels.map((lbl) => {
                const isSelected = selectedLabels.includes(lbl);
                return (
                  <button
                    type="button"
                    key={lbl}
                    onClick={() => toggleLabel(lbl)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prerequisite Task Dependencies Selector */}
          <div>
            <label className="block text-slate-800 font-bold mb-1.5 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Prerequisite Tasks (Must complete before this task starts)</span>
            </label>
            {dependsOn.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {dependsOn.map((depId) => {
                  const depTask = tasks.find((t) => t.id === depId);
                  return (
                    <span
                      key={depId}
                      data-testid={`trellis-new-task-dep-pill-${depId}`}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700"
                    >
                      <span className="font-mono text-slate-500">{depId}</span>
                      <span className="truncate max-w-[160px]">{depTask?.title || depId}</span>
                      <button
                        type="button"
                        data-testid={`trellis-new-task-remove-dependency-${depId}`}
                        onClick={() => setDependsOn(dependsOn.filter((id) => id !== depId))}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title={`Remove ${depId}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-2">
              <select
                data-testid="trellis-new-task-dependency-select"
                value={selectedPrereqId}
                onChange={(e) => setSelectedPrereqId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-semibold text-slate-800 bg-white cursor-pointer"
              >
                <option value="">Select prerequisite task...</option>
                {availablePrerequisiteTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} — {t.title} ({t.status})
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid="trellis-new-task-add-dependency-btn"
                disabled={!selectedPrereqId}
                onClick={() => {
                  if (!selectedPrereqId) return;
                  if (!dependsOn.includes(selectedPrereqId)) {
                    setDependsOn([...dependsOn, selectedPrereqId]);
                  }
                  setSelectedPrereqId('');
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer"
              >
                Link
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="trellis-submit-new-task"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#174EA6] hover:bg-[#0B1F3A] text-white font-semibold shadow-xs transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#174EA6] focus-visible:ring-offset-2"
            >
              {isSaving ? 'Saving…' : 'Create & Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
