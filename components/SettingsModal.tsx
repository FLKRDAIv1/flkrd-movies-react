import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Languages, Bell, Check, Palette, Sparkles, Moon, Sun,
  Maximize2, Minimize2, Type, Zap, Info, Monitor, Gauge,
  ChevronRight, Activity, Cpu, RefreshCw, Download,
  Smartphone, Laptop, ArrowUpRight, Apple,
  BookOpen, Layers, HelpCircle, FileText, ShieldCheck, Copy
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import EnableNotificationsModal from './EnableNotificationsModal';
import Portal from './Portal';
import { LiquidButton } from './ui/liquid-glass-button';
import { updateService, UpdateCheckResult } from '../services/updateService';
import { isTauri } from '../utils/tauriUtils';
import { tauriService } from '../services/tauriService';
import { supabase } from '../utils/supabaseClient';
// @ts-ignore
import warningImage1 from './warnin g images/image.png';
// @ts-ignore
import warningImage2 from './warnin g images/image copy.png';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ─── Data Constants ───────────────────────────── */
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

/* ─── Sub-Components ────────────────────────── */

const AnimatedToggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  color?: string;
  language?: string;
}> = ({ checked, onChange, color = '#e50914', language = 'en' }) => {
  const isRTL = (language === 'ku' || language === 'badini') || language === 'badini';
  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className="relative w-14 h-7 rounded-full flex-shrink-0 focus:outline-none overflow-hidden"
      style={{
        backgroundColor: checked ? color : 'rgba(255,255,255,0.08)',
      }}
      whileTap={{ scale: 0.92 }}
    >
      <motion.div
        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg flex items-center justify-center"
        animate={{
          x: isRTL
            ? (checked ? 4 : 32)
            : (checked ? 32 : 4),
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: checked ? color : '#ccc' }} />
      </motion.div>
    </motion.button>
  );
};

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
    <div className="flex items-center gap-1.5 font-mono text-[10px] font-black tabular-nums bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
      <Activity size={10} style={{ color }} className={fps < 50 ? 'animate-pulse' : ''} />
      <span style={{ color }}>{fps} <span className="opacity-40 ml-0.5">FPS</span></span>
    </div>
  );
};

const Section: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

const SectionLabel: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2.5 mb-4 px-1">
    <span className="text-gray-500 scale-90">{icon}</span>
    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 whitespace-nowrap">{label}</span>
    <div className="flex-1 h-[1px] bg-gradient-to-r from-main-text/5 to-transparent" />
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string; glow?: string }> = ({ children, className = '', glow }) => (
  <div 
    className={`relative rounded-3xl border border-main-text/5 bg-main-text/[0.02] backdrop-blur-md overflow-hidden transition-all duration-500 ${className}`}
    style={glow ? { boxShadow: `0 0 40px ${glow}11`, borderColor: `${glow}33` } : {}}
  >
    {children}
  </div>
);

