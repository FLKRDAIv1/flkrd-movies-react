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
    setNotifications(prev => [...prev, { ...notification, id }]);
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


  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <Portal id="notification-portal">
        <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 sm:top-6 z-[101] w-full max-w-sm space-y-3 pointer-events-none px-4 sm:px-0">
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