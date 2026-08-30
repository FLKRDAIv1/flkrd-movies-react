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
  X 
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
      '/kurdish-cc': () => import('../pages/KurdishCCPage'),
    };
    if (componentMap[to]) componentMap[to]();
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
      onClick: () => setIsMoreMenuOpen(true),
    },
  ], [getKurdishLabel, prefetchPage, navigate]);

  const getActiveTabId = () => {
    if (isMoreMenuOpen) return 'more';
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/discover')) return 'discover';
    if (path.startsWith('/dubbed')) return 'dubbed';
    return 'home';
  };

  const handleSearchSubmit = (query: string) => {
    navigate(`/search?query=${encodeURIComponent(query)}`);
  };

  const drawerItems = useMemo(() => [
    {
      label: isRtl ? 'زنجیرەکان' : 'TV Shows',
      icon: <Tv size={20} />,
      onClick: () => {
        prefetchPage('/tv');
        setIsMoreMenuOpen(false);
        navigate('/tv');
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

      {/* Floating Bottom Sheet Menu Drawer for More */}
      <Portal id="mobile-more-menu-portal">
        <AnimatePresence>
          {isMoreMenuOpen && (
            <>
              {/* Fast Hardware Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setIsMoreMenuOpen(false)}
                className="fixed inset-0 bg-black/75 z-[99998] transform-gpu"
                style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
              />

              {/* Bottom Sheet Container */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className={`fixed bottom-0 inset-x-0 border-t rounded-t-[32px] p-6 pb-12 z-[99999] flex flex-col gap-4 shadow-2xl transform-gpu select-none ${
                  theme === 'light'
                    ? 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-400/40'
                    : 'bg-[#0c0c0e] border-white/15 text-white shadow-black/95'
                }`}
                style={{
                  paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))',
                  contain: 'strict',
                  willChange: 'transform',
                  transform: 'translateZ(0)'
                }}
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {/* Header Slider Handle */}
                <div className={`w-10 h-1 rounded-full mx-auto mb-1 ${theme === 'light' ? 'bg-zinc-300' : 'bg-white/20'}`} />

                <div className={`flex items-center justify-between border-b pb-3 ${theme === 'light' ? 'border-zinc-200' : 'border-white/10'}`}>
                  <h3 className={`text-sm font-black uppercase tracking-wider ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>
                    {getKurdishLabel('more')}
                  </h3>
                  <button 
                    onClick={() => setIsMoreMenuOpen(false)}
                    className={`p-2 border rounded-xl transition-all active:scale-90 touch-manipulation ${
                      theme === 'light' 
                        ? 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-red-600 hover:text-white' 
                        : 'bg-white/5 border-white/10 text-white hover:bg-red-600'
                    }`}
                    aria-label="Close menu"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 py-1">
                  {drawerItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => item.onClick()}
                      className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border transition-transform duration-100 active:scale-95 relative touch-manipulation cursor-pointer ${
                        theme === 'light'
                          ? 'bg-zinc-50 border-zinc-200/80 hover:bg-zinc-100 hover:border-red-500/40 text-zinc-800 shadow-sm'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-red-500/30 text-zinc-300'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                        {item.icon}
                      </div>
                      
                      <span className={`text-[10px] font-bold uppercase tracking-wider text-center ${
                        theme === 'light' ? 'text-zinc-800' : 'text-zinc-300'
                      }`}>
                        {item.label}
                      </span>

                      {item.count !== undefined && item.count > 0 && (
                        <span className="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-black rounded-full min-w-4 h-4 px-1 flex items-center justify-center border border-black shadow">
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


