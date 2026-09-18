import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Cake, CalendarDays, Clock, Users } from 'lucide-react';
import { Badge } from '../common/Badge';

export const CalendarView: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState('September 2026');

  const events = [
    {
      date: '21 Sep 2026',
      time: '09:00 AM',
      title: 'Citadel Executive Council Strategic Session',
      category: 'Meeting',
      entity: 'All Entities',
    },
    {
      date: '25 Sep 2026',
      time: 'All Day',
      title: 'Chef Kolawole Briggs — Leave Return Date',
      category: 'Leave',
      entity: 'Citadel Holdings',
    },
    {
      date: '28 Sep 2026',
      time: 'All Day',
      title: 'Blessing Okafor Birthday Celebration',
      category: 'Birthday',
      entity: 'CGCC',
    },
    {
      date: '01 Oct 2026',
      time: 'Public Holiday',
      title: 'Nigeria Independence Day — Office Closed',
      category: 'Holiday',
      entity: 'All Entities',
    },
    {
      date: '05 Oct 2026',
      time: '10:00 AM',
      title: 'Q3 All-Staff Town Hall & Culture Address',
      category: 'TownHall',
      entity: 'All Entities',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#0A1E3F]" />
            <span>Citadel Corporate Calendar</span>
          </h2>
          <p className="text-xs text-slate-500">
            Integrated calendar capturing corporate retreats, statutory holidays, staff leaves, and anniversaries.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
          <button className="p-1 hover:bg-slate-100 rounded">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>{currentMonth}</span>
          <button className="p-1 hover:bg-slate-100 rounded">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Scheduled Happenings & Key Dates
        </h3>

        <div className="divide-y divide-slate-100">
          {events.map((evt, i) => (
            <div key={i} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-center shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {evt.date.split(' ')[1]}
                  </span>
                  <span className="text-sm font-bold text-[#0A1E3F] leading-none">
                    {evt.date.split(' ')[0]}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{evt.title}</h4>
                    <Badge
                      variant={
                        evt.category === 'Meeting'
                          ? 'citadel'
                          : evt.category === 'Birthday'
                          ? 'warning'
                          : evt.category === 'Holiday'
                          ? 'success'
                          : 'info'
                      }
                    >
                      {evt.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{evt.time}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{evt.entity}</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => alert(`Synchronizing event "${evt.title}" with Outlook / M365`)}
                className="text-xs font-semibold text-[#0A1E3F] hover:underline self-start sm:self-center"
              >
                Sync to Outlook →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
