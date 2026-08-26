import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Plus, Check, Star, Sparkles, Tv, Flame, Clapperboard, Film, ShieldCheck } from 'lucide-react';
import Row from '../components/Row';
import MovieCard from '../components/MovieCard';
import { requests, IMAGE_BASE_URL, IMAGE_BASE_URL_POSTER, API_KEY } from '../constants';
import { fetchData, getMediaType } from '../services/tmdbService';
import { Content, WatchProgress } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useUI } from '../contexts/UIContext';
import KurdishCCBadge from '../components/KurdishCCBadge';

interface GenreTab {
  id: number | string;
  nameEn: string;
  nameKu: string;
  fetchUrl?: (lang: string) => string;
}

const GENRE_TABS: GenreTab[] = [
  { id: 'all', nameEn: 'All Series', nameKu: 'هەموو زنجیرەکان' },
  { id: 'trending', nameEn: 'Trending', nameKu: 'پڕبینەرترین', fetchUrl: requests.fetchTrendingTV },
  { id: 10759, nameEn: 'Action & Adventure', nameKu: 'ئاکشن و سەرکێشی', fetchUrl: requests.fetchTVAction },
  { id: 18, nameEn: 'Drama', nameKu: 'دراما و هەستبزوێن', fetchUrl: requests.fetchTVDrama },
  { id: 35, nameEn: 'Comedy', nameKu: 'کۆمیدی', fetchUrl: requests.fetchTVComedy },
  { id: 10765, nameEn: 'Sci-Fi & Fantasy', nameKu: 'خەیاڵی زانستی', fetchUrl: requests.fetchTVSciFi },
  { id: 16, nameEn: 'Animation & Anime', nameKu: 'ئەنیمەیشن و ئەنیمێ', fetchUrl: requests.fetchTVAnimation },
  { id: 80, nameEn: 'Crime & Mystery', nameKu: 'تاوان و نهێنی', fetchUrl: requests.fetchTVCrime },
  { id: 99, nameEn: 'Documentaries', nameKu: 'بەڵگەنامەیی', fetchUrl: requests.fetchTVDocumentaries },
];

