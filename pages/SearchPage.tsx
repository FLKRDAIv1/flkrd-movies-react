import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Content } from '../types';
import { requests, API_KEY, GENRES_T, IMAGE_BASE_URL_POSTER } from '../constants';
import { SkeletonGrid } from '../components/Skeleton';
import { useTranslation } from '../contexts/LanguageContext';
import { useSearchEngine } from '../hooks/useSearchEngine';
import { useUI } from '../contexts/UIContext';
import { fetchData, getMediaType } from '../services/tmdbService';
import { bannedService } from '../services/bannedService';
import { MovieLayoutManager } from '../components/MovieLayoutManager';
import { 
  Search as SearchIcon, X, Star, TrendingUp, Sparkles, 
  Film, Tv, Mic2, Clapperboard, Flame, AlertCircle, Compass
} from 'lucide-react';

const QUICK_FILTERS = [
  { id: 'all', labelKu: 'هەموو', labelEn: 'All' },
  { id: 'movie', labelKu: 'فیلمەکان', labelEn: 'Movies', icon: Film },
  { id: 'tv', labelKu: 'زنجیرەکان', labelEn: 'TV Shows', icon: Tv },
  { id: 'dubbed', labelKu: 'دۆبلاژکراو', labelEn: 'Dubbed', icon: Mic2 },
  { id: 'action', labelKu: 'ئاکشن', labelEn: 'Action', query: 'action' },
  { id: 'comedy', labelKu: 'کۆمیدی', labelEn: 'Comedy', query: 'comedy' },
  { id: 'animation', labelKu: 'ئەنیمەیشن', labelEn: 'Animation', query: 'animation' },
];

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('query') || '';
  const [inputValue, setInputValue] = useState(queryParam);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { theme } = useUI();
  const isRtl = language === 'ku' || language === 'badini';
  const langCode = isRtl ? 'ku-TR' : 'en-US';

  const [topRatedMovies, setTopRatedMovies] = useState<Content[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(false);

  const {
    results,
    loading,
    isProcessing,
    isBlockedQuery,
    executeSearch,
    setResults,
    setIsProcessing,
  } = useSearchEngine(language);

  // Load initial popular & trending showcase for idle state
  useEffect(() => {
    const fetchPopularShowcase = async () => {
      setLoadingPopular(true);
      try {
        const [trendingRes, topRes] = await Promise.all([
          fetchData(requests.fetchTrendingMovies(langCode), language),
          fetchData(requests.fetchTopRatedMovies(langCode), language),
        ]);

        const combined = [...(trendingRes || []), ...(topRes || [])];
        const bannedSet = await bannedService.fetchBannedList();

        const uniqueMap = new Map<number, Content>();
        combined.forEach((item) => {
          if (item && item.id && item.poster_path && !bannedSet.has(String(item.id))) {
            uniqueMap.set(item.id, {
              ...item,
              media_type: getMediaType(item),
            });
          }
        });

        setTopRatedMovies(Array.from(uniqueMap.values()).slice(0, 18));
      } catch (err) {
        console.error('Error fetching popular search showcase:', err);
      } finally {
        setLoadingPopular(false);
      }
    };

    fetchPopularShowcase();
  }, [language, langCode]);

  useEffect(() => {
    setInputValue(queryParam);
  }, [queryParam]);

  // Debounced search trigger
  useEffect(() => {
    if (inputValue.trim().length > 0) {
      setIsProcessing(true);
    }
    const timeout = setTimeout(() => {
      if (inputValue.trim() !== queryParam) {
        if (inputValue.trim()) {
          setSearchParams({ query: inputValue }, { replace: true });
        } else {
          setSearchParams({}, { replace: true });
        }
      }
      executeSearch(inputValue);
    }, 500);
    return () => clearTimeout(timeout);
  }, [inputValue, executeSearch, setSearchParams, queryParam, setIsProcessing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsSuggestionsVisible(e.target.value.trim().length > 1);
  };

  const handleClearInput = () => {
    setInputValue('');
    setSearchParams({}, { replace: true });
    setResults([]);
    setIsProcessing(false);
  };

  const handleFilterClick = (filter: typeof QUICK_FILTERS[0]) => {
    setActiveFilter(filter.id);
    if (filter.id === 'all') {
      if (!inputValue) setResults([]);
    } else if (filter.id === 'dubbed') {
      navigate('/dubbed');
    } else if (filter.id === 'tv') {
      navigate('/tv');
    } else if (filter.id === 'movie') {
      navigate('/discover');
    } else if (filter.query) {
      setInputValue(filter.query);
      executeSearch(filter.query);
    }
  };

  const suggestions = results.slice(0, 6);

  return (
    <div className="min-h-screen pt-20 md:pt-28 container mx-auto px-3.5 sm:px-6 lg:px-8 relative overflow-x-hidden pb-24 select-none">
      
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/10 filter blur-[140px] -z-10 pointer-events-none" />

      {/* 🔍 Search Input Capsule */}
      <div className="relative mb-6 max-w-3xl mx-auto z-40">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/30 via-brand/20 to-red-900/30 rounded-2xl md:rounded-3xl blur-md opacity-40 group-hover:opacity-70 transition duration-500 pointer-events-none" />
          
          <form 
            onSubmit={(e) => e.preventDefault()}
            className="relative flex items-center bg-zinc-950/90 border border-white/15 rounded-2xl md:rounded-3xl shadow-2xl backdrop-blur-2xl transition-all duration-300 w-full overflow-hidden"
          >
            {/* Search Icon */}
            <div className="pl-4 sm:pl-6 pr-2 text-zinc-400 flex items-center justify-center pointer-events-none">
              <SearchIcon size={20} className={isProcessing ? 'text-red-500 animate-pulse' : 'text-zinc-400'} />
            </div>

            {/* Input field */}
            <input
              type="text"
              name="query"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => inputValue.trim().length > 1 && setIsSuggestionsVisible(true)}
              onBlur={() => setTimeout(() => setIsSuggestionsVisible(false), 250)}
              placeholder={isRtl ? 'گەڕان بۆ ناوی فیلم، زنجیرە، ئەکتەر...' : 'Search movies, TV shows, actors...'}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              enterKeyHint="search"
              className="w-full bg-transparent focus:ring-0 text-white placeholder-zinc-500 py-3.5 sm:py-4 pr-12 text-sm sm:text-base md:text-lg transition-all outline-none font-medium z-10"
              dir={isRtl ? 'rtl' : 'ltr'}
            />

            {/* Spinner or Clear Button */}
            <div className="absolute right-3.5 sm:right-5 flex items-center gap-2 z-20">
              {isProcessing && (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              )}
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClearInput}
                  className="p-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ⚡ Instant Dropdown Suggestions */}
        <AnimatePresence>
          {isSuggestionsVisible && !isProcessing && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 inset-x-0 bg-zinc-950/95 border border-white/15 rounded-2xl shadow-2xl z-50 backdrop-blur-3xl overflow-hidden"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-white/10 flex items-center justify-between text-[11px] font-bold text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-red-500" />
                  <span>{isRtl ? 'ئەنجامە پێشنیارکراوەکان' : 'Instant Matches'}</span>
                </span>
                <span className="text-[10px] text-zinc-500">{suggestions.length} {isRtl ? 'بابەت' : 'items'}</span>
              </div>
              <ul className="divide-y divide-white/5 max-h-80 overflow-y-auto scrollbar-hide">
                {suggestions.map((item) => (
                  <li key={item.id}>
                    <button
                      onMouseDown={() => {
                        setInputValue(item.title || item.name || '');
                        setIsSuggestionsVisible(false);
                        if (item.media_type === 'dubbed') {
                          navigate(`/dubbed-details/${item.id}`, { state: { customData: item } });
                        } else {
                          navigate(`/details/${getMediaType(item)}/${item.id}`);
                        }
                      }}
                      className="w-full text-left flex items-center gap-3.5 p-3 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-zinc-900 shrink-0 border border-white/10">
                        <img
                          src={
                            item.poster_path
                              ? `${IMAGE_BASE_URL_POSTER}${item.poster_path}`
                              : '/default-poster.svg'
                          }
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-poster.svg';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white truncate group-hover:text-red-400 transition-colors">
                          {item.title || item.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400 font-medium">
                          <span>{item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0] || 'N/A'}</span>
                          {item.vote_average > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                              <Star size={9} fill="currentColor" />
                              {item.vote_average.toFixed(1)}
                            </span>
                          )}
                          <span className="uppercase text-[9px] text-zinc-500 font-bold">
                            {item.media_type === 'tv' ? (isRtl ? 'زنجیرە' : 'TV') : (isRtl ? 'فیلم' : 'Movie')}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🏷️ Quick Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 mt-2 touch-pan-x">
          {QUICK_FILTERS.map((f) => {
            const Icon = f.icon;
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => handleFilterClick(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-red-600 text-white border-red-500 shadow-[0_0_12px_rgba(229,9,20,0.4)]'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border-white/5'
                }`}
              >
                {Icon && <Icon size={12} />}
                <span>{isRtl ? f.labelKu : f.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🎬 Main Content Area */}
      <AnimatePresence mode="wait">
        {loading ? (
          <SkeletonGrid count={12} />
        ) : isBlockedQuery ? (
          <motion.div
            key="blocked"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 px-4 max-w-lg mx-auto bg-zinc-900/40 border border-white/10 rounded-3xl p-8 shadow-2xl"
          >
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2">{isRtl ? 'ناوەڕۆکی نەشیاو' : 'Content Filtered'}</h2>
            <p className="text-xs text-zinc-400">{isRtl ? 'ئەم ووشەیە بەپێی یاساکانی پاراستنی خێزان قەدەغە کراوە.' : 'This term has been blocked to maintain family-safe viewing.'}</p>
          </motion.div>
        ) : inputValue && results.length > 0 ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            {/* Results Title Bar */}
            <div className="flex items-center justify-between mb-5 px-1">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span className="w-1.5 h-5 bg-red-600 rounded-full" />
                <span>
                  {isRtl ? 'ئەنجامەکان بۆ' : 'Results for'} <span className="text-red-500">"{inputValue}"</span>
                </span>
              </h2>
              <span className="text-xs font-bold text-zinc-500">
                {results.length} {isRtl ? 'فیلم و زنجیرە' : 'titles'}
              </span>
            </div>

            {/* Unified 3-column mobile & responsive grid */}
            <MovieLayoutManager items={results} />
          </motion.div>
        ) : inputValue && !loading ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 px-4 max-w-lg mx-auto bg-zinc-900/40 border border-white/10 rounded-3xl p-8 shadow-2xl"
          >
            <Clapperboard size={48} className="mx-auto text-zinc-600 mb-4" />
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
              {isRtl ? 'هیچ ئەنجامێک نەدۆزرایەوە بۆ' : 'No results found for'} <span className="text-red-500">"{inputValue}"</span>
            </h2>
            <p className="text-xs text-zinc-400 mb-6">
              {isRtl ? 'تکایە دڵنیابەرەوە لە نووسینی ناوی فیلمەکە یان بە وشەیەکی تر بگەڕێ.' : 'Check the spelling or try searching for another title.'}
            </p>
            <button
              onClick={handleClearInput}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {isRtl ? 'سڕینەوەی گەڕان' : 'Clear Search'}
            </button>
          </motion.div>
        ) : (
          /* Idle State: Trending & Top-Rated Showcase */
          <motion.div key="idle-showcase" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="flex items-center justify-between mb-5 px-1">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Flame size={18} className="text-red-500" />
                <span>{isRtl ? 'پڕبینەرترین و باشترینەکانی ئەم هەفتەیە' : 'Trending & Popular This Week'}</span>
              </h2>
              <span className="text-xs font-bold text-zinc-500">
                {topRatedMovies.length > 0 ? `${topRatedMovies.length} ${isRtl ? 'ناونیشان' : 'titles'}` : ''}
              </span>
            </div>

            {loadingPopular ? (
              <SkeletonGrid count={12} />
            ) : (
              <MovieLayoutManager items={topRatedMovies} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchPage;