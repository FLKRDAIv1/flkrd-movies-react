import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  X, Languages, Bell, Check, Palette, Sparkles, Moon, Sun,
  Maximize2, Minimize2, Type, Zap, Info, Monitor, Gauge,
  ChevronRight, Activity
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import EnableNotificationsModal from './EnableNotificationsModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ─── Data ─────────────────────────────────────── */
const APP_COLORS = [
  { name: 'FLKRD Red',      value: '#e50914' },
  { name: 'Sky Blue',       value: '#007aff' },
  { name: 'Emerald',        value: '#34c759' },
  { name: 'Royal Purple',   value: '#af52de' },
  { name: 'Amber Gold',     value: '#ffcc00' },
  { name: 'Pure Pink',      value: '#ff2d55' },
  { name: 'Cyber Orange',   value: '#ff9500' },
  { name: 'Arctic White',   value: '#ffffff' },
];

const APP_THEMES = [
  { id: 'dark',                      name: 'Dark Void',   icon: '🌑', color: '#000' },
  { id: 'premium-gradient-1',        name: 'Aurora',      icon: '🌌', color: '#6c3483' },
  { id: 'premium-gradient-2',        name: 'Crimson',     icon: '🔴', color: '#c0392b' },
  { id: 'premium-particles-galaxy',  name: 'Galaxy',      icon: '✨', color: '#1a237e' },
  { id: 'premium-particles-moon',    name: 'Moonlight',   icon: '🌙', color: '#37474f' },
  { id: 'premium-particles-stardust',name: 'Stardust',    icon: '💫', color: '#4a148c' },
  { id: 'light',                     name: 'Light',       icon: '☀️', color: '#f5f5f5' },
];

/* ─── Animated Toggle ───────────────────────────── */
const AnimatedToggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  color?: string;
  language?: string;
}> = ({ checked, onChange, color = '#e50914', language = 'en' }) => {
  const isRTL = language === 'ku';
  return (
    <motion.button
      onClick={onChange}
      className="relative w-16 h-8 rounded-full flex-shrink-0 focus:outline-none"
      style={{
        backgroundColor: checked ? color : 'rgba(255,255,255,0.08)',
        boxShadow: checked ? `0 0 24px ${color}66` : 'none',
      }}
      animate={{ backgroundColor: checked ? color : 'rgba(255,255,255,0.08)' }}
      transition={{ duration: 0.3 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Track glow */}
      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: `inset 0 0 12px ${color}44` }}
          />
        )}
      </AnimatePresence>
      {/* Thumb */}
      <motion.div
        className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-xl flex items-center justify-center"
        animate={{
          x: isRTL
            ? (checked ? 4 : 36)
            : (checked ? 36 : 4),
          scale: checked ? 1.05 : 1,
        }}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
      >
        <motion.div
          className="w-2 h-2 rounded-full"
          animate={{ backgroundColor: checked ? color : '#ccc', scale: checked ? 1 : 0.6 }}
          transition={{ duration: 0.2 }}
        />
      </motion.div>
    </motion.button>
  );
};

/* ─── Live FPS Counter ──────────────────────────── */
const FPSCounter: React.FC<{ active: boolean }> = ({ active }) => {
  const [fps, setFps] = useState(60);
  const frameRef = useRef<number>(0);
  const lastRef = useRef<number>(performance.now());
  const countRef = useRef<number>(0);

  useEffect(() => {
    if (!active) { setFps(60); return; }
    const loop = (now: number) => {
      countRef.current++;
      if (now - lastRef.current >= 500) {
        setFps(Math.round(countRef.current * (1000 / (now - lastRef.current))));
        countRef.current = 0;
        lastRef.current = now;
      }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active]);

  const color = fps >= 55 ? '#34c759' : fps >= 40 ? '#ffcc00' : '#e50914';
  return (
    <motion.div
      className="flex items-center gap-1.5 font-mono text-xs font-black tabular-nums"
      key={fps}
      animate={{ color }}
      transition={{ duration: 0.3 }}
    >
      <Activity size={11} style={{ color }} />
      <span>{fps}</span>
      <span className="text-gray-600 text-[9px]">FPS</span>
    </motion.div>
  );
};

/* ─── Section wrapper w/ stagger reveal ────────── */
const Section: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    {children}
  </motion.div>
);

/* ─── Section header ────────────────────────────── */
const SectionLabel: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2 mb-3 px-1">
    <span className="text-gray-500">{icon}</span>
    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">{label}</span>
    <div className="flex-1 h-px bg-white/5" />
  </div>
);

