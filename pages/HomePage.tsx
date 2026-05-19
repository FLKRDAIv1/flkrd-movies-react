import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Row from '../components/Row';
import HeroBanner from '../components/BannerCarousel';
import { requests, IMAGE_BASE_URL } from '../constants';
import { WatchProgress, Content } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { fetchData } from '../services/tmdbService';
import { Play, Sparkles, Subtitles } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import { bannedService } from '../services/bannedService';
import { KURDISH_CC_REGISTRY } from '../services/kurdishMovieRegistry';
import { API_KEY, API_BASE_URL } from '../constants';
import { LiquidButton } from '../components/ui/liquid-glass-button';
import StoryReels from '../components/StoryReels';

const WeeklySpotlight: React.FC<{ fetchUrl: string }> = ({ fetchUrl }) => {
  const [item, setItem] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t, language } = useTranslation();

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

  return (
    <div className="px-6 md:px-32 mb-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        onClick={() => navigate(`/details/${item.media_type || 'movie'}/${item.id}`, { state: { customData: item } })}
        className="relative h-[450px] md:h-[700px] rounded-[3.5rem] md:rounded-[5rem] overflow-hidden group cursor-pointer border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] transition-all duration-700 hover:border-brand/40"
      >
        <img
          src={item.backdrop_path?.startsWith('data:') ? item.backdrop_path : (item.backdrop_path ? `${IMAGE_BASE_URL.replace('w1280', 'original')}${item.backdrop_path}` : 'https://raw.githubusercontent.com/flkrd/cdn/main/default-banner.webp')}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block" />
        
        <div className={`absolute bottom-10 md:bottom-20 ${language === 'ku' ? 'right-8 md:right-32' : 'left-8 md:left-32'} z-20 flex flex-col ${language === 'ku' ? 'items-end' : 'items-start'} max-w-[90%] md:max-w-5xl`}>
          {/* Metadata Grid (Corner-Style) */}
          <div className={`hidden md:flex flex-col gap-6 mb-12 ${language === 'ku' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-600 rounded-2xl shadow-[0_0_30px_#e50914] flex items-center gap-2">
                    <Sparkles className="text-white animate-pulse" size={16} />
                    <span className="text-[10px] font-[1000] text-white uppercase tracking-[0.4em]">{t('weeklySpotlight') || 'SPOTLIGHT'}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-3xl border border-white/20 text-white px-5 py-3 rounded-2xl text-xs font-[1000] uppercase tracking-[0.2em]">
                      {item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0]}
                  </div>
              </div>
          </div>

          {/* Mobile Spotlight Badge */}
          <div className={`md:hidden p-2.5 bg-red-600 rounded-2xl shadow-lg flex items-center gap-2 mb-6 ${language === 'ku' ? 'flex-row-reverse' : ''}`}>
             <Sparkles className="text-white" size={12} />
             <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">{t('weeklySpotlight')}</span>
          </div>

          <h3 className={`text-5xl md:text-9xl font-[1000] text-white uppercase italic tracking-tighter mb-8 line-clamp-1 leading-[0.85] drop-shadow-[0_20px_40px_rgba(0,0,0,1)] ${language === 'ku' ? 'text-right' : 'text-left'}`}>
            {item.title || item.name}
          </h3>
          <p className={`text-gray-300 text-sm md:text-2xl line-clamp-3 mb-14 font-bold italic leading-relaxed opacity-90 drop-shadow-lg max-w-3xl ${language === 'ku' ? 'text-right' : 'text-left'}`}>
            {item.overview}
          </p>
          <div className={`flex flex-wrap items-center gap-6 ${language === 'ku' ? 'flex-row-reverse' : ''}`}>
            <LiquidButton
                variant="default"
                onClick={(e) => { e.stopPropagation(); navigate(`/details/${item.media_type || 'movie'}/${item.id}`, { state: { customData: item } }); }}
                className="text-white font-[1000] px-14 md:px-28 py-7 md:py-9 rounded-[1.5rem] md:rounded-[3rem] flex items-center gap-5 text-xs md:text-2xl uppercase italic tracking-tighter shadow-[0_30px_60px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]"
            >
                <Play fill="currentColor" size={24} className="md:w-10 md:h-10" /> {t('play')}
            </LiquidButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const { language, t } = useTranslation();
  const langCode = language === 'ku' ? 'ku' : 'en-US';
  const [continueWatchingItems, setContinueWatchingItems] = useState<WatchProgress[]>([]);
  const [recentlyViewedItems, setRecentlyViewedItems] = useState<WatchProgress[]>([]);
  const [dubbedItems, setDubbedItems] = useState<Content[]>([]);
  const [kurdishCCItems, setKurdishCCItems] = useState<Content[]>([]);

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
    let rawItems = [];
    try {
      // 1. Direct Supabase Fetch (Optimized)
      const { data, error } = await supabase
        .from('dubbed_movies')
        .select('id, title, description, imageBase64, bannerBase64, created_at, level')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!error && data) {
        rawItems = data;
        console.log("[HP] Supabase Signal Aligned:", rawItems.length);
      } else if (error) {
        throw error;
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
          id: `custom_${m.id}`,
          media_type: 'dubbed',
          poster_path: m.imageBase64,
          backdrop_path: m.bannerBase64 || m.imageBase64,
          title: m.title,
          kurdishTitle: m.title,
          overview: m.description,
          kurdishOverview: m.description,
          customStream: m.videoUrl,
          level: m.level || 'KING'
        }));

        formatted.sort((a: any, b: any) => {
          const idA = Number(String(a.id).replace('custom_', ''));
          const idB = Number(String(b.id).replace('custom_', ''));
          return idB - idA;
        });

        setDubbedItems(formatted.slice(0, 20));
        db.saveMovies(rawItems).catch(() => {});
      } else {
        // Fallback to indexedDB if everything else failed
        const localItems = await db.getMovies();
        if (localItems && localItems.length > 0) {
          setDubbedItems(localItems.slice(0, 20));
        }
      }
    } catch (e) {
      console.error("[HP CRITICAL ERROR] Recovery triggered:", e);
      const localItems = await db.getMovies();
      if (localItems && localItems.length > 0) {
         setDubbedItems(localItems.slice(0, 20));
      }
    }
  }, []);
  
  const loadKurdishCC = useCallback(async () => {
    try {
      // Use the curated registry and fetch from TMDB directly (no CORS issues)
      const top12 = KURDISH_CC_REGISTRY.slice(0, 12);
      const results = await Promise.all(
        top12.map(async entry => {
          try {
            const res = await fetch(`${API_BASE_URL}/${entry.type}/${entry.tmdb_id}?api_key=${API_KEY}&language=${langCode}`);
            if (!res.ok) return null;
            const d = await res.json();
            return { ...d, media_type: entry.type } as Content;
          } catch { return null; }
        })
      );
      setKurdishCCItems(results.filter(Boolean) as Content[]);
    } catch (err) {
      console.error("[HP] Kurdish CC Load Error:", err);
    }
  }, [langCode]);

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
      <div className="absolute top-24 md:top-32 left-0 right-0 z-50">
        <StoryReels />
      </div>
      <HeroBanner />

      <div className="relative z-20 mt-6 md:-mt-12">
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

        {kurdishCCItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <Row 
                title={language === 'ku' ? 'فیلمە ژێرنووسکراوە کوردییەکان' : 'Kurdish Subtitles'} 
                items={kurdishCCItems} 
              />
              <div className="absolute top-2 right-6 md:right-32 hidden md:flex items-center gap-2 bg-red-600/20 px-3 py-1.5 rounded-xl border border-red-500/30">
                <Subtitles size={12} className="text-red-500" />
                <span className="text-[9px] font-black text-white uppercase tracking-wider">PREMIUM CC</span>
              </div>
            </div>
          </motion.div>
        )}

        <Row title={t('trendingNow')} fetchUrl={requests.fetchTrending(langCode)} />
        
        {dubbedItems.length > 0 && (
          <div className="relative">
            <Row 
              title={language === 'ku' ? 'دۆبلاژکراوە تاقانەکان' : 'Exclusive Dubbed Movies'} 
              items={dubbedItems} 
              type="dubbed"
            />
          </div>
        )}

        <Row title={language === 'ku' ? 'تۆپ ١٠ فیلمی ئەمڕۆ' : 'Top 10 Today'} fetchUrl={requests.fetchTrendingMoviesDay(langCode)} type="movie" limit={10} />
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