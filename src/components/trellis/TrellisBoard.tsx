import React from 'react';
import {
  Plus,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTrellis } from './TrellisContext';
import { TrellisTask, TaskStatus, TaskLabel } from './types';

const labelColors: Record<TaskLabel, string> = {
  Bug: 'bg-rose-100 text-rose-700 border-rose-200/60',
  Android: 'bg-sky-100 text-sky-700 border-sky-200/60',
  Feature: 'bg-purple-100 text-purple-700 border-purple-200/60',
  High: 'bg-rose-100 text-rose-700 border-rose-200/60',
  Design: 'bg-indigo-100 text-indigo-700 border-indigo-200/60',
  Tech: 'bg-emerald-100 text-emerald-700 border-emerald-200/60',
  Onboarding: 'bg-sky-100 text-sky-700 border-sky-200/60',
  Marketing: 'bg-[#FFF3E0] text-[#D97706] border-[#F2E4B8]',
  Data: 'bg-teal-100 text-teal-700 border-teal-200/60',
  Content: 'bg-amber-100 text-amber-800 border-amber-200/60',
  'Design system': 'bg-[#FAF5EB] text-[#D97706] border-[#F2E4B8]',
};

const columnConfigs: {
  status: TaskStatus;
  label: string;
  dotColor: string;
}[] = [
  { status: 'To do', label: 'To do', dotColor: 'bg-slate-400' },
  { status: 'In progress', label: 'In progress', dotColor: 'bg-[#D4AF37]' },
  { status: 'In review', label: 'In review', dotColor: 'bg-purple-600' },
  { status: 'Done', label: 'Done', dotColor: 'bg-emerald-600' },
];

export const TrellisBoard: React.FC = () => {
  const {
    tasks,
    teamMembers,
    findMember,
    currentUser,
    myTasksMode,
    selectedAssigneeFilter,
    selectedLabelFilter,
    searchQuery,
    setSelectedTaskId,
    moveTaskStatus,
    setIsNewTaskModalOpen,
    deleteTask,
    setIsEditMode,
  } = useTrellis();

  // Filter tasks based on search, assignee, label, and myTasksMode
  const filteredTasks = tasks.filter((t) => {
    if (
      myTasksMode &&
      t.assigneeId !== currentUser.id &&
      (!currentUser.supabaseId || String(t.assigneeId) !== String(currentUser.supabaseId))
    )
      return false;
    if (selectedAssigneeFilter !== 'All') {
      const targetMember = findMember(selectedAssigneeFilter);
      const taskMember = findMember(t.assigneeId);
      if (!targetMember || !taskMember || targetMember.id !== taskMember.id) return false;
    }
    if (selectedLabelFilter !== 'All' && !t.labels.includes(selectedLabelFilter as any)) return false;
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

  return (
    <div className="flex-1 overflow-x-auto p-4 sm:p-6 bg-slate-50/50">
      {/* Mobile column quick-jump links */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-3 custom-scrollbar">
        {columnConfigs.map((col) => {
          const count = filteredTasks.filter((t) => t.status === col.status).length;
          return (
            <a
              key={col.status}
              href={`#column-${col.status.toLowerCase().replace(' ', '-')}`}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shrink-0 flex items-center gap-1.5 min-h-[44px] shadow-2xs"
            >
              <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
              <span>{col.label}</span>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-full font-bold">
                {count}
              </span>
            </a>
          );
        })}
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-stretch md:items-start md:min-w-[1000px]">
        {columnConfigs.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.status);

          return (
            <div
              key={col.status}
              id={`column-${col.status.toLowerCase().replace(' ', '-')}`}
              data-testid={`trellis-column-${col.status.toLowerCase().replace(' ', '-')}`}
              className="flex-1 bg-slate-100/70 rounded-2xl p-3 border border-slate-200/60 flex flex-col md:max-h-[calc(100vh-210px)]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1.5 pb-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <h3 className="text-xs font-black text-slate-800 tracking-tight">
                    {col.label}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400 bg-white px-1.5 py-0.2 rounded-full shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => setIsNewTaskModalOpen(true)}
                  className="p-1 rounded-lg hover:bg-slate-200/80 text-slate-500 transition cursor-pointer"
                  title={`Add task to ${col.label}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Column Cards Container */}
              <div className="space-y-3 overflow-y-auto pr-0.5 flex-1 scrollbar-thin">
                {colTasks.length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-medium">
                    No tasks
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const assignee = findMember(task.assigneeId) || teamMembers.find((m) => m.id === task.assigneeId);

                    return (
                      <div
                        key={task.id}
                        data-testid={`trellis-card-${task.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedTaskId(task.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedTaskId(task.id);
                          }
                        }}
                        className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_22px_rgba(15,23,42,0.06)] hover:border-slate-300 transition-all duration-150 cursor-pointer space-y-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083E34] focus-visible:ring-offset-2 select-none"
                      >
                        {/* Top row: Labels & Quick Actions */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {task.labels.map((lbl) => (
                              <span
                                key={lbl}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  labelColors[lbl] || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {lbl}
                              </span>
                            ))}
                            {task.assignmentStatus === 'pending' && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Pending
                              </span>
                            )}
                            {task.assignmentStatus === 'declined' && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                Declined
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTaskId(task.id);
                                setIsEditMode(true);
                              }}
                              data-testid={`trellis-card-edit-${task.id}`}
                              title="Edit task"
                              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTask(task.id);
                              }}
                              data-testid={`trellis-card-delete-${task.id}`}
                              title="Delete task"
                              className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-[#083E34] transition-colors leading-snug">
                          {task.title}
                        </h4>

                        {/* PR / Sub-task Tag */}
                        {task.prTag && (
                          <div className="bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[10px] font-mono font-medium text-slate-600 truncate">
                            {task.prTag}
                          </div>
                        )}

                        {/* Checklist progress bar */}
                        {task.progressFraction && (
                          <div className="space-y-1">
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-slate-900 h-full rounded-full"
                                style={{
                                  width: `${
                                    (Number(task.progressFraction.split('/')[0]) /
                                      Number(task.progressFraction.split('/')[1])) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                            <div className="flex justify-end text-[10px] text-slate-400 font-semibold">
                              <span>{task.progressFraction}</span>
                            </div>
                          </div>
                        )}

                        {/* Optional Image Preview (e.g. Marketing screenshots) */}
                        {task.imageUrl && (
                          <div className="rounded-lg overflow-hidden h-24 bg-slate-100">
                            <img
                              src={task.imageUrl}
                              alt="preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Card Footer: Due Date, Comments, Assignee Avatar */}
                        <div className="flex items-center justify-between pt-1 text-slate-400 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{task.dueDate}</span>
                            </span>

                            {task.comments.length > 0 && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                <MessageSquare className="w-3 h-3 text-slate-400" />
                                <span>{task.comments.length}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Quick move dropdown icon */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextCol: Record<TaskStatus, TaskStatus> = {
                                  'To do': 'In progress',
                                  'In progress': 'In review',
                                  'In review': 'Done',
                                  Done: 'To do',
                                };
                                moveTaskStatus(task.id, nextCol[task.status]);
                              }}
                              title={`Advance to next status`}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </div>

                            {/* Assignee Avatar */}
                            {assignee ? (
                              <div
                                title={`${assignee.name} (${assignee.role})`}
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] select-none ${assignee.avatarBg} ${assignee.avatarText} shrink-0 ring-1 ring-white`}
                              >
                                {assignee.initials}
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-200 border border-dashed border-slate-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
