
import React, { useState, memo } from 'react';
import { NavLink, useLocation, Location } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Tv, Film, Bookmark, Search, Globe, Mic2, PlayCircle, ChevronRight } from 'lucide-react';
import { STUDIOS } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';

const sidebarVariants = {
  open: { 
    width: "16.5rem",
    transition: { type: "spring", stiffness: 400, damping: 40 }
  },
  closed: { 
    width: "4.5rem",
    transition: { type: "spring", stiffness: 400, damping: 40 }
  },
};

const textVariants = {
  open: { opacity: 1, x: 0, display: 'inline', transition: { delay: 0.1 } },
  closed: { opacity: 0, x: -10, display: 'none' },
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  location: Location;
  isCollapsed: boolean;
}

const NavItem = memo(({ to, icon, text, location, isCollapsed }: NavItemProps) => {
  const isActive = location.pathname === to || (to === '/discover' && location.pathname.startsWith('/discover'));
  
  // Prefetch logic for snappier navigation
  const handlePrefetch = () => {
    // If it's a lazy component, this will trigger the import
    const componentMap: Record<string, () => Promise<any>> = {
      '/': () => import('../pages/HomePage'),
      '/tv': () => import('../pages/TVShowsPage'),
      '/dubbed': () => import('../pages/DubbedMoviesPage'),
      '/discover': () => import('../pages/DiscoverPage'),
      '/shorts': () => import('../pages/ShortsPage'),
      '/search': () => import('../pages/SearchPage'),
      '/my-list': () => import('../pages/MyListPage'),
    };
    if (componentMap[to]) componentMa
  };

  return (
    <NavLink 
      to={to} 
      title={isCollapsed ? text : ""}
      onMouseEnter={handlePrefetch}
      className={`group relative flex items-center h-12 px-4 mx-2 rounded-2xl transition-all duration-500 overflow-hidden border ${
        isActive 
        ? 'bg-brand/90 backdrop-blur-xl border-brand text-white shadow-[0_0_30px_rgba(var(--brand-red-rgb),0.5)]' 
        : 'bg-transparent border-transparent hover:bg-main-text/5 hover:backdrop-blur-md hover:border-main-text/10 text-sec-text hover:text-main-text'
      }`}
    >
      {isActive && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-white rounded-r-full shadow-[0_0_10px_white]"
        />
      )}
      <div className={`flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <motion.span 
        variants={textVariants} 
        className="ml-4 font-black uppercase tracking-[0.15em] text-[10px] whitespace-nowrap"
      >
        {text}
      </motion.span>
      
      {!isCollapsed && isActive && (
        <ChevronRight size={14} className="ml-auto opacity-50" />
      )}
    </NavLink>
  );
});

interface StudioItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  location: Location;
}

const StudioItem = memo(({ to, icon, text, location }: StudioItemProps) => {
  const isActive = location.pathname.startsWith(to.split('/').slice(0, 3).join('/'));
  return (
    <NavLink 
      to={to} 
      className={`group flex items-center h-10 px-4 mx-2 rounded-xl transition-all duration-500 border ${
        isActive 
        ? 'bg-main-text/10 backdrop-blur-md border-main-text/20 text-main-text font-black shadow-[0_0_20px_rgba(var(--text-primary-rgb),0.1)]' 
        : 'bg-transparent border-transparent hover:bg-main-text/5 hover:backdrop-blur-sm hover:border-main-text/10 text-sec-text hover:text-main-text'
      }`}
    >
      <div className={`flex-shrink-0 w-5 flex items-center justify-center transition-transform ${isActive ? 'scale-110' : 'group-hover:rotate-12'}`}>
        {icon}
      </div>
      <motion.span 
        variants={textVariants} 
        className="ml-4 font-bold text-[9px] uppercase tracking-widest whitespace-nowrap"
      >
        {text}
      </motion.span>
    </NavLink>
  );
});

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <>
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCollapsed(true)}
            className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-md hidden md:block"
          />
        )}
      </AnimatePresence>

      <motion.div
        className="hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 bg-main-bg/40 backdrop-blur-[100px] border-r border-main-text/10 text-sec-text z-50 shadow-[20px_0_50px_rgba(0,0,0,0.4)] overflow-hidden"
        variants={sidebarVariants}
        initial="closed"
        animate={isCollapsed ? "closed" : "open"}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        <div className="flex items-center justify-center h-32 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-brand/20 to-transparent opacity-50" />
          <motion.div 
            animate={{ 
              scale: isCollapsed ? 1 : 1.1,
              width: isCollapsed ? "4rem" : "12rem"
            }}
            className="relative z-10 flex items-center justify-center p-3 bg-main-text/5 rounded-2xl border border-main-text/10 shadow-[0_0_30px_rgba(var(--text-primary-rgb),0.05)] backdrop-blur-2xl overflow-hidden"
          >
             <AnimatePresence mode="wait">
               {isCollapsed ? (
                 <motion.img 
                   key="icon"
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   src="/flkrd-icon.png" 
                   alt="F" 
                   className="w-10 h-10 object-contain" 
                 />
               ) : (
                 <motion.img 
                   key="logo"
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   src="/flkrd-logo.png" 
                   alt="FLKRD" 
                   className="h-10 w-auto object-contain" 
                 />
               )}
             </AnimatePresence>
             <div className="absolute -inset-2 bg-red-600/20 blur-2xl opacity-50 rounded-full" />
          </motion.div>
        </div>

        <nav className="flex-grow flex flex-col space-y-1.5 mt-4 overflow-y-auto scrollbar-hide py-4">
          <NavItem to="/" icon={<Home size={20} />} text={t('home')} location={location} isCollapsed={isCollapsed} />
          <NavItem to="/shorts" icon={<PlayCircle size={20} />} text={t('trendingToday')} location={location} isCollapsed={isCollapsed} />
          <NavItem to="/tv" icon={<Tv size={20} />} text={t('tvShows')} location={location} isCollapsed={isCollapsed} />
          <NavItem to="/dubbed" icon={<Mic2 size={20} />} text={t('dubbedMovies')} location={location} isCollapsed={isCollapsed} />
          <NavItem to="/discover" icon={<Globe size={20} />} text={t('discover')} location={location} isCollapsed={isCollapsed} />
          <NavItem to="/search" icon={<Search size={20} />} text={t('search')} location={location} isCollapsed={isCollapsed} />
          <NavItem to="/my-list" icon={<Bookmark size={20} />} text={t('myList')} location={location} isCollapsed={isCollapsed} />

          <div className="pt-10 px-2">
            <motion.div
              variants={textVariants}
              className="px-4 mb-4"
            >
              <h3 className="text-[8px] font-black text-gray-500 uppercase tracking-[0.4em] opacity-50">
                {t('studios')}
              </h3>
              <div className="h-px w-full bg-gradient-to-r from-main-text/10 to-transparent mt-2" />
            </motion.div>
            
            <div className="space-y-1">
              {STUDIOS.map(studio => (
                <StudioItem
                  key={studio.id}
                  to={`/studio/${studio.id}/${encodeURIComponent(studio.name)}`}
                  icon={<Film size={16} />}
                  text={studio.name}
                  location={location}
                />
              ))}
            </div>
          </div>
        </nav>
        
        <div className="p-6 border-t border-main-text/10 bg-main-text/[0.02] backdrop-blur-xl relative z-20">
           <div className={`flex items-center gap-4 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-red-900 flex-shrink-0 border border-main-text/20 shadow-[0_0_15px_rgba(var(--brand-red-rgb),0.5)]" />
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <p className="text-[10px] font-black text-main-text uppercase tracking-tighter truncate">Premium Member</p>
                  <p className="text-[8px] font-bold text-sec-text uppercase tracking-widest">Global Archive Access</p>
                </div>
              )}
           </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
