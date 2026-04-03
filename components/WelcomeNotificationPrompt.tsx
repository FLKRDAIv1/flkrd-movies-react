import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';

const LOCAL_STORAGE_KEY = 'flkrd_notification_prompt_seen';

const WelcomeNotificationPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation();
  const { addNotification } = useNotification();

  useEffect(() => {
    const hasBeenSeen = localStorage.getItem(LOCAL_STORAGE_KEY);
    // Only show if notifications are not already granted or denied, and prompt hasn't been seen
    if (!hasBeenSeen && 'Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000); // Show after 3 seconds
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  const handleEnable = async () => {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
        addNotification({
            type: 'success',
            title: t('notificationsSuccessTitle'),
            message: t('notificationsEnabled'),
        });
        new Notification(t('pushPermissionTitle'), {
            body: t('pushPermissionBody'),
        });
    }
    // Dismiss regardless of the outcome, as the browser prompt has been shown
    handleDismiss();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-[100] w-auto max-w-md"
        >
          <div className="bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-2xl border border-white/10 p-4 flex items-start space-x-4">
            <div className="flex-shrink-0 bg-red-600/20 p-2 rounded-full">
                <Bell className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">{t('welcomePromptTitle')}</h3>
              <p className="text-sm text-gray-300 mt-1">{t('welcomePromptBody')}</p>
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={handleEnable}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors"
                >
                  {t('welcomePromptEnable')}
                </button>
                <button
                  onClick={handleDismiss}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-2 px-4 rounded-md text-sm transition-colors"
                >
                  {t('welcomePromptLater')}
                </button>
              </div>
            </div>
             <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
                aria-label={t('close')}
             >
                <X size={18} />
             </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeNotificationPrompt;