import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpRight, Sparkles } from 'lucide-react';
import Portal from '../Portal';

interface ExpandableCardProps {
  imageSrc?: string;
  title?: string;
  subtitle?: string;
  category?: string;
  content?: React.ReactNode;
  actionText?: string;
  onActionClick?: () => void;
  className?: string;
}

export default function ExpandableProfileCard({
  imageSrc = "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=1000",
  title = "Jane Doe",
  subtitle = "Senior UX Designer",
  category = "Featured Profile",
  content,
  actionText = "پەیوەندی بکە",
  onActionClick,
  className = ""
}: ExpandableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const layoutId = `expandable-profile-card-${title.replace(/\s+/g, '-').toLowerCase()}`;

  // Close on Escape key (Apple human interface standard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Lock body scroll when modal is expanded
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Apple visionOS Frosted Squircle Card */}
      <motion.div
        layoutId={layoutId}
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.975 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        className={`cursor-pointer relative h-72 w-full max-w-sm overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.04] backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_16px_36px_rgba(0,0,0,0.4)] group select-none ${className}`}
        role="button"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        {/* Card Background Image with Smooth Zoom */}
        <motion.img 
          layoutId={`image-${layoutId}`} 
          src={imageSrc} 
          alt={title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" 
        />

        {/* Multi-Stop Cinematic Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

        {/* Top Badges (Category & Expand Glyphs) */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-xl border border-white/15 text-[11px] font-semibold tracking-wide text-white/90 uppercase shadow-sm">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{category}</span>
          </div>

          <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/80 group-hover:text-white group-hover:bg-white/20 group-hover:scale-110 transition-all duration-200">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        
        {/* Card Bottom Content */}
        <div className="absolute bottom-0 inset-x-0 p-5 z-10">
          <motion.p 
            layoutId={`subtitle-${layoutId}`} 
            className="text-red-400 text-xs font-semibold tracking-wider uppercase mb-1 drop-shadow-sm"
          >
            {subtitle}
          </motion.p>
          <motion.h3 
            layoutId={`title-${layoutId}`} 
            className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-md"
          >
            {title}
          </motion.h3>
        </div>
      </motion.div>

      {/* Expanded Apple visionOS Sheet Modal */}
      <Portal id="expandable-profile-card-portal">
        <AnimatePresence>
          {isOpen && (
            <div 
              className="fixed inset-0 z-[120000] flex items-center justify-center p-4 sm:p-6 overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              {/* Progressive Blur Scrim Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setIsOpen(false)}
                className="absolute inset-0 bg-black/70 backdrop-blur-2xl cursor-pointer"
              />

              {/* visionOS Glass Panel Container */}
              <motion.div
                layoutId={layoutId}
                transition={{ type: 'spring', bounce: 0, duration: 0.38 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl h-[85vh] max-h-[720px] bg-neutral-900/85 rounded-[36px] overflow-hidden border border-white/20 z-10 flex flex-col md:flex-row shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_32px_80px_rgba(0,0,0,0.7)] backdrop-blur-3xl"
              >
                {/* Apple Circular Glass Close Button */}
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)} 
                  aria-label="Close"
                  className="absolute top-5 right-5 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/20 text-white backdrop-blur-xl shadow-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </motion.button>
                
                {/* Left/Top Media Showcase */}
                <div className="relative h-64 md:h-full md:w-1/2 shrink-0 overflow-hidden bg-black/40">
                  <motion.img 
                    layoutId={`image-${layoutId}`} 
                    src={imageSrc} 
                    alt={title}
                    className="h-full w-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-black/20 md:bg-gradient-to-r md:from-transparent md:to-neutral-900/90" />
                </div>
                
                {/* Right/Bottom Editorial Details */}
                <div className="p-6 sm:p-8 md:p-10 w-full md:w-1/2 flex flex-col h-full overflow-y-auto custom-scrollbar text-right" style={{ direction: 'rtl' }}>
                  {/* Category Pill */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand/15 border border-brand/30 text-brand text-xs font-semibold tracking-wide uppercase">
                      <Sparkles className="w-3 h-3 text-brand" />
                      {category}
                    </span>
                  </div>

                  <motion.p 
                    layoutId={`subtitle-${layoutId}`} 
                    className="text-red-400 text-sm font-semibold tracking-wide uppercase mb-1"
                  >
                    {subtitle}
                  </motion.p>

                  <motion.h3 
                    layoutId={`title-${layoutId}`} 
                    className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white mb-4"
                  >
                    {title}
                  </motion.h3>

                  {/* Specular Light Divider */}
                  <div className="w-full h-px bg-gradient-to-l from-white/20 via-white/10 to-transparent mb-6" />
                  
                  {/* Body Content */}
                  <motion.div 
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="text-neutral-200 text-sm sm:text-base leading-relaxed grow space-y-4 font-normal"
                  >
                    {content || (
                      <div className="flex flex-col gap-4">
                        <p className="opacity-90">
                          دیزاینەر و پێشکەشکاری پسپۆڕ لە بواری UI/UX بە زیاتر لە ٨ ساڵ ئەزموون لە دروستکردنی ئەزموونی دیجیتاڵی ئاست بەرز و کارلێککەر.
                        </p>
                        
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-1.5">
                          <h4 className="text-white font-bold text-sm tracking-tight">پێشینە و دەستکەوتەکان</h4>
                          <p className="text-neutral-300 text-xs sm:text-sm">
                            بەڕێوەبردنی تیمەکانی دیزاین لە گەورەترین کۆمپانیاکانی تەکنەلۆژیا و بەشداریکردن لە پەرەپێدانی سیستمە دیزاینە پێشکەوتووەکان.
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-1.5">
                          <h4 className="text-white font-bold text-sm tracking-tight">دیدگای داهاتوو</h4>
                          <p className="text-neutral-300 text-xs sm:text-sm">
                            تەرکیزکردن لەسەر گەیاندنی زیرەکی دەستکرد بە شێوازێکی سادە و دۆستانە بۆ سەرجەم بەکارهێنەران.
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* Apple Liquid Glass CTA Button */}
                  <div className="pt-6 mt-auto border-t border-white/10 flex items-center justify-end gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onActionClick || (() => setIsOpen(false))}
                      className="w-full sm:w-auto px-7 py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-neutral-100 active:scale-95 transition-all shadow-[0_4px_20px_rgba(255,255,255,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>{actionText}</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}

