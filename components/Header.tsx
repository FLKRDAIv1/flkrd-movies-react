import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';
import { Cog, Moon, Sun, PlayCircle, User, History, Play, ChevronRight, X, Search, Menu, Bell, Zap, Subtitles, Sparkles, RefreshCcw, HelpCircle, Maximize2, Minimize2 } from 'lucide-react';
import SettingsModal from './SettingsModal';
import NotificationInbox from './NotificationInbox';
import { motion, AnimatePresence } from 'framer-motion';
import { WatchProgress } from '../types';
import { IMAGE_BASE_URL_POSTER, API_KEY } from '../constants';
import AnimatedThemeToggler from './ui/animated-theme-toggler';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { fetchData } from '../services/tmdbService';
import GooeySearch from './ui/gooey-search';


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
  const { user } = useAuth();
  const { t, language } = useTranslation();

  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const elasticity = Math.max(0.01, glassConfig?.elasticity || 0.35);
  const isHomePage = pathname === '/';

  const [headerAvatarUrl, setHeaderAvatarUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('flkrd_avatar_url') || sessionStorage.getItem('flkrd_avatar_url') || null;
    }
    return null;
  });

  useEffect(() => {
    const handleAvatarUpdate = () => {
      const updated = localStorage.getItem('flkrd_avatar_url') || sessionStorage.getItem('flkrd_avatar_url') || null;
      setHeaderAvatarUrl(updated);
    };

    window.addEventListener('storage', handleAvatarUpdate);
    window.addEventListener('flkrd-avatar-changed', handleAvatarUpdate);
    return () => {
      window.removeEventListener('storage', handleAvatarUpdate);
      window.removeEventListener('flkrd-avatar-changed', handleAvatarUpdate);
    };
  }, []);

  const renderAvatar = () => {
    if (user) {
      const localAvatar = headerAvatarUrl || localStorage.getItem('flkrd_avatar_url') || sessionStorage.getItem('flkrd_avatar_url');
      const avatarUrl = localAvatar || user.user_metadata?.avatar_url;
      if (avatarUrl) {
        return (
          <img 
            src={avatarUrl} 
            alt="User Avatar" 
            className="w-full h-full object-cover rounded-full" 
          />
        );
      }
      const initial = user.user_metadata?.user_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U';
      return (
        <div className="w-full h-full bg-red-600 text-white flex items-center justify-center font-black text-xs">
          {initial}
        </div>
      );
    }
    return (
      <div className="w-full h-full bg-zinc-800 text-gray-400 flex items-center justify-center">
        <User size={14} />
      </div>
    );
  };


  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [localScrolled, setLocalScrolled] = useState(scrolled);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement);
    }
    return false;
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleAppFullscreen = async () => {
    try {
      const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement);
      if (!isFull) {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("[FULLSCREEN] App toggle failed:", err);
    }
  };

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

    return () => {
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
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

  const isDarkNavbar = theme === 'light';
  
  const notchBgClass = isDarkNavbar
    ? "bg-black"
    : "bg-white";

  const notchStrokeClass = isDarkNavbar 
    ? "text-zinc-800" 
    : "text-zinc-200";

  // Dynamic status bar/notch theme-color syncing for PWAs
  useEffect(() => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      const headerColor = isDarkNavbar ? '#000000' : '#ffffff';
      themeColorMeta.setAttribute('content', headerColor);
    }
  }, [isDarkNavbar]);

  return (
    <>
      {/* NotchNavbar Style Header (Outer wrapper always LTR for correct notch shape clip-paths) */}
      <header 
        className={cn(
          "global-header fixed top-0 inset-x-0 z-50 h-16 flex px-0 transition-all duration-300 w-full select-none",
          localScrolled ? (isDarkNavbar ? 'shadow-[0_4px_30px_rgba(255,255,255,0.03)]' : 'shadow-[0_4px_30px_rgba(0,0,0,0.15)]') : ''
        )}
        dir="ltr"
      >
        {/* Top safe-area status bar background filler */}
        <div 
          className={cn("absolute top-0 inset-x-0 z-0 transition-all duration-300 pointer-events-none", notchBgClass)} 
          style={{ height: 'env(safe-area-inset-top, 0px)' }}
        />
        
        {/* Left Side Bar - Flexible width */}
        <div className={cn("flex-grow h-10 transition-all duration-300 relative min-w-0", notchBgClass)}>
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} className={notchStrokeClass} />
            <line x1="0" y1="36.5" x2="100%" y2="36.5" stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} className={notchStrokeClass} />
          </svg>
        </div>

        {/* Responsive Notch Container - 3 Slices */}
        <div className="flex h-16 relative z-10 shrink-0 -ml-px">
          
          {/* Left Slice (Corner) */}
          <div className="w-[50px] h-full relative shrink-0">
            {/* SVG containing both the background fill and outlines for perfect subpixel anti-aliasing */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 50 64" preserveAspectRatio="none">
              <path 
                d="M -1 0 H 51 V 64 C 25 64 25 40 -1 40 Z" 
                className={cn("transition-all duration-300", isDarkNavbar ? "fill-black" : "fill-white")} 
              />
              <path d="M0 39.5 C25 39.5 25 63.5 50 63.5" fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} className={notchStrokeClass} />
              <path d="M0 36.5 C25 36.5 25 60.5 50 60.5" fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} className={notchStrokeClass} />
            </svg>
          </div>

          {/* Center Slice (Flexible Content Area) */}
          <div className="flex h-full relative min-w-[200px] sm:min-w-[260px] md:min-w-[700px] lg:min-w-[900px] -ml-px">
             {/* Background & Lines Layer */}
             <div className={cn("absolute inset-0 transition-all duration-300", notchBgClass)}>
                 <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                   <line x1="0" y1="63.5" x2="100%" y2="63.5" stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} className={notchStrokeClass} />
                   <line x1="0" y1="60.5" x2="100%" y2="60.5" stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} className={notchStrokeClass} />
                 </svg>
             </div>

             {/* Content Layer (Inner container has dir="rtl" to preserve Kurdish text flows) */}
             <div className="relative w-full h-full flex items-end justify-between pb-2 px-4 md:px-6" dir="rtl">
               
               {/* 1. Desktop Nav & Logo (Right aligned in RTL) */}
               <div className="hidden md:flex items-center gap-4 flex-shrink-0">
                 {/* Logo */}
                 <Link 
                   to="/" 
                   className="flex items-center gap-2 active:scale-95 transition-all select-none focus:outline-none"
                   aria-label="FLKRD Home"
                 >
                   <img 
                     src="/flkrd-logo.png" 
                     alt="FLKRD" 
                     className="h-8 w-auto object-contain" 
                   />
                   <span className={cn(
                     "text-base font-black uppercase italic tracking-tighter hidden lg:block",
                     isDarkNavbar 
                       ? "bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent"
                       : "bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-500 bg-clip-text text-transparent"
                   )}>
                     FLKRD
                   </span>
                 </Link>

                 {/* Desktop Navigation Links */}
                 <nav className="flex items-center gap-1 font-bold text-xs tracking-wide">
                   {navLinks.map((link) => (
                     <NavLink
                       key={link.path}
                       to={link.path}
                       className={({ isActive }) => 
                         cn(
                           "transition-all duration-300 relative px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center justify-center",
                           isActive 
                             ? 'text-red-500 bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                             : (isDarkNavbar 
                                 ? 'text-zinc-400 hover:text-white border-transparent hover:bg-zinc-900/60' 
                                 : 'text-zinc-600 hover:text-black border-transparent hover:bg-zinc-100')
                         )
                       }
                     >
                       {t(link.labelKey as any)}
                     </NavLink>
                   ))}
                 </nav>
               </div>

               {/* 2. Desktop Left (End) - Utility & Profile Capsule (Left aligned in RTL) */}
               <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                 
                  {/* Real-time Search Input Capsule using GooeySearch */}
                  <GooeySearch
                    value={headerSearchQuery}
                    onChange={(val) => {
                      setHeaderSearchQuery(val);
                      if (val.trim()) {
                        navigate(`/search?query=${encodeURIComponent(val)}`, { replace: true });
                      } else {
                        navigate('/search', { replace: true });
                      }
                    }}
                    onSearch={async (query) => {
                      if (!query.trim()) return [];
                      try {
                        const langCode = (language === 'ku' || language === 'badini') ? 'ku-TR' : 'en-US';
                        const endpoint = `/search/multi?api_key=${API_KEY}&language=${langCode}&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
                        const data = await fetchData(endpoint, language);
                        if (data && Array.isArray(data)) {
                          return data
                            .filter((item: any) => (item.media_type === 'movie' || item.media_type === 'tv') && (item.title || item.name))
                            .map((item: any) => item.title || item.name);
                        }
                      } catch (e) {
                        console.error(e);
                      }
                      return [];
                    }}
                    onSelect={(item) => {
                      setHeaderSearchQuery(item);
                      navigate(`/search?query=${encodeURIComponent(item)}`, { replace: true });
                    }}
                    placeholder={language === 'ku' || language === 'badini' ? 'گەڕان...' : 'Search...'}
                    buttonLabel={language === 'ku' || language === 'badini' ? 'گەڕان' : 'Search'}
                  />

                  {/* Subtle Native Fullscreen Button (Desktop) */}
                  <button
                    onClick={toggleAppFullscreen}
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center border transition-all active:scale-90 select-none shadow-sm shrink-0",
                      isDarkNavbar 
                        ? "bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800" 
                        : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-black hover:bg-zinc-200",
                      isFullscreen && "border-red-500/50 text-red-500 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                    )}
                    title={isFullscreen ? (language === 'ku' || language === 'badini' ? 'چوونەدەرەوە لە سکرین بەتاڵ' : 'Exit Fullscreen') : (language === 'ku' || language === 'badini' ? 'تەواوی سکرین (Native Fullscreen)' : 'Toggle Fullscreen')}
                    aria-label="Toggle Fullscreen"
                  >
                    {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>

                 {/* Consolidated User Profile Capsule with Dropdown Menu */}
                 <div className="relative" ref={profileMenuRef}>
                   <div 
                     onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                     className={cn(
                       "flex items-center gap-2 p-0.5 border rounded-full cursor-pointer transition-all select-none",
                       isDarkNavbar 
                         ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800" 
                         : "bg-zinc-100 border-zinc-200 hover:bg-zinc-200"
                     )}
                   >
                     <div className={cn(
                       "relative w-7 h-7 rounded-full overflow-hidden border shadow-md flex items-center justify-center",
                       isDarkNavbar ? "border-zinc-800" : "border-zinc-200"
                     )}>
                       {renderAvatar()}
                     </div>
                   </div>

                   {/* Profile Dropdown Menu */}
                   <AnimatePresence>
                     {isProfileDropdownOpen && (
                       <motion.div
                         initial={{ opacity: 0, y: 10, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         exit={{ opacity: 0, y: 10, scale: 0.95 }}
                         className="absolute left-0 mt-2 w-44 bg-card-bg/95 border border-border-color rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 backdrop-blur-3xl p-2 flex flex-col gap-1 text-left"
                       >
                         <button
                           onClick={() => {
                             setIsProfileDropdownOpen(false);
                             navigate('/profile');
                           }}
                           className="w-full px-3 py-1.5 hover:bg-box-bg text-sec-text hover:text-main-text rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                         >
                           <User size={14} className="text-sec-text" />
                           <span>{t('profile') || 'Profile'}</span>
                         </button>

                         <button
                           onClick={() => {
                             setIsProfileDropdownOpen(false);
                             toggleAppFullscreen();
                           }}
                           className="w-full px-3 py-1.5 hover:bg-box-bg text-sec-text hover:text-main-text rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                         >
                           {isFullscreen ? <Minimize2 size={14} className="text-red-500" /> : <Maximize2 size={14} className="text-sec-text" />}
                           <span>{isFullscreen ? (language === 'ku' || language === 'badini' ? 'ئاسایی کردنەوە' : 'Exit Fullscreen') : (language === 'ku' || language === 'badini' ? 'تەواوی سکرین' : 'Native Fullscreen')}</span>
                         </button>

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

               {/* 3. Mobile Layout (Hidden on Desktop) */}
               <div className="flex md:hidden items-center justify-between w-full min-w-0 gap-3">
                 {/* Logo */}
                 <Link to="/" className="flex items-center flex-shrink-0 active:scale-95 focus:outline-none">
                   <img 
                     src="/flkrd-logo.png" 
                     alt="FLKRD" 
                     className="h-7 w-auto object-contain" 
                   />
                 </Link>

                 {/* Mobile Search Input using GooeySearch */}
                 <GooeySearch
                    value={headerSearchQuery}
                    onChange={(val) => {
                      setHeaderSearchQuery(val);
                      if (val.trim()) {
                        navigate(`/search?query=${encodeURIComponent(val)}`, { replace: true });
                      } else {
                        navigate('/search', { replace: true });
                      }
                    }}
                    onSearch={async (query) => {
                      if (!query.trim()) return [];
                      try {
                        const langCode = (language === 'ku' || language === 'badini') ? 'ku-TR' : 'en-US';
                        const endpoint = `/search/multi?api_key=${API_KEY}&language=${langCode}&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
                        const data = await fetchData(endpoint, language);
                        if (data && Array.isArray(data)) {
                          return data
                            .filter((item: any) => (item.media_type === 'movie' || item.media_type === 'tv') && (item.title || item.name))
                            .map((item: any) => item.title || item.name);
                        }
                      } catch (e) {
                        console.error(e);
                      }
                      return [];
                    }}
                    onSelect={(item) => {
                      setHeaderSearchQuery(item);
                      navigate(`/search?query=${encodeURIComponent(item)}`, { replace: true });
                    }}
                    placeholder={language === 'ku' || language === 'badini' ? 'گەڕان...' : 'Search...'}
                    buttonLabel={language === 'ku' || language === 'badini' ? 'گەڕان' : 'Search'}
                  />

                 {/* Mobile Menu Action Triggers */}
                 <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Subtle Native Fullscreen Button (Mobile Header) */}
                    <button
                      onClick={toggleAppFullscreen}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center border transition-all active:scale-90 select-none shadow-sm",
                        isDarkNavbar 
                          ? "bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800" 
                          : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-black hover:bg-zinc-200",
                        isFullscreen && "border-red-500/50 text-red-500 bg-red-500/10"
                      )}
                      title={isFullscreen ? (language === 'ku' || language === 'badini' ? 'چوونەدەرەوە لە سکرین بەتاڵ' : 'Exit Fullscreen') : (language === 'ku' || language === 'badini' ? 'تەواوی سکرین' : 'Native Fullscreen')}
                      aria-label="Toggle Fullscreen"
                    >
                      {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    </button>

                    {/* Avatar Link */}
                    <div 
                      onClick={() => navigate('/profile')}
                      className={cn(
                        "relative w-7 h-7 rounded-full overflow-hidden border shadow-md flex items-center justify-center cursor-pointer",
                        isDarkNavbar ? "border-zinc-800" : "border-zinc-200"
                      )}
                    >
                      {renderAvatar()}
                    </div>

                    {/* Hamburger Menu Icon */}
                    <button
                      onClick={() => setIsDrawerOpen(true)}
                      className={cn(
                        "w-8 h-8 flex items-center justify-center focus:outline-none active:scale-90",
                        isDarkNavbar ? "text-white" : "text-black"
                      )}
                      aria-label="Open Menu"
                    >
                      <Menu size={16} />
                    </button>
                 </div>
               </div>

             </div>
          </div>

          {/* Right Slice (Corner) */}
          <div className="w-[50px] h-full relative shrink-0 -ml-px">
            {/* SVG containing both the background fill and outlines for perfect subpixel anti-aliasing */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 50 64" preserveAspectRatio="none">
              <path 
                d="M -1 0 H 51 V 40 C 25 40 25 64 -1 64 Z" 
                className={cn("transition-all duration-300", isDarkNavbar ? "fill-black" : "fill-white")} 
              />
              <path d="M0 63.5 C25 63.5 25 39.5 50 39.5" fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} className={notchStrokeClass} />
              <path d="M0 60.5 C25 60.5 25 36.5 50 36.5" fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} className={notchStrokeClass} />
            </svg>
          </div>

        </div>

        {/* Right Side Bar - Flexible width */}
        <div className={cn("flex-grow h-10 transition-all duration-300 relative min-w-0 -ml-px", notchBgClass)}>
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} className={notchStrokeClass} />
            <line x1="0" y1="36.5" x2="100%" y2="36.5" stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} className={notchStrokeClass} />
          </svg>
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

                {/* Native Fullscreen Toggle Row */}
                <button
                  onClick={() => { toggleAppFullscreen(); }}
                  className="w-full flex items-center justify-between p-3.5 bg-box-bg border border-border-color rounded-2.5xl text-left hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-all focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    {isFullscreen ? <Minimize2 className="w-4.5 h-4.5 text-red-500" /> : <Maximize2 className="w-4.5 h-4.5 text-sec-text" />}
                    <span className="text-[11px] font-black uppercase tracking-wider text-sec-text">
                      {isFullscreen ? (language === 'ku' || language === 'badini' ? 'چوونەدەرەوە لە سکرین بەتاڵ' : 'Exit Fullscreen') : (language === 'ku' || language === 'badini' ? 'سکرین بەتاڵ (Fullscreen)' : 'Native Fullscreen')}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>

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