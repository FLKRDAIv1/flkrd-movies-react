
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
    if (componentMap[to]) componentMap[to]();
  };

  return (
    <NavLink 
      to={to} 
      title={isCollapsed ? text : ""}
      onMouseEnter={handlePrefetch}
      className={`group relative flex items-center h-12 px-4 mx-2 rounded-2xl transition-all duration-300 overflow-hidden ${
        isActive 
        ? 'bg-red-600 text-white shadow-[0_8px_20px_rgba(229,9,20,0.3)]' 
        : 'hover:bg-white/5 text-gray-500 hover:text-white'
      }`}
    >
      {isActive && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-full"
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
      className={`group flex items-center h-10 px-4 mx-2 rounded-xl transition-all duration-300 ${
        isActive 
        ? 'bg-white/10 text-white font-black' 
        : 'hover:bg-white/5 text-gray-500 hover:text-white'
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
        className="hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 bg-[#050505]/80 backdrop-blur-3xl border-r border-white/5 text-gray-400 z-50 shadow-[20px_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
        variants={sidebarVariants}
        initial="closed"
        animate={isCollapsed ? "closed" : "open"}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        <div className="flex items-center justify-center h-32 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-red-600/10 to-transparent opacity-50" />
          <motion.div 
            animate={{ scale: isCollapsed ? 1 : 1.15 }}
            className="relative z-10 p-4 bg-black/40 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-xl"
          >
             <img 
               src="/flkrd-icon.png" 
               alt="FLKRD" 
               className="w-10 h-10 object-contain" 
             />
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
              <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent mt-2" />
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
        
        <div className="p-6 border-t border-white/5 bg-white/[0.02]">
           <div className={`flex items-center gap-4 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-red-900 flex-shrink-0 border border-white/20 shadow-lg" />
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <p className="text-[10px] font-black text-white uppercase tracking-tighter truncate">Premium Member</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Global Archive Access</p>
                </div>
              )}
           </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
