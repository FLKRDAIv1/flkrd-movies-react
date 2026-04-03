import React, { useMemo } from 'react';
import { Inbox } from '@novu/react';
import { useUI } from '../contexts/UIContext';

const NotificationInbox: React.FC = () => {
  const applicationIdentifier = process.env.REACT_APP_NOVU_APPLICATION_IDENTIFIER;
  const { theme, accentColor } = useUI();
  
  const subscriberId = useMemo(() => {
    const savedId = localStorage.getItem('flkrd_subscriber_id');
    if (savedId) return savedId;
    const newId = `user_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('flkrd_subscriber_id', newId);
    return newId;
  }, []);

  const isDarkMode = theme === 'dark';

  if (!applicationIdentifier) {
    return null;
  }

  return (
    <div className="relative pointer-events-auto">
      <Inbox
        key={`${theme}-${accentColor}`} // Force re-render on theme/color change for immediate sync
        applicationIdentifier={applicationIdentifier}
        subscriberId={subscriberId}
        backendUrl={process.env.NOVU_BACKEND_URL}
        socketUrl={process.env.NOVU_SOCKET_URL}
        appearance={{
          baseTheme: isDarkMode ? 'dark' : 'light',
          variables: {
            colorPrimary: accentColor,
            colorPrimaryForeground: accentColor === '#ffffff' ? '#000000' : '#ffffff',
            colorSecondary: isDarkMode ? '#141414' : '#f1f5f9',
            colorSecondaryForeground: isDarkMode ? '#ffffff' : '#0f172a',
            colorBackground: isDarkMode ? '#0c0c0c' : '#ffffff',
            colorForeground: isDarkMode ? '#ffffff' : '#0f172a',
            colorNeutral: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            colorCounter: accentColor,
            colorCounterForeground: accentColor === '#ffffff' ? '#000000' : '#ffffff',
            fontSize: '14px',
            borderRadius: '1.25rem',
          },
          elements: {
            bellContainer: {
              background: 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '9999px',
              padding: '8px',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: accentColor,
                borderColor: accentColor,
              }
            },
            bellIcon: {
              width: '24px',
              height: '24px',
              color: isDarkMode ? '#94a3b8' : '#64748b',
            },
            popoverContent: {
                borderRadius: '2.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 50px 100px rgba(0,0,0,0.8)',
                marginTop: '10px'
            }
          }
        }}
      />
    </div>
  );
};

export default NotificationInbox;