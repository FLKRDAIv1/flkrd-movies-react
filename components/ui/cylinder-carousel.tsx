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
    // Calculate 3D cylinder radius based on card count and card width
    const radius = N > 0 ? Math.max(250, Math.round(cardWidth / (2 * Math.tan(Math.PI / N)))) : 300;

    return (
      <div
        ref={ref}
        className={cn(
          "w-full h-full min-h-[400px] grid place-items-center overflow-hidden relative group",
          className
        )}
        style={{
          perspective: "1000px",
          maskImage: "linear-gradient(90deg, transparent, #000 15% 85%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, #000 15% 85%, transparent)",
        }}
        {...props}
      >
        <div
          className={cn(
            "grid place-items-center [transform-style:preserve-3d] group-hover:[animation-play-state:paused]",
            containerClassName
          )}
          style={{
            animation: `flkrd-cylinder-rotate ${animationDuration}s linear infinite`,
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

          {images.map((img, i) => {
            const angle = (360 / N) * i;
            return (
              <img
                key={i}
                src={img.src}
                alt={img.alt || `Carousel image ${i}`}
                onClick={() => onItemClick?.(img)}
                className={cn(
                  "[grid-area:1/1] object-cover rounded-2xl cursor-pointer hover:scale-110 active:scale-95 transition-all duration-300 shadow-[0_15px_35px_rgba(0,0,0,0.8)] border border-white/10 hover:border-red-500/50 hover:shadow-[0_0_30px_rgba(229,9,20,0.5)]",
                  cardClassName
                )}
                style={{
                  width: `${cardWidth}px`,
                  aspectRatio: "7/10",
                  transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }
);

CylinderCarousel.displayName = "CylinderCarousel";
