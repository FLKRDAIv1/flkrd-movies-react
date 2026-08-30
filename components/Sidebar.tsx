import React, { useState, memo, useMemo, useEffect, useCallback } from 'react';
import { NavLink, useLocation, Location } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Tv,
  Film,
  Bookmark,
  Search,
  Globe,
  Mic2,
  ChevronRight,
  X,
  Sparkles,
  Download,
} from 'lucide-react';
import { STUDIOS } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { useUI } from '../contexts/UIContext';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  location: Location;
  isCollapsed: boolean;
  onItemClick?: () => void;
}

const NavItem = memo(({ to, icon, text, location, isCollapsed, onItemClick }: NavItemProps) => {
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  const { theme } = useUI();
  const isLight = theme === 'light';

  const handlePrefetch = () => {
    const componentMap: Record<string, () => Promise<any>> = {
      '/': () => import('../pages/HomePage'),
      '/tv': () => import('../pages/TVShowsPage'),
      '/dubbed': () => import('../pages/DubbedMoviesPage'),
      '/discover': () => import('../pages/DiscoverPage'),
      '/search': () => import('../pages/SearchPage'),
      '/my-list': () => import('../pages/MyListPage'),
    };
    if (componentMap[to]) componentMap[to]();
  };

  return (
    <div className="w-full">
      <NavLink
        to={to}
        title={isCollapsed ? text : ''}
        onMouseEnter={handlePrefetch}
        onClick={onItemClick}
        className={`group relative flex items-center h-12 px-3.5 mx-2 rounded-2xl transition-all duration-150 overflow-hidden border active:scale-95 touch-manipulation ${
          isActive
            ? 'bg-brand border-brand text-white shadow-[0_4px_25px_rgba(var(--brand-red-rgb),0.35)] font-black'
            : isLight
              ? 'bg-transparent border-transparent hover:bg-black/5 hover:border-black/5 text-neutral-700 hover:text-black font-bold'
              : 'bg-transparent border-transparent hover:bg-white/10 hover:border-white/10 text-neutral-400 hover:text-white'
        }`}
      >
        <div
          className={`flex-shrink-0 transition-transform duration-150 ${
            isActive ? 'scale-110 text-white' : isLight ? 'group-hover:scale-110 text-neutral-600' : 'group-hover:scale-110 text-neutral-400'
          }`}
        >
          {icon}
        </div>

        <div
          className={`ml-3.5 flex-1 min-w-0 transition-all duration-200 overflow-hidden ${
            isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[160px]'
          }`}
        >
          <span className="font-black uppercase tracking-[0.15em] text-[10px] whitespace-nowrap block truncate">
            {text}
          </span>
        </div>

        {!isCollapsed && isActive && (
          <ChevronRight size={14} className="ml-auto opacity-70 text-white shrink-0" />
        )}
      </NavLink>
    </div>
  );
});

interface StudioItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  location: Location;
  isCollapsed: boolean;
  onItemClick?: () => void;
}

