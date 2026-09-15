import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationItem } from '../types';
import { useAuth } from './AuthContext';
import { notificationService } from '../firebase/services';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, tenant } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const tenantId = user.role === 'SUPER_ADMIN' && !user.isImpersonating ? null : (tenant?.id || user.tenantId);
    if (user.role !== 'SUPER_ADMIN' && !tenantId) return;

    const unsubscribe = notificationService.subscribeNotifications(tenantId, (items) => {
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [user, tenant]);

  const markAsRead = async (id: string) => {
    const tenantId = user?.role === 'SUPER_ADMIN' && !user?.isImpersonating ? null : (tenant?.id || user?.tenantId || null);
    await notificationService.markAsRead(tenantId, id);
  };

  const markAllAsRead = async () => {
    notifications.forEach(n => {
      if (!n.read) markAsRead(n.id);
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        showToast,
        removeToast,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-lg border text-sm font-medium transition-all transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-gray-400 hover:text-gray-700 font-bold"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
