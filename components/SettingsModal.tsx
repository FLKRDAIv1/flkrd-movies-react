import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Languages, Bell, Check, Palette, Sparkles, Moon, Sun,
  Maximize2, Minimize2, Type, Zap, Info, Monitor, Gauge,
  ChevronRight, Activity, Cpu
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import EnableNotificationsModal from './EnableNotificationsModal';

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
  const isRTL = language === 'ku';
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
    <div className="flex-1 h-[1px] bg-gradient-to-r from-white/5 to-transparent" />
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string; glow?: string }> = ({ children, className = '', glow }) => (
  <div 
    className={`relative rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md overflow-hidden transition-all duration-500 ${className}`}
    style={glow ? { boxShadow: `0 0 40px ${glow}11`, borderColor: `${glow}33` } : {}}
  >
    {children}
  </div>
);

/* ─── Main Component ────────────────────────── */

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useTranslation();
  const { 
    theme, setTheme, 
    accentColor, setAccentColor, 
    scale, setScale, 
    isPerformanceMode, setIsPerformanceMode 
  } = useUI();
  const { addNotification } = useNotification();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnableNotificationsModalOpen, setIsEnableNotificationsModalOpen] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);

  // Performance monitoring logic
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setSessionTime(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

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
        ? (language === 'ku' ? 'دۆخی خێرا چالاک کرا' : 'Visual suppression active for maximum performance.')
        : (language === 'ku' ? 'دۆخی ئاسایی گەڕێندرایەوە' : 'Full visual fidelity restored.')
    });
  };

  const scalePercent = Math.round((scale || 1) * 100);

  return (
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
            className="relative w-full max-w-lg bg-[#0a0a0a] rounded-[2.5rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glass Highlight Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.03] to-transparent" />
            
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
                  <h2 className="text-lg font-[1000] text-white uppercase italic tracking-tighter leading-none">
                    {t('designSettings')}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">FLKRD CORE 3.0</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FPSCounter active={true} />
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90"
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
                           active ? 'bg-white/10' : 'bg-white/5 hover:bg-white/[0.08]'
                         }`}
                         style={{ borderColor: active ? accentColor : 'transparent' }}
                       >
                         <div 
                           className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white/10"
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
                          <h3 className="text-[11px] font-black text-white uppercase tracking-widest">{language === 'ku' ? 'مۆدی ٦٠ FPS' : '60 FPS Turbo Mode'}</h3>
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

              {/* Global Display Scaling */}
              <Section delay={0.4}>
                <SectionLabel icon={<Maximize2 size={14} />} label="Interface Intensity & Scale" />
                <Card className="p-6 bg-gradient-to-br from-white/[0.03] to-transparent border-white/10 shadow-2xl">
                   <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 rounded-[1.5rem] bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shadow-[0_0_20px_rgba(229,9,20,0.1)]">
                            <Monitor size={24} strokeWidth={2.5} />
                         </div>
                         <div>
                            <span className="text-3xl font-[1000] text-white tracking-tighter italic font-mono">{scalePercent}%</span>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mt-1">Global Render Density</p>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/5">
                         <button 
                            onClick={() => setScale(Math.max(0.4, (scale || 1) - 0.05))}
                            className="w-11 h-11 rounded-xl bg-white/5 hover:bg-brand hover:text-white border border-white/5 flex items-center justify-center text-gray-400 transition-all active:scale-90 shadow-lg"
                            title="Decrease Size"
                         >
                            <Minimize2 size={18} />
                         </button>
                         <button 
                            onClick={() => setScale(1)}
                            className="px-6 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-black text-white uppercase tracking-widest transition-all"
                         >
                            Reset
                         </button>
                         <button 
                            onClick={() => setScale(Math.min(1.5, (scale || 1) + 0.05))}
                            className="w-11 h-11 rounded-xl bg-white/5 hover:bg-brand hover:text-white border border-white/5 flex items-center justify-center text-gray-400 transition-all active:scale-90 shadow-lg"
                            title="Increase Size"
                         >
                            <Maximize2 size={18} />
                         </button>
                      </div>
                   </div>

                   <div className="px-2">
                      <div className="relative h-10 flex items-center group">
                        <div className="absolute inset-0 bg-white/5 h-1.5 top-1/2 -translate-y-1/2 rounded-full overflow-hidden">
                           <motion.div 
                             initial={false}
                             animate={{ width: `${((scale - 0.4) / (1.5 - 0.4)) * 100}%` }}
                             className="h-full shadow-[0_0_15px_brand]"
                             style={{ backgroundColor: accentColor }}
                           />
                        </div>
                        <input 
                          type="range"
                          min="40" max="150" step="1"
                          value={scalePercent}
                          onChange={(e) => setScale(Number(e.target.value) / 100)}
                          className="absolute w-full appearance-none bg-transparent cursor-pointer z-10"
                          style={{ 
                            WebkitAppearance: 'none',
                          }}
                        />
                      </div>
                      <style>{`
                        input[type=range]::-webkit-slider-thumb {
                          -webkit-appearance: none;
                          height: 24px;
                          width: 24px;
                          border-radius: 50%;
                          background: #fff;
                          cursor: pointer;
                          border: 5px solid ${accentColor};
                          box-shadow: 0 0 20px rgba(0,0,0,0.5);
                          transition: all 0.2s ease;
                        }
                        input[type=range]::-webkit-slider-thumb:hover {
                          transform: scale(1.15);
                          box-shadow: 0 0 30px ${accentColor}66;
                        }
                      `}</style>
                      <div className="flex justify-between mt-4">
                        <div className="flex flex-col items-start gap-1">
                           <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Minimalist</span>
                           <span className="text-[10px] font-bold text-gray-400">40%</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                           <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Broadcast</span>
                           <span className="text-[10px] font-bold text-gray-400">150%</span>
                        </div>
                      </div>
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
                           active ? 'bg-white/10 border-white/20' : 'bg-white/5 border-transparent hover:bg-white/10'
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

            </div>

            {/* Footer */}
            <div className="p-8 bg-white/[0.02] border-t border-white/[0.08]">
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-5 rounded-[2rem] text-[10px] font-black text-white uppercase tracking-[0.4em] shadow-xl relative overflow-hidden group"
                style={{ backgroundColor: accentColor }}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <span className="relative flex items-center justify-center gap-3">
                  <Activity size={14} className="stroke-[3]" />
                  Synchronize Changes
                </span>
              </motion.button>
              <p className="text-[8px] text-center text-gray-600 font-extrabold uppercase tracking-[0.1em] mt-5">
                FLKRD Cinematic Engine © 2026 • Verified v3.4.1
              </p>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
    <EnableNotificationsModal 
      isOpen={isEnableNotificationsModalOpen} 
      onClose={() => setIsEnableNotificationsModalOpen(false)} 
    />
    </div>
  );
};

export default SettingsModal;