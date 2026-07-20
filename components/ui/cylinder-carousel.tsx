"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play } from "lucide-react";
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
      animationDuration = 28,
      cardWidth = 200,
      onItemClick,
      ...props
    },
    ref
  ) => {
    const [rotationAngle, setRotationAngle] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const animRef = useRef<number | null>(null);
    const N = images.length;

    // Smooth continuous 3D circle orbit animation loop
    useEffect(() => {
      let lastTime = performance.now();
      const speedDegPerMs = 360 / (animationDuration * 1000);

      const loop = (now: number) => {
        const delta = now - lastTime;
        lastTime = now;

        if (!isHovered && N > 0) {
          setRotationAngle((prev) => (prev + delta * speedDegPerMs) % 360);
        }

        animRef.current = requestAnimationFrame(loop);
      };

      animRef.current = requestAnimationFrame(loop);
      return () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
    }, [isHovered, animationDuration, N]);

    if (N === 0) return null;

    // Radius of 3D orbit circle
    const radius = Math.max(300, Math.round(cardWidth * 1.75));

    return (
      <div
        ref={ref}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "w-full h-full min-h-[460px] relative flex items-center justify-center overflow-visible select-none py-10",
          className
        )}
        style={{ perspective: "1200px" }}
        {...props}
      >
        <div className="w-full max-w-6xl h-[400px] relative flex items-center justify-center [transform-style:preserve-3d]">
          {images.map((img, index) => {
            // Angle of card i on the 3D orbit circle
            const angleDeg = (rotationAngle + (360 / N) * index) % 360;
            const angleRad = (angleDeg * Math.PI) / 180;

            // X and Z coordinates on 3D circle
            const x = radius * Math.sin(angleRad);
            const z = radius * Math.cos(angleRad);

            // Normalized Z (-1 to 1) where 1 is front center, -1 is back center
            const normZ = z / radius;

            // Calculate scale, zIndex, opacity, and tilt based on Z position
            const scale = 0.85 + normZ * 0.3; // 0.55 in back, 1.15 in front
            const opacity = 0.55 + normZ * 0.45; // 0.10 in back, 1.0 in front
            const zIndex = Math.round((normZ + 1) * 100);
            const brightness = 70 + normZ * 30; // 40% back, 100% front
            const tiltY = (x / radius) * -15; // Subtle 3D tilt inwards towards center

            const isFrontCard = normZ > 0.85;

            return (
              <div
                key={img.id || index}
                onClick={() => onItemClick?.(img)}
                className={cn(
                  "absolute cursor-pointer rounded-2xl overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/15 transition-all duration-300",
                  isFrontCard
                    ? "border-red-500/80 shadow-[0_0_40px_rgba(229,9,20,0.6)] ring-2 ring-red-500/40"
                    : "hover:border-white/50",
                  cardClassName
                )}
                style={{
                  width: `${cardWidth}px`,
                  aspectRatio: "7/10",
                  transform: `translate3d(${x}px, 0px, ${z}px) rotateY(${tiltY}deg) scale(${scale})`,
                  zIndex: zIndex,
                  opacity: opacity,
                  filter: `brightness(${brightness}%)`,
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

                {/* Front card title & play badge overlay */}
                {isFrontCard && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col items-center justify-end p-4 text-center opacity-90 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-900/50 mb-1 scale-95 group-hover:scale-110 transition-transform">
                      <Play size={18} fill="white" className="ml-0.5" />
                    </div>
                    {img.alt && (
                      <span className="text-xs font-black text-white uppercase italic tracking-tighter line-clamp-1 drop-shadow-md">
                        {img.alt}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

CylinderCarousel.displayName = "CylinderCarousel";
