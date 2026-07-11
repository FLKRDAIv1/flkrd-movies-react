/**
 * SubtitleManagerPanel.tsx
 * Premium CC & Subtitle Manager overlay panel.
 * Framer Motion animations, glassmorphism design, Kurdish Sorani UI.
 */

import React, { useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  X,
  Subtitles,
  Mic2,
  Sliders,
  ShieldCheck,
  Upload,
  Search,
  Minus,
  Plus,
  Languages,
  ArrowRight,
  Sparkles,
  Activity,
  Sun,
  Globe,
  Tv,
  Grid,
  List,
  Keyboard,
  Play,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type SubStudioTab = 'sub' | 'dub' | 'lighting' | 'shortcuts';

interface SubtitleTrack {
  id: string | number;
  attributes?: {
    display_name?: string;
    language?: string;
  };
}

interface SubtitleManagerPanelProps {
  // Visibility
  isOpen: boolean;
  onClose: () => void;

  // Tabs
  activeTab: SubStudioTab;
  setActiveTab: (tab: SubStudioTab) => void;

  // Admin
  isAdmin?: boolean;
  isUploadingSub?: boolean;
  uploadStatus?: { type: 'success' | 'error'; message: string } | null;
  onUploadClick?: () => void;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Typography
  subtitleSize: number;
  setSubtitleSize: (v: number) => void;
  subtitleColor: string;
  setSubtitleColor: (c: string) => void;

  // Display toggles
  subBgOpacity: number;
  setSubBgOpacity: (v: number) => void;
  subBlur: boolean;
  setSubBlur: (v: boolean) => void;
  showSubBackground: boolean;
  setShowSubBackground: (v: boolean) => void;

  // Video adjusters
  brightness: number;
  setBrightness: (v: number) => void;
  contrast: number;
  setContrast: (v: number) => void;
  saturation: number;
  setSaturation: (v: number) => void;
  onResetFilters: () => void;

  // Sync
  subtitleOffset: number;
  setSubtitleOffset: (v: number) => void;

  // Search & list
  subSearchQuery: string;
  setSubSearchQuery: (v: string) => void;
  availableSubs: SubtitleTrack[];
  currentSubId?: string | number | null;
  isSearchingSubs?: boolean;
  onSelectSub?: (sub: SubtitleTrack) => void;
  onStartTranslation?: (sub: SubtitleTrack) => void;
  onRetrySearch?: () => void;
  getLanguageFlag?: (lang: string) => string;

  // Translation progress
  isTranslating?: boolean;
  translationProgress?: number;
  translatingName?: string;
  translationStatus?: string;
  showCelebration?: boolean;
  onCloseCelebration?: () => void;

  // Dub tab (pass children or omit)
  dubContent?: React.ReactNode;

  // Language
  language?: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const COLOR_SWATCHES = ['#ffffff', '#facc15', '#22d3ee', '#4ade80', '#ef4444'];
const COLOR_LABELS   = ['سپی', 'زەرد', 'شینی', 'سەوز', 'سور'];

// Circular SVG progress
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CircularProgress({ progress }: { progress: number }) {
  const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 40px rgba(220,38,38,${(progress / 100) * 0.6})` }}
      />
      <svg width={96} height={96} viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={48} cy={48} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
        {/* Fill */}
        <motion.circle
          cx={48}
          cy={48}
          r={RADIUS}
          fill="none"
          stroke="url(#redGrad)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
      </svg>
      <span
        className="absolute text-sm font-black text-white"
        style={{ fontFamily: "'Outfit','Inter',sans-serif" }}
      >
        {progress}%
      </span>
    </div>
  );
}

// iOS toggle
function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
        active ? 'bg-red-600' : 'bg-white/10'
      }`}
      whileTap={{ scale: 0.92 }}
    >
      <motion.div
        className="absolute top-[4px] w-4 h-4 rounded-full bg-white shadow-md"
        animate={{ x: active ? 23 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  );
}

// Section label
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Panel
// ─────────────────────────────────────────────────────────────
export const SubtitleManagerPanel: React.FC<SubtitleManagerPanelProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  isAdmin,
  isUploadingSub,
  uploadStatus,
  onUploadClick,
  onFileChange,
  subtitleSize,
  setSubtitleSize,
  subtitleColor,
  setSubtitleColor,
  subBgOpacity,
  setSubBgOpacity,
  subBlur,
  setSubBlur,
  showSubBackground,
  setShowSubBackground,
  brightness,
  setBrightness,
  contrast,
  setContrast,
  saturation,
  setSaturation,
  onResetFilters,
  subtitleOffset,
  setSubtitleOffset,
  subSearchQuery,
  setSubSearchQuery,
  availableSubs,
  currentSubId,
  isSearchingSubs,
  onSelectSub,
  onStartTranslation,
  onRetrySearch,
  getLanguageFlag,
  isTranslating,
  translationProgress = 0,
  translatingName,
  translationStatus = '',
  showCelebration = false,
  onCloseCelebration,
  dubContent,
  language = 'ku',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isKu = language === 'ku' || language === 'badini';
  const dragControls = useDragControls();
  const [isMobile, setIsMobile] = React.useState(false);
  const [confirmTranslateSub, setConfirmTranslateSub] = React.useState<any | null>(null);
  const [layoutStyle, setLayoutStyle] = React.useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flkrd_sub_layout_style');
      if (saved === 'list' || saved === 'grid') return saved;
    }
    return 'list';
  });

  const [terminalLogs, setTerminalLogs] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (isTranslating) {
      if (translationStatus) {
        setTerminalLogs(prev => {
          if (prev.includes(translationStatus)) return prev;
          return [...prev, translationStatus];
        });
      }
    } else {
      setTerminalLogs([]);
    }
  }, [isTranslating, translationStatus]);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        const isToggleClick = target.closest('button') && (
          target.closest('button')?.innerText.includes('Studio') ||
          target.closest('button')?.innerHTML.includes('Subtitles') ||
          target.closest('button')?.innerHTML.includes('Tv') ||
          target.closest('button')?.innerText.includes('ئەڵقەکان')
        );

        if (!isToggleClick) {
          onClose();
        }
      }
    };

    document.addEventListener('click', handleOutsideClick, true);
    return () => {
      document.removeEventListener('click', handleOutsideClick, true);
    };
  }, [isOpen, onClose]);

  const TABS: { id: SubStudioTab; icon: React.ReactNode; label: string }[] = [
    { id: 'sub',       icon: <Subtitles size={12} />, label: isKu ? 'ژێرنووس'  : 'Subtitles' },
    { id: 'dub',       icon: <Mic2      size={12} />, label: isKu ? 'دۆبلاژ'   : 'Dubbing'   },
    { id: 'lighting',  icon: <Sliders   size={12} />, label: isKu ? 'ڕووناکی'  : 'Display'   },
    { id: 'shortcuts', icon: <Keyboard  size={12} />, label: isKu ? 'کلیلەکان' : 'Hotkeys'   },
  ];

  return (
    <motion.div
      key="subtitle-manager-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[200] flex items-end justify-center md:items-center md:justify-end p-0 md:p-6 pointer-events-none"
    >
          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '110%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            drag={isMobile ? "y" : false}
            dragControls={dragControls}
            dragListener={true}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 120 || info.velocity.y > 400) {
                onClose();
              }
            }}
            className="relative pointer-events-auto w-full md:w-[420px] h-[80vh] md:h-[85vh]
                       border-t md:border border-white/[0.08]
                       rounded-t-[32px] md:rounded-[32px]
                       flex flex-col overflow-hidden"
            style={{
              fontFamily: "'Zain', 'Outfit', 'Inter', sans-serif",
              background: `radial-gradient(circle at 50% 0%, rgba(220, 38, 38, 0.12), transparent 70%), rgba(10, 10, 15, 0.85)`,
              backdropFilter: isMobile ? `blur(16px) saturate(140%)` : `blur(28px) saturate(160%)`,
              WebkitBackdropFilter: isMobile ? `blur(16px) saturate(140%)` : `blur(28px) saturate(160%)`,
              transform: 'translate3d(0,0,0)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              paddingLeft: 'env(safe-area-inset-left, 0px)',
              paddingRight: 'env(safe-area-inset-right, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              boxShadow: `
                inset 0 1px 0 0 rgba(255, 255, 255, 0.15),
                inset 1.5px 0 0.5px rgba(255, 0, 80, 0.08),
                inset -1.5px 0 0.5px rgba(0, 200, 255, 0.08),
                0 30px 60px rgba(0,0,0,0.55)
              `
            }}
          >
            {/* Dynamic liquid shine overlay */}
            <div 
              className="absolute inset-0 pointer-events-none mix-blend-overlay animate-[ios-glass-shine_18s_ease-in-out_infinite] z-0"
              style={{
                background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.01) 40%, transparent 70%)`,
                opacity: 0.8,
              }}
            />

            <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
              {/* Mobile drag handle */}
              <div 
                className="w-10 h-1 bg-white/10 rounded-full mx-auto mt-3 mb-1 shrink-0 md:hidden cursor-grab active:cursor-grabbing" 
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => dragControls.start(e)}
              />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-3 pb-4 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Subtitles size={14} className="text-red-400" />
                </div>
                <span className="text-sm font-black text-white tracking-tight">
                  {isKu ? 'ڕێکخستنی ژێرنووس' : 'Subtitle Studio'}
                </span>
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X size={15} />
              </motion.button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-5 p-5" onPointerDownCapture={e => e.stopPropagation()}>

              {/* ── Segmented Tabs ── */}
              <div className="relative flex bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 gap-1 shrink-0">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5
                               text-[9px] font-black uppercase tracking-wider z-10 transition-colors duration-200"
                    style={{ color: activeTab === tab.id ? '#fff' : '#71717a' }}
                  >
                    {/* Animated pill background */}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-600 to-red-700
                                   shadow-[0_4px_20px_rgba(220,38,38,0.35)]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {tab.icon}
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* ── TAB: SUBTITLES ── */}
              <AnimatePresence mode="wait">
                {activeTab === 'sub' && (
                  <motion.div
                    key="sub-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-5"
                  >
                    {/* Admin Upload Zone */}
                    {isAdmin && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-950/20 border border-dashed border-red-500/25 rounded-2xl p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-red-400 tracking-widest uppercase flex items-center gap-1.5">
                            <ShieldCheck size={12} /> Admin CC Manager
                          </span>
                          <span className="text-[7px] bg-red-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-widest animate-pulse">
                            LIVE
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                            <Upload size={16} className="text-red-400" />
                          </div>
                          <p className="text-[9px] text-zinc-400 leading-relaxed">
                            {isKu
                              ? 'ئەپلۆد بکە بۆ ئەم بابەتە (SRT. یان VTT.) فایلی ژێرنووسی تایبەت'
                              : 'Upload a custom subtitle file (.vtt or .srt) for this title.'}
                          </p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".vtt,.srt"
                          multiple
                          className="hidden"
                          onChange={onFileChange}
                        />
                        <motion.button
                          type="button"
                          onClick={onUploadClick || (() => fileInputRef.current?.click())}
                          disabled={isUploadingSub}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700
                                     text-white rounded-xl flex items-center justify-center gap-2
                                     text-[9px] font-black uppercase tracking-widest
                                     shadow-[0_0_20px_rgba(220,38,38,0.25)]
                                     disabled:opacity-40 transition-all"
                        >
                          <Upload size={13} />
                          {isUploadingSub
                            ? (isKu ? 'ئاپلۆد دەکرێت...' : 'Uploading...')
                            : (isKu ? 'هەڵبژاردنی ژێرنووس' : 'Choose Subtitle')}
                        </motion.button>
                        {uploadStatus && (
                          <span className={`text-[8px] font-black uppercase tracking-widest text-center ${
                            uploadStatus.type === 'success' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {uploadStatus.message}
                          </span>
                        )}
                      </motion.div>
                    )}


                    {/* Search Bar */}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <Label>{isKu ? 'گەڕان بۆ ژێرنووس' : 'Search Subtitles'}</Label>
                        <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full select-none">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[7px] font-black text-green-500 uppercase tracking-widest">OpenSub API Active</span>
                        </div>
                      </div>
                      <div className="relative group">
                        <Search
                          size={13}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500
                                     group-focus-within:text-red-400 transition-colors"
                        />
                        <input
                          type="text"
                          placeholder={isKu ? 'گەڕان بۆ زمان...' : 'Find a language...'}
                          value={subSearchQuery}
                          onChange={e => setSubSearchQuery(e.target.value)}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
                                     pl-10 pr-4 py-3 text-[11px] text-white placeholder:text-zinc-600
                                     focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20
                                     focus:bg-white/[0.06] outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Translation Progress (wow-factor) */}
                    <AnimatePresence>
                      {isTranslating && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          className="flex flex-col gap-4 p-5 bg-black/60 border border-red-500/20 rounded-[24px] backdrop-blur-xl shadow-2xl relative overflow-hidden"
                        >
                          {/* Glossy Header row */}
                          <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <div className="flex items-center gap-3">
                              {/* Glowing loader */}
                              <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                                <span className="absolute inset-0 rounded-full border-2 border-red-500/10"></span>
                                <span className="absolute inset-0 rounded-full border-2 border-t-red-500 animate-spin"></span>
                                <span className="text-[9px] font-black text-red-500">{translationProgress}%</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[12px] font-black text-white uppercase tracking-wider" style={{ fontFamily: isKu ? "'Zain', sans-serif" : "inherit" }}>
                                  {isKu ? 'وەرگێڕانی ژێرنووس...' : 'Subtitle Engine'}
                                </span>
                                <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-[0.06em]">
                                  {translatingName || 'Selected Track'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Window controls */}
                            <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-full border border-white/5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500/70 animate-pulse"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/70 animate-pulse"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500/70 animate-pulse"></span>
                            </div>
                          </div>

                          {/* Terminal Output */}
                          <div className="w-full font-mono text-[9px] text-red-400 bg-black/40 border border-white/5 p-4 rounded-2xl max-h-[140px] overflow-y-auto custom-scrollbar flex flex-col gap-2 shadow-[inset_0_0_12px_rgba(239,68,68,0.05)]">
                            {terminalLogs.map((log, index) => (
                              <div key={index} className="flex gap-2 items-start leading-relaxed">
                                <span className="text-red-500/40 select-none">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                <span className="text-zinc-500 select-none">&gt;</span>
                                <span className="text-zinc-300 break-all">{log}</span>
                              </div>
                            ))}
                            {/* Loading cursor line */}
                            <div className="flex gap-2 items-center leading-relaxed">
                              <span className="text-red-500/40 select-none">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                              <span className="text-red-400 select-none">&gt;</span>
                              <span className="text-red-400 animate-pulse font-bold">
                                {isKu ? 'لە پڕۆسەدایە...' : 'Processing pipeline...'}
                              </span>
                              <span className="w-1.5 h-3 bg-red-400 animate-pulse shrink-0"></span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Celebration Screen */}
                    <AnimatePresence>
                      {showCelebration && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-yellow-500/10 via-red-500/5 to-purple-600/10 border border-yellow-500/20 rounded-2xl relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-h-[320px]"
                        >
                          {/* Confetti Particle Burst Effect */}
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {[...Array(15)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute w-1.5 h-1.5 rounded-full"
                                style={{
                                  background: ['#ef4444', '#eab308', '#a855f7', '#3b82f6', '#10b981'][i % 5],
                                  left: `${15 + Math.random() * 70}%`,
                                  top: `${20 + Math.random() * 60}%`,
                                }}
                                animate={{
                                  y: [0, -100 - Math.random() * 80],
                                  x: [0, (Math.random() - 0.5) * 120],
                                  scale: [0, 1, 0],
                                  rotate: [0, 360],
                                }}
                                transition={{
                                  duration: 2 + Math.random() * 1.5,
                                  repeat: Infinity,
                                  ease: "easeOut",
                                }}
                              />
                            ))}
                          </div>

                          <div className="relative z-10 flex flex-col items-center gap-3.5">
                            <div className="w-16 h-16 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shadow-[0_0_35px_rgba(234,179,8,0.25)]">
                              <Sparkles size={32} className="text-yellow-500 animate-pulse" fill="currentColor" />
                            </div>

                            <h3 className="text-lg md:text-xl font-[1000] uppercase italic tracking-tighter shimmer-text">
                              {isKu ? 'دامەزراندن سەرکەوتوو بوو!' : 'INSTALLATION COMPLETE!'}
                            </h3>

                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-500">
                              {isKu ? 'ژێرنووس لای سەرجەم بەکارهێنەران پاشەکەوت کرا' : 'SRT SAVED FOR ALL USERS'}
                            </p>

                            <p className="text-[10px] text-zinc-300 leading-relaxed max-w-xs">
                              {isKu 
                                ? 'سوپاس بۆ وەرگێڕانی ئەم ژێرنووسە! ئێستا بە تەواوی ئامادەیە و لە خزمەتگوزاری Supabase پاشەکەوت کرا بۆ ئەوەی هەر بەکارهێنەرێکی تر سوودی لێ ببێنێت.'
                                : 'Thank you for translating this subtitle! It has been successfully saved to Supabase so that other users can enjoy it.'}
                            </p>

                            <div className="w-full h-px bg-white/5 my-1" />

                            <p className="text-xs font-black italic text-white leading-relaxed">
                              {isKu 
                                ? 'چێژ لە بینینی فیلمەکە وەربگرە! 🎬🍿' 
                                : 'Enjoy your movie! 🎬🍿'}
                            </p>

                            {onCloseCelebration && (
                              <button
                                onClick={onCloseCelebration}
                                className="mt-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-[1000] uppercase tracking-widest rounded-xl transition-all shadow-[0_6px_15px_rgba(220,38,38,0.25)] active:scale-95 flex items-center gap-1.5"
                              >
                                <Play size={8} fill="currentColor" className="translate-x-[0.5px]" />
                                {isKu ? 'دەستپێکردنی فیلمەکە' : 'START WATCHING'}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Subtitle List */}
                    {!isTranslating && !showCelebration && (
                      <>
                        {/* Subtitle List Layout Toggle */}
                        <div className="flex items-center justify-between mt-1 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                            {isKu ? 'ژێرنووسە بەردەستەکان' : 'Available Tracks'}
                          </span>
                          <div className="flex items-center bg-white/[0.03] border border-white/[0.05] p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => { setLayoutStyle('list'); localStorage.setItem('flkrd_sub_layout_style', 'list'); }}
                              className={`p-1.5 rounded-lg transition-all ${
                                layoutStyle === 'list'
                                  ? 'bg-red-600 text-white shadow-md'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                              title="List View"
                            >
                              <List size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setLayoutStyle('grid'); localStorage.setItem('flkrd_sub_layout_style', 'grid'); }}
                              className={`p-1.5 rounded-lg transition-all ${
                                layoutStyle === 'grid'
                                  ? 'bg-red-600 text-white shadow-md'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                              title="Grid View"
                            >
                              <Grid size={12} />
                            </button>
                          </div>
                        </div>

                        {isSearchingSubs ? (
                          <div className="flex flex-col items-center gap-4 py-10">
                            <div className="relative">
                              <div className="w-10 h-10 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
                              <Activity size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 animate-pulse" />
                            </div>
                            <span className="text-[9px] font-black text-zinc-500 animate-pulse uppercase tracking-[0.3em]">
                              {isKu ? 'لۆدکردنی زمانەکان...' : 'Fetching Cloud Subs...'}
                            </span>
                          </div>
                        ) : availableSubs.length === 0 ? (
                          <div className="flex flex-col items-center gap-3 py-8
                                          bg-white/[0.015] border border-dashed border-white/10 rounded-2xl w-full">
                            <span className="text-[9px] text-zinc-500 text-center px-6">
                              {isKu ? 'هیچ ژێرنووسێکی تر نەدۆزرایەوە' : 'No other subtitles found'}
                            </span>
                            <motion.button
                              type="button"
                              onClick={onRetrySearch}
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.95 }}
                              className="px-4 py-2 bg-white/5 border border-white/10 rounded-full
                                         text-[8px] font-black uppercase tracking-widest text-zinc-300
                                         hover:bg-white/10 transition-all"
                            >
                              {isKu ? 'دوبارە گەڕان' : 'Retry Search'}
                            </motion.button>
                          </div>
                        ) : layoutStyle === 'list' ? (
                          <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar" onPointerDownCapture={e => e.stopPropagation()}>
                            {availableSubs.filter(sub => sub.id !== 'prop-kurdish-auto').filter(sub =>
                                (sub.attributes?.display_name || '').toLowerCase().includes(subSearchQuery.toLowerCase()) ||
                                (sub.attributes?.language || '').toLowerCase().includes(subSearchQuery.toLowerCase())
                              )
                              .sort((a, b) => {
                                const aK = ['ku','ckb','kur'].includes((a.attributes?.language || '').toLowerCase());
                                const bK = ['ku','ckb','kur'].includes((b.attributes?.language || '').toLowerCase());
                                return aK === bK ? 0 : aK ? -1 : 1;
                              })
                              .map((sub, idx) => {
                                const sLang = (sub.attributes?.language || '').toLowerCase();
                                const isKurdishSub = ['ku','ckb','kur','badini'].includes(sLang);
                                const isActive = sub.id === currentSubId;
                                const isVerified = isKurdishSub && String(sub.id).startsWith('custom-db-');
                                return (
                                  <motion.div
                                    key={sub.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    onClick={() => {
                                      if (isKurdishSub) {
                                        onSelectSub?.(sub);
                                      } else {
                                        setConfirmTranslateSub(sub);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (isKurdishSub) {
                                          onSelectSub?.(sub);
                                        } else {
                                          setConfirmTranslateSub(sub);
                                        }
                                      }
                                    }}
                                    whileHover={{ scale: 1.015 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`relative flex items-center gap-3.5 p-3.5 rounded-2xl border
                                                cursor-pointer transition-all duration-200 overflow-hidden
                                                ${isActive
                                                  ? 'bg-gradient-to-r from-red-600/25 to-red-950/15 border-red-500/50 shadow-[0_8px_30px_rgba(220,38,38,0.18)] ring-1 ring-red-500/20'
                                                  : isKurdishSub
                                                    ? 'bg-gradient-to-r from-red-600/5 to-transparent border-red-500/20 hover:border-red-500/40'
                                                    : 'bg-white/[0.015] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]'
                                                }`}
                                  >
                                    {isActive && (
                                      <div className="absolute inset-0 bg-red-600/5 blur-xl pointer-events-none" />
                                    )}
                                    {/* Flag */}
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base border
                                                     \${isActive ? 'bg-red-500/20 border-red-500/40' : isKurdishSub ? 'bg-red-600/10 border-red-500/15' : 'bg-white/5 border-white/10'}`}>
                                      <span className="select-none">
                                        {getLanguageFlag?.(sub.attributes?.language || '') ?? '🌐'}
                                      </span>
                                    </div>
                                    {/* Info */}
                                    <div className="flex flex-col flex-1 min-w-0 relative z-10">
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className={`text-[8px] font-black uppercase tracking-widest \${
                                          isActive ? 'text-red-400' : isKurdishSub ? 'text-red-500' : 'text-zinc-500'
                                        }`}>
                                          {sub.attributes?.language || 'UNK'}
                                        </span>
                                        {isVerified && (
                                          <span className="text-[6px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black tracking-widest uppercase flex items-center gap-0.5 shadow-sm shadow-red-600/25">
                                            <Sparkles size={6} /> Verified
                                          </span>
                                        )}
                                      </div>
                                      <span className={`text-[11px] font-bold truncate \${isActive ? 'text-white' : 'text-zinc-300'}`}>
                                        {(sub.attributes?.display_name || 'Subtitle Track').replace(/\.(srt|vtt)/gi, '')}
                                      </span>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex items-center gap-2 z-20 shrink-0">
                                      {!isKurdishSub && (
                                        <motion.button
                                          type="button"
                                          onClick={e => { e.stopPropagation(); setConfirmTranslateSub(sub); }}
                                          title="Translate to Kurdish"
                                          whileHover={{ scale: 1.15 }}
                                          whileTap={{ scale: 0.85 }}
                                          className="w-7 h-7 rounded-xl bg-red-600/10 text-red-500 flex items-center justify-center
                                                     border border-red-500/20 hover:bg-red-600 hover:text-white
                                                     hover:shadow-md hover:shadow-red-600/25 transition-all"
                                        >
                                          <Languages size={11} />
                                        </motion.button>
                                      )}
                                      <ArrowRight
                                        size={12}
                                        className={`transition-all \${
                                          isActive ? 'text-red-500 opacity-100' : 'text-zinc-600 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0'
                                        }`}
                                      />
                                    </div>
                                  </motion.div>
                                );
                              })
                            }
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2.5 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar w-full" onPointerDownCapture={e => e.stopPropagation()}>
                            {availableSubs.filter(sub => sub.id !== 'prop-kurdish-auto').filter(sub =>
                                (sub.attributes?.display_name || '').toLowerCase().includes(subSearchQuery.toLowerCase()) ||
                                (sub.attributes?.language || '').toLowerCase().includes(subSearchQuery.toLowerCase())
                              )
                              .sort((a, b) => {
                                const aK = ['ku','ckb','kur'].includes((a.attributes?.language || '').toLowerCase());
                                const bK = ['ku','ckb','kur'].includes((b.attributes?.language || '').toLowerCase());
                                return aK === bK ? 0 : aK ? -1 : 1;
                              })
                              .map((sub, idx) => {
                                const sLang = (sub.attributes?.language || '').toLowerCase();
                                const isKurdishSub = ['ku','ckb','kur','badini'].includes(sLang);
                                const isActive = sub.id === currentSubId;
                                const isVerified = isKurdishSub && String(sub.id).startsWith('custom-db-');
                                return (
                                  <motion.div
                                    key={sub.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    onClick={() => {
                                      if (isKurdishSub) {
                                        onSelectSub?.(sub);
                                      } else {
                                        setConfirmTranslateSub(sub);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (isKurdishSub) {
                                          onSelectSub?.(sub);
                                        } else {
                                          setConfirmTranslateSub(sub);
                                        }
                                      }
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    className={`relative flex flex-col justify-between p-3.5 h-28 rounded-2xl border
                                                cursor-pointer transition-all duration-200 overflow-hidden text-left
                                                \${isActive
                                                  ? 'bg-gradient-to-b from-red-600/25 to-red-950/15 border-red-500/50 shadow-[0_8px_30px_rgba(220,38,38,0.18)] ring-1 ring-red-500/20'
                                                  : isKurdishSub
                                                    ? 'bg-gradient-to-b from-red-600/10 to-transparent border-red-500/20 hover:border-red-500/40'
                                                    : 'bg-white/[0.015] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]'
                                                }`}
                                  >
                                    {isActive && (
                                      <div className="absolute inset-0 bg-red-600/5 blur-xl pointer-events-none" />
                                    )}

                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-base select-none shrink-0" role="img" aria-label={sub.attributes?.language}>
                                          {getLanguageFlag?.(sub.attributes?.language || '') || '🌐'}
                                        </span>
                                        <span className="text-[7.5px] font-black uppercase tracking-wider text-zinc-500">
                                          {sub.attributes?.language}
                                        </span>
                                      </div>
                                      
                                      {/* Badges */}
                                      <div className="flex gap-1">
                                        {isVerified && (
                                          <div className="bg-yellow-500/20 text-yellow-400 text-[5.5px] font-black px-1 py-0.5 rounded border border-yellow-500/20 flex items-center gap-0.5 shadow-sm uppercase tracking-widest shrink-0">
                                            <ShieldCheck size={6} />
                                            <span>VERIFIED</span>
                                          </div>
                                        )}
                                        {!isKurdishSub && (
                                          <button
                                            type="button"
                                            onClick={e => { e.stopPropagation(); setConfirmTranslateSub(sub); }}
                                            className="bg-red-500/20 text-red-400 p-0.5 rounded-full border border-red-500/20 flex items-center justify-center shrink-0 hover:bg-red-600 hover:text-white transition-colors"
                                            title="Translate to Kurdish"
                                          >
                                            <Languages size={8} />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-0.5 w-full mt-2">
                                      <span className={`text-[9px] font-black uppercase tracking-widest \${
                                        isActive ? 'text-red-400' : isKurdishSub ? 'text-red-500' : 'text-zinc-500'
                                      }`}>
                                        {sub.attributes?.language || 'UNK'}
                                      </span>
                                      <span className="text-[9.5px] font-bold text-white line-clamp-2 text-left leading-tight">
                                        {(sub.attributes?.display_name || 'Subtitle Track').replace(/\.(srt|vtt)/gi, '')}
                                      </span>
                                    </div>
                                  </motion.div>
                                );
                              })}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}

                {/* ── TAB: DUBBING ── */}
                {activeTab === 'dub' && (
                  <motion.div
                    key="dub-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                  >
                    {dubContent ?? (
                      <div className="py-12 flex flex-col items-center gap-3 text-zinc-600">
                        <Mic2 size={28} className="opacity-30" />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          {isKu ? 'هیچ دۆبلاژێک نییە' : 'No Dubs Available'}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── TAB: DISPLAY ── */}
                {activeTab === 'lighting' && (
                  <motion.div
                    key="lighting-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-4"
                  >
                    {/* Brightness */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Sun size={12} className="text-yellow-500 animate-pulse" />
                          {isKu ? 'ڕووناکی فیلم' : 'Video Brightness'}
                        </label>
                        <span className="text-[10px] font-bold text-yellow-500">{Math.round(brightness * 100)}%</span>
                      </div>
                      <input
                        type="range" min="0.5" max="2.5" step="0.05"
                        value={brightness}
                        onChange={e => setBrightness(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-yellow-500 bg-white/10"
                      />
                    </div>

                    {/* Contrast */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Sliders size={12} className="text-red-500" />
                          {isKu ? 'کۆنتراست (تۆخی)' : 'Video Contrast'}
                        </label>
                        <span className="text-[10px] font-bold text-red-500">{Math.round(contrast * 100)}%</span>
                      </div>
                      <input
                        type="range" min="0.5" max="2.0" step="0.05"
                        value={contrast}
                        onChange={e => setContrast(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-red-600 bg-white/10"
                      />
                    </div>

                    {/* Saturation */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles size={12} className="text-blue-500" />
                          {isKu ? 'تێربوونی ڕەنگ' : 'Video Saturation'}
                        </label>
                        <span className="text-[10px] font-bold text-blue-500">{Math.round(saturation * 100)}%</span>
                      </div>
                      <input
                        type="range" min="0.5" max="2.0" step="0.05"
                        value={saturation}
                        onChange={e => setSaturation(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500 bg-white/10"
                      />
                    </div>

                    {/* Reset Filters */}
                    <motion.button
                      type="button"
                      onClick={onResetFilters}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[9px] transition-all"
                    >
                      {isKu ? 'ڕێکخستنەوە بۆ بنەڕەتی' : 'RESET TO DEFAULT'}
                    </motion.button>

                    {/* Color Swatches */}
                    <div className="flex flex-col gap-2.5 mt-2">
                      <Label>{isKu ? 'ڕەنگی نوسین' : 'Text Color'}</Label>
                      <div className="flex gap-3">
                        {COLOR_SWATCHES.map((c, i) => (
                          <motion.button
                            key={c}
                            type="button"
                            title={COLOR_LABELS[i]}
                            onClick={() => setSubtitleColor(c)}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            className={`w-7 h-7 rounded-full border-2 transition-all shadow-md ${
                              subtitleColor === c
                                ? 'border-red-500 ring-4 ring-red-500/25 scale-110'
                                : 'border-white/10'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Sync Delay */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3 mt-2">
                      <div className="flex items-center justify-between">
                        <Label>{isKu ? 'خێرایی ژێرنووس (چرکە)' : 'Subtitle Sync (sec)'}</Label>
                        <span className={`text-[10px] font-bold ${
                          subtitleOffset === 0 ? 'text-zinc-400' : subtitleOffset > 0 ? 'text-blue-400' : 'text-amber-400'
                        }`}>
                          {subtitleOffset > 0 ? '+' : ''}{(subtitleOffset / 1000).toFixed(1)}s
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          type="button"
                          onClick={() => setSubtitleOffset(subtitleOffset - 500)}
                          whileTap={{ scale: 0.88 }}
                          className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 hover:bg-white/10 transition-colors"
                        >
                          <Minus size={12} />
                        </motion.button>
                        <input
                          type="range" min={-5000} max={5000} step={500}
                          value={subtitleOffset}
                          onChange={e => setSubtitleOffset(Number(e.target.value))}
                          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-blue-500"
                        />
                        <motion.button
                          type="button"
                          onClick={() => setSubtitleOffset(subtitleOffset + 500)}
                          whileTap={{ scale: 0.88 }}
                          className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 hover:bg-white/10 transition-colors"
                        >
                          <Plus size={12} />
                        </motion.button>
                      </div>
                    </div>

                    {/* Backdrop Opacity */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3 mt-2">
                      <div className="flex items-center justify-between">
                        <Label>{isKu ? 'ڕادەی ڕوونی پشتەوە' : 'Backdrop Opacity'}</Label>
                        <span className="text-[10px] font-bold text-green-400">{Math.round(subBgOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range" min={0} max={1} step={0.05}
                        value={subBgOpacity}
                        onChange={e => setSubBgOpacity(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-green-500"
                      />
                    </div>

                    {/* Glass Effect Toggle */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3 divide-y divide-white/[0.05]">
                      <div className="flex items-center justify-between pb-3">
                        <div>
                          <Label>{isKu ? 'کاریگەری شووشە' : 'Glass Effect'}</Label>
                          <p className="text-[8px] text-zinc-600 mt-0.5">Glassmorphism backdrop-blur</p>
                        </div>
                        <Toggle active={subBlur} onToggle={() => setSubBlur(!subBlur)} />
                      </div>

                      {/* Show Background Toggle */}
                      <div className="flex items-center justify-between pt-3">
                        <div>
                          <Label>{isKu ? 'پێشاندانی پشتەوە' : 'Show Background'}</Label>
                          <p className="text-[8px] text-zinc-600 mt-0.5">Subtitle background box</p>
                        </div>
                        <Toggle
                          active={showSubBackground}
                          onToggle={() => setShowSubBackground(!showSubBackground)}
                        />
                      </div>
                    </div>

                    {/* Font Size (also in lighting) */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <Label>{isKu ? 'قەبارەی نوسین' : 'Font Size'}</Label>
                        <span className="text-[10px] font-bold text-red-400">{subtitleSize}px</span>
                      </div>
                      <input
                        type="range" min={12} max={52} step={2}
                        value={subtitleSize}
                        onChange={e => setSubtitleSize(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-red-600"
                      />
                    </div>

                  </motion.div>
                )}

                {/* ── TAB: SHORTCUTS ── */}
                {activeTab === 'shortcuts' && (
                  <motion.div
                    key="shortcuts-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-5"
                    style={{ fontFamily: "'Zain', 'Outfit', sans-serif" }}
                  >
                    {/* Hero Banner */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-950/30 via-black/60 to-red-950/20 border border-red-500/15 p-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">
                          <Keyboard size={16} className="text-red-400" />
                        </div>
                        <div>
                          <h3 className="text-[13px] font-black text-white tracking-tight">
                            {isKu ? 'ڕێنمایی کلیلەکان' : 'Keyboard Shortcuts'}
                          </h3>
                          <p className="text-[9px] text-zinc-500 font-medium">
                            {isKu ? 'FLKRD Movies — کارئامەی پلەیەر' : 'FLKRD Movies — Player Controls'}
                          </p>
                        </div>
                      </div>
                      <p className="text-[9.5px] text-zinc-400 leading-relaxed">
                        {isKu
                          ? 'کلیلەکانی ژووری پێشاندان بەکاربهێنە بۆ کنترۆڵکردنی پلەیەر، ژێرنووس، و دەنگ بەبێ کرتەی موشکە.'
                          : 'Use keyboard shortcuts to control playback, subtitles, and audio without touching the mouse.'}
                      </p>
                    </div>

                    {/* Category: Playback */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">
                          {isKu ? '▸ دەستپێکردن' : '▸ Playback'}
                        </span>
                        <div className="flex-1 h-px bg-white/[0.04]" />
                      </div>
                      {[
                        { label: isKu ? 'دەستپێکردن / وەستان' : 'Play / Pause', keys: ['Space', 'K'] },
                        { label: isKu ? 'گەڕانەوە ١٠ چرکە' : 'Seek Backward 10s', keys: ['←', 'J'] },
                        { label: isKu ? 'چوونەپێش ١٠ چرکە' : 'Seek Forward 10s', keys: ['→', 'L'] },
                        { label: isKu ? 'گەڕانەوە ٥ چرکە' : 'Seek Backward 5s', keys: ['Shift+←'] },
                        { label: isKu ? 'چوونەپێش ٥ چرکە' : 'Seek Forward 5s', keys: ['Shift+→'] },
                      ].map(({ label, keys }) => (
                        <div key={label} className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-2.5">
                          <span className="text-[10px] text-zinc-300 font-medium">{label}</span>
                          <div className="flex items-center gap-1">
                            {keys.map((k, i) => (
                              <span key={k} className="flex items-center gap-1">
                                <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 font-mono text-[9px] shadow-inner">
                                  {k}
                                </kbd>
                                {i < keys.length - 1 && <span className="text-zinc-600 text-[8px] font-black">/</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Category: Audio */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">
                          {isKu ? '▸ دەنگ' : '▸ Audio'}
                        </span>
                        <div className="flex-1 h-px bg-white/[0.04]" />
                      </div>
                      {[
                        { label: isKu ? 'زیادکردنی دەنگ ٥٪' : 'Volume Up 5%', keys: ['↑'] },
                        { label: isKu ? 'کەمکردنەوەی دەنگ ٥٪' : 'Volume Down 5%', keys: ['↓'] },
                        { label: isKu ? 'بێدەنگ / دەنگدانەوە' : 'Mute / Unmute', keys: ['M'] },
                      ].map(({ label, keys }) => (
                        <div key={label} className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-2.5">
                          <span className="text-[10px] text-zinc-300 font-medium">{label}</span>
                          <div className="flex items-center gap-1">
                            {keys.map((k, i) => (
                              <span key={k} className="flex items-center gap-1">
                                <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 font-mono text-[9px] shadow-inner">
                                  {k}
                                </kbd>
                                {i < keys.length - 1 && <span className="text-zinc-600 text-[8px] font-black">/</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Category: Display */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">
                          {isKu ? '▸ نیشاندان' : '▸ Display'}
                        </span>
                        <div className="flex-1 h-px bg-white/[0.04]" />
                      </div>
                      {[
                        { label: isKu ? 'شاشەی تەواو / ئاساییە' : 'Toggle Fullscreen', keys: ['F'] },
                        { label: isKu ? 'نیشاندان / شاردنەوەی ژێرنووس' : 'Toggle Subtitles', keys: ['C'] },
                        { label: isKu ? 'کردنەوە / داخستنی پانێل' : 'Toggle Panel', keys: ['S'] },
                        { label: isKu ? 'کردنەوەی ڕێنمایی کلیلەکان' : 'Open Shortcuts Guide', keys: ['?'] },
                        { label: isKu ? 'داخستنی ڕێکخستنەکان' : 'Close Settings / Exit Fullscreen', keys: ['Esc'] },
                      ].map(({ label, keys }) => (
                        <div key={label} className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-2.5">
                          <span className="text-[10px] text-zinc-300 font-medium">{label}</span>
                          <div className="flex items-center gap-1">
                            {keys.map((k, i) => (
                              <span key={k} className="flex items-center gap-1">
                                <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 font-mono text-[9px] shadow-inner">
                                  {k}
                                </kbd>
                                {i < keys.length - 1 && <span className="text-zinc-600 text-[8px] font-black">/</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Category: Navigation */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">
                          {isKu ? '▸ ناڤیگەیشن' : '▸ Navigation'}
                        </span>
                        <div className="flex-1 h-px bg-white/[0.04]" />
                      </div>
                      {[
                        { label: isKu ? 'سەرەوە' : 'Go to Beginning', keys: ['Home'] },
                        { label: isKu ? 'کۆتایی' : 'Go to End', keys: ['End'] },
                        { label: isKu ? '١٠٪ی ماوەی فیلم' : 'Jump to 10%', keys: ['1'] },
                        { label: isKu ? '٥٠٪ی ماوەی فیلم' : 'Jump to 50%', keys: ['5'] },
                        { label: isKu ? '٩٠٪ی ماوەی فیلم' : 'Jump to 90%', keys: ['9'] },
                      ].map(({ label, keys }) => (
                        <div key={label} className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-2.5">
                          <span className="text-[10px] text-zinc-300 font-medium">{label}</span>
                          <div className="flex items-center gap-1">
                            {keys.map((k, i) => (
                              <span key={k} className="flex items-center gap-1">
                                <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 font-mono text-[9px] shadow-inner">
                                  {k}
                                </kbd>
                                {i < keys.length - 1 && <span className="text-zinc-600 text-[8px] font-black">/</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-center gap-2 py-2 opacity-40">
                      <Keyboard size={10} className="text-red-500" />
                      <span className="text-[8px] text-zinc-400 font-black tracking-widest uppercase">
                        FLKRD Player Controller
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
          
          {/* Custom Translation Confirmation Dialog */}
          <AnimatePresence>
            {confirmTranslateSub && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-md z-[500] flex items-center justify-center p-4 pointer-events-auto"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-sm bg-gradient-to-b from-[#141417]/95 to-[#0b0b0c]/98 border border-white/[0.08] backdrop-blur-3xl rounded-3xl p-6 shadow-2xl relative shadow-red-500/5"
                >
                  <h3 className="text-sm font-black text-white text-center mb-2 uppercase tracking-wide" style={{ fontFamily: "'Zain', sans-serif" }}>
                    {isKu ? 'وەرگێڕانی ژێرنووس' : 'Translate Subtitle'}
                  </h3>
                  <p className="text-[14px] text-zinc-400 text-center mb-6 leading-relaxed" style={{ fontFamily: "'Zain', sans-serif" }}>
                    {isKu
                      ? 'ئایا دەتەوێت ئەم ژێرنووسە وەربگێڕیتە سەر زمانی کوردی یان بە زمانی بنەڕەتی بمێنیتەوە؟'
                      : 'Do you want to translate this subtitle to Kurdish, or stay in the original language?'}
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const sub = confirmTranslateSub;
                        setConfirmTranslateSub(null);
                        onStartTranslation?.(sub);
                      }}
                      className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[13px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-red-600/20"
                      style={{ fontFamily: "'Zain', sans-serif" }}
                    >
                      {isKu ? 'وەرگێڕان بۆ کوردی' : 'Translate to Kurdish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sub = confirmTranslateSub;
                        setConfirmTranslateSub(null);
                        onSelectSub?.(sub);
                      }}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-[13px] font-black uppercase tracking-wider transition-all active:scale-95"
                      style={{ fontFamily: "'Zain', sans-serif" }}
                    >
                      {isKu ? 'مانەوە بە زمانی بنەڕەتی' : 'Stay in Original Language'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmTranslateSub(null)}
                      className="w-full py-2.5 text-zinc-500 hover:text-zinc-300 text-[12px] font-bold uppercase transition-colors"
                      style={{ fontFamily: "'Zain', sans-serif" }}
                    >
                      {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
  );
};

export default SubtitleManagerPanel;
