import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  CheckCircle2,
  X,
  CalendarDays,
  Plus,
} from 'lucide-react';
import { auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';

export interface CalendarEventItem {
  id: string;
  date: string; // e.g. '21 Oct 2026'
  time: string;
  title: string;
  category: 'Meeting' | 'Leave' | 'Birthday' | 'Holiday' | 'TownHall';
  entity: string;
  description: string;
  monthKey: string; // e.g. '2026-10'
}

export const CalendarView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date(2026, 9, 1)); // October 2026
  const [activeCategory, setActiveCategory] = useState('All');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [filterByMonth, setFilterByMonth] = useState(false); // Default shows all upcoming, toggleable

  const currentMonthLabel = useMemo(() => {
    return currentMonthDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentMonthDate]);

  const currentMonthKey = useMemo(() => {
    const y = currentMonthDate.getFullYear();
    const m = String(currentMonthDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [currentMonthDate]);

  const allEvents: CalendarEventItem[] = [
    {
      id: 'evt-1',
      date: '21 Oct 2026',
      monthKey: '2026-10',
      time: '09:00 AM',
      title: 'Citadel Executive Council Strategic Session',
      category: 'Meeting',
      entity: 'All Entities',
      description: 'Quarterly governance, strategic goals calibration, and leadership address.',
    },
    {
      id: 'evt-2',
      date: '25 Oct 2026',
      monthKey: '2026-10',
      time: 'All Day',
      title: 'Chef Kolawole Briggs — Leave Return Date',
      category: 'Leave',
      entity: 'Citadel Holdings',
      description: 'Scheduled resumption of duties after authorized annual leave.',
    },
    {
      id: 'evt-3',
      date: '28 Oct 2026',
      monthKey: '2026-10',
      time: '12:00 PM',
      title: 'Blessing Okafor Birthday Celebration',
      category: 'Birthday',
      entity: 'CGCC',
      description: 'PCCM Team birthday fellowship and luncheon.',
    },
    {
      id: 'evt-4',
      date: '01 Nov 2026',
      monthKey: '2026-11',
      time: 'Public Holiday',
      title: 'Citadel Monthly Thanksgiving & All-Hands',
      category: 'Holiday',
      entity: 'All Entities',
      description: 'Monthly thanksgiving service and campus-wide administrative recess.',
    },
    {
      id: 'evt-5',
      date: '05 Nov 2026',
      monthKey: '2026-11',
      time: '10:00 AM',
      title: 'Q4 All-Staff Town Hall & Culture Address',
      category: 'TownHall',
      entity: 'All Entities',
      description: 'Keynote address by Pastor Tunde Bakare and PCCM directorate.',
    },
    {
      id: 'evt-6',
      date: '18 Dec 2026',
      monthKey: '2026-12',
      time: '05:00 PM',
      title: 'Citadel Annual Christmas Gala & Staff Honors',
      category: 'TownHall',
      entity: 'All Entities',
      description: 'End-of-year excellence awards, musical presentations, and institutional thanksgiving dinner.',
    },
    {
      id: 'evt-7',
      date: '25 Dec 2026',
      monthKey: '2026-12',
      time: 'Public Holiday',
      title: 'Christmas Day Observance',
      category: 'Holiday',
      entity: 'All Entities',
      description: 'Statutory public holiday and campus administrative recess.',
    },
    {
      id: 'evt-8',
      date: '01 Jan 2027',
      monthKey: '2027-01',
      time: 'Public Holiday',
      title: 'New Year Statutory Holiday',
      category: 'Holiday',
      entity: 'All Entities',
      description: 'Campus recess for New Year celebration and spiritual reflection.',
    },
  ];

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleResetToCurrentMonth = () => {
    setCurrentMonthDate(new Date(2026, 9, 1));
  };

  const filteredEvents = allEvents.filter((e) => {
    if (activeCategory !== 'All' && e.category !== activeCategory) return false;
    if (filterByMonth && e.monthKey !== currentMonthKey) return false;
    return true;
  });

  // Generates real RFC 5545 iCalendar .ics file
  const handleSyncToOutlook = async (evt: CalendarEventItem) => {
    const safeTitle = evt.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '_');
    const dt = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Citadel People Hub//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${evt.id}-${Date.now()}@citadelcommunity.org`,
      `DTSTAMP:${dt}`,
      `DTSTART:${dt}`,
      `DTEND:${dt}`,
      `SUMMARY:${evt.title}`,
      `DESCRIPTION:${evt.description}`,
      'LOCATION:Citadel Community Campus\\, 30 Kudirat Abiola Way\\, Oregun\\, Ikeja\\, Lagos',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeTitle}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Citadel Calendar',
      action: 'Exported iCalendar Event (.ics)',
      recordAffectedId: evt.id,
      recordAffectedTitle: evt.title,
      previousValue: 'None',
      newValue: 'Exported Outlook .ics',
      severity: 'Info',
    });

    setSyncNotice(`Downloaded Outlook / Apple Calendar invite (.ics) for "${evt.title}".`);
    setTimeout(() => setSyncNotice(null), 4000);
  };

  const isCurrentMonthActive = currentMonthKey === '2026-10';

  return (
    <div className="space-y-6 font-sans animate-fade-in text-slate-900">
      {syncNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-fade-in font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button onClick={() => setSyncNotice(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#083E34] shrink-0" />
            <span>Calendar</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Company calendar for leadership summits, holidays, staff leaves, and team events.
          </p>
        </div>

        {/* Dynamic Month Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span data-testid="calendar-view-month-label">{currentMonthLabel}</span>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isCurrentMonthActive && (
            <button
              onClick={handleResetToCurrentMonth}
              className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[#083E34] text-xs font-bold hover:bg-emerald-100 transition shadow-2xs"
            >
              Today
            </button>
          )}

          <button
            onClick={() => setFilterByMonth((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition shadow-2xs ${
              filterByMonth
                ? 'bg-[#083E34] text-white border-[#083E34]'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {filterByMonth ? 'Month View' : 'All Upcoming'}
          </button>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist">
        {['All', 'Meeting', 'Holiday', 'TownHall', 'Leave', 'Birthday'].map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === cat
                ? 'bg-[#083E34] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.03)] p-5 space-y-4">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Scheduled Happenings & Key Dates ({filteredEvents.length})
          </h3>
          {filterByMonth && (
            <span className="text-xs text-slate-500 font-semibold">
              Showing events for {currentMonthLabel}
            </span>
          )}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold">
              No events found for {currentMonthLabel} with the selected filters.
            </p>
            <button
              onClick={() => {
                setActiveCategory('All');
                setFilterByMonth(false);
              }}
              className="mt-2 text-xs font-bold text-[#083E34] hover:underline"
            >
              Show all upcoming events
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEvents.map((evt) => (
              <div key={evt.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {evt.date.split(' ')[1]}
                    </span>
                    <span className="text-sm font-black text-[#083E34] leading-none">
                      {evt.date.split(' ')[0]}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900">{evt.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {evt.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{evt.description}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
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
                  onClick={() => handleSyncToOutlook(evt)}
                  data-testid={`btn-sync-calendar-${evt.id}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-[#083E34] text-slate-700 hover:text-white border border-slate-200/90 text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-center shrink-0 active:scale-95 cursor-pointer shadow-2xs group"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-300 transition" />
                  <span>Add to Calendar (.ics)</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
