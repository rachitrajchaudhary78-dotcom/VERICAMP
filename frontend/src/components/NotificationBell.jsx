import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Clock, Calendar, ScanFace, ShieldAlert, X } from 'lucide-react';
import api from '../services/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch {
      // Silently handle if offline or not logged in
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/notifications/${notifId}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'leave_request':
      case 'leave_status':
        return <Calendar className="w-4 h-4 text-amber-500" />;
      case 'face_update_request':
      case 'face_update_status':
        return <ScanFace className="w-4 h-4 text-blue-500" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-emerald-500" />;
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="View notifications"
        className="relative p-2 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-800/60 text-slate-200 hover:text-white transition cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 border-2 border-[#0c2340] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-900 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300 opacity-60" />
                <span>No notifications yet.</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                  className={`p-3.5 text-xs transition cursor-pointer flex gap-3 items-start ${
                    n.is_read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                    {getIcon(n.notification_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`font-semibold truncate ${n.is_read ? 'text-slate-800' : 'text-blue-900 font-bold'}`}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {formatTimestamp(n.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>

                  {!n.is_read && (
                    <span
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      title="Mark as read"
                      className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5 hover:scale-125 transition"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