/* ─── Main Component ────────────────────────── */

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useTranslation();
  const handleDownloadClick = async (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    if (isTauri()) {
      e.preventDefault();
      await tauriService.openExternal(url);
    }
  };
  const { 
    theme, setTheme, 
    accentColor, setAccentColor, 
    scale, setScale, 
    isPerformanceMode, setIsPerformanceMode,
    glassConfig
  } = useUI();
  const { addNotification } = useNotification();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnableNotificationsModalOpen, setIsEnableNotificationsModalOpen] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);

  // System update checking states
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Dynamic Platform Detection State
  type Platform = 'ios' | 'android' | 'macos' | 'windows' | 'web';
  const [detectedPlatform, setDetectedPlatform] = useState<Platform>('web');
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);

  // Dynamic Download URLs from Supabase Registry
  const [macDownloadUrl, setMacDownloadUrl] = useState('https://github.com/FLKRDAIv1/flkrd-movies-react/releases/download/v5.5.1.25/FLKRD_MOVIES_Mac_v5.5.1.25.dmg');
  const [androidDownloadUrl, setAndroidDownloadUrl] = useState('https://github.com/FLKRDAIv1/flkrd-movies-react/releases/download/v5.5.1.25/FLKRD_Movies_v5.5.1.25_Universal.apk');

  // macOS Installation Guide States
  const [isMacTutorialOpen, setIsMacTutorialOpen] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [macTutorialStep, setMacTutorialStep] = useState(1);

  useEffect(() => {
    const fetchDownloadUrls = async () => {
      try {
        const { data, error } = await supabase
          .from('app_updates')
          .select('platform, download_url');
        
        if (error) throw error;
        
        if (data) {
          const mac = data.find(item => item.platform === 'macos');
          const android = data.find(item => item.platform === 'android');
          if (mac?.download_url) setMacDownloadUrl(mac.download_url);
          if (android?.download_url) setAndroidDownloadUrl(android.download_url);
        }
      } catch (e) {
        console.warn('[SETTINGS MODAL] Failed to fetch download URLs from Supabase:', e);
      }
    };

    if (isOpen) {
      fetchDownloadUrls();
    }
  }, [isOpen]);

  useEffect(() => {
    const getDevicePlatform = (): Platform => {
      if (typeof window === 'undefined') return 'web';
      const ua = navigator.userAgent;
      if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
      if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 0) return 'ios';
      if (/Android/i.test(ua)) return 'android';
      if (/Macintosh/i.test(ua)) return 'macos';
      if (/Windows/i.test(ua)) return 'windows';
      return 'web';
    };
    setDetectedPlatform(getDevicePlatform());
  }, []);

  // Performance monitoring logic
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setSessionTime(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateError(null);
    try {
      const result = await updateService.checkForUpdates();
      setUpdateResult(result);
      if (result.updateAvailable) {
        addNotification({
          type: 'info',
          title: (language === 'ku' || language === 'badini') ? 'نوێکاری بەردەستە' : 'Update Available',
          message: (language === 'ku' || language === 'badini') ? `وەشانی ${result.latestVersion} ئامادەیە بۆ دابەزاندن` : `Version ${result.latestVersion} is ready for installation.`
        });
      } else {
        addNotification({
          type: 'success',
          title: (language === 'ku' || language === 'badini') ? 'سیستم نوێیە' : 'System Up-to-Date',
          message: (language === 'ku' || language === 'badini') ? 'تۆ دوایین وەشانی سیستم بەکاردێنیت' : 'You are running the latest version.'
        });
      }
    } catch (err) {
      console.error('[UPDATE UI] Error checking for updates:', err);
      setUpdateError((language === 'ku' || language === 'badini') ? 'پەیوەندی سەرنەکەوت' : 'Failed to reach update servers.');
      addNotification({
        type: 'error',
        title: (language === 'ku' || language === 'badini') ? 'هەڵە لە پشکنین' : 'Update Check Failed',
        message: (language === 'ku' || language === 'badini') ? 'تکایە هێڵی ئینتەرنێتەکەت بپشکنە' : 'Please check your internet connection.'
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleExecuteUpdate = async () => {
    if (!updateResult) return;
    try {
      await updateService.executeUpdate(updateResult);
      addNotification({
        type: 'info',
        title: (language === 'ku' || language === 'badini') ? 'دەستپێکردنی نوێکاری' : 'Initiating Update',
        message: (language === 'ku' || language === 'badini') ? 'پرۆسەی نوێکردنەوە دەستی پێکرد' : 'Updating protocol initiated.'
      });
    } catch (err) {
      console.error('[UPDATE UI] Error executing update:', err);
      addNotification({
        type: 'error',
        title: (language === 'ku' || language === 'badini') ? 'نوێکاری سەرنەکەوت' : 'Update Execution Failed',
        message: (language === 'ku' || language === 'badini') ? 'کێشەیەک ڕوویدا لە کاتی جێبەجێکردندا' : 'An error occurred while launching update.'
      });
    }
  };

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
  }, [isOpen]);

  const handleColorChange = (color: string) => {
    setAccentColor(color);
    addNotification({ 
      type: 'success', 
      title: '🎨 Color Updated', 
      message: 'Interface color synchronized.' 
    });
  };

  const handleThemeChange = (id: string) => {
    setTheme(id as any);
    addNotification({ 
      type: 'success', 
      title: '🖼 Theme Applied', 
      message: 'Environment configured.' 
    });
  };

  const togglePerformance = () => {
    const next = !isPerformanceMode;
    setIsPerformanceMode(next);
    addNotification({
      type: next ? 'success' : 'info',
      title: next ? '⚡ 60 FPS Turbo ON' : '🎨 High Quality ON',
      message: next 
        ? ((language === 'ku' || language === 'badini') ? 'دۆخی خێرا چالاک کرا' : 'Visual suppression active for maximum performance.')
        : ((language === 'ku' || language === 'badini') ? 'دۆخی ئاسایی گەڕێندرایەوە' : 'Full visual fidelity restored.')
    });
  };

  const scalePercent = Math.round((scale || 1) * 100);

  return (
    <Portal id="settings-portal">
      <div className={`fixed inset-0 z-[1000] pointer-events-none ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <AnimatePresence>
        {isOpen && (
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto">
          {/* Backdrop with motion-graphics blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-[12px]"
            style={{ pointerEvents: 'auto' }}
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden z-10"
            style={{ borderRadius: `${glassConfig.cornerRadius}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Isolated Liquid-Glass background overlay */}
            <div 
              className="absolute inset-0 z-0 pointer-events-none transition-all duration-300 overflow-hidden"
              style={{
                background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${glassConfig.redOpacity}), transparent 80%), rgba(10, 10, 10, ${glassConfig.darkOpacity})`,
                backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                borderRadius: `${glassConfig.cornerRadius}px`,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
                boxShadow: `
                  inset 0 1px 0 0 rgba(255, 255, 255, ${0.12 + glassConfig.borderOpacity * 0.45}),
                  inset ${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(255, 0, 80, 0.08),
                  inset -${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(0, 200, 255, 0.08),
                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.4),
                  0 25px 50px -12px rgba(0, 0, 0, 0.5)
                `
              }}
            >
              {/* Dynamic GPU-accelerated water sheen overlay */}
              <div 
                className="absolute inset-[-100%] pointer-events-none mix-blend-overlay animate-[ios-glass-shine_25s_linear_infinite]"
                style={{
                  background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, ${0.05 + (glassConfig.displacementScale / 120) * 0.15}) 0%, rgba(255, 255, 255, 0.01) 40%, transparent 70%)`,
                  opacity: (glassConfig.displacementScale / 120) * 0.9,
                  animationDuration: `${30 * (0.35 / Math.max(0.1, glassConfig.elasticity))}s`
                }}
              />
            </div>

            {/* Glass Highlight Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.03] to-transparent z-[1]" style={{ borderRadius: `${glassConfig.cornerRadius}px` }} />

            {/* Sharp content container above background overlay */}
            <div className="relative z-10 w-full h-full flex flex-col">
            
            {/* Header */}
            <div className="relative px-8 pt-8 pb-6 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <Sparkles size={20} style={{ color: accentColor }} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-[1000] text-main-text uppercase italic tracking-tighter leading-none">
                    {t('designSettings')}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">FLKRD CORE v5.5.1.25</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FPSCounter active={true} />
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-main-text/5 hover:bg-main-text/10 border border-main-text/10 flex items-center justify-center text-gray-400 hover:text-main-text transition-all active:scale-90"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[60vh] px-8 py-8 space-y-8 scroll-smooth scrollbar-hide">
              
              {/* Performance Diagnostics */}
              <Section delay={0.1}>
                <SectionLabel icon={<Cpu size={14} />} label="System Integrity" />
                <div className="grid grid-cols-2 gap-4">
                   <Card className="p-5 flex flex-col gap-1">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Runtime</span>
                      <span className="text-base font-black text-white font-mono">
                        {Math.floor(sessionTime / 60)}m {sessionTime % 60}s
                      </span>
                   </Card>
                   <Card className="p-5 flex flex-col gap-1" glow={isPerformanceMode ? '#34c759' : undefined}>
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Engine Status</span>
                      <span className={`text-base font-[1000] uppercase italic ${isPerformanceMode ? 'text-green-500' : 'text-blue-400'}`}>
                        {isPerformanceMode ? 'Turbo Mode' : 'Standard'}
                      </span>
                   </Card>
                </div>
                
                <Card className="p-5 mt-4 flex items-center justify-between border-red-500/20 bg-red-500/5">
                    <div>
                        <span className="text-[8px] font-black text-red-400 uppercase tracking-widest block mb-1">System Memory</span>
                        <span className="text-sm font-[1000] text-white uppercase tracking-wider">Cache Purge</span>
                    </div>
                    <button 
                        onClick={() => {
                            if(window.confirm('Are you sure you want to clear system cache? This will reset local data.')) {
                                localStorage.clear();
                                sessionStorage.clear();
                                window.location.reload();
                            }
                        }}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/30"
                    >
                        Execute
                    </button>
                </Card>
              </Section>

              {/* Theme Selection */}
              <Section delay={0.2}>
                <SectionLabel icon={<Moon size={14} />} label={t('theme')} />
                <div className="grid grid-cols-4 gap-3">
                   {APP_THEMES.map((th, i) => {
                     const active = theme === th.id;
                     return (
                       <button
                         key={th.id}
                         onClick={() => handleThemeChange(th.id)}
                         className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-300 ${
                           active ? 'bg-main-text/10' : 'bg-main-text/5 hover:bg-main-text/[0.08]'
                         }`}
                         style={{ borderColor: active ? accentColor : 'transparent' }}
                       >
                         <div 
                           className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-main-text/10"
                           style={{ backgroundColor: th.color }}
                         >
                           {th.icon}
                         </div>
                         <span className="text-[8px] font-black uppercase text-gray-400 group-hover:text-white transition-colors">
                           {th.name.split(' ')[0]}
                         </span>
                         {active && (
                           <motion.div layoutId="themeHighlight" className="absolute -inset-1 border-2 rounded-[2rem]" style={{ borderColor: accentColor }} />
                         )}
                       </button>
                     );
                   })}
                </div>
              </Section>

              {/* Performance / 60 FPS */}
              <Section delay={0.3}>
                <SectionLabel icon={<Zap size={14} />} label="Hardware Acceleration" />
                <Card className="p-6" glow={isPerformanceMode ? '#34c759' : undefined}>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isPerformanceMode ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-gray-500'}`}>
                           <Zap size={22} fill={isPerformanceMode ? 'currentColor' : 'none'} />
                        </div>
                        <div>
                          <h3 className="text-[11px] font-black text-white uppercase tracking-widest">{(language === 'ku' || language === 'badini') ? 'مۆدی ٦٠ FPS' : '60 FPS Turbo Mode'}</h3>
                          <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">Suppress Blurs & Effects</p>
                        </div>
                      </div>
                      <AnimatedToggle 
                        checked={isPerformanceMode} 
                        onChange={togglePerformance} 
                        color="#34c759"
                        language={language}
                      />
                   </div>
                   {isPerformanceMode && (
                     <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-3"
                     >
                        {['Blurs Disabled', 'Shadows Removed', 'Particles Limited', 'GPU Optimized'].map(feat => (
                          <div key={feat} className="flex items-center gap-2">
                             <div className="w-1 h-1 rounded-full bg-green-500" />
                             <span className="text-[8px] font-bold text-gray-500 uppercase">{feat}</span>
                          </div>
                        ))}
                     </motion.div>
                   )}
                </Card>
              </Section>

              {/* System Updates Section */}
              <Section delay={0.35}>
                <SectionLabel icon={<RefreshCw size={14} className={checkingUpdate ? 'animate-spin' : ''} />} label={t('systemUpdate')} />
                <Card className="p-6" glow={updateResult?.updateAvailable ? accentColor : undefined}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            updateResult?.updateAvailable 
                              ? 'animate-pulse' 
                              : 'bg-white/5 text-gray-500'
                          }`}
                          style={updateResult?.updateAvailable ? { color: accentColor, backgroundColor: `${accentColor}20` } : {}}
                        >
                          <RefreshCw size={22} className={checkingUpdate ? 'animate-spin' : ''} />
                        </div>
                        <div>
                          <h3 className="text-[11px] font-black text-white uppercase tracking-widest">
                            {t('systemUpdate')}
                          </h3>
                          <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">
                            {checkingUpdate 
                              ? t('checkingUpdates') 
                              : updateResult 
                              ? (updateResult.updateAvailable ? t('updateAvailable') : t('upToDate'))
                              : ((language === 'ku' || language === 'badini') ? 'پشکنین بکە بۆ نوێترین وەشان' : 'Check for the latest version')}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleCheckForUpdates}
                        disabled={checkingUpdate}
                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black text-white uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                      >
                        {checkingUpdate && <RefreshCw size={10} className="animate-spin" />}
                        {t('checkUpdates')}
                      </button>
                    </div>

                    {/* Show results if checked */}
                    {updateResult && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="border-t border-white/5 pt-4 mt-2 space-y-4"
                      >
                        {updateResult.updateAvailable ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Version Status</span>
                                <div className="flex items-center gap-1.5 font-mono text-xs font-black">
                                  <span className="text-gray-400">{updateResult.currentVersion}</span>
                                  <span className="text-gray-600">→</span>
                                  <span style={{ color: accentColor }}>{updateResult.latestVersion}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Platform</span>
                                <span className="text-[9px] font-extrabold text-white uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md">
                                  {updateResult.platform}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                {(language === 'ku' || language === 'badini') ? 'چی نوێیە لەم وەشانەدا:' : "What's new in this version:"}
                              </span>
                              <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl max-h-[120px] overflow-y-auto space-y-1.5 scrollbar-hide">
                                {updateResult.changelog.length > 0 ? (
                                  updateResult.changelog.map((log, index) => (
                                    <div key={index} className="flex items-start gap-2 text-[10px] text-gray-400 font-medium">
                                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: accentColor }} />
                                      <p className="leading-relaxed">{log}</p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">
                                    {(language === 'ku' || language === 'badini') ? 'زانیاری نوێکاری بەردەست نییە' : 'No changelog provided.'}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={handleExecuteUpdate}
                              className="w-full py-4 rounded-[1.8rem] text-[10px] font-[1000] text-white uppercase tracking-[0.3em] flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                              style={{ backgroundColor: accentColor }}
                            >
                              <Download size={14} className="stroke-[2.5]" />
                              {t('updateNow')}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 p-4 rounded-2xl text-green-500">
                            <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                              <Check size={16} strokeWidth={3} />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-black uppercase tracking-wider">{t('upToDate')}</span>
                              <span className="text-[9px] font-bold text-green-500/70 uppercase">Version {updateResult.currentVersion} • Verified Secure</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {updateError && (
                      <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500">
                        <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <Activity size={16} className="stroke-[2.5]" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider">Update Failed</span>
                          <span className="text-[9px] font-bold text-red-500/70 uppercase">{updateError}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </Section>

              {/* Global Display Scaling */}
              <Section delay={0.4}>
                <SectionLabel icon={<Maximize2 size={14} />} label="Interface Intensity & Scale" />
                <Card className="p-6 bg-gradient-to-br from-white/[0.03] to-transparent border-white/10 shadow-2xl">
                   {/* Ergonomic Mobile Header */}
                   <div className="flex flex-col gap-6 mb-10">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[1.8rem] bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shadow-[0_0_30px_rgba(229,9,20,0.15)]">
                               <Monitor size={26} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                               <span className="text-4xl font-[1000] text-white tracking-[calc(-0.06em)] italic font-mono leading-none">{scalePercent}%</span>
                               <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mt-2">DENSITY_RATIO</span>
                            </div>
                         </div>
                         <button 
                            onClick={() => setScale(1)}
                            className="h-10 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black text-white uppercase tracking-[0.2em] transition-all active:scale-95"
                         >
                            Reset
                         </button>
                      </div>

                      {/* Large Precision Buttons for Mobile */}
                      <div className="grid grid-cols-2 gap-3">
                         <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setScale(Math.max(0.4, (scale || 1) - 0.05))}
                            className="flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all font-black uppercase tracking-widest text-[10px]"
                         >
                            <Minimize2 size={18} /> COLDERING
                         </motion.button>
                         <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setScale(Math.min(1.5, (scale || 1) + 0.05))}
                            className="flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all font-black uppercase tracking-widest text-[10px]"
                         >
                            <Maximize2 size={18} /> EXPANDING
                         </motion.button>
                      </div>
                   </div>

                   <div className="px-1">
                      <div className="relative h-12 flex items-center group">
                        {/* Background Track */}
                        <div className="absolute inset-0 bg-white/5 h-2 top-1/2 -translate-y-1/2 rounded-full overflow-hidden">
                           <motion.div 
                             initial={false}
                             animate={{ width: `${((scale - 0.4) / (1.5 - 0.4)) * 100}%` }}
                             className="h-full shadow-[0_0_20px_brand]"
                             style={{ backgroundColor: accentColor }}
                           />
                        </div>
                        {/* Interactive Slider */}
                        <input 
                          type="range"
                          min="40" max="150" step="1"
                          value={scalePercent}
                          onChange={(e) => setScale(Number(e.target.value) / 100)}
                          className="absolute w-full appearance-none bg-transparent cursor-pointer z-10 h-full"
                          style={{ 
                            WebkitAppearance: 'none',
                          }}
                        />
                      </div>
                      <style>{`
                        input[type=range]::-webkit-slider-thumb {
                          -webkit-appearance: none;
                          height: 32px;
                          width: 32px;
                          border-radius: 50%;
                          background: #fff;
                          cursor: pointer;
                          border: 6px solid ${accentColor};
                          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
                          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                        }
                        input[type=range]::-webkit-slider-thumb:hover {
                          transform: scale(1.1);
                        }
                        input[type=range]::-webkit-slider-thumb:active {
                          transform: scale(1.2);
                          box-shadow: 0 0 50px ${accentColor}88;
                        }
                      `}</style>
                      <div className="flex justify-between mt-6 px-1">
                        <div className="flex flex-col items-start gap-1.5 opacity-40">
                           <span className="text-[9px] font-black text-main-text uppercase tracking-[0.2em]">Minimalist</span>
                           <div className="w-8 h-1 bg-main-text/10 rounded-full" />
                        </div>
                        <div className="flex flex-col items-end gap-1.5 opacity-40">
                           <span className="text-[9px] font-black text-main-text uppercase tracking-[0.2em]">Cinematic</span>
                           <div className="w-8 h-1 bg-main-text/10 rounded-full" />
                        </div>
                      </div>
                   </div>
                </Card>
              </Section>

              {/* FLKRD Native Ecosystem Downloads Section */}
              <Section delay={0.45}>
                <SectionLabel 
                  icon={
                    detectedPlatform === 'ios' ? <Apple size={14} /> :
                    detectedPlatform === 'android' ? <Smartphone size={14} /> :
                    detectedPlatform === 'macos' ? <Laptop size={14} /> :
                    detectedPlatform === 'windows' ? <Monitor size={14} /> :
                    <Download size={14} />
                  } 
                  label={(language === 'ku' || language === 'badini') ? 'پاکێجەکانی فڵکرد' : 'FLKRD Native Ecosystem'} 
                />
                <Card className="p-6">
                  <div className="flex flex-col gap-5">
                    {/* Platform Grid */}
                    <div className="grid grid-cols-1 gap-5">
                      {/* iOS WebClip Card */}
                      {((detectedPlatform === 'ios' && !showAllPlatforms) || detectedPlatform === 'web' || showAllPlatforms) && (
                        <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10" style={{ boxShadow: detectedPlatform === 'ios' ? `0 0 15px ${accentColor}33` : 'none' }}>
                                <Apple size={20} className="text-white" />
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black text-white uppercase tracking-wider">FLKRD Movies .webclip</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-white/10 text-white tracking-wide uppercase">v5.5.1.25</span>
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 tracking-wide uppercase">iOS 15 - 26+</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">WebClip</span>
                          </div>
                          <p className="text-[9.5px] text-gray-400 font-medium leading-relaxed">
                            Installs a verified premium WebClip profile config. Unlocks full standalone experience, locked 60+ FPS playback speed, and persistent real-time notifications.
                          </p>
                          <a
                            href="/webclip.mobileconfig"
                            className="w-full py-3.5 rounded-xl text-[9px] font-black text-white uppercase tracking-widest text-center transition-all hover:scale-[1.02] active:scale-95 shadow-md flex items-center justify-center gap-2"
                            style={{ backgroundColor: accentColor }}
                          >
                            <Download size={12} strokeWidth={2.5} />
                            Install FLKRD Movies WebClip
                          </a>
                        </div>
                      )}

                      {/* Android APK Card */}
                      {((detectedPlatform === 'android' && !showAllPlatforms) || detectedPlatform === 'web' || showAllPlatforms) && (
                        <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all relative overflow-hidden">
                          {/* NEW Badge */}
                          <div className="absolute top-3 right-3 z-10">
                            <span className="text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest" style={{ backgroundColor: accentColor, color: '#fff', boxShadow: `0 0 12px ${accentColor}66` }}>NEW</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10" style={{ boxShadow: detectedPlatform === 'android' ? `0 0 15px ${accentColor}33` : 'none' }}>
                                <Smartphone size={20} className="text-white" />
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black text-white uppercase tracking-wider">Android Universal Package</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-white/10 text-white tracking-wide uppercase">v5.5.1.25</span>
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 tracking-wide uppercase">Universal APK</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">Verified</span>
                          </div>
                          <p className="text-[9.5px] text-gray-400 font-medium leading-relaxed">
                            Universal Android build signed and production ready. Built-in high-performance rendering pipelines and native video player support.
                          </p>
                          <a
                            href={androidDownloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => handleDownloadClick(e, androidDownloadUrl)}
                            className="w-full py-3.5 rounded-xl text-[9px] font-black text-white uppercase tracking-widest text-center transition-all hover:scale-[1.02] active:scale-95 shadow-md flex items-center justify-center gap-2"
                            style={{ backgroundColor: accentColor }}
                          >
                            <Download size={12} strokeWidth={2.5} />
                            Download Android APK
                          </a>
                        </div>
                      )}

                      {/* macOS DMG Card */}
                      {((detectedPlatform === 'macos' && !showAllPlatforms) || detectedPlatform === 'web' || showAllPlatforms) && (
                        <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all relative overflow-hidden">
                          {/* NEW Badge */}
                          <div className="absolute top-3 right-3 z-10">
                            <span className="text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest" style={{ backgroundColor: accentColor, color: '#fff', boxShadow: `0 0 12px ${accentColor}66` }}>NEW</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10" style={{ boxShadow: detectedPlatform === 'macos' ? `0 0 15px ${accentColor}33` : 'none' }}>
                                <Laptop size={20} className="text-white" />
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black text-white uppercase tracking-wider">macOS Native App</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-white/10 text-white tracking-wide uppercase">v5.5.1.25</span>
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 tracking-wide uppercase">Apple Silicon & Intel</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-[7.5px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">DMG Bundle</span>
                          </div>
                          <p className="text-[9.5px] text-gray-400 font-medium leading-relaxed">
                            Native macOS package powered by Tauri. Premium hardware-accelerated video, glassmorphic UI, and native macOS window controls.
                          </p>
                          <a
                            href={macDownloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsMacTutorialOpen(true);
                              setMacTutorialStep(1);

                              // Programmatically trigger immediate download in the background
                              if (isTauri()) {
                                tauriService.openExternal(macDownloadUrl);
                              } else {
                                const link = document.createElement('a');
                                link.href = macDownloadUrl;
                                link.target = '_blank';
                                link.rel = 'noopener noreferrer';
                                link.click();
                              }

                              // Premium bilingual toast feedback to announce the background download action
                              addNotification({
                                type: 'success',
                                title: (language === 'ku' || language === 'badini') ? 'دابەزاندنی خۆکار دەستیپێکرد' : 'Automatic Download Started',
                                message: (language === 'ku' || language === 'badini')
                                  ? 'فایلی ئەپی مەک بە شێوەیەکی خۆکارانە لە باکگراونددا دەستی بە دابەزاندن کرد. ئێستا دەتوانیت بینەری ڕێنماییەکان بیت بۆ چۆنیەتی دامەزراندن و چارەسەرکردنی کێشە ئەمنییەکانی مەک.'
                                  : 'The macOS app DMG has started downloading automatically in the background. You can now read the instructions to install and bypass macOS gatekeeper warnings.'
                              });
                            }}
                            className="w-full py-3.5 rounded-xl text-[9px] font-black text-white uppercase tracking-widest text-center transition-all hover:scale-[1.02] active:scale-95 shadow-md flex items-center justify-center gap-2"
                            style={{ backgroundColor: accentColor }}
                          >
                            <Download size={12} strokeWidth={2.5} />
                            Download macOS DMG
                          </a>
                        </div>
                      )}

                      {/* Windows Coming Soon Card */}
                      {((detectedPlatform === 'windows' && !showAllPlatforms) || detectedPlatform === 'web' || showAllPlatforms) && (
                        <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.01] border border-white/5 opacity-70 select-none">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                <Monitor size={20} className="text-white opacity-40" />
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black text-white/50 uppercase tracking-wider">Windows Desktop</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-white/10 text-white/30 tracking-wide uppercase">v5.5.1.25</span>
                                  <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500/70 tracking-wide uppercase">Coming Soon</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-[7.5px] font-bold text-gray-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">Teaser</span>
                          </div>
                          <p className="text-[9.5px] text-gray-500 font-medium leading-relaxed">
                            Windows native app package optimized with custom DirectX rendering support. Undergoing final performance benchmarking.
                          </p>
                          <button
                            disabled
                            className="w-full py-3.5 rounded-xl text-[9px] font-black text-white/30 bg-white/5 uppercase tracking-widest text-center cursor-not-allowed border border-white/5 flex items-center justify-center gap-2"
                          >
                            Coming Soon
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Escape Hatch Button */}
                    {detectedPlatform !== 'web' && (
                      <div className="flex justify-center border-t border-white/5 pt-4">
                        <button
                          onClick={() => setShowAllPlatforms(!showAllPlatforms)}
                          className="text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5"
                        >
                          {showAllPlatforms 
                            ? ((language === 'ku' || language === 'badini') ? 'پیشاندانی تەنها وەشانی من' : 'Show only my platform') 
                            : ((language === 'ku' || language === 'badini') ? 'پیشاندانی هەموو وەشانەکان' : 'Looking for another device? Show all platforms')}
                          <ArrowUpRight size={10} className="stroke-[2.5]" />
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              </Section>

              {/* Accent Color */}
              <Section delay={0.5}>
                <SectionLabel icon={<Palette size={14} />} label="Neural Theme Core" />
                <div className="grid grid-cols-4 gap-3">
                   {APP_COLORS.map(c => {
                     const active = accentColor === c.value;
                     return (
                       <button
                         key={c.value}
                         onClick={() => handleColorChange(c.value)}
                         className={`group relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                           active ? 'bg-main-text/10 border-main-text/20' : 'bg-main-text/5 border-transparent hover:bg-main-text/10'
                         }`}
                       >
                         <div 
                           className="w-8 h-8 rounded-xl shadow-lg flex items-center justify-center"
                           style={{ backgroundColor: c.value, boxShadow: active ? `0 0 20px ${c.value}44` : 'none' }}
                         >
                            {active && <Check size={14} color={c.value === '#ffffff' ? '#000' : '#fff'} strokeWidth={4} />}
                         </div>
                         <span className="text-[8px] font-black uppercase text-gray-500 group-hover:text-gray-300 truncate w-full px-1">
                           {c.name.split(' ')[0]}
                         </span>
                       </button>
                     );
                   })}
                </div>
              </Section>

              {/* Resources & Legal Hub Section */}
              <Section delay={0.55}>
                <SectionLabel icon={<BookOpen size={14} />} label={language === 'ku' || language === 'badini' ? 'سەرچاوەکان و بەشە یاساییەکان' : 'Resources & Documentation'} />
                <Card className="p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <a 
                      href="/#/doc?tab=flow" 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Layers size={14} style={{ color: accentColor }} />
                        <span className="text-[9px] font-black uppercase text-white tracking-wider">
                          {language === 'ku' ? 'نەخشەی ڕێڕەو' : language === 'badini' ? 'نەخشێ ڕێڕەوی' : 'System Flow Map'}
                        </span>
                      </div>
                      <ArrowUpRight size={10} className="text-gray-500" />
                    </a>

                    <a 
                      href="/#/doc?tab=tutorials" 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <HelpCircle size={14} style={{ color: accentColor }} />
                        <span className="text-[9px] font-black uppercase text-white tracking-wider">
                          {language === 'ku' ? 'فێرکارییەکان' : language === 'badini' ? 'فێرکاریێن تەکنیکی' : 'System Tutorials'}
                        </span>
                      </div>
                      <ArrowUpRight size={10} className="text-gray-500" />
                    </a>

                    <a 
                      href="/#/doc?tab=terms" 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText size={14} style={{ color: accentColor }} />
                        <span className="text-[9px] font-black uppercase text-white tracking-wider">
                          {language === 'ku' ? 'مەرجەکان' : language === 'badini' ? 'مەرجێن بکارئینانێ' : 'Terms of Service'}
                        </span>
                      </div>
                      <ArrowUpRight size={10} className="text-gray-500" />
                    </a>

                    <a 
                      href="/#/doc?tab=license" 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck size={14} style={{ color: accentColor }} />
                        <span className="text-[9px] font-black uppercase text-white tracking-wider">
                          {language === 'ku' ? 'مۆڵەت و DMCA' : language === 'badini' ? 'مۆڵەت و DMCA' : 'Licenses & DMCA'}
                        </span>
                      </div>
                      <ArrowUpRight size={10} className="text-gray-500" />
                    </a>
                  </div>
                </Card>
              </Section>

            </div>

            {/* Footer */}
            <div className="p-8 bg-white/[0.02] border-t border-white/[0.08]">
              <LiquidButton
                variant="default"
                onClick={onClose}
                className="w-full py-5 rounded-[2rem] text-[10px] font-black text-white uppercase tracking-[0.4em] shadow-xl flex items-center justify-center gap-3"
                style={{ backgroundColor: accentColor }}
              >
                <Activity size={14} className="stroke-[3]" />
                Synchronize Changes
              </LiquidButton>
              <p className="text-[8px] text-center text-gray-600 font-extrabold uppercase tracking-[0.1em] mt-5">
                FLKRD Cinematic Engine © 2026 • Verified v5.5.1.25
              </p>
              <div className="flex items-center justify-center gap-3 mt-4 text-[7.5px] font-black uppercase tracking-[0.2em] text-gray-500">
                <a href="/#/doc?tab=terms" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Terms</a>
                <span>•</span>
                <a href="/#/doc?tab=privacy" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Privacy</a>
                <span>•</span>
                <a href="/#/doc?tab=license" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">DMCA</a>
                <span>•</span>
                <a href="/#/doc?tab=flow" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Ecosystem Map</a>
              </div>
            </div>

            </div> {/* End of sharp content container */}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    
    {/* macOS Installation Guide Tutorial Modal */}
    <AnimatePresence>
      {isMacTutorialOpen && (
        <Portal id="macos-tutorial-portal">
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop with premium glassmorphism blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMacTutorialOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-[16px] z-0"
              style={{ pointerEvents: 'auto' }}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-[#080808]/95 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden z-10 p-6 md:p-8 flex flex-col gap-5"
              style={{ pointerEvents: 'auto' }}
            >
              {/* Top premium breathing gradient glow bar */}
              <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: accentColor, boxShadow: `0 0 20px ${accentColor}` }} />

              {/* Title Header with Close */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Laptop className="text-white animate-pulse" size={20} />
                  </div>
                  <div>
                    <h3 className="text-[11px] md:text-xs font-black text-white uppercase tracking-wider">
                      {(language === 'ku' || language === 'badini') ? 'ڕێنمایی دامەزراندنی فەرمی مەکینتۆش' : 'macOS Safe Installation Guide'}
                    </h3>
                    <p className="text-[8px] text-gray-500 font-extrabold uppercase tracking-widest mt-0.5">
                      Bypass macOS Gatekeeper Warning Safely
                    </p>
                  </div>
                </div>
                
                {/* Step Indicators */}
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-3.5 py-1.5 rounded-full scale-90 md:scale-100">
                  {[1, 2, 3, 4].map(s => (
                    <div 
                      key={s} 
                      className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: macTutorialStep === s ? accentColor : 'rgba(255,255,255,0.15)',
                        boxShadow: macTutorialStep === s ? `0 0 8px ${accentColor}` : 'none',
                        transform: macTutorialStep === s ? 'scale(1.25)' : 'scale(1)'
                      }}
                    />
                  ))}
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider ml-1.5">
                    Step {macTutorialStep} of 4
                  </span>
                </div>
              </div>

              {/* Content rendering based on step */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={macTutorialStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-4"
                >
                  {macTutorialStep === 1 && (
                    <div className="flex flex-col gap-4">
                      {/* Screenshot 1 */}
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/60 flex items-center justify-center">
                        <img 
                          src={warningImage1} 
                          alt="macOS Gatekeeper Warning" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2.5 text-right" dir="rtl">
                        <h4 className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                          کێشەی یەکەم: هۆشداری تێکچوونی فایل (Damaged App)
                        </h4>
                        <p className="text-[9.5px] text-gray-400 font-semibold leading-relaxed">
                          کاتێک فایلی ئەپەکە لە وێبگەڕەکەتەوە دادەبەزێنیت، سیستمی مەک خۆکارانە نیشانەیەکی ئەمنی دەخاتە سەر فایلەکە بە ناوی <strong className="text-white">Quarantine (کەرەنتینە)</strong>. لەبەر ئەوەی ئەپەکە مۆڵەتی فەرمی ساڵانەی ئەپڵی (٩٩ دۆلار) لەسەر نییە، مەکینتۆش پەیامێکی ترسناک نیشان دەدات کە دەڵێت ئەپەکە تێکچووە (Damaged). بەڵام لە ڕاستیدا ئەپەکە ١٠٠٪ سەلامەت و کارایە!
                        </p>
                      </div>
                    </div>
                  )}

                  {macTutorialStep === 2 && (
                    <div className="flex flex-col gap-4">
                      {/* Step 2 terminal execution helper */}
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
                        <h5 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                          چارەسەری خێرا لە ڕێگەی فەرمانی تێرمیناڵ (Terminal)
                        </h5>
                        <ol className="text-[9.5px] text-gray-400 font-semibold space-y-2 text-right" dir="rtl">
                          <li className="flex items-start gap-2 justify-start">
                            <span>1. سەرەتا ئەپەکە لە ناو DMGـەکە ڕابکێشە بۆ ناو فۆڵدەری <strong>Applications</strong> (بەرنامەکان) لەسەر مەکەکەت.</span>
                          </li>
                          <li className="flex items-start gap-2 justify-start">
                            <span>2. ئەپی <strong>Terminal</strong> لەسەر مەکەکەت بکەرەوە (لە Spotlight لێبدە Terminal).</span>
                          </li>
                          <li className="flex items-start gap-2 justify-start">
                            <span>3. ئەم فەرمانەی خوارەوە بە تەواوی کۆپی بکە و پاشان لەناو Terminal دایبنێ (Paste) و کلیلی Enter لێبدە:</span>
                          </li>
                        </ol>
                      </div>

                      {/* Copyable Terminal Command Widget */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">
                          Bypass Command (Terminal):
                        </span>
                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl p-4 gap-3 relative group hover:border-white/10 transition-all">
                          <code className="text-[10px] font-mono text-gray-300 select-all tracking-tight break-all">
                            xattr -cr /Applications/flkrd-movies.app
                          </code>
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText('xattr -cr /Applications/flkrd-movies.app');
                                setCopiedCommand(true);
                                setTimeout(() => setCopiedCommand(false), 2000);
                                addNotification({
                                  type: 'success',
                                  title: 'Command Copied',
                                  message: 'Terminal bypass command successfully copied to clipboard.'
                                });
                              } catch (e) {
                                console.error('Clipboard copy failed:', e);
                              }
                            }}
                            className="flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black text-white uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                            style={{ backgroundColor: copiedCommand ? '#34c759' : accentColor }}
                          >
                            {copiedCommand ? <Check size={10} className="stroke-[3]" /> : <Copy size={10} className="stroke-[3]" />}
                            {copiedCommand ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {macTutorialStep === 3 && (
                    <div className="flex flex-col gap-4">
                      {/* Screenshot 2 */}
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/60 flex items-center justify-center">
                        <img 
                          src={warningImage2} 
                          alt="macOS DMG Eject Warning" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2.5 text-right" dir="rtl">
                        <h4 className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                          کێشەی دووەم: کێشەی نەتوانینی eject-کردنی دیسک (DMG)
                        </h4>
                        <p className="text-[9.5px] text-gray-400 font-semibold leading-relaxed">
                          ئەگەر لە کاتی بەستن یان سڕینەوەی فایلی دابەزێنراو پەیامی "could not be ejected" هات، بەو هۆیەوەیە کە ئەپی فیلمەکە لەناو باکگراونددا کراوەتەوە و ڕاستەوخۆ لە ناو دیسکەکەوە (DMG) کار دەکات. چارەسەرەکەی سادەیە: ئەپەکە بە تەواوی دابخە (کلیلەکانی <span className="text-white font-black">Cmd + Q</span> دابگرە لەناو ئەپەکە)، پاشان Eject بکە و فایلەکە بسڕەوە!
                        </p>
                      </div>
                    </div>
                  )}

                  {macTutorialStep === 4 && (
                    <div className="flex flex-col gap-4">
                      {/* Embedded Vimeo Player */}
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                        <iframe 
                          src="https://player.vimeo.com/video/1195564555?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479&amp;autoplay=1&amp;loop=1" 
                          frameBorder="0" 
                          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" 
                          referrerPolicy="strict-origin-when-cross-origin" 
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                          title="toturials for install fkurd movies on mac safe ly"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2.5 text-right" dir="rtl">
                        <h4 className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                          بینینی فێرکاری تەواو بە ڤیدیۆی کوالیتی بەرز
                        </h4>
                        <p className="text-[9.5px] text-gray-400 font-semibold leading-relaxed">
                          دەتوانیت بینەری ئەم ڤیدیۆ فێرکارییە بیت بۆ بینینی هەنگاوەکان بە شێوازی پراکتیکی لەسەر شاشەی مەکینتۆش. دوای سەیرکردن، دەتوانیت لە خوارەوە ڕاستەوخۆ کرتە لەسەر دوگمەی دابەزاندن بکەیت بۆ بەدەستهێنانی نوێترین وەشانی ئەپەکە!
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                <button
                  onClick={() => {
                    if (macTutorialStep > 1) {
                      setMacTutorialStep(macTutorialStep - 1);
                    } else {
                      setIsMacTutorialOpen(false);
                    }
                  }}
                  className="px-6 py-3 rounded-xl text-[9px] font-black text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 uppercase tracking-widest transition-all active:scale-95"
                >
                  {macTutorialStep === 1 ? 'Cancel' : 'Back'}
                </button>
                
                {macTutorialStep < 4 ? (
                  <button
                    onClick={() => setMacTutorialStep(macTutorialStep + 1)}
                    className="px-8 py-3 rounded-xl text-[9px] font-black text-white uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-md"
                    style={{ backgroundColor: accentColor }}
                  >
                    Next Step
                  </button>
                ) : (
                  <a
                    href={macDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      setIsMacTutorialOpen(false);
                      handleDownloadClick(e, macDownloadUrl);
                    }}
                    className="px-8 py-3 rounded-xl text-[9px] font-black text-white uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg flex items-center justify-center gap-2"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Download size={12} strokeWidth={2.5} />
                    Download DMG
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>

    <EnableNotificationsModal 
      isOpen={isEnableNotificationsModalOpen} 
      onClose={() => setIsEnableNotificationsModalOpen(false)} 
    />
    </div>
    </Portal>
  );
};

export default SettingsModal;