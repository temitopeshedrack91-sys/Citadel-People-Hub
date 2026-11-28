import React from 'react';
import { useTrellis } from './TrellisContext';
import { Calendar, User, Clock, CheckCircle2, Pencil, Trash2, Lock } from 'lucide-react';
import {
  TaskStatus,
  PRIORITY_BADGE_STYLES,
  resolveTaskPriority,
  getTaskPrerequisites,
  getIncompletePrerequisites,
  isTaskBlocked,
} from './types';

export const TrellisList: React.FC = () => {
  const {
    tasks,
    teamMembers,
    findMember,
    currentUser,
    myTasksMode,
    selectedAssigneeFilter,
    selectedLabelFilter,
    selectedPriorityFilter,
    searchQuery,
    setSelectedTaskId,
    deleteTask,
    setIsEditMode,
    canManageTasks,
  } = useTrellis();

  const filteredTasks = tasks.filter((t) => {
    if (myTasksMode && t.assigneeId !== currentUser.id)
      return false;
    if (selectedAssigneeFilter !== 'All') {
      const targetMember = findMember(selectedAssigneeFilter);
      const taskMember = findMember(t.assigneeId);
      if (!targetMember || !taskMember || targetMember.id !== taskMember.id) return false;
    }
    if (selectedLabelFilter !== 'All' && !t.labels.includes(selectedLabelFilter as any)) return false;
    if (selectedPriorityFilter !== 'All' && resolveTaskPriority(t) !== selectedPriorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statuses: TaskStatus[] = ['To do', 'In progress', 'In review', 'Done'];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
      {statuses.map((status) => {
        const groupTasks = filteredTasks.filter((t) => t.status === status);
        if (groupTasks.length === 0) return null;

        return (
          <div key={status} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>{status}</span>
                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  {groupTasks.length}
                </span>
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {groupTasks.map((task) => {
                const assignee = findMember(task.assigneeId) || teamMembers.find((m) => m.id === task.assigneeId);
                const priority = resolveTaskPriority(task);
                const priorityStyle = PRIORITY_BADGE_STYLES[priority];
                const prerequisites = getTaskPrerequisites(task, tasks);
                const incompletePrerequisites = getIncompletePrerequisites(task, tasks);
                const blocked = isTaskBlocked(task, tasks);

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-4 cursor-pointer transition text-xs group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] font-medium text-slate-400 shrink-0">
                        {task.id}
                      </span>
                      <span
                        data-testid={`trellis-list-priority-badge-${task.id}`}
                        data-priority={priority}
                        className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${priorityStyle.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dotClass}`} />
                        <span>{priority}</span>
                      </span>
                      {prerequisites.length > 0 && (
                        <span
                          data-testid={`trellis-list-dependency-badge-${task.id}`}
                          data-blocked={blocked ? 'true' : 'false'}
                          className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                            blocked
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {blocked ? (
                            <>
                              <Lock className="w-2.5 h-2.5" />
                              <span>Blocked by {incompletePrerequisites.map((p) => p.id).join(', ')}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Deps {prerequisites.length}/{prerequisites.length}</span>
                            </>
                          )}
                        </span>
                      )}
                      <h4 className="font-bold text-slate-900 group-hover:text-[#B88A24] truncate">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        {task.labels
                          .filter((l) => !(l === 'High' && priority === 'High'))
                          .slice(0, 2)
                          .map((l) => (
                            <span
                              key={l}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                            >
                              {l}
                            </span>
                          ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 text-slate-500">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{task.hours}h</span>
                      </span>

                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{task.dueDate}</span>
                      </span>

                      {assignee && (
                        <div className="flex items-center gap-1.5 w-28">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${assignee.avatarBg} ${assignee.avatarText}`}
                          >
                            {assignee.initials}
                          </div>
                          <span className="truncate text-xs font-semibold text-slate-700">
                            {assignee.name.split(' ')[0]}
                          </span>
                        </div>
                      )}

                      {/* Quick Edit & Delete Actions */}
                      {canManageTasks && <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTaskId(task.id);
                            setIsEditMode(true);
                          }}
                          data-testid={`trellis-list-edit-${task.id}`}
                          title="Edit task"
                          className="p-1 rounded-md hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                          }}
                          data-testid={`trellis-list-delete-${task.id}`}
                          title="Delete task"
                          className="p-1 rounded-md hover:bg-[#F5F7FA] text-slate-400 hover:text-[#111827] transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
