import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, CalendarDays, UserPlus, AlertCircle, Shield } from 'lucide-react';
import { SystemNotification } from '../../types';
import { notificationRepository } from '../../services';
import { Badge } from '../common/Badge';

export const NotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

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
        return <CalendarDays className="w-4 h-4 text-indigo-600" />;
      case 'Onboarding':
        return <UserPlus className="w-4 h-4 text-emerald-600" />;
      case 'Hardware':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#0A1E3F]" />;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#0A1E3F]" />
            <span>Notifications & Operational Alerts</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time notifications covering workflow approvals, biometric syncs, and PCCM announcements.
          </p>
        </div>

        <button
          onClick={handleMarkAll}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-xs transition"
        >
          <CheckCheck className="w-4 h-4 text-emerald-600" />
          <span>Mark All Read</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 flex items-start justify-between gap-3 transition ${
              n.isRead ? 'bg-white' : 'bg-amber-50/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(n.category || n.type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4
                    className={`text-xs font-bold ${
                      n.isRead ? 'text-slate-700' : 'text-slate-900'
                    }`}
                  >
                    {n.title}
                  </h4>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                  <span>{n.timestamp}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-600">{n.category || n.type}</span>
                </div>
              </div>
            </div>

            {!n.isRead && (
              <button
                onClick={() => handleMarkAsRead(n.id)}
                className="text-[11px] font-semibold text-[#0A1E3F] hover:underline shrink-0"
              >
                Mark Read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
