import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic2, Search, X, Flame, Sparkles, Star, Clapperboard, 
  Play, Info, Filter, RefreshCw, ShieldAlert, Plus
} from 'lucide-react';
import { Content, WatchProgress } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { MovieLayoutManager } from '../components/MovieLayoutManager';
import { SkeletonGrid } from '../components/Skeleton';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import { bannedService } from '../services/bannedService';
import Row from '../components/Row';

const DUBBED_FILTERS = [
  { id: 'all', labelKu: 'هەموو', labelEn: 'All' },
  { id: 'king', labelKu: '👑 ئاستی KING', labelEn: 'KING Tier' },
  { id: 'action', labelKu: 'ئاکشن', labelEn: 'Action' },
  { id: 'animation', labelKu: 'ئەنیمەیشن', labelEn: 'Animation' },
  { id: 'comedy', labelKu: 'کۆمیدی', labelEn: 'Comedy' },
  { id: 'drama', labelKu: 'دراما', labelEn: 'Drama' },
];

const INITIAL_BATCH = 60;
const BATCH_SIZE = 60;

// High-Performance In-Memory Cache for 0ms Instant Page Switches
let memoryDubbedCache: Content[] | null = null;

const formatDubbedItems = (rawItems: any[], bannedIds: Set<string> = new Set()): Content[] => {
  const items = (rawItems || [])
    .filter((m: any) => {
      const idStr = String(m.id);
      const cleanId = idStr.replace('custom_', '');
      return !bannedIds.has(idStr) && !bannedIds.has(cleanId);
    })
    .map((m: any) => ({
      ...m,
      id: String(m.id).startsWith('custom_') ? m.id : `custom_${m.id}`,
      media_type: 'dubbed',
      poster_path: m.poster_path || (m.imageBase64 && m.imageBase64.startsWith('http') ? m.imageBase64 : '') || '/default-poster.svg',
      backdrop_path: m.backdrop_path || (m.bannerBase64 && m.bannerBase64.startsWith('http') ? m.bannerBase64 : '') || m.poster_path || '/default-poster.svg',
      title: m.title || m.kurdishTitle || 'Untitled Dubbed Movie',
      kurdishTitle: m.kurdishTitle || m.title,
      overview: m.description || m.kurdishOverview || m.overview || '',
      kurdishOverview: m.kurdishOverview || m.description || m.overview || '',
      customStream: m.videoUrl || m.customStream || '',
      level: m.level || 'KING',
      release_date: m.created_at ? m.created_at.split('T')[0] : '2026',
    }));

  // Client-side instant sort (0ms overhead, avoids Supabase 57014 statement timeout)
  items.sort((a: any, b: any) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });

  return items;
};

