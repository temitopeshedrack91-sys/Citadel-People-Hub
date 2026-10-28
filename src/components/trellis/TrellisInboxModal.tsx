import React, { useEffect } from 'react';
import { X, Inbox, CheckCircle2, Clock, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { useTrellis } from './TrellisContext';

export const TrellisInboxModal: React.FC = () => {
  const {
    isInboxOpen,
    setIsInboxOpen,
    notifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    acceptTask,
    declineTask,
    setSelectedTaskId,
    currentUser,
  } = useTrellis();

  useEffect(() => {
    if (!isInboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsInboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInboxOpen, setIsInboxOpen]);

  if (!isInboxOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => setIsInboxOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-md w-full p-6 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-slate-900" />
            <div>
              <h3 className="text-base font-black text-slate-900">Notifications</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Incoming task assignments and updates for {currentUser.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsInboxOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions bar */}
        {notifications.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={markAllNotificationsAsRead}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition"
            >
              <Check className="w-3 h-3" />
              <span>Mark all as read</span>
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">
              No notifications for {currentUser.name}.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  markNotificationAsRead(notif.id);
                  if (notif.taskId) setSelectedTaskId(notif.taskId);
                }}
                className={`p-3 rounded-xl border transition cursor-pointer text-xs space-y-1.5 ${
                  notif.read
                    ? 'bg-slate-50 border-slate-200/60 opacity-80'
                    : 'bg-white border-amber-200/80 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{notif.senderName}</span>
                  <span className="text-[10px] text-slate-400">{notif.timestamp}</span>
                </div>

                <p className="text-slate-700 font-medium">{notif.message}</p>

                {/* Accept/Decline action buttons if it's an assignment */}
                {notif.type === 'assigned' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        acceptTask(notif.taskId);
                        markNotificationAsRead(notif.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        declineTask(notif.taskId);
                        markNotificationAsRead(notif.id);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center gap-1"
                    >
                      <ThumbsDown className="w-3 h-3" />
                      <span>Decline</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