/* ─── Glass card wrapper ────────────────────────── */
const Card: React.FC<{ children: React.ReactNode; className?: string; glow?: string }> = ({ children, className = '', glow }) => (
  <motion.div
    whileHover={{ scale: 1.005 }}
    className={`relative rounded-[1.5rem] border border-white/8 bg-white/[0.03] backdrop-blur-sm overflow-hidden ${className}`}
    style={glow ? { boxShadow: `0 0 0 0 ${glow}` } : {}}
  >
    {glow && (
      <motion.div
        className="absolute inset-0 opacity-0 rounded-[1.5rem] pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${glow}1a, transparent 70%)` }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    )}
    {children}
  </motion.div>
);

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t, language, setLanguage } = useTranslation();
  const { theme, setTheme, accentColor, setAccentColor, scale, setScale, isPerformanceMode, setIsPerformanceMode } = useUI();
  const { addNotification } = useNotification();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnableNotificationsModalOpen, setIsEnableNotificationsModalOpen] = useState(false);
  const [showFPS, setShowFPS] = useState(false);

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
  }, [isOpen]);

  const handleNotificationRequest = async () => {
    if (!('Notification' in window)) {
      addNotification({ type: 'error', title: t('notificationsErrorTitle'), message: t('notificationsNotSupported') });
      return;
    }
    if (permission === 'denied') { setIsEnableNotificationsModalOpen(true); return; }
    if (permission === 'granted') {
      addNotification({ type: 'info', title: t('notificationsInfoTitle'), message: t('notificationsAlreadyEnabled') });
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') addNotification({ type: 'success', title: t('notificationsSuccessTitle'), message: t('notificationsEnabled') });
  };

  const handleColorChange = (color: string) => {
    setAccentColor(color);
    addNotification({ type: 'success', title: '🎨 Color Updated', message: 'Interface color synchronized.' });
  };

  const handleThemeChange = (id: string) => {
    setTheme(id as any);
    addNotification({ type: 'success', title: '🖼 Theme Applied', message: 'Environment configured.' });
  };

  const togglePerformance = () => {
    const next = !isPerformanceMode;
    setIsPerformanceMode(next);
    setShowFPS(next);
    addNotification({
      type: next ? 'success' : 'info',
      title: next ? '⚡ 60 FPS Mode ON' : '🎨 Quality Mode ON',
      message: next
        ? (language === 'ku' ? 'دۆخی خێرا چالاک کرا' : 'All GPU effects disabled for max frames.')
        : (language === 'ku' ? 'دۆخی ئاسایی گەڕێندرایەوە' : 'Full visual quality restored.')
    });
  };

  const scalePercent = Math.round((scale || 1) * 100);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] flex items-end justify-center md:items-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md relative"
              style={{
                background: 'linear-gradient(145deg, rgba(18,18,18,0.98) 0%, rgba(10,10,10,0.98) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '2rem',
                boxShadow: `0 40px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
              }}
            >
              {/* Accent glow */}
              <div
                className="absolute -top-32 -right-32 w-72 h-72 rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`,
                  filter: 'blur(40px)',
                  transition: 'background 0.5s ease',
                }}
              />

              {/* ── Header ── */}
              <div className="relative flex items-center justify-between px-6 pt-6 pb-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-9 h-9 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${accentColor}22`, border: `1px solid ${accentColor}44` }}
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <Sparkles size={16} style={{ color: accentColor }} />
                  </motion.div>
                  <div>
                    <h2 className="text-base font-[900] text-white uppercase italic tracking-tight leading-none">
                      {t('designSettings')}
                    </h2>
                    <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] mt-0.5">FLKRD SYSTEM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FPSCounter active={showFPS} />
                  <motion.button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X size={14} />
                  </motion.button>
                </div>
              </div>

              {/* ── Scrollable Content ── */}
              <div className="overflow-y-auto max-h-[72vh] px-5 py-5 space-y-6 scrollbar-hide">

                {/* ── THEME ── */}
                <Section delay={0.05}>
                  <SectionLabel icon={<Moon size={13} />} label={t('theme')} />
                  <div className="grid grid-cols-4 gap-2">
                    {APP_THEMES.map((th, i) => {
                      const active = theme === th.id;
                      return (
                        <motion.button
                          key={th.id}
                          onClick={() => handleThemeChange(th.id)}
                          className="relative flex flex-col items-center gap-2 py-3 rounded-2xl border text-center overflow-hidden"
                          style={{
                            backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                            borderColor: active ? accentColor : 'rgba(255,255,255,0.06)',
                            boxShadow: active ? `0 0 16px ${accentColor}33` : 'none',
                          }}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 + i * 0.03, duration: 0.3 }}
                        >
                          {/* Colour swatch */}
                          <div
                            className="w-7 h-7 rounded-xl border border-white/10"
                            style={{ backgroundColor: th.color }}
                          />
                          <span className="text-[8px] font-black uppercase tracking-wider text-gray-400 leading-none px-1">
                            {th.name}
                          </span>
                          {active && (
                            <motion.div
                              layoutId="theme-active"
                              className="absolute inset-0 rounded-2xl"
                              style={{ border: `1.5px solid ${accentColor}` }}
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </Section>

                {/* ── LANGUAGE ── */}
                <Section delay={0.1}>
                  <SectionLabel icon={<Languages size={13} />} label={t('language')} />
                  <Card className="p-1">
                    <div className="flex gap-1">
                      {['en', 'ku'].map((lang) => {
                        const active = language === lang;
                        return (
                          <motion.button
                            key={lang}
                            onClick={() => setLanguage(lang as 'en' | 'ku')}
                            className="flex-1 py-3 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest transition-colors relative"
                            style={{ color: active ? '#000' : '#666' }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {active && (
                              <motion.div
                                layoutId="lang-pill"
                                className="absolute inset-0 bg-white rounded-[1.2rem]"
                                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                              />
                            )}
                            <span className="relative z-10">
                              {lang === 'en' ? t('english') : t('kurdish')}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </Card>
                </Section>

                {/* ── PERFORMANCE / 60 FPS ── */}
                <Section delay={0.15}>
                  <SectionLabel icon={<Gauge size={13} />} label={language === 'ku' ? 'خێرایی' : 'Performance'} />
                  <Card glow={isPerformanceMode ? '#34c759' : undefined}>
                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center"
                            animate={{
                              backgroundColor: isPerformanceMode ? '#34c75922' : 'rgba(255,255,255,0.05)',
                              boxShadow: isPerformanceMode ? '0 0 20px #34c75944' : 'none',
                            }}
                          >
                            <motion.div
                              animate={{ rotate: isPerformanceMode ? 360 : 0 }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                            >
                              <Zap size={18} color={isPerformanceMode ? '#34c759' : '#555'} />
                            </motion.div>
                          </motion.div>
                          <div>
                            <p className="text-sm font-[900] text-white uppercase italic tracking-tight leading-none">
                              {language === 'ku' ? 'مۆدی ٦٠ FPS' : '60 FPS Mode'}
                            </p>
                            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-wider mt-1">
                              {language === 'ku' ? 'باشترکردنی مۆبایلە لاوازەکان' : t('performanceDescription')}
                            </p>
                          </div>
                        </div>
                        <AnimatedToggle
                          checked={isPerformanceMode}
                          onChange={togglePerformance}
                          color="#34c759"
                          language={language}
                        />
                      </div>

                      {/* FPS bar visualization */}
                      <AnimatePresence>
                        {isPerformanceMode && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-white/5">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">GPU Effects</span>
                                <div className="flex-1 h-px bg-white/5" />
                                <span className="text-[9px] font-black text-red-500">OFF</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {['backdrop-blur', 'box-shadow', 'animations'].map((fx) => (
                                  <div key={fx} className="bg-red-500/10 border border-red-500/20 rounded-xl px-2 py-1.5 text-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mx-auto mb-1 animate-pulse" />
                                    <span className="text-[7px] font-black text-red-400 uppercase tracking-wide">{fx}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Info */}
                    <div className="px-5 pb-5">
                      <div className="flex items-start gap-2 bg-white/[0.03] rounded-xl p-3 border border-white/5">
                        <Info size={11} className="text-gray-600 shrink-0 mt-0.5" />
                        <p className="text-[8.5px] text-gray-600 font-medium leading-relaxed italic">
                          {t('performanceInfo')}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Section>

                {/* ── ACCENT COLOR ── */}
                <Section delay={0.2}>
                  <SectionLabel icon={<Palette size={13} />} label={t('appColor')} />
                  <Card className="p-4">
                    <div className="grid grid-cols-8 gap-2">
                      {APP_COLORS.map((color, i) => {
                        const active = accentColor === color.value;
                        return (
                          <motion.button
                            key={color.value}
                            onClick={() => handleColorChange(color.value)}
                            className="relative aspect-square rounded-full"
                            style={{ backgroundColor: color.value }}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 + i * 0.03, type: 'spring', stiffness: 400, damping: 20 }}
                            aria-label={color.name}
                          >
                            <AnimatePresence>
                              {active && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  className="absolute inset-0 rounded-full flex items-center justify-center"
                                  style={{
                                    boxShadow: `0 0 0 2.5px #000, 0 0 0 4px ${color.value}, 0 0 16px ${color.value}88`
                                  }}
                                >
                                  <Check
                                    size={10}
                                    strokeWidth={4}
                                    color={color.value === '#ffffff' || color.value === '#ffcc00' ? '#000' : '#fff'}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        );
                      })}
                    </div>
                  </Card>
                </Section>

                {/* ── APP SIZE ── */}
                <Section delay={0.25}>
                  <SectionLabel icon={<Type size={13} />} label={language === 'ku' ? 'قەبارەی ئەپ' : 'App Size'} />
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/8"
                          animate={{ scale: scale || 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <Monitor size={16} className="text-gray-400" />
                        </motion.div>
                        <div>
                          <motion.p
                            key={scalePercent}
                            initial={{ y: -8, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-lg font-[900] text-white tabular-nums leading-none"
                          >
                            {scalePercent}%
                          </motion.p>
                          <p className="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">
                            {scalePercent < 100 ? 'Compact' : scalePercent > 100 ? 'Enlarged' : 'Default'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={() => setScale(Math.max(0.5, (scale || 1) - 0.05))}
                          whileTap={{ scale: 0.85 }}
                          className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 border border-white/8 flex items-center justify-center transition-colors"
                        >
                          <Minimize2 size={12} className="text-gray-400" />
                        </motion.button>
                        <motion.button
                          onClick={() => setScale(1)}
                          whileTap={{ scale: 0.95 }}
                          className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-white/8 hover:bg-white/15 border border-white/8 text-gray-500 hover:text-white transition-colors"
                        >
                          Reset
                        </motion.button>
                        <motion.button
                          onClick={() => setScale(Math.min(1.5, (scale || 1) + 0.05))}
                          whileTap={{ scale: 0.85 }}
                          className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 border border-white/8 flex items-center justify-center transition-colors"
                        >
                          <Maximize2 size={12} className="text-gray-400" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Slider */}
                    <div className="space-y-2">
                      <input
                        type="range"
                        min={50} max={150} step={5}
                        value={scalePercent}
                        onChange={(e) => setScale(Number(e.target.value) / 100)}
                        className="w-full h-1 cursor-pointer"
                        style={{ accentColor }}
                      />
                      <div className="flex justify-between text-[7.5px] font-black text-gray-700 uppercase tracking-widest">
                        <span>50%</span><span>75%</span><span>100%</span><span>125%</span><span>150%</span>
                      </div>
                    </div>
                  </Card>
                </Section>

                {/* ── NOTIFICATIONS ── */}
                <Section delay={0.3}>
                  <SectionLabel icon={<Bell size={13} />} label={t('notifications')} />
                  <Card className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-[10px] text-gray-500 font-medium leading-relaxed flex-1">
                        {t('notificationsDescription')}
                      </p>
                      {permission === 'granted' ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-1.5 bg-green-500/10 px-3 py-2 rounded-xl border border-green-500/20"
                        >
                          <Check size={11} strokeWidth={3} className="text-green-500" />
                          <span className="text-[9px] font-black text-green-400 uppercase tracking-widest whitespace-nowrap">On</span>
                        </motion.div>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.03 }}
                          onClick={handleNotificationRequest}
                          className="px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl flex-shrink-0"
                          style={{ backgroundColor: accentColor, color: accentColor === '#ffffff' || accentColor === '#ffcc00' ? '#000' : '#fff' }}
                        >
                          {t(permission === 'denied' ? 'manageNotifications' : 'enableNotifications')}
                        </motion.button>
                      )}
                    </div>
                  </Card>
                </Section>

              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-center px-6 py-4 border-t border-white/[0.05]">
                <motion.button
                  onClick={onClose}
                  className="text-[9px] font-black text-gray-700 uppercase tracking-[0.4em] hover:text-white transition-colors flex items-center gap-1.5"
                  whileHover={{ letterSpacing: '0.5em' }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={9} />
                  {t('close')}
                </motion.button>
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