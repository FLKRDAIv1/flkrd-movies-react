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
  autoHoverOpen = true,
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
            initial={false}
            animate={{
              borderColor: isOpen ? 'rgba(229, 9, 20, 0.4)' : 'rgba(255, 255, 255, 0.07)',
              backgroundColor: isOpen ? 'rgba(18, 18, 24, 0.95)' : 'rgba(255, 255, 255, 0.02)',
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="group relative overflow-hidden rounded-3xl border backdrop-blur-2xl transition-shadow duration-300 hover:shadow-2xl hover:shadow-brand/10 cursor-pointer"
          >
            {/* Left Accent Glow Stripe */}
            {isOpen && (
              <motion.div
                layoutId="accordionAccentGlow"
                className="absolute top-0 right-0 bottom-0 w-1.5 bg-gradient-to-b from-brand via-red-500 to-brand shadow-[0_0_15px_#e50914]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}

            {/* Accordion Item Header */}
            <div className="flex items-center justify-between p-4 md:p-5 gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Stage Number Badge */}
                <span className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black transition-colors ${
                  isOpen ? 'bg-brand text-white shadow-[0_0_12px_rgba(229,9,20,0.5)]' : 'bg-white/5 text-gray-400 group-hover:text-white'
                }`}>
                  0{index + 1}
                </span>

                {/* Stage Icon */}
                {item.icon && (
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-300 ${
                    isOpen 
                      ? 'border-brand/40 bg-brand/10 text-brand scale-105' 
                      : 'border-white/10 bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-white/10'
                  }`}>
                    {item.icon}
                  </div>
                )}

                {/* Title & Subtitle */}
                <div className="min-w-0 text-right">
                  <h4 className={`text-sm md:text-base font-black tracking-wide transition-colors ${
                    isOpen ? 'text-white' : 'text-gray-300 group-hover:text-white'
                  }`}>
                    {item.title}
                  </h4>
                  {item.subtitle && (
                    <p className="text-[11px] font-bold text-gray-400 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Side: Badge & Expand Icon */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {item.badge && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/5 border border-white/10 text-gray-300">
                    <Sparkles size={12} className="text-brand" />
                    {item.badge}
                  </span>
                )}
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                    isOpen ? 'border-brand/40 bg-brand/20 text-brand' : 'border-white/10 bg-white/5 text-gray-400'
                  }`}
                >
                  <ChevronDown size={18} />
                </motion.div>
              </div>
            </div>

            {/* Accordion Splitting Content Panel */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="accordion-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-5 pt-1 md:px-6 md:pb-6 border-t border-white/5 text-right">
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
