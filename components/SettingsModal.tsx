import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Languages, Bell, Check, Palette, Sparkles, Moon, Sun, Maximize2, Minimize2, Type } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import EnableNotificationsModal from './EnableNotificationsModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const APP_COLORS = [
  { name: 'Default Red', value: '#e50914' },
  { name: 'Sky Blue', value: '#007aff' },
  { name: 'Emerald', value: '#34c759' },
  { name: 'Royal Purple', value: '#af52de' },
  { name: 'Amber Gold', value: '#ffcc00' },
  { name: 'Pure Pink', value: '#ff2d55' },
  { name: 'Cyber Orange', value: '#ff9500' },
  { name: 'Arctic White', value: '#ffffff' },
];

const APP_THEMES = [
  { id: 'dark', name: 'Dark Void', icon: Moon },
  { id: 'premium-gradient-1', name: 'Aurora', icon: Sparkles },
  { id: 'premium-gradient-2', name: 'Crimson', icon: Sparkles },
  { id: 'premium-particles-galaxy', name: 'Galaxy', icon: Sparkles },
  { id: 'premium-particles-moon', name: 'Moonlight', icon: Sparkles },
  { id: 'premium-particles-stardust', name: 'Stardust', icon: Sparkles },
  { id: 'light', name: 'Light Mode', icon: Sun },
];

const ThemePicker: React.FC<{ activeTheme: string; onSelect: (theme: any) => void; t: any }> = ({ activeTheme, onSelect, t }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 px-1">
      <Sun size={18} className="text-gray-400" />
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">{t('theme')}</h3>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {APP_THEMES.map((themeOption) => {
        const Icon = themeOption.icon;
        const isActive = activeTheme === themeOption.id;
        return (
          <button
            key={themeOption.id}
            onClick={() => onSelect(themeOption.id)}
            className={`relative flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all duration-300 overflow-hidden group ${isActive ? 'bg-white/10 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-black/20 border-white/5 text-gray-500 hover:text-white hover:border-white/20'}`}
          >
            {themeOption.id.includes('premium') && !isActive && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer-special_1.5s_infinite]" />
            )}
            <Icon size={14} className={themeOption.id.includes('premium') ? 'text-yellow-500 animate-pulse' : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest truncate">{themeOption.name}</span>
          </button>
        );
      })}
    </div>
  </div>
);

