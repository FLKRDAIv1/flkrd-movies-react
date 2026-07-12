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

const MobileNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { glassConfig, mobileNavConfig } = useUI();
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

  if (!mobileNavConfig) return null;

  // Custom colors helper
  const r = mobileNavConfig.colorR ?? 220;
  const g = mobileNavConfig.colorG ?? 38;
  const b = mobileNavConfig.colorB ?? 38;

  // Dynamically map items based on server_config visibilities
  const items = [
    ...(mobileNavConfig.showHome === 1 ? [{ id: 0, icon: <Home size={mobileNavConfig.iconSize} />, labelKey: "home" as const, to: "/" }] : []),
    ...(mobileNavConfig.showTrending === 1 ? [{ id: 1, icon: <PlayCircle size={mobileNavConfig.iconSize} />, labelKey: "trendingToday" as const, to: "/shorts" }] : []),
    ...(mobileNavConfig.showTv === 1 ? [{ id: 2, icon: <Tv size={mobileNavConfig.iconSize} />, labelKey: "tvShows" as const, to: "/tv" }] : []),
    ...(mobileNavConfig.showDubbed === 1 ? [{ id: 3, icon: <Mic2 size={mobileNavConfig.iconSize} />, labelKey: "dubbedMovies" as const, to: "/dubbed" }] : []),
    ...(mobileNavConfig.showStudios === 1 ? [{ id: 4, icon: <Film size={mobileNavConfig.iconSize} />, labelKey: "studios" as const, to: "/studios" }] : []),
    ...(mobileNavConfig.showDiscover === 1 ? [{ id: 5, icon: <Globe size={mobileNavConfig.iconSize} />, labelKey: "discover" as const, to: "/discover" }] : []),
    ...(mobileNavConfig.showList === 1 ? [{ id: 6, icon: <Bookmark size={mobileNavConfig.iconSize} />, labelKey: "myList" as const, to: "/my-list" }] : []),
    ...(mobileNavConfig.showSearch === 1 ? [{ id: 7, icon: <Search size={mobileNavConfig.iconSize} />, labelKey: "search" as const, to: "/search" }] : []),
  ];

  // ── BACKGROUND STYLE GENERATORS ──
  const getBgStyle = () => {
    switch (mobileNavConfig.bgType) {
      case 1: // Pure Glassmorphism
        return {
          background: `rgba(10, 10, 10, ${mobileNavConfig.darkOpacity / 100})`,
        };
      case 2: // Solid Matte Black
        return {
          background: '#070708',
        };
      case 3: // Burgundy Wine Glass / Custom Colored Tinted Glass
        return {
          background: `linear-gradient(135deg, rgba(${Math.max(10, r - 100)}, ${Math.max(5, g - 100)}, ${Math.max(5, b - 100)}, 0.94) 0%, rgba(10, 3, 3, 0.96) 100%)`,
        };
      case 0: // Liquid Glass (Gradient)
      default:
        return {
          background: `linear-gradient(135deg, rgba(${Math.max(10, r - 150)}, ${Math.max(5, g - 150)}, ${Math.max(5, b - 150)}, 0.92) 0%, rgba(8, 3, 3, 0.96) 100%)`,
        };
    }
  };

  // ── ACTIVE PILL STYLE GENERATORS ──
  const getActivePillStyle = () => {
    const radius = mobileNavConfig.borderRadius === 9999 ? 9999 : mobileNavConfig.borderRadius - 4;
    switch (mobileNavConfig.pillType) {
      case 1: // Custom Color Border Outline
        return {
          background: `rgba(${r}, ${g}, ${b}, 0.08)`,
          borderColor: `rgba(${r}, ${g}, ${b}, 0.45)`,
          borderWidth: '1px',
          boxShadow: `0 0 10px rgba(${r}, ${g}, ${b}, 0.15)`,
          borderRadius: `${radius}px`
        };
      case 2: // Ice White Glass
        return {
          background: 'rgba(255, 255, 255, 0.08)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: '1px',
          boxShadow: '0 0 12px rgba(255, 255, 255, 0.1)',
          borderRadius: `${radius}px`
        };
      case 0: // Solid Custom Color Gradient
      default:
        return {
          background: `linear-gradient(135deg, rgb(${r}, ${g}, ${b}) 0%, rgba(${r}, ${g}, ${b}, 0.7) 100%)`,
          borderColor: `rgba(${r}, ${g}, ${b}, 0.3)`,
          borderWidth: '1px',
          boxShadow: `0 3px 10px rgba(${r}, ${g}, ${b}, 0.4)`,
          borderRadius: `${radius}px`
        };
    }
  };

  return (
    <div 
      className="global-mobilenav fixed left-0 right-0 mx-auto z-[9999] md:hidden pointer-events-auto overflow-visible flex items-center justify-between gap-2.5"
      style={{ 
        width: `${mobileNavConfig.capsuleWidth}%`,
        bottom: `calc(${mobileNavConfig.bottomOffset}px + env(safe-area-inset-bottom, 0px))`
      }}
    >
      
      {/* 1. Main Scrollable Capsule */}
      <div 
        className="flex-1 border transition-all duration-300 relative overflow-hidden flex items-center"
        style={{
          height: `${mobileNavConfig.height}px`,
          borderRadius: `${mobileNavConfig.borderRadius}px`,
          ...getBgStyle(),
          backdropFilter: mobileNavConfig.bgType === 2 ? 'none' : `blur(${mobileNavConfig.blurAmount}px) saturate(140%)`,
          WebkitBackdropFilter: mobileNavConfig.bgType === 2 ? 'none' : `blur(${mobileNavConfig.blurAmount}px) saturate(140%)`,
          borderStyle: 'solid',
          borderColor: `rgba(${r}, ${g}, ${b}, ${mobileNavConfig.borderOpacity / 100})`,
          boxShadow: `
            inset 0 1px 0 0 rgba(255, 255, 255, 0.08),
            inset 0 0 15px rgba(${r}, ${g}, ${b}, ${mobileNavConfig.bgType === 2 ? '0' : '0.1'}),
            0 15px 30px rgba(0,0,0,0.8)
          `
        }}
      >
        {/* Edge gradient masks for scroll indication */}
        <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/20 to-transparent pointer-events-none z-20" />
        <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black/20 to-transparent pointer-events-none z-20" />

        {/* Dynamic Liquid Shine Overlay for bgType = 0 */}
        {mobileNavConfig.bgType === 0 && (
          <div 
            className="absolute inset-0 pointer-events-none mix-blend-color-dodge opacity-50 z-0"
            style={{
              background: `radial-gradient(circle at 50% 0%, rgba(${r}, ${g}, ${b}, ${mobileNavConfig.redOpacity / 100}) 0%, transparent 60%)`,
            }}
          />
        )}

        {/* Scrollable Container */}
        <div 
          ref={scrollContainerRef}
          className="w-full h-full flex items-center overflow-x-auto scrollbar-none scroll-smooth px-3 py-1 select-none"
          style={{
            gap: `${mobileNavConfig.itemsGap}px`,
            maskImage: 'linear-gradient(to right, transparent, white 8px, white calc(100% - 8px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, white 8px, white calc(100% - 8px), transparent)'
          }}
        >
          {items.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            const pillRadius = mobileNavConfig.borderRadius === 9999 ? 9999 : mobileNavConfig.borderRadius - 4;

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
                  style={{
                    width: `${Math.max(24, (mobileNavConfig.height || 48) - 12)}px`,
                    height: `${Math.max(24, (mobileNavConfig.height || 48) - 12)}px`,
                    borderRadius: `${pillRadius}px`
                  }}
                  className="flex items-center justify-center transition-colors duration-200 relative text-red-200/50 hover:text-white hover:bg-white/5"
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-active-pill"
                      className="absolute inset-0 z-0"
                      style={getActivePillStyle()}
                      transition={{ 
                        type: "spring", 
                        stiffness: 420 * ((glassConfig.elasticity || 0.35) / 0.35), 
                        damping: 32 * (0.35 / Math.max(0.01, glassConfig.elasticity || 0.35)) 
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

      {/* 2. Floating Circular Sparkles Button */}
      {mobileNavConfig.showSparkles === 1 && (
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('flkrd_toggle_continue_watching'));
          }}
          aria-label="Continue Watching Portal"
          className="focus:outline-none flex-shrink-0 relative overflow-visible animate-fadeIn"
        >
          <motion.div
            whileHover={{ scale: 1.08, y: -1 }}
            whileTap={{ scale: 0.92 }}
            className="rounded-full flex items-center justify-center border transition-all duration-300 relative cursor-pointer group"
            style={{
              width: `${mobileNavConfig.height}px`,
              height: `${mobileNavConfig.height}px`,
              background: `radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.4) 0%, transparent 60%), linear-gradient(135deg, rgb(${r}, ${g}, ${b}) 0%, rgba(${Math.max(10, r - 50)}, ${Math.max(5, g - 50)}, ${Math.max(5, b - 50)}, 0.95) 100%)`,
              borderColor: `rgba(${r}, ${g}, ${b}, 0.45)`,
              boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, 0.35), 0 0 15px rgba(${r}, ${g}, ${b}, 0.35)`,
              borderRadius: `${mobileNavConfig.borderRadius}px`
            }}
          >
            {/* Pulsing Glow Ring */}
            <div 
              className="absolute inset-0 rounded-full border animate-ping opacity-15 pointer-events-none" 
              style={{ 
                borderColor: `rgb(${r}, ${g}, ${b})`,
                borderRadius: `${mobileNavConfig.borderRadius}px`
              }}
            />
            
            {/* Liquid Glass Shine Reflection Overlay */}
            <div 
              className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-0" 
              style={{ borderRadius: `${mobileNavConfig.borderRadius}px` }}
            />
            
            <Sparkles size={mobileNavConfig.iconSize + 2} className="text-white relative z-10 transition-transform duration-500 group-hover:rotate-12 animate-pulse" />
            
            {/* Badge Count */}
            <AnimatePresence>
              {continueWatchingCount > 0 && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-1 -right-1 bg-white text-black text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center z-20 border shadow-md"
                  style={{ borderColor: `rgb(${r}, ${g}, ${b})` }}
                >
                  {continueWatchingCount}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </button>
      )}
    </div>
  );
};

export default MobileNav;
