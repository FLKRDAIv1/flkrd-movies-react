import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { Cog, Moon, Sun, PlayCircle, User, History, Play, ChevronRight, X, Search, Menu, Bell, Zap, Subtitles, Sparkles, RefreshCcw, HelpCircle } from 'lucide-react';
import SettingsModal from './SettingsModal';
import NotificationInbox from './NotificationInbox';
import { motion, AnimatePresence } from 'framer-motion';
import { WatchProgress } from '../types';
import { IMAGE_BASE_URL_POSTER } from '../constants';
import AnimatedThemeToggler from './ui/animated-theme-toggler';
import StoryReels from './StoryReels';

const Header: React.FC<{ scrolled: boolean }> = ({ scrolled }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<WatchProgress[]>([]);
  const historyRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  const [isTransPopoverOpen, setIsTransPopoverOpen] = useState(false);
  const transRef = useRef<HTMLDivElement>(null);

  const { 
    theme, toggleTheme, accentColor, setIsSettingsOpen, glassConfig, isAdmin, isPerformanceMode, setIsPerformanceMode,
    activeTranslation, startGlobalTranslation, cancelGlobalTranslation, dismissCelebration 
  } = useUI();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const elasticity = Math.max(0.01, glassConfig?.elasticity || 0.35);
  const isHomePage = pathname === '/';

  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [localScrolled, setLocalScrolled] = useState(scrolled);

  useEffect(() => {
    setLocalScrolled(scrolled);
  }, [scrolled]);

  useEffect(() => {
    const handleScroll = () => {
      const mainEl = document.querySelector('main');
      const isScrolled = (mainEl?.scrollTop || 0) > 10 || window.scrollY > 10;
      setLocalScrolled(isScrolled);
    };

    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('touchmove', handleScroll, { passive: true });

    return () => {
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('touchmove', handleScroll);
    };
  }, []);

  useEffect(() => {
    const queryParam = new URLSearchParams(search).get('query') || '';
    if (pathname.startsWith('/search')) {
      setHeaderSearchQuery(queryParam);
    } else {
      setHeaderSearchQuery('');
    }
  }, [pathname, search]);

  useEffect(() => {
    const handleClickOutsideProfile = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutsideProfile);
    }
    return () => document.removeEventListener('mousedown', handleClickOutsideProfile);
  }, [isProfileDropdownOpen]);

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

  useEffect(() => {
    const handleClickOutsideTrans = (event: MouseEvent) => {
      if (transRef.current && !transRef.current.contains(event.target as Node)) {
        setIsTransPopoverOpen(false);
      }
    };
    if (isTransPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutsideTrans);
    }
    return () => document.removeEventListener('mousedown', handleClickOutsideTrans);
  }, [isTransPopoverOpen]);

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
        className={`global-header fixed top-0 w-full z-50 transition-all duration-500 ${
          localScrolled 
            ? (theme === 'light' ? 'shadow-[0_4px_30px_rgba(0,0,0,0.03)]' : 'shadow-[0_4px_30px_rgba(0,0,0,0.4)]')
            : ''
        }`}
      >
        <div 
          className="absolute inset-0 z-0 transition-all duration-300 overflow-hidden"
          style={{
            background: localScrolled 
              ? (theme === 'light' 
                  ? `linear-gradient(to bottom, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.75))`
                  : `linear-gradient(to bottom, rgba(10, 10, 10, ${glassConfig.darkOpacity * 1.15}), rgba(10, 10, 10, ${glassConfig.darkOpacity * 0.95}))`)
              : 'transparent',
            backdropFilter: localScrolled ? `blur(${glassConfig.blurAmount * 0.8}px) saturate(${glassConfig.saturation}%)` : 'none',
            WebkitBackdropFilter: localScrolled ? `blur(${glassConfig.blurAmount * 0.8}px) saturate(${glassConfig.saturation}%)` : 'none',
            borderBottomStyle: localScrolled ? 'solid' : 'none',
            borderBottomColor: localScrolled 
              ? (theme === 'light' ? `rgba(0, 0, 0, 0.06)` : `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity * 0.5})`) 
              : 'transparent',
            boxShadow: localScrolled 
              ? (theme === 'light' 
                  ? `0 4px 30px rgba(0,0,0,0.03), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)` 
                  : `
                      inset 0 1px 0 0 rgba(255, 255, 255, ${0.08 + glassConfig.borderOpacity * 0.25}),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                    `) 
              : 'none'
          }}
        >
          {/* Dynamic GPU-accelerated water sheen overlay */}
          <div 
            className="absolute inset-0 pointer-events-none mix-blend-overlay animate-[ios-glass-shine_18s_ease-in-out_infinite]"
            style={{
              background: localScrolled ? `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, ${0.05 + (glassConfig.displacementScale / 120) * 0.1}) 0%, rgba(255, 255, 255, 0.01) 40%, transparent 70%)` : 'transparent',
              opacity: localScrolled ? (glassConfig.displacementScale / 120) * 0.6 : 0,
              animationDuration: `${40 * (0.35 / elasticity)}s`
            }}
          />
        </div>
        <div className="relative z-10 flex items-center justify-between px-4 md:px-8 py-3 w-full max-w-7xl mx-auto h-14 md:h-18 min-w-0 gap-4" dir="rtl">
          
          {/* Right (Start) - App Logo & Nav Menu (Desktop/PC View Only) */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8 flex-shrink-0">
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
              <span className={`text-lg md:text-xl font-[1000] uppercase italic tracking-tighter hidden sm:block ${
                theme === 'light'
                  ? 'bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-500 bg-clip-text text-transparent'
                  : 'bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent'
              }`}>
                FLKRD
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5 font-bold text-sm tracking-wide flex-shrink-0">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) => 
                    `transition-all duration-300 relative px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border flex items-center justify-center ${
                      isActive 
                        ? 'text-red-500 bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                        : 'text-sec-text hover:text-main-text border-transparent hover:bg-box-bg'
                    }`
                  }
                >
                  {t(link.labelKey as any)}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Mobile Layout (Hidden on Desktop) */}
          <div className="flex md:hidden items-center justify-between w-full min-w-0 gap-3">
            {/* Logo */}
            <Link to="/" className="flex items-center flex-shrink-0 active:scale-95 focus:outline-none">
              <img 
                src="/flkrd-logo.png" 
                alt="FLKRD" 
                className="h-7 w-auto object-contain" 
              />
            </Link>

            {/* Search Input with glass border */}
            <div className="relative flex-1 max-w-[140px] sm:max-w-[180px] flex items-center group">
              <input
                type="text"
                placeholder="گەڕان..."
                value={headerSearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setHeaderSearchQuery(val);
                  if (val.trim()) {
                    navigate(`/search?query=${encodeURIComponent(val)}`, { replace: true });
                  } else {
                    navigate('/search', { replace: true });
                  }
                }}
                className="w-full h-9 pr-3 pl-8 text-[10px] font-bold text-main-text placeholder-zinc-500 bg-box-bg hover:bg-zinc-200/50 dark:hover:bg-white/10 border border-border-color focus:border-brand/30 rounded-full focus:outline-none focus:ring-1 focus:ring-brand/20 transition-all duration-300 backdrop-blur-md text-right"
              />
              <Search size={11} className="absolute left-2.5 text-sec-text group-focus-within:text-brand transition-colors pointer-events-none" />
              {headerSearchQuery && (
                <button
                  onClick={() => {
                    setHeaderSearchQuery('');
                    if (pathname.startsWith('/search')) {
                      navigate('/search', { replace: true });
                    }
                  }}
                  className="absolute left-6 text-sec-text hover:text-main-text"
                >
                  <X size={10} />
                </button>
              )}
            </div>

            {/* Mobile Actions Container */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Continue button text-only */}
              <button
                onClick={() => navigate('/continue-watching')}
                className="flex items-center justify-center bg-box-bg border border-border-color text-main-text px-3 h-9 rounded-full text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all"
              >
                بەردەوامبە
              </button>

              {/* Avatar with halo */}
              <div 
                onClick={() => navigate('/profile')}
                className="relative w-8 h-8 rounded-full overflow-hidden border border-border-color shadow-md ring-1 ring-border-color cursor-pointer active:scale-95"
              >
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop"
                  alt="User"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Play icon button */}
              <button
                onClick={() => navigate('/continue-watching')}
                className="w-9 h-9 rounded-full bg-box-bg border border-border-color text-main-text flex items-center justify-center active:scale-95 transition-all hover:bg-zinc-200/50 dark:hover:bg-white/10"
              >
                <PlayCircle size={16} className="text-main-text" />
              </button>

              {/* Hamburger drawer trigger (moved to leftmost position) */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="w-9 h-9 flex items-center justify-center text-main-text focus:outline-none active:scale-90"
                aria-label="Open Menu"
              >
                <Menu size={18} />
              </button>
            </div>
          </div>

          {/* Desktop Left (End) - Utility & Profile Capsule (Hidden on Mobile) */}
          <div className="hidden md:flex items-center gap-3.5 flex-shrink-0">
            
            {/* Continue Watching Pill CTA with Conic Border Spin */}
            {!isDubPage && (
              <button
                onClick={() => navigate('/continue-watching')}
                className="relative overflow-hidden flex items-center gap-2.5 bg-red-600 hover:bg-red-500 text-white px-5.5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-[0_0_20px_rgba(220,38,38,0.35)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] active:scale-95 border border-red-500/30"
                aria-label={t('continueWatching')}
              >
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-full opacity-50">
                  <div 
                    className="absolute top-1/2 left-1/2 w-[250%] h-[250%] origin-center animate-[neon-border-spin_3s_linear_infinite]"
                    style={{
                      background: 'conic-gradient(from 0deg, transparent 30%, #ef4444, #f43f5e, transparent 70%)',
                    }}
                  />
                  <div className="absolute inset-[1px] rounded-full bg-red-600 z-1" />
                </div>

                <span className="relative z-10 flex items-center gap-2">
                  <span className="italic">{t('continueWatching')}</span>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]" />
                </span>
              </button>
            )}

            {/* Real-time Search Input Capsule */}
            <div className="relative flex items-center group">
              <input
                type="text"
                placeholder="گەڕان..."
                value={headerSearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setHeaderSearchQuery(val);
                  if (val.trim()) {
                    navigate(`/search?query=${encodeURIComponent(val)}`, { replace: true });
                  } else {
                    navigate('/search', { replace: true });
                  }
                }}
                className="w-48 lg:w-60 h-10 pr-4 pl-10 text-xs font-bold text-main-text placeholder-zinc-500 bg-box-bg hover:bg-zinc-200/50 dark:hover:bg-white/10 border border-border-color focus:border-brand/30 rounded-full focus:outline-none focus:ring-1 focus:ring-brand/20 transition-all duration-300 backdrop-blur-md text-right"
              />
              <Search size={14} className="absolute left-3.5 text-sec-text group-focus-within:text-brand transition-colors pointer-events-none" />
              {headerSearchQuery && (
                <button
                  onClick={() => {
                    setHeaderSearchQuery('');
                    if (pathname.startsWith('/search')) {
                      navigate('/search', { replace: true });
                    }
                  }}
                  className="absolute left-9 text-sec-text hover:text-main-text"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Consolidated User Profile Capsule with Dropdown Menu */}
            <div className="relative" ref={profileMenuRef}>
              <div 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 p-1 bg-box-bg border border-border-color rounded-full cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-all select-none"
              >
                {/* Avatar Image with white Halo */}
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border-color shadow-md ring-1 ring-border-color">
                  <img
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop"
                    alt="User Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Minimalist stacked quick icons inside the capsule */}
                <div className="hidden lg:flex items-center gap-1.5 px-2 text-sec-text">
                  <Cog size={12} className="hover:text-main-text" />
                  <Moon size={12} className="hover:text-main-text" />
                  <History size={12} className="hover:text-main-text" />
                </div>
              </div>

              {/* Profile Dropdown Menu */}
              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 mt-3 w-40 bg-card-bg/95 border border-border-color rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 backdrop-blur-3xl p-2 flex flex-col gap-1 text-left"
                  >
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        setIsSettingsOpen(true);
                      }}
                      className="w-full px-3 py-1.5 hover:bg-box-bg text-sec-text hover:text-main-text rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <Cog size={14} className="text-sec-text" />
                      <span>Settings</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        navigate('/dubbed');
                      }}
                      className="w-full px-3 py-1.5 hover:bg-box-bg text-sec-text hover:text-main-text rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <Sparkles size={14} className="text-sec-text" />
                      <span>Dashboard</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

      </div>

        {/* Stories Sub-Row (Only on HomePage, at the top of the page) */}
        <AnimatePresence>
          {isHomePage && !localScrolled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-transparent"
            >
              <StoryReels size="sm" />
            </motion.div>
          )}
        </AnimatePresence>
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
              dir="ltr"
              initial={{ x: (language === 'ku' || language === 'badini') ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: (language === 'ku' || language === 'badini') ? '-100%' : '100%' }}
              transition={{ 
                type: 'spring', 
                stiffness: 220 * (elasticity / 0.35), 
                damping: 26 * (0.35 / elasticity) 
              }}
              className={`fixed top-0 bottom-0 ${
                (language === 'ku' || language === 'badini') ? 'left-0' : 'right-0'
              } z-[160] w-[82%] max-w-sm flex flex-col p-6 shadow-2xl md:hidden overflow-hidden`}
              style={{
                borderRadius: `${glassConfig.cornerRadius}px`,
              }}
            >
              {/* Isolated Liquid-Glass background overlay */}
              <div 
                className={`absolute inset-0 z-0 transition-all duration-300 overflow-hidden ${
                  (language === 'ku' || language === 'badini') ? 'border-r' : 'border-l'
                }`}
                style={{
                  background: theme === 'light'
                    ? `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), 0.08), transparent 75%), rgba(255, 255, 255, 0.85)`
                    : `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${glassConfig.redOpacity * 1.25}), transparent 75%), rgba(10, 10, 10, ${glassConfig.darkOpacity * 1.2})`,
                  backdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                  WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px) saturate(${glassConfig.saturation}%)`,
                  borderStyle: 'solid',
                  borderColor: theme === 'light'
                    ? `rgba(0, 0, 0, 0.06)`
                    : `rgba(var(--brand-red-rgb), ${glassConfig.borderOpacity})`,
                  borderRadius: `${glassConfig.cornerRadius}px`,
                  boxShadow: theme === 'light'
                    ? `0 30px 60px rgba(0,0,0,0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.85)`
                    : `
                      inset 0 1px 0 0 rgba(255, 255, 255, ${0.12 + glassConfig.borderOpacity * 0.45}),
                      inset ${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(255, 0, 80, 0.08),
                      inset -${glassConfig.aberrationIntensity * 0.15}px 0 0.5px rgba(0, 200, 255, 0.08),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.4),
                      0 30px 60px rgba(0,0,0,0.55)
                    `
                }}
              >
                {/* Dynamic GPU-accelerated water sheen overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none mix-blend-overlay animate-[ios-glass-shine_18s_ease-in-out_infinite]"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, ${0.05 + (glassConfig.displacementScale / 120) * 0.15}) 0%, rgba(255, 255, 255, 0.01) 40%, transparent 70%)`,
                    opacity: (glassConfig.displacementScale / 120) * 0.9,
                    animationDuration: `${30 * (0.35 / elasticity)}s`
                  }}
                />
              </div>
              <div className="relative z-10 flex flex-col h-full w-full" dir={(language === 'ku' || language === 'badini') ? 'rtl' : 'ltr'}>
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-5 border-b border-border-color">
                <div className="flex items-center gap-2">
                  <img src="/flkrd-logo.png" alt="FLKRD" className="h-7 w-auto object-contain" />
                  <span className="text-base font-black italic uppercase tracking-tighter text-main-text">PORTAL</span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-box-bg hover:bg-zinc-200/50 dark:hover:bg-white/10 text-sec-text hover:text-main-text transition-all focus:outline-none"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Profile Quick Link */}
              <div 
                onClick={() => { setIsDrawerOpen(false); navigate('/profile'); }}
                className="mt-6 p-4 bg-box-bg border border-border-color rounded-2.5xl flex items-center gap-3.5 hover:bg-zinc-200/50 dark:hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-full bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/35 flex items-center justify-center text-[var(--brand-red)]">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="text-xs font-black text-main-text truncate uppercase tracking-wide group-hover:text-[var(--brand-red)] transition-colors">
                    {t('profile')}
                  </h4>
                  <p className="text-[8px] text-sec-text font-bold uppercase tracking-widest mt-0.5">Manage Settings</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[var(--brand-red)] group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Drawer Quick Controls */}
              <div className="mt-6 space-y-3">
                {isPerformanceMode && (
                  <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-2.5xl shadow-[0_0_15px_rgba(52,199,89,0.1)]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
                        <Zap className="w-4 h-4 fill-current animate-pulse" />
                      </div>
                      <div className="text-left">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-green-400">
                          {(language === 'ku' || language === 'badini') ? '٦٠ FPS چالاکە' : '60 FPS Turbo'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPerformanceMode(false)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md focus:outline-none"
                    >
                      {(language === 'ku' || language === 'badini') ? 'کوزاندنەوە' : 'Turn OFF'}
                    </button>
                  </div>
                )}
                {/* Theme Toggler row */}
                <div className="flex items-center justify-between p-3.5 bg-box-bg border border-border-color rounded-2.5xl">
                  <div className="flex items-center gap-3">
                    <Sun className="w-4.5 h-4.5 text-sec-text" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-sec-text">Theme Switcher</span>
                  </div>
                  <div className="scale-90 translate-x-1">
                    <AnimatedThemeToggler />
                  </div>
                </div>

                {/* Notifications row */}
                <div className="flex items-center justify-between p-3.5 bg-box-bg border border-border-color rounded-2.5xl">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4.5 h-4.5 text-sec-text" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-sec-text">{t('notifications')}</span>
                  </div>
                  <div className="scale-90 translate-x-1">
                    <NotificationInbox />
                  </div>
                </div>

                {/* Settings button */}
                <button
                  onClick={() => { setIsDrawerOpen(false); setIsSettingsOpen(true); }}
                  className="w-full flex items-center justify-between p-3.5 bg-box-bg border border-border-color rounded-2.5xl text-left hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-all focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <Cog className="w-4.5 h-4.5 text-sec-text" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-sec-text">{t('settings')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Recently Viewed History Section inside Drawer */}
              {recentItems.length > 0 && (
                <div className="mt-8 flex-grow flex flex-col min-h-0">
                  <div className="flex items-center gap-1.5 mb-3 px-1">
                    <History className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-sec-text">
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
                          className="w-full flex items-center gap-3 p-2.5 bg-box-bg border border-border-color rounded-2xl hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-all text-start group focus:outline-none"
                        >
                          <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-box-bg border border-border-color relative">
                            <img 
                              src={item.poster_path?.startsWith('http') ? item.poster_path : `${IMAGE_BASE_URL_POSTER}${item.poster_path}`} 
                              alt="" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          
                          <div className="min-w-0 flex-grow">
                            <h5 className="text-[11px] font-black text-main-text uppercase italic tracking-tighter truncate group-hover:text-[var(--brand-red)] transition-colors">
                              {item.title}
                            </h5>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="text-[7px] font-black uppercase text-sec-text tracking-widest">
                                {item.season ? `S${item.season} E${item.episode}` : (String(item.type) === 'dubbed' ? 'Dubbed' : 'Movie')}
                              </span>
                              <span className="text-[7px] font-black uppercase text-[var(--brand-red)]">
                                {Math.floor(progressPct)}%
                              </span>
                            </div>
                            <div className="mt-1.5 w-full h-0.5 bg-zinc-200/50 dark:bg-white/5 rounded-full overflow-hidden">
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

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;