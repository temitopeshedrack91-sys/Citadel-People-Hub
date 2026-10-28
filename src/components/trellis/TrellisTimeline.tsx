import React from 'react';
import { useTrellis } from './TrellisContext';

export const TrellisTimeline: React.FC = () => {
  const { tasks, teamMembers, teamWorkload, setSelectedTaskId } = useTrellis();

  // Days from 12 to 31, and 1
  const days = [
    { num: 12, label: 'Mon' },
    { num: 13, label: 'Tue' },
    { num: 14, label: 'Wed' },
    { num: 15, label: 'Thu' },
    { num: 16, label: 'Fri' },
    { num: 17, label: 'Sat' },
    { num: 18, label: 'Sun' },
    { num: 19, label: 'Mon', isCurrent: true },
    { num: 20, label: 'Tue' },
    { num: 21, label: 'Wed' },
    { num: 22, label: 'Thu' },
    { num: 23, label: 'Fri' },
    { num: 24, label: 'Sat' },
    { num: 25, label: 'Sun' },
    { num: 26, label: 'Mon' },
    { num: 27, label: 'Tue' },
    { num: 28, label: 'Wed' },
    { num: 29, label: 'Thu' },
    { num: 30, label: 'Fri' },
    { num: 31, label: 'Sat' },
    { num: 1, label: 'Sun' },
  ];

  // Specific timeline bars matching screenshot
  const timelineTasks = [
    {
      id: 'PAS-224',
      title: 'Save address at checkout',
      barLabel: 'Checkout address',
      startDay: 14,
      endDay: 23,
      color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      dotColor: 'bg-indigo-500',
    },
    {
      id: 'PAS-218',
      title: 'Skip location permission',
      barLabel: 'In review 100%',
      startDay: 13,
      endDay: 20,
      color: 'bg-slate-900 text-white font-bold',
      dotColor: 'bg-amber-400',
      hasStatusTag: true,
    },
    {
      id: 'PAS-225',
      title: 'Cart sync offline queue',
      barLabel: 'Offline queue 33%',
      startDay: 16,
      endDay: 26,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      dotColor: 'bg-emerald-500',
    },
    {
      id: 'PAS-219',
      title: 'Android 12 camera crash',
      barLabel: 'Crash fix',
      startDay: 18,
      endDay: 22,
      color: 'bg-rose-100 text-rose-700 border-rose-200',
      dotColor: 'bg-rose-500',
    },
    {
      id: 'PAS-227',
      title: 'Recent search queries',
      barLabel: 'Search 50%',
      startDay: 13,
      endDay: 20,
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      dotColor: 'bg-purple-500',
    },
    {
      id: 'PAS-221',
      title: 'Dark mode token audit',
      barLabel: 'Token audit',
      startDay: 20,
      endDay: 26,
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      dotColor: 'bg-amber-500',
    },
    {
      id: 'PAS-226',
      title: 'App Store screenshots',
      barLabel: 'Screens',
      startDay: 23,
      endDay: 28,
      color: 'bg-amber-100 text-amber-900 border-amber-200',
      dotColor: 'bg-[#D4AF37]',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
      {/* Gantt Chart Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs overflow-x-auto">
        <div className="min-w-[900px] relative">
          {/* Calendar Header Row */}
          <div className="grid grid-cols-12 gap-2 pb-3 border-b border-slate-100 text-xs">
            <div className="col-span-3 font-bold text-slate-800 flex items-center gap-1.5">
              <span>Task • {tasks.filter((t) => t.status !== 'Done').length} open</span>
            </div>

            <div className="col-span-9 flex justify-between text-[11px] font-semibold text-slate-400">
              {days.map((d, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col items-center w-6 text-center ${
                    d.isCurrent ? 'text-slate-900 font-extrabold' : ''
                  }`}
                >
                  <span className="text-[9px] uppercase">{d.label}</span>
                  <span
                    className={`mt-0.5 ${
                      d.isCurrent
                        ? 'bg-amber-400 text-slate-950 w-5 h-5 rounded-full flex items-center justify-center font-black shadow-2xs'
                        : ''
                    }`}
                  >
                    {d.num}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Vertical Guide Line on Mon 19 matching screenshot */}
          <div
            className="absolute top-10 bottom-8 w-[1.5px] bg-slate-900 z-10 pointer-events-none"
            style={{ left: '57.8%' }}
          />

          {/* Timeline Task Rows */}
          <div className="divide-y divide-slate-100/70 pt-2 space-y-2">
            {timelineTasks.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedTaskId(item.id)}
                className="grid grid-cols-12 gap-2 items-center py-2 hover:bg-slate-50/70 rounded-lg cursor-pointer transition"
              >
                <div className="col-span-3 flex items-center gap-2 truncate pr-2">
                  <span className={`w-2 h-2 rounded-full ${item.dotColor} shrink-0`} />
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {item.title}
                  </span>
                </div>

                <div className="col-span-9 relative h-7 flex items-center">
                  <div
                    className={`h-6 rounded-md px-2.5 text-[10px] font-bold flex items-center truncate border ${item.color} shadow-2xs`}
                    style={{
                      marginLeft: `${((item.startDay - 12) / 20) * 100}%`,
                      width: `${((item.endDay - item.startDay) / 20) * 100}%`,
                    }}
                  >
                    {item.barLabel}
                  </div>
                </div>
              </div>
            ))}

            {/* Milestones Row matching screenshot */}
            <div className="grid grid-cols-12 gap-2 items-center pt-3 text-xs">
              <div className="col-span-3 font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-900" />
                <span>Milestones</span>
              </div>
              <div className="col-span-9 flex items-center gap-6 justify-end text-[11px] font-bold text-slate-700 pr-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-900" />
                  <span>Code freeze</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
                  <span>Release</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Cards: Team Workload & Sprint Burndown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Team Workload Card */}
        <div
          data-testid="trellis-team-workload-card"
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 tracking-tight">Team workload</h3>
              <p className="text-[10px] text-slate-400 font-medium">Citadel People Hub</p>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">this week, hours</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {teamMembers.map((member) => {
              const currentHours = teamWorkload[member.id] || 0;
              const maxHours = member.capacityHours || 40;
              const isOverloaded = currentHours > maxHours;
              const pct = Math.min((currentHours / maxHours) * 100, 100);

              return (
                <div key={member.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${member.avatarBg} ${member.avatarText}`}
                      >
                        {member.initials}
                      </div>
                      <span className="font-bold text-slate-800">{member.name}</span>
                    </div>

                    <span
                      data-testid={`trellis-workload-hours-${member.id}`}
                      className={`text-xs font-mono font-bold ${
                        isOverloaded ? 'text-rose-600' : 'text-slate-700'
                      }`}
                    >
                      {currentHours}/{maxHours}
                    </span>
                  </div>

                  {/* Workload Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      data-testid={`trellis-workload-bar-${member.id}`}
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOverloaded ? 'bg-rose-500' : 'bg-slate-900'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sprint Burndown Card matching screenshot */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 tracking-tight">Sprint burndown</h3>
              <p className="text-[10px] text-slate-400 font-medium">Sprint 14 • Ends Oct 30</p>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">16 of 25 done</span>
          </div>

          <div className="h-32 relative pt-2">
            {/* SVG Line Chart */}
            <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="burndownGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#083E34" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#083E34" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Area fill under curve */}
              <path
                d="M 0 20 Q 80 25, 140 45 T 240 70 T 300 90 L 300 100 L 0 100 Z"
                fill="url(#burndownGrad)"
              />
              {/* Ideal line (grey) */}
              <line
                x1="0"
                y1="20"
                x2="300"
                y2="90"
                stroke="#CBD5E1"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              {/* Actual burndown curve (deep forest green) */}
              <path
                d="M 0 20 Q 80 25, 140 45 T 240 70 T 300 90"
                fill="none"
                stroke="#083E34"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Current day indicator */}
              <circle cx="140" cy="45" r="4.5" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
            </svg>

            <div className="flex justify-between text-[9px] text-slate-400 pt-1 font-medium">
              <span>Oct 12</span>
              <span>Oct 18</span>
              <span>Oct 24</span>
              <span>Oct 30</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
