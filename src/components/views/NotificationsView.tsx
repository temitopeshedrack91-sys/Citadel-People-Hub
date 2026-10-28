import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, CalendarDays, UserPlus, AlertCircle, Shield } from 'lucide-react';
import { SystemNotification } from '../../types';
import { notificationRepository } from '../../services';
import { Badge } from '../common/Badge';

export const NotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [filter, setFilter] = useState<'All' | 'Unread' | 'Leave' | 'Onboarding' | 'Hardware'>('All');

  const loadNotifications = async () => {
    const list = await notificationRepository.getAll();
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await notificationRepository.markAsRead(id);
    await loadNotifications();
  };

  const handleMarkAll = async () => {
    await notificationRepository.markAllAsRead();
    await loadNotifications();
  };

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'Leave':
        return <CalendarDays className="w-4 h-4 text-emerald-700" />;
      case 'Onboarding':
        return <UserPlus className="w-4 h-4 text-amber-700" />;
      case 'Hardware':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#083E34]" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'Unread') return !n.isRead;
    if (filter === 'All') return true;
    return (n.category || n.type) === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#083E34]" />
            <span>Notifications</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            System alerts, workflow updates, and announcements.
          </p>
        </div>

        <button
          onClick={handleMarkAll}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 self-start sm:self-auto"
        >
          <CheckCheck className="w-4 h-4 text-emerald-600" />
          <span>Mark All Read</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {(['All', 'Unread', 'Leave', 'Onboarding', 'Hardware'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filter === tab
                ? 'bg-[#083E34] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab}
            {tab === 'Unread' && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-[#083E34] text-[10px] font-black">
                {notifications.filter((n) => !n.isRead).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-3 transition ${
                n.isRead ? 'bg-white hover:bg-slate-50/50' : 'bg-emerald-50/20 hover:bg-emerald-50/30'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(n.category || n.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-xs font-bold ${
                        n.isRead ? 'text-slate-700' : 'text-slate-900 font-extrabold'
                      }`}
                    >
                      {n.title}
                    </h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-mono">
                    <span>{n.timestamp}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-600">{n.category || n.type}</span>
                  </div>
                </div>
              </div>

              {!n.isRead && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="text-xs font-bold text-[#083E34] hover:underline shrink-0 cursor-pointer pt-0.5"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No notifications in this category.
          </div>
        )}
      </div>
    </div>
  );
};
