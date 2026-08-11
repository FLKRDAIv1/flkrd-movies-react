import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, List } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useTranslation } from '../../contexts/LanguageContext';

interface ViewToggleProps {
  value?: 'grid' | 'list';
  onChange?: (mode: 'grid' | 'list') => void;
  size?: 'sm' | 'md';
  showText?: boolean;
  className?: string;
}

/**
 * Ultra-Premium Pill View Toggle (Grid vs List)
 * Supports compact mobile headers and full desktop headers.
 * 100% GPU-accelerated spring layout transitions.
 */
export const ViewToggle: React.FC<ViewToggleProps> = ({
  value,
  onChange,
  size = 'sm',
  showText = true,
  className = '',
}) => {
  const { viewMode: contextViewMode, setViewMode: contextSetViewMode } = useUI();
  const { language } = useTranslation();
  const isRtl = language === 'ku' || language === 'badini';

  const activeMode = value || contextViewMode;
  const handleModeChange = (mode: 'grid' | 'list') => {
    if (onChange) {
      onChange(mode);
    } else {
      contextSetViewMode(mode);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`relative inline-flex items-center p-0.5 bg-black/60 border border-white/20 backdrop-blur-2xl rounded-full shadow-md transform-gpu select-none shrink-0 ${
        isSmall ? 'h-7 sm:h-8' : 'h-9 sm:h-10'
      } ${className}`}
      role="group"
      aria-label="View Mode Toggle"
    >
      {/* Grid Mode Button */}
      <motion.button
        tabIndex={0}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleModeChange('grid')}
        className={`relative z-10 flex items-center justify-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full font-bold transition-all duration-300 cursor-pointer transform-gpu focus:outline-none ${
          isSmall ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'
        } ${
          activeMode === 'grid'
            ? 'text-red-600 font-black shadow-sm'
            : 'text-neutral-300 hover:text-white'
        }`}
        aria-pressed={activeMode === 'grid'}
        title={isRtl ? 'تۆڕی' : 'Grid View'}
      >
        {activeMode === 'grid' && (
          <motion.div
            layoutId="viewToggleHeaderPill"
            className="absolute inset-0 bg-white rounded-full shadow-[0_2px_10px_rgba(255,255,255,0.5)] z-[-1]"
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        )}
        <LayoutGrid className={isSmall ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-4 h-4'} />
        {showText && (
          <span className={`hidden sm:inline ${isRtl ? 'font-kurdish' : 'tracking-wide font-semibold'}`}>
            {isRtl ? 'تۆڕی' : 'Grid'}
          </span>
        )}
      </motion.button>

      {/* List Mode Button */}
      <motion.button
        tabIndex={0}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleModeChange('list')}
        className={`relative z-10 flex items-center justify-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full font-bold transition-all duration-300 cursor-pointer transform-gpu focus:outline-none ${
          isSmall ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'
        } ${
          activeMode === 'list'
            ? 'text-red-600 font-black shadow-sm'
            : 'text-neutral-300 hover:text-white'
        }`}
        aria-pressed={activeMode === 'list'}
        title={isRtl ? 'لیست' : 'List View'}
      >
        {activeMode === 'list' && (
          <motion.div
            layoutId="viewToggleHeaderPill"
            className="absolute inset-0 bg-white rounded-full shadow-[0_2px_10px_rgba(255,255,255,0.5)] z-[-1]"
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        )}
        <List className={isSmall ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-4 h-4'} />
        {showText && (
          <span className={`hidden sm:inline ${isRtl ? 'font-kurdish' : 'tracking-wide font-semibold'}`}>
            {isRtl ? 'لیست' : 'List'}
          </span>
        )}
      </motion.button>
    </div>
  );
};

export default ViewToggle;
