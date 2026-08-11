import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, Film, X, Star, Sparkles, Mic2, Heart, Check, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { IMAGE_BASE_URL, IMAGE_BASE_URL_POSTER, API_KEY } from '../constants';
import { fetchData } from '../services/tmdbService';
import KurdishCCBadge from './KurdishCCBadge';
import { BorderBeam } from './ui/border-beam';
import Portal from './Portal';

interface ListMoviePreviewDrawerProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Ultra-Premium Full Screen 60FPS Framer Motion Movie Preview Modal
 * Rendered via Portal at body root with double-guaranteed touch/click close handlers.
 */
export const ListMoviePreviewDrawer: React.FC<ListMoviePreviewDrawerProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const { addNotification } = useNotification();
  const isRtl = language === 'ku' || language === 'badini';

  const [cast, setCast] = useState<any[]>([]);
  const [similar, setSimilar] = useState<any[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const isCustom = item ? String(item.id).startsWith('custom_') : false;
  const mediaType = item ? item.media_type || item.type || (isCustom ? 'dubbed' : 'movie') : 'movie';
  const cleanId = item ? String(item.id).replace('custom_', '') : '';

  // Close handler with stopPropagation guarantee
  const handleClose = useCallback(
    (e?: React.SyntheticEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      onClose();
    },
    [onClose]
  );

  // ESC key listener to close modal on desktop
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Check MyList state
  useEffect(() => {
    if (!item) return;
    try {
      const myList = JSON.parse(localStorage.getItem('myList') || '[]');
      setIsAdded(myList.some((i: any) => i.id === item.id));
    } catch (e) {
      setIsAdded(false);
    }
  }, [item]);

  const handleToggleMyList = (e: React.MouseEvent) => {
    e.stopPropagation();
    let myList: any[] = [];
    try {
      myList = JSON.parse(localStorage.getItem('myList') || '[]');
    } catch (err) {
      myList = [];
    }

    const index = myList.findIndex((i: any) => i.id === item.id);

    if (index > -1) {
      myList.splice(index, 1);
      setIsAdded(false);
      addNotification({ type: 'success', title: t('notificationsSuccessTitle'), message: t('myListRemoveSuccess') });
    } else {
      myList.push({
        id: item.id,
        media_type: mediaType === 'dubbed' ? 'movie' : (mediaType as 'movie' | 'tv'),
        title: item.title || item.name || '',
        poster_path: item.poster_path,
      });
      setIsAdded(true);
      addNotification({ type: 'success', title: t('notificationsSuccessTitle'), message: t('myListAddSuccess') });
    }

    try {
      localStorage.setItem('myList', JSON.stringify(myList));
    } catch (err) {
      console.warn('localStorage quota exceeded. Clearing legacy TMDB cache items...');
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('tmdb_v3_')) localStorage.removeItem(key);
      });
      try {
        localStorage.setItem('myList', JSON.stringify(myList));
      } catch (retryErr) {
        addNotification({ type: 'error', title: 'Storage Full', message: 'Storage limit reached on device.' });
      }
    }
    window.dispatchEvent(new Event('storage'));
  };

  useEffect(() => {
    if (!item || !isOpen || isCustom) return;

    const fetchExtras = async () => {
      setLoadingExtra(true);
      try {
        const langCode = isRtl ? 'ku-TR' : 'en-US';
        const creditsEndpoint = `/${mediaType}/${cleanId}/credits?api_key=${API_KEY}&language=${langCode}`;
        const similarEndpoint = `/${mediaType}/${cleanId}/similar?api_key=${API_KEY}&language=${langCode}&page=1`;

        const [creditsRes, similarRes] = await Promise.all([
          fetchData(creditsEndpoint, language).catch(() => null),
          fetchData(similarEndpoint, language).catch(() => null),
        ]);

        if (creditsRes && creditsRes.cast) {
          setCast(creditsRes.cast.slice(0, 8));
        }
        if (similarRes && Array.isArray(similarRes)) {
          setSimilar(similarRes.slice(0, 6));
        }
      } catch (e) {
        // Ignore 404s gracefully
      } finally {
        setLoadingExtra(false);
      }
    };

    fetchExtras();
  }, [item, isOpen, mediaType, cleanId, isRtl, language, isCustom]);

  if (!item) return null;

  const title = isRtl && item.kurdishTitle ? item.kurdishTitle : item.title || item.name || '';
  const backdrop = item.bannerBase64 || item.backdrop_path || item.poster_path || item.imageBase64 || '';
  const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : '8.5';
  const year = (item.release_date || item.first_air_date || '').split('-')[0] || '2026';
  const overview = item.overview || item.description || '';

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    if (mediaType === 'dubbed' || isCustom) {
      navigate(`/dubbed-details/${cleanId}`, { state: { customData: item } });
    } else {
      navigate(`/details/${mediaType}/${cleanId}`);
    }
  };

  const handleCoop = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    navigate(`/watch-party?id=${cleanId}&type=${mediaType}`);
  };

  return (
    <Portal id="movie-preview-portal">
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden pointer-events-auto">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-black/85 backdrop-blur-2xl cursor-pointer"
            />

            {/* Slide-Up Full Screen Modal Box (PC & Mobile) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 60 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 60 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative z-10 w-full max-w-3xl h-[92vh] sm:h-auto sm:max-h-[88vh] bg-neutral-950 border border-white/20 rounded-t-[32px] sm:rounded-3xl shadow-[0_25px_90px_rgba(0,0,0,0.95)] flex flex-col overflow-y-auto overflow-x-hidden backdrop-blur-3xl ${
                isRtl ? 'text-right' : 'text-left'
              }`}
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              {/* Glowing Border Beam */}
              <BorderBeam size={360} duration={10} borderWidth={1.5} colorFrom="#e50914" colorTo="#9c40ff" glow={true} />

              {/* Header Hero Backdrop Area */}
              <div className="relative w-full h-56 sm:h-80 flex-shrink-0 bg-neutral-900 overflow-hidden">
                <img
                  src={
                    backdrop && (backdrop.startsWith('http') || backdrop.startsWith('data:'))
                      ? backdrop
                      : `${IMAGE_BASE_URL}${backdrop}`
                  }
                  alt={title}
                  className="w-full h-full object-cover transform-gpu scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-transparent" />

                {/* Left Top Close Button */}
                <button
                  type="button"
                  onClick={handleClose}
                  onTouchEnd={handleClose}
                  className="absolute top-4 left-4 z-50 p-3 rounded-full bg-black/80 hover:bg-red-600 text-white border border-white/30 backdrop-blur-xl transition-all active:scale-90 shadow-2xl cursor-pointer pointer-events-auto flex items-center justify-center group"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 stroke-[2.5] group-hover:scale-110 transition-transform" />
                </button>

                {/* Right Top Close Button */}
                <button
                  type="button"
                  onClick={handleClose}
                  onTouchEnd={handleClose}
                  className="absolute top-4 right-4 z-50 p-3 rounded-full bg-black/80 hover:bg-red-600 text-white border border-white/30 backdrop-blur-xl transition-all active:scale-90 shadow-2xl cursor-pointer pointer-events-auto flex items-center justify-center group"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 stroke-[2.5] group-hover:scale-110 transition-transform" />
                </button>

                {/* Title & Badges Overlay */}
                <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#F5C518] text-black px-2.5 py-0.5 rounded-md font-black text-xs shadow-md">
                      <Star className="w-3.5 h-3.5 fill-black" />
                      <span>{rating}</span>
                    </div>
                    <span className="bg-white/20 border border-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-md backdrop-blur-md">
                      {year}
                    </span>
                    {isCustom && (
                      <span className="bg-brand text-white text-xs font-black px-2.5 py-0.5 rounded-md uppercase">
                        DUBBED
                      </span>
                    )}
                    {!isCustom && (
                      <KurdishCCBadge tmdbId={Number(cleanId)} type={mediaType === 'tv' ? 'tv' : 'movie'} />
                    )}
                  </div>

                  <h2 className={`text-2xl sm:text-4xl font-black text-white ${isRtl ? 'font-kurdish leading-snug' : 'tracking-tight'}`}>
                    {title}
                  </h2>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-4 sm:p-6 flex flex-col gap-5 flex-1">
                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handlePlay}
                    className="flex-1 min-w-[130px] flex items-center justify-center gap-2 px-6 py-3.5 bg-brand hover:bg-brand/90 text-white font-black text-sm rounded-xl shadow-[0_8px_25px_rgba(229,9,20,0.5)] cursor-pointer transform-gpu active:scale-95 transition-all"
                  >
                    <Play className="w-4.5 h-4.5 fill-white" />
                    <span className={isRtl ? 'font-kurdish' : 'uppercase tracking-wider'}>
                      {t('play') || 'پەخش بکە'}
                    </span>
                  </button>

                  <button
                    onClick={handleToggleMyList}
                    className={`flex items-center gap-2 px-4 py-3.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer active:scale-95 ${
                      isAdded
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/15 backdrop-blur-md'
                    }`}
                  >
                    {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span className={isRtl ? 'font-kurdish' : 'uppercase tracking-wider'}>
                      {isAdded ? (t('myListRemoveSuccess') || 'Saved') : (t('myListAddSuccess') || 'My List')}
                    </span>
                  </button>

                  <button
                    onClick={handleCoop}
                    className="flex items-center gap-2 px-4 py-3.5 bg-purple-600/25 hover:bg-purple-600/35 text-purple-300 border border-purple-500/40 font-bold text-xs rounded-xl backdrop-blur-md cursor-pointer transform-gpu active:scale-95 transition-all"
                  >
                    <Users className="w-4 h-4" />
                    <span className={isRtl ? 'font-kurdish' : 'uppercase tracking-wider'}>
                      {isRtl ? 'Co-Op Watch' : 'Co-Op Watch'}
                    </span>
                  </button>

                  {/* Explicit Bottom Close Button */}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex items-center justify-center gap-1.5 px-4 py-3.5 bg-white/10 hover:bg-red-600/80 text-white border border-white/20 font-bold text-xs rounded-xl backdrop-blur-md cursor-pointer active:scale-95 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span className={isRtl ? 'font-kurdish' : 'uppercase tracking-wider'}>
                      {isRtl ? 'داخستن' : 'Close'}
                    </span>
                  </button>
                </div>

                {/* Description / Overview */}
                {overview && (
                  <div className="flex flex-col gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-4">
                    <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                      {isRtl ? 'کورتەی فیلم' : 'Overview'}
                    </h4>
                    <p className={`text-xs sm:text-sm text-neutral-200 leading-relaxed ${isRtl ? 'font-kurdish' : ''}`}>
                      {overview}
                    </p>
                  </div>
                )}

                {/* Cast & Actors Section */}
                {cast.length > 0 && (
                  <div className="flex flex-col gap-2.5 pt-1">
                    <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                      {isRtl ? 'ئەکتەرە سەرەکییەکان' : 'Top Cast'}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {cast.map((actor) => (
                        <div key={actor.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
                          <img
                            src={
                              actor.profile_path
                                ? `${IMAGE_BASE_URL_POSTER}${actor.profile_path}`
                                : 'https://raw.githubusercontent.com/flkrd/cdn/main/default-avatar.webp'
                            }
                            alt={actor.name}
                            className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">{actor.name}</p>
                            <p className="text-[10px] text-neutral-400 truncate">{actor.character}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Similar Movies Section */}
                {similar.length > 0 && (
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-white/10">
                    <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                      {isRtl ? 'هاوشێوەکانی ئەم فیلمە' : 'More Like This'}
                    </h4>
                    <div className="grid grid-cols-3 gap-2.5">
                      {similar.map((sim) => (
                        <div
                          key={sim.id}
                          onClick={() => {
                            onClose();
                            navigate(`/details/movie/${sim.id}`);
                          }}
                          className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer"
                        >
                          <img
                            src={`${IMAGE_BASE_URL_POSTER}${sim.poster_path}`}
                            alt={sim.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end">
                            <p className="text-[10px] font-bold text-white line-clamp-1">{sim.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default ListMoviePreviewDrawer;
