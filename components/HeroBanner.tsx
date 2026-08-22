import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Star, Sparkles, ChevronLeft, ChevronRight, Mic2, Film } from 'lucide-react';
import { Content } from '../types';
import { IMAGE_BASE_URL } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { BorderBeam } from './ui/border-beam';
import { ListMoviePreviewDrawer } from './ListMoviePreviewDrawer';


interface ExtendedContent extends Content {
  logo?: string;
  level?: string;
  kurdishTitle?: string;
}

interface HeroBannerProps {
  items?: ExtendedContent[];
  autoPlayInterval?: number;
  onActiveItemChange?: (item: ExtendedContent | null) => void;
}

// Organic Physics Motion Variants with Custom Ease-Out Expo & Spring Physics
const bannerSlideVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 90 : -90,
    scale: 1.03,
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      x: { type: 'spring', stiffness: 320, damping: 32 },
      opacity: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
      scale: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -90 : 90,
    scale: 0.98,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const contentFadeVariants = {
  initial: { opacity: 0, y: 30, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] },
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

export const HeroBanner: React.FC<HeroBannerProps> = ({
  items = [],
  autoPlayInterval = 7000,
  onActiveItemChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const { language, t } = useTranslation();

  const isRtl = language === 'ku' || language === 'badini';
  const totalItems = items.length;
  const currentItem = items[currentIndex] || null;

  // Active item change callback
  useEffect(() => {
    onActiveItemChange?.(currentItem);
  }, [currentIndex, currentItem, onActiveItemChange]);

  // Auto-slide timer with tab visibility check & pause on hover/focus
  useEffect(() => {
    if (totalItems <= 1 || isHovered || isFocused) return;

    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % totalItems);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [totalItems, autoPlayInterval, isHovered, isFocused]);

  const handleNext = useCallback(() => {
    if (totalItems <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % totalItems);
  }, [totalItems]);

  const handlePrev = useCallback(() => {
    if (totalItems <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems);
  }, [totalItems]);

  const handleDotClick = (index: number) => {
    if (index === currentIndex) return;
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  const [selectedItemForDrawer, setSelectedItemForDrawer] = useState<any>(null);

  const handleNavigateDetail = (item: ExtendedContent) => {
    setSelectedItemForDrawer(item);
  };

  if (!currentItem) return null;

  const backdropSrc = currentItem.backdrop_path
    ? currentItem.backdrop_path.startsWith('http')
      ? currentItem.backdrop_path
      : `${IMAGE_BASE_URL.replace('w1280', 'original')}${currentItem.backdrop_path}`
    : currentItem.poster_path
    ? `${IMAGE_BASE_URL}${currentItem.poster_path}`
    : '';

  const logoSrc = currentItem.logo
    ? currentItem.logo.startsWith('http')
      ? currentItem.logo
      : `${IMAGE_BASE_URL.replace('w1280', 'w500')}${currentItem.logo}`
    : null;

  const title = (isRtl && currentItem.kurdishTitle) ? currentItem.kurdishTitle : (currentItem.title || currentItem.name || '');
  const releaseYear = currentItem.release_date?.split('-')[0] || currentItem.first_air_date?.split('-')[0] || '';
  const rating = currentItem.vote_average ? currentItem.vote_average.toFixed(1) : null;
  const isDubbed = currentItem.media_type === 'dubbed' || String(currentItem.id).startsWith('custom_');

  return (
    <div
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-[620px] sm:h-[720px] md:h-[780px] lg:h-[840px] overflow-hidden bg-neutral-950 select-none transform-gpu group/hero focus:outline-none"
      aria-label={`Hero Banner: ${title}`}
    >
      {/* ── 1. Atmospheric Theater Room Layering & Composited Multi-Vignette ── */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentItem.id || currentIndex}
          custom={direction}
          variants={bannerSlideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute inset-0 w-full h-full transform-gpu"
        >
          <div className="relative w-full h-full overflow-hidden">
            <img
              src={backdropSrc}
              alt={title}
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover object-center transform-gpu scale-105 transition-transform duration-1000 ease-out group-hover/hero:scale-100"
            />

            {/* Organic Ambient Light Spots & Multi-Layered Theater Vignettes */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(229,9,20,0.18),transparent_60%)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent" />
            <div
              className={`absolute inset-0 bg-gradient-to-${
                isRtl ? 'l' : 'r'
              } from-neutral-950 via-neutral-950/80 sm:via-neutral-950/50 to-transparent`}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/70 via-transparent to-neutral-950" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(5,5,5,0.75)_100%)] pointer-events-none" />
          </div>

          {/* ── 2. Asymmetric Floating Spotlight Content Container ── */}
          <div
            className={`absolute inset-0 z-10 flex flex-col justify-end px-6 sm:px-12 md:px-20 lg:px-28 pb-16 sm:pb-20 md:pb-24 max-w-7xl ${
              isRtl ? 'right-0 text-right' : 'left-0 text-left'
            }`}
          >
            <motion.div
              variants={contentFadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative p-6 sm:p-10 md:p-12 rounded-3xl bg-neutral-950/50 border border-transparent backdrop-blur-2xl max-w-2xl transform-gpu shadow-[0_30px_70px_rgba(0,0,0,0.85)] overflow-hidden"
            >
              {/* Apple Intelligence / Gemini AI Glowing Border Beam on Active Spotlight */}
              <BorderBeam
                size={320}
                duration={10}
                borderWidth={1.5}
                colorFrom="#e50914"
                colorTo="#9c40ff"
                glow={true}
              />

              <div className="space-y-4 sm:space-y-5">
                {/* Micro Badges Bar */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-bold text-neutral-300">
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-brand/20 border border-brand/40 text-brand rounded-full backdrop-blur-md shadow-[0_0_18px_rgba(229,9,20,0.35)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="uppercase tracking-wider text-[11px] font-black">SPOTLIGHT</span>
                  </span>

                  {isDubbed && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 border border-blue-500/40 text-blue-400 rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(37,99,235,0.25)]">
                      <Mic2 className="w-3.5 h-3.5 text-blue-400" />
                      <span className="uppercase tracking-wider text-[11px] font-black">DUBBED</span>
                    </span>
                  )}

                  {releaseYear && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/12 backdrop-blur-md text-white/90 font-semibold">
                      <Film className="w-3.5 h-3.5 opacity-70" />
                      <span>{releaseYear}</span>
                    </span>
                  )}

                  {rating && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/35 rounded-full backdrop-blur-md shadow-[0_0_12px_rgba(234,179,8,0.2)]">
                      <Star className="w-3.5 h-3.5 fill-yellow-400" />
                      <span className="font-extrabold">{rating}</span>
                    </span>
                  )}
                </div>

                {/* Movie Title / Logo (Bespoke RTL & LTR Typography) */}
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={title}
                    className="max-h-24 sm:max-h-32 max-w-[280px] sm:max-w-[440px] object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.95)]"
                  />
                ) : (
                  <h1
                    className={`text-3xl sm:text-5xl lg:text-7xl font-black text-white drop-shadow-[0_6px_25px_rgba(0,0,0,0.95)] ${
                      isRtl ? 'font-kurdish leading-[1.3] tracking-normal' : 'uppercase tracking-tighter leading-none'
                    }`}
                  >
                    {title}
                  </h1>
                )}

                {/* Overview Text with Enhanced Line Height */}
                {currentItem.overview && (
                  <p
                    className={`text-sm sm:text-base text-neutral-300/90 line-clamp-3 leading-relaxed drop-shadow-md max-w-xl ${
                      isRtl ? 'font-kurdish leading-relaxed' : 'tracking-tight'
                    }`}
                  >
                    {currentItem.overview}
                  </p>
                )}

                {/* CTA Action Buttons (Organic Physics-Based Transitions) */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={() => handleNavigateDetail(currentItem)}
                    className="relative group/btn flex items-center gap-3 px-8 py-4 bg-brand hover:bg-brand/90 text-white font-black rounded-2xl shadow-[0_12px_35px_rgba(229,9,20,0.5)] cursor-pointer transform-gpu overflow-hidden"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    <span className={isRtl ? 'font-kurdish text-base font-bold' : 'uppercase tracking-widest text-xs font-black'}>
                      {t('play') || 'Play Now'}
                    </span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={() => handleNavigateDetail(currentItem)}
                    className="flex items-center gap-2.5 px-7 py-4 bg-white/10 hover:bg-white/18 text-white font-bold rounded-2xl border border-white/20 backdrop-blur-md cursor-pointer transform-gpu shadow-lg"
                  >
                    <Info className="w-5 h-5 opacity-90" />
                    <span className={isRtl ? 'font-kurdish text-base font-bold' : 'uppercase tracking-widest text-xs font-black'}>
                      {t('details') || 'Details'}
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── 3. Atmospheric Carousel Navigation Bar ── */}
      {totalItems > 1 && (
        <div className="absolute bottom-10 right-10 sm:right-16 z-30 flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePrev}
            className="p-3.5 rounded-full bg-neutral-900/80 hover:bg-brand text-white border border-white/15 backdrop-blur-md shadow-lg cursor-pointer transform-gpu transition-colors"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>

          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-neutral-950/70 border border-white/12 backdrop-blur-md shadow-inner">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleDotClick(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === currentIndex
                    ? 'w-8 h-2.5 bg-brand shadow-[0_0_12px_rgba(229,9,20,0.85)]'
                    : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNext}
            className="p-3.5 rounded-full bg-neutral-900/80 hover:bg-brand text-white border border-white/15 backdrop-blur-md shadow-lg cursor-pointer transform-gpu transition-colors"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      )}

      {selectedItemForDrawer && (
        <ListMoviePreviewDrawer
          item={selectedItemForDrawer}
          isOpen={!!selectedItemForDrawer}
          onClose={() => setSelectedItemForDrawer(null)}
        />
      )}
    </div>
  );
};

export default HeroBanner;
