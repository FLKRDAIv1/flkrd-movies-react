import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import Portal from './Portal';

const LOCAL_STORAGE_KEY = 'flkrd_notification_prompt_seen';

const WelcomeNotificationPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { language } = useTranslation();
  const { addNotification } = useNotification();
  const isKurdish = language === 'ku' || language === 'badini';

  useEffect(() => {
    const hasBeenSeen = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (
      hasBeenSeen ||
      !('Notification' in window) ||
      Notification.permission !== 'default'
    ) return;

    // Show at 3s — before the OnboardingTour which shows at 7s
    const timer = setTimeout(() => setIsVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'dismissed');
    setIsVisible(false);
  }, []);

  const handleEnable = useCallback(async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        addNotification({
          type: 'success',
          title: isKurdish ? 'ئاگادارییەکان چالاک بوون' : 'Notifications Enabled',
          message: isKurdish
            ? 'سوپاس! ئاگادارییە نوێکانی فڵکەرد دەگەنە تۆ'
            : "You'll now receive FLKRD updates.",
        });
        try {
          new Notification(isKurdish ? 'بەخێربێیت بۆ فڵکەرد! 🎬' : 'Welcome to FLKRD! 🎬', {
            body: isKurdish
              ? 'ئاگادارییەکانت چالاک بوو. فیلم و زنجیرەی تازەکان بۆت دێن.'
              : 'New movies and series alerts coming your way.',
          });
        } catch (_) {}
      }
    } catch (err) {
      console.warn('[Notify] Permission request failed:', err);
    } finally {
      setIsPending(false);
      dismiss();
    }
  }, [isPending, isKurdish, addNotification, dismiss]);

  return (
    <Portal id="welcome-notif-portal">
      <AnimatePresence>
        {isVisible && (
          /*
           * Outer wrapper is pointer-events-none so it NEVER blocks
           * taps on the page behind it. Only the card inside is pointer-events-auto.
           */
          <div className="fixed inset-0 z-[9990] pointer-events-none" aria-live="polite">
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="pointer-events-auto absolute bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-3 right-3 md:left-auto md:right-5 md:bottom-6 md:w-[380px]"
              dir={isKurdish ? 'rtl' : 'ltr'}
            >
              {/* ── Glass card ── */}
              <div className="relative rounded-2xl overflow-hidden bg-[#111114]/96 border border-white/[0.09] shadow-[0_8px_40px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl">
                {/* Top red accent stripe */}
                <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-red-600 via-brand to-red-500" />

                {/* Dismiss × — minimum 44px touch target, positioned correctly for RTL/LTR */}
                <button
                  onClick={dismiss}
                  aria-label={isKurdish ? 'داخستن' : 'Dismiss'}
                  style={{ touchAction: 'manipulation' }}
                  className={`absolute top-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/12 active:bg-white/20 text-neutral-500 hover:text-white transition-all ${isKurdish ? 'left-3' : 'right-3'}`}
                >
                  <X size={15} />
                </button>

                {/* Body row */}
                <div className="flex items-start gap-3.5 p-4 pt-5 pb-4">
                  {/* Bell icon badge */}
                  <div className="shrink-0 w-11 h-11 rounded-[14px] bg-red-600/15 border border-red-500/25 flex items-center justify-center mt-0.5">
                    <Bell size={20} className="text-red-400" />
                  </div>

                  {/* Text + buttons */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-black text-white leading-tight mb-1">
                      {isKurdish ? 'چالاككردنی ئاگاداریيەکان' : 'Enable Notifications'}
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-medium leading-relaxed">
                      {isKurdish
                        ? 'ئاگاداری نوێترین فیلمەکان و نوێکاریيەکانی فڵکرد بە.'
                        : 'Stay updated with the latest FLKRD movies and news.'}
                    </p>

                    {/* Action buttons — flex-row-reverse for Kurdish RTL */}
                    <div className={`flex gap-2 mt-3.5 ${isKurdish ? 'flex-row-reverse' : 'flex-row'}`}>
                      <button
                        onClick={handleEnable}
                        disabled={isPending}
                        aria-label={isKurdish ? 'چالاككردن' : 'Enable'}
                        style={{ touchAction: 'manipulation' }}
                        className="flex-1 min-h-[44px] px-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-brand active:from-red-700 active:to-red-600 text-white text-[11px] font-black uppercase tracking-wide rounded-xl transition-all active:scale-[0.97] disabled:opacity-60 shadow-[0_4px_16px_rgba(220,38,38,0.3)]"
                      >
                        {isPending
                          ? (isKurdish ? 'چاوەڕوان...' : 'Please wait...')
                          : (isKurdish ? 'چالاككردن' : 'Enable')}
                      </button>
                      <button
                        onClick={dismiss}
                        aria-label={isKurdish ? 'دواتر' : 'Later'}
                        style={{ touchAction: 'manipulation' }}
                        className="flex-1 min-h-[44px] px-3 bg-white/[0.06] hover:bg-white/[0.1] active:bg-white/[0.15] border border-white/[0.08] text-neutral-300 text-[11px] font-black uppercase tracking-wide rounded-xl transition-all active:scale-[0.97]"
                      >
                        {isKurdish ? 'دواتر' : 'Later'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default WelcomeNotificationPrompt;
