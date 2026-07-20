"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CarouselImage {
  src: string;
  alt?: string;
  id?: number;
  media_type?: string;
}

export interface CylinderCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  images: CarouselImage[];
  containerClassName?: string;
  cardClassName?: string;
  animationDuration?: number; // in seconds
  cardWidth?: number; // in pixels
  onItemClick?: (item: CarouselImage) => void;
}

export const CylinderCarousel = React.forwardRef<HTMLDivElement, CylinderCarouselProps>(
  (
    {
      images,
      className,
      containerClassName,
      cardClassName,
      animationDuration = 4,
      cardWidth = 220,
      onItemClick,
      ...props
    },
    ref
  ) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const N = images.length;

    const handleNext = useCallback(() => {
      if (N === 0) return;
      setActiveIndex((prev) => (prev + 1) % N);
    }, [N]);

    const handlePrev = useCallback(() => {
      if (N === 0) return;
      setActiveIndex((prev) => (prev - 1 + N) % N);
    }, [N]);

    // Autoplay every 3.5s unless hovered
    useEffect(() => {
      if (isHovered || N === 0) return;
      const timer = setInterval(handleNext, 3500);
      return () => clearInterval(timer);
    }, [isHovered, handleNext, N]);

    if (N === 0) return null;

    return (
      <div
        ref={ref}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "w-full h-full min-h-[460px] relative flex flex-col items-center justify-center overflow-visible select-none",
          className
        )}
        {...props}
      >
        {/* 3D Viewport */}
        <div
          className="w-full max-w-5xl h-[380px] relative flex items-center justify-center"
          style={{ perspective: "1000px" }}
        >
          {images.map((img, index) => {
            // Compute wrapped distance from active index (-N/2 to N/2)
            let diff = index - activeIndex;
            diff = ((diff % N) + N) % N;
            if (diff > N / 2) diff -= N;

            const absDiff = Math.abs(diff);

            // Hide cards beyond distance of 3 to prevent clutter and keep focus
            if (absDiff > 3) return null;

            // Calculate 3D Coverflow properties (ALL posters face 100% FORWARD)
            const isCenter = diff === 0;
            const xOffset = diff * (cardWidth * 0.78);
            const rotateY = diff > 0 ? -22 : diff < 0 ? 22 : 0;
            const scale = isCenter ? 1.15 : Math.max(0.65, 1 - absDiff * 0.18);
            const zIndex = 50 - absDiff * 10;
            const opacity = Math.max(0.35, 1 - absDiff * 0.22);

            return (
              <motion.div
                key={img.id || index}
                initial={false}
                animate={{
                  x: xOffset,
                  rotateY: rotateY,
                  scale: scale,
                  zIndex: zIndex,
                  opacity: opacity,
                }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 25,
                }}
                onClick={() => {
                  if (isCenter) {
                    onItemClick?.(img);
                  } else {
                    setActiveIndex(index);
                  }
                }}
                className={cn(
                  "absolute cursor-pointer rounded-2xl overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 transition-all duration-300",
                  isCenter
                    ? "border-red-500/80 shadow-[0_0_40px_rgba(229,9,20,0.6)] ring-2 ring-red-500/40"
                    : "hover:border-white/40",
                  cardClassName
                )}
                style={{
                  width: `${cardWidth}px`,
                  aspectRatio: "7/10",
                  transformStyle: "preserve-3d",
                }}
              >
                <img
                  src={img.src}
                  alt={img.alt || `Movie ${index}`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://image.tmdb.org/t/p/w500/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg";
                  }}
                  className="w-full h-full object-cover rounded-2xl pointer-events-none"
                />

                {/* Center card glowing play badge overlay */}
                {isCenter && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col items-center justify-end p-4 text-center opacity-90 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-900/50 mb-1 scale-90 group-hover:scale-105 transition-transform">
                      <Play size={18} fill="white" className="ml-0.5" />
                    </div>
                    {img.alt && (
                      <span className="text-xs font-black text-white uppercase italic tracking-tighter line-clamp-1 drop-shadow-md">
                        {img.alt}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Carousel Navigation Arrow Controls */}
        <div className="flex items-center justify-center gap-6 mt-4 z-50">
          <button
            onClick={handlePrev}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-red-600/80 hover:border-red-500 text-white flex items-center justify-center transition-all shadow-xl active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex items-center gap-1.5">
            {images.slice(0, Math.min(N, 12)).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  activeIndex % Math.min(N, 12) === idx
                    ? "w-6 bg-red-600"
                    : "w-1.5 bg-white/20 hover:bg-white/40"
                )}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-red-600/80 hover:border-red-500 text-white flex items-center justify-center transition-all shadow-xl active:scale-95"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }
);

CylinderCarousel.displayName = "CylinderCarousel";
