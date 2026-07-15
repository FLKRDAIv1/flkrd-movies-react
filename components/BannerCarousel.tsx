import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
  animate,
} from 'framer-motion';
import { Play, Info } from 'lucide-react';
import { Content } from '../types';
import { fetchData } from '../services/tmdbService';
import { requests, IMAGE_BASE_URL, API_KEY, GENRES_T } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import Spinner from './Spinner';
import { useUI } from '../contexts/UIContext';
import { bannedService } from '../services/bannedService';

interface ExtendedContent extends Content {
  logo?: string;
}

// Default carousel settings — overridden by admin via localStorage
export const DEFAULT_CAROUSEL_SETTINGS = {
  autoplayInterval: 10000,
  cardCount: 10,
  cardHeightVh: 65,
  deckOffset: 10,
  deckScale: 0.055,
  gradientStrength: 85,
  glowOpacity: 35,
  roundedSize: '3rem',
  visibleCards: 3,
};

export type CarouselSettings = typeof DEFAULT_CAROUSEL_SETTINGS;

const getSettings = (): CarouselSettings => {
  try {
    const stored = localStorage.getItem('carouselSettings');
    return stored ? { ...DEFAULT_CAROUSEL_SETTINGS, ...JSON.parse(stored) } : DEFAULT_CAROUSEL_SETTINGS;
  } catch {
    return DEFAULT_CAROUSEL_SETTINGS;
  }
};

// ─── Single draggable top card ───────────────────────────────────────────────
interface TopCardProps {
  item: ExtendedContent;
  cardHeight: string;
  roundedSize: string;
  gradientOpacity: number;
  isRTL: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onInfo: () => void;
  onPlay: () => void;
  getGenreName: (id: number) => string;
  t: (key: string) => string;
}

