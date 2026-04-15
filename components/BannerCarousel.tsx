import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Play, Info, ChevronLeft, ChevronRight, Zap, Calendar, Trash2 } from 'lucide-react';
import { Content } from '../types';
import { fetchData } from '../services/tmdbService';
import { requests, IMAGE_BASE_URL, API_KEY } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import Spinner from './Spinner';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { bannedService } from '../services/bannedService';

interface ExtendedContent extends Content {
  logo?: string;
}

const HeroBanner: React.FC = () => {
  const [items, setItems] = useState<ExtendedContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { isAdmin } = useUI();
  const { addNotification } = useNotification();
  const langCode = language === 'ku' ? 'ku' : 'en-US';

  const fetchHeroContent = useCallback(async () => {
    setLoading(true);
    const trendingData = await fetchData(requests.fetchTrending(langCode), language);
    if (trendingData && trendingData.length > 0) {
      const topItems = trendingData.slice(0, 5);

      const enrichedItems = await Promise.all(topItems.map(async (item: any) => {
        try {
          const type = item.media_type || 'movie';
          const res = await fetch(`https://api.themoviedb.org/3/${type}/${item.id}/images?api_key=${API_KEY}`);
          const imageData = await res.json();
          const logo = imageData.logos?.find((l: any) => l.iso_639_1 === 'en' || !l.iso_639_1)?.file_path;
          return { ...item, logo };
        } catch (e) {
          return item;
        }
      }));

      setItems(enrichedItems);
    }
    setLoading(false);
  }, [langCode, language]);

  useEffect(() => {
    fetchHeroContent();
  }, [fetchHeroContent]);

  useEffect(() => {
    if (items.length === 0 || loading) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [items, loading]);

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleBan = async (e: React.MouseEvent, item: ExtendedContent) => {
    e.stopPropagation();
    const cleanId = String(item.id);
    const mediaType = item.media_type || 'movie';

    if (!window.confirm(`TERMINATE HERO NODE ${cleanId}? [GLOBAL BAN]`)) return;

    try {
        const success = await bannedService.banContent(cleanId, mediaType);
        if (success) {
            addNotification({ type: 'success', title: 'HERO PURGED', message: 'Content removed from global registry.' });
            setItems(prev => prev.filter(r => r.id !== item.id));
            if (currentIndex >= items.length - 1) {
              setCurrentIndex(0);
            }
        }
    } catch (err) {
        console.error("Ban failed:", err);
    }
  };

  if (loading && items.length === 0) return <div className="h-[85vh] flex items-center justify-center bg-black"><Spinner /></div>;
  if (items.length === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <div className="relative h-[85vh] md:h-screen w-full overflow-hidden bg-black group/hero">
      <style>
        {`
          .ken-burns {
            animation: kenburns 40s ease infinite alternate;
          }
          @keyframes kenburns {
            0% { transform: scale(1); }
            100% { transform: scale(1.2) translate(-2%, -1%); }
          }
        `}
      </style>
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${currentItem.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 z-0 overflow-hidden"
        >
          <img
            src={`${IMAGE_BASE_URL}${currentItem.backdrop_path}`}
            className="w-full h-full object-cover opacity-60 ken-burns"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block" />
        </motion.div>
      </AnimatePresence>

      <div className={`absolute bottom-[20%] md:bottom-[28%] ${language === 'ku' ? 'right-6 md:right-32' : 'left-6 md:left-32'} z-30 flex flex-col items-start pointer-events-auto max-w-[90%] md:max-w-3xl`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${currentItem.id}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className={`w-full flex flex-col ${language === 'ku' ? 'items-end' : 'items-start'}`}
          >
            <div className={`flex items-center gap-3 mb-6 ${language === 'ku' ? 'flex-row-reverse' : ''}`}>
              <div className="bg-red-600 text-white px-4 py-1.5 rounded-full text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] shadow-lg flex items-center gap-2">
                <Zap size={12} fill="white" className="animate-pulse" /> {t('trendingNow')}
              </div>
            </div>

            <div className="mb-8 md:mb-12 w-full">
              {currentItem.logo ? (
                <motion.img
                  src={`${IMAGE_BASE_URL.replace('w1280', 'original')}${currentItem.logo}`}
                  alt={currentItem.title || currentItem.name}
                  className={`h-auto max-h-24 md:max-h-40 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,1)] ${language === 'ku' ? 'mr-auto' : 'ml-0'}`}
                />
              ) : (
                <h1 className="text-4xl md:text-8xl font-[1000] uppercase italic tracking-tighter leading-[0.9] text-white drop-shadow-[0_10px_20px_rgba(0,0,0,1)] shimmer-text">
                  {currentItem.title || currentItem.name}
                </h1>
              )}
            </div>

            <p className={`text-gray-300 font-bold italic text-sm md:text-xl line-clamp-2 mb-10 max-w-2xl ${language === 'ku' ? 'text-right' : 'text-left'}`}>
              {currentItem.overview}
            </p>

            <div className={`flex items-center gap-6 mb-10 md:mb-14 ${language === 'ku' ? 'flex-row-reverse' : ''}`}>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-red-600" />
                <span className="text-xs md:text-lg font-black uppercase tracking-[0.2em] text-gray-400">
                  {currentItem.release_date?.split('-')[0] || currentItem.first_air_date?.split('-')[0]}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-3 py-1 rounded-xl">
                <Star size={14} fill="currentColor" />
                <span className="text-xs md:text-lg font-black">{currentItem.vote_average.toFixed(1)}</span>
              </div>
            </div>

            <div className={`flex flex-wrap items-center gap-4 md:gap-6 ${language === 'ku' ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => navigate(`/details/${currentItem.media_type || 'movie'}/${currentItem.id}`, { state: { customData: currentItem } })}
                className="bg-white text-black font-[1000] px-10 md:px-20 py-5 md:py-6 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center gap-4 text-xs md:text-xl uppercase italic tracking-tighter shadow-2xl transition-all active:scale-95"
              >
                <Play fill="currentColor" size={20} className="md:w-7 md:h-7" /> {t('play')}
              </button>
              <button
                onClick={() => navigate(`/details/${currentItem.media_type || 'movie'}/${currentItem.id}`, { state: { customData: currentItem } })}
                className="bg-black/40 backdrop-blur-3xl border border-white/10 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] text-white transition-all shadow-xl active:scale-95"
              >
                <Info size={20} className="md:w-7 md:h-7" />
              </button>

              {isAdmin && (
                <button
                    onClick={(e) => handleBan(e, currentItem)}
                    className="bg-red-600/20 backdrop-blur-3xl border border-red-500/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] text-red-500 transition-all shadow-xl active:scale-95 hover:bg-red-600 hover:text-white group"
                >
                    <Trash2 size={20} className="md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={`hidden lg:flex absolute bottom-12 ${language === 'ku' ? 'left-32' : 'right-32'} z-40 items-center gap-6`}>
        <button onClick={handlePrev} className="p-5 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-full text-white hover:bg-red-600 transition-all shadow-2xl">
          <ChevronLeft size={32} />
        </button>
        <button onClick={handleNext} className="p-5 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-full text-white hover:bg-red-600 transition-all shadow-2xl">
          <ChevronRight size={32} />
        </button>
      </div>

      <div className="absolute bottom-8 left-0 right-0 z-40 px-6 md:px-32 flex justify-center gap-4 pointer-events-none">
        {items.map((item, idx) => (
          <div
            key={`indicator-${item.id}`}
            className="flex-1 max-w-[60px] md:max-w-[120px] pointer-events-auto cursor-pointer"
            onClick={() => setCurrentIndex(idx)}
          >
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
              {idx === currentIndex && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 10, ease: "linear" }}
                  className="absolute inset-0 bg-red-600"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroBanner;