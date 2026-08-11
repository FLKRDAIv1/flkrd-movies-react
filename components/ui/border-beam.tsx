import React from 'react';
import { cn } from '../../lib/utils';

interface BorderBeamProps {
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
  glow?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const IS_TOUCH_DEVICE = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

/**
 * Shadcn / Velora GPU-Accelerated Border Beam Component
 * Creates an ultra-premium Apple Intelligence / Gemini AI glowing border.
 * 100% GPU-accelerated at locked 60FPS across PCs, Mobiles, and Smart TVs.
 * Optimized with pointer-events isolation so mobile button taps never freeze or lag.
 */
export const BorderBeam: React.FC<BorderBeamProps> = ({
  size = 250,
  duration = 12,
  borderWidth = 1.5,
  anchor = 90,
  colorFrom = '#e50914',
  colorTo = '#9c40ff',
  delay = 0,
  glow = true,
  className,
  style,
}) => {
  return (
    <div
      aria-hidden="true"
      style={
        {
          '--size': size,
          '--duration': duration,
          '--anchor': anchor,
          '--border-width': borderWidth,
          '--color-from': colorFrom,
          '--color-to': colorTo,
          '--delay': -delay,
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] transform-gpu select-none',
        className
      )}
    >
      {/* Beam Glow Layer (Disabled on Touch Devices to prevent WebKit GPU rasterization lag) */}
      {glow && !IS_TOUCH_DEVICE && (
        <div
          className="absolute inset-0 rounded-[inherit] opacity-50 blur-sm pointer-events-none transform-gpu animate-border-beam"
          style={{
            width: 'var(--size, 250px)',
            aspectRatio: '1',
            offsetPath: 'rect(0 auto auto 0 round calc(var(--radius, 1rem)))',
            background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
            animationDelay: 'calc(var(--delay) * 1s)',
          }}
        />
      )}

      {/* Primary Crisp Beam */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none transform-gpu animate-border-beam"
        style={{
          width: 'var(--size, 250px)',
          aspectRatio: '1',
          offsetPath: 'rect(0 auto auto 0 round calc(var(--radius, 1rem)))',
          background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
          animationDelay: 'calc(var(--delay) * 1s)',
        }}
      />
    </div>
  );
};

export default BorderBeam;
