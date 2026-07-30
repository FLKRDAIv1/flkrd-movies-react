import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Notification } from '../types';
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
    let broadcastChannel: any = null;
    let dbChannel: any = null;

    import('../utils/supabaseClient').then(({ supabase }) => {
      // Helper function to trigger native browser notification if granted
      const triggerNativeNotification = (title: string, message: string, image?: string) => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(title, {
              body: message,
              icon: image || '/favicon.ico',
              tag: 'flkrd-admin-broadcast-' + Date.now(),
            });
          } catch (e) {
            console.warn('[PUSH NOTIFICATION] Native notification failed:', e);
          }
        }
      };

      // 1. Listen to Realtime Broadcast channel
      broadcastChannel = supabase.channel('global_admin_broadcast');
      broadcastChannel
        .on('broadcast', { event: 'admin_notification' }, ({ payload }: any) => {
          if (payload && payload.title && payload.message) {
            addNotification({
              type: payload.type || 'info',
              title: payload.title,
              message: payload.message,
              image: payload.image,
              actionUrl: payload.actionUrl,
              duration: payload.duration || 5000,
            });
            triggerNativeNotification(payload.title, payload.message, payload.image);
          }
        })
        .subscribe();

      // 2. Listen to Database INSERTS on admin_broadcasts table for persistent sync
      dbChannel = supabase
        .channel('admin_broadcasts_db_sync')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'admin_broadcasts' },
          (payload: any) => {
            if (payload.new && payload.new.title && payload.new.message) {
              const item = payload.new;
              addNotification({
                type: item.type || 'info',
                title: item.title,
                message: item.message,
                image: item.image,
                actionUrl: item.action_url,
                duration: item.duration || 5000,
              });
              triggerNativeNotification(item.title, item.message, item.image);
            }
          }
        )
        .subscribe();
    });

    return () => {
      import('../utils/supabaseClient').then(({ supabase }) => {
        if (broadcastChannel) supabase.removeChannel(broadcastChannel);
        if (dbChannel) supabase.removeChannel(dbChannel);
      });
    };
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