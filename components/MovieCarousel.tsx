import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useDragControls } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Play } from 'lucide-react';
import { Content } from '../types';
import { IMAGE_BASE_URL_POSTER } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';

import { getMediaType } from '../services/tmdbService';

interface MovieCarouselProps {
  title?: string;
  items?: Content[];
  onCardClick?: (item: Content) => void;
  isProgressRow?: boolean;
}

// Viewport-aware container variants (strictly animating opacity and compositor transform y)
const carouselContainerVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
      staggerChildren: 0.05,
    },
  },
};

const cardItemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

export const MovieCarousel: React.FC<MovieCarouselProps> = ({
  title,
  items = [],
  onCardClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragConstraintsLeft, setDragConstraintsLeft] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const innerTrackRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Compute drag bounds dynamically based on container vs content width
  const updateConstraints = useCallback(() => {
    if (carouselRef.current && innerTrackRef.current) {
      const containerWidth = carouselRef.current.offsetWidth;
      const trackWidth = innerTrackRef.current.scrollWidth;
      const maxScroll = Math.min(0, containerWidth - trackWidth - 32);
      setDragConstraintsLeft(maxScroll);
    }
  }, []);

  useEffect(() => {
    updateConstraints();
    window.addEventListener('resize', updateConstraints);
    return () => window.removeEventListener('resize', updateConstraints);
  }, [items.length, updateConstraints]);

  // Handle smooth scroll navigation via arrow buttons
  const handleScrollStep = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = carouselRef.current.offsetWidth * 0.75;
    const currentScroll = carouselRef.current.scrollLeft;
    const targetScroll =
      direction === 'left'
        ? Math.max(0, currentScroll - scrollAmount)
        : currentScroll + scrollAmount;

    carouselRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  };

  const handleNavigate = (item: Content) => {
    if (isDragging) return; // Prevent navigation trigger on drag release
    if (onCardClick) {
      onCardClick(item);
      return;
    }
    const mediaType = getMediaType(item);
    navigate(`/details/${mediaType}/${item.id}`, { state: { customData: item } });
  };

  if (!items || items.length === 0) return null;

  return (
    <motion.div
      variants={carouselContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      className="w-full mb-10 md:mb-14 px-4 md:px-8 max-w-[1920px] mx-auto select-none overflow-hidden transform-gpu"
      style={{
        contain: 'layout paint',
        transform: 'translateZ(0)',
      }}
    >
      {/* Title Header */}
      {title && (
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-3xl font-extrabold flex items-center tracking-tight text-white uppercase">
            <span className="w-1.5 md:w-2 h-6 md:h-9 bg-brand rounded-full me-3 md:me-4 shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.8)]" />
            <span>{title}</span>
          </h2>

          {/* Navigation Arrows */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => handleScrollStep('left')}
              aria-label="Scroll left"
              className="w-9 h-9 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 flex items-center justify-center text-white transition-colors duration-200 cursor-pointer active:scale-95 transform-gpu"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleScrollStep('right')}
              aria-label="Scroll right"
              className="w-9 h-9 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 flex items-center justify-center text-white transition-colors duration-200 cursor-pointer active:scale-95 transform-gpu"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Drag Track Container */}
      <div
        ref={carouselRef}
        className="w-full overflow-x-auto scrollbar-hide py-3 overflow-y-visible"
      >
        <motion.div
          ref={innerTrackRef}
          drag="x"
          dragConstraints={{ left: dragConstraintsLeft, right: 0 }}
          dragElastic={0.08}
          dragTransition={{ bounceStiffness: 600, bounceDamping: 25 }}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          /* CRITICAL RULE: NO layout prop! */
          /* Dynamic will-change: transform ONLY while dragging to conserve VRAM */
          className="flex gap-4 md:gap-6 w-max cursor-grab active:cursor-grabbing transform-gpu"
          style={{
            willChange: isDragging ? 'transform' : 'auto',
            transform: 'translateZ(0)',
          }}
        >
          {items.map((item, idx) => {
            const posterSrc = item.poster_path
              ? item.poster_path.startsWith('http')
                ? item.poster_path
                : `${IMAGE_BASE_URL_POSTER}${item.poster_path}`
              : '/placeholder-poster.png';

            const cardTitle = item.title || item.name || '';
            const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
            const releaseYear = item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0] || '';

            return (
              <motion.div
                key={`${item.id}-${idx}`}
                variants={cardItemVariants}
                whileHover={{ scale: 1.04, y: -4 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => handleNavigate(item)}
                /* CRITICAL RULE: NO layout prop on card! Animates ONLY GPU scale & y */
                className="group relative flex-shrink-0 w-36 sm:w-44 md:w-52 lg:w-56 aspect-[2/3] rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-lg cursor-pointer transform-gpu"
                style={{
                  contain: 'paint layout',
                  transform: 'translateZ(0)',
                }}
              >
                {/* Poster Image */}
                <img
                  src={posterSrc}
                  alt={cardTitle}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transform-gpu group-hover:scale-105 transition-transform duration-300 ease-out"
                />

                {/* Rating Badge */}
                {rating && (
                  <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-xs font-bold text-yellow-400">
                    <Star className="w-3 h-3 fill-yellow-400" />
                    <span>{rating}</span>
                  </div>
                )}

                {/* Hover Overlay with Play Button & Details */}
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand text-white mb-2 shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.8)] self-center">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-1 truncate text-center">
                    {cardTitle}
                  </h3>

                  {releaseYear && (
                    <p className="text-xs text-neutral-400 text-center font-medium mt-0.5">
                      {releaseYear}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default React.memo(MovieCarousel);
