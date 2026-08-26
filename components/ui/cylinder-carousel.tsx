"use client";

import React from "react";
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
      animationDuration = 32,
      cardWidth = 200,
      onItemClick,
      ...props
    },
    ref
  ) => {
    const N = images.length;
    if (N === 0) return null;

    // Calculate exact 3D cylinder radius so cards touch edges seamlessly without overlapping or gaps
    const radius = Math.max(260, Math.round((cardWidth * 0.5) / Math.tan(Math.PI / N)));

    const customStyle = {
      "--n": N,
      "--w": `${cardWidth}px`,
      "--ba": `calc(360deg / var(--n))`,
      "--radius": `${radius}px`,
      "--anim-dur": `${animationDuration}s`,
    } as React.CSSProperties;

    return (
      <div
        ref={ref}
        className={cn(
          "w-full h-full min-h-[440px] grid place-items-center relative overflow-visible group py-12 select-none",
          className
        )}
        style={{
          perspective: "1100px",
        }}
        {...props}
      >
        <div
          className={cn(
            "grid place-items-center [transform-style:preserve-3d] group-hover:[animation-play-state:paused]",
            containerClassName
          )}
          style={{
            ...customStyle,
            animation: "flkrd-cylinder-rotate var(--anim-dur) linear infinite",
          }}
        >
          <style>
            {`
              @keyframes flkrd-cylinder-rotate {
                from { transform: rotateY(0deg); }
                to { transform: rotateY(360deg); }
              }
            `}
          </style>

          {images.map((img, i) => (
            <div
              key={img.id || i}
              onClick={() => onItemClick?.(img)}
              className={cn(
                "[grid-area:1/1] relative cursor-pointer rounded-2xl [transform-style:preserve-3d] hover:scale-110 active:scale-95 transition-transform duration-300 shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-white/20 hover:border-red-500/80 hover:shadow-[0_0_40px_rgba(229,9,20,0.7)] group/card",
                cardClassName
              )}
              style={{
                width: "var(--w)",
                aspectRatio: "7/10",
                transform: `rotateY(calc(${i} * var(--ba))) translateZ(var(--radius))`,
                touchAction: 'manipulation',
              }}
            >
              {/* Front Face (Visible when facing viewer) */}
              <img
                src={img.src}
                alt={img.alt || `Movie ${i}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://image.tmdb.org/t/p/w500/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg";
                }}
                className="w-full h-full object-cover rounded-2xl [backface-visibility:hidden] pointer-events-none"
              />

              {/* Back Face (Visible when card rotates to back of cylinder - un-mirrored with scaleX(-1)) */}
              <img
                src={img.src}
                alt={img.alt || `Movie ${i}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://image.tmdb.org/t/p/w500/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg";
                }}
                className="w-full h-full object-cover rounded-2xl absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)_scaleX(-1)] pointer-events-none"
              />

              {/* Title & Glossy Glow Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity rounded-2xl flex items-end justify-center p-3 text-center pointer-events-none">
                {img.alt && (
                  <span className="text-xs font-black text-white uppercase italic tracking-tighter line-clamp-1 drop-shadow-md">
                    {img.alt}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

CylinderCarousel.displayName = "CylinderCarousel";