const StudioItem = memo(({ to, icon, text, location, isCollapsed, onItemClick }: StudioItemProps) => {
  const isActive = location.pathname.startsWith(to.split('/').slice(0, 3).join('/'));
  const { theme } = useUI();
  const isLight = theme === 'light';

  return (
    <div className="w-full">
      <NavLink
        to={to}
        onClick={onItemClick}
        className={`group flex items-center h-10 px-3.5 mx-2 rounded-xl transition-all duration-150 border active:scale-95 touch-manipulation ${
          isActive
            ? 'bg-brand/20 border-brand/35 text-brand font-black shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.15)]'
            : isLight
              ? 'bg-transparent border-transparent hover:bg-black/5 hover:border-black/5 text-neutral-600 hover:text-black font-bold'
              : 'bg-transparent border-transparent hover:bg-white/10 hover:border-white/10 text-neutral-400 hover:text-white'
        }`}
      >
        <div
          className={`flex-shrink-0 w-5 flex items-center justify-center transition-transform duration-150 ${
            isActive ? 'scale-110 text-brand' : isLight ? 'group-hover:rotate-12 text-neutral-600' : 'group-hover:rotate-12 text-neutral-400'
          }`}
        >
          {icon}
        </div>
        <div
          className={`ml-3.5 flex-1 min-w-0 transition-all duration-200 overflow-hidden ${
            isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[160px]'
          }`}
        >
          <span className="font-bold text-[9px] uppercase tracking-widest whitespace-nowrap block truncate">
            {text}
          </span>
        </div>
      </NavLink>
    </div>
  );
});

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const location = useLocation();
  const { t, language } = useTranslation();
  const { theme, glassConfig } = useUI();

  // Close mobile drawer on ESC
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {/* ──────────────────────────────────────────────────────────
          1. PERSISTENT DESKTOP / TV SIDEBAR (PC & Smart TV size)
          - Carries class "global-sidebar" for index.css layout alignment
          - Smooth, GPU-composited pure CSS transition with zero layout jitter
         ────────────────────────────────────────────────────────── */}
      <div
        onClick={() => setIsCollapsed(true)}
        className={`fixed inset-0 z-[45] bg-black/35 hidden md:block transition-opacity duration-200 ${
          isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
        }`}
        style={{ transform: 'translateZ(0)' }}
      />

      <aside
        className={`global-sidebar hidden md:flex flex-col flex-shrink-0 text-neutral-300 z-50 overflow-visible relative select-none transform-gpu transition-[width] duration-200 ease-out ${
          isCollapsed ? 'w-[4.5rem]' : 'w-[16.5rem]'
        }`}
        style={{
          contain: 'layout style',
          willChange: 'width',
          transform: 'translateZ(0)',
        }}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        {/* Pure CSS Premium Glassmorphism Background with Red Tint */}
        <div
          className="absolute inset-0 z-0 w-full h-full border backdrop-blur-xl transition-all duration-200 overflow-hidden pointer-events-none"
          style={{
            background:
              theme === 'light'
                ? `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), 0.08), transparent 70%), rgba(255, 255, 255, 0.85)`
                : `radial-gradient(circle at 50% 0%, rgba(var(--brand-red-rgb), ${
                    glassConfig?.redOpacity || 0.15
                  }), transparent 70%), rgba(10, 10, 10, ${glassConfig?.darkOpacity || 0.88})`,
            backdropFilter: `blur(${Math.min(16, glassConfig?.blurAmount || 16)}px)`,
            WebkitBackdropFilter: `blur(${Math.min(16, glassConfig?.blurAmount || 16)}px)`,
            borderStyle: 'solid',
            borderColor:
              theme === 'light'
                ? `rgba(0, 0, 0, 0.06)`
                : `rgba(var(--brand-red-rgb), ${glassConfig?.borderOpacity || 0.12})`,
            borderRadius: `${glassConfig?.cornerRadius || 28}px`,
            boxShadow:
              theme === 'light'
                ? `0 20px 40px rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.85)`
                : `inset 0 1px 0 0 rgba(255, 255, 255, 0.15), 0 20px 45px rgba(0,0,0,0.55)`,
          }}
        />

        {/* Content panel */}
        <div
          className="relative z-10 flex flex-col h-full w-full overflow-hidden"
          style={{ borderRadius: `${glassConfig?.cornerRadius || 28}px` }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed((prev) => !prev);
            }}
            className="flex items-center justify-center h-24 flex-shrink-0 relative overflow-hidden w-full cursor-pointer select-none group touch-manipulation"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-brand/15 to-transparent opacity-50" />
            <div
              className={`relative z-10 flex items-center justify-center p-2 bg-neutral-900/70 rounded-2xl border border-white/10 shadow-md overflow-hidden hover:border-brand/30 transition-all duration-200 ${
                isCollapsed ? 'w-12 h-12' : 'w-[11.5rem] h-12'
              }`}
            >
              {/* Compact Icon */}
              <img
                src="/flkrd-icon.png"
                alt="F"
                className={`w-8 h-8 object-contain transition-all duration-200 shrink-0 ${
                  isCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-75 absolute pointer-events-none'
                }`}
              />

              {/* Full Logo */}
              <img
                src="/flkrd-logo.png"
                alt="FLKRD"
                className={`h-7 w-auto object-contain transition-all duration-200 ${
                  !isCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-90 absolute pointer-events-none'
                }`}
              />
              <div className="absolute -inset-2 bg-brand/20 blur-lg opacity-40 rounded-full pointer-events-none" />
            </div>
          </button>

          <nav className="flex-grow flex flex-col space-y-1.5 mt-1 overflow-y-auto scrollbar-hide py-2">
            <NavItem to="/" icon={<Home size={20} />} text={t('home') || 'Home'} location={location} isCollapsed={isCollapsed} />
            <NavItem to="/tv" icon={<Tv size={20} />} text={t('tvShows') || 'TV Shows'} location={location} isCollapsed={isCollapsed} />
            <NavItem to="/dubbed" icon={<Mic2 size={20} />} text={t('dubbedMovies') || 'Dubbed'} location={location} isCollapsed={isCollapsed} />
            <NavItem to="/discover" icon={<Globe size={20} />} text={t('discover') || 'Discover'} location={location} isCollapsed={isCollapsed} />
            <NavItem to="/search" icon={<Search size={20} />} text={t('search') || 'Search'} location={location} isCollapsed={isCollapsed} />
            <NavItem to="/my-list" icon={<Bookmark size={20} />} text={t('myList') || 'My List'} location={location} isCollapsed={isCollapsed} />

            {/* Studios section */}
            <div
              className={`transition-all duration-200 overflow-hidden ${
                isCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[500px] opacity-100 pt-4 px-2'
              }`}
            >
              <div className="px-4 mb-2">
                <h3 className="text-[8px] font-black text-neutral-500 uppercase tracking-[0.4em]">
                  {t('studios') || 'Studios'}
                </h3>
                <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent mt-1.5" />
              </div>

              <div className="space-y-1">
                {STUDIOS.map((studio) => (
                  <StudioItem
                    key={studio.id}
                    to={`/studio/${studio.id}/${encodeURIComponent(studio.name)}`}
                    icon={<Film size={16} />}
                    text={studio.name}
                    location={location}
                    isCollapsed={isCollapsed}
                  />
                ))}
              </div>
            </div>
          </nav>

          <div className="p-3 border-t border-white/10 bg-neutral-900/60 relative z-20 flex flex-col gap-2">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('flkrd-open-pwa-install'));
              }}
              title={isCollapsed ? (language === 'ku' || language === 'badini' ? 'داگرتنی ئەپ' : 'Install App') : ''}
              className={`w-full flex items-center h-10 px-3 rounded-xl transition-all duration-150 border bg-brand/15 hover:bg-brand/25 border-brand/35 text-white shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.15)] active:scale-95 cursor-pointer touch-manipulation ${
                isCollapsed ? 'justify-center' : 'justify-between'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Download size={16} className="text-brand shrink-0" />
                <div
                  className={`transition-all duration-200 overflow-hidden ${
                    isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[130px]'
                  }`}
                >
                  <span className="font-black uppercase tracking-wider text-[10px] text-white whitespace-nowrap block truncate">
                    {language === 'ku' || language === 'badini' ? 'داگرتنی ئەپ' : 'Install App'}
                  </span>
                </div>
              </div>
              {!isCollapsed && (
                <Sparkles size={12} className="text-brand/80 shrink-0" />
              )}
            </button>

            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-red-950 flex-shrink-0 border border-white/10 shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.5)] flex items-center justify-center font-black text-[10px] text-white">
                F
              </div>
              <div
                className={`flex flex-col min-w-0 transition-all duration-200 overflow-hidden ${
                  isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[130px]'
                }`}
              >
                <p className="text-[10px] font-black text-white uppercase tracking-tighter truncate">
                  Premium Member
                </p>
                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest truncate">
                  Global Archive
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ──────────────────────────────────────────────────────────
          2. MOBILE DRAWER OVERLAY (When isOpen is triggered)
         ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
              className="fixed inset-0 z-[90] bg-black/70 md:hidden transform-gpu"
              style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 left-0 bottom-0 z-[100] w-72 h-full bg-neutral-950 border-r border-white/10 text-neutral-300 shadow-2xl flex flex-col justify-between overflow-hidden md:hidden transform-gpu select-none"
              style={{ contain: 'strict', willChange: 'transform', transform: 'translateZ(0)' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-neutral-900/60">
                <div className="flex items-center gap-3">
                  <img src="/flkrd-icon.png" alt="FLKRD" className="w-9 h-9 object-contain" />
                  <span className="text-sm font-black tracking-widest text-white uppercase">
                    FLKRD MOVIES
                  </span>
                </div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/5 text-neutral-400 hover:text-white touch-manipulation active:scale-90"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <nav className="flex-grow flex flex-col space-y-2 py-4 overflow-y-auto scrollbar-hide px-2">
                <NavItem to="/" icon={<Home size={20} />} text={t('home') || 'Home'} location={location} isCollapsed={false} onItemClick={onClose} />
                <NavItem to="/tv" icon={<Tv size={20} />} text={t('tvShows') || 'TV Shows'} location={location} isCollapsed={false} onItemClick={onClose} />
                <NavItem to="/dubbed" icon={<Mic2 size={20} />} text={t('dubbedMovies') || 'Dubbed'} location={location} isCollapsed={false} onItemClick={onClose} />
                <NavItem to="/discover" icon={<Globe size={20} />} text={t('discover') || 'Discover'} location={location} isCollapsed={false} onItemClick={onClose} />
                <NavItem to="/search" icon={<Search size={20} />} text={t('search') || 'Search'} location={location} isCollapsed={false} onItemClick={onClose} />
                <NavItem to="/my-list" icon={<Bookmark size={20} />} text={t('myList') || 'My List'} location={location} isCollapsed={false} onItemClick={onClose} />
              </nav>

              <div className="p-4 border-t border-white/10 bg-neutral-900/60 flex flex-col gap-3">
                <button
                  onClick={() => {
                    onClose?.();
                    window.dispatchEvent(new CustomEvent('flkrd-open-pwa-install'));
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-brand/20 hover:bg-brand/30 border border-brand/40 text-white font-black text-xs uppercase italic tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95"
                >
                  <Download size={16} className="text-brand shrink-0" />
                  <span>{language === 'ku' || language === 'badini' ? 'داگرتنی ئەپڵیکەیشن' : 'Install FLKRD App'}</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center font-bold text-white text-xs">
                    F
                  </div>
                  <p className="text-xs font-black text-white uppercase">FLKRD VIP</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default React.memo(Sidebar);

