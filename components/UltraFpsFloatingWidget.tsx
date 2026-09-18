import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Power, Activity, GripHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useTranslation } from '../contexts/LanguageContext';
import { toast } from 'sonner';

/**
 * UltraFpsFloatingWidget
 * Apple Fluid Motion & Emil Kowalski Design Engineering Standards.
 * Direct pointer manipulation (drag & reposition anywhere), tactile button press physics,
 * real-time frame telemetry, and instant 1-click deactivation.
 */
export const UltraFpsFloatingWidget: React.FC = () => {
  const { isPerformanceMode, setIsPerformanceMode } = useUI();
  const { language } = useTranslation();
  const isKu = language === 'ku' || language === 'badini';

  const [fps, setFps] = useState<number>(60);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Measure real-time hardware FPS
  useEffect(() => {
    if (!isPerformanceMode) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const loop = (now: number) => {
      frameCount++;
      const elapsed = now - lastTime;
      if (elapsed >= 1000) {
        setFps(Math.max(1, Math.min(144, Math.round((frameCount * 1000) / elapsed))));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPerformanceMode]);

  const handleDeactivate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPerformanceMode(false);
    toast.success(
      isKu 
        ? 'مۆدی ۆلترا فپس (Ultra FPS) ناچالاک کرا و سیستەم گەڕایەوە باری ئاسایی.' 
        : 'Ultra 60 FPS Performance Mode deactivated.'
    );
  };

  if (!isPerformanceMode) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="ultra-fps-hud"
        drag
        dragMomentum={false}
        dragElastic={0.08}
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        dir={isKu ? 'rtl' : 'ltr'}
        className="fixed top-20 right-3 sm:top-24 sm:right-6 z-[99999] pointer-events-auto select-none touch-manipulation"
      >
        {isMinimized ? (
          /* Apple Dynamic Island Minimized Capsule */
          <motion.div
            layout
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/90 backdrop-blur-2xl border border-amber-500/40 shadow-[0_10px_30px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] text-white cursor-pointer group"
          >
            <div className="relative flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse fill-amber-400/30" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <span className="text-[10px] font-black font-mono text-emerald-400 tracking-tight">
              {fps} <span className="text-[8px] text-zinc-400 font-sans">FPS</span>
            </span>
            <button
              type="button"
              onClick={handleDeactivate}
              title={isKu ? 'ناچالاککردنی ۆلترا فپس' : 'Turn off Ultra FPS'}
              className="ml-1 p-1 rounded-full bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white transition-colors duration-150 active:scale-90"
            >
              <Power size={10} />
            </button>
          </motion.div>
        ) : (
          /* Apple Floating Control Center HUD */
          <motion.div 
            layout
            className="relative flex flex-col gap-2.5 p-3.5 rounded-2xl bg-zinc-950/92 backdrop-blur-2xl border border-amber-500/35 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.14)] text-white min-w-[240px] max-w-[280px]"
          >
            {/* Draggable Header Bar with Pill Indicator */}
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-2 cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse fill-amber-400/50" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                      {isKu ? 'ۆلترا فپس (Ultra FPS)' : 'Ultra 60 FPS'}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  </div>
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
                    {isKu ? 'خێرایی دەمودەست' : 'Live HUD'}
                  </span>
                </div>
              </div>

              {/* Actions: Minimize & Drag Grip */}
              <div className="flex items-center gap-1">
                <GripHorizontal className="w-3.5 h-3.5 text-zinc-500 opacity-60" />
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  title={isKu ? 'بچووککردنەوە' : 'Minimize'}
                  className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors active:scale-90"
                >
                  <ChevronUp size={13} />
                </button>
              </div>
            </div>

            {/* Live Framerate Row */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span className="text-[9px] font-medium text-zinc-300">
                  {isKu ? 'خێرایی ئێستا:' : 'Framerate:'}
                </span>
              </div>
              <span className="text-[12px] font-mono font-black text-emerald-400 flex items-baseline gap-0.5">
                {fps} <span className="text-[8px] font-sans font-normal text-zinc-400">FPS</span>
              </span>
            </div>

            {/* Apple 1-Click Tactile Deactivate Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={handleDeactivate}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-shadow duration-150 cursor-pointer"
            >
              <Power className="w-3 h-3" />
              <span>{isKu ? 'ناچالاککردن (Turn OFF)' : 'Deactivate Ultra FPS'}</span>
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default UltraFpsFloatingWidget;
