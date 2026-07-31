import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
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
  // Ref to track whether realtime channels are already set up
  const channelsRef = useRef<{ broadcast: any; db: any } | null>(null);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = String(Date.now() + Math.random());
    const duration = notification.duration ?? 4000;
    setNotifications(prev => [...prev, { ...notification, id, duration }]);
    
    // Native Sync: Trigger Tauri system notification (deferred to avoid blocking message handler)
    if (notification.type !== 'info') {
      setTimeout(() => {
        import('../services/tauriService').then(({ tauriService }) => {
          tauriService.notify(notification.title, notification.message);
        });
      }, 0);
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
  // Deferred until the page is visible to avoid WebSocket errors on hidden/background tabs
  React.useEffect(() => {
    let cleanupFn: (() => void) | null = null;

    const setupChannels = () => {
      // Prevent duplicate subscriptions
      if (channelsRef.current) return;

      import('../utils/supabaseClient').then(({ supabase }) => {
        // Helper: trigger native browser notification (deferred off main thread)
        const triggerNativeNotification = (title: string, message: string, image?: string) => {
          setTimeout(() => {
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
          }, 0);
        };

        // 1. Realtime Broadcast channel
        const broadcastChannel = supabase.channel('global_admin_broadcast');
        broadcastChannel
          .on('broadcast', { event: 'admin_notification' }, ({ payload }: any) => {
            // Defer payload processing off the WebSocket message handler (fixes 150ms+ violation)
            setTimeout(() => {
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
            }, 0);
          })
          .subscribe();

        // 2. DB INSERT listener on admin_broadcasts
        const dbChannel = supabase
          .channel('admin_broadcasts_db_sync')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'admin_broadcasts' },
            (payload: any) => {
              // Defer processing off the WebSocket message handler
              setTimeout(() => {
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
              }, 0);
            }
          )
          .subscribe();

        channelsRef.current = { broadcast: broadcastChannel, db: dbChannel };

        cleanupFn = () => {
          supabase.removeChannel(broadcastChannel);
          supabase.removeChannel(dbChannel);
          channelsRef.current = null;
        };
      });
    };

    // Only subscribe when the tab is visible (prevents WebSocket-closed-before-connection errors)
    if (document.visibilityState === 'visible') {
      // Small delay to let the app finish initial render first
      const timer = setTimeout(setupChannels, 1500);
      return () => {
        clearTimeout(timer);
        cleanupFn?.();
      };
    } else {
      // Wait for tab to become visible before connecting
      const onVisible = () => {
        if (document.visibilityState === 'visible') {
          document.removeEventListener('visibilitychange', onVisible);
          setupChannels();
        }
      };
      document.addEventListener('visibilitychange', onVisible);
      return () => {
        document.removeEventListener('visibilitychange', onVisible);
        cleanupFn?.();
      };
    }
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