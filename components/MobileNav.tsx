import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
      {/* Bottom NotchNavbar for Mobile (Flipped shape of the Header Notch) */}
      <div 
        className="global-mobilenav fixed bottom-0 inset-x-0 z-[999] md:hidden flex flex-col transition-all duration-300 w-full select-none pointer-events-auto"
        style={{ height: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
        dir="ltr"
      >
        {/* Curved Notch Navigation Bar Content (64px height) */}
        <div className="h-16 w-full flex relative z-10">
          
          {/* Left Side Bar - Flexible width */}
          <div className={cn("flex-grow h-10 self-end transition-all duration-300 relative min-w-0", notchBgClass)}>
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="24.5" x2="100%" y2="24.5" stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} className={notchStrokeClass} />
              <line x1="0" y1="27.5" x2="100%" y2="27.5" stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} className={notchStrokeClass} />
            </svg>
          </div>

          {/* Responsive Bottom Notch Container */}
          <div className="flex h-16 relative z-10 shrink-0 -ml-px">
            
            {/* Left Slice (Corner Curve Flipped) */}
            <div className="w-[40px] h-full relative shrink-0">
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 50 64" preserveAspectRatio="none">
                <path 
                  d="M -1 64 H 51 V 0 C 25 0 25 24 -1 24 Z" 
                  className={cn("transition-all duration-300", isDarkNavbar ? "fill-black" : "fill-white")} 
                />
                <path d="M0 24.5 C25 24.5 25 0.5 50 0.5" fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} className={notchStrokeClass} />
                <path d="M0 27.5 C25 27.5 25 3.5 50 3.5" fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} className={notchStrokeClass} />
              </svg>
            </div>

            {/* Center Slice (Content Area - Fits 5 items) */}
            <div className={cn("flex h-full relative transition-all duration-300 w-[230px] min-[375px]:w-[270px] min-[414px]:w-[310px] -ml-px", notchBgClass)}>
               <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                 <line x1="0" y1="0.5" x2="100%" y2="0.5" stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} className={notchStrokeClass} />
                 <line x1="0" y1="3.5" x2="100%" y2="3.5" stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} className={notchStrokeClass} />
               </svg>

               {/* Bottom Navigation Buttons (RTL for text, LTR flex layout) */}
               <div className="relative w-full h-full flex items-center justify-around pb-1 px-1.5" dir={isRtl ? 'rtl' : 'ltr'}>
                 {mainItems.map((item) => {
                   const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));

                   return (
                     <NavLink
                       key={item.id}
                       to={item.to}
                       className="flex flex-col items-center justify-center w-10 h-10 min-[375px]:w-12 min-[375px]:h-12 flex-1 relative select-none focus:outline-none"
                     >
                       <div className={cn(
                         "flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-xl transition-all duration-300",
                         isActive 
                           ? 'text-red-500 bg-red-500/10 border border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.12)]' 
                           : (isDarkNavbar ? 'text-zinc-400 hover:text-white border-transparent' : 'text-zinc-600 hover:text-black border-transparent')
                       )}>
                         {item.icon}
                         <span className="text-[7px] font-black uppercase tracking-widest leading-none">
                           {getKurdishLabel(item.labelKey)}
                         </span>
                       </div>
                     </NavLink>
                   );
                 })}

                 {/* More Button */}
                 <button
                   onClick={() => setIsMoreMenuOpen(true)}
                   className="flex flex-col items-center justify-center w-10 h-10 min-[375px]:w-12 min-[375px]:h-12 flex-1 relative select-none focus:outline-none"
                 >
                   <div className={cn(
                     "flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-xl transition-all duration-300",
                     isMoreMenuOpen 
                       ? 'text-red-500 bg-red-500/10 border border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.12)]' 
                       : (isDarkNavbar ? 'text-zinc-400 hover:text-white border-transparent' : 'text-zinc-600 hover:text-black border-transparent')
                   )}>
                     <MoreHorizontal size={18} />
                     <span className="text-[7px] font-black uppercase tracking-widest leading-none">
                       {getKurdishLabel('more')}
                     </span>
                   </div>
                 </button>
               </div>
            </div>

            {/* Right Slice (Corner Curve Flipped) */}
            <div className="w-[40px] h-full relative shrink-0 -ml-px">
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 50 64" preserveAspectRatio="none">
                <path 
                  d="M -1 64 H 51 V 24 C 25 24 25 0 -1 0 Z" 
                  className={cn("transition-all duration-300", isDarkNavbar ? "fill-black" : "fill-white")} 
                />
                <path d="M0 0.5 C25 0.5 25 24.5 50 24.5" fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} className={notchStrokeClass} />
                <path d="M0 3.5 C25 3.5 25 27.5 50 27.5" fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} className={notchStrokeClass} />
              </svg>
            </div>

          </div>

          {/* Right Side Bar - Flexible width */}
          <div className={cn("flex-grow h-10 self-end transition-all duration-300 relative min-w-0 -ml-px", notchBgClass)}>
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="24.5" x2="100%" y2="24.5" stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} className={notchStrokeClass} />
              <line x1="0" y1="27.5" x2="100%" y2="27.5" stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} className={notchStrokeClass} />
            </svg>
          </div>

        </div>

        {/* Bottom safe-area home-indicator background filler */}
        <div 
          className={cn("w-full transition-all duration-300 relative z-0", notchBgClass)} 
          style={{ height: 'env(safe-area-inset-bottom, 0px)' }}
        />
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
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
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
                      onClick={item.onClick}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 active:scale-95 relative"
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
