import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MovieCard } from './MovieCard';
import { MovieListCard } from './MovieListCard';
import { ViewToggle } from './ui/ViewToggle';
import { useUI } from '../contexts/UIContext';

interface MovieLayoutManagerProps {
  items: any[];
  type?: 'movie' | 'tv' | 'dubbed';
  isProgressRow?: boolean;
  isMyListPage?: boolean;
  onRemove?: (item: any) => void;
  showToggleHeader?: boolean;
  gridClassName?: string;
  listClassName?: string;
  className?: string;
}

const gridContainerVariants = {
  initial: { opacity: 0, y: 15 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  },
};

/**
 * Parent Layout Orchestrator for FLKRD MOVIES
 * Flawlessly transitions between Grid & List views with 100% GPU-accelerated Framer Motion popLayout.
 */
export const MovieLayoutManager: React.FC<MovieLayoutManagerProps> = ({
  items = [],
  type,
  isProgressRow,
  isMyListPage,
  onRemove,
  showToggleHeader = false,
  gridClassName = '',
  listClassName = '',
  className = '',
}) => {
  const { viewMode } = useUI();

  return (
    <div className={`w-full flex flex-col gap-6 ${className}`}>
      {/* Optional Top Header with View Toggle */}
      {showToggleHeader && (
        <div className="flex items-center justify-between w-full px-2 py-1">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
            <span>{items.length} Titles</span>
          </div>
          <ViewToggle />
        </div>
      )}

      {/* GPU-Accelerated Layout Container */}
      <AnimatePresence mode="popLayout">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid-view-container"
            variants={gridContainerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 md:gap-6 w-full transform-gpu movie-grid-container ${gridClassName}`}
          >
            {items.map((item, idx) => (
              <MovieCard
                key={item.id || idx}
                item={item}
                type={type}
                isProgressRow={isProgressRow}
                isMyListPage={isMyListPage}
                onRemove={onRemove}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list-view-container"
            variants={gridContainerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`flex flex-col gap-4 sm:gap-5 w-full transform-gpu ${listClassName}`}
          >
            {items.map((item, idx) => (
              <MovieListCard
                key={item.id || idx}
                item={item}
                type={type}
                isProgressRow={isProgressRow}
                isMyListPage={isMyListPage}
                onRemove={onRemove}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MovieLayoutManager;
