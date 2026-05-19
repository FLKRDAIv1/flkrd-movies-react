import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { Cog, Moon, Sun, PlayCircle, User, History, Play, ChevronRight, X } from 'lucide-react';
import SettingsModal from './SettingsModal';
import NotificationInbox from './NotificationInbox';
import { motion, AnimatePresence } from 'framer-motion';
import { WatchProgress } from '../types';
import { IMAGE_BASE_URL_POSTER } from '../constants';
import AnimatedThemeToggler from './ui/animated-theme-toggler';

const Header: React.FC<{ scrolled: boolean }> = () => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<WatchProgress[]>([]);
  const historyRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme, accentColor, setIsSettingsOpen } = useUI();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const loadHistory = () => {
      try {
        const data = localStorage.getItem('watchProgress');
        if (data) {
          const progress: WatchProgress[] = JSON.parse(data);
          const sorted = progress
            .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0))
            .slice(0, 5);
          setRecentItems(sorted);
        }
      } catch (e) {
        console.error("History Load Error", e);
      }
    };

    loadHistory();
    window.addEventListener('storage', loadHistory);
    window.addEventListener('watchProgressUpdated', loadHistory);
    return () => {
      window.removeEventListener('storage', loadHistory);
      window.removeEventListener('watchProgressUpdated', loadHistory);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setIsHistoryOpen(false);
      }
    };
    if (isHistoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHistoryOpen]);

  const handleResume = (item: WatchProgress) => {
    setIsHistoryOpen(false);
    if (String(item.type) === 'dubbed') {
      navigate(`/dubbed-details/${item.id}`);
    } else {
      navigate(`/details/${item.type}/${item.id}`);
    }
  };

  const { pathname } = useLocation();
  const isDubPage = pathname === '/dubbed-movies';

  return (
    <>
      <header className={`global-header fixed top-0 left-0 right-0 z-[100] px-4 md:px-10 lg:px-14 py-4 md:py-8 flex items-center justify-between pointer-events-none transition-all duration-500`}>
        <div className={`pointer-events-auto flex items-center gap-4 ${isDubPage ? 'transition-all duration-700 opacity-90' : ''}`}>
          {/* Logo removed - migrated to sidebar */}
        </div>
        
        <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
          {!isDubPage && (
            <button
              onClick={() => navigate('/continue-watching')}
              className="hidden lg:flex items-center gap-2 bg-[var(--brand-red)] hover:brightness-110 text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all hover:scale-105"
              aria-label={t('continueWatching')}
            >
              <PlayCircle className="w-4 h-4 md:w-5 md:h-5 text-[var(--brand-red)]" fill="white" />
              <span className="italic">{t('continueWatching')}</span>
            </button>
          )}

          {/* History Dropdown Control */}
          <div className="relative" ref={historyRef}>
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`bg-main-bg/25 dark-mode-box backdrop-blur-20 border border-main-text/10 rounded-full w-9 h-9 md:w-12 md:h-12 flex items-center justify-center transition-all shadow-lg group ${isHistoryOpen ? 'bg-brand' : 'hover:bg-brand/20'}`}
              aria-label="Recently Viewed"
            >
              <History className={`w-5 h-5 md:w-6 md:h-6 transition-colors ${isHistoryOpen ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-brand'}`} />
            </button>

            {/* ... Dropdown Content (unchanged) ... */}
            <AnimatePresence>
              {isHistoryOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="absolute end-0 mt-4 w-72 md:w-96 bg-card-bg border border-border-color rounded-[2rem] md:rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden z-50 backdrop-blur-3xl"
                >
                  <div className="p-5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand" />
                      <span className="text-[10px] font-[1000] uppercase tracking-[0.3em] text-sec-text italic">{t('recentlyViewed')}</span>
                    </div>
                    <button onClick={() => setIsHistoryOpen(false)} className="text-sec-text hover:text-main-text transition-colors"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto scrollbar-hide py-2">
                    {recentItems.length > 0 ? (
                      recentItems.map((item) => {
                        const progressPct = Math.min(100, (item.progress / (item.duration || 1)) * 100);
                        return (
                          <button
                            key={`${item.id}-${item.type}`}
                            onClick={() => handleResume(item)}
                            className="w-full flex items-center gap-4 p-4 hover:bg-main-text/5 transition-all text-start group"
                          >
                            <div className="w-14 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-main-bg border border-main-text/5 shadow-xl relative">
                              <img
                                src={item.poster_path?.startsWith('http') ? item.poster_path : `${IMAGE_BASE_URL_POSTER}${item.poster_path}`}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-main-bg/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Play className="w-4 h-4 md:w-5 md:h-5 text-white" fill="white" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-black text-main-text uppercase italic tracking-tighter truncate group-hover:text-brand transition-colors">{item.title}</h4>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest">{item.season ? `S${item.season} E${item.episode}` : (String(item.type) === 'dubbed' ? 'Dubbed' : 'Movie')}</span>
                                <span className="text-[8px] font-black uppercase text-brand">{Math.floor(progressPct)}%</span>
                              </div>
                              <div className="mt-2 w-full h-1 bg-main-text/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressPct}%` }}
                                  className="h-full bg-brand"
                                />
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-brand group-hover:translate-x-1 transition-all" />
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-12 text-center flex flex-col items-center gap-4">
                        <History className="w-10 h-10 text-gray-800" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Your archive is empty.</p>
                      </div>
                    )}
                  </div>

                  {recentItems.length > 0 && (
                    <button
                      onClick={() => { setIsHistoryOpen(false); navigate('/continue-watching'); }}
                      className="w-full p-4 bg-main-text/5 border-t border-main-text/5 text-[9px] font-black uppercase tracking-[0.4em] text-sec-text hover:text-main-text hover:bg-brand/10 transition-all flex items-center justify-center gap-2"
                    >
                      {t('seeMore')} Archive <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div
            className="bg-main-bg/25 dark-mode-box backdrop-blur-20 border border-main-text/10 rounded-full w-9 h-9 md:w-12 md:h-12 flex items-center justify-center transition-all shadow-lg"
          >
            <AnimatedThemeToggler />
          </div>

          <NotificationInbox />

          {!isDubPage && (
            <button
              onClick={() => navigate('/profile')}
              className="bg-main-bg/25 dark-mode-box backdrop-blur-20 border border-main-text/10 rounded-full w-9 h-9 md:w-12 md:h-12 flex items-center justify-center transition-all shadow-lg group hover:bg-[var(--brand-red)]"
              aria-label={t('profile')}
            >
              <User className="w-5 h-5 md:w-6 md:h-6 text-[var(--text-secondary)] group-hover:text-white transition-colors" />
            </button>
          )}

          {!isDubPage && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="bg-main-bg/25 dark-mode-box backdrop-blur-20 border border-main-text/10 rounded-full w-9 h-9 md:w-12 md:h-12 flex items-center justify-center transition-all shadow-lg"
              aria-label={t('settings')}
            >
              <Cog className="w-5 h-5 md:w-6 md:h-6 text-[var(--text-secondary)]" />
            </button>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;