const TVShowsPage: React.FC = () => {
  const [featuredShow, setFeaturedShow] = useState<Content | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<number | string>('all');
  const [genreItems, setGenreItems] = useState<Content[]>([]);
  const [loadingGenre, setLoadingGenre] = useState(false);
  const [isSavedInList, setIsSavedInList] = useState(false);
  const [continueWatchingTV, setContinueWatchingTV] = useState<WatchProgress[]>([]);
  
  const { t, language } = useTranslation();
  const { addNotification } = useNotification();
  const { theme } = useUI();
  const navigate = useNavigate();

  const isRtl = language === 'ku' || language === 'badini';
  const langCode = isRtl ? 'ku-TR' : 'en-US';

  // Load TV Continue Watching
  const loadTVWatchProgress = useCallback(() => {
    try {
      const data = localStorage.getItem('watchProgress');
      if (!data) {
        setContinueWatchingTV([]);
        return;
      }
      const progress: WatchProgress[] = JSON.parse(data);
      const unfinishedTV = progress
        .filter((item: WatchProgress) => {
          const isTv = item.type === 'tv' || (item as any).media_type === 'tv';
          const dur = item.duration || 2700;
          return isTv && item.progress > 3 && item.progress < dur * 0.98;
        })
        .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
      setContinueWatchingTV(unfinishedTV);
    } catch (e) {
      setContinueWatchingTV([]);
    }
  }, []);

  useEffect(() => {
    loadTVWatchProgress();
    window.addEventListener('watchProgressUpdated', loadTVWatchProgress);
    window.addEventListener('storage', loadTVWatchProgress);
    return () => {
      window.removeEventListener('watchProgressUpdated', loadTVWatchProgress);
      window.removeEventListener('storage', loadTVWatchProgress);
    };
  }, [loadTVWatchProgress]);

  // Load Hero TV Spotlight
  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const data = await fetchData(requests.fetchTrendingTV(langCode), language);
        if (data && data.length > 0) {
          // Select a top item with backdrop
          const withBackdrop = data.find((item: Content) => !!item.backdrop_path) || data[0];
          setFeaturedShow(withBackdrop);

          // Check if already in myList
          try {
            const list = JSON.parse(localStorage.getItem('myList') || '[]');
            setIsSavedInList(list.some((i: any) => String(i.id) === String(withBackdrop.id)));
          } catch {}
        }
      } catch (e) {
        console.error('[TV SHOWS] Featured load error:', e);
      }
    };
    loadFeatured();
  }, [langCode, language]);

  // Load Genre-filtered items when a specific tab is clicked
  useEffect(() => {
    if (selectedGenre === 'all') {
      setGenreItems([]);
      return;
    }

    const tab = GENRE_TABS.find(g => g.id === selectedGenre);
    if (!tab?.fetchUrl) return;

    const loadTabItems = async () => {
      setLoadingGenre(true);
      try {
        const data = await fetchData(tab.fetchUrl!(langCode), language);
        if (data && Array.isArray(data)) {
          setGenreItems(data);
        }
      } catch (e) {
        console.error('[TV SHOWS] Genre fetch error:', e);
      } finally {
        setLoadingGenre(false);
      }
    };

    loadTabItems();
  }, [selectedGenre, langCode, language]);

  const handleToggleMyList = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!featuredShow) return;

    try {
      const list = JSON.parse(localStorage.getItem('myList') || '[]');
      const idx = list.findIndex((i: any) => String(i.id) === String(featuredShow.id));
      if (idx > -1) {
        list.splice(idx, 1);
        setIsSavedInList(false);
        addNotification({
          type: 'info',
          title: isRtl ? 'لە لیستەکەم لادرا' : 'Removed from List',
          message: featuredShow.name || featuredShow.title || '',
        });
      } else {
        list.push({ ...featuredShow, media_type: 'tv' });
        setIsSavedInList(true);
        addNotification({
          type: 'success',
          title: isRtl ? 'بۆ لیستەکەم زیادکرا' : 'Added to List',
          message: featuredShow.name || featuredShow.title || '',
        });
      }
      localStorage.setItem('myList', JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error(err);
    }
  };

  const heroTitle = featuredShow
    ? (isRtl && (featuredShow as any).kurdishTitle ? (featuredShow as any).kurdishTitle : (featuredShow.name || featuredShow.title || ''))
    : '';

  const heroYear = featuredShow?.first_air_date ? featuredShow.first_air_date.split('-')[0] : '';
  const heroRating = featuredShow?.vote_average ? Number(featuredShow.vote_average).toFixed(1) : '';

  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen pb-36 relative select-none transition-colors duration-300 ${
      isLight ? 'text-zinc-900' : 'text-white'
    }`}>
      {/* 🌟 Dynamic Cinematic TV Hero Banner */}
      {featuredShow && (
        <div className={`relative w-full h-[65vh] sm:h-[72vh] md:h-[82vh] max-h-[880px] overflow-hidden ${
          isLight ? 'bg-white' : 'bg-neutral-950'
        }`}>
          {/* Background Backdrop Image */}
          <div className="absolute inset-0 z-0">
            <img
              src={
                featuredShow.backdrop_path
                  ? `${IMAGE_BASE_URL.replace('w1280', 'original')}${featuredShow.backdrop_path}`
                  : (featuredShow.poster_path ? `${IMAGE_BASE_URL_POSTER}${featuredShow.poster_path}` : '')
              }
              alt={heroTitle}
              className="w-full h-full object-cover object-top scale-105 transition-transform duration-1000 ease-out"
            />
            {/* Deep Cinematic Gradients */}
            <div className={`absolute inset-0 bg-gradient-to-t z-10 pointer-events-none ${
              isLight 
                ? 'from-white via-white/80 via-40% to-transparent' 
                : 'from-[#050505] via-[#050505]/60 via-40% to-transparent'
            }`} />
            <div className={`absolute inset-0 hidden md:block z-10 pointer-events-none ${
              isRtl 
                ? (isLight ? 'bg-gradient-to-l from-white/90 via-white/40 to-transparent' : 'bg-gradient-to-l from-black/90 via-black/40 to-transparent')
                : (isLight ? 'bg-gradient-to-r from-white/90 via-white/40 to-transparent' : 'bg-gradient-to-r from-black/90 via-black/40 to-transparent')
            }`} />
          </div>

          {/* Hero Content Information Capsule */}
          <div className={`relative z-20 h-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-14 flex flex-col justify-end pb-12 sm:pb-16 ${
            isRtl ? 'items-end text-right' : 'items-start text-left'
          }`}>
            {/* Top Badges */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-1.5 bg-red-600 text-white px-2.5 py-1 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(229,9,20,0.5)]">
                <Tv size={12} />
                <span>{isRtl ? 'زنجیرەی تایبەت' : 'SERIES SPOTLIGHT'}</span>
              </div>

              {heroRating && (
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] md:text-xs font-black border ${
                  isLight
                    ? 'bg-white/90 text-amber-600 border-zinc-200 shadow-sm'
                    : 'bg-black/70 backdrop-blur-md border-white/15 text-amber-400'
                }`}>
                  <Star size={11} fill="currentColor" />
                  <span>{heroRating}</span>
                </div>
              )}

              {heroYear && (
                <div className={`px-2.5 py-1 rounded-xl text-[10px] md:text-xs font-bold border ${
                  isLight
                    ? 'bg-black/5 text-zinc-800 border-zinc-200'
                    : 'bg-white/10 backdrop-blur-md border-white/10 text-zinc-200'
                }`}>
                  {heroYear}
                </div>
              )}

              <KurdishCCBadge tmdbId={Number(featuredShow.id)} type="tv" />
            </div>

            {/* Title */}
            <h1 className={`text-2xl sm:text-4xl md:text-6xl font-black leading-tight mb-3 max-w-2xl sm:max-w-3xl ${
              isLight ? 'text-zinc-900 drop-shadow-none' : 'text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]'
            } ${
              isRtl ? 'font-kurdish' : 'tracking-tight'
            }`}>
              {heroTitle}
            </h1>

            {/* Overview */}
            {featuredShow.overview && (
              <p className={`text-xs sm:text-sm md:text-base line-clamp-2 md:line-clamp-3 max-w-xl md:max-w-2xl leading-relaxed mb-6 font-medium ${
                isLight ? 'text-zinc-700 font-semibold' : 'text-zinc-300 drop-shadow-md'
              }`}>
                {featuredShow.overview}
              </p>
            )}

            {/* Action CTA Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => navigate(`/details/tv/${featuredShow.id}`, { state: { customData: featuredShow } })}
                className="bg-red-600 hover:bg-red-500 text-white rounded-2xl flex items-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 font-black text-xs sm:text-sm uppercase tracking-wider active:scale-95 transition-all shadow-[0_0_30px_rgba(229,9,20,0.5)] cursor-pointer"
              >
                <Play size={16} fill="currentColor" />
                <span>{isRtl ? 'سەیرکردن ئێستا' : 'Watch Now'}</span>
              </button>

              <button
                onClick={() => navigate(`/details/tv/${featuredShow.id}`, { state: { customData: featuredShow } })}
                className={`backdrop-blur-xl border rounded-2xl flex items-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 font-bold text-xs sm:text-sm uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-lg ${
                  isLight
                    ? 'bg-black/5 hover:bg-black/10 border-zinc-300 text-zinc-900 shadow-sm'
                    : 'bg-black/60 hover:bg-black/80 border-white/20 text-white'
                }`}
              >
                <Info size={16} />
                <span>{isRtl ? 'وردەکاری' : 'Details'}</span>
              </button>

              <button
                onClick={handleToggleMyList}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all active:scale-90 shadow-lg cursor-pointer ${
                  isSavedInList
                    ? 'bg-red-600 text-white border-red-500'
                    : isLight
                      ? 'bg-black/5 hover:bg-black/10 border-zinc-300 text-zinc-900'
                      : 'bg-black/60 backdrop-blur-xl border-white/20 text-white hover:bg-white/10'
                }`}
                title={isSavedInList ? (isRtl ? 'لابردن لە لیست' : 'Remove from List') : (isRtl ? 'زیادکردن بۆ لیست' : 'Add to List')}
                aria-label="Add to List"
              >
                {isSavedInList ? <Check size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧭 Horizontal Category / Genre Filter Pill Bar */}
      <div className="sticky top-16 z-30 bg-black/80 backdrop-blur-2xl border-y border-white/10 py-3 px-4 sm:px-8 md:px-14">
        <div className="max-w-[1920px] mx-auto flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          {GENRE_TABS.map((tab) => {
            const isActive = selectedGenre === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedGenre(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(229,9,20,0.4)] border border-red-500'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5'
                }`}
              >
                {tab.id === 'all' && <Clapperboard size={14} />}
                {tab.id === 'trending' && <Flame size={14} className={isActive ? 'text-white' : 'text-amber-400'} />}
                <span>{isRtl ? tab.nameKu : tab.nameEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 📺 Content Area */}
      <div className="mt-8 space-y-12 md:space-y-16">
        {selectedGenre === 'all' ? (
          // Main Curated TV Rows View
          <>
            {continueWatchingTV.length > 0 && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Row
                    title={isRtl ? 'بەردەوامبوون لە سەیرکردنی زنجیرەکان' : 'Continue Watching Series'}
                    items={continueWatchingTV}
                    type="tv"
                    isProgressRow={true}
                  />
                </motion.div>
              </AnimatePresence>
            )}
            <Row title={isRtl ? 'پڕبینەرترین زنجیرەکانی ئەم هەفتەیە' : 'Trending Series This Week'} fetchUrl={requests.fetchTrendingTV(langCode)} type="tv" />
            <Row title={isRtl ? 'زنجیرە بەناوبانگەکان' : 'Popular TV Series'} fetchUrl={requests.fetchPopularTV(langCode)} type="tv" />
            <Row title={isRtl ? 'باشترین زنجیرەکانی مێژوو' : 'Top Rated TV Shows'} fetchUrl={requests.fetchTopRatedTV(langCode)} type="tv" />
            <Row title={isRtl ? 'بەرهەمە نایابەکانی فڵکرد' : 'FLKRD Originals'} fetchUrl={requests.fetchNetflixOriginals(langCode)} type="tv" />
            <Row title={isRtl ? 'زنجیرە ئاکشن و سەرکێشییەکان' : 'Action & Adventure Series'} fetchUrl={requests.fetchTVAction(langCode)} type="tv" />
            <Row title={isRtl ? 'زنجیرە درامی و نهێنییەکان' : 'Drama & Mystery'} fetchUrl={requests.fetchTVDrama(langCode)} type="tv" />
            <Row title={isRtl ? 'زنجیرە کۆمیدییەکان' : 'Comedy TV'} fetchUrl={requests.fetchTVComedy(langCode)} type="tv" />
            <Row title={isRtl ? 'زنجیرە خەیاڵی زانستی و ئەفسانەییەکان' : 'Sci-Fi & Fantasy TV'} fetchUrl={requests.fetchTVSciFi(langCode)} type="tv" />
            <Row title={isRtl ? 'ئەنیمێ و زنجیرە ئەنیمەیشنەکان' : 'Anime & Animation TV'} fetchUrl={requests.fetchTVAnimation(langCode)} type="tv" />
            <Row title={isRtl ? 'بەڵگەنامەییە تەلەفزیۆنییەکان' : 'Docuseries'} fetchUrl={requests.fetchTVDocumentaries(langCode)} type="tv" />
          </>
        ) : (
          // Filtered Genre Grid View
          <div className="max-w-[1920px] mx-auto px-4 sm:px-8 md:px-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                <span>{isRtl ? GENRE_TABS.find(g => g.id === selectedGenre)?.nameKu : GENRE_TABS.find(g => g.id === selectedGenre)?.nameEn}</span>
              </h2>
              <span className="text-xs font-bold text-zinc-500">
                {genreItems.length > 0 ? `${genreItems.length} ${isRtl ? 'زنجیرە' : 'shows'}` : ''}
              </span>
            </div>

            {loadingGenre ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 md:gap-6">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="aspect-[2/3] rounded-xl sm:rounded-2xl bg-zinc-900 animate-pulse" />
                ))}
              </div>
            ) : genreItems.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 md:gap-6">
                {genreItems.map((item) => (
                  <MovieCard key={item.id} item={{ ...item, media_type: 'tv' }} mediaType="tv" />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-zinc-500">
                <Tv size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold text-sm">{isRtl ? 'هیچ زنجیرەیەک نەدۆزرایەوە' : 'No shows found in this category'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TVShowsPage;
