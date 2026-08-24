import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, Film, X, Star, Sparkles, Mic2, Heart, Check, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { useNotification } from '../contexts/NotificationContext';
import { IMAGE_BASE_URL, IMAGE_BASE_URL_POSTER, IMAGE_BASE_URL_LOGO, API_KEY } from '../constants';
import { fetchData, isForbidden, getMediaType } from '../services/tmdbService';
import KurdishCCBadge from './KurdishCCBadge';
import { BorderBeam } from './ui/border-beam';
import MovieStageAccordion from './MovieStageAccordion';
import CommentSection from './CommentSection';
import Portal from './Portal';
import { usePlayer } from '../contexts/PlayerContext';
import { getSourceUrl, getRankedSources, getDubbedSources, extractEmbedSrc } from '../utils/playerSourceUtils';



interface ListMoviePreviewDrawerProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Ultra-Premium Full Screen 60FPS Framer Motion Movie Preview Modal
 * Rendered via Portal at body root with double-guaranteed touch/click close handlers & mobile swipe-down-to-dismiss.
 */
export const ListMoviePreviewDrawer: React.FC<ListMoviePreviewDrawerProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const { addNotification } = useNotification();
  const { setActiveVideo, setIsPaused, setIsPipActive } = usePlayer();
  const isRtl = language === 'ku' || language === 'badini';
  const drawerRef = useRef<HTMLDivElement>(null);

  const [activeItem, setActiveItem] = useState<any>(item);
  const [cast, setCast] = useState<any[]>([]);
  const [similar, setSimilar] = useState<any[]>([]);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    setActiveItem(item);
  }, [item]);

  // Scroll drawer to top whenever active movie changes
  useEffect(() => {
    if (activeItem && drawerRef.current) {
      drawerRef.current.scrollTop = 0;
    }
  }, [activeItem]);

  const targetItem = activeItem || item;
  const isCustom = targetItem ? String(targetItem.id).startsWith('custom_') : false;
  const mediaType = targetItem ? (isCustom ? 'dubbed' : getMediaType(targetItem)) : 'movie';
  const cleanId = targetItem ? String(targetItem.id).replace('custom_', '') : '';

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
    if (!targetItem || !isOpen || isCustom) return;

    const fetchExtras = async () => {
      setLoadingExtra(true);
      try {
        const langCode = isRtl ? 'ku-TR' : 'en-US';
        const creditsEndpoint = `/${mediaType}/${cleanId}/credits?api_key=${API_KEY}&language=${langCode}`;
        const similarEndpoint = `/${mediaType}/${cleanId}/similar?api_key=${API_KEY}&language=${langCode}&page=1`;
        const imagesEndpoint = `/${mediaType}/${cleanId}/images?api_key=${API_KEY}&include_image_language=en,null`;

        const [creditsRes, similarRes, imagesRes] = await Promise.all([
          fetchData(creditsEndpoint, language).catch(() => null),
          fetchData(similarEndpoint, language).catch(() => null),
          fetchData(imagesEndpoint, language).catch(() => null),
        ]);

        if (creditsRes && creditsRes.cast) {
          setCast(creditsRes.cast.slice(0, 8));
        }
        if (similarRes && Array.isArray(similarRes)) {
          const cleanSim = similarRes.filter((s: any) => !isForbidden(s, language));
          setSimilar(cleanSim.slice(0, 6));
        }
        if (imagesRes && imagesRes.logos) {
          const logo = imagesRes.logos.find((l: any) => l.file_path && (l.iso_639_1 === 'en' || !l.iso_639_1));
          if (logo) setLogoPath(logo.file_path);
        }
      } catch (e) {
        // Ignore 404s gracefully
      } finally {
        setLoadingExtra(false);
      }
    };

    fetchExtras();
  }, [targetItem, isOpen, mediaType, cleanId, isRtl, language, isCustom]);

  // Lock body scroll when open and clean up on close
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!targetItem || isForbidden(targetItem, language)) return null;

  const title = isRtl && targetItem.kurdishTitle ? targetItem.kurdishTitle : targetItem.title || targetItem.name || '';
  const backdrop = targetItem.bannerBase64 || targetItem.backdrop_path || targetItem.poster_path || targetItem.imageBase64 || '';
  const rating = targetItem.vote_average ? Number(targetItem.vote_average).toFixed(1) : '8.5';
  const year = (targetItem.release_date || targetItem.first_air_date || '').split('-')[0] || '2026';
  const overview = targetItem.overview || targetItem.description || '';

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();

    if (mediaType === 'dubbed' || isCustom || targetItem?.customStream || targetItem?.videoUrl || targetItem?.video_url || String(targetItem?.id || '').startsWith('custom_')) {
      const rawStream = targetItem?.customStream || targetItem?.videoUrl || targetItem?.video_url || targetItem?.url || '';
      const dubbedSources = getDubbedSources(rawStream, language);
      const firstSrc = dubbedSources[0]?.url || extractEmbedSrc(rawStream);
      
      const validTmdbId = (targetItem?.tmdb_id && /^\d+$/.test(String(targetItem.tmdb_id)))
        ? String(targetItem.tmdb_id)
        : (/^\d+$/.test(String(targetItem?.id || cleanId).replace('custom_', '')) ? String(targetItem?.id || cleanId).replace('custom_', '') : undefined);

      setActiveVideo({
        tmdbId: validTmdbId,
        imdbId: targetItem?.imdb_id || undefined,
        type: 'dubbed',
        title: title,
        activeSource: dubbedSources[0]?.name || 'FLKRD DUBBED 1',
        sources: dubbedSources,
        backdropPath: backdrop,
        src: firstSrc,
      });
      setIsPaused(false);
      setIsPipActive(false);
      return;
    }

    const topSource = getRankedSources(false)[0]?.name || 'FLKRD SERVER';
    const resolvedType: 'movie' | 'tv' = (mediaType === 'tv') ? 'tv' : 'movie';
    setActiveVideo({
      tmdbId: cleanId,
      type: resolvedType,
      title: title,
      activeSource: topSource,
      sources: getRankedSources(false),
      backdropPath: backdrop,
      season: resolvedType === 'tv' ? 1 : undefined,
      episode: resolvedType === 'tv' ? 1 : undefined,
      src: getSourceUrl(topSource, cleanId, resolvedType, 1, 1)
    });
    setIsPaused(false);
    setIsPipActive(false);
  };

  const handleCoop = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    navigate(`/watch-party?id=${cleanId}&type=${mediaType}`);
  };

  return (
    <Portal id="movie-preview-portal">
      <AnimatePresence mode="wait">
        {isOpen && (
          <div className="fixed inset-0 z-[200000] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden pointer-events-none">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-black/85 backdrop-blur-2xl cursor-pointer pointer-events-auto"
            />

            {/* Slide-Up Full Screen Modal Box (PC & Mobile) with 60FPS Smooth Momentum Scrolling */}
            <motion.div
              ref={drawerRef}
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative z-10 w-full max-w-3xl h-[92vh] sm:h-auto sm:max-h-[88vh] bg-[#0c0c0e] border border-white/15 rounded-t-[32px] sm:rounded-3xl shadow-[0_25px_90px_rgba(0,0,0,0.95)] flex flex-col overflow-y-auto overflow-x-hidden backdrop-blur-3xl pointer-events-auto overscroll-contain scroll-smooth ${
                isRtl ? 'text-right' : 'text-left'
              }`}
              style={{ WebkitOverflowScrolling: 'touch' }}
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              {/* Glowing Border Beam */}
              <BorderBeam size={360} duration={10} borderWidth={1.5} colorFrom="#e50914" colorTo="#9c40ff" glow={true} />

              {/* Mobile Drag/Pull Bar Handle */}
              <div 
                onClick={handleClose} 
                className="w-12 h-1.5 bg-white/30 hover:bg-white/60 active:scale-95 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0 cursor-pointer shadow transition-all"
                title="Tap to close"
              />

              {/* Header Hero Backdrop Area */}
              <div className="relative w-full h-56 sm:h-80 flex-shrink-0 bg-neutral-900 overflow-hidden">
                {backdrop ? (
                  <img
                    src={
                      backdrop.startsWith('http') || backdrop.startsWith('data:')
                        ? backdrop
                        : `${IMAGE_BASE_URL}${backdrop}`
                    }
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-neutral-900 to-black flex items-center justify-center">
                    <Film className="w-16 h-16 text-white/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-transparent" />

                {/* Single Clean Close Button */}
                <button
                  type="button"
                  onClick={handleClose}
                  onTouchEnd={handleClose}
                  className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} z-50 p-2.5 rounded-full bg-black/70 hover:bg-red-600 text-white border border-white/20 backdrop-blur-xl transition-all active:scale-90 shadow-xl cursor-pointer pointer-events-auto flex items-center justify-center group`}
                  aria-label="Close"
                >
                  <X className="w-4 h-4 stroke-[2.5] group-hover:rotate-90 transition-transform duration-300" />
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

                  {logoPath ? (
                    <img
                      src={`${IMAGE_BASE_URL_LOGO}${logoPath}`}
                      alt={title}
                      className="h-10 sm:h-16 w-auto max-w-[240px] sm:max-w-[320px] object-contain drop-shadow-2xl my-1"
                    />
                  ) : (
                    <h2 className={`text-2xl sm:text-4xl font-black text-white ${isRtl ? 'font-kurdish leading-snug' : 'tracking-tight'}`}>
                      {title}
                    </h2>
                  )}
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
                </div>

                {/* Interactive Stage-by-Stage Card Splitting Accordion */}
                <div className="pt-2">
                  <MovieStageAccordion
                    item={targetItem}
                    cast={cast}
                    similar={similar}
                    isRtl={isRtl}
                    onSelectMovie={(newMovie) => setActiveItem(newMovie)}
                  />
                </div>

                {/* Comment & Discussion Section in Preview Drawer */}
                <div className="pt-2 pb-6">
                  <CommentSection movieId={targetItem?.id || cleanId} mediaType={isCustom ? 'dubbed' : (mediaType === 'tv' ? 'tv' : 'movie')} />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default ListMoviePreviewDrawer;
