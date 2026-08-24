import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Content } from '../types';
import { fetchData, getMediaType } from '../services/tmdbService';
import { requests, IMAGE_BASE_URL, IMAGE_BASE_URL_LOGO, API_KEY, GENRES_T } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import Spinner from './Spinner';
import { useUI } from '../contexts/UIContext';
import { bannedService } from '../services/bannedService';
import { Carousel_003 } from './ui/skiper-ui/skiper49';
import DiagonalCarousel from './ui/diagonal-carousel';
import { usePreloadLCP } from '../hooks/usePreloadLCP';

interface ExtendedContent extends Content {
  logo?: string;
}

// Default carousel settings
export const DEFAULT_CAROUSEL_SETTINGS = {
  autoplayInterval: 5000,
  cardCount: 10,
  glowOpacity: 35,
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

interface HeroBannerProps {
  onActiveItemChange?: (item: ExtendedContent | null) => void;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ onActiveItemChange }) => {
  const [items, setItems]             = useState<ExtendedContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [settings, setSettings]       = useState<CarouselSettings>(getSettings);
  const navigate  = useNavigate();
  const { t, language } = useTranslation();
  const { theme } = useUI();
  const langCode = (language === 'ku' || language === 'badini') ? 'ku' : 'en-US';

  const firstBackdropUrl = items[0]?.backdrop_path ? `${IMAGE_BASE_URL}${items[0].backdrop_path}` : undefined;
  usePreloadLCP(firstBackdropUrl);

  // ── Settings sync ────────────────────────────────────────────────────────
  useEffect(() => {
    const h = () => setSettings(getSettings());
    window.addEventListener('carousel-settings-updated', h);
    return () => window.removeEventListener('carousel-settings-updated', h);
  }, []);

  // ── Notify Active Item Change ─────────────────────────────────────────────
  useEffect(() => {
    if (items.length > 0) {
      onActiveItemChange?.(items[currentIndex]);
    } else {
      onActiveItemChange?.(null);
    }
  }, [currentIndex, items, onActiveItemChange]);

  // ── Mobile Autoplay ────────────────────────────────────────────────────────
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (!isMobile || items.length <= 1) return;

    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [items.length]);

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

  const getGenreName = (genreId: number) => {
    const genre = GENRES_T.find(g => g.id === genreId);
    return genre ? t(genre.nameKey) : '';
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading && items.length === 0)
    return <div className="w-full relative px-4 md:px-12 pt-24 md:pt-32 pb-4 bg-transparent flex items-center justify-center min-h-[40vh]"><Spinner /></div>;
  if (items.length === 0) return null;

  const currentItem = items[currentIndex];
  const glowOpacity = settings.glowOpacity / 100;

  // Transform items into skiper49 compatible format
  const carouselImages = items.map((item) => {
    const genreName = item.genre_ids && item.genre_ids.length > 0 ? getGenreName(item.genre_ids[0]) : '';
    const year = item.release_date?.split('-')[0] || (item as any).first_air_date?.split('-')[0] || '';
    const label = [year, genreName, item.vote_average ? `${item.vote_average.toFixed(1)} ★` : ''].filter(Boolean).join(' | ');

    const backdropSrc = (item.backdrop_path?.startsWith('http') || item.backdrop_path?.startsWith('data:'))
      ? item.backdrop_path
      : `${IMAGE_BASE_URL.replace('w1280', 'original')}${item.backdrop_path || ''}`;

    const logoSrc = item.logo
      ? ((item.logo.startsWith('http') || item.logo.startsWith('data:')) ? item.logo : `${IMAGE_BASE_URL.replace('w1280', 'w500')}${item.logo}`)
      : undefined;

    return {
      src: backdropSrc,
      alt: label,
      title: item.title || item.name || '',
      name: item.name || item.title || '',
      original_name: item.original_name,
      first_air_date: item.first_air_date,
      release_date: item.release_date,
      logo: logoSrc,
      id: item.id,
      media_type: getMediaType(item),
    };
  });

  // Transform items into mobile-friendly DiagonalCarousel format (using vertical poster)
  const mobileCarouselItems = items.map((item) => {
    const genreName = item.genre_ids && item.genre_ids.length > 0 ? getGenreName(item.genre_ids[0]) : '';
    const year = item.release_date?.split('-')[0] || (item as any).first_air_date?.split('-')[0] || '';
    const label = [year, genreName, item.vote_average ? `${item.vote_average.toFixed(1)} ★` : ''].filter(Boolean).join(' | ');

    const posterSrc = item.poster_path
      ? ((item.poster_path.startsWith('http') || item.poster_path.startsWith('data:')) ? item.poster_path : `${IMAGE_BASE_URL.replace('w1280', 'w500')}${item.poster_path}`)
      : ((item.backdrop_path?.startsWith('http') || item.backdrop_path?.startsWith('data:')) ? item.backdrop_path : `${IMAGE_BASE_URL.replace('w1280', 'w500')}${item.backdrop_path || ''}`);

    const logoSrc = item.logo
      ? ((item.logo.startsWith('http') || item.logo.startsWith('data:')) ? item.logo : `${IMAGE_BASE_URL.replace('w1280', 'w500')}${item.logo}`)
      : undefined;

    return {
      src: posterSrc,
      alt: label,
      title: item.title || item.name || '',
      name: item.name || item.title || '',
      original_name: item.original_name,
      first_air_date: item.first_air_date,
      release_date: item.release_date,
      logo: logoSrc,
      id: item.id,
      media_type: getMediaType(item),
      genreNames: genreName,
      year: year,
      vote_average: item.vote_average,
      overview: item.overview,
    };
  });

  const handleItemClick = (image: any) => {
    const originalItem = items.find(i => i.id === image.id);
    navigate(`/details/${image.media_type}/${image.id}`, { state: { customData: originalItem } });
  };

  const isLight = theme === 'light';

  return (
    <div className="w-full relative px-0 md:px-6 lg:px-8 max-w-[1920px] mx-auto pt-0 md:pt-28 pb-0 md:pb-8 bg-transparent overflow-hidden isolate">

      {/* Desktop Design: Skiper49 3D Coverflow Perspective Carousel */}
      <div className="hidden md:block relative z-10 px-4">
        <Carousel_003
          images={carouselImages}
          showPagination
          showNavigation
          loop
          autoplay
          onItemClick={handleItemClick}
          onSlideChange={(index) => setCurrentIndex(index)}
        />
      </div>

      {/* Mobile Design: Ultra-Premium Full-Bleed Extended Hero Banner Attached to Top Header */}
      <div className="block md:hidden relative z-10 w-full mb-0">
        {currentItem && (
          <div className={`relative w-full h-[72vh] min-h-[500px] max-h-[620px] overflow-hidden ${
            isLight ? 'bg-white' : 'bg-neutral-950'
          }`}>
            {/* Full-Bleed High-Res Movie Poster / Backdrop */}
            <img
              src={
                currentItem.poster_path
                  ? `${IMAGE_BASE_URL.replace('w1280', 'w780')}${currentItem.poster_path}`
                  : (currentItem.backdrop_path ? `${IMAGE_BASE_URL.replace('w1280', 'w1280')}${currentItem.backdrop_path}` : '')
              }
              alt={currentItem.title || currentItem.name || ''}
              className="w-full h-full object-cover object-top transition-transform duration-700 ease-out scale-105"
            />

            {/* Seamless Top & Bottom Cinematic Gradient Overlays */}
            <div className={`absolute inset-x-0 top-0 h-36 bg-gradient-to-b z-10 pointer-events-none ${
              isLight 
                ? 'from-white via-white/50 to-transparent' 
                : 'from-black/90 via-black/40 to-transparent'
            }`} />

            {/* Seamless Bottom Gradient Blend into Main Page Background */}
            <div className={`absolute inset-0 z-10 pointer-events-none ${
              isLight
                ? 'bg-gradient-to-t from-white via-white/90 via-45% to-transparent'
                : 'bg-gradient-to-t from-[#050505] via-[#050505]/60 via-40% to-transparent'
            }`} />

            {/* Bottom Hero Info Area */}
            <div className="absolute bottom-0 inset-x-0 p-5 pb-5 flex flex-col items-center text-center z-20">
              
              {/* Centered Movie Logo (or Title Fallback) */}
              {currentItem.logo ? (
                <div className="mb-3 flex items-center justify-center max-w-[260px] max-h-20 sm:max-h-24">
                  <img
                    src={
                      currentItem.logo.startsWith('http')
                        ? currentItem.logo
                        : `${IMAGE_BASE_URL_LOGO}${currentItem.logo}`
                    }
                    alt={currentItem.title || currentItem.name || 'Movie Logo'}
                    className={`max-h-16 sm:max-h-20 w-auto max-w-[260px] object-contain ${
                      isLight ? 'drop-shadow-[0_2px_10px_rgba(0,0,0,0.15)]' : 'drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]'
                    }`}
                  />
                </div>
              ) : (
                <h2 className={`text-2xl sm:text-3xl font-black line-clamp-2 mb-2.5 leading-tight ${
                  isLight ? 'text-zinc-900 drop-shadow-none' : 'text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]'
                }`}>
                  {currentItem.title || currentItem.name}
                </h2>
              )}

              {/* Sleek Metadata Badges */}
              <div className="flex items-center gap-2 mb-3 flex-wrap justify-center" dir="ltr">
                <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
                  FLKRD SPOTLIGHT
                </span>
                {currentItem.vote_average > 0 && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                    isLight 
                      ? 'bg-white/90 text-amber-600 border-zinc-200 shadow-sm' 
                      : 'bg-black/75 backdrop-blur-md text-amber-400 border-white/10'
                  }`}>
                    ★ {currentItem.vote_average.toFixed(1)}
                  </span>
                )}
                {(currentItem.release_date || (currentItem as any).first_air_date) && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                    isLight 
                      ? 'bg-black/5 text-zinc-800 border-zinc-200' 
                      : 'bg-white/10 backdrop-blur-md text-zinc-200 border-white/10'
                  }`}>
                    {(currentItem.release_date || (currentItem as any).first_air_date).split('-')[0]}
                  </span>
                )}
              </div>

              {/* Overview Synopsis */}
              {currentItem.overview && (
                <p className={`text-xs line-clamp-2 max-w-xs mb-4 leading-relaxed opacity-90 ${
                  isLight ? 'text-zinc-700 font-medium' : 'text-zinc-300 drop-shadow'
                }`}>
                  {currentItem.overview}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full max-w-xs">
                <button
                  onClick={() => handleItemClick({ id: currentItem.id, media_type: currentItem.media_type || 'movie' })}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(229,9,20,0.6)] active:scale-95 transition-all cursor-pointer"
                >
                  <span>{t('play') || 'Play Now'}</span>
                </button>

                <button
                  onClick={() => handleItemClick({ id: currentItem.id, media_type: currentItem.media_type || 'movie' })}
                  className={`px-5 py-3 backdrop-blur-md border rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer ${
                    isLight 
                      ? 'bg-black/5 hover:bg-black/10 border-zinc-300 text-zinc-900 font-bold shadow-sm' 
                      : 'bg-white/15 hover:bg-white/25 border-white/20 text-white font-bold'
                  }`}
                >
                  <span>{language === 'ku' || language === 'badini' ? 'زانیاری' : 'Info'}</span>
                </button>
              </div>

              {/* Slide Pagination Dots */}
              <div className="flex items-center gap-1.5 mt-3.5">
                {items.slice(0, 8).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      currentIndex === idx 
                        ? 'w-6 bg-red-600 shadow-[0_0_8px_rgba(229,9,20,0.8)]' 
                        : (isLight ? 'w-1.5 bg-black/25' : 'w-1.5 bg-white/30')
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroBanner;