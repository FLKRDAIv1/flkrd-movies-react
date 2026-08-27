import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronRight, ChevronLeft, X, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';

export interface TourStep {
  id: number;
  step_key: string;
  title_ku: string;
  description_ku: string;
  media_url?: string;
  selector?: string;
  route?: string;
  priority: number;
}

const OnboardingTour: React.FC = () => {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(-1); // -1 = Tour Invite Modal
  const [isActive, setIsActive] = useState(false);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { mobileNavConfig } = useUI();
  const observerRef = useRef<MutationObserver | null>(null);

  // Theme Accent colors
  const r = mobileNavConfig?.colorR ?? 220;
  const g = mobileNavConfig?.colorG ?? 38;
  const b = mobileNavConfig?.colorB ?? 38;

  // 1. Fetch onboarding steps from Supabase sorted by priority
  const fetchSteps = async () => {
    try {
      const { data, error } = await supabase
        .from('onboarding_steps')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;
      if (data) {
        setSteps(data);
      }
    } catch (e) {
      console.error("[TOUR] Failed to fetch onboarding steps:", e);
    }
  };

  useEffect(() => {
    fetchSteps();

    // Check if user has already completed or skipped the onboarding tour
    const completed = localStorage.getItem('flkrd_onboarding_completed');
    if (!completed) {
      // Delay showing the invitation modal — wait longer to avoid clashing with
      // the notification prompt which shows at 3s. Tour shows at 7s.
      const timer = setTimeout(() => {
        setShowInvite(true);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen to global tour start event
  useEffect(() => {
    const handleStartEvent = () => {
      fetchSteps().then(() => {
        setIsActive(true);
        setCurrentIdx(0);
        setShowInvite(false);
      });
    };

    window.addEventListener('flkrd_start_onboarding_tour', handleStartEvent);
    return () => {
      window.removeEventListener('flkrd_start_onboarding_tour', handleStartEvent);
    };
  }, []);

  // 2. Track Bounding Bounding Rect of target element
  const updateHighlight = useCallback(() => {
    if (!isActive || currentIdx < 0 || currentIdx >= steps.length || isNavigating) {
      setHighlightRect(null);
      return;
    }

    const step = steps[currentIdx];
    if (!step.selector || step.selector === 'body') {
      setHighlightRect(null);
      return;
    }

    // Mobile specific selector mapping
    let targetSelector = step.selector;
    if (window.innerWidth < 768) {
      if (targetSelector === '.global-sidebar') {
        targetSelector = '.global-mobilenav';
      }
    }

    const el = document.querySelector(targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setHighlightRect(rect);
      }
    } else {
      setHighlightRect(null);
    }
  }, [isActive, currentIdx, steps, isNavigating]);

  // Handle routing when step changes
  useEffect(() => {
    if (!isActive || currentIdx < 0 || currentIdx >= steps.length) return;

    const step = steps[currentIdx];
    
    // Check if we need to navigate first
    if (step.route && step.route !== location.pathname) {
      setIsNavigating(true);
      navigate(step.route);
      setHighlightRect(null); // Clear highlight to shrink to center
      
      const navTimer = setTimeout(() => {
        setIsNavigating(false);
      }, 800);
      return () => clearTimeout(navTimer);
    } else {
      setIsNavigating(false);
    }
  }, [currentIdx, steps, navigate, location.pathname, isActive]);

  // Handle element polling once navigation settles
  useEffect(() => {
    if (!isActive || currentIdx < 0 || currentIdx >= steps.length || isNavigating) return;

    const step = steps[currentIdx];
    
    // Begin polling to find the element selector in the DOM (allows page load delay)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      
      let targetSelector = step.selector || '';
      if (window.innerWidth < 768) {
        if (targetSelector === '.global-sidebar') {
          targetSelector = '.global-mobilenav';
        }
      }

      const el = document.querySelector(targetSelector);
      if (el) {
        const initialRect = el.getBoundingClientRect();
        if (initialRect.width > 0 && initialRect.height > 0) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Re-read bounding rect after scrolling finishes
          setTimeout(() => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              setHighlightRect(rect);
            }
          }, 150);

          clearInterval(interval);
          return;
        }
      }
      
      if (attempts > 15) {
        // Stop polling after 3 seconds, keep it centered
        setHighlightRect(null);
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isActive, currentIdx, isNavigating, steps]);

  // Programmatically trigger interactive modal/drawer openings
  useEffect(() => {
    if (!isActive || currentIdx < 0 || currentIdx >= steps.length || isNavigating) return;
    const step = steps[currentIdx];

    // Poll for the play button to open the player modal if we are on a player guide step
    let playBtnAttempts = 0;
    const playBtnInterval = setInterval(() => {
      playBtnAttempts++;
      
      const playerOpen = document.querySelector('.player-relink-trigger') || 
                         document.querySelector('.player-cc-trigger') || 
                         document.querySelector('.player-episodes-trigger');
      if (playerOpen) {
        clearInterval(playBtnInterval);
        return;
      }

      if (step.selector && step.selector.startsWith('.player-')) {
        const playBtn = document.querySelector('.detail-play-btn') as HTMLElement;
        if (playBtn) {
          playBtn.click();
          clearInterval(playBtnInterval);
        }
      }

      if (playBtnAttempts > 25) {
        clearInterval(playBtnInterval);
      }
    }, 200);

    const timer = setTimeout(() => {
      if (step.selector === '.header-settings-trigger') {
        const el = document.querySelector('.header-settings-trigger') as HTMLElement;
        if (el) el.click();
      } else if (step.selector === '.player-relink-trigger') {
        const el = document.querySelector('.player-relink-trigger') as HTMLElement;
        if (el) el.click();
      } else if (step.selector === '.player-cc-trigger') {
        const el = document.querySelector('.player-cc-trigger') as HTMLElement;
        if (el) el.click();
      } else if (step.selector === '.player-episodes-trigger') {
        const el = document.querySelector('.player-episodes-trigger') as HTMLElement;
        if (el) el.click();
      }
    }, 950);

    return () => {
      clearInterval(playBtnInterval);
      clearTimeout(timer);
    };
  }, [isActive, currentIdx, steps, isNavigating]);

  // Auto-close settings modal when moving away from the settings step
  useEffect(() => {
    if (!isActive || currentIdx < 0 || currentIdx >= steps.length) return;
    const step = steps[currentIdx];
    if (step.selector !== '.header-settings-trigger') {
      const closeBtn = document.querySelector('.settings-modal-close-btn') as HTMLElement;
      if (closeBtn) {
        closeBtn.click();
      }
    }
  }, [currentIdx, steps, isActive]);

  // Monitor DOM changes to re-calculate rect if viewport changes
  useEffect(() => {
    if (!isActive || isNavigating) return;

    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight, true);

    // Watch for late renders
    observerRef.current = new MutationObserver(() => {
      updateHighlight();
    });
    observerRef.current.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight, true);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isActive, currentIdx, updateHighlight, isNavigating]);

  // Close tour on Escape key
  useEffect(() => {
    if (!showInvite && !isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkipTour();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInvite, isActive, handleSkipTour]);

  const handleStartTour = () => {
    setShowInvite(false);
    setIsActive(true);
    setCurrentIdx(0);
  };

  const handleSkipTour = () => {
    setShowInvite(false);
    setIsActive(false);
    setCurrentIdx(-1);
    localStorage.setItem('flkrd_onboarding_completed', 'true');
    
    // Ensure settings modal is closed if open
    const closeBtn = document.querySelector('.settings-modal-close-btn') as HTMLElement;
    if (closeBtn) {
      closeBtn.click();
    }

    // Ensure player modal is closed if open
    const closePlayerBtn = document.querySelector('[aria-label="Close video player"]') as HTMLElement;
    if (closePlayerBtn) {
      closePlayerBtn.click();
    }
  };

  const handleNext = () => {
    if (currentIdx < steps.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Completed Tour
      handleSkipTour();
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const currentStep = steps[currentIdx];

  // Safely get display rect to avoid layout snapping
  const getDisplayRect = () => {
    if (highlightRect && !isNavigating) return highlightRect;
    // Centered point representation when routing or element is missing
    return {
      left: window.innerWidth / 2,
      top: window.innerHeight / 2,
      width: 0,
      height: 0,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      bottom: window.innerHeight / 2,
      right: window.innerWidth / 2,
      toJSON: () => {}
    } as DOMRect;
  };

  const displayRect = getDisplayRect();

  // Helper to dynamically position the card in responsive layouts
  const getContainerStyle = () => {
    const isMobile = window.innerWidth < 768;

    if (displayRect.width === 0 || !currentStep || currentStep.selector === 'body' || isNavigating) {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: 0,
        right: 0,
        transform: 'translateY(-50%)',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '0 16px',
        pointerEvents: 'none' as const,
      };
    }

    if (isMobile) {
      // On mobile, center horizontally and determine top/bottom based on spotlight center
      const spotlightCenterY = displayRect.top + displayRect.height / 2;
      const isSpotlightInBottomHalf = spotlightCenterY > window.innerHeight / 2;

      return {
        position: 'fixed' as const,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '0 16px',
        pointerEvents: 'none' as const,
        top: isSpotlightInBottomHalf 
          ? 'calc(1.5rem + env(safe-area-inset-top, 0px))' 
          : 'auto',
        bottom: isSpotlightInBottomHalf 
          ? 'auto' 
          : 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
      };
    }

    const spaceBelow = window.innerHeight - displayRect.bottom;
    const spaceAbove = displayRect.top;

    let top = displayRect.bottom + 16;
    let left = Math.max(16, Math.min(window.innerWidth - 380, displayRect.left + displayRect.width / 2 - 180));

    // Show card above target if space below is too tight
    if (spaceBelow < 340 && spaceAbove > 340) {
      top = displayRect.top - 380;
    }

    return {
      position: 'fixed' as const,
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 999999,
      pointerEvents: 'none' as const,
    };
  };

  if (!showInvite && (!isActive || steps.length === 0)) return null;

  return (
    <div className="fixed inset-0 z-[999999] pointer-events-none overflow-hidden">
      
      {/* ── SCREEN BANNER / INVITATION MODAL ── */}
      <AnimatePresence>
        {showInvite && (
          <div 
            onClick={handleSkipTour}
            className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 pointer-events-auto select-none cursor-pointer" 
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0e0e11]/95 border rounded-[2rem] p-6 text-right relative overflow-hidden cursor-default shadow-2xl"
              style={{
                borderColor: `rgba(${r}, ${g}, ${b}, 0.25)`,
                boxShadow: `0 15px 40px rgba(${r}, ${g}, ${b}, 0.15)`
              }}
            >
              {/* Close Button */}
              <button
                onClick={handleSkipTour}
                style={{ touchAction: 'manipulation' }}
                className="absolute top-4 left-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 active:bg-white/25 text-gray-400 hover:text-white transition-all"
                aria-label="Close"
              >
                <X size={16} />
              </button>

              {/* Radial red shine overlay */}
              <div 
                className="absolute inset-x-0 -top-24 h-48 pointer-events-none opacity-40 blur-3xl z-0" 
                style={{ background: `radial-gradient(circle, rgb(${r}, ${g}, ${b}) 0%, transparent 60%)` }}
              />

              <div className="relative z-10 flex flex-col items-center text-center gap-4">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center border animate-bounce"
                  style={{ 
                    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
                    borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`
                  }}
                >
                  <Sparkles size={24} style={{ color: `rgb(${r}, ${g}, ${b})` }} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-white text-lg font-black uppercase italic tracking-tighter">ڕێبەری گەشتی فڵکەرد (Flkrd Tour)</h3>
                  <p className="text-xs text-gray-400 font-bold leading-relaxed px-4">
                    بەخێربێیت بۆ فڵکەرد! دەتەوێت لە ١ خولەکدا گرنگترین تایبەتمەندییەکان و بەشەکانی ماڵپەڕەکەت پیشان بدەین؟
                  </p>
                </div>

                <div className="w-full flex flex-col gap-2 mt-2">
                  <button
                    onClick={handleStartTour}
                    style={{ 
                      background: `linear-gradient(135deg, rgb(${r}, ${g}, ${b}) 0%, rgba(${r}, ${g}, ${b}, 0.7) 100%)`,
                      touchAction: 'manipulation'
                    }}
                    className="w-full py-3.5 rounded-2xl text-white text-xs font-[1000] uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md"
                  >
                    دەستپێکردنی گەشت <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={handleSkipTour}
                    style={{ touchAction: 'manipulation' }}
                    className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    بازدان ( Skip )
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ACTIVE SPOTLIGHT OVERLAY ── */}
      <AnimatePresence>
        {isActive && (
          <div className="absolute inset-0 pointer-events-auto z-[999997]" dir="rtl">
            
            {/* Liquid spotlight mask */}
            <motion.div
              className="fixed z-[999998] pointer-events-none"
              style={{
                left: displayRect.left - 8,
                top: displayRect.top - 8,
                width: displayRect.width + 16,
                height: displayRect.height + 16,
                border: displayRect.width > 0 ? `2.5px solid rgb(${r}, ${g}, ${b})` : '0px solid transparent',
                boxShadow: displayRect.width > 0 
                  ? `0 0 25px rgba(${r}, ${g}, ${b}, 0.6), 0 0 0 9999px rgba(0, 0, 0, 0.75)`
                  : `0 0 0px transparent, 0 0 0 9999px rgba(0, 0, 0, 0.75)`,
                borderRadius: displayRect.width > 0 ? '16px' : '50%',
              }}
              animate={{
                left: displayRect.left - 8,
                top: displayRect.top - 8,
                width: displayRect.width + 16,
                height: displayRect.height + 16,
                border: displayRect.width > 0 ? `2.5px solid rgb(${r}, ${g}, ${b})` : '0px solid transparent',
                boxShadow: displayRect.width > 0 
                  ? `0 0 25px rgba(${r}, ${g}, ${b}, 0.6), 0 0 0 9999px rgba(0, 0, 0, 0.75)`
                  : `0 0 0px transparent, 0 0 0 9999px rgba(0, 0, 0, 0.75)`,
                borderRadius: displayRect.width > 0 ? '16px' : '50%',
              }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
            />

            {/* Tour step popover card */}
            {currentStep && (
              <div style={getContainerStyle()} className="pointer-events-none">
                <motion.div
                  key={currentStep.id}
                  initial={{ scale: 0.9, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 15 }}
                  style={{
                    width: '100%',
                    maxWidth: window.innerWidth < 768 ? '380px' : '360px',
                    pointerEvents: 'auto' as const,
                  }}
                  className="bg-[#0b0b0d]/95 border border-white/10 p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-right flex flex-col gap-4 overflow-hidden"
                >
                  {isNavigating ? (
                    /* Premium Loading State between routes */
                    <div className="h-48 flex flex-col items-center justify-center gap-4 text-center select-none py-6">
                      <RefreshCw className="animate-spin text-gray-500" size={28} style={{ color: `rgb(${r}, ${g}, ${b})` }} />
                      <div className="space-y-1">
                        <p className="text-white text-xs font-black">گواستنەوە بۆ لاپەڕەی پەیوەندیدار...</p>
                        <p className="text-[10px] text-gray-400 font-bold">تکایە چاوەڕێبە تاوەکو بەشەکە لۆد دەبێت.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Visual GIF/Video Demonstration */}
                      {currentStep.media_url && (
                        <div className="w-full h-36 rounded-2xl overflow-hidden bg-black/40 border border-white/5 relative flex items-center justify-center animate-fadeIn">
                          <img 
                            src={currentStep.media_url} 
                            className="w-full h-full object-cover" 
                            alt="" 
                            loading="eager"
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="space-y-1.5 select-none">
                        <div className="flex items-center justify-between">
                          <span 
                            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border"
                            style={{ 
                              color: `rgb(${r}, ${g}, ${b})`,
                              borderColor: `rgba(${r}, ${g}, ${b}, 0.25)`,
                              backgroundColor: `rgba(${r}, ${g}, ${b}, 0.08)`
                            }}
                          >
                            گەشت • {currentIdx + 1} لە {steps.length}
                          </span>
                          <button 
                            onClick={handleSkipTour}
                            className="text-gray-500 hover:text-white transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <h4 className="text-white text-sm font-black uppercase tracking-tight">{currentStep.title_ku}</h4>
                        <p className="text-[11px] text-gray-400 font-bold leading-relaxed">{currentStep.description_ku}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/5">
                        <button
                          onClick={handleSkipTour}
                          className="text-[10px] text-gray-500 hover:text-white font-black uppercase tracking-widest"
                        >
                          بازدان
                        </button>

                        <div className="flex gap-2">
                          {currentIdx > 0 && (
                            <button
                              onClick={handleBack}
                              className="py-2.5 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-white text-[10px] font-black flex items-center gap-1 transition-colors"
                            >
                              <ChevronLeft size={12} /> پێشتر
                            </button>
                          )}
                          <button
                            onClick={handleNext}
                            className="py-2.5 px-4 rounded-xl text-white text-[10px] font-[1000] uppercase tracking-widest flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all shadow-md"
                            style={{ background: `linear-gradient(135deg, rgb(${r}, ${g}, ${b}) 0%, rgba(${r}, ${g}, ${b}, 0.7) 100%)` }}
                          >
                            {currentIdx === steps.length - 1 ? 'کۆتایی' : 'دواتر'} <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </div>
            )}

          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default OnboardingTour;
