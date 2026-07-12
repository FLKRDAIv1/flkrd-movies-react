import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';
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
      // Delay showing the invitation modal slightly to allow initial load animations to finish
      const timer = setTimeout(() => {
        setShowInvite(true);
      }, 3000);
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
    if (!isActive || currentIdx < 0 || currentIdx >= steps.length) {
      setHighlightRect(null);
      return;
    }

    const step = steps[currentIdx];
    if (!step.selector || step.selector === 'body') {
      setHighlightRect(null);
      return;
    }

    const el = document.querySelector(step.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setHighlightRect(rect);
      }
    } else {
      setHighlightRect(null);
    }
  }, [isActive, currentIdx, steps]);

  // Handle routing and element polling when step changes
  useEffect(() => {
    if (!isActive || currentIdx < 0 || currentIdx >= steps.length) return;

    const step = steps[currentIdx];
    
    // Check if we need to navigate first
    if (step.route && step.route !== location.pathname) {
      navigate(step.route);
      setHighlightRect(null); // Clear highlight temporarily
    }

    // Begin polling to find the element selector in the DOM (allows page load delay)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const el = document.querySelector(step.selector || '');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Re-read bounding rect after scrolling finishes
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setHighlightRect(rect);
          }
        }, 150);

        clearInterval(interval);
      } else if (attempts > 20) {
        // Stop polling after 4 seconds if element isn't found
        setHighlightRect(null);
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isActive, currentIdx, navigate, location.pathname, steps]);

  // Programmatically trigger interactive modal/drawer openings
  useEffect(() => {
    if (!isActive || currentIdx < 0 || currentIdx >= steps.length) return;
    const step = steps[currentIdx];

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
    }, 800);

    return () => clearTimeout(timer);
  }, [isActive, currentIdx, steps]);

  // Monitor DOM changes to re-calculate rect if viewport changes
  useEffect(() => {
    if (!isActive) return;

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
  }, [isActive, currentIdx, updateHighlight]);

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

  if (!showInvite && (!isActive || steps.length === 0)) return null;

  const currentStep = steps[currentIdx];

  // Helper to dynamically position the card in responsive layouts
  const getCardStyle = () => {
    if (!highlightRect || !currentStep || currentStep.selector === 'body') {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 999999,
        width: 'calc(100% - 32px)',
        maxWidth: '380px',
      };
    }

    const spaceBelow = window.innerHeight - highlightRect.bottom;
    const spaceAbove = highlightRect.top;

    let top = highlightRect.bottom + 16;
    let left = Math.max(16, Math.min(window.innerWidth - 380, highlightRect.left + highlightRect.width / 2 - 180));

    // Show card above target if space below is too tight
    if (spaceBelow < 340 && spaceAbove > 340) {
      top = highlightRect.top - 380;
    }

    return {
      position: 'fixed' as const,
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 999999,
      width: 'calc(100% - 32px)',
      maxWidth: '360px',
    };
  };

  return (
    <div className="fixed inset-0 z-[999999] pointer-events-none overflow-hidden">
      
      {/* ── SCREEN BANNER / INVITATION MODAL ── */}
      <AnimatePresence>
        {showInvite && (
          <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 pointer-events-auto select-none" dir="rtl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-[#0e0e11]/95 border rounded-[2rem] p-6 text-right relative overflow-hidden"
              style={{
                borderColor: `rgba(${r}, ${g}, ${b}, 0.25)`,
                boxShadow: `0 15px 40px rgba(${r}, ${g}, ${b}, 0.15)`
              }}
            >
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
                    className="w-full py-3.5 rounded-2xl text-white text-xs font-[1000] uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md"
                    style={{ background: `linear-gradient(135deg, rgb(${r}, ${g}, ${b}) 0%, rgba(${r}, ${g}, ${b}, 0.7) 100%)` }}
                  >
                    دەستپێکردنی گەشت <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={handleSkipTour}
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
            
            {/* Dark mask spotlight layer */}
            {highlightRect ? (
              <motion.div
                className="fixed bg-black/75 z-[999998] pointer-events-none"
                style={{
                  left: highlightRect.left - 8,
                  top: highlightRect.top - 8,
                  width: highlightRect.width + 16,
                  height: highlightRect.height + 16,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
                  borderRadius: '16px',
                }}
                animate={{
                  left: highlightRect.left - 8,
                  top: highlightRect.top - 8,
                  width: highlightRect.width + 16,
                  height: highlightRect.height + 16,
                }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
              />
            ) : (
              <div className="fixed inset-0 bg-black/75 z-[999998]" />
            )}

            {/* Tour step popover card */}
            {currentStep && (
              <motion.div
                key={currentStep.id}
                initial={{ scale: 0.9, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 15 }}
                style={getCardStyle()}
                className="bg-[#0b0b0d]/95 border border-white/10 p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative text-right flex flex-col gap-4 overflow-hidden"
              >
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
              </motion.div>
            )}

          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default OnboardingTour;