const TopCard: React.FC<TopCardProps> = ({
  item, cardHeight, roundedSize, gradientOpacity, isRTL,
  onSwipeLeft, onSwipeRight, onInfo, onPlay, getGenreName, t,
}) => {
  const x = useMotionValue(0);
  const isDragging = useRef(false);

  // Real-time tilt based on drag position
  const rotate = useTransform(x, [-300, 0, 300], isRTL ? [10, 0, -10] : [-10, 0, 10]);
  // Subtle brightness shift while dragging
  const overlayOpacity = useTransform(x, [-200, 0, 200], [0.15, 0, 0.15]);

  const handleDragStart = () => { isDragging.current = true; };

  const handleDragEnd = (_: any, info: any) => {
    isDragging.current = false;
    const SWIPE_THRESHOLD = 80;    // px to commit
    const VEL_THRESHOLD   = 400;   // px/s velocity shortcut

    const swipeByOffset   = Math.abs(info.offset.x)   > SWIPE_THRESHOLD;
    const swipeByVelocity = Math.abs(info.velocity.x) > VEL_THRESHOLD;

    if (swipeByOffset || swipeByVelocity) {
      const goLeft = isRTL
        ? info.offset.x > 0
        : info.offset.x < 0;

      // Fly the card out, then call parent callback
      const flyX = goLeft ? -500 : 500;
      animate(x, flyX, { duration: 0.35, ease: [0.16, 1, 0.3, 1] }).then(() => {
        goLeft ? onSwipeLeft() : onSwipeRight();
        x.set(0);
      });
    } else {
      // Snap back with spring physics
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
    }
  };

  const handleClick = () => {
    if (!isDragging.current && Math.abs(x.get()) < 5) {
      onPlay();
    }
  };

  return (
    <motion.div
      style={{
        x,
        rotate,
        borderRadius: roundedSize,
        zIndex: 30,
        position: 'absolute',
        top: 0,
        left: isRTL ? undefined : 0,
        right: isRTL ? 0 : undefined,
        width: '84%',
        height: '100%',
        overflow: 'hidden',
        cursor: 'grab',
        willChange: 'transform',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      whileDrag={{ cursor: 'grabbing' }}
    >
      {/* Background image */}
      <img
        src={`${IMAGE_BASE_URL.replace('w1280', 'original')}${item.backdrop_path}`}
        className="w-full h-full object-cover absolute inset-0 z-0"
        style={{ animation: 'kenburns 40s ease infinite alternate' }}
        alt={item.title || item.name}
        fetchPriority="high"
        loading="eager"
      />

      {/* Drag direction tint */}
      <motion.div
        className="absolute inset-0 z-10 pointer-events-none bg-black"
        style={{ opacity: overlayOpacity }}
      />

      {/* Bottom gradient */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to top, rgba(0,0,0,${gradientOpacity}) 0%, rgba(0,0,0,0.35) 40%, transparent 100%)` }}
      />

      {/* Top Metadata Tags */}
      <div className={`absolute top-6 ${isRTL ? 'right-6 flex-row-reverse' : 'left-6'} z-20 flex flex-wrap gap-2 pointer-events-none`}>
        <span className="bg-white/15 backdrop-blur-md border border-white/10 text-white text-[10px] md:text-xs font-black px-3.5 py-1.5 rounded-full">
          {item.release_date?.split('-')[0] || (item as any).first_air_date?.split('-')[0]}
        </span>
        {item.genre_ids?.[0] && (
          <span className="bg-white/15 backdrop-blur-md border border-white/10 text-white text-[10px] md:text-xs font-black px-3.5 py-1.5 rounded-full">
            {getGenreName(item.genre_ids[0])}
          </span>
        )}
        <span className="bg-white/15 backdrop-blur-md border border-white/10 text-white text-[10px] md:text-xs font-black px-3.5 py-1.5 rounded-full">
          {item.vote_average?.toFixed(1)} ★
        </span>
        <span className="bg-white/15 backdrop-blur-md border border-white/10 text-white text-[10px] md:text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
          {item.media_type || 'movie'}
        </span>
      </div>

      {/* Swipe hint arrows (fade on drag) */}
      <motion.div
        className="absolute inset-y-0 left-3 z-20 flex items-center pointer-events-none"
        style={{ opacity: useTransform(x, [0, -60], [0, 0.7]) }}
      >
        <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white text-lg font-black">←</div>
      </motion.div>
      <motion.div
        className="absolute inset-y-0 right-3 z-20 flex items-center pointer-events-none"
        style={{ opacity: useTransform(x, [0, 60], [0, 0.7]) }}
      >
        <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white text-lg font-black">→</div>
      </motion.div>

      {/* Bottom Row */}
      <div className={`absolute bottom-6 left-6 right-6 z-20 flex items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
          <div
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all hover:scale-105 shadow-lg cursor-pointer pointer-events-auto"
          >
            <Play fill="currentColor" size={20} className="ml-0.5" />
          </div>
          <div className="flex flex-col">
            {(item as ExtendedContent).logo ? (
              <img
                src={`${IMAGE_BASE_URL.replace('w1280', 'original')}${(item as ExtendedContent).logo}`}
                alt={item.title || item.name}
                className="h-6 md:h-10 w-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
              />
            ) : (
              <h2 className="text-xl md:text-3xl font-[1000] text-white tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                {item.title || item.name}
              </h2>
            )}
            <span className="text-white/60 text-[10px] md:text-xs font-bold mt-0.5">
              {t('play')}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onInfo(); }}
          className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-105 shadow-lg cursor-pointer pointer-events-auto"
          aria-label="View details"
        >
          <Info size={20} />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const HeroBanner: React.FC = () => {
  const [items, setItems]             = useState<ExtendedContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [settings, setSettings]       = useState<CarouselSettings>(getSettings);
  const navigate  = useNavigate();
  const { t, language } = useTranslation();
  const { isAdmin }     = useUI();
  const langCode = (language === 'ku' || language === 'badini') ? 'ku' : 'en-US';
  const isRTL    = language === 'ku' || language === 'badini';

  // ── Settings sync ────────────────────────────────────────────────────────
  useEffect(() => {
    const h = () => setSettings(getSettings());
    window.addEventListener('carousel-settings-updated', h);
    return () => window.removeEventListener('carousel-settings-updated', h);
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchHeroContent = useCallback(async () => {
    setLoading(true);
    try {
      const nowPlayingData = await fetchData(requests.fetchLatestMovies(langCode), language);
      if (nowPlayingData?.length > 0) {
        const topItems = nowPlayingData.slice(0, settings.cardCount);
        const enrichedItems = await Promise.all(topItems.map(async (item: any) => {
          try {
            const type     = item.media_type || 'movie';
            const imageData = await fetchData(`/${type}/${item.id}/images?api_key=${API_KEY}`, 'en');
            const logo      = imageData?.logos?.find((l: any) => l.iso_639_1 === 'en' || !l.iso_639_1)?.file_path;
            fetchData(`/${type}/${item.id}?api_key=${API_KEY}&language=en-US&append_to_response=credits,similar,recommendations,images,videos&include_image_language=en,null`, language).catch(() => {});
            return { ...item, logo, media_type: type };
          } catch { return { ...item, media_type: item.media_type || 'movie' }; }
        }));
        try {
          const bannedSet = await bannedService.fetchBannedList();
          const filtered  = enrichedItems.filter(item => !bannedSet.has(String(item.id)));
          setItems(filtered.length > 0 ? filtered : enrichedItems);
        } catch { setItems(enrichedItems); }
        setLoading(false);
        return;
      }
    } catch {}

    // Fallback: trending
    try {
      const trendingData = await fetchData(requests.fetchTrending(langCode), language);
      if (trendingData?.length > 0) {
        const topItems = trendingData.slice(0, settings.cardCount);
        const enrichedItems = await Promise.all(topItems.map(async (item: any) => {
          try {
            const type      = item.media_type || 'movie';
            const imageData = await fetchData(`/${type}/${item.id}/images?api_key=${API_KEY}`, 'en');
            const logo      = imageData?.logos?.find((l: any) => l.iso_639_1 === 'en' || !l.iso_639_1)?.file_path;
            return { ...item, logo };
          } catch { return item; }
        }));
        setItems(enrichedItems);
      }
    } catch {}
    setLoading(false);
  }, [langCode, language, settings.cardCount]);

  useEffect(() => {
    fetchHeroContent();
    window.addEventListener('banned-list-updated', fetchHeroContent);
    return () => window.removeEventListener('banned-list-updated', fetchHeroContent);
  }, [fetchHeroContent]);

  // ── Auto-play ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (items.length === 0 || loading) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, settings.autoplayInterval);
    return () => clearInterval(interval);
  }, [items.length, loading, settings.autoplayInterval]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const goNext = useCallback(() => setCurrentIndex(p => (p + 1) % items.length), [items.length]);
  const goPrev = useCallback(() => setCurrentIndex(p => (p - 1 + items.length) % items.length), [items.length]);

  const getGenreName = (genreId: number) => {
    const genre = GENRES_T.find(g => g.id === genreId);
    return genre ? t(genre.nameKey) : '';
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading && items.length === 0)
    return <div className="w-full relative px-4 md:px-12 pt-24 md:pt-32 pb-4 bg-transparent flex items-center justify-center min-h-[40vh]"><Spinner /></div>;
  if (items.length === 0) return null;

  const currentItem = items[currentIndex];
  if (!currentItem)
    return <div className="w-full relative px-4 md:px-12 pt-24 md:pt-32 pb-4 bg-transparent flex items-center justify-center min-h-[40vh]"><Spinner /></div>;

  const cardHeight      = `${settings.cardHeightVh}vh`;
  const gradientOpacity = settings.gradientStrength / 100;
  const glowOpacity     = settings.glowOpacity     / 100;

  return (
    <div className="w-full relative px-4 md:px-12 pt-24 md:pt-32 pb-20 md:pb-16 bg-transparent">
      <style>{`
        @keyframes kenburns {
          0%   { transform: scale(1); }
          100% { transform: scale(1.15) translate(-2%, -1%); }
        }
      `}</style>

      {/* Immersive backdrop glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none transition-all duration-1000">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#F8F9FA]/40 dark:to-black/40 z-10" />
        <img
          src={`${IMAGE_BASE_URL.replace('w1280', 'original')}${currentItem.backdrop_path}`}
          className="w-full h-full object-cover scale-125 blur-[100px] transition-opacity duration-1000"
          style={{ opacity: glowOpacity }}
          alt=""
        />
      </div>

      {/* ── Card Deck ─────────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-visible" style={{ height: cardHeight }}>

        {/* Back stacked cards (d > 0) */}
        {Array.from({ length: settings.visibleCards || 3 }).map((_, stackPos) => {
          // stackPos 0 = immediately behind top, 1 = further, etc.
          const d         = stackPos + 1;
          const itemIdx   = (currentIndex + d) % items.length;
          const backItem  = items[itemIdx];
          if (!backItem) return null;

          const bg = `${IMAGE_BASE_URL.replace('w1280', 'w780')}${backItem.backdrop_path}`;
          const tx = d * settings.deckOffset;
          const sc = 1 - d * settings.deckScale;
          const op = Math.max(0.55, 0.92 - d * (0.25 / (settings.visibleCards || 3)));

          return (
            <div
              key={`back-${backItem.id}-${d}`}
              onClick={() => setCurrentIndex(itemIdx)}
              style={{
                position: 'absolute',
                top: 0,
                left: isRTL ? undefined : 0,
                right: isRTL ? 0 : undefined,
                width: '84%',
                height: '100%',
                borderRadius: settings.roundedSize,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                transform: `translateX(${isRTL ? -tx : tx}%) scale(${sc})`,
                transformOrigin: isRTL ? 'right center' : 'left center',
                zIndex: 30 - d * 10,
                opacity: op,
                cursor: 'pointer',
                transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease',
              }}
            >
              <img src={bg} alt="" className="w-full h-full object-cover" loading="lazy" />
              {/* Subtle dark overlay so stacked cards look recessed */}
              <div className="absolute inset-0 bg-black/25" />
            </div>
          );
        })}

        {/* Active / top draggable card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ scale: 0.92, opacity: 0, x: 0 }}
            animate={{ scale: 1, opacity: 1, x: 0, transition: { type: 'spring', stiffness: 380, damping: 32 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            style={{
              position: 'absolute', top: 0, zIndex: 30,
              left: isRTL ? undefined : 0,
              right: isRTL ? 0 : undefined,
              width: '84%', height: '100%',
            }}
          >
            <TopCard
              item={currentItem}
              cardHeight={cardHeight}
              roundedSize={settings.roundedSize}
              gradientOpacity={gradientOpacity}
              isRTL={isRTL}
              onSwipeLeft={isRTL ? goPrev : goNext}
              onSwipeRight={isRTL ? goNext : goPrev}
              onInfo={() => navigate(`/details/${currentItem.media_type || 'movie'}/${currentItem.id}`, { state: { customData: currentItem } })}
              onPlay={() => navigate(`/details/${currentItem.media_type || 'movie'}/${currentItem.id}`, { state: { customData: currentItem } })}
              getGenreName={getGenreName}
              t={t}
            />
          </motion.div>
        </AnimatePresence>

        {/* Liquid Glass Pagination Dots */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center gap-[7px]
            bg-white/10 backdrop-blur-2xl px-5 py-3 rounded-full
            border border-white/20
            shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.18)]"
        >
          {items.map((_, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className="relative focus:outline-none flex items-center justify-center cursor-pointer"
                aria-label={`Go to slide ${idx + 1}`}
              >
                <motion.div
                  animate={{
                    width: isActive ? 20 : 7,
                    height: 7,
                    backgroundColor: isActive ? 'rgba(239, 68, 68, 1)' : 'rgba(255, 255, 255, 0.35)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="rounded-full"
                  style={isActive ? { boxShadow: '0 0 8px rgba(239,68,68,0.7)' } : {}}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;