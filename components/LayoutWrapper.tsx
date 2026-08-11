import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreenPerimeterBorderBeam } from './ui/screen-perimeter-border-beam';
import { useTranslation } from '../contexts/LanguageContext';

interface LayoutWrapperProps {
  children: React.ReactNode;
  showPageLoadBeam?: boolean;
  className?: string;
}

// Global utility helper to trigger glowing load beam anywhere in the web app
export const triggerAppLoadingBeam = (durationMs: number = 2000) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('flkrd-start-loading', { detail: { durationMs } }));
  }
};

/**
 * Global Page Layout Wrapper for FLKRD MOVIES
 * Displays a 60FPS GPU-accelerated neon border beam tracing around the entire screen perimeter
 * (Header, left, right, bottom, fitting iPhone XS, 15 Pro Max, Mac, Smart TV, Android)
 * whenever the app is loading, changing routes, or fetching data.
 */
export const LayoutWrapper: React.FC<LayoutWrapperProps> = ({
  children,
  showPageLoadBeam = true,
  className = '',
}) => {
  const { language } = useTranslation();
  const location = useLocation();
  const isRtl = language === 'ku' || language === 'badini';

  const [isLoading, setIsLoading] = useState(true);

  // Trigger loading beam on route change or custom loading event
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  // Listen for global custom loading events
  useEffect(() => {
    const handleStartLoading = (e: any) => {
      const duration = e.detail?.durationMs || 2000;
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), duration);
    };

    window.addEventListener('flkrd-start-loading', handleStartLoading);
    return () => window.removeEventListener('flkrd-start-loading', handleStartLoading);
  }, []);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`relative min-h-screen w-full bg-neutral-950 text-white selection:bg-brand selection:text-white overflow-x-hidden ${
        isRtl ? 'rtl font-kurdish' : 'ltr'
      } ${className}`}
    >
      {/* ── 1. Screen-Perimeter Glowing Neon Border Beam (Cyan-to-Red Outline Matching Reference Image) ── */}
      <AnimatePresence>
        {(isLoading || showPageLoadBeam) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoading ? 1 : 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <ScreenPerimeterBorderBeam duration={8} borderWidth={3.5} glow={true} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. Multi-Layered Atmospheric Depth & Vignette (Dark Theater Room Ambiance) ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden transform-gpu">
        {/* Radial Ambient Red/Purple Theater Glow at Top Header */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(229,9,20,0.15),transparent_70%)] blur-3xl opacity-80" />

        {/* Secondary Cosmic Ambiance Glow */}
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(156,64,255,0.08),transparent_60%)] blur-3xl opacity-60" />

        {/* Outer Dark Theater Vignette Border */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(5,5,5,0.85)_100%)]" />
      </div>

      {/* ── 3. Main Page Content Container ── */}
      <main className="relative z-10 w-full min-h-screen flex flex-col transform-gpu">
        {children}
      </main>
    </div>
  );
};

export default LayoutWrapper;
