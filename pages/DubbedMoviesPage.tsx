import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic2, Search, X, Flame, Sparkles, Star, Clapperboard, 
  Play, Info, Filter, RefreshCw, ShieldAlert, Plus
} from 'lucide-react';
import { Content } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { MovieLayoutManager } from '../components/MovieLayoutManager';
import { SkeletonGrid } from '../components/Skeleton';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import { bannedService } from '../services/bannedService';

const DUBBED_FILTERS = [
  { id: 'all', labelKu: 'هەموو', labelEn: 'All' },
  { id: 'king', labelKu: '👑 ئاستی KING', labelEn: 'KING Tier' },
  { id: 'action', labelKu: 'ئاکشن', labelEn: 'Action' },
  { id: 'animation', labelKu: 'ئەنیمەیشن', labelEn: 'Animation' },
  { id: 'comedy', labelKu: 'کۆمیدی', labelEn: 'Comedy' },
  { id: 'drama', labelKu: 'دراما', labelEn: 'Drama' },
];

const DubbedMoviesPage: React.FC = () => {
  const [movies, setMovies] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { theme, isAdmin, setIsAdminModalOpen } = useUI();
  const { addNotification } = useNotification();
  const isRtl = language === 'ku' || language === 'badini';

  const isDarkMode = theme === 'dark';

  // Load Dubbed Movies from Supabase with IndexedDB local cache fallback
  const fetchDubbedMovies = async () => {
    setLoading(true);
    try {
      let rawItems: any[] = [];

      // 1. Fetch from Supabase
      try {
        const { data, error } = await supabase
          .from('dubbed_movies')
          .select('id, title, kurdishTitle, description, kurdishOverview, imageBase64, bannerBase64, videoUrl, customStream, level, created_at')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data && data.length > 0) {
          rawItems = data;
        }
      } catch (dbErr) {
        // Silent fallback
      }

      // 2. Fallback to Local Database
      if (rawItems.length === 0) {
        rawItems = await db.getMovies();
      }

      // 3. Filter Banned Content & Format Items
      const bannedIds = await bannedService.fetchBannedList();
      const formatted: Content[] = (rawItems || [])
        .filter((m: any) => !bannedIds.has(String(m.id)))
        .map((m: any) => ({
          ...m,
          id: String(m.id).startsWith('custom_') ? m.id : `custom_${m.id}`,
          media_type: 'dubbed',
          poster_path: m.imageBase64 || m.poster_path || '',
          backdrop_path: m.bannerBase64 || m.imageBase64 || m.backdrop_path || '',
          title: m.title || m.kurdishTitle || 'Untitled Dubbed Movie',
          kurdishTitle: m.kurdishTitle || m.title,
          overview: m.description || m.kurdishOverview || m.overview || '',
          kurdishOverview: m.kurdishOverview || m.description || m.overview || '',
          customStream: m.videoUrl || m.customStream || '',
          level: m.level || 'KING',
          release_date: m.created_at ? m.created_at.split('T')[0] : '2026',
        }));

      setMovies(formatted);
    } catch (err) {
      console.error('[DUBBED] Error loading dubbed movies:', err);
      addNotification({
        type: 'error',
        title: isRtl ? 'هەڵە لە بارکردن' : 'Load Error',
        message: isRtl ? 'نەتوانرا لیستەکە باربکرێت.' : 'Failed to load dubbed titles.',
      });
    } finally {
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

  return (
    <div className={`min-h-screen pt-20 md:pt-28 pb-36 px-2.5 sm:px-6 md:px-12 max-w-[1920px] mx-auto select-none w-full overflow-x-hidden transition-colors duration-300 ${
      isDarkMode ? 'text-white' : 'text-zinc-900'
    }`}>
      
      {/* 🌟 Header Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0">
            <Mic2 size={20} />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-black ${isRtl ? 'font-kurdish' : 'tracking-tight'}`}>
              {isRtl ? 'فیلمە دۆبلاژکراوە کوردییەکان' : 'Kurdish Dubbed Movies'}
            </h1>
            <p className={`text-xs font-bold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {movies.length} {isRtl ? 'فیلمی دۆبلاژکراوی کوالیتی باڵا' : 'Premium Dubbed Titles'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isAdmin && (
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>{isRtl ? 'زیادکردنی فیلم' : 'Add Movie'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchDubbedMovies();
            }}
            disabled={isRefreshing}
            className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
              isDarkMode 
                ? 'bg-zinc-900 border-white/10 hover:bg-zinc-800 text-zinc-300' 
                : 'bg-white border-zinc-200 hover:bg-zinc-100 text-zinc-700 shadow-sm'
            }`}
            title={isRtl ? 'نوێکردنەوەی لیست' : 'Refresh List'}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-red-500' : ''} />
          </button>
        </div>
      </div>

      {/* 🔍 Live Search & Filter Bar */}
      <div className={`p-3 sm:p-4 rounded-2xl md:rounded-3xl border mb-6 shadow-xl backdrop-blur-xl transition-colors ${
        isDarkMode 
          ? 'bg-zinc-950/80 border-white/10' 
          : 'bg-white/90 border-zinc-200 shadow-zinc-200/50'
      }`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'گەڕان بەدوای ناوی فیلمی دۆبلاژکراو...' : 'Search dubbed movies...'}
              className={`w-full py-2.5 pl-9 pr-9 rounded-xl text-xs sm:text-sm font-medium outline-none transition-all border ${
                isDarkMode 
                  ? 'bg-zinc-900/90 text-white placeholder-zinc-500 border-white/10 focus:border-red-500' 
                  : 'bg-zinc-100 text-zinc-900 placeholder-zinc-400 border-zinc-200 focus:border-red-500'
              }`}
              dir={isRtl ? 'rtl' : 'ltr'}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-red-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 touch-pan-x">
            {DUBBED_FILTERS.map((f) => {
              const isActive = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer shrink-0 active:scale-95 ${
                    isActive
                      ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                      : isDarkMode
                      ? 'bg-zinc-900 text-zinc-400 hover:text-white border-white/5'
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

      {/* 🎬 Main Movie Grid */}
      <AnimatePresence mode="wait">
        {loading ? (
          <SkeletonGrid count={12} />
        ) : filteredMovies.length > 0 ? (
          <motion.div key="grid-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="flex items-center justify-between mb-4 px-1">
              <span className={`text-xs font-bold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {filteredMovies.length} {isRtl ? 'فیلم دۆزرایەوە' : 'titles found'}
              </span>
            </div>

            {/* 3-Column Mobile & Responsive PC Grid */}
            <MovieLayoutManager items={filteredMovies} type="dubbed" />
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
            {(searchQuery || activeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
              >
                {isRtl ? 'سڕینەوەی گەڕان' : 'Clear Search & Filters'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DubbedMoviesPage;
