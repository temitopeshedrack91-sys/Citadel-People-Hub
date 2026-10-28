import React from 'react';
import { useTrellis } from './TrellisContext';
import { Calendar, User, Clock, CheckCircle2 } from 'lucide-react';
import { TaskStatus } from './types';

export const TrellisList: React.FC = () => {
  const {
    tasks,
    teamMembers,
    currentUser,
    myTasksMode,
    selectedAssigneeFilter,
    selectedLabelFilter,
    searchQuery,
    setSelectedTaskId,
  } = useTrellis();

  const filteredTasks = tasks.filter((t) => {
    if (myTasksMode && t.assigneeId !== currentUser.id) return false;
    if (selectedAssigneeFilter !== 'All' && t.assigneeId !== selectedAssigneeFilter) return false;
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
                const assignee = teamMembers.find((m) => m.id === task.assigneeId);

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
                      <h4 className="font-bold text-slate-900 group-hover:text-amber-950 truncate">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        {task.labels.slice(0, 2).map((l) => (
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