const DubbedMoviesPage: React.FC = () => {
  // Initialize with cached in-memory movies immediately (0ms perceived load)
  const [movies, setMovies] = useState<Content[]>(() => memoryDubbedCache || []);
  const [loading, setLoading] = useState<boolean>(() => !memoryDubbedCache || memoryDubbedCache.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [continueWatchingDubbed, setContinueWatchingDubbed] = useState<WatchProgress[]>([]);
  const [displayCount, setDisplayCount] = useState(INITIAL_BATCH);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { theme, isAdmin, setIsAdminModalOpen } = useUI();
  const { addNotification } = useNotification();
  const isRtl = language === 'ku' || language === 'badini';

  const isDarkMode = theme === 'dark';

  // Load Dubbed Continue Watching
  const loadDubbedProgress = () => {
    try {
      const data = localStorage.getItem('watchProgress');
      if (!data) {
        setContinueWatchingDubbed([]);
        return;
      }
      const progress: WatchProgress[] = JSON.parse(data);
      const unfinished = progress
        .filter((item: WatchProgress) => {
          const isDub = item.type === 'dubbed' || (item as any).media_type === 'dubbed' || String(item.id).startsWith('custom_');
          const dur = item.duration || 5400;
          return isDub && item.progress > 3 && item.progress < dur * 0.98;
        })
        .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
      setContinueWatchingDubbed(unfinished);
    } catch (e) {
      setContinueWatchingDubbed([]);
    }
  };

  useEffect(() => {
    loadDubbedProgress();
    window.addEventListener('watchProgressUpdated', loadDubbedProgress);
    window.addEventListener('storage', loadDubbedProgress);
    return () => {
      window.removeEventListener('watchProgressUpdated', loadDubbedProgress);
      window.removeEventListener('storage', loadDubbedProgress);
    };
  }, []);

  // Lightning Fast Dubbed Movies Fetch with Stale-While-Revalidate (SWR)
  const fetchDubbedMovies = async (isManualRefresh = false) => {
    // Only trigger full blocking screen loader if we have zero cached items
    if (!memoryDubbedCache || memoryDubbedCache.length === 0) {
      setLoading(true);
    }
    if (isManualRefresh) {
      setIsRefreshing(true);
    }

    // Mobile network timeout guard: Never leave users stuck on infinite loading
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      setIsRefreshing(false);
    }, 4000);

    try {
      // 1. Instant Cache Hydration from IndexedDB (renders in 10-20ms on cold start)
      if (!memoryDubbedCache || memoryDubbedCache.length === 0) {
        try {
          const cached = await db.getMovies();
          if (cached && cached.length > 0) {
            const formattedCached = formatDubbedItems(cached);
            if (formattedCached.length > 0) {
              memoryDubbedCache = formattedCached;
              setMovies(formattedCached);
              setLoading(false); // Immediate visual unlock for user!
            }
          }
        } catch (cacheErr) {
          console.warn('[DUBBED] Local cache read error:', cacheErr);
        }
      }

      // 2. Parallel Network Fetch (Supabase without server-side sort to avoid 57014 timeout)
      const [supabaseResult, bannedIds] = await Promise.all([
        supabase
          .from('dubbed_movies')
          .select('id, title, kurdishTitle, description, kurdishOverview, poster_path, backdrop_path, videoUrl, customStream, level, created_at, tmdb_id, imdb_id')
          .limit(500),
        bannedService.fetchBannedList().catch(() => new Set<string>()),
      ]);

      const { data, error } = supabaseResult;
      if (!error && data && data.length > 0) {
        const freshFormatted = formatDubbedItems(data, bannedIds);
        memoryDubbedCache = freshFormatted;
        setMovies(freshFormatted);
        // Persist to IndexedDB asynchronously
        db.saveMovies(data).catch(() => {});
      } else if (error) {
        console.warn('[DUBBED] Supabase fetch fallback triggered:', error);
        const fallback = await db.getMovies().catch(() => []);
        if (fallback && fallback.length > 0) {
          const formatted = formatDubbedItems(fallback, bannedIds);
          memoryDubbedCache = formatted;
          setMovies(formatted);
        }
      }
    } catch (err) {
      console.error('[DUBBED] Error loading dubbed movies:', err);
      const fallback = await db.getMovies().catch(() => []);
      if (fallback && fallback.length > 0) {
        const formatted = formatDubbedItems(fallback);
        memoryDubbedCache = formatted;
        setMovies(formatted);
      } else if (!memoryDubbedCache || memoryDubbedCache.length === 0) {
        addNotification({
          type: 'error',
          title: isRtl ? 'هەڵە لە بارکردن' : 'Load Error',
          message: isRtl ? 'نەتوانرا لیستەکە باربکرێت.' : 'Failed to load dubbed titles.',
        });
      }
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDubbedMovies();
  }, []);

  // Filter & Search computation
  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      // 1. Text Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (m.title || '').toLowerCase().includes(q) || (m.kurdishTitle || '').toLowerCase().includes(q);
        const descMatch = (m.overview || '').toLowerCase().includes(q) || (m.kurdishOverview || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch) return false;
      }

      // 2. Category / Tier Filter
      if (activeFilter === 'king') {
        return (m.level || '').toUpperCase() === 'KING';
      }
      if (activeFilter !== 'all') {
        const text = `${m.title} ${m.kurdishTitle} ${m.overview} ${m.kurdishOverview}`.toLowerCase();
        if (activeFilter === 'action' && !text.includes('ئاکشن') && !text.includes('action')) return false;
        if (activeFilter === 'animation' && !text.includes('ئەنیمەیشن') && !text.includes('animation') && !text.includes('کارتۆن')) return false;
        if (activeFilter === 'comedy' && !text.includes('کۆمیدی') && !text.includes('comedy') && !text.includes('پێکەنین')) return false;
        if (activeFilter === 'drama' && !text.includes('دراما') && !text.includes('drama')) return false;
      }

      return true;
    });
  }, [movies, searchQuery, activeFilter]);

  // Reset display batch to 20 when search or filter changes
  useEffect(() => {
    setDisplayCount(INITIAL_BATCH);
  }, [searchQuery, activeFilter]);

  // Progressive 20-item windowing to prevent DOM memory bloat and layout thrashing
  const visibleMovies = useMemo(() => {
    return filteredMovies.slice(0, displayCount);
  }, [filteredMovies, displayCount]);

  const hasMore = displayCount < filteredMovies.length;

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayCount(prev => Math.min(prev + BATCH_SIZE, filteredMovies.length));
      }
    }, { rootMargin: '600px' });
    observerRef.current.observe(node);
  }, [filteredMovies.length]);

  return (
    <div className={`min-h-screen pt-24 sm:pt-28 md:pt-32 pb-36 px-3 sm:px-6 md:px-12 max-w-[1920px] mx-auto select-none w-full overflow-x-hidden transition-colors duration-300 ${
      isDarkMode ? 'text-white' : 'text-zinc-900'
    }`}>
      
      {/* 🌟 Header Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0">
            <Mic2 size={22} />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-black ${isRtl ? 'font-kurdish' : 'tracking-tight'}`}>
              {isRtl ? 'فیلمە دۆبلاژکراوە کوردییەکان' : 'Kurdish Dubbed Movies'}
            </h1>
            <p className={`text-xs font-bold mt-0.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {movies.length} {isRtl ? 'فیلمی دۆبلاژکراوی کوالیتی باڵا' : 'Premium Dubbed Titles'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isAdmin && (
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>{isRtl ? 'زیادکردنی فیلم' : 'Add Movie'}</span>
            </button>
          )}

          <button
            onClick={() => {
              fetchDubbedMovies(true);
            }}
            disabled={isRefreshing}
            className={`p-2.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${
              isDarkMode 
                ? 'bg-zinc-900/90 border-white/10 hover:bg-zinc-800 text-zinc-300' 
                : 'bg-white border-zinc-200 hover:bg-zinc-100 text-zinc-700 shadow-sm'
            }`}
            title={isRtl ? 'نوێکردنەوەی لیست' : 'Refresh List'}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-red-500' : ''} />
          </button>
        </div>
      </div>

      {/* 🔍 Apple-Design Live Search & Filter Bar */}
      <div className={`p-3 sm:p-4 rounded-2xl md:rounded-3xl border mb-6 shadow-xl backdrop-blur-2xl transition-colors ${
        isDarkMode 
          ? 'bg-zinc-950/75 border-white/10' 
          : 'bg-white/90 border-zinc-200 shadow-zinc-200/50'
      }`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          
          {/* Search Input with True RTL/LTR Alignment */}
          <div className="relative flex-1">
            <div className={`absolute inset-y-0 ${isRtl ? 'right-3.5' : 'left-3.5'} flex items-center pointer-events-none text-zinc-400`}>
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'گەڕان بەدوای ناوی فیلمی دۆبلاژکراو...' : 'Search dubbed movies...'}
              className={`w-full py-2.5 ${isRtl ? 'pr-10 pl-10 text-right font-kurdish' : 'pl-10 pr-10 text-left'} rounded-xl text-xs sm:text-sm font-medium outline-none transition-all border ${
                isDarkMode 
                  ? 'bg-zinc-900/80 text-white placeholder-zinc-500 border-white/10 focus:border-red-500' 
                  : 'bg-zinc-100 text-zinc-900 placeholder-zinc-400 border-zinc-200 focus:border-red-500'
              }`}
              dir={isRtl ? 'rtl' : 'ltr'}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute inset-y-0 ${isRtl ? 'left-3' : 'right-3'} flex items-center text-zinc-400 hover:text-red-500 cursor-pointer`}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Filter Chips (Apple Rounded Glass Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 touch-pan-x">
            {DUBBED_FILTERS.map((f) => {
              const isActive = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer shrink-0 active:scale-95 ${
                    isActive
                      ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/35'
                      : isDarkMode
                      ? 'bg-white/[0.05] text-zinc-400 hover:text-white border-white/[0.08] hover:bg-white/[0.09]'
                      : 'bg-zinc-100 text-zinc-600 hover:text-black border-zinc-200'
                  }`}
                >
                  <span>{isRtl ? f.labelKu : f.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 📺 Continue Watching Dubbed Row */}
      {continueWatchingDubbed.length > 0 && !searchQuery.trim() && activeFilter === 'all' && (
        <div className="mb-8">
          <Row
            title={isRtl ? 'بەردەوامبوون لە سەیرکردنی دۆبلاژ' : 'Continue Watching Dubbed'}
            items={continueWatchingDubbed}
            type="dubbed"
            isProgressRow={true}
          />
        </div>
      )}

      {/* 🎬 Main Movie Grid */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-5 py-24 select-none">
            <div className="loader" />
            <p className="text-xs font-black uppercase tracking-[0.25em] text-white/60 animate-pulse">
              {isRtl ? 'فیلمە دۆبلاژکراوەکان ئامادە دەکرێن...' : 'Loading Dubbed Movies...'}
            </p>
          </div>
        ) : filteredMovies.length > 0 ? (
          <motion.div key="grid-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="flex items-center justify-between mb-4 px-1 gap-2">
              <span className={`text-xs font-bold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {isRtl 
                  ? `${visibleMovies.length} لە ${filteredMovies.length} فیلم نیشاندراوە` 
                  : `Showing ${visibleMovies.length} of ${filteredMovies.length} titles`}
              </span>

              {hasMore && (
                <button
                  onClick={() => setDisplayCount(filteredMovies.length)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition-all border border-red-500/30 shadow-sm cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  <span>{isRtl ? `نیشاندانی هەموو (${filteredMovies.length})` : `Show All (${filteredMovies.length})`}</span>
                </button>
              )}
            </div>

            {/* 3-Column Mobile & Responsive PC Grid */}
            <MovieLayoutManager items={visibleMovies} type="dubbed" />

            {/* Infinite Scroll Sentinel for Next Batch */}
            {hasMore && (
              <div 
                ref={sentinelRef} 
                className="w-full py-10 flex flex-col items-center justify-center gap-3 select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="loader scale-75" />
                  <span className="text-xs font-bold text-zinc-400">
                    {isRtl ? 'خەریکی بارکردنی بەشەکانی ترە...' : 'Loading next titles...'}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => setDisplayCount(prev => Math.min(prev + BATCH_SIZE, filteredMovies.length))}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-white/10 shadow-md cursor-pointer active:scale-95 transition-all"
                  >
                    {isRtl ? `بارکردنی ٦٠ فیلمی تر (${filteredMovies.length - visibleMovies.length} ماوە)` : `Load 60 More (${filteredMovies.length - visibleMovies.length} remaining)`}
                  </button>
                  <button
                    onClick={() => setDisplayCount(filteredMovies.length)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-all"
                  >
                    {isRtl ? `نیشاندانی هەمووی بەیەکجار (${filteredMovies.length})` : `Show All (${filteredMovies.length})`}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* Empty Search Results */
          <motion.div
            key="empty-results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-center py-20 px-4 rounded-3xl border max-w-md mx-auto ${
              isDarkMode ? 'bg-zinc-900/40 border-white/10' : 'bg-white border-zinc-200 shadow-xl'
            }`}
          >
            <Clapperboard size={48} className="mx-auto text-zinc-500 mb-3" />
            <h3 className="text-base sm:text-lg font-bold mb-1">
              {isRtl ? 'هیچ فیلمێکی دۆبلاژکراو نەدۆزرایەوە' : 'No dubbed movies found'}
            </h3>
            <p className={`text-xs mb-5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {isRtl ? 'تکایە بە دەستەواژەیەکی تر بگەڕێ یان فلتەرەکان لابدە.' : 'Try a different search keyword or reset filters.'}
            </p>
            {(searchQuery || activeFilter !== 'all') ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
              >
                {isRtl ? 'سڕینەوەی گەڕان' : 'Clear Search & Filters'}
              </button>
            ) : (
              <button
                onClick={() => fetchDubbedMovies(true)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-2 mx-auto"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                <span>{isRtl ? 'دووبارە هەوڵبدەرەوە' : 'Retry Loading'}</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DubbedMoviesPage;
