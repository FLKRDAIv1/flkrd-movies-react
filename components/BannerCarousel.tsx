import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Content } from '../types';
import { fetchData } from '../services/tmdbService';
import { requests, IMAGE_BASE_URL, API_KEY, GENRES_T } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import Spinner from './Spinner';
import { useUI } from '../contexts/UIContext';
import { bannedService } from '../services/bannedService';
import { Carousel_003 } from './ui/skiper-ui/skiper49';
import DiagonalCarousel from './ui/diagonal-carousel';

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
      logo: logoSrc,
      id: item.id,
      media_type: item.media_type || 'movie',
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
      logo: logoSrc,
      id: item.id,
      media_type: item.media_type || 'movie',
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

  return (
    <div className="w-full relative px-4 md:px-6 lg:px-8 max-w-[1920px] mx-auto pt-24 md:pt-28 pb-8 bg-transparent overflow-hidden isolate">

      {/* Desktop Design: Skiper49 3D Coverflow Perspective Carousel */}
      <div className="hidden md:block relative z-10">
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

      {/* Mobile Design: Diagonal Carousel matching Vengence UI preview */}
      <div className="block md:hidden relative z-10">
        <div className="h-[350px] w-full relative mb-4">
          <DiagonalCarousel
            items={mobileCarouselItems}
            loop
            activeIndex={currentIndex}
            onActiveIndexChange={(index) => setCurrentIndex(index)}
            onItemClick={handleItemClick}
            slideSize={165}
            rotationStep={22}
            verticalStep={32}
            inactiveScale={0.7}
            showControls={true}
            showLabels={true}
            aspectRatio="square"
            labelClassName="text-white text-base font-bold tracking-wide drop-shadow-md mb-3"
            controlsClassName="bg-black/60 border border-white/10 text-white backdrop-blur-md bottom-2"
          />
        </div>
        
        {/* Dynamic Detail Card */}
        {currentItem && (
          <div className="px-4 text-center flex flex-col items-center gap-2 animate-fade-in">
            <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
              <span>{currentItem.release_date?.split('-')[0] || (currentItem as any).first_air_date?.split('-')[0]}</span>
              <span>•</span>
              <span className="text-brand font-semibold">{currentItem.vote_average ? `${currentItem.vote_average.toFixed(1)} ★` : ''}</span>
              {currentItem.genre_ids && currentItem.genre_ids.length > 0 && (
                <>
                  <span>•</span>
                  <span>{getGenreName(currentItem.genre_ids[0])}</span>
                </>
              )}
            </div>
            <p className="text-sm text-neutral-300 line-clamp-2 max-w-md mt-1 leading-relaxed">
              {currentItem.overview}
            </p>
            <button
              onClick={() => handleItemClick({ id: currentItem.id, media_type: currentItem.media_type || 'movie' })}
              className="mt-3 px-8 py-2.5 bg-brand hover:bg-brand/90 text-white font-semibold rounded-full text-sm shadow-lg shadow-brand/20 active:scale-95 transition-transform duration-100 flex items-center gap-2"
            >
              <span>{t('play') || 'Play Now'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroBanner;