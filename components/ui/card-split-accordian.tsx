import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles } from 'lucide-react';

export interface CardSplitAccordionItem {
  id: string | number;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  badge?: string;
  accentColor?: string;
}

export interface CardSplitAccordionProps {
  items: CardSplitAccordionItem[];
  defaultActiveId?: string | number;
  autoHoverOpen?: boolean;
  className?: string;
}

export const CardSplitAccordion: React.FC<CardSplitAccordionProps> = ({
  items,
  defaultActiveId,
  autoHoverOpen = false,
  className = '',
}) => {
  const [activeId, setActiveId] = useState<string | number>(
    defaultActiveId !== undefined ? defaultActiveId : items[0]?.id || 1
  );

  const handleMouseEnter = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    if (autoHoverOpen) {
      setActiveId(id);
    }
  };

  const handleClick = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    setActiveId(prev => (prev === id ? '' : id));
  };

  return (
    <div className={`w-full space-y-3.5 ${className}`} style={{ direction: 'rtl' }}>
      {items.map((item, index) => {
        const isOpen = activeId === item.id;
        const color = item.accentColor || '#e50914';

        return (
          <motion.div
            key={item.id}
            layout
            onMouseEnter={(e) => handleMouseEnter(e, item.id)}
            onClick={(e) => handleClick(e, item.id)}
            whileTap={{ scale: 0.985 }}
            initial={false}
            animate={{
              borderColor: isOpen ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.08)',
              backgroundColor: isOpen ? 'rgba(18, 18, 26, 0.82)' : 'rgba(255, 255, 255, 0.025)',
              boxShadow: isOpen
                ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.2), 0 25px 50px -12px rgba(0, 0, 0, 0.6)'
                : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 4px 15px -3px rgba(0, 0, 0, 0.25)',
            }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            className="group relative overflow-hidden rounded-[1.75rem] border backdrop-blur-2xl cursor-pointer select-none transition-colors"
          >
            {/* Apple visionOS Right Accent Glow Indicator */}
            {isOpen && (
              <motion.div
                layoutId="accordionAccentGlow"
                className="absolute top-0 right-0 bottom-0 w-1.5 bg-gradient-to-b from-brand via-red-500 to-brand shadow-[0_0_15px_rgba(229,9,20,0.6)]"
                transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              />
            )}

            {/* Accordion Item Header */}
            <div className="flex items-center justify-between p-4 md:p-5 gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Stage Number Badge */}
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition-all ${
                    isOpen
                      ? 'bg-brand text-white shadow-[0_0_15px_rgba(229,9,20,0.5)] scale-105'
                      : 'bg-white/5 text-white/50 group-hover:text-white group-hover:bg-white/10'
                  }`}
                >
                  0{index + 1}
                </span>

                {/* Stage Icon in Squircle Glass Container */}
                {item.icon && (
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300 ${
                      isOpen
                        ? 'border-brand/40 bg-brand/15 text-brand scale-105 shadow-[0_0_20px_rgba(229,9,20,0.2)]'
                        : 'border-white/10 bg-white/[0.04] text-white/60 group-hover:text-white group-hover:bg-white/[0.08]'
                    }`}
                  >
                    {item.icon}
                  </div>
                )}

                {/* Title & Subtitle with Optical Sizing */}
                <div className="min-w-0 text-right">
                  <h4
                    className={`text-sm md:text-base font-black tracking-tight transition-colors ${
                      isOpen ? 'text-white' : 'text-gray-200 group-hover:text-white'
                    }`}
                  >
                    {item.title}
                  </h4>
                  {item.subtitle && (
                    <p className="text-[11px] font-medium text-white/50 truncate mt-0.5 tracking-normal">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Left Side: Badge & Expand Chevron */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {item.badge && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/[0.06] border border-white/15 text-white/90 shadow-sm backdrop-blur-xl">
                    <Sparkles size={12} className="text-brand animate-pulse" />
                    {item.badge}
                  </span>
                )}
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
                    isOpen
                      ? 'border-brand/40 bg-brand/20 text-brand'
                      : 'border-white/10 bg-white/5 text-white/50 group-hover:text-white group-hover:bg-white/10'
                  }`}
                >
                  <ChevronDown size={18} />
                </motion.div>
              </div>
            </div>

            {/* Accordion Content with Fluid Spring Expansion */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="accordion-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.38 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-6 pt-2 md:px-6 md:pb-7 border-t border-white/[0.08] text-right">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

export default CardSplitAccordion;
