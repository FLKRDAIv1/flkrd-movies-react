import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Share,
  Plus,
  ShieldCheck,
  Zap,
  Sparkles,
  Smartphone,
  Tv,
  CheckCircle2,
  ArrowRight,
  Laptop,
  Check
} from 'lucide-react';
import Portal from './Portal';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useUI } from '../contexts/UIContext';
import { LiquidButton } from './ui/liquid-glass-button';
import { downloadMobileConfig } from '../utils/appleProfileUtils';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<'auto' | 'manual' | 'apple_profile'>('auto');
  
  const { t, language } = useTranslation();
  const { addNotification } = useNotification();
  const { glassConfig } = useUI();
  const isKurdish = language === 'ku' || language === 'badini';

  // Device detection
  const isApple = typeof window !== 'undefined' && (
    /iPad|iPhone|iPod|Macintosh|MacIntel/.test(navigator.userAgent || '') ||
    (typeof document !== 'undefined' && 'ontouchend' in document)
  );

  const isStandalone = typeof window !== 'undefined' && (
    (window.navigator as any).standalone ||
    window.matchMedia('(display-mode: standalone)').matches
  );

  // Capture beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsOpen(false);
      addNotification({
        type: 'success',
        title: isKurdish ? 'ئەپەکە بە سەرکەوتوویی دامەزرا' : 'FLKRD App Installed',
        message: isKurdish ? 'بەخێربێیت بۆ سینەمای FLKRD MOVIES لە سەر شاشەکەت' : 'Enjoy the native FLKRD cinema experience!'
      });
    };

    const handleOpenTrigger = () => {
      setIsOpen(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('flkrd-open-pwa-install', handleOpenTrigger);

    // Initial check for standalone mode
    if (isStandalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('flkrd-open-pwa-install', handleOpenTrigger);
    };
  }, [isStandalone, isKurdish, addNotification]);

  const handleClose = useCallback(() => {
    try {
      localStorage.setItem('flkrd_pwa_prompt_dismissed', Date.now().toString());
    } catch (e) {}
    setIsOpen(false);
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) {
      if (isApple) {
        setActiveTab('manual');
        return;
      }
      addNotification({
        type: 'info',
        title: isKurdish ? 'ڕێنمایی دامەزراندن' : 'Install Guide',
        message: isKurdish
          ? 'لە لیستی وێبگەڕەکەتدا (Menu) کرتە لەسەر "Install App" یان "Add to Home Screen" بکە'
          : 'Tap your browser menu and choose "Install App" or "Add to Home Screen"'
      });
      return;
    }

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsOpen(false);
      }
    } catch (err) {
      console.warn('Native install prompt error:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDownloadAppleProfile = () => {
    downloadMobileConfig();

    addNotification({
      type: 'info',
      title: isKurdish ? 'پڕۆفایل دابەزی' : 'Profile Downloaded',
      message: isKurdish ? 'بڕۆ بۆ Settings > General > VPN & Device Management بۆ دامەزراندنی' : 'Go to Settings > General > VPN & Device Management to install.'
    });
  };

  if (!isOpen || isInstalled) return null;

  return (
    <Portal id="flkrd-pwa-portal">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          initial={{ scale: 0.92, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 30 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="bg-neutral-950/95 border border-white/15 rounded-[2.5rem] w-full max-w-lg p-6 sm:p-10 relative overflow-hidden shadow-[0_0_60px_rgba(229,9,20,0.25)] text-white select-none"
        >
          {/* Top Brand Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-brand to-amber-500" />

          {/* Close Button — 44px minimum touch target */}
          <button
            onClick={handleClose}
            style={{ touchAction: 'manipulation' }}
            className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center p-0 rounded-full bg-white/5 hover:bg-white/15 active:bg-white/25 text-neutral-400 hover:text-white transition-all active:scale-95 z-20"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Header Brand Section */}
          <div className="flex flex-col items-center text-center mt-2 mb-6">
            <div className="relative mb-5 group">
              <div className="absolute -inset-2 bg-brand/30 rounded-3xl blur-xl group-hover:bg-brand/50 transition-all" />
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] overflow-hidden shadow-2xl border-2 border-white/20 bg-black relative flex items-center justify-center">
                <img
                  src="/flkrd-icon.png"
                  alt="FLKRD MOVIES"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand/15 border border-brand/30 text-brand text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3">
              <Sparkles size={12} />
              <span>{isKurdish ? 'ئەپڵیکەیشنی فەرمی' : 'Official Web App'}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-[1000] uppercase italic tracking-tight text-white mb-2">
              FLKRD MOVIES
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm max-w-xs leading-relaxed">
              {isKurdish
                ? 'باشترین کوالێتی، خێرایی بێوێنە و بەکارهێنانی ئاسان لەسەر شاشەی مۆبایل و کۆمپیوتەرەکەت'
                : 'Install the native app for fast 4K streaming, offline access, and full cinema mode.'}
            </p>
          </div>

          {/* Feature Badges */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <Zap size={16} className="text-brand shrink-0" />
              <span className="text-[11px] font-bold text-neutral-300">
                {isKurdish ? 'خێرایی بێسنوور' : 'Zero Buffer 4K'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold text-neutral-300">
                {isKurdish ? 'بێ ڕیکلام' : '100% Ad-Free'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <Smartphone size={16} className="text-sky-400 shrink-0" />
              <span className="text-[11px] font-bold text-neutral-300">
                {isKurdish ? 'سەر شاشە و ماڵەوە' : 'Home Screen Icon'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <Laptop size={16} className="text-purple-400 shrink-0" />
              <span className="text-[11px] font-bold text-neutral-300">
                {isKurdish ? 'سینەمای Fullscreen' : 'Cinema Fullscreen'}
              </span>
            </div>
          </div>

          {/* Action Area */}
          <div className="space-y-3">
            {activeTab === 'auto' && (
              <>
                <button
                  onClick={handleNativeInstall}
                  disabled={isInstalling}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full py-4 px-6 bg-gradient-to-r from-red-600 via-brand to-red-600 hover:from-red-500 hover:to-brand text-white font-black text-sm uppercase italic tracking-widest rounded-2xl shadow-[0_4px_25px_rgba(229,9,20,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 min-h-[54px]"
                >
                  <Download size={18} />
                  <span>
                    {isInstalling
                      ? (isKurdish ? 'دادەمەزرێت...' : 'Installing...')
                      : (isKurdish ? 'داگرتن و دامەزراندنی خێرا' : 'Install FLKRD App')}
                  </span>
                </button>

                {isApple && (
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <button
                      onClick={() => setActiveTab('manual')}
                      className="text-neutral-400 hover:text-white text-xs font-bold underline transition-colors"
                    >
                      {isKurdish ? 'ڕێنمایی بۆ ئایفۆن و ئایپاد (iOS)' : 'iOS Safari Guide'}
                    </button>
                    <span className="text-neutral-600">•</span>
                    <button
                      onClick={() => setActiveTab('apple_profile')}
                      className="text-neutral-400 hover:text-white text-xs font-bold underline transition-colors"
                    >
                      {isKurdish ? 'پڕۆفایلی فەرمی Apple' : 'Apple Profile'}
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'manual' && (
              <div className="space-y-3 animate-in fade-in zoom-in-95">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3 text-xs font-bold text-neutral-300">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Share size={14} />
                    </div>
                    <span>
                      {isKurdish
                        ? '١. لە Safari کلیک لەسەر دوگمەی Share بکە'
                        : '1. Tap the Share button in Safari'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-neutral-300">
                    <div className="w-7 h-7 rounded-xl bg-brand/20 text-brand flex items-center justify-center shrink-0">
                      <Plus size={14} />
                    </div>
                    <span>
                      {isKurdish
                        ? '٢. هەڵبژاردەی "Add to Home Screen" هەڵبژێرە'
                        : '2. Scroll down & select "Add to Home Screen"'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-neutral-300">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check size={14} />
                    </div>
                    <span>
                      {isKurdish
                        ? '٣. لە سەرەوە دەست بنێ بە "Add"'
                        : '3. Tap "Add" in the top right'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('auto')}
                  className="w-full py-2.5 text-neutral-400 hover:text-white text-xs font-black uppercase tracking-widest text-center"
                >
                  {isKurdish ? 'گەڕانەوە' : 'Back'}
                </button>
              </div>
            )}

            {activeTab === 'apple_profile' && (
              <div className="space-y-3 animate-in fade-in zoom-in-95">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 text-xs text-neutral-300">
                  <p className="font-bold">
                    {isKurdish
                      ? 'پڕۆفایلی FLKRD MOVIES ڕاستەوخۆ وەک ئەپێکی سەربەخۆ لەسەر شاشەی سەرەکی دادەمەزرێت:'
                      : 'Install the native FLKRD WebClip configuration profile for iOS:'}
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-neutral-400">
                    <li>{isKurdish ? 'داگرتنی پڕۆفایل لە خوارەوە' : 'Download profile below'}</li>
                    <li>{isKurdish ? 'کردنەوەی Settings > VPN & Device Management' : 'Open Settings > VPN & Device Management'}</li>
                    <li>{isKurdish ? 'کرتە لەسەر FLKRD MOVIES و پاشان Install' : 'Tap FLKRD MOVIES and tap Install'}</li>
                  </ol>
                </div>

                <button
                  onClick={handleDownloadAppleProfile}
                  className="w-full py-3.5 bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase tracking-widest rounded-2xl active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  <span>{isKurdish ? 'داگرتنی پڕۆفایلی Apple' : 'Download iOS Profile'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('auto')}
                  className="w-full py-2 text-neutral-400 hover:text-white text-xs font-black uppercase tracking-widest text-center"
                >
                  {isKurdish ? 'گەڕانەوە' : 'Back'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
};

export default PwaInstallPrompt;
