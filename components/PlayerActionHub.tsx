import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, MessageSquare, RefreshCcw, 
  Sparkles, ChevronRight, Tv, Check,
  Globe, Maximize, Minimize, Clock,
  PlusCircle, MinusCircle
} from 'lucide-react';
import { EnhancedPlayerSource, getSourceDisplayName } from '../utils/playerSourceUtils';

interface PlayerActionHubProps {
  language?: string;
  activeSource: string;
  sources: EnhancedPlayerSource[];
  onSelectSource: (sourceName: string) => void;
  onOpenSubtitles?: () => void;
  onRefreshPlayer?: () => void;
  onOpenEpisodes?: () => void;
  hasEpisodes?: boolean;
  activeSubtitleLabel?: string;
  subtitleCount?: number;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onClose?: () => void;
  subtitleOffset?: number;
  onAdjustSubtitleOffset?: (delta: number) => void;
}

export const PlayerActionHub: React.FC<PlayerActionHubProps> = ({
  activeSource,
  sources,
  onSelectSource,
  onOpenSubtitles,
  onRefreshPlayer,
  onOpenEpisodes,
  hasEpisodes = false,
  activeSubtitleLabel,
  subtitleCount = 0,
  isFullscreen = false,
  onToggleFullscreen,
  onClose,
  subtitleOffset = 0,
  onAdjustSubtitleOffset,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'servers'>('main');
  const hubRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (hubRef.current && !hubRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveTab('main');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside, { passive: true });
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={hubRef} className="relative z-[990]" dir="rtl">
      {/* ═══ Minimal Morphing Plus Trigger Button ═══ */}
      <motion.button
        layout
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          setIsOpen(prev => !prev);
          if (isOpen) setActiveTab('main');
        }}
        aria-label="کۆنتڕۆڵی پلەیەر"
        className={`relative flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'gap-2 px-3.5 py-1.5 rounded-full bg-red-600 border border-red-500 text-white shadow-[0_0_25px_rgba(220,38,38,0.8)] ring-2 ring-red-400/40'
            : 'w-8 h-8 md:w-9 md:h-9 rounded-full bg-transparent hover:bg-black/60 text-white/90 hover:text-white border border-transparent hover:border-white/20'
        }`}
      >
        {/* Animated Rotating Plus / Cross Icon */}
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: 'spring', damping: 14, stiffness: 350 }}
          className="flex items-center justify-center shrink-0"
        >
          <Plus size={18} className={`stroke-[2.8] ${isOpen ? 'text-white' : 'text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]'}`} />
        </motion.div>

        {/* Morphing Text: Appears smoothly only when clicked (Intro state) */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0, x: 6 }}
              animate={{ opacity: 1, width: 'auto', x: 0 }}
              exit={{ opacity: 0, width: 0, x: 6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap"
            >
              <span className="text-[11px] font-black tracking-tight text-white drop-shadow">
                FLKRD Studio
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ═══ Ultra-Compact 100% Kurdish Action Hub (Mobile & Desktop Safe) ═══ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -6 }}
            transition={{ type: 'spring', damping: 24, stiffness: 380 }}
            className="fixed top-14 right-3 sm:absolute sm:top-12 sm:right-0 sm:left-auto w-[calc(100vw-24px)] max-w-[310px] sm:max-w-[320px] max-h-[82vh] overflow-y-auto scrollbar-hide rounded-2xl bg-[#0a0a0d]/95 backdrop-blur-2xl border border-red-600/40 p-3 sm:p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.98),0_0_30px_rgba(220,38,38,0.2)] z-[1000]"
          >
            {/* Header with FLKRD Studio Intro & Close */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-red-600/20 text-red-500 border border-red-600/30">
                  <Sparkles size={13} />
                </div>
                <div className="text-right">
                  <h4 className="text-[11px] font-black text-white leading-tight">
                    FLKRD Studio
                  </h4>
                  <p className="text-[9px] font-bold text-neutral-400">
                    کۆنتڕۆڵی تەواوی پەخش
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => { setIsOpen(false); setActiveTab('main'); }}
                className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                title="داخستن"
              >
                <X size={14} />
              </button>
            </div>

            {/* Quick Actions Grid (Fullscreen, Reload, Close) */}
            <div className="grid grid-cols-3 gap-1.5 mb-2.5 pb-2.5 border-b border-white/10">
              {/* Fullscreen Button */}
              {onToggleFullscreen && (
                <button
                  onClick={() => {
                    onToggleFullscreen();
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all active:scale-95 text-center ${
                    isFullscreen
                      ? 'bg-red-600/25 border-red-500/50 text-red-300'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-white'
                  }`}
                >
                  {isFullscreen ? <Minimize size={14} className="mb-1 text-red-400" /> : <Maximize size={14} className="mb-1 text-white" />}
                  <span className="text-[9px] font-black">
                    {isFullscreen ? 'بچووککردن' : 'شاشەی تەواو'}
                  </span>
                </button>
              )}

              {/* Fast Reconnect Stream */}
              {onRefreshPlayer && (
                <button
                  onClick={() => {
                    onRefreshPlayer();
                    setIsOpen(false);
                  }}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white transition-all active:scale-95 text-center"
                >
                  <RefreshCcw size={14} className="mb-1 text-amber-400" />
                  <span className="text-[9px] font-black">
                    ڕیفرێش
                  </span>
                </button>
              )}

              {/* Close Cinema Player Button */}
              {onClose && (
                <button
                  onClick={() => {
                    onClose();
                    setIsOpen(false);
                  }}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 transition-all active:scale-95 text-center"
                >
                  <X size={14} className="mb-1 text-red-400" />
                  <span className="text-[9px] font-black">
                    داخستن
                  </span>
                </button>
              )}
            </div>

            {/* Content Tabs */}
            {activeTab === 'main' ? (
              <div className="space-y-1.5">
                {/* 1. Subtitles / CC Button */}
                {onOpenSubtitles && (
                  <button
                    onClick={() => {
                      onOpenSubtitles();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-red-500/30 transition-all text-right group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/25 shrink-0">
                        <MessageSquare size={14} />
                      </div>
                      <div className="min-w-0 text-right">
                        <span className="text-[11px] font-bold text-white block truncate">
                          ژێرنووسی کوردی و فرەزمان
                        </span>
                        <span className="text-[9px] text-neutral-400 block font-medium truncate">
                          {activeSubtitleLabel || 'هەڵبژاردنی ژێرنووس'}
                        </span>
                      </div>
                    </div>
                    {subtitleCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-red-600/20 text-red-400 border border-red-500/30 shrink-0 mr-2">
                        {subtitleCount}
                      </span>
                    )}
                  </button>
                )}

                {/* 2. Relink / Server Switcher Button */}
                <button
                  onClick={() => setActiveTab('servers')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-red-500/30 transition-all text-right group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                      <Globe size={14} />
                    </div>
                    <div className="min-w-0 text-right">
                      <span className="text-[11px] font-bold text-white block truncate">
                        گۆڕینی سێرڤەر (8 سێرڤەر)
                      </span>
                      <span className="text-[9px] text-emerald-400 block font-medium truncate">
                        {getSourceDisplayName(activeSource, true)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-neutral-400 group-hover:-translate-x-0.5 transition-transform rotate-180 shrink-0 mr-1" />
                </button>

                {/* 3. Episodes Selector (if TV Show) */}
                {hasEpisodes && onOpenEpisodes && (
                  <button
                    onClick={() => {
                      onOpenEpisodes();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-red-500/30 transition-all text-right group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/25 shrink-0">
                        <Tv size={14} />
                      </div>
                      <div className="min-w-0 text-right">
                        <span className="text-[11px] font-bold text-white block truncate">
                          ئەڵقە و وەرزەکان
                        </span>
                        <span className="text-[9px] text-neutral-400 block font-medium truncate">
                          هەڵبژاردنی ئەڵقەی خێرا
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-neutral-400 group-hover:-translate-x-0.5 transition-transform rotate-180 shrink-0 mr-1" />
                  </button>
                )}

                {/* 4. Subtitle Time Sync (Fast Offset Adjust) */}
                {onAdjustSubtitleOffset && (
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-right">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-red-400" />
                        <span className="text-[11px] font-bold text-white">
                          ڕێکخستنی کاتی ژێرنووس
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-black text-red-400">
                        {subtitleOffset > 0 ? `+${subtitleOffset}s` : `${subtitleOffset}s`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onAdjustSubtitleOffset(-0.5)}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-white/[0.05] hover:bg-red-600/20 border border-white/10 text-[10px] font-bold text-neutral-200 active:scale-95 transition-all"
                      >
                        <MinusCircle size={12} className="text-red-400" />
                        <span>پێشخستن 0.5s-</span>
                      </button>
                      <button
                        onClick={() => onAdjustSubtitleOffset(0.5)}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-white/[0.05] hover:bg-red-600/20 border border-white/10 text-[10px] font-bold text-neutral-200 active:scale-95 transition-all"
                      >
                        <PlusCircle size={12} className="text-red-400" />
                        <span>دواخستن 0.5s+</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Server Selection Drawer */
              <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-hide pl-1">
                <button
                  onClick={() => setActiveTab('main')}
                  className="text-[10px] font-bold text-red-400 hover:text-white flex items-center gap-1 mb-2 transition-colors"
                >
                  <ChevronRight size={13} />
                  <span>گەڕانەوە بۆ مێنیوی سەرەکی</span>
                </button>
                {sources.map(src => {
                  const isCurrent = activeSource === src.name;
                  return (
                    <button
                      key={src.name}
                      onClick={() => {
                        onSelectSource(src.name);
                        setIsOpen(false);
                        setActiveTab('main');
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition-all border text-right ${
                        isCurrent
                          ? 'bg-red-600/25 border-red-500 text-white shadow-md'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-red-500 animate-pulse' : 'bg-neutral-600'}`} />
                        <div>
                          <span className="text-[11px] font-bold block leading-tight">
                            {getSourceDisplayName(src.name, true)}
                          </span>
                          <span className="text-[8px] text-neutral-400 block font-medium" dir="ltr">
                            {src.name}
                          </span>
                        </div>
                      </div>
                      {isCurrent && <Check size={14} className="text-red-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
