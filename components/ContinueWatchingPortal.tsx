import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  X, 
  Activity, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  History,
  Home, 
  PlayCircle, 
  Tv, 
  Mic2, 
  Film, 
  Globe, 
  Bookmark, 
  Search,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { WatchProgress } from '../types';
import { IMAGE_BASE_URL_POSTER } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';

const ContinueWatchingPortal: React.FC = () => {
  const [items, setItems] = useState<WatchProgress[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { mobileNavConfig, useUI: getUI, ...uiContext } = useUI() as any;

  // Use values from custom mobile nav config or default to brand red
  const r = mobileNavConfig?.colorR ?? 220;
  const g = mobileNavConfig?.colorG ?? 38;
  const b = mobileNavConfig?.colorB ?? 38;

  const isExcludedPage = location.pathname.includes('/shorts') || location.pathname.includes('/search');

  const loadProgressHistory = useCallback(() => {
    try {
      const progressData = localStorage.getItem('watchProgress');
      if (!progressData) {
        setItems([]);
        return;
      }
      
      const progress: WatchProgress[] = JSON.parse(progressData);
      // Filter items with meaningful progress (more than 10s, not at the very end)
      const unfinished = progress
        .filter(item => {
            const duration = item.duration || 3600;
            return item.progress > 10 && item.progress < duration * 0.98;
        })
        .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
      
      setItems(unfinished);
      if (currentIndex >= unfinished.length) setCurrentIndex(0);
    } catch (e) {
      console.error("Portal Sync Error:", e);
    }
  }, [currentIndex]);

  useEffect(() => {
    loadProgressHistory();
    
    const syncHandler = () => loadProgressHistory();
    const toggleHandler = () => setIsExpanded(prev => !prev);

    window.addEventListener('storage', syncHandler);
    window.addEventListener('watchProgressUpdated', syncHandler);
    window.addEventListener('flkrd_toggle_continue_watching', toggleHandler);
    const handleVisibility = () => {
        if (document.visibilityState === 'visible') loadProgressHistory();
    };

    window.addEventListener('visibilitychange', handleVisibility);

    const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadProgressHistory();
        }
    }, 20000);

    return () => {
      window.removeEventListener('storage', syncHandler);
      window.removeEventListener('watchProgressUpdated', syncHandler);
      window.removeEventListener('flkrd_toggle_continue_watching', toggleHandler);
      window.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [loadProgressHistory]);

  const handleRemove = (e: React.MouseEvent, targetItem: WatchProgress) => {
    e.stopPropagation();
    const progress: WatchProgress[] = JSON.parse(localStorage.getItem('watchProgress') || '[]');
    const updated = progress.filter(i => !(i.id === targetItem.id && String(i.type) === String(targetItem.type)));
    localStorage.setItem('watchProgress', JSON.stringify(updated));
    
    loadProgressHistory();
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('watchProgressUpdated'));
  };

  const handleResume = (item: WatchProgress) => {
    if (String(item.type) === 'dubbed') {
        navigate(`/dubbed-details/${item.id}`);
    } else {
        navigate(`/details/${item.type}/${item.id}`);
    }
    setIsExpanded(false);
  };

  const handleNavigation = (to: string) => {
    navigate(to);
    setIsExpanded(false);
  };

  // Define pages structure for the Hub
  const pagesList = [
    { name: t('home'), to: '/', icon: <Home size={20} /> },
    { name: t('trendingToday'), to: '/shorts', icon: <PlayCircle size={20} /> },
    { name: t('tvShows'), to: '/tv', icon: <Tv size={20} /> },
    { name: t('dubbedMovies'), to: '/dubbed', icon: <Mic2 size={20} /> },
    { name: t('studios'), to: '/studios', icon: <Film size={20} /> },
    { name: t('discover'), to: '/discover', icon: <Globe size={20} /> },
    { name: t('myList'), to: '/my-list', icon: <Bookmark size={20} /> },
    { name: t('search'), to: '/search', icon: <Search size={20} /> },
  ];

  const activeItem = items[currentIndex] || items[0];
  const progressPercent = activeItem ? Math.min(100, (activeItem.progress / (activeItem.duration || 1)) * 100) : 0;

  return (
    <>
      {/* 1. Global Blurred Overlay Portal (Flkrd Hub) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-2xl z-[99999] flex items-end md:items-center justify-center p-0 md:p-4 cursor-pointer"
          >
            {/* Unified Hub Sheet */}
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full md:max-w-lg bg-[#0a0a0c]/95 border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 cursor-default text-right overflow-y-auto max-h-[90vh] md:max-h-[85vh] scrollbar-none flex flex-col gap-6"
              style={{
                borderColor: `rgba(${r}, ${g}, ${b}, 0.25)`,
                boxShadow: `0 -10px 50px rgba(${r}, ${g}, ${b}, 0.15)`
              }}
            >
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 select-none">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} style={{ color: `rgb(${r}, ${g}, ${b})` }} className="animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">پۆڕتاڵی فڵکەرد (FLKRD HUB)</span>
                </div>
                <button 
                  onClick={() => setIsExpanded(false)} 
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* SECTION: Continue Watching (Horizontal Swipe list) */}
              {items.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                      {items.length} بەردەوامبوون لە سەیرکردن ({t('continueWatching') || 'Resume'})
                    </span>
                  </div>

                  {/* Horizontal Scroll list */}
                  <div 
                    className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
                    style={{
                      maskImage: 'linear-gradient(to right, transparent, white 12px, white calc(100% - 12px), transparent)',
                      WebkitMaskImage: 'linear-gradient(to right, transparent, white 12px, white calc(100% - 12px), transparent)'
                    }}
                  >
                    {items.map((item, idx) => {
                      const itemPercent = Math.min(100, (item.progress / (item.duration || 1)) * 100);
                      return (
                        <div 
                          key={`${item.id}-${item.type}-${idx}`}
                          className="flex-shrink-0 w-36 snap-start flex flex-col gap-2 group relative cursor-pointer"
                          onClick={() => handleResume(item)}
                        >
                          {/* Poster card container */}
                          <div className="h-48 rounded-2xl overflow-hidden relative border border-white/5 shadow-lg bg-black">
                            <img 
                              src={item.poster_path?.startsWith('http') ? item.poster_path : `${IMAGE_BASE_URL_POSTER}${item.poster_path}`} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                              alt={item.title} 
                            />
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <div className="p-3 rounded-full bg-white text-black transform scale-90 group-hover:scale-100 transition-transform duration-300">
                                <Play size={16} fill="currentColor" />
                              </div>
                            </div>

                            {/* Trash remove icon */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemove(e, item);
                              }}
                              className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 border border-white/10 text-red-500 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20"
                            >
                              <Trash2 size={12} />
                            </button>

                            {/* Progress bar at the bottom */}
                            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/50 overflow-hidden">
                              <div 
                                className="h-full" 
                                style={{ 
                                  width: `${itemPercent}%`,
                                  background: `rgb(${r}, ${g}, ${b})`,
                                  boxShadow: `0 0 8px rgb(${r}, ${g}, ${b})`
                                }}
                              />
                            </div>
                          </div>

                          {/* Titles metadata */}
                          <div className="px-1 text-right select-none">
                            <h5 className="text-white text-xs font-bold truncate leading-tight group-hover:text-red-400 transition-colors">{item.title}</h5>
                            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">
                              {item.season ? `سیزن ${item.season} • ئەڵقە ${item.episode}` : (String(item.type) === 'dubbed' ? 'دۆبلاژکراو' : 'فیلم')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: More Pages (Grid list) */}
              <div className="space-y-3">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">
                  لاپەڕەکان و دۆزینەوە (Discover & Pages)
                </span>
                
                <div className="grid grid-cols-4 gap-3">
                  {pagesList.map((page, index) => {
                    const isActive = location.pathname === page.to || (page.to !== '/' && location.pathname.startsWith(page.to));
                    return (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleNavigation(page.to)}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all relative ${
                          isActive 
                            ? 'text-white border-white/20' 
                            : 'text-gray-400 border-white/5 hover:text-white hover:border-white/10'
                        }`}
                        style={{
                          background: isActive 
                            ? `rgba(${r}, ${g}, ${b}, 0.12)` 
                            : 'rgba(255, 255, 255, 0.02)',
                          borderColor: isActive ? `rgba(${r}, ${g}, ${b}, 0.4)` : undefined
                        }}
                      >
                        <div 
                          className="p-2.5 rounded-xl transition-transform duration-300"
                          style={{
                            color: isActive ? `rgb(${r}, ${g}, ${b})` : 'inherit',
                            background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent'
                          }}
                        >
                          {page.icon}
                        </div>
                        <span className="text-[10px] font-black tracking-tight text-center truncate w-full select-none">
                          {page.name}
                        </span>

                        {/* Active tiny dot indicator */}
                        {isActive && (
                          <span 
                            className="absolute bottom-1.5 w-1 h-1 rounded-full animate-pulse"
                            style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Floating Circular Desktop Trigger Button (Hidden on Mobile) */}
      <div className="flkrd-hub-portal fixed bottom-24 right-4 md:bottom-10 md:right-10 z-[100] pointer-events-none hidden md:block">
        <div className="relative flex flex-col items-end pointer-events-auto">
          {activeItem && !isExpanded && (
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              onClick={() => setIsExpanded(true)} 
              className="relative w-16 h-16 md:w-20 md:h-20 rounded-full group cursor-pointer shadow-2xl"
            >
              <div className="absolute inset-0 rounded-full bg-red-600/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <svg className="absolute inset-0 w-full h-full -rotate-90 z-20 pointer-events-none">
                <circle cx="50%" cy="50%" r="44%" className="stroke-white/10 fill-transparent" strokeWidth="4" />
                <motion.circle 
                    cx="50%" 
                    cy="50%" 
                    r="44%" 
                    style={{ stroke: `rgb(${r}, ${g}, ${b})` }} 
                    strokeWidth="4" 
                    fill="none" 
                    strokeDasharray="100 100" 
                    initial={{ strokeDashoffset: 100 }}
                    animate={{ strokeDashoffset: 100 - progressPercent }} 
                    transition={{ duration: 1.5, ease: "easeOut" }} 
                />
              </svg>

              <div className="absolute inset-1.5 md:inset-2 rounded-full overflow-hidden z-10 border border-white/20 bg-black">
                <img 
                  src={activeItem.poster_path?.startsWith('http') ? activeItem.poster_path : `${IMAGE_BASE_URL_POSTER}${activeItem.poster_path}`} 
                  className="w-full h-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110" 
                  alt="" 
                />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div 
                     className="p-2 rounded-full transition-all duration-500 text-white"
                     style={{ 
                       backgroundColor: `rgb(${r}, ${g}, ${b})`,
                       boxShadow: `0 0 20px rgba(${r}, ${g}, ${b}, 0.6)`
                     }}
                   >
                      <Sparkles size={18} className="animate-pulse" />
                   </div>
                </div>
              </div>

              {items.length > 1 && (
                <div 
                  className="absolute -top-1 -right-1 text-black rounded-full min-w-[22px] h-[22px] flex items-center justify-center z-30 shadow-2xl border-2 border-black bg-white"
                >
                    <span className="text-[10px] font-black">{items.length}</span>
                </div>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </>
  );
};

export default ContinueWatchingPortal;
