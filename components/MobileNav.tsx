import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  PlayCircle, 
  Tv, 
  Mic2, 
  Globe, 
  Bookmark, 
  Search, 
  Film, 
  Sparkles 
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import translations from '../translations';

interface NavItem {
  id: number;
  icon: React.ReactNode;
  labelKey: keyof typeof translations['en'];
  to: string;
}

const items: NavItem[] = [
  { id: 0, icon: <Home size={16} />, labelKey: "home", to: "/" },
  { id: 1, icon: <PlayCircle size={16} />, labelKey: "trendingToday", to: "/shorts" },
  { id: 2, icon: <Tv size={16} />, labelKey: "tvShows", to: "/tv" },
  { id: 3, icon: <Mic2 size={16} />, labelKey: "dubbedMovies", to: "/dubbed" },
  { id: 4, icon: <Film size={16} />, labelKey: "studios" as any, to: "/studios" },
  { id: 5, icon: <Globe size={16} />, labelKey: "discover", to: "/discover" },
  { id: 6, icon: <Bookmark size={16} />, labelKey: "myList", to: "/my-list" },
  { id: 7, icon: <Search size={16} />, labelKey: "search", to: "/search" },
];

const MobileNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { glassConfig } = useUI();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [continueWatchingCount, setContinueWatchingCount] = React.useState(0);

  // Monitor localStorage to count continue watching items
  React.useEffect(() => {
    const updateCount = () => {
      try {
        const progressData = localStorage.getItem('watchProgress');
        if (!progressData) {
          setContinueWatchingCount(0);
          return;
        }
        const progress = JSON.parse(progressData);
        const unfinished = progress.filter((item: any) => {
          const duration = item.duration || 3600;
          return item.progress > 10 && item.progress < duration * 0.98;
        });
        setContinueWatchingCount(unfinished.length);
      } catch (e) {
        setContinueWatchingCount(0);
      }
    };

    updateCount();
    window.addEventListener('storage', updateCount);
    window.addEventListener('watchProgressUpdated', updateCount);
    
    // Check every second for real-time synchronization
    const interval = setInterval(updateCount, 1500);

    return () => {
      window.removeEventListener('storage', updateCount);
      window.removeEventListener('watchProgressUpdated', updateCount);
      clearInterval(interval);
    };
  }, []);

  // Smooth scroll active element into center view
  React.useEffect(() => {
    const activeEl = scrollContainerRef.current?.querySelector('.active-nav-link');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [location.pathname]);

  return (
    <div className="global-mobilenav fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-0 right-0 mx-auto z-[9999] md:hidden w-[94%] max-w-[440px] pointer-events-auto overflow-visible flex items-center justify-between gap-2.5">
      
      {/* 1. Main Scrollable Capsule (Floating Red Glassmorphic Pill) */}
      <div 
        className="flex-1 h-12 rounded-full border backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.7)] flex items-center justify-between transition-all duration-300 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(20, 4, 4, 0.9) 0%, rgba(8, 3, 3, 0.95) 100%)`,
          backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
          WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
          borderStyle: 'solid',
          borderColor: `rgba(220, 38, 38, ${glassConfig.borderOpacity * 1.5})`,
          boxShadow: `
            inset 0 1px 0 0 rgba(255, 255, 255, 0.08),
            inset 0 0 15px rgba(220, 38, 38, 0.1),
            0 15px 30px rgba(0,0,0,0.8)
          `
        }}
      >
        {/* Edge gradient masks to show scrollability */}
        <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/20 to-transparent pointer-events-none z-20" />
        <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black/20 to-transparent pointer-events-none z-20" />

        {/* Scrollable Container */}
        <div 
          ref={scrollContainerRef}
          className="w-full h-full flex items-center gap-1 overflow-x-auto scrollbar-none scroll-smooth px-3 py-1 select-none"
          style={{
            maskImage: 'linear-gradient(to right, transparent, white 8px, white calc(100% - 8px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, white 8px, white calc(100% - 8px), transparent)'
          }}
        >
          {items.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));

            return (
              <NavLink
                key={item.id}
                to={item.to}
                aria-label={t(item.labelKey)}
                className={({ isActive }) => 
                  `flex-shrink-0 flex justify-center focus:outline-none ${isActive ? 'active-nav-link' : ''}`
                }
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 relative ${
                    isActive 
                      ? 'text-white font-black' 
                      : 'text-red-200/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-active-pill"
                      className="absolute inset-0 rounded-full z-0 shadow-[0_3px_10px_rgba(220,38,38,0.45)] border border-red-500/25"
                      style={{
                        background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 420 * (glassConfig.elasticity / 0.35), 
                        damping: 32 * (0.35 / glassConfig.elasticity) 
                      }}
                    />
                  )}
                  <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-105 text-white font-black' : 'text-red-300/55'}`}>
                    {item.icon}
                  </span>
                </motion.div>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* 2. Floating Circular Sparkles Button (Continue Watching Portal Toggle) */}
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent('flkrd_toggle_continue_watching'));
        }}
        aria-label="Continue Watching Portal"
        className="focus:outline-none flex-shrink-0 relative overflow-visible"
      >
        <motion.div
          whileHover={{ scale: 1.08, y: -1 }}
          whileTap={{ scale: 0.92 }}
          className="w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 relative shadow-[0_8px_25px_rgba(220,38,38,0.4)] cursor-pointer group"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.4) 0%, transparent 60%), linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(136, 19, 55, 0.95) 100%)',
            borderColor: 'rgba(239, 68, 68, 0.45)',
            boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.35), 0 0 15px rgba(220, 38, 38, 0.3)'
          }}
        >
          {/* Pulsing Outer Glow Ring */}
          <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-15 pointer-events-none" />
          
          {/* Liquid Glass Shine Reflection Overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-0" />
          
          <Sparkles size={18} className="text-white relative z-10 transition-transform duration-500 group-hover:rotate-12 animate-pulse" />
          
          {/* Items Count Badge */}
          <AnimatePresence>
            {continueWatchingCount > 0 && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -top-1 -right-1 bg-white text-black text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center z-20 border border-red-600 shadow-md"
              >
                {continueWatchingCount}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </button>
    </div>
  );
};

export default MobileNav;
