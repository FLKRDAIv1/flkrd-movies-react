import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Row from '../components/Row';
import HeroBanner from '../components/BannerCarousel';
import { requests, IMAGE_BASE_URL } from '../constants';
import { WatchProgress, Content } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { fetchData } from '../services/tmdbService';
import { Play, Sparkles } from 'lucide-react';

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
      }
      setLoading(false);
    };
    getData();
  }, [fetchUrl, language]);

  if (loading || !item) return null;

  return (
    <div className="px-6 md:px-32 mb-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        onClick={() => navigate(`/details/${item.media_type || 'movie'}/${item.id}`)}
        className="relative h-[450px] md:h-[600px] rounded-[4rem] overflow-hidden group cursor-pointer border border-white/10 shadow-2xl"
      >
        <img
          src={`${IMAGE_BASE_URL}${item.backdrop_path}`}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-12 left-8 right-8 md:bottom-20 md:left-20 z-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-600 rounded-full shadow-[0_0_15px_#e50914]">
              <Sparkles className="text-white" size={14} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] shimmer-text">Spotlight</span>
          </div>
          <h3 className="text-4xl md:text-7xl font-[1000] text-white uppercase italic tracking-tighter mb-6 line-clamp-1 leading-none">{item.title || item.name}</h3>
          <p className="text-gray-300 text-sm md:text-xl line-clamp-2 max-w-3xl mb-12 font-bold italic leading-relaxed opacity-80">{item.overview}</p>
          <button onClick={() => navigate(`/details/${item.media_type || 'movie'}/${item.id}`)} className="bg-white text-black font-[1000] px-12 py-5 rounded-[1.5rem] flex items-center gap-4 uppercase italic tracking-widest text-sm hover:bg-red-600 hover:text-white transition-all shadow-2xl">
            <Play fill="currentColor" size={18} /> {t('play')}
          </button>
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

  useEffect(() => {
    loadHistory();
    window.addEventListener('storage', loadHistory);
    window.addEventListener('watchProgressUpdated', loadHistory);
    return () => {
      window.removeEventListener('storage', loadHistory);
      window.removeEventListener('watchProgressUpdated', loadHistory);
    };
  }, [loadHistory]);

  return (
    <div className="pb-40 relative">
      <HeroBanner />

      <div className="relative z-20 -mt-12 md:-mt-24">
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

        <Row title={t('trendingNow')} fetchUrl={requests.fetchTrending(langCode)} />
        <Row title={t('topRatedMovies')} fetchUrl={requests.fetchTopRatedMovies(langCode)} type="movie" />

        <WeeklySpotlight fetchUrl={requests.fetchTrendingMovies(langCode)} />

        <div className="space-y-12 md:space-y-24">
          <Row title={t('flkrdOriginals')} fetchUrl={requests.fetchNetflixOriginals(langCode)} type="tv" />
          <Row title={t('actionMovies')} fetchUrl={requests.fetchActionMovies(langCode)} type="movie" />
          <Row title={t('comedyMovies')} fetchUrl={requests.fetchComedyMovies(langCode)} type="movie" />

          <div className="py-12 bg-white/[0.02] border-y border-white/5 backdrop-blur-3xl">
            <Row title={t('horrorMovies')} fetchUrl={requests.fetchHorrorMovies(langCode)} type="movie" />
          </div>

          <Row title={t('documentaries')} fetchUrl={requests.fetchDocumentaries(langCode)} type="movie" />
        </div>
      </div>
    </div>
  );
};

export default HomePage;