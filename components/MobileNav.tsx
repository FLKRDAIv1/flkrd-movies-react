import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Globe, 
  Tv, 
  Mic2, 
  MoreHorizontal, 
  Bookmark, 
  Film, 
  PlayCircle, 
  Search, 
  Cog, 
  History, 
  X 
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import Portal from './Portal';
import { cn } from '../lib/utils';

const MobileNav: React.FC = () => {
  const { t, language } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setIsSettingsOpen, glassConfig, mobileNavConfig } = useUI();
  
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [continueWatchingCount, setContinueWatchingCount] = useState(0);

  // Monitor localStorage to count continue watching items
  useEffect(() => {
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

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') updateCount();
    };
    window.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('storage', updateCount);
      window.removeEventListener('watchProgressUpdated', updateCount);
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  if (!mobileNavConfig) return null;

  const isRtl = language === 'ku' || language === 'badini';

  // Kurdish Localization for bottom bar items
  const getKurdishLabel = (key: string) => {
    if (isRtl) {
      if (key === 'home') return 'سەرەکی';
      if (key === 'discover') return 'دۆزینەوە';
      if (key === 'tvShows') return 'زنجیرە';
      if (key === 'dubbed') return 'دۆبلاژ';
      if (key === 'more') return 'زیاتر';
    }
    if (key === 'home') return 'Home';
    if (key === 'discover') return 'Discover';
    if (key === 'tvShows') return 'TV';
    if (key === 'dubbed') return 'Dubbed';
    if (key === 'more') return 'More';
    return key;
  };

  const isDarkNavbar = theme === 'light';
  
  const notchBgClass = isDarkNavbar
    ? "bg-black"
    : "bg-white";

  const notchStrokeClass = isDarkNavbar 
    ? "text-zinc-800" 
    : "text-zinc-200";

  // Center notch buttons
  const mainItems = [
    { id: 'home', icon: <Home size={18} />, labelKey: 'home', to: '/' },
    { id: 'discover', icon: <Globe size={18} />, labelKey: 'discover', to: '/discover' },
    { id: 'tvShows', icon: <Tv size={18} />, labelKey: 'tvShows', to: '/tv' },
    { id: 'dubbed', icon: <Mic2 size={18} />, labelKey: 'dubbed', to: '/dubbed' },
  ];

  // Drawer items triggered by "More" button
  const drawerItems = [
    {
      label: isRtl ? 'ترێندینگ' : 'Trending',
      icon: <PlayCircle size={20} />,
      onClick: () => {
        setIsMoreMenuOpen(false);
        navigate('/shorts');
      }
    },
    {
      label: isRtl ? 'ستۆدیۆکان' : 'Studios',
      icon: <Film size={20} />,
      onClick: () => {
        setIsMoreMenuOpen(false);
        navigate('/studios');
      }
    },
    {
      label: isRtl ? 'لیستی من' : 'My List',
      icon: <Bookmark size={20} />,
      onClick: () => {
        setIsMoreMenuOpen(false);
        navigate('/my-list');
      }
    },
    {
      label: isRtl ? 'گەڕان' : 'Search',
      icon: <Search size={20} />,
      onClick: () => {
        setIsMoreMenuOpen(false);
        navigate('/search');
      }
    },
    {
      label: isRtl ? 'سەیرکردن' : 'History',
      icon: <History size={20} />,
      count: continueWatchingCount,
      onClick: () => {
        setIsMoreMenuOpen(false);
        navigate('/continue-watching');
      }
    },
    {
      label: isRtl ? 'ڕێکخستن' : 'Settings',
      icon: <Cog size={20} />,
      onClick: () => {
        setIsMoreMenuOpen(false);
        setIsSettingsOpen(true);
      }
    }
  ];

  return (
    <>
      {/* Floating Pill Bottom Navbar for Mobile (100% Responsive, Floating Capsule) */}
      <div 
        className="global-mobilenav fixed bottom-3 inset-x-3 sm:inset-x-6 z-[999] md:hidden flex justify-center select-none pointer-events-auto"
        dir="ltr"
      >
        <div 
          className="w-full max-w-md h-14 bg-neutral-950/85 backdrop-blur-2xl border border-white/20 rounded-full shadow-[0_12px_35px_rgba(0,0,0,0.85)] p-1 flex items-center justify-between"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {mainItems.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));

            return (
              <button
                key={item.id}
                onPointerDown={(e) => {
                  e.preventDefault();
                  navigate(item.to);
                }}
                className="flex-1 h-full flex flex-col items-center justify-center relative select-none focus:outline-none touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                <div className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-full transition-all duration-200",
                  isActive 
                    ? 'text-red-500 bg-red-500/15 border border-red-500/30 font-black shadow-[0_0_15px_rgba(239,68,68,0.25)]' 
                    : 'text-zinc-400 border-transparent'
                )}>
                  {item.icon}
                  <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                    {getKurdishLabel(item.labelKey)}
                  </span>
                </div>
              </button>
            );
          })}

          {/* More Button */}
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              setIsMoreMenuOpen(true);
            }}
            className="flex-1 h-full flex flex-col items-center justify-center relative select-none focus:outline-none touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            <div className={cn(
              "flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-full transition-all duration-200",
              isMoreMenuOpen 
                ? 'text-red-500 bg-red-500/15 border border-red-500/30 font-black shadow-[0_0_15px_rgba(239,68,68,0.25)]' 
                : 'text-zinc-400 border-transparent'
            )}>
              <MoreHorizontal size={18} />
              <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                {getKurdishLabel('more')}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Floating Bottom sheet menu drawer for More */}
      <Portal id="mobile-more-menu-portal">
        <AnimatePresence>
          {isMoreMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMoreMenuOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99998]"
              />

              {/* Bottom Sheet content container */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="fixed bottom-0 inset-x-0 bg-[#080809]/95 border-t border-white/10 rounded-t-[32px] p-6 pb-10 z-[99999] flex flex-col gap-4 shadow-[0_-15px_40px_rgba(0,0,0,0.8)]"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {/* Header line slider handle indicator */}
                <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-2" />

                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    {getKurdishLabel('more')}
                  </h3>
                  <button 
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="p-2 bg-white/5 border border-white/10 hover:bg-red-600 rounded-xl transition-all"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3.5 py-2">
                  {drawerItems.map((item) => (
                    <button
                      key={item.label}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        item.onClick();
                      }}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 active:scale-95 relative touch-manipulation"
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                        {item.icon}
                      </div>
                      
                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-300">
                        {item.label}
                      </span>

                      {/* Optional item badge count */}
                      {item.count !== undefined && item.count > 0 && (
                        <span className="absolute top-2 right-2 bg-red-600 text-white text-[7px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-black shadow">
                          {item.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
};

export default MobileNav;
