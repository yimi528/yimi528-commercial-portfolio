import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Bell } from 'lucide-react';
import { MessageCenter } from '../views/MessageCenter';

export const NotificationDrawer: React.FC = () => {
  const { notificationDrawerOpen, setNotificationDrawerOpen, currentUser, notificationsLoading, reloadNotifications, tr } = useApp();
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (notificationDrawerOpen && currentUser && !notificationsLoading) void reloadNotifications();
  }, [notificationDrawerOpen, currentUser?.id, reloadNotifications]);

  useEffect(() => {
    if (!notificationDrawerOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationDrawerOpen(false);
      if (event.key !== 'Tab') return;
      const controls = panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]');
      if (!controls?.length) { event.preventDefault(); return; }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [notificationDrawerOpen, setNotificationDrawerOpen]);

  if (!notificationDrawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs"
      onClick={event => { if (event.target === event.currentTarget) setNotificationDrawerOpen(false); }}
    >
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="notification-title" tabIndex={-1}
        className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col outline-none">
        <div className="px-5 py-5 sm:px-6 border-b border-[#E8EAED] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#165DFF]" />
            <h2 id="notification-title" className="text-base font-bold text-[#111111]">{tr('通知', 'Notifications')}</h2>
          </div>
          <button type="button" onClick={() => setNotificationDrawerOpen(false)} aria-label={tr('关闭通知', 'Close notifications')}
            className="p-1.5 text-[#888888] hover:text-[#111111] hover:bg-[#F7F8FA] rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6">
          <MessageCenter onNavigate={() => setNotificationDrawerOpen(false)} />
        </div>
      </div>
    </div>
  );
};
