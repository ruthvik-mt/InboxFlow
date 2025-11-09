// src/components/NotificationBell.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, Trash2, Mail, ExternalLink } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: any) => {
    await markAsRead(notif._id);
    // Optional: Navigate to specific email or trigger some action
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-400 hover:text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-900">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications ({unreadCount} unread)
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-2">You'll see alerts here when interested leads arrive</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-4 hover:bg-gray-800 transition-colors ${
                      !notif.read ? 'bg-gray-800/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-10 h-10 rounded-full bg-green-600/20 border border-green-600 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-green-400" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-white text-sm">
                            Interested Lead
                          </p>
                          {!notif.read && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>
                          )}
                        </div>

                        <p className="text-sm text-gray-300 truncate mb-1">
                          {notif.subject}
                        </p>

                        <p className="text-xs text-gray-400 mb-2">
                          From: {notif.from}
                        </p>

                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-700">
                            {notif.account}
                          </span>
                          {notif.slackSent && (
                            <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-700 flex items-center gap-1">
                              ✓ Slack
                            </span>
                          )}
                          {notif.webhookSent && (
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-700 flex items-center gap-1">
                              ✓ Webhook
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-500">
                          {new Date(notif.timestamp).toLocaleString()}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleNotificationClick(notif)}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View
                          </button>
                          {!notif.read && (
                            <button
                              onClick={() => markAsRead(notif._id)}
                              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notif._id)}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 ml-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;