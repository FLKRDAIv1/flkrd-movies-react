import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, Sparkles, Star, Search, X, Filter, RotateCcw, 
  Film, Tv, Mic2, Subtitles, Flame, Calendar, SlidersHorizontal, 
  Check, Clapperboard, Layers, ChevronDown 
} from 'lucide-react';
import { Content } from '../types';
import { fetchPaginatedData, getMediaType, fetchData } from '../services/tmdbService';
import { API_KEY, GENRES_T, FORBIDDEN_GENRE_IDS } from '../constants';
import { SkeletonGrid } from '../components/Skeleton';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { bannedService } from '../services/bannedService';
import MovieCard from '../components/MovieCard';
import { MovieLayoutManager } from '../components/MovieLayoutManager';
import { KURDISH_CC_REGISTRY } from '../services/kurdishMovieRegistry';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';

type MediaTypeFilter = 'all' | 'movie' | 'tv' | 'dubbed' | 'kurdish_cc';
type OriginFilter = 'all' | 'hollywood' | 'european' | 'bollywood' | 'asian' | 'animation' | 'kurdistan';
type SortFilter = 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc' | 'revenue.desc';

interface OriginOption {
  id: OriginFilter;
  labelEn: string;
  labelKu: string;
  flag?: string;
}

const ORIGIN_OPTIONS: OriginOption[] = [
  { id: 'all', labelEn: 'All', labelKu: 'هەموو جیهان' },
  { id: 'hollywood', labelEn: 'Hollywood', labelKu: 'هۆڵیوود', flag: '🇺🇸' },
  { id: 'european', labelEn: 'Europe', labelKu: 'ئەوروپی', flag: '🇪🇺' },
  { id: 'bollywood', labelEn: 'Bollywood', labelKu: 'بۆڵیوود', flag: '🇮🇳' },
  { id: 'asian', labelEn: 'East Asia / KDrama', labelKu: 'ئاسیا و کۆری', flag: '🇰🇷' },
  { id: 'animation', labelEn: 'Anime & Animation', labelKu: 'ئەنیمەیشن', flag: '🎌' },
  { id: 'kurdistan', labelEn: 'Kurdistan', labelKu: 'کوردی', flag: '☀️' },
];

const YEAR_OPTIONS = [
  { value: 'all', labelEn: 'All Years', labelKu: 'هەموو ساڵەکان' },
  { value: '2026', labelEn: '2026', labelKu: '٢٠٢٦' },
  { value: '2025', labelEn: '2025', labelKu: '٢٠٢٥' },
  { value: '2024', labelEn: '2024', labelKu: '٢٠٢٤' },
  { value: '2023', labelEn: '2023', labelKu: '٢٠٢٣' },
  { value: '2020-2022', labelEn: '2020-2022', labelKu: '٢٠٢٠-٢٠٢٢' },
  { value: '2010s', labelEn: '2010s', labelKu: '٢٠١٠کان' },
  { value: '2000s', labelEn: '2000s', labelKu: '٢٠٠٠ەکان' },
  { value: 'classics', labelEn: 'Classics (<2000)', labelKu: 'کلاسیک (<٢٠٠٠)' },
];

const RATING_OPTIONS = [
  { value: '0', labelEn: 'All Ratings', labelKu: 'ڕەیتینگ' },
  { value: '8.0', labelEn: '8.0+ ⭐', labelKu: '٨.٠+ ⭐' },
  { value: '7.0', labelEn: '7.0+ ⭐', labelKu: '٧.٠+ ⭐' },
  { value: '6.0', labelEn: '6.0+ ⭐', labelKu: '٦.٠+ ⭐' },
];

const SORT_OPTIONS = [
  { value: 'popularity.desc', labelEn: 'Popular', labelKu: 'پڕبینەر' },
  { value: 'vote_average.desc', labelEn: 'Top Rated', labelKu: 'ڕەیتینگ' },
  { value: 'primary_release_date.desc', labelEn: 'Newest', labelKu: 'نوێترین' },
  { value: 'revenue.desc', labelEn: 'Revenue', labelKu: 'داهات' },
];

const DiscoverPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { theme } = useUI();

  const isRtl = language === 'ku' || language === 'badini';
  const langCode = isRtl ? 'ku-TR' : 'en-US';

  // Filters State
  const [mediaType, setMediaType] = useState<MediaTypeFilter>(() => {
    const p = searchParams.get('type') as MediaTypeFilter;
    return ['all', 'movie', 'tv', 'dubbed', 'kurdish_cc'].includes(p) ? p : 'movie';
  });

  const [origin, setOrigin] = useState<OriginFilter>(() => {
    const p = searchParams.get('origin') as OriginFilter;
    return ['all', 'hollywood', 'european', 'bollywood', 'asian', 'animation', 'kurdistan'].includes(p) ? p : 'all';
  });

  const [selectedGenres, setSelectedGenres] = useState<number[]>(() => {
    const g = searchParams.get('genres');
    return g ? g.split(',').map(Number).filter(Boolean) : [];
  });

  const [yearFilter, setYearFilter] = useState<string>(() => searchParams.get('year') || 'all');
  const [minRating, setMinRating] = useState<string>(() => searchParams.get('rating') || '0');
  const [sortBy, setSortBy] = useState<SortFilter>(() => (searchParams.get('sort') as SortFilter) || 'popularity.desc');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Content Data State
  const [items, setItems] = useState<Content[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);

  // Sync state to URL Query params
  const updateQueryParams = useCallback((newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === null || v === 'all' || v === '0' || v === '' || (k === 'sort' && v === 'popularity.desc')) {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  // Build TMDB discovery endpoint based on active filters
  const buildDiscoveryEndpoint = useCallback((pageNum: number) => {
    const baseTarget = mediaType === 'tv' ? '/discover/tv' : '/discover/movie';
    const params = new URLSearchParams();

    params.set('api_key', API_KEY);
    params.set('language', langCode);
    params.set('sort_by', sortBy);
    params.set('include_adult', 'false');
    params.set('without_genres', '10749'); // Block Romance & Adult Genres globally
    params.set('without_keywords', '190370,155477,157140,156475,207317,235555,273766,281488,9882,10714,18035');
    params.set('page', String(pageNum));

    // Minimum vote count filter so vote_average sort isn't dominated by 10/10 with 1 vote
    if (sortBy === 'vote_average.desc') {
      params.set('vote_count.gte', '150');
    } else {
      params.set('vote_count.gte', '20');
    }

    if (minRating !== '0') {
      params.set('vote_average.gte', minRating);
    }

    // Genre filter
    const genreList = [...selectedGenres];
    if (origin === 'animation' && !genreList.includes(16)) {
      genreList.push(16);
    }
    if (genreList.length > 0) {
      params.set('with_genres', Array.from(new Set(genreList)).join(','));
    }

    // Origin filters
    if (origin === 'hollywood') {
      params.set('with_origin_country', 'US');
    } else if (origin === 'european') {
      params.set('with_origin_country', 'GB|FR|DE|IT|ES|SE|NO|DK');
    } else if (origin === 'bollywood') {
      params.set('with_origin_country', 'IN');
      params.set('with_original_language', 'hi|te|ta');
    } else if (origin === 'asian') {
      params.set('with_origin_country', 'KR|JP|CN|HK|TW|TH');
    } else if (origin === 'kurdistan') {
      params.set('with_original_language', 'ku');
    }

    // Year filters
    if (yearFilter === '2026') {
      params.set('primary_release_year', '2026');
    } else if (yearFilter === '2025') {
      params.set('primary_release_year', '2025');
    } else if (yearFilter === '2024') {
      params.set('primary_release_year', '2024');
    } else if (yearFilter === '2023') {
      params.set('primary_release_year', '2023');
    } else if (yearFilter === '2020-2022') {
      params.set('primary_release_date.gte', '2020-01-01');
      params.set('primary_release_date.lte', '2022-12-31');
    } else if (yearFilter === '2010s') {
      params.set('primary_release_date.gte', '2010-01-01');
      params.set('primary_release_date.lte', '2019-12-31');
    } else if (yearFilter === '2000s') {
      params.set('primary_release_date.gte', '2000-01-01');
      params.set('primary_release_date.lte', '2009-12-31');
    } else if (yearFilter === 'classics') {
      params.set('primary_release_date.lte', '1999-12-31');
    }

    return `${baseTarget}?${params.toString()}`;
  }, [mediaType, langCode, sortBy, minRating, selectedGenres, origin, yearFilter]);

  // Load Primary Data (Page 1)
  const loadDiscovery = useCallback(async () => {
    setLoading(true);

    // Special Branch: Kurdish Dubbed
    if (mediaType === 'dubbed') {
      try {
        let rawItems: any[] = [];
        try {
          const { data, error } = await supabase
            .from('dubbed_movies')
            .select('id, title, description, imageBase64, videoUrl, created_at, level')
            .order('created_at', { ascending: false })
            .limit(60);

          if (!error && data && data.length > 0) {
            rawItems = data;
          }
        } catch (dbErr) {
          // Silent fallback
        }

        if (rawItems.length === 0) {
          rawItems = await db.getMovies();
        }

        const bannedIds = await bannedService.fetchBannedList();
        const formatted: Content[] = (rawItems || [])
          .filter((m: any) => !bannedIds.has(String(m.id)))
          .map((m: any) => ({
            ...m,
            id: String(m.id).startsWith('custom_') ? m.id : `custom_${m.id}`,
            media_type: 'dubbed',
            poster_path: m.imageBase64 || m.poster_path,
            backdrop_path: m.bannerBase64 || m.imageBase64 || m.backdrop_path || '',
            title: m.title,
            kurdishTitle: m.title,
            overview: m.description || m.overview,
            kurdishOverview: m.description || m.kurdishOverview,
            customStream: m.videoUrl,
            level: m.level || 'KING'
          }));

        setItems(formatted);
        setTotalCount(formatted.length);
        setHasMore(false);
      } catch (e) {
        console.error('[DISCOVER] Dubbed load error:', e);
        setItems([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Special Branch: Kurdish CC Registry
    if (mediaType === 'kurdish_cc') {
      try {
        const results = await Promise.all(
          KURDISH_CC_REGISTRY.slice(0, 40).map(async (entry) => {
            try {
              const d = await fetchData(`/${entry.type}/${entry.tmdb_id}?api_key=${API_KEY}`, language);
              if (!d) return null;
              return { ...d, media_type: entry.type } as Content;
            } catch {
              return null;
            }
          })
        );
        const filtered = results.filter(Boolean) as Content[];
        setItems(filtered);
        setTotalCount(filtered.length);
        setHasMore(false);
      } catch (e) {
        console.error('[DISCOVER] Kurdish CC load error:', e);
        setItems([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // TMDB Paginated Fetch
    try {
      const endpoint = buildDiscoveryEndpoint(1);
      const res = await fetchPaginatedData(endpoint, language);

      if (res && Array.isArray(res.results)) {
        setItems(res.results.map(r => ({ ...r, media_type: mediaType === 'tv' ? 'tv' : 'movie' })));
        setPage(2);
        setHasMore(res.page < res.total_pages && res.page < 50);
        setTotalCount(res.total_results || res.results.length);
      } else {
        setItems([]);
        setHasMore(false);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('[DISCOVER] Fetch error:', err);
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [mediaType, buildDiscoveryEndpoint, language]);

  // Trigger load on filter change
  useEffect(() => {
    loadDiscovery();
  }, [loadDiscovery]);

  // Infinite Scroll Pagination Handler
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || mediaType === 'dubbed' || mediaType === 'kurdish_cc') return;
    setLoadingMore(true);

    try {
      const endpoint = buildDiscoveryEndpoint(page);
      const res = await fetchPaginatedData(endpoint, language);

      if (res && Array.isArray(res.results) && res.results.length > 0) {
        setItems(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const newItems = res.results
            .filter(i => !existingIds.has(i.id))
            .map(i => ({ ...i, media_type: mediaType === 'tv' ? 'tv' : 'movie' }));
          return [...prev, ...newItems];
        });
        setPage(p => p + 1);
        setHasMore(res.page < res.total_pages && res.page < 50);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('[DISCOVER] Load more error:', e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, mediaType, buildDiscoveryEndpoint, page, language]);

  // IntersectionObserver Sentinel
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore, loadMore]);

  // Toggle Genre Helper
  const toggleGenre = (genreId: number) => {
    setSelectedGenres(prev => {
      const updated = prev.includes(genreId) ? prev.filter(id => id !== genreId) : [...prev, genreId];
      updateQueryParams({ genres: updated.length > 0 ? updated.join(',') : null });
      return updated;
    });
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (origin !== 'all') count++;
    if (selectedGenres.length > 0) count += selectedGenres.length;
    if (yearFilter !== 'all') count++;
    if (minRating !== '0') count++;
    if (sortBy !== 'popularity.desc') count++;
    return count;
  }, [origin, selectedGenres, yearFilter, minRating, sortBy]);

  const resetAllFilters = () => {
    setMediaType('movie');
    setOrigin('all');
    setSelectedGenres([]);
    setYearFilter('all');
    setMinRating('0');
    setSortBy('popularity.desc');
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="min-h-screen text-white pt-16 sm:pt-20 md:pt-24 pb-36 px-2 sm:px-6 md:px-12 max-w-[1920px] mx-auto select-none w-full overflow-x-hidden">
      
      {/* 🌟 Discovery Header Bar */}
      <div className="flex flex-col gap-3 mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 sm:w-2 h-6 sm:h-7 bg-red-600 rounded-full shadow-[0_0_12px_rgba(229,9,20,0.8)]" />
            <h1 className={`text-xl sm:text-2xl md:text-4xl font-black text-white ${isRtl ? 'font-kurdish' : 'tracking-tight'}`}>
              {isRtl ? 'گەڕانی پێشکەوتوو' : 'Discover Cinema'}
            </h1>
          </div>

          {totalCount !== null && (
            <span className="text-[11px] sm:text-xs font-bold text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
              {totalCount.toLocaleString()} {isRtl ? 'ناونیشان' : 'titles'}
            </span>
          )}
        </div>

        {/* Media Type Segmented Tabs (Horizontal Scrollable on Mobile) */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto scrollbar-hide w-full sm:w-auto self-start">
          <button
            onClick={() => { setMediaType('movie'); updateQueryParams({ type: 'movie' }); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
              mediaType === 'movie' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Film size={13} />
            <span>{isRtl ? 'فیلمەکان' : 'Movies'}</span>
          </button>

          <button
            onClick={() => { setMediaType('tv'); updateQueryParams({ type: 'tv' }); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
              mediaType === 'tv' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Tv size={13} />
            <span>{isRtl ? 'زنجیرەکان' : 'TV'}</span>
          </button>

          <button
            onClick={() => { setMediaType('dubbed'); updateQueryParams({ type: 'dubbed' }); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
              mediaType === 'dubbed' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mic2 size={13} />
            <span>{isRtl ? 'دۆبلاژ' : 'Dubbed'}</span>
          </button>

          <button
            onClick={() => { setMediaType('kurdish_cc'); updateQueryParams({ type: 'kurdish_cc' }); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
              mediaType === 'kurdish_cc' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Subtitles size={13} />
            <span>{isRtl ? 'ژێرنووس' : 'Subtitles'}</span>
          </button>
        </div>
      </div>

      {/* 🌍 Origin Cinema Quick Pills (Horizontal Momentum Scrollable) */}
      {mediaType !== 'dubbed' && mediaType !== 'kurdish_cc' && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 mb-3 touch-pan-x">
          {ORIGIN_OPTIONS.map((opt) => {
            const isActive = origin === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setOrigin(opt.id);
                  updateQueryParams({ origin: opt.id === 'all' ? null : opt.id });
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 border cursor-pointer shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-red-600 text-white border-red-500 shadow-[0_0_12px_rgba(229,9,20,0.4)]'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border-white/5'
                }`}
              >
                {opt.flag && <span className="text-xs">{opt.flag}</span>}
                <span>{isRtl ? opt.labelKu : opt.labelEn}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 🎛️ Filter Bar & Drawer */}
      {mediaType !== 'dubbed' && mediaType !== 'kurdish_cc' && (
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 sm:p-3.5 mb-5 shadow-lg">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Filter Controls Row */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap flex-1 min-w-0">
              {/* Year Select */}
              <div className="relative">
                <select
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    updateQueryParams({ year: e.target.value === 'all' ? null : e.target.value });
                  }}
                  className="bg-black/70 border border-white/15 text-zinc-200 text-[11px] sm:text-xs font-bold rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 outline-none cursor-pointer hover:border-white/30 transition-colors"
                >
                  {YEAR_OPTIONS.map(y => (
                    <option key={y.value} value={y.value} className="bg-zinc-900 text-white">
                      {isRtl ? y.labelKu : y.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating Select */}
              <div className="relative">
                <select
                  value={minRating}
                  onChange={(e) => {
                    setMinRating(e.target.value);
                    updateQueryParams({ rating: e.target.value === '0' ? null : e.target.value });
                  }}
                  className="bg-black/70 border border-white/15 text-amber-400 text-[11px] sm:text-xs font-bold rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 outline-none cursor-pointer hover:border-white/30 transition-colors"
                >
                  {RATING_OPTIONS.map(r => (
                    <option key={r.value} value={r.value} className="bg-zinc-900 text-white">
                      {isRtl ? r.labelKu : r.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Select */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortFilter);
                    updateQueryParams({ sort: e.target.value });
                  }}
                  className="bg-black/70 border border-white/15 text-zinc-200 text-[11px] sm:text-xs font-bold rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 outline-none cursor-pointer hover:border-white/30 transition-colors"
                >
                  {SORT_OPTIONS.map(s => (
                    <option key={s.value} value={s.value} className="bg-zinc-900 text-white">
                      {isRtl ? s.labelKu : s.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Genre Panel Toggle Button */}
              <button
                onClick={() => setIsFilterPanelOpen(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
                  selectedGenres.length > 0 || isFilterPanelOpen
                    ? 'bg-red-600 text-white border-red-500 shadow-md'
                    : 'bg-black/70 text-zinc-300 border-white/15 hover:bg-white/10'
                }`}
              >
                <SlidersHorizontal size={12} />
                <span>{isRtl ? 'ژانەرەکان' : 'Genres'}</span>
                {selectedGenres.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-red-600 font-black text-[9px] flex items-center justify-center">
                    {selectedGenres.length}
                  </span>
                )}
              </button>
            </div>

            {/* Reset All Button */}
            {activeFiltersCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw size={12} />
                <span>{isRtl ? 'سڕینەوە' : 'Reset'}</span>
              </button>
            )}
          </div>

          {/* Expandable Genre Pills */}
          <AnimatePresence>
            {isFilterPanelOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden w-full pt-3 mt-2.5 border-t border-white/10"
              >
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto scrollbar-hide py-1">
                  {GENRES_T.filter(g => !FORBIDDEN_GENRE_IDS.includes(g.id)).map(genre => {
                    const isSelected = selectedGenres.includes(genre.id);
                    return (
                      <button
                        key={genre.id}
                        onClick={() => toggleGenre(genre.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-red-600 text-white border-red-500 shadow-sm'
                            : 'bg-black/50 text-zinc-400 border-white/10 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {t(genre.nameKey as any)}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 🎬 Content Grid */}
      {loading ? (
        <SkeletonGrid count={12} />
      ) : items.length > 0 ? (
        <>
          <MovieLayoutManager 
            items={items} 
            type={mediaType === 'dubbed' ? 'dubbed' : (mediaType === 'tv' ? 'tv' : 'movie')} 
          />

          {/* Infinite Scroll Sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="w-full flex items-center justify-center py-10">
              {loadingMore ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-7 h-7 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    {isRtl ? 'باردەکرێت...' : 'Loading more...'}
                  </span>
                </div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-red-600/30" />
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-zinc-900/30 border border-white/10 rounded-3xl p-6">
          <Clapperboard size={40} className="mx-auto mb-3 text-zinc-600" />
          <h3 className="text-base sm:text-lg font-bold text-white mb-1">
            {isRtl ? 'هیچ ئەنجامێک بەم فلتەرانە نەدۆزرایەوە' : 'No titles match these filters'}
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            {isRtl ? 'تکایە فلتەرەکان بگۆڕە یان ڕیسیتیان بکەوە' : 'Try adjusting or clearing your filters'}
          </p>
          <button
            onClick={resetAllFilters}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            {isRtl ? 'سڕینەوەی هەموو فلتەرەکان' : 'Clear All Filters'}
          </button>
        </div>
      )}
    </div>
  );
};

export default DiscoverPage;