// src/contexts/NotificationContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface Notification {
  _id: string;
  emailId: string;
  subject: string;
  from: string;
  category: string;
  account: string;
  timestamp: string;
  slackSent: boolean;
  webhookSent: boolean;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  showToast: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toastQueue, setToastQueue] = useState<Notification[]>([]);
  const [lastFetchedCount, setLastFetchedCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications?limit=50');
      const newNotifications = response.data.notifications;
      const newUnreadCount = response.data.unreadCount;
      
      // Show toast for new notifications
      if (newUnreadCount > lastFetchedCount && lastFetchedCount > 0) {
        const newItems = newNotifications.filter((n: Notification) => !n.read);
        if (newItems.length > 0) {
          showToast(newItems[0]); // Show toast for the most recent one
        }
      }
      
      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);
      setLastFetchedCount(newUnreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [lastFetchedCount]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      const wasUnread = notifications.find(n => n._id === id)?.read === false;
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const showToast = (notification: Notification) => {
    setToastQueue(prev => [...prev, notification]);
  };

  // Auto-fetch on mount and poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Auto-dismiss toasts after 5 seconds
  useEffect(() => {
    if (toastQueue.length > 0) {
      const timer = setTimeout(() => {
        setToastQueue(prev => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastQueue]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        showToast,
      }}
    >
      {children}
      {/* Toast Display */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toastQueue.map((notif, idx) => (
          <div
            key={`${notif._id}-${idx}`}
            className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-md animate-slide-in"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold">Interested Lead Detected!</p>
                <p className="text-sm opacity-90 mt-1">{notif.subject}</p>
                <p className="text-xs opacity-75 mt-1">From: {notif.from}</p>
                {notif.slackSent && (
                  <p className="text-xs opacity-75 mt-1">✓ Slack notification sent</p>
                )}
                {notif.webhookSent && (
                  <p className="text-xs opacity-75 mt-1">✓ Webhook triggered</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};