import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Search, 
  Cog, 
  History, 
  X,
  User,
  Download
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import Portal from './Portal';
import { MorphingDiscoveryBar, Category } from './ui/morphing-discovery-bar';
import { cn } from '../lib/utils';

const MobileNav: React.FC = () => {
  const { language } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setIsSettingsOpen, mobileNavConfig } = useUI();
  
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [continueWatchingCount, setContinueWatchingCount] = useState(0);

  // Monitor localStorage to count continue watching items
  useEffect(() => {
    let timeoutId: any = null;
    const updateCount = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
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
      }, 100);
    };

    updateCount();
    window.addEventListener('storage', updateCount);
    window.addEventListener('watchProgressUpdated', updateCount);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') updateCount();
    };
    window.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('storage', updateCount);
      window.removeEventListener('watchProgressUpdated', updateCount);
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Lock background scroll & handle ESC key when More drawer is open (Apple sheet standard)
  useEffect(() => {
    if (!isMoreMenuOpen) return;
    
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoreMenuOpen]);

  const isRtl = language === 'ku' || language === 'badini';

  const getKurdishLabel = useCallback((key: string) => {
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
  }, [isRtl]);

  const prefetchPage = useCallback((to: string) => {
    const componentMap: Record<string, () => Promise<any>> = {
      '/': () => import('../pages/HomePage'),
      '/tv': () => import('../pages/TVShowsPage'),
      '/dubbed': () => import('../pages/DubbedMoviesPage'),
      '/discover': () => import('../pages/DiscoverPage'),
      '/search': () => import('../pages/SearchPage'),
      '/my-list': () => import('../pages/MyListPage'),
      '/profile': () => import('../pages/ProfilePage'),
    };
    if (componentMap[to]) componentMap[to]();
  }, []);

  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch (_) {}
    }
  }, []);

  const discoveryCategories: Category[] = useMemo(() => [
    {
      id: 'home',
      label: getKurdishLabel('home'),
      icon: <Home size={20} />,
      activeColor: 'rgba(239, 68, 68, 0.2)',
      activeTextColor: '#ef4444',
      to: '/',
      onClick: () => {
        setIsMoreMenuOpen(false);
        prefetchPage('/');
        navigate('/');
      },
    },
    {
      id: 'discover',
      label: getKurdishLabel('discover'),
      icon: <Globe size={20} />,
      activeColor: 'rgba(239, 68, 68, 0.2)',
      activeTextColor: '#ef4444',
      to: '/discover',
      onClick: () => {
        setIsMoreMenuOpen(false);
        prefetchPage('/discover');
        navigate('/discover');
      },
    },
    {
      id: 'dubbed',
      label: getKurdishLabel('dubbed'),
      icon: <Mic2 size={20} />,
      activeColor: 'rgba(239, 68, 68, 0.2)',
      activeTextColor: '#ef4444',
      to: '/dubbed',
      onClick: () => {
        setIsMoreMenuOpen(false);
        prefetchPage('/dubbed');
        navigate('/dubbed');
      },
    },
    {
      id: 'more',
      label: getKurdishLabel('more'),
      icon: <MoreHorizontal size={20} />,
      activeColor: 'rgba(239, 68, 68, 0.2)',
      activeTextColor: '#ef4444',
      onClick: () => {
        triggerHaptic();
        setIsMoreMenuOpen(prev => !prev);
      },
    },
  ], [getKurdishLabel, prefetchPage, navigate, triggerHaptic]);

  const getActiveTabId = () => {
    if (isMoreMenuOpen) return 'more';
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/discover')) return 'discover';
    if (path.startsWith('/dubbed')) return 'dubbed';
    return 'home';
  };

  const handleSearchSubmit = (query: string) => {
    setIsMoreMenuOpen(false);
    navigate(`/search?query=${encodeURIComponent(query)}`);
  };

  const handleDrawerItemClick = (action: () => void) => {
    triggerHaptic();
    setIsMoreMenuOpen(false);
    action();
  };

  const drawerItems = useMemo(() => [
    {
      label: isRtl ? 'زنجیرەکان' : 'TV Shows',
      icon: <Tv size={20} />,
      onClick: () => {
        prefetchPage('/tv');
        navigate('/tv');
      }
    },
    {
      label: isRtl ? 'ستۆدیۆکان' : 'Studios',
      icon: <Film size={20} />,
      onClick: () => {
        navigate('/studios');
      }
    },
    {
      label: isRtl ? 'لیستی من' : 'My List',
      icon: <Bookmark size={20} />,
      onClick: () => {
        navigate('/my-list');
      }
    },
    {
      label: isRtl ? 'گەڕان' : 'Search',
      icon: <Search size={20} />,
      onClick: () => {
        navigate('/search');
      }
    },
    {
      label: isRtl ? 'سەیرکردن' : 'History',
      icon: <History size={20} />,
      count: continueWatchingCount,
      onClick: () => {
        navigate('/continue-watching');
      }
    },
    {
      label: isRtl ? 'پڕۆفایل' : 'Profile',
      icon: <User size={20} />,
      onClick: () => {
        navigate('/profile');
      }
    },
    {
      label: isRtl ? 'ڕێکخستن' : 'Settings',
      icon: <Cog size={20} />,
      onClick: () => {
        setIsSettingsOpen(true);
      }
    },
    {
      label: isRtl ? 'داگرتنی ئەپ' : 'Install App',
      icon: <Download size={20} />,
      onClick: () => {
        window.dispatchEvent(new CustomEvent('flkrd-open-pwa-install'));
      }
    }
  ], [isRtl, prefetchPage, navigate, continueWatchingCount, setIsSettingsOpen]);

  if (!mobileNavConfig) return null;

  return (
    <>
      {/* Mobile Bottom Safe-Area Home Indicator Backdrop Filler */}
      <div 
        className={cn(
          "mobile-homebar-backdrop fixed bottom-0 inset-x-0 z-[49] pointer-events-none transition-opacity duration-200",
          theme === 'light' 
            ? "bg-white/90 border-t border-zinc-200/50" 
            : "bg-black/90 border-t border-white/[0.04]"
        )}
        style={{ height: 'env(safe-area-inset-bottom, 0px)' }}
      />

      {/* Floating Dynamic Island Mobile Navigation */}
      <div 
        className="global-mobilenav fixed inset-x-2 sm:inset-x-6 z-[999] md:hidden flex justify-center select-none pointer-events-auto transform-gpu"
        style={{
          bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
          contain: 'layout style',
          transform: 'translateZ(0)'
        }}
      >
        <MorphingDiscoveryBar
          categories={discoveryCategories}
          activeCategoryId={getActiveTabId()}
          onSearchSubmit={handleSearchSubmit}
          placeholder={isRtl ? 'گەڕان بۆ فیلم و زنجیرە...' : 'Search movies & series...'}
          isRtl={isRtl}
        />
      </div>

      {/* Floating Bottom Sheet Menu Drawer for More (Apple Design Fluid Sheet) */}
      <Portal id="mobile-more-menu-portal">
        <AnimatePresence>
          {isMoreMenuOpen && (
            <>
              {/* Apple Fluid Dimming Scrim */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                onClick={() => {
                  triggerHaptic();
                  setIsMoreMenuOpen(false);
                }}
                className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[99998] pointer-events-auto transform-gpu"
                style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
              />

              {/* Bottom Sheet Container with Apple Direct Manipulation Spring Physics */}
              <motion.div
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0.04, bottom: 0.65 }}
                onDragEnd={(_e, info) => {
                  // Velocity-projected dismissal (Apple WWDC Fluid Interfaces §5-6)
                  if (info.offset.y > 80 || info.velocity.y > 380) {
                    triggerHaptic();
                    setIsMoreMenuOpen(false);
                  }
                }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{
                  type: 'spring',
                  damping: 28,
                  stiffness: 340,
                  mass: 0.8
                }}
                className={cn(
                  "fixed bottom-0 inset-x-0 border-t rounded-t-[32px] p-5 pb-8 z-[99999] flex flex-col gap-3 shadow-2xl transform-gpu select-none pointer-events-auto",
                  theme === 'light'
                    ? "bg-white/92 backdrop-blur-3xl border-black/[0.08] text-zinc-900 shadow-[0_-20px_50px_rgba(0,0,0,0.15)]"
                    : "bg-[#121216]/92 backdrop-blur-3xl border-white/[0.14] text-white shadow-[0_-25px_60px_rgba(0,0,0,0.85)]"
                )}
                style={{
                  paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
                  contain: 'layout style',
                  willChange: 'transform',
                  transform: 'translateZ(0)'
                }}
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {/* Apple Native Pill Grab Handle */}
                <div 
                  className={cn(
                    "w-10 h-1 rounded-full mx-auto mb-1.5 cursor-grab active:cursor-grabbing transition-opacity",
                    theme === 'light' ? "bg-black/20" : "bg-white/25"
                  )} 
                />

                {/* Header Title with Optical Tracking */}
                <div className={cn(
                  "flex items-center justify-between border-b pb-2.5 px-1",
                  theme === 'light' ? "border-zinc-200/80" : "border-white/10"
                )}>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-red-600" />
                    <h3 className={cn(
                      "text-sm font-black uppercase tracking-tight",
                      theme === 'light' ? "text-zinc-900" : "text-white"
                    )}>
                      {getKurdishLabel('more')}
                    </h3>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setIsMoreMenuOpen(false);
                    }}
                    className={cn(
                      "p-2 border rounded-xl transition-transform duration-150 active:scale-95 touch-manipulation apple-press cursor-pointer",
                      theme === 'light' 
                        ? "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-red-600 hover:text-white" 
                        : "bg-white/5 border-white/10 text-white hover:bg-red-600"
                    )}
                    aria-label="Close menu"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Tactile Grid Items */}
                <div className="grid grid-cols-4 gap-2.5 py-1">
                  {drawerItems.map((item) => (
                    <button
                      type="button"
                      key={item.label}
                      onClick={() => handleDrawerItemClick(item.onClick)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-transform duration-150 active:scale-95 relative touch-manipulation cursor-pointer apple-press",
                        theme === 'light'
                          ? "bg-zinc-50/90 border-zinc-200/80 hover:bg-zinc-100 hover:border-red-500/40 text-zinc-800 shadow-sm"
                          : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-red-500/30 text-zinc-300"
                      )}
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                        {item.icon}
                      </div>
                      
                      <span className={cn(
                        "text-[10px] font-bold tracking-tight text-center leading-tight truncate max-w-full",
                        theme === 'light' ? "text-zinc-800" : "text-zinc-300"
                      )}>
                        {item.label}
                      </span>

                      {item.count !== undefined && item.count > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[8px] font-black rounded-full min-w-4 h-4 px-1 flex items-center justify-center border border-black shadow">
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

export default React.memo(MobileNav);


