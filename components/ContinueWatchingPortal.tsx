
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Zap, Activity, Trash2, ChevronRight, ChevronLeft, History } from 'lucide-react';
import { WatchProgress } from '../types';
import { IMAGE_BASE_URL_POSTER } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';

const ContinueWatchingPortal: React.FC = () => {
  const [items, setItems] = useState<WatchProgress[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

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
    window.addEventListener('storage', syncHandler);
    window.addEventListener('watchProgressUpdated', syncHandler);
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') loadProgressHistory();
    });

    const interval = setInterval(loadProgressHistory, 5000);
    return () => {
      window.removeEventListener('storage', syncHandler);
      window.removeEventListener('watchProgressUpdated', syncHandler);
      window.removeEventListener('visibilitychange', syncHandler);
      clearInterval(interval);
    };
  }, [loadProgressHistory]);

  const handleRemove = (e: React.MouseEvent, targetItem: WatchProgress) => {
    e.stopPropagation();
    const progress: WatchProgress[] = JSON.parse(localStorage.getItem('watchProgress') || '[]');
    const updated = progress.filter(i => !(i.id === targetItem.id && String(i.type) === String(targetItem.type)));
    localStorage.setItem('watchProgress', JSON.stringify(updated));
    
    if (items.length <= 1) {
        setIsExpanded(false);
    }
    
    loadProgressHistory();
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('watchProgressUpdated'));
  };

  const handleResume = (item: WatchProgress) => {
    // ROUTING: Use dedicated dubbed details route if type matches
    if (String(item.type) === 'dubbed') {
        navigate(`/dubbed-details/${item.id}`);
    } else {
        navigate(`/details/${item.type}/${item.id}`);
    }
    setIsExpanded(false);
  };

  if (items.length === 0 || isExcludedPage) return null;

  const activeItem = items[currentIndex] || items[0];
  const progressPercent = Math.min(100, (activeItem.progress / (activeItem.duration || 1)) * 100);

  return (
    <div className="fixed bottom-24 right-4 md:bottom-10 md:right-10 z-[100] pointer-events-none">
      <div className="relative flex flex-col items-end pointer-events-auto">
        
        <AnimatePresence>
          {isExpanded && (activeItem) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
              className="mb-4 w-[300px] md:w-[380px] bg-[#0c0c0c] border border-white/10 rounded-[2.5rem] p-6 shadow-[0_50px_100px_rgba(0,0,0,1)] overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Activity size={12} className="text-red-600 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">RESUME MODULE {currentIndex + 1}/{items.length}</span>
                  </div>
                  <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <div className="relative flex gap-5 mb-6">
                    <div className="w-20 h-28 rounded-2xl overflow-hidden flex-shrink-0 border border-white/5 shadow-2xl bg-black">
                        <img 
                          src={activeItem.poster_path?.startsWith('http') ? activeItem.poster_path : `${IMAGE_BASE_URL_POSTER}${activeItem.poster_path}`} 
                          className="w-full h-full object-cover" 
                          alt="" 
                        />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <h4 className="text-white text-lg font-black uppercase italic tracking-tighter truncate mb-1">{activeItem.title}</h4>
                        <div className="flex items-center gap-2 mb-2">
                            {activeItem.season ? (
                                <>
                                    <span className="bg-red-600/20 text-red-500 text-[8px] font-black px-2 py-0.5 rounded border border-red-600/20 uppercase tracking-widest">Season {activeItem.season}</span>
                                    <span className="text-gray-500 text-[9px] font-bold">Ep {activeItem.episode}</span>
                                </>
                            ) : (
                                <span className="bg-white/5 text-gray-500 text-[8px] font-black px-2 py-0.5 rounded border border-white/10 uppercase tracking-widest">
                                    {String(activeItem.type) === 'dubbed' ? 'Dubbed Movie' : 'Feature Film'}
                                </span>
                            )}
                        </div>
                        <div className="mt-2">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Progress</span>
                                <span className="text-[9px] font-black text-red-500 uppercase">{Math.floor(progressPercent)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    className="h-full bg-red-600 shadow-[0_0_10px_rgba(229,9,20,0.5)]" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {items.length > 1 && (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button onClick={() => setCurrentIndex(prev => (prev - 1 + items.length) % items.length)} className="py-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white transition-all">
                            <ChevronLeft size={18}/>
                        </button>
                        <button onClick={() => setCurrentIndex(prev => (prev + 1) % items.length)} className="py-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white transition-all">
                            <ChevronRight size={18}/>
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleResume(activeItem)} 
                    className="flex-1 bg-white text-black py-4 rounded-2xl font-[1000] text-[11px] uppercase tracking-[0.2em] italic flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-xl"
                  >
                    <Play size={12} fill="currentColor" /> START STREAM
                  </button>
                  <button 
                    onClick={(e) => handleRemove(e, activeItem)} 
                    className="p-4 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white rounded-2xl border border-red-600/20 transition-all active:scale-90"
                    title="Remove from history"
                  >
                    <Trash2 size={20}/>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }} 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="relative w-16 h-16 md:w-20 md:h-20 rounded-full group cursor-pointer shadow-2xl"
        >
          <div className="absolute inset-0 rounded-full bg-red-600/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <svg className="absolute inset-0 w-full h-full -rotate-90 z-20 pointer-events-none">
            <circle cx="50%" cy="50%" r="44%" className="stroke-white/10 fill-transparent" strokeWidth="4" />
            <motion.circle 
                cx="50%" 
                cy="50%" 
                r="44%" 
                className="stroke-red-600" 
                strokeWidth="4" 
                fill="none" 
                strokeDasharray="100 100" 
                initial={{ strokeDashoffset: 100 }}
                animate={{ strokeDashoffset: 100 - (activeItem ? progressPercent : 0) }} 
                transition={{ duration: 1.5, ease: "easeOut" }} 
            />
          </svg>

          <div className="absolute inset-1.5 md:inset-2 rounded-full overflow-hidden z-10 border border-white/20 bg-black">
            {activeItem && <img src={activeItem.poster_path?.startsWith('http') ? activeItem.poster_path : `${IMAGE_BASE_URL_POSTER}${activeItem.poster_path}`} className="w-full h-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110" alt="" />}
            <div className="absolute inset-0 flex items-center justify-center">
               <div className={`p-2 rounded-full transition-all duration-500 ${isExpanded ? 'bg-white text-black' : 'bg-red-600 text-white shadow-[0_0_20px_rgba(229,9,20,0.6)]'}`}>
                  {isExpanded ? <X size={18} /> : <History size={18} />}
               </div>
            </div>
          </div>

          {items.length > 1 && !isExpanded && (
            <div className="absolute -top-1 -right-1 bg-white text-black rounded-full min-w-[22px] h-[22px] flex items-center justify-center z-30 shadow-2xl border-2 border-black">
                <span className="text-[10px] font-black">{items.length}</span>
            </div>
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default ContinueWatchingPortal;
