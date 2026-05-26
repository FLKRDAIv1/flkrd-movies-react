import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { Cog, Moon, Sun, PlayCircle, User, History, Play, ChevronRight, X, Search, Menu, Bell } from 'lucide-react';
import SettingsModal from './SettingsModal';
import NotificationInbox from './NotificationInbox';
import { motion, AnimatePresence } from 'framer-motion';
import { WatchProgress } from '../types';
import { IMAGE_BASE_URL_POSTER } from '../constants';
import AnimatedThemeToggler from './ui/animated-theme-toggler';

const Header: React.FC<{ scrolled: boolean }> = ({ scrolled }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<WatchProgress[]>([]);
  const historyRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme, accentColor, setIsSettingsOpen } = useUI();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

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
    setIsDrawerOpen(false);
    if (String(item.type) === 'dubbed') {
      navigate(`/dubbed-details/${item.id}`);
    } else {
      navigate(`/details/${item.type}/${item.id}`);
    }
  };

  const isDubPage = pathname === '/dubbed-movies';

  // Kurdish Localization for navigation links
  const navLinks = [
    { path: '/', labelKey: 'home' },
    { path: '/discover', labelKey: 'discover' },
    { path: '/tv', labelKey: 'tvShows' },
    { path: '/dubbed', labelKey: 'dubbedMovies' },
  ];

  return (
    <>
      {/* 1. Global Base Styling (Glassmorphism & Fixed Top) */}
      <header 
        className={`global-header fixed top-0 w-full z-50 transition-all duration-500 border-b ${
          scrolled 
            ? 'bg-black/75 backdrop-blur-xl border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.4)]' 
            : 'bg-black/40 backdrop-blur-md border-white/[0.03]'
        }`}
      >
        <div className="flex items-center justify-between px-4 md:px-8 py-3 w-full max-w-7xl mx-auto h-14 md:h-18">
          
          {/* Right (Start) - App Logo */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center gap-2.5 active:scale-95 transition-all select-none focus:outline-none"
              aria-label="FLKRD Home"
            >
              <img 
                src="/flkrd-logo.png" 
                alt="FLKRD" 
                className="h-8 md:h-10 w-auto object-contain" 
              />
              <span className="text-lg md:text-xl font-[1000] uppercase italic tracking-tighter text-white hidden sm:block bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent">
                FLKRD
              </span>
            </Link>
          </div>

          {/* Center - Main Navigation Links (Desktop/PC View Only) */}
          <nav className="hidden md:flex items-center gap-6 font-bold text-sm tracking-wide">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) => 
                  `transition-all duration-300 relative py-1 text-[11px] font-black uppercase tracking-widest ${
                    isActive 
                      ? 'text-[var(--brand-red)] font-black' 
                      : 'text-gray-400 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {t(link.labelKey as any)}
                    {isActive && (
                      <motion.div 
                        layoutId="header-active-line"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--brand-red)] rounded-full shadow-[0_0_8px_var(--brand-red)]"
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Left (End) - Utility Container */}
          
          {/* Mobile Layout: Show ONLY Search & Hamburger Menu */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => navigate('/search')}
              className="w-11 h-11 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer focus:outline-none"
              aria-label={t('search')}
            >
              <Search className="w-5.5 h-5.5" />
            </button>
            
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="w-11 h-11 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer focus:outline-none"
              aria-label="Open Menu"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
          </div>

          {/* Desktop Layout: Show full controls row + Continue Watching Pill (lg Only) */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* Continue Watching Pill (lg: breakpoint only) */}
            {!isDubPage && (
              <button
                onClick={() => navigate('/continue-watching')}
                className="hidden lg:flex items-center gap-2 bg-[var(--brand-red)] hover:bg-[var(--brand-red)]/90 text-white px-5 py-2 rounded-full text-sm font-medium transition duration-300 shadow-[0_4px_15px_rgba(229,9,20,0.35)] active:scale-95"
                aria-label={t('continueWatching')}
              >
                <PlayCircle className="w-4 h-4 text-white" fill="white" />
                <span className="italic">{t('continueWatching')}</span>
              </button>
            )}

            {/* History Dropdown Control */}
            <div className="relative" ref={historyRef}>
              <button
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`bg-white/5 hover:bg-white/10 border border-white/10 rounded-full w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center transition-all shadow-lg group focus:outline-none ${isHistoryOpen ? 'bg-[var(--brand-red)] border-[var(--brand-red)] shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.4)]' : ''}`}
                aria-label="Recently Viewed"
              >
                <History className={`w-5 h-5 lg:w-5.5 lg:h-5.5 transition-colors ${isHistoryOpen ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
              </button>

              <AnimatePresence>
                {isHistoryOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className={`absolute ${language === 'ku' ? 'left-0' : 'right-0'} mt-4 w-72 md:w-96 bg-black/90 border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-50 backdrop-blur-3xl`}
                  >
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-3.5 h-3.5 md:w-4 md:h-4 text-[var(--brand-red)]" />
                        <span className="text-[10px] font-[1000] uppercase tracking-[0.3em] text-gray-400 italic">{t('recentlyViewed')}</span>
                      </div>
                      <button onClick={() => setIsHistoryOpen(false)} className="text-gray-500 hover:text-white transition-colors focus:outline-none"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="max-h-[360px] overflow-y-auto scrollbar-hide py-2">
                      {recentItems.length > 0 ? (
                        recentItems.map((item) => {
                          const progressPct = Math.min(100, (item.progress / (item.duration || 1)) * 100);
                          return (
                            <button
                              key={`${item.id}-${item.type}`}
                              onClick={() => handleResume(item)}
                              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-all text-start group focus:outline-none"
                            >
                              <div className="w-13 h-18 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 border border-white/5 shadow-xl relative">
                                <img
                                  src={item.poster_path?.startsWith('http') ? item.poster_path : `${IMAGE_BASE_URL_POSTER}${item.poster_path}`}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Play className="w-4 h-4 text-white" fill="white" />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-black text-white uppercase italic tracking-tighter truncate group-hover:text-[var(--brand-red)] transition-colors">{item.title}</h4>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest">{item.season ? `S${item.season} E${item.episode}` : (String(item.type) === 'dubbed' ? 'Dubbed' : 'Movie')}</span>
                                  <span className="text-[8px] font-black uppercase text-[var(--brand-red)]">{Math.floor(progressPct)}%</span>
                                </div>
                                <div className="mt-2 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--brand-red)]"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-[var(--brand-red)] group-hover:translate-x-1 transition-all" />
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-10 text-center flex flex-col items-center gap-4">
                          <History className="w-8 h-8 text-gray-700" />
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Your archive is empty.</p>
                        </div>
                      )}
                    </div>

                    {recentItems.length > 0 && (
                      <button
                        onClick={() => { setIsHistoryOpen(false); navigate('/continue-watching'); }}
                        className="w-full p-4 bg-white/5 border-t border-white/5 text-[9px] font-black uppercase tracking-[0.4em] text-gray-400 hover:text-white hover:bg-[var(--brand-red)]/10 transition-all flex items-center justify-center gap-2 focus:outline-none"
                      >
                        {t('seeMore')} Archive <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggler */}
            <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-full w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center transition-all shadow-lg">
              <AnimatedThemeToggler />
            </div>

            {/* Notification Inbox */}
            <div className="scale-95">
              <NotificationInbox />
            </div>

            {/* Profile Button */}
            {!isDubPage && (
              <button
                onClick={() => navigate('/profile')}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-full w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center transition-all shadow-lg group hover:bg-[var(--brand-red)] focus:outline-none"
                aria-label={t('profile')}
              >
                <User className="w-5 h-5 lg:w-5.5 lg:h-5.5 text-gray-400 group-hover:text-white transition-colors" />
              </button>
            )}

            {/* Settings Button */}
            {!isDubPage && (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-full w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center transition-all shadow-lg focus:outline-none text-gray-400 hover:text-white"
                aria-label={t('settings')}
              >
                <Cog className="w-5 h-5 lg:w-5.5 lg:h-5.5" />
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Mobile Slide-Over Menu Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md md:hidden"
            />

            {/* Glassmorphic Side Panel */}
            <motion.div
              initial={{ x: language === 'ku' ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: language === 'ku' ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className={`fixed top-0 bottom-0 ${
                language === 'ku' ? 'left-0 border-r' : 'right-0 border-l'
              } z-[160] w-[82%] max-w-sm bg-black/85 backdrop-blur-2xl border-white/10 flex flex-col p-6 shadow-2xl md:hidden`}
            >
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <img src="/flkrd-logo.png" alt="FLKRD" className="h-7 w-auto object-contain" />
                  <span className="text-base font-black italic uppercase tracking-tighter text-white">PORTAL</span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all focus:outline-none"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Profile Quick Link */}
              <div 
                onClick={() => { setIsDrawerOpen(false); navigate('/profile'); }}
                className="mt-6 p-4 bg-white/5 border border-white/10 rounded-2.5xl flex items-center gap-3.5 hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-full bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/35 flex items-center justify-center text-[var(--brand-red)]">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="text-xs font-black text-white truncate uppercase tracking-wide group-hover:text-[var(--brand-red)] transition-colors">
                    {t('profile')}
                  </h4>
                  <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Manage Settings</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[var(--brand-red)] group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Drawer Quick Controls */}
              <div className="mt-6 space-y-3">
                {/* Theme Toggler row */}
                <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2.5xl">
                  <div className="flex items-center gap-3">
                    <Sun className="w-4.5 h-4.5 text-gray-400" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-300">Theme Switcher</span>
                  </div>
                  <div className="scale-90 translate-x-1">
                    <AnimatedThemeToggler />
                  </div>
                </div>

                {/* Notifications row */}
                <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2.5xl">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4.5 h-4.5 text-gray-400" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-300">{t('notifications')}</span>
                  </div>
                  <div className="scale-90 translate-x-1">
                    <NotificationInbox />
                  </div>
                </div>

                {/* Settings button */}
                <button
                  onClick={() => { setIsDrawerOpen(false); setIsSettingsOpen(true); }}
                  className="w-full flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2.5xl text-left hover:bg-white/10 transition-all focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <Cog className="w-4.5 h-4.5 text-gray-400" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-300">{t('settings')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Recently Viewed History Section inside Drawer */}
              {recentItems.length > 0 && (
                <div className="mt-8 flex-grow flex flex-col min-h-0">
                  <div className="flex items-center gap-1.5 mb-3 px-1">
                    <History className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                      {t('recentlyViewed')}
                    </span>
                  </div>
                  
                  <div className="flex-grow overflow-y-auto space-y-2.5 pr-1 scrollbar-hide">
                    {recentItems.map((item) => {
                      const progressPct = Math.min(100, (item.progress / (item.duration || 1)) * 100);
                      return (
                        <button
                          key={`${item.id}-${item.type}`}
                          onClick={() => handleResume(item)}
                          className="w-full flex items-center gap-3 p-2.5 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/5 transition-all text-start group focus:outline-none"
                        >
                          <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 border border-white/5 relative">
                            <img 
                              src={item.poster_path?.startsWith('http') ? item.poster_path : `${IMAGE_BASE_URL_POSTER}${item.poster_path}`} 
                              alt="" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          
                          <div className="min-w-0 flex-grow">
                            <h5 className="text-[11px] font-black text-white uppercase italic tracking-tighter truncate group-hover:text-[var(--brand-red)] transition-colors">
                              {item.title}
                            </h5>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="text-[7px] font-black uppercase text-gray-500 tracking-widest">
                                {item.season ? `S${item.season} E${item.episode}` : (String(item.type) === 'dubbed' ? 'Dubbed' : 'Movie')}
                              </span>
                              <span className="text-[7px] font-black uppercase text-[var(--brand-red)]">
                                {Math.floor(progressPct)}%
                              </span>
                            </div>
                            <div className="mt-1.5 w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--brand-red)]" style={{ width: `${progressPct}%` }} />
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-[var(--brand-red)] group-hover:translate-x-0.5 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Version details */}
              <div className="mt-auto pt-4 border-t border-white/5 flex flex-col items-center">
                <span className="text-[7px] font-black tracking-widest text-gray-600 uppercase">FLKRD CLIENT V5.5.1.25</span>
                <span className="text-[7px] font-black tracking-widest text-[var(--brand-red)] uppercase mt-0.5">MADE BY ZANA FAROQ</span>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;