const ColorPicker: React.FC<{ activeColor: string; onSelect: (color: string) => void; t: any }> = ({ activeColor, onSelect, t }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 px-1">
      <Palette size={18} className="text-gray-400" />
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">{t('appColor')}</h3>
    </div>
    <div className="grid grid-cols-4 gap-3 bg-black/20 p-4 rounded-2xl border border-white/5">
      {APP_COLORS.map((color) => (
        <button
          key={color.value}
          onClick={() => onSelect(color.value)}
          className="relative group flex flex-col items-center gap-1"
          aria-label={color.name}
        >
          <div
            className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${activeColor === color.value ? 'scale-110 border-white shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.5)]' : 'border-transparent group-hover:scale-105'}`}
            style={{ backgroundColor: color.value }}
          >
            {activeColor === color.value && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check size={16} className={color.value === '#ffffff' ? 'text-black' : 'text-white'} strokeWidth={4} />
              </div>
            )}
          </div>
          <span className="text-[7px] font-black uppercase text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity truncate w-full text-center">{color.name}</span>
        </button>
      ))}
    </div>
  </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t, language, setLanguage } = useTranslation();
  const { theme, setTheme, accentColor, setAccentColor, scale, setScale } = useUI();
  const { addNotification } = useNotification();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnableNotificationsModalOpen, setIsEnableNotificationsModalOpen] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, [isOpen]);

  const handleNotificationRequest = async () => {
    if (!('Notification' in window)) {
      addNotification({ type: 'error', title: t('notificationsErrorTitle'), message: t('notificationsNotSupported') });
      return;
    }
    if (permission === 'denied') {
      setIsEnableNotificationsModalOpen(true);
      return;
    }
    if (permission === 'granted') {
      addNotification({ type: 'info', title: t('notificationsInfoTitle'), message: t('notificationsAlreadyEnabled') });
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      addNotification({ type: 'success', title: t('notificationsSuccessTitle'), message: t('notificationsEnabled') });
    }
  };

  const handleColorChange = (color: string) => {
    setAccentColor(color);
    addNotification({ type: 'success', title: 'Interface Synchronized', message: 'The design sequence has been updated with your preference.' });
  };

  const handleThemeChange = (newTheme: any) => {
    setTheme(newTheme);
    addNotification({ type: 'success', title: 'Theme Updated', message: 'Premium environment successfully configured.' });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end justify-center md:items-center md:justify-center p-4"
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-[#141414] border border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
            >
              <div
                className="absolute -top-24 -right-24 w-64 h-64 blur-[100px] opacity-20 pointer-events-none rounded-full transition-colors duration-1000"
                style={{ backgroundColor: accentColor }}
              />

              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                    <Sparkles size={20} style={{ color: accentColor }} />
                  </div>
                  <h2 className="text-2xl font-[1000] text-white uppercase italic tracking-tighter">{t('designSettings')}</h2>
                </div>
                <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8 max-h-[65vh] overflow-y-auto pr-2 scrollbar-hide">
                {/* Theme & Language Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4 md:col-span-2">
                    <ThemePicker activeTheme={theme} onSelect={handleThemeChange} t={t} />
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <div className="flex items-center gap-2 px-1">
                      <Languages size={18} className="text-gray-400" />
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">{t('language')}</h3>
                    </div>
                    <div className="flex p-1 bg-black/20 rounded-2xl border border-white/5">
                      <button onClick={() => setLanguage('en')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'bg-white text-black shadow-lg' : 'text-gray-500'}`}>{t('english')}</button>
                      <button onClick={() => setLanguage('ku')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${language === 'ku' ? 'bg-white text-black shadow-lg' : 'text-gray-500'}`}>{t('kurdish')}</button>
                    </div>
                  </div>
                </div>

                {/* Interface Scaling Tool */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Type size={18} className="text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">{t('interfaceScale')}</h3>
                  </div>
                  <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-6">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                      <div className="flex items-center gap-2"><Minimize2 size={14} /> 50%</div>
                      <div className="text-white font-black text-xs bg-white/5 px-3 py-1 rounded-full border border-white/5">{Math.round(scale * 100)}%</div>
                      <div className="flex items-center gap-2">130% <Maximize2 size={14} /></div>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.3"
                      step="0.05"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand"
                      style={{ accentColor: accentColor }}
                    />
                    <p className="text-[9px] text-gray-500 font-bold uppercase text-center tracking-widest">{t('scalingDescription')}</p>
                  </div>
                </div>

                <ColorPicker activeColor={accentColor} onSelect={handleColorChange} t={t} />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Bell size={18} className="text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">{t('notifications')}</h3>
                  </div>
                  <div className="bg-black/20 rounded-2xl p-6 border border-white/5 flex items-center justify-between gap-4">
                    <p className="text-gray-400 text-[10px] font-bold leading-relaxed flex-1">{t('notificationsDescription')}</p>
                    {permission === 'granted' ? (
                      <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/20">
                        <Check size={14} strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('notificationsStatusEnabled')}</span>
                      </div>
                    ) : (
                      <button onClick={handleNotificationRequest} className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl" style={{ backgroundColor: accentColor, color: accentColor === '#ffffff' ? '#000' : '#fff' }}>
                        {t(permission === 'denied' ? 'manageNotifications' : 'enableNotifications')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
                <button onClick={onClose} className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em] hover:text-white transition-colors">{t('close')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <EnableNotificationsModal isOpen={isEnableNotificationsModalOpen} onClose={() => setIsEnableNotificationsModalOpen(false)} />
    </>
  );
};

export default SettingsModal;