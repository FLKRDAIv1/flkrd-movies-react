import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Notification } from '../types';
import NotificationItem from '../components/NotificationItem';
import { notificationEmitter } from '../utils/notificationEmitter';
import Portal from '../components/Portal';

interface NotificationContextType {
  addNotification: (notification: Omit<Notification, 'id'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = String(Date.now() + Math.random());
    const duration = notification.duration ?? 4000;
    setNotifications(prev => [...prev, { ...notification, id, duration }]);
    
    // Native Sync: Trigger Tauri system notification
    if (notification.type !== 'info') { // Only notify system for important events
        import('../services/tauriService').then(({ tauriService }) => {
            tauriService.notify(notification.title, notification.message);
        });
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  React.useEffect(() => {
      const handler = (notification: Omit<Notification, 'id'>) => {
          addNotification(notification);
      };
      notificationEmitter.on('add-notification', handler);
      return () => {
          notificationEmitter.off('add-notification', handler);
      };
  }, [addNotification]);

  // Real-time Global Admin Broadcast & DB Listener
  React.useEffect(() => {
    import('../utils/supabaseClient').then(({ supabase }) => {
      // 1. Listen to Realtime Broadcast channel
      const broadcastChannel = supabase.channel('global_admin_broadcast');
      broadcastChannel
        .on('broadcast', { event: 'admin_notification' }, ({ payload }) => {
          if (payload && payload.title && payload.message) {
            addNotification({
              type: payload.type || 'info',
              title: payload.title,
              message: payload.message,
              image: payload.image,
              actionUrl: payload.actionUrl,
              duration: payload.duration || 4000,
            });
          }
        })
        .subscribe();

      // 2. Listen to Database INSERTS on admin_broadcasts table
      const dbChannel = supabase
        .channel('admin_broadcasts_db_sync')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'admin_broadcasts' },
          (payload) => {
            if (payload.new && payload.new.title && payload.new.message) {
              const item = payload.new;
              addNotification({
                type: item.type || 'info',
                title: item.title,
                message: item.message,
                image: item.image,
                actionUrl: item.action_url,
                duration: item.duration || 4000,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(broadcastChannel);
        supabase.removeChannel(dbChannel);
      };
    });
  }, [addNotification]);


  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <Portal id="notification-portal">
        <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 sm:top-6 z-[99999] w-full max-w-sm space-y-2.5 pointer-events-none px-4 sm:px-0">
          {notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onDismiss={removeNotification}
            />
          ))}
        </div>
      </Portal>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};