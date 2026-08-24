import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Row from '../components/Row';
import HeroBanner from '../components/BannerCarousel';
import { requests, IMAGE_BASE_URL } from '../constants';
import { WatchProgress, Content } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { fetchData, getMediaType } from '../services/tmdbService';
import { Play, Sparkles, Subtitles, Info, Star } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import { bannedService } from '../services/bannedService';
import { KURDISH_CC_REGISTRY } from '../services/kurdishMovieRegistry';
import { API_KEY, API_BASE_URL } from '../constants';
import { useUI } from '../contexts/UIContext';

const WeeklySpotlight: React.FC<{ fetchUrl: string }> = ({ fetchUrl }) => {
  const [item, setItem] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const isKurdish = language === 'ku' || language === 'badini';

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      const data = await fetchData(fetchUrl, language);
      if (data && data.length > 0) {
        setItem(data[0]);
      } else {
        setItem(null);
      }
      setLoading(false);
    };
    getData();
    window.addEventListener('banned-list-updated', getData);
    return () => window.removeEventListener('banned-list-updated', getData);
  }, [fetchUrl, language]);

  if (loading || !item) return null;

  const year = item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0];
  const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : null;

  return (
    <div className="px-4 sm:px-6 md:px-12 lg:px-20 mb-16 md:mb-20">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        onClick={() => navigate(`/details/${getMediaType(item)}/${item.id}`, { state: { customData: item } })}
        className="relative h-[360px] sm:h-[420px] md:h-[500px] rounded-3xl md:rounded-[2.5rem] overflow-hidden group cursor-pointer border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.7)] transition-all duration-500 hover:border-red-500/40"
      >
        {/* Backdrop Image */}
        <img
          src={item.backdrop_path?.startsWith('data:') ? item.backdrop_path : (item.backdrop_path ? `${IMAGE_BASE_URL}${item.backdrop_path}` : 'https://raw.githubusercontent.com/flkrd/cdn/main/default-banner.webp')}
          width={1280}
          height={720}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          alt={item.title || item.name || "Weekly Spotlight Movie Backdrop"}
        />

        {/* Ambient Dark Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
        <div className={`absolute inset-0 hidden md:block ${isKurdish ? 'bg-gradient-to-l from-black/80 via-black/20 to-transparent' : 'bg-gradient-to-r from-black/80 via-black/20 to-transparent'}`} />

        {/* Floating Compact Glass Card */}
        <div
          className={`absolute bottom-4 sm:bottom-6 md:bottom-8 ${isKurdish ? 'right-4 sm:right-6 md:right-8 items-end text-right' : 'left-4 sm:left-6 md:left-8 items-start text-left'} z-20 flex flex-col max-w-[calc(100%-2rem)] sm:max-w-md md:max-w-lg p-4 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-white/15 bg-black/60 backdrop-blur-2xl transition-all duration-300 group-hover:border-red-500/40 shadow-[0_20px_40px_rgba(0,0,0,0.8)]`}
          dir={isKurdish ? 'rtl' : 'ltr'}
        >
          {/* Top Pill Badges */}
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <div className="px-3 py-1 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center gap-1.5 border border-red-400/30">
              <Sparkles className="text-white animate-pulse" size={12} />
              <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider">
                {t('weeklySpotlight') || 'SPOTLIGHT'}
              </span>
            </div>

            {year && (
              <div className="bg-white/10 border border-white/10 text-gray-200 px-2.5 py-1 rounded-xl text-[10px] md:text-xs font-bold">
                {year}
              </div>
            )}

            {rating && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 px-2.5 py-1 rounded-xl text-[10px] md:text-xs font-bold flex items-center gap-1">
                <Star size={11} fill="currentColor" />
                <span>{rating}</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl md:text-3xl font-[900] text-white uppercase italic tracking-tight mb-2 line-clamp-1 drop-shadow-md leading-tight">
            {item.title || item.name}
          </h3>

          {/* Synopsis (Compact 2-line preview) */}
          {item.overview && (
            <p className="text-gray-300 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-4 font-normal opacity-90">
              {item.overview}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/details/${getMediaType(item)}/${item.id}`, { state: { customData: item } });
              }}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl md:rounded-2xl bg-gradient-to-r from-red-600 to-brand hover:from-red-500 hover:to-red-700 text-white font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-95 transition-all border border-red-400/30"
            >
              <Play fill="currentColor" size={14} />
              <span>{t('play')}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/details/${getMediaType(item)}/${item.id}`, { state: { customData: item } });
              }}
              className="px-3.5 py-2.5 rounded-xl md:rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              title={isKurdish ? 'زانیاری زیاتر' : 'More Info'}
            >
              <Info size={14} />
              <span className="hidden sm:inline">{isKurdish ? 'زانیاری' : 'Info'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const { language, t } = useTranslation();
  const { theme, viewMode } = useUI();
  const [activeItem, setActiveItem] = useState<any>(null);
  const langCode = (language === 'ku' || language === 'badini') ? 'ku' : 'en-US';
  const [continueWatchingItems, setContinueWatchingItems] = useState<WatchProgress[]>([]);
  const [recentlyViewedItems, setRecentlyViewedItems] = useState<WatchProgress[]>([]);
  const [dubbedItems, setDubbedItems] = useState<Content[]>([]);
  const [kurdishCCItems, setKurdishCCItems] = useState<Content[]>([]);
  const [loadingDubbed, setLoadingDubbed] = useState(true);
  const [loadingKurdishCC, setLoadingKurdishCC] = useState(true);

  // Update browser window title dynamically back to the premium brand identity on landing
  useEffect(() => {
    document.title = (language === 'ku' || language === 'badini')
      ? 'FLKRD MOVIES | تەماشای هەموو فیلم و زنجیرەیەک بکە'
      : 'FLKRD MOVIES | Watch Movies & TV Shows';
  }, [language]);

  const loadHistory = useCallback(() => {
    try {
      const data = localStorage.getItem('watchProgress');
      if (data) {
        const progress: WatchProgress[] = JSON.parse(data);

        // Items currently being watched
        const unfinished = progress
          .filter(i => i.progress > 10 && i.progress < (i.duration || 3600) * 0.98)
          .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0))
          .slice(0, 10);
        setContinueWatchingItems(unfinished);

        // General history (excluding items in continue watching to avoid duplication)
        const unfinishedIds = new Set(unfinished.map(u => `${u.id}-${u.type}`));
        const recent = progress
          .filter(i => !unfinishedIds.has(`${i.id}-${i.type}`))
          .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0))
          .slice(0, 15);
        setRecentlyViewedItems(recent);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadDubbed = useCallback(async () => {
    setLoadingDubbed(true);
    let rawItems = [];
    try {
      // 1. Direct Supabase Fetch (Optimized with 30s Timeout & Cleanup)
      const dbFetchPromise = supabase
        .from('dubbed_movies')
        .select('id, title, description, imageBase64, created_at, level')
        .order('created_at', { ascending: false })
        .limit(12);

      let timeoutId: any;
      const timeoutPromise = new Promise<{ data: null, error: any }>((resolve) => {
        timeoutId = setTimeout(() => resolve({ data: null, error: null }), 10000);
      });

      const response = await Promise.race([
        dbFetchPromise.then(val => {
          clearTimeout(timeoutId);
          return val;
        }),
        timeoutPromise
      ]);
      
      const { data, error } = response;
      
      if (!error && data) {
        rawItems = data;
        console.log("[HP] Supabase Signal Aligned:", rawItems.length);
      } else if (error) {
        console.warn("[HP] Supabase Signal degraded, attempting local recovery:", error);
      }

      // 3. Final Fallback to Local Quantum Core (IndexedDB)
      if (rawItems.length === 0) {
        rawItems = await db.getMovies();
        console.log("[HP] Recovering from Local Archive:", rawItems?.length);
      }

      if (rawItems && rawItems.length > 0) {
        // 4. Transform and Rank (Newest First)
        const bannedIds = await bannedService.fetchBannedList();
        const formatted = rawItems
          .filter((m: any) => !bannedIds.has(String(m.id)))
          .map((m: any) => ({
          ...m,
          id: String(m.id).startsWith('custom_') ? m.id : `custom_${m.id}`,
          media_type: 'dubbed',
          poster_path: m.imageBase64,
          backdrop_path: m.bannerBase64 || m.imageBase64 || '',
          title: m.title,
          kurdishTitle: m.title,
          overview: m.description,
          kurdishOverview: m.description,
          customStream: m.videoUrl,
          level: m.level || 'KING'
        }));

        formatted.sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });

        setDubbedItems(formatted.slice(0, 10));
        db.saveMovies(rawItems).catch(() => {});
      } else {
        // Fallback to indexedDB if everything else failed
        const localItems = await db.getMovies();
        if (localItems && localItems.length > 0) {
          setDubbedItems(localItems.slice(0, 10));
        }
      }
    } catch (e) {
      console.error("[HP CRITICAL ERROR] Recovery triggered:", e);
      const localItems = await db.getMovies();
      if (localItems && localItems.length > 0) {
         setDubbedItems(localItems.slice(0, 20));
      }
    } finally {
      setLoadingDubbed(false);
    }
  }, []);
  
  const loadKurdishCC = useCallback(async () => {
    setLoadingKurdishCC(true);
    try {
      // Use the curated registry and fetch from TMDB directly (no CORS issues)
      const top10 = KURDISH_CC_REGISTRY.slice(0, 10);
      const results = await Promise.all(
        top10.map(async entry => {
          try {
            const endpoint = `/${entry.type}/${entry.tmdb_id}?api_key=${API_KEY}`;
            const d = await fetchData(endpoint, language);
            if (!d) return null;
            return { ...d, media_type: entry.type } as Content;
          } catch { return null; }
        })
      );
      setKurdishCCItems(results.filter(Boolean) as Content[]);
    } catch (err) {
      console.error("[HP] Kurdish CC Load Error:", err);
    } finally {
      setLoadingKurdishCC(false);
    }
  }, [language]);

  useEffect(() => {
    // Parallel Initialization Protocol
    const initialize = async () => {
        loadHistory();
        await Promise.all([
            loadDubbed(),
            loadKurdishCC(),
            bannedService.fetchBannedList()
        ]);
    };
    
    initialize();

    // Realtime Sync for Dubbed Movies
    const dubbedSubscription = supabase
      .channel('dubbed_movies_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dubbed_movies' },
        () => {
          console.log("[HP] Realtime Dubbed Update detected");
          loadDubbed();
        }
      )
      .subscribe();

    window.addEventListener('storage', loadHistory);
    window.addEventListener('watchProgressUpdated', loadHistory);
    window.addEventListener('banned-list-updated', loadDubbed);
    return () => {
      dubbedSubscription.unsubscribe();
      window.removeEventListener('storage', loadHistory);
      window.removeEventListener('watchProgressUpdated', loadHistory);
      window.removeEventListener('banned-list-updated', loadDubbed);
    };
  }, [loadHistory, loadDubbed]);

  return (
    <div className="pb-40 relative">
      {/* Immersive full-screen ambient backdrop glow synced with active carousel item */}
      {activeItem && activeItem.backdrop_path && (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none transition-all duration-1000 hidden md:block">
          <div 
            className="absolute inset-0 z-10 transition-all duration-1000" 
            style={{
              background: theme === 'dark' 
                ? 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 50%, rgba(7,7,8,0.98) 100%)'
                : 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,1) 100%)'
            }}
          />
          <img
            src={`${IMAGE_BASE_URL.replace('w1280', 'original')}${activeItem.backdrop_path}`}
            className="w-full h-full object-cover scale-110 blur-[40px] saturate-[1.3] transition-all duration-1000 opacity-75"
            alt=""
          />
        </div>
      )}
      {viewMode !== 'list' && <HeroBanner onActiveItemChange={setActiveItem} />}

      <div className={`relative z-20 ${viewMode === 'list' ? 'pt-24 md:pt-32 space-y-12' : 'mt-1 md:mt-12'}`}>
        <AnimatePresence>
          {continueWatchingItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Row
                title={t('continueWatching')}
                items={continueWatchingItems}
                isProgressRow={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {recentlyViewedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Row
                title={t('recentlyViewed')}
                items={recentlyViewedItems}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {(loadingKurdishCC || kurdishCCItems.length > 0) && (
          <div className="relative">
            <Row 
              title={(language === 'ku' || language === 'badini') ? 'فیلمە ژێرنووسکراوە کوردییەکان' : 'Kurdish Subtitles'} 
              items={kurdishCCItems} 
              loading={loadingKurdishCC}
            />
            {!loadingKurdishCC && (
              <div className="absolute top-2 right-6 md:right-32 hidden md:flex items-center gap-2 bg-red-600/20 px-3 py-1.5 rounded-xl border border-red-500/30">
                <Subtitles size={12} className="text-red-500" />
                <span className="text-[9px] font-black text-white uppercase tracking-wider">PREMIUM CC</span>
              </div>
            )}
          </div>
        )}

        <Row title={t('trendingNow')} fetchUrl={requests.fetchTrending(langCode)} />
        
        {(loadingDubbed || dubbedItems.length > 0) && (
          <div className="relative">
            <Row 
              title={(language === 'ku' || language === 'badini') ? 'دۆبلاژکراوە تاقانەکان' : 'Exclusive Dubbed Movies'} 
              items={dubbedItems} 
              loading={loadingDubbed}
              type="dubbed"
            />
          </div>
        )}

        <Row title={(language === 'ku' || language === 'badini') ? 'تۆپ ١٠ فیلمی ئەمڕۆ' : 'Top 10 Today'} fetchUrl={requests.fetchTrendingMoviesDay(langCode)} type="movie" limit={10} />
        <Row title={t('topRatedMovies')} fetchUrl={requests.fetchTopRatedMovies(langCode)} type="movie" />

        <WeeklySpotlight fetchUrl={requests.fetchTrendingMovies(langCode)} />

        <div className="space-y-12 md:space-y-24">
          <Row title={t('flkrdOriginals')} fetchUrl={requests.fetchNetflixOriginals(langCode)} type="tv" />
          <Row title={t('actionMovies')} fetchUrl={requests.fetchActionMovies(langCode)} type="movie" />
          <Row title={t('comedyMovies')} fetchUrl={requests.fetchComedyMovies(langCode)} type="movie" />

          <div className="py-12 bg-main-text/[0.02] border-y border-main-text/5 backdrop-blur-3xl">
            <Row title={t('horrorMovies')} fetchUrl={requests.fetchHorrorMovies(langCode)} type="movie" />
          </div>

          <Row title={t('documentaries')} fetchUrl={requests.fetchDocumentaries(langCode)} type="movie" />
        </div>
      </div>
    </div>
  );
};

export default HomePage;